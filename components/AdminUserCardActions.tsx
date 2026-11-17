"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Ban,
  CheckCircle2,
  Bell,
  Coins,
  BookOpen,
  Trash2,
  UserX,
  X,
  Loader2,
  ShieldAlert,
  AlertTriangle,
} from "lucide-react";
import {
  toggleBanUserAction,
  deleteUserAction,
  sendAdminNotificationAction,
  adjustUserPointsAction,
  adminDeleteBookAction,
} from "@/app/actions/admin-users";
import { toArabicNumerals } from "@/lib/formatting";

interface UserBook {
  id: string;
  title: string;
  author: string;
  points: number;
}

interface Props {
  userId: string;
  userName: string;
  isBanned: boolean;
  banReason?: string | null;
  currentPoints: number;
  books: UserBook[];
}

export default function AdminUserCardActions({
  userId,
  userName,
  isBanned,
  banReason,
  currentPoints,
  books,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // حالات النوافذ المنبثقة
  const [showBanModal, setShowBanModal] = useState(false);
  const [showDeleteUserModal, setShowDeleteUserModal] = useState(false);
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [showPointsModal, setShowPointsModal] = useState(false);
  const [showBooksModal, setShowBooksModal] = useState(false);

  // حقول النماذج
  const [reasonInput, setReasonInput] = useState(banReason || "");
  const [notifTitle, setNotifTitle] = useState("");
  const [notifBody, setNotifBody] = useState("");
  const [pointsDelta, setPointsDelta] = useState<number>(1);
  const [pointsReason, setPointsReason] = useState("");

  const showTempMessage = (type: "ok" | "err", text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 3500);
  };

  // 1. تنفيذ الحظر أو فك الحظر
  const handleToggleBan = async () => {
    setLoading(true);
    try {
      await toggleBanUserAction(userId, !isBanned, reasonInput);
      setShowBanModal(false);
      showTempMessage("ok", !isBanned ? "تم حظر الحساب بنجاح" : "تم فك الحظر عن الحساب");
      router.refresh();
    } catch {
      showTempMessage("err", "حدث خطأ أثناء تنفيذ الإجراء");
    } finally {
      setLoading(false);
    }
  };

  // 2. تنفيذ حذف حساب المستخدم نهائياً
  const handleDeleteUser = async () => {
    setLoading(true);
    try {
      const res = await deleteUserAction(userId);
      if (!res.success) {
        showTempMessage("err", res.error || "تعذر حذف الحساب");
        setShowDeleteUserModal(false);
        return;
      }
      setShowDeleteUserModal(false);
      router.refresh();
    } catch {
      showTempMessage("err", "حدث خطأ أثناء حذف الحساب");
    } finally {
      setLoading(false);
    }
  };

  // 3. تنفيذ إرسال الإشعار
  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifTitle.trim() || !notifBody.trim()) return;
    setLoading(true);
    try {
      await sendAdminNotificationAction(userId, notifTitle, notifBody);
      setNotifTitle("");
      setNotifBody("");
      setShowNotifyModal(false);
      showTempMessage("ok", "تم إرسال التنبيه للقارئ بنجاح");
      router.refresh();
    } catch {
      showTempMessage("err", "تعذر إرسال التنبيه");
    } finally {
      setLoading(false);
    }
  };

  // 4. تنفيذ تعديل النقاط
  const handleAdjustPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pointsDelta === 0) return;
    setLoading(true);
    try {
      await adjustUserPointsAction(userId, pointsDelta, pointsReason);
      setPointsReason("");
      setShowPointsModal(false);
      showTempMessage("ok", "تم تحديث رصيد النقاط بنجاح");
      router.refresh();
    } catch {
      showTempMessage("err", "تعذر تحديث النقاط");
    } finally {
      setLoading(false);
    }
  };

  // 5. تنفيذ حذف كتاب
  const handleDeleteBook = async (bookId: string) => {
    setLoading(true);
    try {
      await adminDeleteBookAction(bookId, userId);
      showTempMessage("ok", "تم حذف الكتاب وإشعار المستخدم");
      router.refresh();
    } catch {
      showTempMessage("err", "تعذر حذف الكتاب");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2.5 border-t border-slate-100 pt-3">
      {/* شريط رسائل التأكيد الفورية */}
      {feedback && (
        <div
          className={`rounded-xl px-3 py-2 text-xs font-bold ${
            feedback.type === "ok"
              ? "bg-teal-50 text-teal-800 border border-teal-200"
              : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* 🎛️ شريط أزرار التحكم السريع */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* زر الحظر / فك الحظر */}
          {isBanned ? (
            <button
              type="button"
              disabled={loading}
              onClick={handleToggleBan}
              className="inline-flex items-center gap-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 border border-teal-200 px-3 py-2 text-xs font-black text-teal-700 transition cursor-pointer disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              <span>فك الحظر</span>
            </button>
          ) : (
            <button
              type="button"
              disabled={loading}
              onClick={() => setShowBanModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-2 text-xs font-black text-amber-800 transition cursor-pointer disabled:opacity-50"
            >
              <Ban className="h-3.5 w-3.5" />
              <span>حظر</span>
            </button>
          )}

          {/* زر إرسال تنبيه */}
          <button
            type="button"
            onClick={() => setShowNotifyModal(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition cursor-pointer"
          >
            <Bell className="h-3.5 w-3.5 text-amber-500" />
            <span>إرسال تنبيه</span>
          </button>

          {/* زر تعديل النقاط */}
          <button
            type="button"
            onClick={() => setShowPointsModal(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition cursor-pointer"
          >
            <Coins className="h-3.5 w-3.5 text-teal-600" />
            <span>تعديل النقاط</span>
          </button>

          {/* زر استعراض وحذف الكتب */}
          <button
            type="button"
            onClick={() => setShowBooksModal(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition cursor-pointer"
          >
            <BookOpen className="h-3.5 w-3.5 text-blue-600" />
            <span>إدارة كتبه ({toArabicNumerals(books.length)})</span>
          </button>
        </div>

        {/* 🗑️ زر حذف الحساب نهائياً */}
        <button
          type="button"
          onClick={() => setShowDeleteUserModal(true)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200 px-3 py-2 text-xs font-black transition cursor-pointer"
          title="حذف الحساب نهائياً من قاعدة البيانات"
        >
          <UserX className="h-3.5 w-3.5" />
          <span>حذف الحساب</span>
        </button>
      </div>

      {/* 🚨 1. نافذة حظر المستخدم */}
      {showBanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs text-right">
          <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-amber-600">
                <ShieldAlert className="h-5 w-5" />
                <h3 className="text-sm font-black text-slate-900">
                  حظر حساب {userName}
                </h3>
              </div>
              <button onClick={() => setShowBanModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                سبب الحظر (سيظهر للمستخدم عند محاولة الدخول):
              </label>
              <textarea
                rows={3}
                value={reasonInput}
                onChange={(e) => setReasonInput(e.target.value)}
                placeholder="مثال: تكرار عدم الالتزام بمواعيد تسليم الكتب..."
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:border-amber-500 focus:outline-hidden"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={loading}
                onClick={handleToggleBan}
                className="flex-1 rounded-xl bg-amber-600 hover:bg-amber-700 py-2.5 text-xs font-black text-white transition disabled:opacity-50 cursor-pointer"
              >
                {loading ? "جاري الحظر..." : "تأكيد الحظر"}
              </button>
              <button
                type="button"
                onClick={() => setShowBanModal(false)}
                className="rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-600 cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🗑️ 2. نافذة تأكيد حذف الحساب نهائياً */}
      {showDeleteUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs text-right">
          <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-rose-600">
                <AlertTriangle className="h-5 w-5" />
                <h3 className="text-sm font-black text-slate-900">
                  حذف حساب {userName} نهائياً
                </h3>
              </div>
              <button onClick={() => setShowDeleteUserModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs leading-relaxed text-slate-600">
              هل أنتِ متأكدة من حذف حساب <strong className="text-slate-900">{userName}</strong>؟ سيتم مسح جميع كتبه وطلباته وسجل نقاطه نهائياً ولا يمكن التراجع عن هذا الإجراء.
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={loading}
                onClick={handleDeleteUser}
                className="flex-1 rounded-xl bg-rose-600 hover:bg-rose-700 py-2.5 text-xs font-black text-white transition disabled:opacity-50 cursor-pointer"
              >
                {loading ? "جاري الحذف..." : "نعم، احذف الحساب نهائياً"}
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteUserModal(false)}
                className="rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-600 cursor-pointer"
              >
                تراجع
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔔 3. نافذة إرسال تنبيه أو إشعار */}
      {showNotifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs text-right">
          <form onSubmit={handleSendNotification} className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-amber-600">
                <Bell className="h-5 w-5" />
                <h3 className="text-sm font-black text-slate-900">
                  إرسال تنبيه إلى {userName}
                </h3>
              </div>
              <button type="button" onClick={() => setShowNotifyModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">عنوان التنبيه:</label>
                <input
                  type="text"
                  required
                  value={notifTitle}
                  onChange={(e) => setNotifTitle(e.target.value)}
                  placeholder="مثال: مراجعة بيانات كتابك المضاف"
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:border-teal-600 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">نص الرسالة:</label>
                <textarea
                  rows={3}
                  required
                  value={notifBody}
                  onChange={(e) => setNotifBody(e.target.value)}
                  placeholder="اكتب رسالتك الواضحة للقارئ هنا..."
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:border-teal-600 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 rounded-xl bg-teal-600 hover:bg-teal-700 py-2.5 text-xs font-black text-white transition disabled:opacity-50 cursor-pointer"
              >
                {loading ? "جاري الإرسال..." : "إرسال الإشعار"}
              </button>
              <button
                type="button"
                onClick={() => setShowNotifyModal(false)}
                className="rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-600 cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 🪙 4. نافذة تعديل رصيد النقاط */}
      {showPointsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs text-right">
          <form onSubmit={handleAdjustPoints} className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-teal-600">
                <Coins className="h-5 w-5" />
                <h3 className="text-sm font-black text-slate-900">
                  تعديل نقاط {userName}
                </h3>
              </div>
              <button type="button" onClick={() => setShowPointsModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              الرصيد الحالي: <strong className="text-slate-900">{toArabicNumerals(currentPoints)} نقاط</strong>
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  عدد النقاط (موجب للإضافة، سالب للخصم):
                </label>
                <input
                  type="number"
                  required
                  value={pointsDelta}
                  onChange={(e) => setPointsDelta(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-bold focus:border-teal-600 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">سبب التعديل:</label>
                <input
                  type="text"
                  required
                  value={pointsReason}
                  onChange={(e) => setPointsReason(e.target.value)}
                  placeholder="مثال: تعويض عن طلب تبادل ملغى..."
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:border-teal-600 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 rounded-xl bg-teal-600 hover:bg-teal-700 py-2.5 text-xs font-black text-white transition disabled:opacity-50 cursor-pointer"
              >
                {loading ? "جاري الحفظ..." : "تحديث الرصيد"}
              </button>
              <button
                type="button"
                onClick={() => setShowPointsModal(false)}
                className="rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-600 cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 📚 5. نافذة استعراض وحذف كتب المستخدم */}
      {showBooksModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs text-right">
          <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-blue-600">
                <BookOpen className="h-5 w-5" />
                <h3 className="text-sm font-black text-slate-900">
                  كتب {userName} ({toArabicNumerals(books.length)})
                </h3>
              </div>
              <button onClick={() => setShowBooksModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            {books.length > 0 ? (
              <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 pr-1">
                {books.map((book) => (
                  <div key={book.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-black text-slate-900 truncate">{book.title}</p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {book.author} · {toArabicNumerals(book.points)} نقاط
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => handleDeleteBook(book.id)}
                      className="shrink-0 inline-flex items-center gap-1 rounded-xl bg-rose-50 hover:bg-rose-100 px-2.5 py-1.5 text-[11px] font-bold text-rose-600 transition cursor-pointer disabled:opacity-50"
                      title="حذف الكتاب نهائياً"
                    >
                      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      <span>حذف الكتاب</span>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-6 text-center text-xs text-slate-400 font-medium">
                لا توجد كتب معروضة لهذا المستخدم حالياً.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}