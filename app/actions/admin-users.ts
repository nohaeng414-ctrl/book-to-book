"use server";

import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

async function verifyAdmin() {
  const session = await auth();
  if (!session?.user?.email || !(await isAdmin())) {
    throw new Error("غير مصرح لك بهذا الإجراء");
  }
  return session.user;
}

// 1. حظر أو فك حظر مستخدم
export async function toggleBanUserAction(
  userId: string,
  ban: boolean,
  banReason?: string
) {
  await verifyAdmin();

  await prisma.user.update({
    where: { id: userId },
    data: {
      isBanned: ban,
      banReason: ban ? banReason || "مخالفة سياسات منصة كتاب بكتاب" : null,
    },
  });

  revalidatePath("/admin/users");
  revalidatePath("/admin/reports");
  revalidatePath("/admin");
  return { success: true };
}

// 2. حذف حساب المستخدم نهائياً مع كافة ارتباطاته (لتجاوز قيد Restrict في Prisma)
export async function deleteUserAction(userId: string) {
  const adminUser = await verifyAdmin();
  
  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  if (!targetUser) {
    return { success: false, error: "المستخدم غير موجود" };
  }

  if (targetUser.email === adminUser.email) {
    return { success: false, error: "لا يمكنك حذف حساب المشرف الخاص بك!" };
  }

  await prisma.$transaction(async (tx) => {
    // جلب كافة التبادلات المرتبطة بالمستخدم أو بكتبه
    const userBooks = await tx.book.findMany({
      where: { ownerId: userId },
      select: { id: true },
    });
    const bookIds = userBooks.map((b) => b.id);

    const relatedSwaps = await tx.swap.findMany({
      where: {
        OR: [
          { requesterId: userId },
          { receiverId: userId },
          { requestedBookId: { in: bookIds } },
          { offeredBookId: { in: bookIds } },
        ],
      },
      select: { id: true },
    });
    const swapIds = relatedSwaps.map((s) => s.id);

    // 1. حذف معاملات النقاط المرتبطة بالتبادلات أو بالمستخدم
    await tx.pointTransaction.deleteMany({
      where: {
        OR: [{ userId }, { swapId: { in: swapIds } }],
      },
    });

    // 2. حذف التبادلات المرتبطة
    if (swapIds.length > 0) {
      await tx.swap.deleteMany({
        where: { id: { in: swapIds } },
      });
    }

    // 3. حذف المستخدم (سيتم حذف الكتب والرسائل والبلاغات تلقائياً بفضل Cascade)
    await tx.user.delete({
      where: { id: userId },
    });
  });

  revalidatePath("/admin/users");
  revalidatePath("/admin/reports");
  revalidatePath("/admin");
  revalidatePath("/");
  return { success: true };
}

// 3. إرسال إشعار أو تنبيه مباشر لمستخدم واحد
export async function sendAdminNotificationAction(
  userId: string,
  title: string,
  body: string
) {
  const adminUser = await verifyAdmin();
  const dbAdmin = await prisma.user.findUnique({
    where: { email: adminUser.email! },
    select: { id: true },
  });

  await prisma.notification.create({
    data: {
      userId,
      actorId: dbAdmin?.id,
      type: "SWAP_REQUEST",
      title: `🛡️ تنبيه من الإدارة: ${title}`,
      body,
      link: "/profile",
    },
  });

  revalidatePath("/admin/users");
  return { success: true };
}

// 4. إرسال إشعار جماعي لكافة مستخدمي المنصة بضغطة واحدة
export async function broadcastAdminNotificationAction(
  title: string,
  body: string
) {
  const adminUser = await verifyAdmin();
  const dbAdmin = await prisma.user.findUnique({
    where: { email: adminUser.email! },
    select: { id: true },
  });

  const allUsers = await prisma.user.findMany({
    where: { isBanned: false },
    select: { id: true },
  });

  if (allUsers.length === 0) return { success: true, count: 0 };

  await prisma.notification.createMany({
    data: allUsers.map((u) => ({
      userId: u.id,
      actorId: dbAdmin?.id ?? null,
      type: "SWAP_REQUEST",
      title: `📢 إعلان من إدارة كتاب بكتاب: ${title}`,
      body,
      link: "/",
    })),
  });

  revalidatePath("/admin");
  return { success: true, count: allUsers.length };
}

// 5. تعديل رصيد نقاط المستخدم (إضافة أو خصم إداري)
export async function adjustUserPointsAction(
  userId: string,
  amount: number,
  reason: string
) {
  await verifyAdmin();

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { points: true },
    });

    if (!user) throw new Error("المستخدم غير موجود");

    const newPoints = Math.max(0, user.points + amount);

    await tx.user.update({
      where: { id: userId },
      data: { points: newPoints },
    });

    await tx.pointTransaction.create({
      data: {
        userId,
        amount,
        type: "ADJUSTMENT",
        idempotencyKey: `admin-adj-${userId}-${Date.now()}`,
        description: reason || "تعديل إداري لرصيد النقاط",
      },
    });
  });

  revalidatePath("/admin/users");
  return { success: true };
}

// 6. حذف كتاب مخالف للمستخدم
export async function adminDeleteBookAction(bookId: string, userId: string) {
  await verifyAdmin();

  const book = await prisma.book.update({
    where: { id: bookId },
    data: {
      isDeleted: true,
      isAvailable: false,
    },
  });

  await prisma.notification.create({
    data: {
      userId,
      type: "SWAP_REQUEST",
      title: "🛡️ تم حذف كتاب لمخالفته السياسات",
      body: `قامت الإدارة بحذف كتاب "${book.title}" من مكتبتك لعدم توافقه مع معايير النشر.`,
      link: "/profile",
    },
  });

  revalidatePath("/admin/users");
  revalidatePath("/admin");
  revalidatePath("/");
  return { success: true };
}