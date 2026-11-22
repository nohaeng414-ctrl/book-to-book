"use server";

import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function adminSendWarning(
  userId: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.email || !(await isAdmin())) {
    return { success: false, error: "غير مصرح لك بهذا الإجراء." };
  }

  const cleanMessage = message.trim();
  if (!cleanMessage) {
    return { success: false, error: "يرجى كتابة نص التنبيه." };
  }

  try {
    await prisma.notification.create({
      data: {
        userId,
        type: "SWAP_REQUEST",
        title: "تنبيه إداري هام ⚠️",
        body: cleanMessage,
        link: "/notifications",
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Admin send warning error:", error);
    return { success: false, error: "تعذر إرسال التنبيه حالياً." };
  }
}