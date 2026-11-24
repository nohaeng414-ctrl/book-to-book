"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Flag, AlertTriangle, Loader2, CheckCircle2 } from "lucide-react";
import { reportUserAction } from "@/app/actions/swapWorkflow";

const BOOK_REPORT_REASONS = [
  "محتوى مسيء أو مخالف ",
  "صورة الغلاف غير مناسبة أو غير واضحة",
  "بيانات الكتاب غير دقيقة أو مضللة",
  "إعلان مكرر أو وهمي",
  "سبب آخر",
];

const SWAP_REPORT_REASONS = [
  "إزعاج أو سلوك غير لائق",
  "عدم الحضور أو التهرب من التسليم",
  "الكتاب غير مطابق للوصف أو تالف",
  "حساب احتيالي أو وهمي",
];

interface ReportModalProps {
  reportedUserId: string;
  reportedUserName: string;
  swapId?: string;
  bookTitle?: string;
  currentUserId?: string | null;
  variant?: "light" | "dark";
}

export default function ReportModal({
  reportedUserId,
  reportedUserName,
  swapId,
  bookTitle,
  currentUserId,
  variant = "light",
}: ReportModalProps) {
  const router = useRouter();
  const isBookReport = Boolean(bookTitle && !swapId);
  const reasons = isBookReport ? BOOK_REPORT_REASONS : SWAP_REPORT_REASONS;

  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState(reasons[0]);
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenModal = () => {
    if (!currentUserId) {
      router.push("/login");
      return;
    }
    setError(null);
    setReason(reasons[0]);
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formattedDetails = isBookReport
      ? `[بلاغ عن كتاب: ${bookTitle}]${details.trim() ? `\n${details.trim()}` : ""}`
      : details.trim();

    const res = await reportUserAction({
      reportedUserId,
      reason,
      details: formattedDetails,
      swapId,
    });

    setLoading(false);

    if (res?.success) {
      setSent(true);
      setTimeout(() => {
        setIsOpen(false);
        setSent(false);
        setDetails("");
      }, 1500);
    } else {
      setError(res?.error || "تعذر إرسال البلاغ، يرجى المحاولة لاحقاً.");
    }
  };

  const buttonClasses =
    variant === "dark"
      ? "flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 hover:bg-rose-500/20 text-slate-200 hover:text-rose-400 backdrop-blur-xs transition active:scale-95"
      : "p-1 text-slate-500 hover:text-rose-600 transition active:scale-90";

  const modalContent =
    isOpen && typeof document !== "undefined"
      ? createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-3 sm:p-4 backdrop-blur-xs text-slate-900"
            onClick={() => !loading && setIsOpen(false)}
          >
            <div
              dir="rtl"
              className="flex max-h-[85dvh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl text-right"
              onClick={(e) => e.stopPropagation()}
            >
              {/* الرأس */}
              <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 p-4">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600 ring-1 ring-rose-100">
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-black text-slate-900 truncate">
                      {isBookReport
                        ? "إبلاغ عن كتاب"
                        : `إبلاغ عن ${reportedUserName}`}
                    </h3>
                    {isBookReport && (
                      <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                        «{bookTitle}»
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* المحتوى */}
              <div className="flex-1 overflow-y-auto p-4">
                {sent ? (
                  <div className="flex flex-col items-center py-6 text-center text-teal-700">
                    <CheckCircle2 className="h-10 w-10 mb-2" />
                    <p className="text-xs font-black">
                      تم استلام البلاغ بنجاح، سيقوم فريق الإدارة بمراجعته فوراً.
                    </p>
                  </div>
                ) : (
                  <form
                    id="report-form"
                    onSubmit={handleSubmit}
                    className="space-y-3"
                  >
                    <div className="space-y-1.5">
                      <label className="block text-xs font-black text-slate-700">
                        سبب البلاغ
                      </label>
                      <select
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-900 focus:border-rose-400 focus:bg-white focus:outline-none cursor-pointer"
                      >
                        {reasons.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-black text-slate-700">
                        تفاصيل إضافية (اختياري)
                      </label>
                      <textarea
                        value={details}
                        onChange={(e) => setDetails(e.target.value)}
                        rows={3}
                        placeholder="اكتب التفاصيل هنا..."
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-rose-400 focus:bg-white focus:outline-none resize-none"
                      />
                    </div>

                    {error && (
                      <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">
                        {error}
                      </p>
                    )}
                  </form>
                )}
              </div>

              {/* الأزرار الثابتة بالأسفل */}
              {!sent && (
                <div className="grid shrink-0 grid-cols-2 gap-2 border-t border-slate-100 bg-slate-50/60 px-4 py-3">
                  <button
                    type="submit"
                    form="report-form"
                    disabled={loading}
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-black text-white transition hover:bg-rose-700 active:scale-[0.99] disabled:opacity-60 cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>جارٍ الإرسال...</span>
                      </>
                    ) : (
                      <span>إرسال البلاغ</span>
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => setIsOpen(false)}
                    className="flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              )}
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <button
        type="button"
        onClick={handleOpenModal}
        title={isBookReport ? "إبلاغ عن الكتاب" : "إبلاغ عن مشكلة"}
        className={`cursor-pointer ${buttonClasses}`}
      >
        <Flag className={variant === "dark" ? "h-4 w-4" : "h-5 w-5"} />
      </button>

      {modalContent}
    </>
  );
}