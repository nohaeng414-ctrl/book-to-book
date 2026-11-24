"use client";

import { deleteBook } from "@/app/actions/books";
import PendingSubmitButton from "@/components/PendingSubmitButton";
import { BookOpen, Trash2 } from "lucide-react";
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
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-3 sm:p-4 backdrop-blur-xs"
      onClick={() => setConfirmOpen(false)}
    >
      <section
        dir="rtl"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={`${dialogId}-title`}
        aria-describedby={`${dialogId}-description`}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85dvh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl text-right"
      >
        <div className="shrink-0 border-b border-slate-100 p-4">
          <h2 id={`${dialogId}-title`} className="text-sm font-black text-slate-900">
            تأكيد حذف الكتاب
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-slate-50 px-3 py-2.5 text-xs font-black text-slate-800">
            <BookOpen className="h-4 w-4 shrink-0 text-teal-600" aria-hidden="true" />
            <span className="truncate">{bookTitle}</span>
          </div>

          <p
            id={`${dialogId}-description`}
            className="text-xs leading-relaxed text-slate-600"
          >
            هل أنت متأكد من رغبتك في حذف هذا الكتاب نهائياً من مكتبتك؟ لن تتمكن من استعادته بعد الحذف.
          </p>
        </div>

        <form
          id={`${dialogId}-form`}
          action={action}
          className="grid shrink-0 grid-cols-2 gap-2 border-t border-slate-100 bg-slate-50/60 px-4 py-3"
        >
          <PendingSubmitButton
            pendingText="جارٍ الحذف..."
            className="flex w-full items-center justify-center rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-black text-white transition hover:bg-rose-700 active:scale-[0.99] cursor-pointer"
          >
            تأكيد الحذف
          </PendingSubmitButton>

          <button
            type="button"
            onClick={() => setConfirmOpen(false)}
            className="flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 active:scale-[0.99] cursor-pointer"
          >
            إلغاء
          </button>
        </form>
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
          "inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50/70 px-3 py-1.5 text-xs font-bold text-rose-700 transition hover:bg-rose-100 active:scale-95 shadow-2xs cursor-pointer"
        }
      >
        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
        <span>حذف</span>
      </button>

      {mounted && modalContent ? createPortal(modalContent, document.body) : null}
    </>
  );
}