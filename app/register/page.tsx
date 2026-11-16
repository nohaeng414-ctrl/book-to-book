"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

const countryCitiesMap: Record<string, string[]> = {
  "المملكة العربية السعودية": [
    "الرياض", "جدة", "مكة المكرمة", "المدينة المنورة", "الدمام", "الخبر", "الجبيل", "الطائف", "أبها", "تبوك", "بريدة", "خميس مشيط", "حائل", "جازان", "نجران", "القصيم"
  ],
  "الإمارات العربية المتحدة": [
    "دبي", "أبوظبي", "الشارقة", "عجمان", "راس الخيمة", "الفجيرة", "العين"
  ],
  "الكويت": [
    "مدينة الكويت", "حولي", "السالمية", "الفروانية"
  ],
  "قطر": [
    "الدوحة", "الوكرة", "لوسيل", "الخور"
  ],
  "سلطنة عمان": [
    "مسقط", "صلالة", "صُحر", "نزوى"
  ],
  "مملكة البحرين": [
    "المحرق", "الرفاع", "مدينة عيسى", "المنامة"
  ],
  "المملكة الأردنية الهاشمية": [
    "عمان", "إربد", "الزرقاء", "العقبة", "السلط"
  ],
  "جمهورية مصر العربية": [
    "القاهرة", "الإسكندرية", "الجيزة", "المنصورة", "أسوان", "الأقصر", "الغردقة"
  ],
  "الجمهورية العربية السورية": [
    "دمشق", "حلب", "حمص", "اللاذقية", "حماة", "درعا", "القامشلي"
  ],
  "جمهورية العراق": [
    "بغداد", "أربيل", "البصرة", "الموصل", "السليمانية", "النجف", "كربلاء"
  ],
  "الجمهورية اللبنانية": [
    "بيروت", "طرابلس (لبنان)", "صيدا", "جونية", "زحلة"
  ],
  "فلسطين": [
    "القدس", "رام الله", "غزة", "نابلس", "الخليل", "بيت لحم"
  ],
  "الجمهورية اليمنية": [
    "صنعاء", "عدن", "تعز", "المكلا", "إب"
  ],
  "جمهورية السودان": [
    "الخرطوم", "أم درمان", "بورتسودان"
  ],
  "المملكة المغربية": [
    "الدار البيضاء", "الرباط", "مراكش", "فاس", "طنجة", "أكادير"
  ],
  "الجمهورية التونسية": [
    "تونس العاصمة", "صفاقس", "سوسة", "بنزرت"
  ],
  "الجمهورية الجزائرية": [
    "الجزائر العاصمة", "وهران", "قسنطينة", "عنابة"
  ],
  "دولة ليبيا": [
    "طرابلس (ليبيا)", "بنغازي", "مصراتة", "سبها"
  ],
  "تركيا": [
    "إسطنبول", "أنقرة", "إزمير", "أنطاليا", "بورصة"
  ],
  "دولة أخرى": [
    "مدينة أخرى"
  ]
};

export default function RegisterPage() {
  const router = useRouter();

  // Controlled Form States
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [district, setDistrict] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const availableCities = selectedCountry ? countryCitiesMap[selectedCountry] || ["مدينة أخرى"] : [];

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCountry(e.target.value);
    setSelectedCity("");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
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
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-[#E2E8F0] bg-white p-8 shadow-xl shadow-[#0F172A]/5">
        
        {/* رأس الصفحة */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-extrabold text-[#0F172A]">انضم إلى مجتمع القرّاء</h1>
          <p className="mt-2 text-xs font-medium text-[#64748B]">أنشئ حسابك وابدأ استبدال كتبك بكل سهولة</p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 p-3 text-center text-xs font-bold text-red-600 border border-red-200">
            {error}
          </div>
        )}

        {/* إضافة method="POST" كطبقة حماية ضد التحول إلى GET بالرابط */}
        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          
          <div>
            <label className="mb-1.5 block text-xs font-bold text-[#334155]">الاسم الكامل</label>
            <input
              type="text"
              name="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="أكتب إسمك هنا"
              autoComplete="off"
              className="w-full rounded-xl border border-[#CBD5E1] bg-white px-4 py-3 text-xs font-medium text-[#0F172A] shadow-sm focus:border-[#1E293B] focus:outline-none transition"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-[#334155]">البريد الإلكتروني</label>
            <input
              type="email"
              name="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              autoComplete="off"
              className="w-full rounded-xl border border-[#CBD5E1] bg-white px-4 py-3 text-xs font-medium text-[#0F172A] shadow-sm focus:border-[#1E293B] focus:outline-none transition"
            />
          </div>

          {/* قائمة الدول */}
          <div>
            <label className="mb-1.5 block text-xs font-bold text-[#334155]">الدولة</label>
            <select
              name="country"
              required
              value={selectedCountry}
              onChange={handleCountryChange}
              className="w-full rounded-xl border border-[#CBD5E1] bg-white px-4 py-3 text-xs font-medium text-[#334155] shadow-sm focus:border-[#1E293B] focus:outline-none transition cursor-pointer"
            >
              <option value="" disabled>اختر الدولة</option>
              {Object.keys(countryCitiesMap).map((country) => (
                <option key={country} value={country}>{country}</option>
              ))}
            </select>
          </div>

     {/* قائمة المدن */}
<div>
  <label className="mb-1.5 block text-xs font-bold text-[#334155]">المدينة</label>
  <select
    name="city"
    required
    value={selectedCity}
    onChange={(e) => setSelectedCity(e.target.value)}
    disabled={!selectedCountry || availableCities.length === 0}
    className="w-full rounded-xl border border-[#CBD5E1] bg-white px-4 py-3 text-xs font-medium text-[#334155] shadow-sm focus:border-[#1E293B] focus:outline-none transition cursor-pointer disabled:bg-[#F1F5F9] disabled:text-[#94A3B8] disabled:cursor-not-allowed"
  >
    <option value="">
      {selectedCountry ? "-- اختر المدينة --" : "الرجاء اختيار الدولة أولاً"}
    </option>
    {availableCities.map((city) => (
      <option key={city} value={city}>
        {city}
      </option>
    ))}
  </select>
</div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-[#334155]">الحي</label>
            <input
              type="text"
              name="district"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              placeholder="أدخل اسم الحي (اختياري)"
              autoComplete="off"
              className="w-full rounded-xl border border-[#CBD5E1] bg-white px-4 py-3 text-xs font-medium text-[#0F172A] shadow-sm focus:border-[#1E293B] focus:outline-none transition"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-[#334155]">كلمة المرور</label>
            <input
              type="password"
              name="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
              className="w-full rounded-xl border border-[#CBD5E1] bg-white px-4 py-3 text-xs font-medium text-[#0F172A] shadow-sm focus:border-[#1E293B] focus:outline-none transition"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-[#334155]">تأكيد كلمة المرور</label>
            <input
              type="password"
              name="confirmPassword"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
              className="w-full rounded-xl border border-[#CBD5E1] bg-white px-4 py-3 text-xs font-medium text-[#0F172A] shadow-sm focus:border-[#1E293B] focus:outline-none transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 rounded-xl bg-gradient-to-r from-[#1E293B] to-[#334155] px-4 py-3 text-xs font-bold text-white shadow-sm transition hover:from-[#0F172A] hover:to-[#1E293B] disabled:opacity-50"
          >
            {loading ? "جاري إنشاء الحساب..." : "إنشاء الحساب"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs font-medium text-[#64748B]">
          لديك حساب بالفعل؟{" "}
          <Link href="/login" className="font-bold text-[#1E293B] hover:underline">
            تسجيل الدخول
          </Link>
        </p>

      </div>
    </div>
  );
}
