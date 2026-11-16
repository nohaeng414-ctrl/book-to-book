"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function SortSelect({
  sortOrder,
}: {
  sortOrder: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  // إغلاق القائمة عند الضغط خارجها
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const handleSelect = (newSort: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (newSort && newSort !== "newest") {
      params.set("sort", newSort);
    } else {
      params.delete("sort");
    }

    router.push(`/?${params.toString()}`);
    router.refresh()
    setOpen(false);
  };

  const sortOptions = [
    { value: "newest", label: "الأحدث إضافة" },
    { value: "oldest", label: "الأقدم إضافة" },
    { value: "points-asc", label: "الأقل نقاطاً" },
    { value: "points-desc", label: "الأعلى نقاطاً" },
    { value: "condition-best", label: "الحالة الأفضل" },
  ];

  return (
    <div ref={wrapperRef} className="relative inline-block">
      {/* 🔘 زر الترتيب بنفس ستايل زر التصفية */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-xl border border-[#CBD5E1] bg-white px-4 py-2.5 text-xs font-bold text-[#0F172A] shadow-sm transition hover:border-[#94A3B8] hover:bg-[#F8FAFC]"
      >
        <svg className="h-4 w-4 text-[#64748B]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
        ترتيب
      </button>

      {/* القائمة المنسدلة للخيارات */}
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-48 rounded-2xl border border-[#E2E8F0] bg-white py-2 shadow-xl shadow-[#0F172A]/10">
          {sortOptions.map((option) => {
            const isSelected = (sortOrder || "newest") === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
                className={`w-full px-4 py-2 text-right text-xs transition ${
                  isSelected
                    ? "bg-[#1E293B] font-bold text-white"
                    : "font-medium text-[#334155] hover:bg-[#F8FAFC]"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}