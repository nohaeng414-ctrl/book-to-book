"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Flag, X, AlertTriangle } from "lucide-react";
import { reportUserAction } from "@/app/actions/swapWorkflow";

export default function ReportModal({
  reportedUserId,
  reportedUserName,
  swapId,
  currentUserId, // 👈 1. أضفنا معرف المستخدم الحالي هنا
}: {
  reportedUserId: string;
  reportedUserName: string;
  swapId?: string;
  currentUserId?: string | null; // 👈 2. تحديد نوع الخاصية
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState("إزعاج أو سلوك غير لائق");
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleOpenModal = () => {
    // 🔒 3. إذا لم يكن المستخدم مسجلاً دخوله، حوله إلى صفحة تسجيل الدخول فوراً
    if (!currentUserId) {
      router.push("/login");
      return;
    }
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await reportUserAction({
      reportedUserId,
      reason,
      details,
      swapId,
    });
    setLoading(false);
    if (res?.success) {
      setSent(true);
      setTimeout(() => {
        setIsOpen(false);
        setSent(false);
        setDetails("");
      }, 1800);
    }
  };

  return (
    <>
      <button
        onClick={handleOpenModal} // 👈 4. ربط الزر بالدالة الجديدة للتحقق من التسجيل
        title="إبلاغ عن الحساب"
        className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 backdrop-blur-xs transition active:scale-95 cursor-pointer"
      >
        <Flag className="h-4 w-4" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs text-slate-900" dir="rtl">
          <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl border border-slate-100 text-right">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-rose-600">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <h3 className="text-sm font-black text-slate-800">إبلاغ عن {reportedUserName}</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {sent ? (
              <div className="py-8 text-center text-xs font-bold text-teal-700">
                تم استلام البلاغ وسيقوم فريق الإدارة بمراجعته فوراً. شكراً لحرصك!
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-4 space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">سبب البلاغ:</label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-semibold text-slate-900 focus:border-rose-500 focus:outline-hidden cursor-pointer"
                  >
                    <option value="إزعاج أو سلوك غير لائق" className="text-slate-900 bg-white">إزعاج أو سلوك غير لائق</option>
                    <option value="عدم الحضور أو التهرب من التسليم" className="text-slate-900 bg-white">عدم الحضور أو التهرب من التسليم</option>
                    <option value="الكتاب غير مطابق للوصف أو تالف" className="text-slate-900 bg-white">الكتاب غير مطابق للوصف أو تالف</option>
                    <option value="حساب احتيالي أو وهمي" className="text-slate-900 bg-white">حساب احتيالي أو وهمي</option>
                    <option value="محتوى مسيء أو مخالف" className="text-slate-900 bg-white">محتوى مسيء أو مخالف</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">تفاصيل إضافية (اختياري):</label>
                  <textarea
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    rows={3}
                    placeholder="وضّح ما حدث باختصار لمساعدة الإدارة..."
                    className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-rose-500 focus:outline-hidden"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-rose-600 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-rose-700 transition disabled:opacity-50 cursor-pointer"
                >
                  {loading ? "جاري الإرسال..." : "إرسال البلاغ"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}