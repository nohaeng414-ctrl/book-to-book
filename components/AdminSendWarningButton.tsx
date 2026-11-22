"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { BellRing, X, Loader2, CheckCircle2 } from "lucide-react";
import { adminSendWarning } from "@/app/actions/admin-warnings";

interface AdminSendWarningButtonProps {
  userId: string;
  userName: string;
  context?: "BOOK" | "SWAP";
  reportReason?: string;
  bookTitle?: string | null;
}

function buildReadyWarningText(
  context: "BOOK" | "SWAP",
  reportReason?: string,
  bookTitle?: string | null
): string {
  const bookRef = bookTitle ? ` «${bookTitle}»` : "";

  if (context === "BOOK") {
    if (reportReason?.includes("غلاف")) {
      return `يرجى تعديل صورة غلاف كتابك${bookRef} لتكون واضحة ومناسبة لسياسات المنصة.`;
    }
    if (reportReason?.includes("بيانات")) {
      return `يرجى مراجعة وتصحيح بيانات كتابك${bookRef} لتكون دقيقة ومطابقة للواقع.`;
    }
    if (reportReason?.includes("مكرر")) {
      return `يرجى حذف الإعلانات المكررة لكتابك${bookRef} والاكتفاء بإعلان واحد فقط.`;
    }
    return `تنبيه بخصوص كتابك${bookRef}: يرجى الالتزام بسياسات المنصة تجنباً لحذف الكتاب أو تقييد الحساب.`;
  }

  if (reportReason?.includes("إزعاج") || reportReason?.includes("سلوك")) {
    return "يرجى الالتزام باللباقة واحترام الطرف الآخر في المحادثات، تكرار السلوك غير اللائق يعرّض حسابك للحظر.";
  }
  if (reportReason?.includes("التسليم") || reportReason?.includes("الحضور")) {
    return `تنبيه بخصوص طلب كتاب${bookRef}: يرجى التواصل مع الطرف الآخر والالتزام بموعد وإجراءات التسليم.`;
  }
  if (reportReason?.includes("مطابق") || reportReason?.includes("تالف")) {
    return `تنبيه بخصوص طلب كتاب${bookRef}: يرجى التأكد من مطابقة حالة الكتاب للوصف المذكور عند التسليم.`;
  }
  if (reportReason?.includes("احتيالي")) {
    return "تنبيه إداري هام: تم رصد ملاحظات تتعلق بمصداقية التعامل، يرجى الالتزام بشروط المنصة تجنباً لإيقاف الحساب.";
  }

  return `تنبيه إداري بخصوص الطلب المرتبط بكتاب${bookRef}: يرجى الالتزام بقواعد التبادل في المنصة.`;
}

export default function AdminSendWarningButton({
  userId,
  userName,
  context = "SWAP",
  reportReason,
  bookTitle,
}: AdminSendWarningButtonProps) {
  const readyText = buildReadyWarningText(context, reportReason, bookTitle);

  const [open, setOpen] = useState(false);
  const [warningText, setWarningText] = useState(readyText);
  const [extraNote, setExtraNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setWarningText(buildReadyWarningText(context, reportReason, bookTitle));
  }, [context, reportReason, bookTitle]);

  const handleOpen = () => {
    setError(null);
    setWarningText(buildReadyWarningText(context, reportReason, bookTitle));
    setExtraNote("");
    setOpen(true);
  };

  const handleSend = async () => {
    setError(null);
    const baseText = warningText.trim();
    const noteText = extraNote.trim();
    const finalMsg =
      baseText && noteText
        ? `${baseText}\nملاحظة إضافية: ${noteText}`
        : baseText || noteText;

    if (!finalMsg) {
      setError("يرجى كتابة نص التنبيه.");
      return;
    }

    setLoading(true);
    const res = await adminSendWarning(userId, finalMsg);
    setLoading(false);

    if (!res.success) {
      setError(res.error || "حدث خطأ أثناء الإرسال.");
      return;
    }

    setSent(true);
    setTimeout(() => {
      setSent(false);
      setOpen(false);
      setExtraNote("");
    }, 1000);
  };

  const modal =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-3 sm:p-4 backdrop-blur-xs"
            onClick={() => !loading && setOpen(false)}
          >
            <div
              dir="rtl"
              className="flex max-h-[85dvh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl text-right"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex shrink-0 items-center justify-between border-b border-slate-100 p-4">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600 ring-1 ring-amber-100">
                    <BellRing className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-black text-slate-900">
                      إرسال تنبيه إداري
                    </h3>
                    <p className="text-[11px] text-slate-500 truncate">
                      إلى: {userName}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => setOpen(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {sent ? (
                  <div className="flex flex-col items-center py-6 text-center text-emerald-700">
                    <CheckCircle2 className="h-10 w-10 mb-2" />
                    <p className="text-sm font-black">
                      تم إرسال التنبيه للمستخدم بنجاح!
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-black text-slate-700">
                        نص التنبيه الجاهز
                      </label>
                      <textarea
                        rows={3}
                        value={warningText}
                        onChange={(e) => setWarningText(e.target.value)}
                        className="w-full rounded-xl border border-amber-200 bg-amber-50/40 px-3 py-2 text-xs font-bold text-slate-900 focus:border-amber-400 focus:bg-white focus:outline-none resize-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-black text-slate-700">
                        ملاحظة إضافية (اختياري)
                      </label>
                      <textarea
                        rows={2}
                        value={extraNote}
                        onChange={(e) => setExtraNote(e.target.value)}
                        placeholder="أضف ملاحظة إضافية هنا..."
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-amber-400 focus:bg-white focus:outline-none resize-none"
                      />
                    </div>

                    {error && (
                      <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">
                        {error}
                      </p>
                    )}
                  </>
                )}
              </div>

              {!sent && (
                <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-4 py-3">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => setOpen(false)}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleSend}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 px-4 py-2 text-xs font-black text-white transition active:scale-95 disabled:opacity-60 cursor-pointer"
                  >
                    {loading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <BellRing className="h-3.5 w-3.5" />
                    )}
                    <span>إرسال التنبيه</span>
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
        onClick={handleOpen}
        className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800 transition hover:bg-amber-100 active:scale-95 cursor-pointer"
      >
        <BellRing className="h-3.5 w-3.5" />
        <span>إرسال تنبيه</span>
      </button>

      {modal}
    </>
  );
}