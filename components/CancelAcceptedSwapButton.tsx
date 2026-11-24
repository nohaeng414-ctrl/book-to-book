"use client";

import { useState } from "react";
import { Loader2, XCircle } from "lucide-react";
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
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-3 sm:p-4 backdrop-blur-xs"
          onClick={() => !loading && setIsOpen(false)}
        >
          <div
            dir="rtl"
            className="flex max-h-[85dvh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl text-right"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="shrink-0 border-b border-slate-100 p-4">
              <h3 className="text-sm font-black text-slate-900">
                تأكيد إلغاء الطلب
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <p className="text-xs leading-relaxed text-slate-600">
                هل أنت متأكد من رغبتك في إلغاء الطلب؟ ستعود الكتب إلى حالة «متاح
                للتبادل» وتُحرَّر النقاط المحجوزة تلقائياً.
              </p>

              {error && (
                <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">
                  {error}
                </p>
              )}
            </div>

            <div className="grid shrink-0 grid-cols-2 gap-2 border-t border-slate-100 bg-slate-50/60 px-4 py-3">
              <button
                type="button"
                disabled={loading}
                onClick={handleConfirmCancel}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-black text-white transition hover:bg-rose-700 active:scale-[0.99] disabled:opacity-60 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>جارٍ الإلغاء...</span>
                  </>
                ) : (
                  <span>تأكيد الإلغاء</span>
                )}
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => setIsOpen(false)}
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