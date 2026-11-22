"use client";

import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";

export default function BackButton({ className = "" }: { className?: string }) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.back()}
      aria-label="رجوع"
      className={`flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-slate-200 transition-all hover:bg-white/20 hover:text-white backdrop-blur-md border border-white/10 active:scale-95 cursor-pointer ${className}`}
    >
<ArrowRight className="h-5 w-5 text-slate-900" />
    </button>
  );
}