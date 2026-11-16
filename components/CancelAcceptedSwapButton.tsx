"use client";

import { useState } from "react";
import { Loader2, XCircle, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { cancelAcceptedSwapAction } from "@/app/actions/swapWorkflow";

export default function CancelAcceptedSwapButton({
  swapId,
}: {
  swapId: string;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleConfirmCancel = async () => {
    if (loading) return;
    setLoading(true);
    setError("");

    try {
      const res = await cancelAcceptedSwapAction(swapId);
      if (res?.error) {
        setError(res.error);
        return;
      }

      setIsOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر إلغاء الطلب.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError("");
          setIsOpen(true);
        }}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-xs font-bold text-slate-700 shadow-2xs transition hover:bg-slate-50 cursor-pointer"
      >
        <XCircle className="h-4 w-4 text-slate-500 shrink-0" />
        <span>إلغاء الطلب</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div
            dir="rtl"
            className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs sm:text-sm font-black text-slate-900">
                تأكيد إلغاء الطلب
              </span>
              <button
                type="button"
                disabled={loading}
                onClick={() => setIsOpen(false)}
                className="rounded-full bg-slate-100 p-1.5 text-slate-500 hover:bg-slate-200 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs leading-relaxed text-slate-600">
              هل أنت متأكد من رغبتك في إلغاء الطلب؟ ستعود الكتب إلى حالة «متاح
              للتبادل» وتُحرَّر النقاط المحجوزة تلقائياً.
            </p>

            {error && (
              <p className="rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs font-bold text-red-600">
                {error}
              </p>
            )}

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={loading}
                className="flex items-center justify-center rounded-xl bg-red-600 py-3 text-xs font-black text-white shadow-2xs transition hover:bg-red-700 disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "إلغاء الطلب"
                )}
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={loading}
                className="rounded-xl border border-slate-300 bg-white py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50 cursor-pointer"
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