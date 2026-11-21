"use client";

import { useState } from "react";
import {
  ShieldAlert,
  X,
  Loader2,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  raiseDisputeAction,
  reportUserAction,
} from "@/app/actions/swapWorkflow";

const COMPLAINT_REASONS = [
  "عدم التجاوب أو المماطلة في التسليم أو الاستلام",
  "حالة الكتاب تخالف الوصف أو به تلف",
  "استلام كتاب مختلف عن المطلوب",
  "سبب آخر",
];

export default function SwapDisputeModal({
  swapId,
  reportedUserId,
  isCompleted = false,
}: {
  swapId: string;
  reportedUserId: string;
  reportedUserName?: string;
  isCompleted?: boolean;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [complaintReason, setComplaintReason] = useState(COMPLAINT_REASONS[0]);
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleOpen = () => {
    setError("");
    setSuccessMessage("");
    setDetails("");
    setComplaintReason(COMPLAINT_REASONS[0]);
    setIsOpen(true);
  };

  const handleClose = () => {
    if (loading) return;
    setIsOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = details.trim();
    if (!trimmed) {
      setError("يرجى كتابة تفاصيل الشكوى.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      if (!isCompleted) {
        const combinedDetails = `${complaintReason}: ${trimmed}`.slice(0, 500);
        const res = await raiseDisputeAction(swapId, combinedDetails);
        if (res?.error) {
          setError(res.error);
          return;
        }
        setSuccessMessage("تم رفع الشكوى على الطلب وإحالتها للإدارة.");
      } else {
        const res = await reportUserAction({
          reportedUserId,
          reason: complaintReason,
          details: trimmed,
          swapId,
        });
        if (res?.error) {
          setError(res.error);
          return;
        }
        setSuccessMessage("تم رفع الشكوى على الطلب وإرسالها للإدارة.");
      }

      setTimeout(() => {
        setIsOpen(false);
        router.refresh();
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ غير متوقع.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* زر رفع شكوى في أسفل الصفحة */}
      <button
        type="button"
        onClick={handleOpen}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50/70 px-4 py-3 text-xs font-bold text-red-700 transition hover:bg-red-100/80 hover:border-red-300 cursor-pointer"
      >
        <ShieldAlert className="h-4 w-4 text-red-600 shrink-0" />
        <span>رفع شكوى</span>
      </button>

      {/* النافذة المنبثقة */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div
            dir="rtl"
            className="flex flex-col max-h-[88vh] w-full max-w-md rounded-3xl border border-slate-200 bg-white shadow-2xl overflow-hidden"
          >
            {/* رأس النافذة */}
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
              <span className="flex items-center gap-1.5 text-xs sm:text-sm font-black text-slate-900">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span>رفع شكوى</span>
              </span>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-full bg-slate-100 p-1.5 text-slate-500 hover:bg-slate-200 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="flex-1 overflow-y-auto p-5 space-y-4"
            >
              {/* سبب الشكوى */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  سبب الشكوى:
                </label>
                <select
                  value={complaintReason}
                  onChange={(e) => setComplaintReason(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-800 focus:border-red-500 focus:bg-white focus:outline-hidden"
                >
                  {COMPLAINT_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              {/* تفاصيل الشكوى */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  تفاصيل الشكوى:
                </label>
                <textarea
                  rows={4}
                  maxLength={450}
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="اكتب تفاصيل المشكلة المتعلقة بهذا الطلب لمراجعتها من قبل الإدارة..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-red-500 focus:bg-white focus:outline-hidden resize-none"
                />
                <span className="block text-left text-[10px] text-slate-400">
                  {details.length} / 450
                </span>
              </div>

              {error && (
                <p className="rounded-xl bg-red-50 border border-red-200 p-2.5 text-xs font-bold text-red-600">
                  {error}
                </p>
              )}

              {successMessage && (
                <p className="flex items-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-200 p-2.5 text-xs font-bold text-emerald-700">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{successMessage}</span>
                </p>
              )}

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="submit"
                  disabled={loading || Boolean(successMessage)}
                  className="flex items-center justify-center rounded-xl bg-red-600 py-3 text-xs font-black text-white shadow-2xs transition hover:bg-red-700 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "إرسال الشكوى"
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleClose}
                  disabled={loading}
                  className="rounded-xl border border-slate-300 bg-white py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50 cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
