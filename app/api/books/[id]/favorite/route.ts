import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "غير مصرح، يرجى تسجيل الدخول" }, { status: 401 });
    }

    const { id: bookId } = await params;

    // جلب المستخدم والتأكد من حالة المفضلة للكتاب
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        favoriteBooks: {
          where: { id: bookId },
          select: { id: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });
    }

    const isFavorited = user.favoriteBooks.length > 0;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        favoriteBooks: isFavorited
          ? { disconnect: { id: bookId } }
          : { connect: { id: bookId } },
      },
    });

    return NextResponse.json({
      success: true,
      isFavorite: !isFavorited,
    });
  } catch (error) {
    console.error("Favorite route error:", error);
    return NextResponse.json({ error: "تعذر تحديث المفضلة" }, { status: 500 });
  }
}