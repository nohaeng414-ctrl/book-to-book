"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

export default function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "تعذر تغيير كلمة المرور.");
      setMessage(result.message);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "تعذر تغيير كلمة المرور.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main dir="rtl" className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-12 text-slate-900">
      <section className="w-full max-w-md space-y-5 rounded-3xl border border-slate-200 bg-white p-8">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-extrabold">تعيين كلمة مرور جديدة</h1>
          <p className="text-sm leading-7 text-slate-600">يجب أن تتكون كلمة المرور من 8 أحرف على الأقل.</p>
        </div>
        {!token && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">رابط الاستعادة غير صالح. اطلب رابطاً جديداً.</p>}
        {message && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
        {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {!message && token && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block space-y-1.5 text-sm font-bold">
              كلمة المرور الجديدة
              <input type="password" required minLength={8} maxLength={72} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3 font-normal" />
            </label>
            <button disabled={loading} className="w-full rounded-xl bg-slate-900 px-5 py-3 font-bold text-white disabled:opacity-60">
              {loading ? "جارٍ الحفظ..." : "حفظ كلمة المرور"}
            </button>
          </form>
        )}
        <div className="text-center"><Link href="/login" className="text-sm font-bold text-slate-700 hover:underline">العودة لتسجيل الدخول</Link></div>
      </section>
    </main>
  );
}
