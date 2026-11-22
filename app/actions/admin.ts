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

const ADMIN_SETTLEABLE_SWAP_STATUSES: SwapStatus[] = [
  SwapStatus.ACCEPTED,
  SwapStatus.AWAITING_DELIVERY,
  SwapStatus.AWAITING_CONFIRMATION,
  SwapStatus.DISPUTED,
];

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
        if (reportId) {
          const report = await tx.report.findUnique({
            where: { id: reportId },
            select: { swapId: true },
          });
          if (!report || report.swapId !== swap.id) {
            throw new Error("البلاغ لا يرتبط بطلب التبادل المحدد.");
          }
        }
        if (!ADMIN_SETTLEABLE_SWAP_STATUSES.includes(swap.status)) {
          throw new Error("لا يمكن إتمام الطلب في حالته الحالية.");
        }

        const now = new Date();

        const changed = await tx.swap.updateMany({
          where: {
            id: swap.id,
            status: { in: ADMIN_SETTLEABLE_SWAP_STATUSES },
          },
          data: {
            status: SwapStatus.COMPLETED,
            deliveryConfirmed: true,
            receiptConfirmed: true,
            completedAt: now,
          },
        });
        if (changed.count !== 1) {
          throw new Error("تغيرت حالة الطلب؛ حدّث الصفحة وحاول مجدداً.");
        }

        // نقل ملكية الكتاب المطلوب إلى طالب الكتاب
        const receivedBook = await tx.book.updateMany({
          where: {
            id: swap.requestedBookId,
            ownerId: swap.receiverId,
            isAvailable: false,
            isDeleted: false,
          },
          data: { ownerId: swap.requesterId, isAvailable: true },
        });
        if (receivedBook.count !== 1) {
          throw new Error("تعذر نقل ملكية الكتاب المطلوب؛ أُلغيت التسوية.");
        }

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

          if (allOfferedIds.length === 0) {
            throw new Error("لا توجد كتب معروضة مرتبطة بهذا التبادل.");
          }
          const offeredBooks = await tx.book.updateMany({
              where: {
                id: { in: allOfferedIds },
                ownerId: swap.requesterId,
                isAvailable: false,
                isDeleted: false,
              },
              data: { ownerId: swap.receiverId, isAvailable: true },
            });
          if (offeredBooks.count !== allOfferedIds.length) {
            throw new Error("تعذر نقل ملكية الكتب المعروضة؛ أُلغيت التسوية.");
          }
        }

        // تسوية النقاط المحجوزة (سواء طلب نقاط كامل أو فرق نقاط في تبادل مباشر)
        if (swap.pointsCost > 0) {
          const spent = await tx.user.updateMany({
            where: {
              id: swap.requesterId,
              points: { gte: swap.pointsCost },
              reservedPoints: { gte: swap.pointsCost },
            },
            data: {
              points: { decrement: swap.pointsCost },
              reservedPoints: { decrement: swap.pointsCost },
            },
          });
          if (spent.count !== 1) {
            throw new Error("تعذر تسوية النقاط المحجوزة؛ أُلغيت التسوية.");
          }

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
        if (reportId) {
          const report = await tx.report.findUnique({
            where: { id: reportId },
            select: { swapId: true },
          });
          if (!report || report.swapId !== swap.id) {
            throw new Error("البلاغ لا يرتبط بطلب التبادل المحدد.");
          }
        }
        if (
          ![
            SwapStatus.PENDING,
            ...ADMIN_SETTLEABLE_SWAP_STATUSES,
          ].includes(swap.status)
        ) {
          throw new Error("لا يمكن إلغاء الطلب في حالته الحالية.");
        }

        const changed = await tx.swap.updateMany({
          where: {
            id: swap.id,
            status: {
              in: [SwapStatus.PENDING, ...ADMIN_SETTLEABLE_SWAP_STATUSES],
            },
          },
          data: {
            status: SwapStatus.CANCELLED,
            cancelReason: "تم إلغاء الطلب بقرار من الإدارة بعد مراجعة النزاع",
          },
        });
        if (changed.count !== 1) {
          throw new Error("تغيرت حالة الطلب؛ حدّث الصفحة وحاول مجدداً.");
        }

        // إعادة إتاحة الكتاب المطلوب
        await tx.book.updateMany({
          where: {
            id: swap.requestedBookId,
            ownerId: swap.receiverId,
            isAvailable: false,
          },
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
            where: {
              id: { in: lockedOfferIds },
              ownerId: swap.requesterId,
              isAvailable: false,
            },
            data: { isAvailable: true },
          });
        }

        // تحرير النقاط المحجوزة لصاحب الطلب
        if (swap.pointsCost > 0) {
          const released = await tx.user.updateMany({
            where: {
              id: swap.requesterId,
              reservedPoints: { gte: swap.pointsCost },
            },
            data: {
              reservedPoints: { decrement: swap.pointsCost },
            },
          });
          if (released.count !== 1) {
            throw new Error("تعذر تحرير النقاط المحجوزة؛ أُلغيت العملية.");
          }

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
