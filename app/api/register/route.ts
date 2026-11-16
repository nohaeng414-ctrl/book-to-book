import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { sendEmail } from "@/lib/email";
import { consumeRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > 10_000) {
      return NextResponse.json({ error: "حجم بيانات التسجيل كبير جداً" }, { status: 413 });
    }

    const payload: unknown = await request.json();
    if (!payload || typeof payload !== "object") {
      return NextResponse.json({ error: "بيانات التسجيل غير صالحة" }, { status: 400 });
    }

    const { name, email, password, country, city, district } = payload as Record<string, unknown>;

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      !name.trim() ||
      !email.trim() ||
      !password
    ) {
      return NextResponse.json({ error: "يرجى ملء جميع الحقول المطلوبة" }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (
      name.trim().length > 100 ||
      normalizedEmail.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
    ) {
      return NextResponse.json({ error: "الاسم أو البريد الإلكتروني غير صالح" }, { status: 400 });
    }

    if (password.length < 8 || Buffer.byteLength(password, "utf8") > 72) {
      return NextResponse.json(
        { error: "يجب أن تكون كلمة المرور 8 أحرف على الأقل وألا تتجاوز 72 بايت" },
        { status: 400 }
      );
    }

    if (
      (country !== undefined && country !== null && (typeof country !== "string" || country.length > 100)) ||
      (city !== undefined && city !== null && (typeof city !== "string" || city.trim().length > 100)) ||
      (district !== undefined && district !== null && (typeof district !== "string" || district.trim().length > 100))
    ) {
      return NextResponse.json({ error: "بيانات الموقع غير صالحة" }, { status: 400 });
    }

    const [ipLimit, emailLimit] = await Promise.all([
      consumeRateLimit("register-ip", getClientIp(request), 8, 60 * 60 * 1000),
      consumeRateLimit("register-email", normalizedEmail, 3, 60 * 60 * 1000),
    ]);

    if (!ipLimit.allowed || !emailLimit.allowed) {
      const retryAfter = Math.max(ipLimit.retryAfterSeconds, emailLimit.retryAfterSeconds);
      return NextResponse.json(
        { error: "تجاوزت عدد محاولات إنشاء الحساب. حاول لاحقاً." },
        { status: 429, headers: { "Retry-After": String(retryAfter) } }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, name: true, email: true, emailVerified: true },
    });

    // إذا كان البريد مسجلاً ومفعّلاً بالفعل نمنع التكرار
    if (existingUser && existingUser.emailVerified) {
      return NextResponse.json({ error: "البريد الإلكتروني مستخدم بالفعل" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const token = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // إنشاء حساب جديد أو تحديث بيانات الحساب غير المفعّل وإعادة إرسال الرابط
    const user = existingUser
      ? await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            name: name.trim(),
            hashedPassword,
            country: typeof country === "string" && country.trim() ? country.trim() : null,
            city: typeof city === "string" && city.trim() ? city.trim() : "الرياض",
            neighborhood: typeof district === "string" && district.trim() ? district.trim() : null,
            emailVerificationToken: {
              upsert: {
                create: { tokenHash, expiresAt },
                update: { tokenHash, expiresAt, createdAt: new Date() },
              },
            },
          },
        })
      : await prisma.user.create({
          data: {
            name: name.trim(),
            email: normalizedEmail,
            hashedPassword,
            emailVerified: null,
            country: typeof country === "string" && country.trim() ? country.trim() : null,
            city: typeof city === "string" && city.trim() ? city.trim() : "الرياض",
            neighborhood: typeof district === "string" && district.trim() ? district.trim() : null,
            emailVerificationToken: {
              create: { tokenHash, expiresAt },
            },
          },
        });

    const baseUrl =
      process.env.APP_BASE_URL ??
      process.env.NEXTAUTH_URL ??
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

    const verifyUrl = new URL("/verify-email", baseUrl);
    verifyUrl.searchParams.set("token", token);

    try {
      await sendEmail({
        to: user.email,
        subject: "تفعيل حسابك في منصة كتاب بكتاب",
        text: `مرحباً ${user.name}، اضغط على الرابط التالي لتفعيل حسابك في منصة كتاب بكتاب: ${verifyUrl.toString()}`,
        html: `
          <div dir="rtl" style="font-family: Tahoma, Arial, sans-serif; line-height: 1.8; color: #0F172A; max-width: 520px; margin: auto; padding: 24px; border: 1px solid #E2E8F0; border-radius: 16px;">
            <h2 style="margin-top: 0;">أهلاً بك في منصة كتاب بكتاب 📚</h2>
            <p>مرحباً <strong>${user.name}</strong>، يرجى تأكيد بريدك الإلكتروني لتفعيل حسابك والبدء بتبادل الكتب:</p>
            <p style="margin: 24px 0;">
              <a href="${verifyUrl.toString()}" style="display: inline-block; background-color: #1E293B; color: #FFFFFF; text-decoration: none; padding: 12px 24px; border-radius: 12px; font-weight: bold;">
                تفعيل الحساب الآن
              </a>
            </p>
            <p style="font-size: 13px; color: #64748B;">صلاحية رابط التفعيل 24 ساعة.</p>
          </div>
        `,
      });
    } catch (mailError) {
      console.error("Verification email failed:", mailError);
      return NextResponse.json(
        {
          message:
            "تم حفظ بيانات حسابك، لكن تعذر إرسال بريد التفعيل حالياً. يمكنك إعادة المحاولة لاحقاً.",
          userId: user.id,
        },
        { status: 201 }
      );
    }

    return NextResponse.json(
      {
        message: "تم إنشاء الحساب بنجاح! تفقد بريدك الإلكتروني لتفعيل حسابك قبل تسجيل الدخول.",
        userId: user.id,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "البريد الإلكتروني مستخدم بالفعل" }, { status: 409 });
    }
    console.error("Register error:", error);
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}