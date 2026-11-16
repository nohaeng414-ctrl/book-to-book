"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function toggleFollow(targetUserId: string) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return { success: false, error: "يجب تسجيل الدخول أولاً" };
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!currentUser || currentUser.id === targetUserId) {
      return { success: false, error: "عملية غير صالحة" };
    }

    const isFollowing = await prisma.user.findFirst({
      where: {
        id: targetUserId,
        followedBy: { some: { id: currentUser.id } },
      },
      select: { id: true },
    });

    if (isFollowing) {
      await prisma.user.update({
        where: { id: targetUserId },
        data: {
          followedBy: { disconnect: { id: currentUser.id } },
        },
      });
      return { success: true, isFollowing: false };
    } else {
      await prisma.user.update({
        where: { id: targetUserId },
        data: {
          followedBy: { connect: { id: currentUser.id } },
        },
      });
      return { success: true, isFollowing: true };
    }
  } catch (error) {
    console.error("Error in toggleFollow:", error);
    return { success: false, error: "حدث خطأ" };
  }
}