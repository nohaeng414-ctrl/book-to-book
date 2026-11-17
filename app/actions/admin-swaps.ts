"use server";

import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function adminCancelSwapAction(swapId: string) {
  const session = await auth();
  if (!session?.user?.email || !(await isAdmin())) {
    throw new Error("غير مصرح لك بهذا الإجراء");
  }

  await prisma.$transaction(async (tx) => {
    const swap = await tx.swap.findUnique({
      where: { id: swapId },
      select: {
        id: true,
        status: true,
        requesterId: true,
        receiverId: true,
        pointsCost: true,
        requestedBookId: true,
        offeredBookId: true,
        requestedBook: { select: { title: true } },
      },
    });

    if (!swap || ["COMPLETED", "CANCELLED", "REJECTED"].includes(swap.status)) {
      throw new Error("لا يمكن إلغاء هذا الطلب في حالته الحالية.");
    }

    // 1. تحديث حالة الطلب إلى ملغى
    await tx.swap.update({
      where: { id: swapId },
      data: { status: "CANCELLED" },
    });

    // 2. إرجاع النقاط المحجوزة لصاحب الطلب إذا كان التبادل بالنقاط
    if (swap.pointsCost > 0) {
      const requester = await tx.user.findUnique({
        where: { id: swap.requesterId },
        select: { points: true, reservedPoints: true },
      });

      if (requester) {
        await tx.user.update({
          where: { id: swap.requesterId },
          data: {
            points: requester.points + swap.pointsCost,
            reservedPoints: Math.max(0, requester.reservedPoints - swap.pointsCost),
          },
        });

        await tx.pointTransaction.create({
          data: {
            userId: swap.requesterId,
            amount: swap.pointsCost,
            type: "REFUNDED",
            swapId: swap.id,
            idempotencyKey: `admin-cancel-refund-${swap.id}`,
            description: "إرجاع إداري للنقاط بعد إلغاء الطلب من قبل الإدارة",
          },
        });
      }
    }

    // 3. فك الحجز عن الكتب لتعود متاحة بالمنصة
    const booksToUnlock = [swap.requestedBookId];
    if (swap.offeredBookId) booksToUnlock.push(swap.offeredBookId);

    await tx.book.updateMany({
      where: { id: { in: booksToUnlock } },
      data: { isAvailable: true },
    });

    // 4. إرسال إشعارات للطرفين
    const adminUser = await tx.user.findUnique({
      where: { email: session.user!.email! },
      select: { id: true },
    });

    const notifData = [swap.requesterId, swap.receiverId].map((userId) => ({
      userId,
      actorId: adminUser?.id,
      type: "SWAP_REQUEST" as const,
      title: "🛡️ تم إلغاء طلب التبادل إدارياً",
      body: `قامت الإدارة بإلغاء طلب التبادل المتعلق بكتاب "${swap.requestedBook.title}" وتمت تسوية الحسابات.`,
      link: `/swaps/${swap.id}`,
    }));

    await tx.notification.createMany({ data: notifData });
  });

  revalidatePath("/admin/swaps");
  revalidatePath(`/swaps/${swapId}`);
  return { success: true };
}