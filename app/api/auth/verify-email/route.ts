import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { token } = await request.json();
    if (typeof token !== "string" || !token) {
      return NextResponse.json({ error: "رمز التفعيل غير صالح." }, { status: 400 });
    }

    const tokenHash = createHash("sha256").update(token).digest("hex");
    const record = await prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!record || record.expiresAt < new Date()) {
      if (record) {
        await prisma.emailVerificationToken.delete({ where: { id: record.id } });
      }
      return NextResponse.json(
        { error: "رابط التفعيل منتهي الصلاحية أو غير صحيح." },
        { status: 400 }
      );
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { emailVerified: new Date() },
      }),
      prisma.emailVerificationToken.delete({ where: { id: record.id } }),
    ]);

    return NextResponse.json({ message: "تم تفعيل بريدك الإلكتروني بنجاح! يمكنك تسجيل الدخول الآن." });
  } catch (err) {
    console.error("Verify email error:", err);
    return NextResponse.json({ error: "حدث خطأ أثناء تفعيل الحساب." }, { status: 500 });
  }
}