"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);

const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
          setError(data?.error || "الخدمة غير متاحة مؤقتاً أو هناك مشكلة في الاتصال بقاعدة البيانات. حاول بعد قليل.");
        } else {
          setError(data?.error || "تعذر إرسال الطلب. تحقق من البيانات المدخلة وحاول مرة أخرى.");
        }
        return;
      }

      setSuccessMessage(
        data?.message ||
          "إذا كان البريد مسجلاً، فستصلك رسالة تتضمن خطوات تغيير كلمة المرور."
      );
    } catch (err) {
      // التقاط انقطاع الإنترنت أو فشل الوصول للسيرفر
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
      className="flex min-h-screen items-center justify-center bg-[#F1F5F9] px-4 py-12 text-[#0F172A]"
    >
      <div className="w-full max-w-md space-y-8 rounded-3xl border border-[#E2E8F0] bg-white p-8 shadow-xl shadow-[#0F172A]/5">
        
        {/* الشعار وعنوان الصفحة */}
        <div className="flex flex-col items-center text-center">
          <div className="mb-4">
            <Image
              src="/logo.png"
              alt="شعار كتاب بكتاب"
              width={140}
              height={140}
              className="mx-auto h-32 w-32 object-contain drop-shadow-md transition hover:scale-105"
            />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#0F172A]">
            استعادة كلمة المرور
          </h1>
          <p className="mt-1 text-sm text-[#64748B]">
            أدخل بريدك الإلكتروني وسنرسل لك رابطاً لإعادة تعيين كلمة المرور
          </p>
        </div>

        {/* رسالة الخطأ إن وجدت */}
        {error && (
          <div className="rounded-xl bg-red-50 p-3 text-center text-xs font-bold text-red-600 border border-red-200">
            {error}
          </div>
        )}

        {/* رسالة النجاح */}
        {successMessage && (
          <div className="rounded-xl bg-emerald-50 p-3 text-center text-xs font-bold text-emerald-700 border border-emerald-200 leading-relaxed">
            {successMessage}
          </div>
        )}

        {/* نموذج استعادة كلمة المرور */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-[#334155] mb-1.5">
              البريد الإلكتروني
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] px-4 py-3 text-sm text-[#0F172A] placeholder-[#94A3B8] focus:border-[#1E293B] focus:bg-white focus:outline-none transition"
            />
          </div>

          {/* زر الإرسال */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-[#1E293B] to-[#334155] py-3.5 text-sm font-bold text-white shadow-md shadow-[#1E293B]/20 transition hover:from-[#0F172A] hover:to-[#1E293B] active:scale-[0.98] disabled:opacity-50 cursor-pointer"
          >
            {loading ? "جاري إرسال الرابط..." : "استعادة كلمة المرور"}
          </button>
        </form>

        {/* العودة لصفحة تسجيل الدخول */}
        <div className="text-center text-xs text-[#64748B]">
          تذكرت كلمة المرور؟{" "}
          <Link
            href="/login"
            className="font-bold text-[#1E293B] hover:underline transition"
          >
            تسجيل الدخول
          </Link>
        </div>

      </div>
    </main>
  );
}