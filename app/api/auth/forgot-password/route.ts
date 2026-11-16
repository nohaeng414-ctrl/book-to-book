import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { consumeRateLimit, getClientIp } from "@/lib/rate-limit";

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

    if (!baseUrl || !process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      return NextResponse.json(
        { error: "خدمة إرسال البريد غير مفعلة حالياً (يرجى إضافة بيانات Gmail في ملف البيئة)." },
        { status: 503 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    const [ipLimit, emailLimit] = await Promise.all([
      consumeRateLimit("forgot-password-ip", getClientIp(request), 10, 15 * 60 * 1000),
      consumeRateLimit("forgot-password-email", normalizedEmail, 5, 60 * 60 * 1000),
    ]);

    if (!ipLimit.allowed || !emailLimit.allowed) {
      return NextResponse.json(
        { error: "لقد تجاوزت الحد المسموح من المحاولات، يرجى الانتظار قليلاً." },
        { status: 429 }
      );
    }

    // 1. التحقق الصريح من وجود البريد في قاعدة البيانات
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true, name: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "هذا البريد الإلكتروني غير مسجل في تطبيق كتاب بكتاب." },
        { status: 404 }
      );
    }

    // 2. إنشاء التوكن وحفظه
    const token = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    await prisma.passwordResetToken.upsert({
      where: { userId: user.id },
      create: { userId: user.id, tokenHash, expiresAt },
      update: { tokenHash, expiresAt, createdAt: new Date() },
    });

    // 3. إرسال الرسالة الفعلية عبر Gmail
    try {
      const resetUrl = new URL("/reset-password", baseUrl);
      resetUrl.searchParams.set("token", token);

      await sendEmail({
        to: user.email,
        subject: "استعادة كلمة المرور | كتاب بكتاب",
        text: `مرحباً ${user.name || ""}، استخدم الرابط التالي لتغيير كلمة مرورك خلال 30 دقيقة: ${resetUrl.toString()}`,
        html: `
          <div dir="rtl" style="font-family: Tahoma, Arial, sans-serif; line-height: 1.8; color: #0F172A; max-width: 520px; margin: auto; padding: 24px; border: 1px solid #E2E8F0; border-radius: 16px;">
            <h2 style="margin-top: 0; color: #0F172A;">استعادة كلمة المرور</h2>
            <p>مرحباً <strong>${user.name || "بك"}</strong> ،</p>
            <p>اضغط على الزر أدناه لتعيين كلمة مرور جديدة لحسابك. صلاحية الرابط 30 دقيقة فقط:</p>
            <p style="margin: 24px 0;">
              <a href="${resetUrl.toString()}" style="display: inline-block; background-color: #0D9488; color: #FFFFFF; text-decoration: none; padding: 12px 24px; border-radius: 12px; font-weight: bold;">
                تعيين كلمة مرور جديدة
              </a>
            </p>
            <p style="font-size: 13px; color: #64748B;">إذا لم تطلب تغيير كلمة المرور، يمكنك تجاهل هذه الرسالة.</p>
          </div>
        `,
      });

      return NextResponse.json({
        message: "تم إرسال رابط استعادة كلمة المرور إلى بريدك الإلكتروني بنجاح. يرجى تفقد صندوق الوارد (أو الرسائل غير المرغوب فيها).",
      });
    } catch (mailError) {
      await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, tokenHash } });
      console.error("Gmail delivery failed:", mailError);
      return NextResponse.json(
        { error: "تعذر إرسال الرسالة إلى بريدك الإلكتروني حالياً. تأكد من إعدادات الإرسال." },
        { status: 500 }
      );
    }
  } catch (err) {
    console.error("Forgot password error:", err);
    return NextResponse.json(
      { error: "حدث خطأ في الاتصال بقاعدة البيانات. حاول مرة أخرى." },
      { status: 503 }
    );
  }
}