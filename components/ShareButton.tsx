"use client";

import { Share2 } from "lucide-react";

export default function ShareButton({ title }: { title: string }) {
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          url: window.location.href,
        });
      } catch {
        // تم إلغاء المشاركة
      }
    } else {
      await navigator.clipboard.writeText(window.location.href);
      alert("تم نسخ رابط الكتاب للحافظة!");
    }
  };

  return (
    <button
      onClick={handleShare}
      aria-label="مشاركة الكتاب"
      className="p-1 text-slate-500 hover:text-slate-800 transition active:scale-90"
    >
      <Share2 className="h-5 w-5" />
    </button>
  );
}