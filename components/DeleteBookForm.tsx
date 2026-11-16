"use client";

import { deleteBook } from "@/app/actions/books";
import PendingSubmitButton from "@/components/PendingSubmitButton";
import { AlertTriangle, BookOpen, Trash2, X } from "lucide-react";
import { useEffect, useId, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

const subscribeToHydration = () => () => {};
const getHydratedSnapshot = () => true;
const getServerSnapshot = () => false;

export default function DeleteBookForm({
  bookId,
  bookTitle,
  source,
  className,
}: {
  bookId: string;
  bookTitle: string;
  source: "my-books" | "details";
  className?: string;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const mounted = useSyncExternalStore(
    subscribeToHydration,
    getHydratedSnapshot,
    getServerSnapshot
  );
  const dialogId = useId();
  const action = deleteBook.bind(null, bookId, source);

  useEffect(() => {
    if (!confirmOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setConfirmOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [confirmOpen]);

  const modalContent = confirmOpen ? (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
      dir="rtl"
    >
      {/* خلفية الإغلاق عند النقر بالخارج */}
      <div
        className="absolute inset-0"
        aria-hidden="true"
        onClick={() => setConfirmOpen(false)}
      />

      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={`${dialogId}-title`}
        aria-describedby={`${dialogId}-description`}
        className="relative z-10 w-full max-w-sm overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-150"
      >
        {/* رأس النافذة */}
        <div className="relative bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#334155] p-5 text-white">
          <div className="flex items-start justify-between gap-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-red-400/20 bg-red-500/20 text-red-300">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            </span>
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              aria-label="إغلاق نافذة التأكيد"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <h2 id={`${dialogId}-title`} className="mt-2.5 text-base font-extrabold">
            هل أنت متأكد من رغبتك في حذف هذا الكتاب؟
          </h2>
        </div>

        {/* جسم النافذة */}
        <div className="p-5">
          {/* 👈 هنا بالضبط: عرض اسم الكتاب المراد حذفه داخل النافذة */}
          <div className="flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-200/70 p-2.5 text-xs font-bold text-slate-800">
            <BookOpen className="h-4 w-4 text-teal-600 shrink-0" />
            <span className="truncate">{bookTitle}</span>
          </div>

          <p id={`${dialogId}-description`} className="mt-3 text-xs leading-relaxed text-[#64748B]">
            سيتم إزالته من مكتبتك نهائياً ولن تتمكن من استعادته.
          </p>

          <form action={action} className="mt-5 grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              className="rounded-xl border border-[#CBD5E1] bg-white px-3 py-2.5 text-xs font-bold text-[#334155] transition hover:bg-[#F8FAFC] active:scale-95"
            >
              إلغاء
            </button>
            <PendingSubmitButton
              pendingText="جارٍ الحذف..."
              className="rounded-xl bg-red-600 px-3 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-red-700 active:scale-95"
            >
              تأكيد الحذف
            </PendingSubmitButton>
          </form>
        </div>
      </section>
    </div>
  ) : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        className={
          className ||
          "inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50/70 px-3 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-100 active:scale-95 shadow-2xs"
        }
      >
        <Trash2 className="h-3.5 w-3.5" />
        <span>حذف</span>
      </button>

      {/* نقل الـ Modal خارج شجرة الكارت مباشرة إلى body */}
      {mounted && modalContent ? createPortal(modalContent, document.body) : null}
    </>
  );
}
