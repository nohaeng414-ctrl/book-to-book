"use client";

import { useCallback, useEffect, useState } from "react";
import { Cairo } from "next/font/google";

const cairo = Cairo({
  subsets: ["arabic"],
  weight: ["500", "700", "900"],
  display: "swap",
});

interface SplashIntroProps {
  durationMs?: number;
  iconSrc?: string;
  bgSrc?: string;
  title?: string;
  tagline?: string;
}

export default function SplashIntro({
  durationMs = 2200,
  iconSrc = "/icon.png",
  bgSrc = "/splash-bg.jpg",
  title = "كتاب بكتاب",
  tagline = "استبدل كتبك واكتشف عوالم جديدة",
}: SplashIntroProps) {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  const startDismiss = useCallback(() => {
    setFading(true);
    window.setTimeout(() => {
      setVisible(false);
    }, 450);
  }, []);

  useEffect(() => {
    const fadeDelay = Math.max(400, durationMs - 450);
    const fadeTimer = window.setTimeout(() => {
      setFading(true);
    }, fadeDelay);

    const hideTimer = window.setTimeout(() => {
      setVisible(false);
    }, durationMs);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(hideTimer);
    };
  }, [durationMs]);

  if (!visible) return null;

  return (
    <>
      <style jsx>{`
        @keyframes splashBarSlide {
          0% {
            transform: translateX(120%);
          }
          100% {
            transform: translateX(-120%);
          }
        }
        @keyframes squareFrameMotion {
          0%,
          100% {
            transform: scale(0.97) rotate(0deg);
          }
          50% {
            transform: scale(1.04) rotate(1.5deg);
          }
        }
        .splash-bar-motion {
          animation: splashBarSlide 1.35s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        .square-frame-motion {
          animation: squareFrameMotion 2s ease-in-out infinite;
          will-change: transform;
        }
        @media (prefers-reduced-motion: reduce) {
          .splash-bar-motion,
          .square-frame-motion {
            animation: none;
          }
          .splash-bar-motion {
            width: 75%;
          }
        }
      `}</style>

      <div
        dir="rtl"
        onClick={startDismiss}
        role="status"
        aria-live="polite"
        aria-label={`مرحباً بك في تطبيق ${title}`}
        style={{
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 4rem)",
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 4rem)",
        }}
        className={`${cairo.className} fixed inset-0 z-[200] flex flex-col items-center justify-between overflow-hidden bg-[#060911] px-6 text-center text-white select-none cursor-pointer transition-all duration-[450ms] ease-out ${
          fading
            ? "opacity-0 scale-105 pointer-events-none"
            : "opacity-100 scale-100"
        }`}
      >
        {/* 1. خلفية المشهد مع تدرج لوني يحافظ على تباين النصوص */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0"
        >
          <img
            src={bgSrc}
            alt=""
            className="h-full w-full object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#060911]/55 via-[#060911]/20 to-[#060911]/95" />
        </div>

        {/* موازنة علوية */}
        <div aria-hidden="true" className="h-2" />

        {/* 2. شعار التطبيق مع حركة المربع الخارجي فقط بدون إضاءة */}
        <div className="relative z-10 flex items-center justify-center">
          <div
            aria-hidden="true"
            className="square-frame-motion pointer-events-none absolute -inset-4 rounded-[2.6rem] border border-white/30"
          />

          <img
            src={iconSrc}
            alt={`شعار ${title}`}
            className="relative z-10 h-40 w-40 sm:h-44 sm:w-44 rounded-[2.1rem] object-cover"
          />
        </div>

        {/* 3. العنوان والشعار اللفظي ومؤشر التحميل المتحرك */}
        <div className="relative z-10 flex flex-col items-center">
          <div className="space-y-2">
            <h1 className="bg-gradient-to-b from-white via-cyan-100 to-teal-200 bg-clip-text text-3xl sm:text-4xl font-black text-transparent">
              {title}
            </h1>

            <p className="mx-auto max-w-xs text-xs sm:text-sm font-medium leading-relaxed text-amber-100/95">
              {tagline}
            </p>
          </div>

          <div className="mt-6 h-1 w-32 overflow-hidden rounded-full bg-cyan-950/70">
            <div className="splash-bar-motion h-full w-1/2 rounded-full bg-gradient-to-r from-teal-400 via-cyan-300 to-indigo-400" />
          </div>
        </div>
      </div>
    </>
  );
}