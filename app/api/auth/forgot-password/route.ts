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
    if (
      typeof email !== "string" ||
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    ) {
      return NextResponse.json({ error: "البريد الإلكتروني غير صالح" }, { status: 400 });
    }

    const baseUrl =
      process.env.APP_BASE_URL ??
      process.env.NEXTAUTH_URL ??
      (process.env.NODE_ENV === "development" ? "http://localhost:3000" : undefined);

    const isEmailConfigured = Boolean(
      baseUrl && process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL
    );

    if (!isEmailConfigured && process.env.NODE_ENV !== "development") {
      return NextResponse.json(
        { error: "خدمة استعادة الحساب غير مهيأة بعد" },
        { status: 503 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const [ipLimit, emailLimit] = await Promise.all([
      consumeRateLimit("forgot-password-ip", getClientIp(request), 6, 15 * 60 * 1000),
      consumeRateLimit("forgot-password-email", normalizedEmail, 3, 60 * 60 * 1000),
    ]);
    if (!ipLimit.allowed || !emailLimit.allowed) {
      const retryAfter = Math.max(ipLimit.retryAfterSeconds, emailLimit.retryAfterSeconds);
      return NextResponse.json(genericResponse, {
        status: 200,
        headers: { "Retry-After": String(retryAfter) },
      });
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true },
    });

    if (user && baseUrl) {
      const token = randomBytes(32).toString("base64url");
      const tokenHash = createHash("sha256").update(token).digest("hex");
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

      await prisma.passwordResetToken.upsert({
        where: { userId: user.id },
        create: { userId: user.id, tokenHash, expiresAt },
        update: { tokenHash, expiresAt, createdAt: new Date() },
      });

      const resetUrl = new URL("/reset-password", baseUrl);
      resetUrl.searchParams.set("token", token);

      // في بيئة التطوير بدون إعداد Resend، نطبع الرابط في التيرمينال لتسهيل الاختبار
      if (!isEmailConfigured) {
        console.log("🔑 [DEV] رابط استعادة كلمة المرور:", resetUrl.toString());
        return NextResponse.json(genericResponse);
      }

      try {
        await sendEmail({
          to: user.email,
          subject: "تغيير كلمة المرور | كتاب بكتاب",
          text: `استخدم الرابط التالي لتغيير كلمة مرورك خلال 30 دقيقة: ${resetUrl.toString()}\nإذا لم تطلب ذلك، فتجاهل هذه الرسالة.`,
          html: `
            <div dir="rtl" style="font-family: Tahoma, Arial, sans-serif; line-height: 1.8; color: #0F172A; max-width: 520px; margin: auto; padding: 24px; border: 1px solid #E2E8F0; border-radius: 16px;">
              <h2 style="margin-top: 0; color: #0F172A;">تغيير كلمة المرور</h2>
              <p>مرحباً بك في <strong>كتاب بكتاب</strong>، اضغط على الزر أدناه لتعيين كلمة مرور جديدة لحسابك. ينتهي الرابط خلال 30 دقيقة ويمكن استخدامه مرة واحدة فقط.</p>
              <p style="margin: 24px 0;">
                <a href="${resetUrl.toString()}" style="display: inline-block; background-color: #0D9488; color: #FFFFFF; text-decoration: none; padding: 12px 24px; border-radius: 12px; font-weight: bold;">
                  تغيير كلمة المرور
                </a>
              </p>
              <p style="font-size: 13px; color: #64748B;">إذا لم تطلب تغيير كلمة المرور، يمكنك تجاهل هذه الرسالة بأمان.</p>
            </div>
          `,
        });
      } catch {
        await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, tokenHash } });
        console.error("Password reset email delivery failed.");
      }
    }

    return NextResponse.json(genericResponse);
  } catch {
    return NextResponse.json(
      { error: "تعذر إرسال الطلب حالياً. حاول لاحقاً." },
      { status: 503 }
    );
  }
}