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
      className={`p-1 text-slate-500 hover:text-slate-800 transition active:scale-90 ${className}`}
    >
      <ArrowRight className="h-5 w-5" />
    </button>
  );
}
