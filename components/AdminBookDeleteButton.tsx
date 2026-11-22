"use client";

import { useState } from "react";
import { Trash2, X, Loader2, AlertTriangle } from "lucide-react";
import { adminDeleteBookPermanently } from "@/app/actions/admin-books";

const PRESET_REASONS = [
  "محتوى مسيء أو مخالف",

  "صورة الغلاف غير واضحة أو غير مناسبة",
  "بيانات الكتاب غير دقيقة أو مضللة",
  "إعلان مكرر لنفس الكتاب",
  "سبب آخر",
];

interface AdminBookDeleteButtonProps {
  bookId: string;
  bookTitle: string;
}

export default function AdminBookDeleteButton({
  bookId,
  bookTitle,
}: AdminBookDeleteButtonProps) {
  const [open, setOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState(PRESET_REASONS[0]);
  const [customNote, setCustomNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOther = selectedReason === "سبب آخر";

  const handleConfirmDelete = async () => {
    setError(null);

    const finalReason = isOther
      ? customNote.trim()
      : customNote.trim()
      ? `${selectedReason} — ${customNote.trim()}`
      : selectedReason;

    if (!finalReason) {
      setError("يرجى كتابة سبب الحذف.");
      return;
    }

    setLoading(true);
    const res = await adminDeleteBookPermanently(bookId, finalReason);
    setLoading(false);

    if (!res.success) {
      setError(res.error || "حدث خطأ أثناء الحذف.");
      return;
    }

    setOpen(false);
    setCustomNote("");
  };

  return (
    <>
      {/* زر الحذف المباشر */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="حذف الكتاب نهائياً"
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-rose-200/80 bg-rose-50/70 text-rose-600 transition hover:bg-rose-600 hover:text-white active:scale-95 cursor-pointer"
      >
        <Trash2 className="h-4 w-4" />
      </button>

      {/* نافذة تأكيد الحذف واختيار السبب */}
      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-3 sm:p-4 backdrop-blur-xs"
          onClick={() => !loading && setOpen(false)}
        >
          <div
            dir="rtl"
            className="flex max-h-[85dvh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl text-right"
            onClick={(e) => e.stopPropagation()}
          >
            {/* رأس النافذة (ثابت) */}
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 p-4">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600 ring-1 ring-rose-100">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-black text-slate-900">
                    حذف الكتاب نهائياً
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                    «{bookTitle}»
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={loading}
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* المحتوى القابل للتمرير */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {/* قائمة الأسباب */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-700">
                  اختر سبب الحذف
                </label>
                <div className="space-y-1.5">
                  {PRESET_REASONS.map((reason) => (
                    <label
                      key={reason}
                      className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 text-xs font-bold transition cursor-pointer ${
                        selectedReason === reason
                          ? "border-rose-300 bg-rose-50/60 text-rose-900"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="delete-reason"
                        value={reason}
                        checked={selectedReason === reason}
                        onChange={() => setSelectedReason(reason)}
                        className="accent-rose-600"
                      />
                      <span>{reason}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* ملاحظة اختيارية / سبب مخصص */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-700">
                  {isOther ? "اكتب سبب الحذف *" : "تفاصيل إضافية (اختياري)"}
                </label>
                <textarea
                  rows={2}
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  placeholder={
                    isOther
                      ? "اكتب السبب الذي سيصل للمستخدم..."
                      : "أضف ملاحظة توضيحية للمستخدم إذا رغبت..."
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-rose-400 focus:bg-white focus:outline-none resize-none"
                />
              </div>

              {error && (
                <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">
                  {error}
                </p>
              )}
            </div>

            {/* أزرار التأكيد والإلغاء (ثابتة دائماً بالأسفل) */}
            <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-4 py-3">
              <button
                type="button"
                disabled={loading}
                onClick={() => setOpen(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleConfirmDelete}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 px-4 py-2 text-xs font-black text-white transition active:scale-95 disabled:opacity-60 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>جارٍ الحذف...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>تأكيد الحذف</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}