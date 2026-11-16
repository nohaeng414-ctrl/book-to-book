import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { consumeRateLimit, getClientIp } from "@/lib/rate-limit";

const genericResponse = {
  message: "إذا كان البريد مسجلاً، فستصلك رسالة تتضمن خطوات تغيير كلمة المرور.",
};

export async function POST(request: Request) {
  try {
    const length = Number(request.headers.get("content-length") ?? 0);
    if (length > 2_000) {
      return NextResponse.json({ error: "الطلب كبير جداً" }, { status: 413 });
    }

    const payload: unknown = await request.json();
    if (!payload || typeof payload !== "object" || !("email" in payload)) {
      return NextResponse.json({ error: "البريد الإلكتروني غير صالح" }, { status: 400 });
    }
    const email = (payload as { email?: unknown }).email;
    if (typeof email !== "string" || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json({ error: "البريد الإلكتروني غير صالح" }, { status: 400 });
    }

    const baseUrl = process.env.APP_BASE_URL ?? process.env.NEXTAUTH_URL;
    if (!baseUrl || !process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
      return NextResponse.json({ error: "خدمة استعادة الحساب غير مهيأة بعد" }, { status: 503 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const [ipLimit, emailLimit] = await Promise.all([
      consumeRateLimit("forgot-password-ip", getClientIp(request), 6, 15 * 60 * 1000),
      consumeRateLimit("forgot-password-email", normalizedEmail, 3, 60 * 60 * 1000),
    ]);
    if (!ipLimit.allowed || !emailLimit.allowed) {
      const retryAfter = Math.max(ipLimit.retryAfterSeconds, emailLimit.retryAfterSeconds);
      return NextResponse.json(genericResponse, { status: 200, headers: { "Retry-After": String(retryAfter) } });
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true },
    });

    if (user) {
      const token = randomBytes(32).toString("base64url");
      const tokenHash = createHash("sha256").update(token).digest("hex");
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

      await prisma.passwordResetToken.upsert({
        where: { userId: user.id },
        create: { userId: user.id, tokenHash, expiresAt },
        update: { tokenHash, expiresAt, createdAt: new Date() },
      });

      try {
        const resetUrl = new URL("/reset-password", baseUrl);
        resetUrl.searchParams.set("token", token);
        await sendEmail({
          to: user.email,
          subject: "تغيير كلمة المرور | كتاب بكتاب",
          text: `استخدم الرابط التالي لتغيير كلمة مرورك خلال 30 دقيقة: ${resetUrl.toString()}\nإذا لم تطلب ذلك، فتجاهل هذه الرسالة.`,
          html: `<div dir="rtl" style="font-family:Arial,sans-serif;line-height:1.8"><h1>تغيير كلمة المرور</h1><p>اضغط الرابط لتغيير كلمة مرورك. ينتهي الرابط خلال 30 دقيقة ويمكن استخدامه مرة واحدة.</p><p><a href="${resetUrl.toString()}">تغيير كلمة المرور</a></p><p>إذا لم تطلب ذلك، فتجاهل هذه الرسالة.</p></div>`,
        });
      } catch (error) {
        await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, tokenHash } });
        console.error("Password reset email delivery failed.", error);
      }
    }

    return NextResponse.json(genericResponse);
  } catch {
    return NextResponse.json({ error: "تعذر إرسال الطلب حالياً. حاول لاحقاً." }, { status: 503 });
  }
}
