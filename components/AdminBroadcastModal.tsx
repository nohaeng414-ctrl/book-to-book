"use client";

import { useEffect, useId, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Megaphone, Send, CheckCircle2, Loader2 } from "lucide-react";
import { broadcastAdminNotificationAction } from "@/app/actions/admin-users";
import { toArabicNumerals } from "@/lib/formatting";

const subscribeToHydration = () => () => {};
const getHydratedSnapshot = () => true;
const getServerSnapshot = () => false;

export default function AdminBroadcastModal({
  className,
}: {
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [sentCount, setSentCount] = useState<number | null>(null);
  const mounted = useSyncExternalStore(
    subscribeToHydration,
    getHydratedSnapshot,
    getServerSnapshot
  );
  const dialogId = useId();

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !loading) setIsOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, loading]);

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim() || loading) return;
    setLoading(true);
    try {
      const res = await broadcastAdminNotificationAction(title, body);
      if (res.success) {
        setSentCount(res.count ?? 0);
        setTitle("");
        setBody("");
        setTimeout(() => {
          setSentCount(null);
          setIsOpen(false);
        }, 2000);
      }
    } finally {
      setLoading(false);
    }
  };

  const modalContent = isOpen ? (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-3 sm:p-4 backdrop-blur-xs text-slate-900"
      onClick={() => !loading && setIsOpen(false)}
    >
      <section
        dir="rtl"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${dialogId}-title`}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85dvh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl text-right"
      >
        <div className="shrink-0 border-b border-slate-100 p-4">
          <h2 id={`${dialogId}-title`} className="text-sm font-black text-slate-900">
            إرسال إشعار 
          </h2>
        </div>

        {sentCount !== null ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
            <CheckCircle2 className="h-10 w-10 text-teal-600" aria-hidden="true" />
            <p className="text-xs font-black text-teal-800">
              تم إرسال الإشعار بنجاح إلى {toArabicNumerals(sentCount)} عضو!
            </p>
          </div>
        ) : (
          <form
            id={`${dialogId}-form`}
            onSubmit={handleBroadcast}
            className="flex flex-1 flex-col overflow-hidden"
          >
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              <div className="space-y-1.5">
                <label
                  htmlFor={`${dialogId}-title-input`}
                  className="block text-xs font-black text-slate-700"
                >
                  عنوان الإشعار
                </label>
                <input
                  id={`${dialogId}-title-input`}
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="اكتب عنوان الإشعار هنا..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor={`${dialogId}-body-input`}
                  className="block text-xs font-black text-slate-700"
                >
                  نص الإشعار
                </label>
                <textarea
                  id={`${dialogId}-body-input`}
                  rows={3}
                  required
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="اكتب نص الإشعار هنا..."
                  className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <div className="grid shrink-0 grid-cols-2 gap-2 border-t border-slate-100 bg-slate-50/60 px-4 py-3">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-black text-white transition hover:bg-slate-800 active:scale-[0.99] disabled:opacity-60 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    <span>جارٍ الإرسال...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>إرسال الإشعار الآن</span>
                  </>
                )}
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => setIsOpen(false)}
                className="flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 active:scale-[0.99] disabled:opacity-50 cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  ) : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={
          className ||
          "inline-flex items-center gap-1.5 rounded-xl border border-amber-400/30 bg-amber-400/20 px-3 py-2 text-xs font-black text-amber-300 backdrop-blur-md transition hover:bg-amber-400/30 active:scale-95 cursor-pointer"
        }
        title="إرسال إشعار عام لجميع الأعضاء"
      >
        <Megaphone className="h-4 w-4" aria-hidden="true" />
        <span>إشعار للجميع</span>
      </button>

      {mounted && modalContent ? createPortal(modalContent, document.body) : null}
    </>
  );
}