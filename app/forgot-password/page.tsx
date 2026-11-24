"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setError("");
    setSuccessMessage("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        if (res.status === 503) {
          setError(
            data?.error ||
              "الخدمة غير متاحة مؤقتاً أو هناك مشكلة في الاتصال بقاعدة البيانات. حاول بعد قليل."
          );
        } else {
          setError(
            data?.error ||
              "تعذر إرسال الطلب. تحقق من البيانات المدخلة وحاول مرة أخرى."
          );
        }
        return;
      }

      setSuccessMessage(
        data?.message ||
          "إذا كان البريد مسجلاً، فستصلك رسالة تتضمن خطوات تغيير كلمة المرور."
      );
    } catch (err) {
      if (err instanceof TypeError || !navigator.onLine) {
        setError("تعذر الاتصال بالإنترنت. تحقق من الشبكة وحاول مرة أخرى.");
      } else {
        setError("حدث خطأ غير متوقع أثناء الاتصال بالخادم. حاول مرة أخرى.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      dir="rtl"
      className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10 text-slate-900"
    >
      <div className="w-full max-w-sm space-y-7 rounded-3xl border border-slate-200/80 bg-white p-7 sm:p-8 shadow-sm">
        {/* الشعار والعنوان */}
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 h-32 w-32 overflow-hidden rounded-[2rem] shadow-md transition-transform duration-300 hover:scale-105">
            <Image
              src="/icon.png"
              alt="شعار كتاب بكتاب"
              width={160}
              height={160}
              priority
              className="h-full w-full rounded-[2rem] object-cover"
            />
          </div>

          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            استعادة كلمة المرور
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            أدخل بريدك الإلكتروني وسنرسل لك رابطاً لإعادة تعيين كلمة المرور
          </p>
        </div>

        {/* رسالة الخطأ */}
        {error && (
          <div
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-center text-xs font-bold text-red-600"
          >
            {error}
          </div>
        )}

        {/* رسالة النجاح */}
        {successMessage && (
          <div
            role="status"
            className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-xs font-bold leading-relaxed text-emerald-700"
          >
            {successMessage}
          </div>
        )}

        {/* نموذج استعادة كلمة المرور */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="forgot-email"
              className="mb-1.5 block text-xs font-bold text-slate-700"
            >
              البريد الإلكتروني
            </label>
            <input
              id="forgot-email"
              type="email"
              required
              autoComplete="email"
              dir="ltr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-left text-sm text-slate-900 placeholder-slate-400 transition focus:border-slate-900 focus:bg-white focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-xl bg-slate-900 py-3.5 text-sm font-bold text-white transition hover:bg-slate-800 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "جاري إرسال الرابط..." : "استعادة كلمة المرور"}
          </button>
        </form>

        {/* العودة لتسجيل الدخول */}
        <div className="border-t border-slate-100 pt-5 text-center text-xs text-slate-500">
          تذكرت كلمة المرور؟{" "}
          <Link
            href="/login"
            className="font-bold text-slate-900 hover:underline"
          >
            تسجيل الدخول
          </Link>
        </div>
      </div>
    </main>
  );
}