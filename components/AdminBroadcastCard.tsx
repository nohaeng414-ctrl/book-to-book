"use client";

import { useState } from "react";
import { Megaphone, Send, CheckCircle2, Loader2 } from "lucide-react";
import { broadcastAdminNotificationAction } from "@/app/actions/admin-users";
import { toArabicNumerals } from "@/lib/formatting";

export default function AdminBroadcastCard() {
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
        setTimeout(() => setSentCount(null), 4000);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-2xs space-y-4">
      <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 ring-1 ring-amber-100">
          <Megaphone className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xs sm:text-sm font-black text-slate-900">
            إرسال إشعار جماعي لكافة القرّاء
          </h2>
          <p className="text-[11px] text-slate-400">
            سيصل هذا التنبيه فوراً إلى جرس الإشعارات لدى جميع المستخدمين النشطين
          </p>
        </div>
      </div>

      {sentCount !== null && (
        <div className="flex items-center gap-2 rounded-2xl bg-teal-50 border border-teal-200 p-3 text-xs font-bold text-teal-800">
          <CheckCircle2 className="h-4 w-4 text-teal-600 shrink-0" />
          <span>
            تم إرسال الإشعار بنجاح إلى {toArabicNumerals(sentCount)} قارئ!
          </span>
        </div>
      )}

      <form onSubmit={handleBroadcast} className="space-y-3">
        <div className="grid grid-cols-1 gap-3">
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="عنوان الإعلان (مثال: تحديث جديد في نظام النقاط 🎉)"
            className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-teal-600 focus:outline-hidden"
          />
          <textarea
            rows={2}
            required
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="اكتب نص الإشعار الجماعي هنا ليظهر لكل أعضاء المنصة..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-teal-600 focus:outline-hidden"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 px-5 py-2.5 text-xs font-black text-white transition active:scale-98 disabled:opacity-50 cursor-pointer"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
          <span>{loading ? "جاري الإرسال للجميع..." : "إرسال الإشعار للجميع"}</span>
        </button>
      </form>
    </section>
  );
}