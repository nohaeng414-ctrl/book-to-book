"use server";

import { auth } from "@/auth";
import {
  PointTransactionType,
  Prisma,
  ReportStatus,
  SwapStatus,
  SwapType,
} from "@/generated/prisma-full";
import { prisma } from "@/lib/prisma";
import { isAdminEmail } from "@/lib/admin";
import { revalidatePath } from "next/cache";

async function requireAdminUser() {
  const session = await auth();
  if (!session?.user?.email || !isAdminEmail(session.user.email)) {
    throw new Error("غير مصرح لك بتنفيذ هذا الإجراء الإداري.");
  }

  const admin = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });

  if (!admin) {
    throw new Error("حساب المشرف غير موجود.");
  }

  return admin;
}

// 1. حسم النزاع لصالح إتمام التبادل (نقل ملكية الكتب وصرف النقاط المحجوزة)
export async function adminResolveSwapCompleteAction(
  swapId: string,
  reportId?: string
) {
  try {
    const admin = await requireAdminUser();

    await prisma.$transaction(
      async (tx) => {
        const swap = await tx.swap.findUnique({
          where: { id: swapId },
          select: {
            id: true,
            type: true,
            status: true,
            requesterId: true,
            receiverId: true,
            requestedBookId: true,
            offeredBookId: true,
            offeredBookIds: true,
            pointsCost: true,
          },
        });

        if (!swap) {
          throw new Error("طلب التبادل غير موجود.");
        }
        if (swap.status === SwapStatus.COMPLETED) {
          throw new Error("هذا الطلب مكتمل بالفعل.");
        }

        const now = new Date();

        await tx.swap.update({
          where: { id: swap.id },
          data: {
            status: SwapStatus.COMPLETED,
            deliveryConfirmed: true,
            receiptConfirmed: true,
            completedAt: now,
          },
        });

        // نقل ملكية الكتاب المطلوب إلى طالب الكتاب
        await tx.book.updateMany({
          where: { id: swap.requestedBookId },
          data: { ownerId: swap.requesterId, isAvailable: true },
        });

        // نقل ملكية جميع الكتب المعروضة في التبادل المباشر إلى صاحب الكتاب المطلوب
        if (swap.type === SwapType.DIRECT) {
          const allOfferedIds = [
            ...new Set(
              [
                ...(swap.offeredBookIds ?? []),
                ...(swap.offeredBookId ? [swap.offeredBookId] : []),
              ].filter(Boolean)
            ),
          ];

          if (allOfferedIds.length > 0) {
            await tx.book.updateMany({
              where: { id: { in: allOfferedIds } },
              data: { ownerId: swap.receiverId, isAvailable: true },
            });
          }
        }

        // تسوية النقاط المحجوزة (سواء طلب نقاط كامل أو فرق نقاط في تبادل مباشر)
        if (swap.pointsCost > 0) {
          await tx.user.update({
            where: { id: swap.requesterId },
            data: {
              points: { decrement: swap.pointsCost },
              reservedPoints: { decrement: swap.pointsCost },
            },
          });

          await tx.user.update({
            where: { id: swap.receiverId },
            data: {
              points: { increment: swap.pointsCost },
            },
          });

          await tx.pointTransaction.createMany({
            skipDuplicates: true,
            data: [
              {
                userId: swap.requesterId,
                amount: -swap.pointsCost,
                type: PointTransactionType.SPENT,
                swapId: swap.id,
                idempotencyKey: `swap:${swap.id}:spent`,
                description: "تسوية نقاط بقرار الإدارة بعد مراجعة النزاع",
              },
              {
                userId: swap.receiverId,
                amount: swap.pointsCost,
                type: PointTransactionType.EARNED,
                swapId: swap.id,
                idempotencyKey: `swap:${swap.id}:earned`,
                description: "استلام نقاط بقرار الإدارة بعد مراجعة النزاع",
              },
            ],
          });
        }

        // إغلاق جميع البلاغات المعلقة المرتبطة بهذا التبادل
        await tx.report.updateMany({
          where: {
            OR: [
              { swapId: swap.id, status: ReportStatus.PENDING },
              ...(reportId ? [{ id: reportId }] : []),
            ],
          },
          data: { status: ReportStatus.RESOLVED },
        });

        await tx.message.create({
          data: {
            swapId: swap.id,
            senderId: admin.id,
            content:
              "قرار الإدارة: تمت مراجعة النزاع واعتماد إتمام التبادل ونقل الكتب والنقاط لمستحقيها.",
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    revalidatePath("/admin/reports");
    revalidatePath(`/swaps/${swapId}`);
    return { success: true };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "تعذر تنفيذ القرار الإداري.",
    };
  }
}

// 2. حسم النزاع بإلغاء الطلب (إرجاع النقاط المحجوزة وإعادة إتاحة الكتب)
export async function adminResolveSwapCancelAction(
  swapId: string,
  reportId?: string
) {
  try {
    const admin = await requireAdminUser();

    await prisma.$transaction(
      async (tx) => {
        const swap = await tx.swap.findUnique({
          where: { id: swapId },
          select: {
            id: true,
            type: true,
            status: true,
            requesterId: true,
            requestedBookId: true,
            offeredBookId: true,
            offeredBookIds: true,
            pointsCost: true,
          },
        });

        if (!swap) {
          throw new Error("طلب التبادل غير موجود.");
        }
        if (swap.status === SwapStatus.CANCELLED) {
          throw new Error("هذا الطلب ملغى بالفعل.");
        }

        await tx.swap.update({
          where: { id: swap.id },
          data: {
            status: SwapStatus.CANCELLED,
            cancelReason: "تم إلغاء الطلب بقرار من الإدارة بعد مراجعة النزاع",
          },
        });

        // إعادة إتاحة الكتاب المطلوب
        await tx.book.updateMany({
          where: { id: swap.requestedBookId },
          data: { isAvailable: true },
        });

        // إعادة إتاحة الكتب المعروضة
        const lockedOfferIds = [
          ...new Set(
            [
              ...(swap.offeredBookIds ?? []),
              ...(swap.offeredBookId ? [swap.offeredBookId] : []),
            ].filter(Boolean)
          ),
        ];

        if (lockedOfferIds.length > 0) {
          await tx.book.updateMany({
            where: { id: { in: lockedOfferIds } },
            data: { isAvailable: true },
          });
        }

        // تحرير النقاط المحجوزة لصاحب الطلب
        if (swap.pointsCost > 0 && swap.status !== SwapStatus.COMPLETED) {
          await tx.user.update({
            where: { id: swap.requesterId },
            data: {
              reservedPoints: { decrement: swap.pointsCost },
            },
          });

          await tx.pointTransaction.createMany({
            skipDuplicates: true,
            data: [
              {
                userId: swap.requesterId,
                amount: swap.pointsCost,
                type: PointTransactionType.RELEASED,
                swapId: swap.id,
                idempotencyKey: `swap:${swap.id}:released`,
                description:
                  "استرجاع النقاط المحجوزة بقرار الإدارة بعد إلغاء التبادل",
              },
            ],
          });
        }

        // إغلاق البلاغات المرتبطة
        await tx.report.updateMany({
          where: {
            OR: [
              { swapId: swap.id, status: ReportStatus.PENDING },
              ...(reportId ? [{ id: reportId }] : []),
            ],
          },
          data: { status: ReportStatus.RESOLVED },
        });

        await tx.message.create({
          data: {
            swapId: swap.id,
            senderId: admin.id,
            content:
              "قرار الإدارة: تمت مراجعة النزاع وإلغاء الطلب وإعادة الكتب والنقاط المحجوزة لأصحابها.",
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    revalidatePath("/admin/reports");
    revalidatePath(`/swaps/${swapId}`);
    return { success: true };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "تعذر إلغاء الطلب حالياً.",
    };
  }
}

// 3. تحديث حالة البلاغ (تمت المعالجة / مرفوض)
export async function adminUpdateReportStatusAction(
  reportId: string,
  status: "RESOLVED" | "DISMISSED"
) {
  try {
    await requireAdminUser();

    await prisma.report.update({
      where: { id: reportId },
      data: { status },
    });

    revalidatePath("/admin/reports");
    return { success: true };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "تعذر تحديث حالة البلاغ.",
    };
  }
}

// 4. حظر أو فك حظر المستخدم
export async function adminToggleBanUserAction(
  targetUserId: string,
  banReason?: string
) {
  try {
    const admin = await requireAdminUser();
    if (targetUserId === admin.id) {
      return { error: "لا يمكنك حظر حساب المشرف الخاص بك." };
    }

    const target = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { isBanned: true },
    });

    if (!target) {
      return { error: "المستخدم غير موجود." };
    }

    await prisma.user.update({
      where: { id: targetUserId },
      data: {
        isBanned: !target.isBanned,
        banReason: !target.isBanned
          ? banReason?.trim() || "مخالفة شروط وسياسات المنصة"
          : null,
      },
    });

    revalidatePath("/admin/reports");
    revalidatePath(`/users/${targetUserId}`);
    return { success: true };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "تعذر تحديث حالة الحظر.",
    };
  }
}