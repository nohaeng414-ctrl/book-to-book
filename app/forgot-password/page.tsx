"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "تعذر إرسال الطلب حالياً.");
      setMessage(result.message);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "تعذر إرسال الطلب حالياً.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main dir="rtl" className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-12 text-slate-900">
      <section className="w-full max-w-md space-y-5 rounded-3xl border border-slate-200 bg-white p-8">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-extrabold">استعادة كلمة المرور</h1>
          <p className="text-sm leading-7 text-slate-600">أدخل بريدك الإلكتروني وسنرسل رابطاً آمناً لتغيير كلمة المرور.</p>
        </div>
        {message && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
        {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block space-y-1.5 text-sm font-bold">
            البريد الإلكتروني
            <input type="email" required maxLength={254} autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3 font-normal" />
          </label>
          <button disabled={loading} className="w-full rounded-xl bg-slate-900 px-5 py-3 font-bold text-white disabled:opacity-60">
            {loading ? "جارٍ الإرسال..." : "إرسال رابط الاستعادة"}
          </button>
        </form>
        <div className="text-center"><Link href="/login" className="text-sm font-bold text-slate-700 hover:underline">العودة لتسجيل الدخول</Link></div>
      </section>
    </main>
  );
}
