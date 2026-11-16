"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function FiltersDropdown({
  cities,
  languages,
  languageMap,
  selectedCity,
  selectedLanguage,
  selectedPoints,
  selectedCondition,
  searchQuery,
  selectedCategory,
}: {
  cities: string[];
  languages: string[];
  languageMap: Record<string, string>;
  selectedCity: string;
  selectedLanguage: string;
  selectedPoints: string;
  selectedCondition: string;
  sortOrder: string;
  searchQuery: string;
  selectedCategory?: string;
  activeCount: number;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  // الحالات المحلية لتخزين القيم المختارة داخل القائمة
  const [city, setCity] = useState(selectedCity);
  const [language, setLanguage] = useState(selectedLanguage);
  const [points, setPoints] = useState(selectedPoints);
  const [condition, setCondition] = useState(selectedCondition);

  // إغلاق عند الضغط خارج القائمة
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  // دالة تطبيق الفلاتر وإرسالها للرابط
  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());

    if (city) params.set("city", city); else params.delete("city");
    if (language) params.set("language", language); else params.delete("language");
    if (points) params.set("points", points); else params.delete("points");
    if (condition) params.set("condition", condition); else params.delete("condition");
    
    if (searchQuery) params.set("q", searchQuery);
    if (selectedCategory) params.set("category", selectedCategory);

    router.push(`/?${params.toString()}`);
    setOpen(false);
  };

  const handleReset = () => {
    setCity("");
    setLanguage("");
    setPoints("");
    setCondition("");
    const params = new URLSearchParams();
    if (searchQuery) params.set("q", searchQuery);
    if (selectedCategory) params.set("category", selectedCategory);
    router.push(`/?${params.toString()}`);
    setOpen(false);
  };

  const selectClass =
    "w-full rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-xs font-medium text-[#334155] cursor-pointer focus:border-[#1E293B] focus:outline-none transition";

  const labelClass = "mb-1.5 block text-[11px] font-bold text-[#64748B]";

  return (
    <div ref={wrapperRef} className="relative">
      {/* 🔘 زر التصفية بالأيقونة والكلمة فقط (أبيض ناصع) */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-xl border border-[#CBD5E1] bg-white px-4 py-2.5 text-xs font-bold text-[#0F172A] shadow-sm transition hover:border-[#94A3B8] hover:bg-[#F8FAFC]"
      >
        <svg className="h-4 w-4 text-[#64748B]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h18M6 12h12M10 19.5h4" />
        </svg>
        تصفية
      </button>

      {/* القائمة المنسدلة */}
      {open && (
        <form
          onSubmit={handleApply}
          className="absolute z-50 mt-2 w-[min(90vw,380px)] rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-xl shadow-[#0F172A]/15"
        >
          <div className="space-y-3">
            {/* المدينة */}
            <div>
              <label className={labelClass}>المدينة</label>
              <select value={city} onChange={(e) => setCity(e.target.value)} className={selectClass}>
                <option value="">كل المدن</option>
                {cities.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* اللغة */}
            <div>
              <label className={labelClass}>اللغة</label>
              <select value={language} onChange={(e) => setLanguage(e.target.value)} className={selectClass}>
                <option value="">كل اللغات</option>
                {languages.map((l) => (
                  <option key={l} value={l}>{languageMap[l] || l}</option>
                ))}
              </select>
            </div>

            {/* عدد النقاط */}
            <div>
              <label className={labelClass}>عدد النقاط</label>
              <select value={points} onChange={(e) => setPoints(e.target.value)} className={selectClass}>
                <option value="">كل النقاط</option>
                <option value="1">نقطة واحدة (1)</option>
                <option value="2">نقطتان (2)</option>
                <option value="3">3 نقاط</option>
              </select>
            </div>

            {/* حالة الكتاب */}
            <div>
              <label className={labelClass}>حالة الكتاب</label>
              <select value={condition} onChange={(e) => setCondition(e.target.value)} className={selectClass}>
                <option value="">كل الحالات</option>
                <option value="LIKE_NEW">شبه جديد</option>
                <option value="GOOD">جيد</option>
                <option value="ACCEPTABLE">مقبول</option>
              </select>
            </div>
          </div>

          {/* أزرار التطبيق */}
          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              className="flex-1 rounded-xl bg-[#1E293B] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#334155]"
            >
              تطبيق
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="rounded-xl border border-[#CBD5E1] bg-white px-4 py-2.5 text-xs font-bold text-[#334155] transition hover:bg-[#F8FAFC]"
            >
              إعادة تعيين
            </button>
          </div>
        </form>
      )}
    </div>
  );
}