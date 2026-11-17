"use server";

import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function toggleBookVisibilityAction(bookId: string, isDeleted: boolean) {
  const session = await auth();
  if (!session?.user?.email || !(await isAdmin())) {
    throw new Error("غير مصرح لك بهذا الإجراء");
  }

  await prisma.book.update({
    where: { id: bookId },
    data: { 
      isDeleted, 
      // إذا تم حذف الكتاب إدارياً، نجعله غير متاح للتبادل أيضاً
      isAvailable: !isDeleted 
    },
  });

  revalidatePath("/admin/books");
  revalidatePath("/admin/users");
  revalidatePath("/");
  return { success: true };
}