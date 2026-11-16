"use client";

import { RotateCw, WifiOff } from "lucide-react";

export default function ConnectionErrorView({
  onRetry,
  offline = false,
}: {
  onRetry?: () => void;
  offline?: boolean;
}) {
  return (
    <div dir="rtl" className="flex min-h-[70vh] w-full flex-col items-center justify-center px-4 text-center">
      <div className="w-full max-w-md rounded-3xl border border-red-100 bg-red-50/50 p-8 shadow-sm">
        <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-red-100 text-red-600 shadow-inner">
          <WifiOff className="h-7 w-7" />
        </span>
        <h1 className="text-lg font-extrabold text-[#0F172A]">
          {offline ? "أنت غير متصل بالإنترنت" : "تعذر تحميل الصفحة"}
        </h1>
        <p className="mt-2 text-xs leading-relaxed text-slate-600">
          {offline
            ? "يمكنك فتح صفحة عدم الاتصال، لكن تصفح الكتب والمبادلة والنقاط يحتاج إلى اتصال بالإنترنت."
            : "قد تكون هناك مشكلة في اتصال الإنترنت أو الخادم. تحقق من الاتصال ثم حاول مرة أخرى."}
        </p>
        <button
          type="button"
          onClick={onRetry ?? (() => window.location.reload())}
          className="mt-6 inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#1E293B] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#0F172A]"
        >
          <RotateCw className="h-3.5 w-3.5" />
          {offline ? "حاول مرة أخرى" : "إعادة المحاولة"}
        </button>
      </div>
    </div>
  );
}
