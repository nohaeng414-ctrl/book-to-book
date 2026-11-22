"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"loading" | "success" | "error">(
    token ? "loading" : "error"
  );
  const [message, setMessage] = useState(
    token
      ? "جاري التحقق من رابط تفعيل البريد الإلكتروني..."
      : "رابط التفعيل غير مكتمل أو غير صالح. يرجى التحقق من الرابط المرسل إلى بريدك."
  );
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (attemptedRef.current) return;
    attemptedRef.current = true;

    if (!token) return;

    const verify = async () => {
      try {
        const res = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        const data = await res.json().catch(() => null);

        if (!res.ok) {
          setStatus("error");
          setMessage(data?.error || "رابط التفعيل منتهي الصلاحية أو غير صحيح.");
          return;
        }

        setStatus("success");
        setMessage(data?.message || "تم تفعيل بريدك الإلكتروني بنجاح! يمكنك تسجيل الدخول الآن.");
      } catch {
        setStatus("error");
        setMessage("تعذر الاتصال بالخادم أثناء تفعيل الحساب. تحقق من الإنترنت وحاول مجدداً.");
      }
    };

    verify();
  }, [token]);

  return (
    <div className="w-full max-w-md space-y-6 rounded-3xl border border-[#E2E8F0] bg-white p-8 text-center shadow-xl shadow-[#0F172A]/5">
      <div className="flex flex-col items-center">
        <div className="mb-4">
          <Image
            src="/logo.png"
            alt="شعار كتاب بكتاب"
            width={140}
            height={140}
            priority
            className="mx-auto h-28 w-28 object-contain drop-shadow-md"
          />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-[#0F172A]">
          تفعيل البريد الإلكتروني
        </h1>
      </div>

      {status === "loading" && (
        <div className="space-y-3 py-4">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-[#CBD5E1] border-t-[#1E293B]" />
          <p className="text-sm font-medium text-[#64748B]">{message}</p>
        </div>
      )}

      {status === "success" && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold leading-relaxed text-emerald-700">
            {message}
          </div>
          <Link
            href="/login"
            className="block w-full rounded-xl bg-gradient-to-r from-[#1E293B] to-[#334155] py-3.5 text-sm font-bold text-white shadow-md shadow-[#1E293B]/20 transition hover:from-[#0F172A] hover:to-[#1E293B]"
          >
            الانتقال إلى تسجيل الدخول
          </Link>
        </div>
      )}

      {status === "error" && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold leading-relaxed text-red-600">
            {message}
          </div>
          <div className="flex flex-col gap-2.5">
            <Link
              href="/register"
              className="block w-full rounded-xl bg-gradient-to-r from-[#1E293B] to-[#334155] py-3 text-sm font-bold text-white transition hover:from-[#0F172A] hover:to-[#1E293B]"
            >
              إنشاء حساب جديد
            </Link>
            <Link
              href="/login"
              className="text-xs font-bold text-[#64748B] transition hover:text-[#0F172A] hover:underline"
            >
              العودة لصفحة تسجيل الدخول
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <main
      dir="rtl"
      className="flex min-h-screen items-center justify-center bg-[#F1F5F9] px-4 py-12 text-[#0F172A]"
    >
      <Suspense
        fallback={
          <div className="w-full max-w-md rounded-3xl border border-[#E2E8F0] bg-white p-8 text-center text-sm font-bold text-[#64748B] shadow-xl">
            جاري التحميل...
          </div>
        }
      >
        <VerifyEmailContent />
      </Suspense>
    </main>
  );
}
