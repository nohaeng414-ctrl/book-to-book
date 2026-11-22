"use server";

import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

const CANCELLABLE_STATUSES = [
  "PENDING",
  "ACCEPTED",
  "AWAITING_DELIVERY",
  "AWAITING_CONFIRMATION",
  "DISPUTED",
] as const;

export async function adminCancelSwap(
  swapId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.email || !(await isAdmin())) {
    return { success: false, error: "غير مصرح لك بهذا الإجراء." };
  }

  const cleanReason = reason.trim();
  if (!cleanReason) {
    return { success: false, error: "يرجى تحديد سبب الإلغاء." };
  }

  try {
    const swap = await prisma.swap.findUnique({
      where: { id: swapId },
      select: {
        id: true,
        type: true,
        status: true,
        pointsCost: true,
        requesterId: true,
        receiverId: true,
        requestedBookId: true,
        offeredBookId: true,
        requestedBook: { select: { title: true, isDeleted: true } },
        offeredBook: { select: { isDeleted: true } },
        requester: { select: { reservedPoints: true } },
      },
    });

    if (!swap) {
      return { success: false, error: "الطلب غير موجود." };
    }

    if (!(CANCELLABLE_STATUSES as readonly string[]).includes(swap.status)) {
      return { success: false, error: "لا يمكن إلغاء هذا الطلب في حالته الحالية." };
    }

    await prisma.$transaction(
      async (tx) => {
        // 1. تحديث حالة الطلب إلى ملغى مع حفظ السبب
        await tx.swap.update({
          where: { id: swap.id },
          data: {
            status: "CANCELLED",
            cancelReason: `إلغاء إداري: ${cleanReason}`,
          },
        });

        // 2. فك حجز النقاط وإرجاعها للطالب إذا كان الطلب بالنقاط
        const isPointsSwap = swap.type === "POINTS" && swap.pointsCost > 0;
        const refundAmount = isPointsSwap
          ? Math.min(swap.pointsCost, swap.requester.reservedPoints)
          : 0;

        if (refundAmount > 0) {
          await tx.user.update({
            where: { id: swap.requesterId },
            data: {
              reservedPoints: { decrement: refundAmount },
              points: { increment: refundAmount },
            },
          });

          await tx.pointTransaction.create({
            data: {
              userId: swap.requesterId,
              amount: refundAmount,
              type: "RELEASED",
              swapId: swap.id,
              idempotencyKey: `admin-swap-cancel-refund-${swap.id}`,
              description: `إرجاع نقاط محجوزة بعد إلغاء طلب كتاب «${swap.requestedBook.title}» من قبل الإدارة`,
            },
          });
        }

        // 3. إعادة إتاحة الكتب المحجوزة في هذا الطلب (إذا لم تكن محذوفة)
        const bookIdsToRestore: string[] = [];
        if (!swap.requestedBook.isDeleted) {
          bookIdsToRestore.push(swap.requestedBookId);
        }
        if (swap.offeredBookId && !swap.offeredBook?.isDeleted) {
          bookIdsToRestore.push(swap.offeredBookId);
        }

        if (bookIdsToRestore.length > 0) {
          await tx.book.updateMany({
            where: { id: { in: bookIdsToRestore } },
            data: { isAvailable: true },
          });
        }

        // 4. إشعار الطرفين (الطالب والمالك) بضربة واحدة
        await tx.notification.createMany({
          data: [
            {
              userId: swap.requesterId,
              type: "SWAP_REQUEST",
              title: "تم إلغاء طلب التبادل من قبل الإدارة",
              body: `تم إلغاء طلبك على كتاب «${swap.requestedBook.title}». السبب: ${cleanReason}.${
                refundAmount > 0 ? " تم إعادة النقاط المحجوزة إلى رصيدك." : ""
              }`,
              link: `/swaps/${swap.id}`,
            },
            {
              userId: swap.receiverId,
              type: "SWAP_REQUEST",
              title: "تم إلغاء طلب التبادل من قبل الإدارة",
              body: `تم إلغاء الطلب الوارد على كتابك «${swap.requestedBook.title}». السبب: ${cleanReason}.`,
              link: `/swaps/${swap.id}`,
            },
          ],
        });
      },
      {
        maxWait: 10000,
        timeout: 30000,
      }
    );

    revalidatePath("/admin/swaps");
    revalidatePath("/admin");
    revalidatePath("/requests");
    revalidatePath("/");

    return { success: true };
  } catch (error) {
    console.error("Admin cancel swap error:", error);
    return { success: false, error: "حدث خطأ أثناء إلغاء الطلب." };
  }
}