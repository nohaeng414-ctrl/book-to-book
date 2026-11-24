"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { COUNTRIES_WITH_CITIES as countryCitiesMap } from "@/lib/locations";

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [district, setDistrict] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const availableCities = selectedCountry
    ? countryCitiesMap[selectedCountry] || ["مدينة أخرى"]
    : [];

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCountry(e.target.value);
    setSelectedCity("");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;
    setError("");

    if (!selectedCountry) {
      setError("يرجى اختيار الدولة");
      return;
    }

    if (!selectedCity) {
      setError("يرجى اختيار المدينة");
      return;
    }

    if (password !== confirmPassword) {
      setError("كلمات المرور غير متطابقة");
      return;
    }

    if (password.length < 6) {
      setError("كلمة المرور يجب أن لا تقل عن 6 خانات");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          country: selectedCountry,
          city: selectedCity,
          district: district.trim(),
          password,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || "حدث خطأ أثناء التسجيل");
        setLoading(false);
        return;
      }

      router.push("/login");
    } catch (err) {
      console.error(err);
      setError("حدث خطأ في الاتصال بالخادم");
      setLoading(false);
    }
  };

  return (
    <main
      dir="rtl"
      className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10 text-slate-900"
    >
      <div className="w-full max-w-md space-y-6 rounded-3xl border border-slate-200/80 bg-white p-7 sm:p-8 shadow-sm">
        {/* الشعار والعنوان */}
        <div className="flex flex-col items-center text-center">
          <div className="mb-3 h-24 w-24 overflow-hidden rounded-[1.75rem] shadow-md transition-transform duration-300 hover:scale-105">
            <Image
              src="/icon.png"
              alt="شعار كتاب بكتاب"
              width={120}
              height={120}
              priority
              className="h-full w-full rounded-[1.75rem] object-cover"
            />
          </div>

          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            انضم إلى مجتمع القرّاء
          </h1>
          <p className="mt-1 text-sm text-slate-500">
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

        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          <div>
            <label
              htmlFor="reg-name"
              className="mb-1.5 block text-xs font-bold text-slate-700"
            >
              الاسم الكامل
            </label>
            <input
              id="reg-name"
              type="text"
              name="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="اكتب اسمك هنا"
              autoComplete="off"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 transition focus:border-slate-900 focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="reg-email"
              className="mb-1.5 block text-xs font-bold text-slate-700"
            >
              البريد الإلكتروني
            </label>
            <input
              id="reg-email"
              type="email"
              name="email"
              required
              dir="ltr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              autoComplete="off"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-left text-sm text-slate-900 placeholder-slate-400 transition focus:border-slate-900 focus:bg-white focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="reg-country"
                className="mb-1.5 block text-xs font-bold text-slate-700"
              >
                الدولة
              </label>
              <select
                id="reg-country"
                name="country"
                required
                value={selectedCountry}
                onChange={handleCountryChange}
                className="w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-3 text-xs font-medium text-slate-700 transition focus:border-slate-900 focus:bg-white focus:outline-none"
              >
                <option value="" disabled>
                  اختر الدولة
                </option>
                {Object.keys(countryCitiesMap).map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="reg-city"
                className="mb-1.5 block text-xs font-bold text-slate-700"
              >
                المدينة
              </label>
              <select
                id="reg-city"
                name="city"
                required
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                disabled={!selectedCountry || availableCities.length === 0}
                className="w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-3 text-xs font-medium text-slate-700 transition focus:border-slate-900 focus:bg-white focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
              >
                <option value="">
                  {selectedCountry
                    ? "-- اختر المدينة --"
                    : "اختر الدولة أولاً"}
                </option>
                {availableCities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="reg-district"
              className="mb-1.5 block text-xs font-bold text-slate-700"
            >
              الحي
            </label>
            <input
              id="reg-district"
              type="text"
              name="district"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              placeholder="أدخل اسم الحي (اختياري)"
              autoComplete="off"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 transition focus:border-slate-900 focus:bg-white focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="reg-password"
                className="mb-1.5 block text-xs font-bold text-slate-700"
              >
                كلمة المرور
              </label>
              <input
                id="reg-password"
                type="password"
                name="password"
                required
                dir="ltr"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-left text-sm text-slate-900 placeholder-slate-400 transition focus:border-slate-900 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="reg-confirm-password"
                className="mb-1.5 block text-xs font-bold text-slate-700"
              >
                تأكيد كلمة المرور
              </label>
              <input
                id="reg-confirm-password"
                type="password"
                name="confirmPassword"
                required
                dir="ltr"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-left text-sm text-slate-900 placeholder-slate-400 transition focus:border-slate-900 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-xl bg-slate-900 py-3.5 text-sm font-bold text-white transition hover:bg-slate-800 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "جاري إنشاء الحساب..." : "إنشاء الحساب"}
          </button>

          <p className="pt-1 text-center text-xs text-slate-500">
            بإنشاء الحساب فإنك توافق على{" "}
            <Link
              href="/profile/privacy"
              className="font-bold text-slate-900 underline underline-offset-2 hover:text-slate-700"
            >
              سياسة الخصوصية
            </Link>
          </p>
        </form>

        <div className="border-t border-slate-100 pt-5 text-center text-xs text-slate-500">
          لديك حساب بالفعل؟{" "}
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