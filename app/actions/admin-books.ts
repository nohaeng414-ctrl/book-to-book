"use server";

import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

const ACTIVE_SWAP_STATUSES = [
  "PENDING",
  "ACCEPTED",
  "AWAITING_DELIVERY",
  "AWAITING_CONFIRMATION",
  "DISPUTED",
] as const;

export async function adminDeleteBookPermanently(
  bookId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.email || !(await isAdmin())) {
    return { success: false, error: "غير مصرح لك بهذا الإجراء." };
  }

  const cleanReason = reason.trim();
  if (!cleanReason) {
    return { success: false, error: "يرجى تحديد سبب الحذف." };
  }

  try {
    const book = await prisma.book.findUnique({
      where: { id: bookId },
      select: { id: true, title: true, ownerId: true },
    });

    if (!book) {
      return { success: false, error: "الكتاب غير موجود أو تم حذفه مسبقاً." };
    }

    await prisma.$transaction(
      async (tx) => {
        // 1. جلب الطلبات المرتبطة والطلبات التي تحتوي الكتاب ضمن offeredBookIds بالتوازي
        const [relatedSwaps, swapsWithOfferedArray] = await Promise.all([
          tx.swap.findMany({
            where: {
              OR: [{ requestedBookId: book.id }, { offeredBookId: book.id }],
            },
            select: {
              id: true,
              type: true,
              status: true,
              requesterId: true,
              receiverId: true,
              pointsCost: true,
              requester: { select: { reservedPoints: true } },
            },
          }),
          tx.swap.findMany({
            where: { offeredBookIds: { has: book.id } },
            select: { id: true, offeredBookIds: true, offeredBookId: true },
          }),
        ]);

        const activeSwaps = relatedSwaps.filter((s) =>
          (ACTIVE_SWAP_STATUSES as readonly string[]).includes(s.status)
        );

        // تجهيز الإشعارات وسجلات النقاط لإرسالها دفعة واحدة
        const notificationsToCreate: {
          userId: string;
          type: "SWAP_REQUEST";
          title: string;
          body: string;
          link: string;
        }[] = [
          {
            userId: book.ownerId,
            type: "SWAP_REQUEST",
            title: "تم حذف كتاب من قبل الإدارة",
            body: `تم حذف كتابك «${book.title}» نهائياً من قبل الإدارة. السبب: ${cleanReason}`,
            link: "/my-books",
          },
        ];

        const pointTransactionsToCreate: {
          userId: string;
          amount: number;
          type: "RELEASED";
          idempotencyKey: string;
          description: string;
        }[] = [];

        // 2. معالجة الطلبات النشطة: فك حجز النقاط + تجهيز إشعار الطرف الآخر
        for (const swap of activeSwaps) {
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

            pointTransactionsToCreate.push({
              userId: swap.requesterId,
              amount: refundAmount,
              type: "RELEASED",
              idempotencyKey: `admin-book-del-refund-${swap.id}`,
              description: `إرجاع نقاط محجوزة بعد حذف كتاب «${book.title}» من قبل الإدارة`,
            });
          }

          const otherUserId =
            swap.requesterId === book.ownerId
              ? swap.receiverId
              : swap.requesterId;

          notificationsToCreate.push({
            userId: otherUserId,
            type: "SWAP_REQUEST",
            title: "تم إلغاء طلب تبادل",
            body: `تم إلغاء الطلب المرتبط بكتاب «${book.title}» لأنه تم حذفه من قبل الإدارة.${
              refundAmount > 0 ? " تم إعادة النقاط المحجوزة إلى رصيدك." : ""
            }`,
            link: "/requests",
          });
        }

        // 3. إرسال كل الإشعارات وسجلات النقاط بضربة واحدة
        if (pointTransactionsToCreate.length > 0) {
          await tx.pointTransaction.createMany({
            data: pointTransactionsToCreate,
          });
        }

        await tx.notification.createMany({
          data: notificationsToCreate,
        });

        // 4. تجهيز كل الطلبات التي ستُحذف (المرتبطة + اللي فضيت قائمتها)
        const swapIdsToDelete = new Set(relatedSwaps.map((s) => s.id));
        const swapsToUpdate: { id: string; offeredBookIds: string[] }[] = [];

        for (const s of swapsWithOfferedArray) {
          if (swapIdsToDelete.has(s.id)) continue;
          const remainingBooks = s.offeredBookIds.filter(
            (id) => id !== book.id
          );

          if (remainingBooks.length === 0 && !s.offeredBookId) {
            swapIdsToDelete.add(s.id);
          } else {
            swapsToUpdate.push({ id: s.id, offeredBookIds: remainingBooks });
          }
        }

        const allDeleteIds = Array.from(swapIdsToDelete);
        if (allDeleteIds.length > 0) {
          await tx.pointTransaction.updateMany({
            where: { swapId: { in: allDeleteIds } },
            data: { swapId: null },
          });

          await tx.swap.deleteMany({
            where: { id: { in: allDeleteIds } },
          });
        }

        for (const s of swapsToUpdate) {
          await tx.swap.update({
            where: { id: s.id },
            data: { offeredBookIds: s.offeredBookIds },
          });
        }

        // 5. حذف الكتاب نهائياً من قاعدة البيانات
        await tx.book.delete({
          where: { id: book.id },
        });
      },
      {
        maxWait: 10000, // أقصى انتظار لفتح الاتصال: 10 ثواني
        timeout: 30000, // أقصى مدة للعملية: 30 ثانية
      }
    );

    revalidatePath("/admin/books");
    revalidatePath("/admin/swaps");
    revalidatePath("/admin");
    revalidatePath("/");

    return { success: true };
  } catch (error) {
    console.error("Admin permanent delete book error:", error);
    return {
      success: false,
      error: "حدث خطأ أثناء حذف الكتاب من قاعدة البيانات.",
    };
  }
}