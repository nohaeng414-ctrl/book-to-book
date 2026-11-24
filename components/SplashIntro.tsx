"use client";

import { useEffect, useState } from "react";
import { Cairo } from "next/font/google";

const cairo = Cairo({
  subsets: ["arabic"],
  weight: ["500", "700", "900"],
  display: "swap",
});

export default function SplashIntro({
  durationMs = 2200,
  iconSrc = "/icon.png",
  bgSrc = "/splash-bg.jpg", 
}: {
  durationMs?: number;
  iconSrc?: string;
  bgSrc?: string;
}) {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setFading(true);
    }, Math.max(500, durationMs - 400));

    const hideTimer = setTimeout(() => {
      setVisible(false);
    }, durationMs);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, [durationMs]);

  if (!visible) return null;

  return (
    <div
      dir="rtl"
      onClick={() => setVisible(false)}
      role="status"
      aria-live="polite"
      aria-label="مرحباً بك في تطبيق كتاب بكتاب"
      className={`${cairo.className} fixed inset-0 z-[200] flex flex-col items-center justify-between overflow-hidden bg-[#060911] px-6 pt-20 pb-16 sm:pb-20 text-center text-white select-none cursor-pointer transition-all duration-500 ease-out ${
        fading ? "opacity-0 scale-105 pointer-events-none" : "opacity-100 scale-100"
      }`}
    >
      {/* 1. صورة الخلفية الفضائية مع طبقة تظليل خفيفة لوضوح الأيقونة والنص */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0">
        <img
          src={bgSrc}
          alt=""
          className="h-full w-full object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#060911]/40 via-transparent to-[#060911]/90" />
      </div>

      {/* عنصر موازنة علوي */}
      <div aria-hidden="true" className="h-4" />

      {/* 2. أيقونة الكتاب في المنتصف */}
      <div className="relative z-10 flex items-center justify-center">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-8 rounded-full bg-teal-400/20 blur-2xl animate-pulse"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-4 rounded-[2.6rem] border border-cyan-300/20"
        />

        <img
          src={iconSrc}
          alt="شعار كتاب بكتاب"
          className="relative z-10 h-40 w-40 sm:h-44 sm:w-44 rounded-[2.1rem] object-cover shadow-[0_0_50px_rgba(45,212,191,0.35)] ring-1 ring-white/15"
        />
      </div>

      {/* 3. النصوص وشريط التحميل في الجزء السفلي */}
      <div className="relative z-10 flex flex-col items-center">
        <div className="space-y-2.5 drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)]">
          <h1 className="bg-gradient-to-b from-white via-cyan-100 to-teal-200 bg-clip-text text-3xl sm:text-4xl font-black text-transparent drop-shadow-[0_0_22px_rgba(45,212,191,0.45)]">
            كتاب بكتاب
          </h1>

        <p className="mx-auto max-w-xs text-xs sm:text-sm font-medium leading-relaxed text-amber-100/95">
            استبدل كتبك واكتشف عوالم جديدة
          </p>
        </div>

        <div className="mt-6 h-1 w-28 overflow-hidden rounded-full bg-cyan-950/60 ring-1 ring-cyan-400/20 backdrop-blur-sm">
          <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-teal-400 via-cyan-300 to-indigo-400 shadow-[0_0_12px_rgba(34,211,238,0.8)] animate-pulse" />
        </div>
      </div>
    </div>
  );
}