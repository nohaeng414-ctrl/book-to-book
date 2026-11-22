import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
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
      select: { id: true },
    });

    if (existingUser) {
      return NextResponse.json({ error: "البريد الإلكتروني مستخدم بالفعل" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        hashedPassword,
        emailVerified: new Date(),
        country: typeof country === "string" && country.trim() ? country.trim() : null,
        city: typeof city === "string" && city.trim() ? city.trim() : "الرياض",
        neighborhood: typeof district === "string" && district.trim() ? district.trim() : null,
      },
    });

    return NextResponse.json(
      {
        message: "تم إنشاء الحساب بنجاح! يمكنك تسجيل الدخول الآن.",
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