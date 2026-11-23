"use client";

import { useState } from "react";
import { Megaphone, Send, CheckCircle2, Loader2, X } from "lucide-react";
import { broadcastAdminNotificationAction } from "@/app/actions/admin-users";
import { toArabicNumerals } from "@/lib/formatting";

export default function AdminBroadcastModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [sentCount, setSentCount] = useState<number | null>(null);

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
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

  return (
    <>
      {/* 📢 زر فتح نافذة الإشعار الجماعي */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 border border-amber-400/30 px-3 py-2 text-xs font-black text-amber-300 transition active:scale-95 backdrop-blur-md cursor-pointer"
        title="إرسال إشعار عام لجميع الأعضاء"
      >
        <Megaphone className="h-4 w-4" />
        <span>إشعار للجميع</span>
      </button>

      {/* 🪟 النافذة المنبثقة لإرسال الإعلان */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs text-slate-900 text-right"
          dir="rtl"
        >
          <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 ring-1 ring-amber-100">
                  <Megaphone className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    إرسال إشعار جماعي للمنصة
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    سيصل التنبيه فوراً إلى جميع القراء النشطين
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {sentCount !== null ? (
              <div className="py-8 flex flex-col items-center justify-center gap-2 text-center">
                <CheckCircle2 className="h-10 w-10 text-teal-600" />
                <p className="text-xs font-black text-teal-800">
                  تم إرسال الإشعار بنجاح إلى {toArabicNumerals(sentCount)} عضو!
                </p>
              </div>
            ) : (
              <form onSubmit={handleBroadcast} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    عنوان الإعلان:
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="مثال: ميزة جديدة في كتاب بكتاب 🎉"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-teal-600 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    نص الإشعار الجماعي:
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="اكتب رسالتك العامة هنا لتظهر في جرس الإشعارات لدى الجميع..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-teal-600 focus:outline-hidden"
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 py-2.5 text-xs font-black text-white transition disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                    <span>{loading ? "جاري الإرسال..." : "إرسال للجميع الآن"}</span>
                  </button>
                  
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}