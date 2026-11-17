"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MoreVertical, Trash2, CheckCircle2, Loader2, ExternalLink } from "lucide-react";
import Link from "next/link";
import { toggleBookVisibilityAction } from "@/app/actions/admin-books";

export default function AdminBookCardActions({
  bookId,
  isDeleted,
}: {
  bookId: string;
  isDeleted: boolean;
}) {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggleDelete = async () => {
    setLoading(true);
    try {
      await toggleBookVisibilityAction(bookId, !isDeleted);
      setMenuOpen(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setMenuOpen((prev) => !prev)}
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition shadow-2xs cursor-pointer"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {menuOpen && (
        <div className="absolute left-0 top-11 z-30 w-44 overflow-hidden rounded-2xl border border-slate-200/90 bg-white py-1.5 shadow-xl text-right text-xs font-bold text-slate-700">
          <Link
            href={`/books/${bookId}`}
            target="_blank"
            className="flex w-full items-center gap-2.5 px-3.5 py-2.5 hover:bg-slate-50 transition"
          >
            <ExternalLink className="h-4 w-4 text-slate-400" />
            <span>عرض صفحة الكتاب</span>
          </Link>

          <div className="my-1 border-t border-slate-100" />

          {isDeleted ? (
            <button
              type="button"
              disabled={loading}
              onClick={handleToggleDelete}
              className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-teal-700 hover:bg-teal-50/60 transition cursor-pointer"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              <span>استرجاع الكتاب</span>
            </button>
          ) : (
            <button
              type="button"
              disabled={loading}
              onClick={handleToggleDelete}
              className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-rose-600 hover:bg-rose-50/60 transition cursor-pointer"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              <span>حذف الكتاب</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}