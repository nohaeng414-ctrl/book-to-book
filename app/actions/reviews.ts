"use server";

import { auth } from "@/auth";
import { Prisma, SwapStatus } from "@/generated/prisma-full";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createReview(formData: FormData) {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const swapId = String(formData.get("swapId") ?? "");
  const rating = Number(formData.get("rating"));
  const comment = String(formData.get("comment") ?? "").trim();
  const tab = formData.get("tab") === "incoming" ? "incoming" : "outgoing";
  const returnTo = (message: string) => `/requests?tab=${tab}&reviewError=${encodeURIComponent(message)}`;

  if (!swapId || !Number.isInteger(rating) || rating < 1 || rating > 5 || comment.length > 300) {
    redirect(returnTo("اختر تقييماً من نجمة إلى خمس نجوم، واجعل التعليق أقل من 300 حرف."));
  }

  const reviewer = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
  if (!reviewer) redirect("/login");

  let recipientId: string | null = null;
  try {
    recipientId = await prisma.$transaction(async (tx) => {
      const swap = await tx.swap.findUnique({
        where: { id: swapId },
        select: { requesterId: true, receiverId: true, status: true, receiptConfirmed: true },
      });
      if (!swap || swap.status !== SwapStatus.COMPLETED || !swap.receiptConfirmed) return null;

      const targetId = swap.requesterId === reviewer.id
        ? swap.receiverId
        : swap.receiverId === reviewer.id
          ? swap.requesterId
          : null;
      if (!targetId) return null;

      await tx.review.create({
        data: {
          swapId,
          reviewerId: reviewer.id,
          recipientId: targetId,
          rating,
          comment: comment || null,
        },
      });
      return targetId;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      redirect(returnTo("لقد أرسلت تقييماً لهذا التبادل مسبقاً."));
    }
    throw error;
  }

  if (!recipientId) redirect(returnTo("لا يمكن تقييم هذا المستخدم قبل اكتمال التبادل."));
  revalidatePath("/requests");
  revalidatePath(`/users/${recipientId}`);
  redirect(`/requests?tab=${tab}&reviewed=1`);
}
