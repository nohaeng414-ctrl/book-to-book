"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/admin";

// 1. اتخاذ إجراء بحظر أو إلغاء حظر المستخدم
export async function toggleUserBanAction(userId: string, isBanned: boolean, banReason?: string) {
  const session = await auth();
  if (!session?.user?.email) return { error: "يرجى تسجيل الدخول" };
  if (!(await isAdmin())) return { error: "غير مصرح" };
  if (!userId || typeof isBanned !== "boolean" || (banReason && banReason.length > 500)) {
    return { error: "بيانات غير صالحة" };
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      isBanned,
      banReason: isBanned ? (banReason || "مخالفة شروط الاستخدام وبلاغات المستخدمين") : null,
    },
  });

  revalidatePath("/admin/reports");
  return { success: true };
}

// 2. تحديث حالة البلاغ (تم التعامل معه RESOLVED أو رفض البلاغ DISMISSED)
export async function updateReportStatusAction(
  reportId: string,
  status: "RESOLVED" | "DISMISSED" | "PENDING"
) {
  const session = await auth();
  if (!session?.user?.email) return { error: "يرجى تسجيل الدخول" };
  if (!(await isAdmin())) return { error: "غير مصرح" };
  if (!reportId || !["RESOLVED", "DISMISSED", "PENDING"].includes(status)) {
    return { error: "بيانات غير صالحة" };
  }

  await prisma.report.update({
    where: { id: reportId },
    data: { status },
  });

  revalidatePath("/admin/reports");
  return { success: true };
}
