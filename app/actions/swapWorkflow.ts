"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { SwapError, transitionSwap } from "@/lib/swaps";

export async function acceptSwapWithOfferAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const swapId = String(formData.get("swapId") ?? "");
  const offeredBookId = String(formData.get("offeredBookId") ?? "");
  if (!swapId || !offeredBookId) {
    redirect(
      "/requests?tab=incoming&error=" +
        encodeURIComponent("اختر كتاباً من القائمة أولاً.")
    );
  }

  const currentUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, isBanned: true },
  });
  if (!currentUser) redirect("/login");
  if (currentUser.isBanned) {
    redirect(
      `/swaps/${encodeURIComponent(swapId)}?error=${encodeURIComponent(
        "حسابك موقوف ولا يمكنك تنفيذ هذا الإجراء."
      )}`
    );
  }

  try {
    await transitionSwap(currentUser.id, swapId, "accept", [offeredBookId]);
  } catch (error) {
    if (!(error instanceof SwapError)) throw error;
    redirect(
      `/swaps/${encodeURIComponent(swapId)}?error=${encodeURIComponent(
        error.message
      )}`
    );
  }

  revalidatePath("/requests");
  revalidatePath(`/swaps/${swapId}`);
  revalidatePath("/my-books");
  revalidatePath("/");
  redirect(`/swaps/${swapId}`);
}

// دالة مخصصة لنافذة اختيار الكتب (SelectBookModal) تدعم كتاباً واحداً أو عدة كتب
export async function acceptSwapWithOfferFromModalAction(
  swapId: string,
  offeredBookIds: string | string[]
) {
  const session = await auth();
  if (!session?.user?.email) {
    return { error: "يرجى تسجيل الدخول أولاً." };
  }

  const normalizedIds = Array.isArray(offeredBookIds)
    ? [...new Set(offeredBookIds.filter(Boolean))]
    : offeredBookIds
    ? [offeredBookIds]
    : [];

  if (!swapId || normalizedIds.length === 0) {
    return { error: "اختر كتاباً واحداً على الأقل من القائمة أولاً." };
  }

  const currentUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, isBanned: true },
  });

  if (!currentUser) {
    return { error: "المستخدم غير موجود." };
  }
  if (currentUser.isBanned) {
    return { error: "حسابك موقوف ولا يمكنك تنفيذ هذا الإجراء." };
  }

  try {
    await transitionSwap(currentUser.id, swapId, "accept", normalizedIds);
  } catch (error) {
    if (error instanceof SwapError) {
      return { error: error.message };
    }
    console.error("acceptSwapWithOfferFromModalAction error:", error);
    return { error: "حدث خطأ غير متوقع أثناء قبول الطلب." };
  }

  revalidatePath("/requests");
  revalidatePath(`/swaps/${swapId}`);
  revalidatePath("/my-books");
  revalidatePath("/");
  return { success: true };
}

// 1. قبول أو رفض الطلب أثناء مرحلة التفاوض والرسائل
export async function updateSwapStatusAction(
  swapId: string,
  action: "ACCEPT" | "REJECT",
  reason?: string
) {
  const session = await auth();
  if (!session?.user?.email) return { error: "يرجى تسجيل الدخول" };

  const currentUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, isBanned: true },
  });

  if (!currentUser) return { error: "المستخدم غير موجود" };
  if (currentUser.isBanned)
    return { error: "تم تعليق حسابك، لا يمكنك اتخاذ هذا الإجراء" };

  const swap = await prisma.swap.findUnique({
    where: { id: swapId },
  });

  if (!swap || swap.status !== "PENDING")
    return { error: "طلب التبادل غير متاح" };
  if (swap.receiverId !== currentUser.id) {
    return { error: "صاحب الكتاب فقط هو المخول بقبول أو رفض الطلب" };
  }

  if (action === "ACCEPT") {
    try {
      const initialOffers =
        swap.offeredBookIds.length > 0
          ? swap.offeredBookIds
          : swap.offeredBookId
          ? [swap.offeredBookId]
          : undefined;
      await transitionSwap(currentUser.id, swapId, "accept", initialOffers);
    } catch (error) {
      if (error instanceof SwapError) return { error: error.message };
      throw error;
    }
  } else {
    if (reason && reason.length > 500) return { error: "سبب الرفض طويل جداً" };
    try {
      await transitionSwap(currentUser.id, swapId, "reject");
      if (reason?.trim()) {
        await prisma.swap.updateMany({
          where: { id: swapId, status: "REJECTED", receiverId: currentUser.id },
          data: { cancelReason: reason.trim() },
        });
      }
    } catch (error) {
      if (error instanceof SwapError) return { error: error.message };
      throw error;
    }
  }

  revalidatePath(`/swaps/${swapId}`);
  return { success: true };
}

export async function cancelAcceptedSwapAction(swapId: string) {
  const session = await auth();
  if (!session?.user?.email) return { error: "يرجى تسجيل الدخول" };
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, isBanned: true },
  });
  if (!user || user.isBanned)
    return { error: "لا يمكن تنفيذ الإلغاء بهذا الحساب" };
  try {
    await transitionSwap(user.id, swapId, "cancel");
  } catch (error) {
    if (error instanceof SwapError) return { error: error.message };
    throw error;
  }
  revalidatePath(`/swaps/${swapId}`);
  revalidatePath("/requests");
  revalidatePath("/my-books");
  revalidatePath("/");
  return { success: true };
}

// 2. تأكيد التسليم أو الاستلام برفع صورة الإثبات
export async function confirmReceiptWithProofAction({
  swapId,
  proofUrl,
}: {
  swapId: string;
  proofUrl?: string;
}) {
  const session = await auth();
  if (!session?.user?.email) return { error: "يرجى تسجيل الدخول" };
  if (typeof swapId !== "string" || !swapId)
    return { error: "طلب المبادلة غير صالح" };
  if (
    proofUrl &&
    (!/^data:image\/(?:jpeg|png|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/.test(
      proofUrl
    ) ||
      proofUrl.length > 7_000_000)
  ) {
    return { error: "صيغة صورة الإثبات أو حجمها غير صالح" };
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, isBanned: true },
  });
  if (!user) return { error: "المستخدم غير موجود" };
  if (user.isBanned) return { error: "حسابك موقوف" };

  const swap = await prisma.swap.findFirst({
    where: {
      id: swapId,
      OR: [{ requesterId: user.id }, { receiverId: user.id }],
    },
    select: { id: true, receiverId: true },
  });
  if (!swap) return { error: "غير مصرح لك بتأكيد هذا الطلب" };

  const isReceiver = swap.receiverId === user.id;
  try {
    await transitionSwap(user.id, swapId, isReceiver ? "delivery" : "receipt");
  } catch (error) {
    if (error instanceof SwapError) return { error: error.message };
    throw error;
  }

  if (proofUrl) {
    await prisma.swap.update({
      where: { id: swapId },
      data: isReceiver
        ? { deliveryProofUrl: proofUrl }
        : { receiptProofUrl: proofUrl },
    });
  }
  revalidatePath(`/swaps/${swapId}`);
  revalidatePath("/requests");
  revalidatePath("/profile");
  return { success: true };
}

// 3. رفع نزاع للإدارة
export async function raiseDisputeAction(swapId: string, reason: string) {
  const session = await auth();
  if (!session?.user?.email) return { error: "يرجى تسجيل الدخول" };
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, isBanned: true },
  });
  if (!user || user.isBanned) return { error: "غير مصرح" };
  if (typeof reason !== "string" || !reason.trim() || reason.length > 500)
    return { error: "سبب البلاغ غير صالح" };
  const swap = await prisma.swap.findFirst({
    where: {
      id: swapId,
      status: { in: ["ACCEPTED", "AWAITING_DELIVERY", "AWAITING_CONFIRMATION"] },
      OR: [{ requesterId: user.id }, { receiverId: user.id }],
    },
    select: { id: true, requesterId: true, receiverId: true, status: true },
  });
  if (!swap) return { error: "لا يمكن فتح نزاع لهذا الطلب" };
  const reportedId =
    swap.requesterId === user.id ? swap.receiverId : swap.requesterId;
  const reportResult = await prisma.$transaction(async (tx) => {
    const changed = await tx.swap.updateMany({
      where: { id: swap.id, status: swap.status },
      data: { status: "DISPUTED", cancelReason: reason.trim() },
    });
    if (changed.count !== 1) return false;
    await tx.report.create({
      data: {
        reporterId: user.id,
        reportedId,
        swapId,
        reason: "نزاع في التبادل",
        details: reason.trim(),
      },
    });
    return true;
  });
  if (!reportResult) return { error: "تغيرت حالة الطلب؛ حدّث الصفحة" };

  revalidatePath(`/swaps/${swapId}`);
  revalidatePath("/admin/reports");
  return { success: true };
}

// 4. تقديم بلاغ ضد مستخدم
export async function reportUserAction({
  reportedUserId,
  reason,
  details,
  swapId,
}: {
  reportedUserId: string;
  reason: string;
  details?: string;
  swapId?: string;
}) {
  const session = await auth();
  if (!session?.user?.email) return { error: "يرجى تسجيل الدخول" };

  const currentUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, isBanned: true },
  });

  if (!currentUser) return { error: "المستخدم غير موجود" };
  if (currentUser.isBanned)
    return { error: "تم تعليق حسابك، لا يمكنك إرسال بلاغات" };
  if (
    !reportedUserId ||
    reportedUserId === currentUser.id ||
    !reason?.trim() ||
    reason.length > 200 ||
    (details?.length ?? 0) > 2000
  )
    return { error: "بيانات البلاغ غير صالحة" };
  if (swapId) {
    const swap = await prisma.swap.findFirst({
      where: {
        id: swapId,
        OR: [
          { requesterId: currentUser.id, receiverId: reportedUserId },
          { requesterId: reportedUserId, receiverId: currentUser.id },
        ],
      },
      select: { id: true },
    });
    if (!swap)
      return { error: "لا يرتبط هذا البلاغ بعملية تبادل مصرح بها" };
  }

  await prisma.report.create({
    data: {
      reporterId: currentUser.id,
      reportedId: reportedUserId,
      reason,
      details,
      swapId,
    },
  });

  return { success: true };
}

// 5. إرسال رسالة جديدة داخل محادثة المبادلة
export async function sendSwapMessageAction(swapId: string, content: string) {
  const session = await auth();
  if (!session?.user?.email) return { error: "يرجى تسجيل الدخول" };

  const trimmed = content.trim();
  if (!trimmed || trimmed.length > 2000)
    return { error: "يجب أن تكون الرسالة بين حرف واحد و2000 حرف" };

  const currentUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, name: true, isBanned: true },
  });

  if (!currentUser) return { error: "المستخدم غير موجود" };

  if (currentUser.isBanned) {
    return { error: "لقد تم حظر حسابك!" };
  }

  const participant = await prisma.swap.findFirst({
    where: {
      id: swapId,
      OR: [{ requesterId: currentUser.id }, { receiverId: currentUser.id }],
    },
    select: { id: true },
  });
  if (!participant) return { error: "غير مصرح لك بمراسلة هذا الطلب" };

  const message = await prisma.message.create({
    data: {
      swapId,
      senderId: currentUser.id,
      content: trimmed,
    },
    include: {
      sender: { select: { id: true, name: true } },
    },
  });

  revalidatePath(`/swaps/${swapId}`);
  return { success: true, message };
}

// 6. جلب رسائل المبادلة الحالية
export async function getSwapMessagesAction(swapId: string) {
  const session = await auth();
  if (!session?.user?.email) return [];

  const participant = await prisma.swap.findFirst({
    where: {
      id: swapId,
      OR: [
        { requester: { email: session.user.email } },
        { receiver: { email: session.user.email } },
      ],
    },
    select: { id: true },
  });
  if (!participant) return [];

  return await prisma.message.findMany({
    where: { swapId },
    include: {
      sender: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}