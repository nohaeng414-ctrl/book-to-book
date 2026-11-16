"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { SwapStatus } from "@/generated/prisma-full";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function deleteBook(
  bookId: string,
  source: "my-books" | "details" = "my-books"
) {
  const errorRedirectUrl = (msg: string) =>
    source === "details"
      ? `/books/${bookId}?deleteError=${encodeURIComponent(msg)}`
      : `/my-books?deleteError=${encodeURIComponent(msg)}`;

  if (!bookId) {
    redirect(errorRedirectUrl("معرّف الكتاب غير صالح."));
  }

  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  // جلب بيانات المستخدم الأساسية بدون أي بيانات ثقيلة
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      isBanned: true,
    },
  });

  if (!user) redirect("/login");
  if (user.isBanned) redirect("/banned");

  let errorMessage: string | null = null;

  try {
    await prisma.$transaction(
      async (tx) => {
        // 1. جلب الكتاب وحالة نقاط المستخدم الحالية بالتوازي وبدون سحب coverUrl!
        const [book, currentUserState] = await Promise.all([
          tx.book.findUnique({
            where: { id: bookId },
            select: {
              id: true,
              ownerId: true,
              isDeleted: true,
            },
          }),
          tx.user.findUnique({
            where: { id: user.id },
            select: {
              points: true,
              reservedPoints: true,
            },
          }),
        ]);

        if (!book || book.isDeleted || book.ownerId !== user.id || !currentUserState) {
          throw new Error("not-owner");
        }

        // 2. فحص هل الكتاب نفسه داخل في أي طلب تبادل نشط (كمطلوب أو كمعروض)
const activeSwap = await tx.swap.findFirst({ 
           where: {
            status: {
              in: [
              SwapStatus.PENDING,
        SwapStatus.AWAITING_DELIVERY,
        SwapStatus.AWAITING_CONFIRMATION,
              ],
            },
            OR: [
              { requestedBookId: bookId },
              { offeredBookId: bookId },
              { offeredBookIds: { has: bookId } },
            ],
          },
select: { id: true, status: true },
        });

        if (activeSwap) {
  if (activeSwap.status === SwapStatus.PENDING) {
    throw new Error(
      "لا يمكنك حذف الكتاب لأن نقطته الترحيبية محجوزة في طلب نشط؛ ألغِ الطلب أولاً لتتمكن من حذف الكتاب."
    );
  } else {
    throw new Error(
      "لا يمكن حذف الكتاب لأنه ارتبط بتبادل تمت الموافقة عليه وصُرفت نقطته؛ أضف كتاباً جديداً لتتمكن من حذفه."
    );
  }
}

        // 3. فحص عدد الكتب المتبقية للمستخدم (غير هذا الكتاب) وعدد التبادلات المكتملة
        const [remainingBooksCount, completedSwapsCount] = await Promise.all([
          tx.book.count({
            where: {
              ownerId: user.id,
              isDeleted: false,
              id: { not: bookId },
            },
          }),
          tx.swap.count({
            where: {
              status: SwapStatus.COMPLETED,
              OR: [{ requesterId: user.id }, { receiverId: user.id }],
            },
          }),
        ]);

        // 4. إذا كان هذا آخر كتاب في مكتبته ولم يكمل أي تبادل سابقاً -> يجب استرداد النقطة الترحيبية
        const shouldRevokeWelcomePoint =
          remainingBooksCount === 0 && completedSwapsCount === 0;

        if (shouldRevokeWelcomePoint) {
          const availableFreePoints =
            currentUserState.points - currentUserState.reservedPoints;

          // 🚨 الحماية الحاسمة: إذا كانت النقطة الترحيبية محجوزة في طلب كتاب بالنقاط!
          if (availableFreePoints < 1 || currentUserState.reservedPoints > 0) {
            throw new Error(
              "لا يمكنك حذف كتابك الوحيد لأن النقطة الترحيبية المرتبطة به محجوزة حالياً في طلب تبادل نشط. قم بإلغاء طلب التبادل أولاً لتتمكن من حذف الكتاب."
            );
          }

          // سحب النقطة الترحيبية بأمان لأنها حرة وغير مستخدمة في أي طلب
          if (currentUserState.points > 0) {
            await tx.user.update({
              where: { id: user.id },
              data: {
                points: { decrement: 1 },
              },
            });
          }
        }

        // 5. الحذف الناعم للكتاب (Soft Delete)
        await tx.book.update({
          where: { id: bookId },
          data: {
            isDeleted: true,
            isAvailable: false,
          },
        });
      },
      {
        maxWait: 10000,
        timeout: 15000,
      }
    );
    } catch (err: unknown) {
    errorMessage = err instanceof Error ? err.message : "تعذر حذف الكتاب حالياً.";
  }

  // في حال المنع، يوجه المستخدم لنفس الصفحة التي ضغط منها مع عرض سبب المنع بوضوح
  if (errorMessage) {
    redirect(errorRedirectUrl(errorMessage));
  }

  revalidatePath("/my-books");
  revalidatePath("/profile");
  revalidatePath("/");
  redirect("/my-books?deleted=1");
}
