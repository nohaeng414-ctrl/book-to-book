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
            أهلاً بك مجدداً
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            استبدل كتبك واكتشف عوالم جديدة
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

        {/* نموذج تسجيل الدخول */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-xs font-bold text-slate-700"
            >
              البريد الإلكتروني
            </label>
            <input
              id="email"
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

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label
                htmlFor="password"
                className="text-xs font-bold text-slate-700"
              >
                كلمة المرور
              </label>
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-slate-500 transition hover:text-slate-900"
              >
                نسيت كلمة المرور؟
              </Link>
            </div>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              dir="ltr"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-left text-sm text-slate-900 placeholder-slate-400 transition focus:border-slate-900 focus:bg-white focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-xl bg-slate-900 py-3.5 text-sm font-bold text-white transition hover:bg-slate-800 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
          </button>
        </form>

        {/* إنشاء حساب */}
        <div className="border-t border-slate-100 pt-5 text-center text-xs text-slate-500">
          ليس لديك حساب بعد؟{" "}
          <Link
            href="/register"
            className="font-bold text-slate-900 hover:underline"
          >
            أنشئ حساباً جديداً
          </Link>
        </div>
      </div>
    </main>
  );
}