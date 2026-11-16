"use client";

import { useState } from "react";
import { getProviders, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

export default function LoginPage() {
  
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const providers = await getProviders();
      if (!providers?.credentials) {
        setError("تعذر الاتصال بخدمة تسجيل الدخول. تحقق من اتصالك ثم حاول مرة أخرى.");
        setLoading(false);
        return;
      }

      const result = await signIn("credentials", {
        redirect: false,
        email: email.trim().toLowerCase(),
        password,
      });

      if (!result) {
        setError("تعذر إكمال تسجيل الدخول. حاول مرة أخرى.");
        setLoading(false);
      } else if (result.error) {
        if (result.error === "CredentialsSignin") {
          setError("البريد الإلكتروني أو كلمة المرور غير صحيحة");
        } else {
          setError("حدث خطأ أثناء تسجيل الدخول. حاول مرة أخرى بعد قليل.");
        }
        setLoading(false);
      } else {
        router.push("/");
        router.refresh();
      }
    } catch {
      setError("تعذر الاتصال بخدمة تسجيل الدخول. تحقق من اتصالك ثم حاول مرة أخرى.");
      setLoading(false);
    }
  };

  return (
    <main dir="rtl" className="flex min-h-screen items-center justify-center bg-[#F1F5F9] px-4 py-12 text-[#0F172A]">
      <div className="w-full max-w-md space-y-8 rounded-3xl border border-[#E2E8F0] bg-white p-8 shadow-xl shadow-[#0F172A]/5">
   
 <div className="flex flex-col items-center text-center">
  <div className="mb-4">
    <Image 
      src="/logo.png" 
      alt="شعار كتاب بكتاب" 
      width={160} 
      height={160} 
      className="mx-auto h-40 w-40 object-contain drop-shadow-md transition hover:scale-105" 
    />
  </div>
  <h1 className="text-2xl font-extrabold tracking-tight text-[#0F172A]">أهلاً بك مجدداً</h1>
  <p className="mt-1 text-sm text-[#64748B]">سجل دخولك لتستبدل كتبك بكل سهولة</p>
</div>

        {/* رسالة الخطأ إن وجدت */}
        {error && (
          <div className="rounded-xl bg-red-50 p-3 text-center text-xs font-bold text-red-600 border border-red-200">
            {error}
          </div>
        )}

        {/* نموذج تسجيل الدخول */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-[#334155] mb-1.5">البريد الإلكتروني</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] px-4 py-3 text-sm text-[#0F172A] placeholder-[#94A3B8] focus:border-[#1E293B] focus:bg-white focus:outline-none transition"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-[#334155]">كلمة المرور</label>
              <Link href="/forgot-password" className="text-xs font-semibold text-[#64748B] hover:text-[#1E293B] transition">
                نسيت كلمة المرور؟
              </Link>
            </div>
           <input
  type="password"
  required
  autoComplete="current-password"
  value={password}
  onChange={(e) => setPassword(e.target.value)}
  placeholder="••••••••"
  className="w-full rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] px-4 py-3 text-sm text-[#0F172A] placeholder-[#94A3B8] focus:border-[#1E293B] focus:bg-white focus:outline-none transition"
/>
          </div>

          {/* زر تسجيل الدخول المصحح */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-[#1E293B] to-[#334155] py-3.5 text-sm font-bold text-white shadow-md shadow-[#1E293B]/20 transition hover:from-[#0F172A] hover:to-[#1E293B] active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
          </button>
        </form>

        {/* الانتقال لصفحة إنشاء حساب */}
        <div className="text-center text-xs text-[#64748B]">
          ليس لديك حساب بعد؟{" "}
          <Link href="/register" className="font-bold text-[#1E293B] hover:underline">
            أنشئ حساباً جديداً
          </Link>
        </div>

      </div>
    </main>
  );
}
