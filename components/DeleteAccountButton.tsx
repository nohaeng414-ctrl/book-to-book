"use client";

import { useState, useTransition } from "react";
import { Trash2, AlertTriangle, Loader2 } from "lucide-react";

export default function DeleteAccountButton({
  onDelete,
}: {
  onDelete: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleConfirm = () => {
    startTransition(async () => {
      await onDelete();
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3.5 text-sm font-black text-rose-700 transition hover:bg-rose-100 active:scale-98 cursor-pointer"
      >
        <Trash2 className="h-4 w-4 shrink-0" />
        <span>حذف الحساب</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-3 sm:p-4 backdrop-blur-xs"
          onClick={() => !isPending && setOpen(false)}
        >
          <div
            dir="rtl"
            className="flex max-h-[85dvh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl text-right"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center gap-2.5 border-b border-slate-100 p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600 ring-1 ring-rose-100">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-black text-slate-900">
                تأكيد حذف الحساب نهائياً
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <p className="text-xs leading-relaxed text-slate-600">
                هل أنت متأكد من رغبتك في حذف حسابك وجميع بياناتك نهائياً؟ لا يمكن
                التراجع عن هذا الإجراء، ولن يتم الحذف في حال وجود طلبات تبادل
                معلّقة.
              </p>
            </div>

            <div className="grid shrink-0 grid-cols-2 gap-2 border-t border-slate-100 bg-slate-50/60 px-4 py-3">
              <button
                type="button"
                disabled={isPending}
                onClick={handleConfirm}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-black text-white transition hover:bg-rose-700 active:scale-[0.99] disabled:opacity-60 cursor-pointer"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>جارٍ الحذف...</span>
                  </>
                ) : (
                  <span>تأكيد الحذف</span>
                )}
              </button>

              <button
                type="button"
                disabled={isPending}
                onClick={() => setOpen(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
              >
                تراجع
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}