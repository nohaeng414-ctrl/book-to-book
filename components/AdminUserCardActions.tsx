"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
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
  const [feedback, setFeedback] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);

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
      showTempMessage(
        "ok",
        !isBanned ? "تم حظر الحساب بنجاح" : "تم فك الحظر عن الحساب"
      );
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

  const canPortal = typeof document !== "undefined";

  const modals = canPortal
    ? createPortal(
        <>
          {/* 🚨 1. نافذة حظر المستخدم */}
          {showBanModal && (
            <div
              dir="rtl"
              className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/55 p-3 sm:p-4 backdrop-blur-xs text-right"
              onClick={() => !loading && setShowBanModal(false)}
            >
              <div
                className="flex max-h-[85dvh] w-full max-w-sm flex-col overflow-hidden rounded-3xl bg-white p-5 shadow-2xl border border-slate-100 space-y-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2 text-amber-600 min-w-0">
                    <ShieldAlert className="h-5 w-5 shrink-0" />
                    <h3 className="text-sm font-black text-slate-900 truncate">
                      حظر الحساب
                    </h3>
                  </div>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => setShowBanModal(false)}
                    aria-label="إغلاق"
                    className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="overflow-y-auto space-y-2">
                  <label className="block text-xs font-bold text-slate-700">
                    سبب الحظر (سيظهر للمستخدم عند محاولة الدخول):
                  </label>
                  <textarea
                    rows={3}
                    value={reasonInput}
                    onChange={(e) => setReasonInput(e.target.value)}
                    placeholder="مثال: تكرار عدم الالتزام بمواعيد تسليم الكتب..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-medium text-slate-900 focus:border-amber-500 focus:bg-white focus:outline-none resize-none"
                  />
                </div>

                <button
                  type="button"
                  disabled={loading}
                  onClick={handleToggleBan}
                  className="w-full rounded-xl bg-amber-600 hover:bg-amber-700 py-2.5 text-xs font-black text-white transition active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? "جاري الحظر..." : "تأكيد الحظر"}
                </button>
              </div>
            </div>
          )}

          {/* 🗑️ 2. نافذة تأكيد حذف الحساب نهائياً */}
          {showDeleteUserModal && (
            <div
              dir="rtl"
              className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/55 p-3 sm:p-4 backdrop-blur-xs text-right"
              onClick={() => !loading && setShowDeleteUserModal(false)}
            >
              <div
                className="flex max-h-[85dvh] w-full max-w-sm flex-col overflow-hidden rounded-3xl bg-white p-5 shadow-2xl border border-slate-100 space-y-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2 text-rose-600 min-w-0">
                    <AlertTriangle className="h-5 w-5 shrink-0" />
                    <h3 className="text-sm font-black text-slate-900 truncate">
                      حذف حساب {userName} نهائياً
                    </h3>
                  </div>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => setShowDeleteUserModal(false)}
                    aria-label="إغلاق"
                    className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <p className="text-xs leading-relaxed text-slate-600">
                  هل أنتِ متأكدة من حذف حساب{" "}
                  <strong className="text-slate-900">{userName}</strong>؟ سيتم
                  مسح جميع كتبه وطلباته وسجل نقاطه نهائياً ولا يمكن التراجع عن
                  هذا الإجراء.
                </p>

                <button
                  type="button"
                  disabled={loading}
                  onClick={handleDeleteUser}
                  className="w-full rounded-xl bg-rose-600 hover:bg-rose-700 py-2.5 text-xs font-black text-white transition active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? "جاري الحذف..." : "نعم، احذف الحساب نهائياً"}
                </button>
              </div>
            </div>
          )}

          {/* 🔔 3. نافذة إرسال تنبيه أو إشعار */}
          {showNotifyModal && (
            <div
              dir="rtl"
              className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/55 p-3 sm:p-4 backdrop-blur-xs text-right"
              onClick={() => !loading && setShowNotifyModal(false)}
            >
              <form
                onSubmit={handleSendNotification}
                className="flex max-h-[85dvh] w-full max-w-sm flex-col overflow-hidden rounded-3xl bg-white p-5 shadow-2xl border border-slate-100 space-y-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2 text-amber-600 min-w-0">
                    <Bell className="h-5 w-5 shrink-0" />
                    <h3 className="text-sm font-black text-slate-900 truncate">
                      إرسال تنبيه إلى {userName}
                    </h3>
                  </div>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => setShowNotifyModal(false)}
                    aria-label="إغلاق"
                    className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="overflow-y-auto space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      عنوان التنبيه:
                    </label>
                    <input
                      type="text"
                      required
                      value={notifTitle}
                      onChange={(e) => setNotifTitle(e.target.value)}
                      placeholder="مثال: مراجعة بيانات كتابك المضاف"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-medium text-slate-900 focus:border-teal-600 focus:bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      نص الرسالة:
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={notifBody}
                      onChange={(e) => setNotifBody(e.target.value)}
                      placeholder="اكتب رسالتك الواضحة للقارئ هنا..."
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-medium text-slate-900 focus:border-teal-600 focus:bg-white focus:outline-none resize-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-teal-600 hover:bg-teal-700 py-2.5 text-xs font-black text-white transition active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? "جاري الإرسال..." : "إرسال الإشعار"}
                </button>
              </form>
            </div>
          )}

          {/* 🪙 4. نافذة تعديل رصيد النقاط */}
          {showPointsModal && (
            <div
              dir="rtl"
              className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/55 p-3 sm:p-4 backdrop-blur-xs text-right"
              onClick={() => !loading && setShowPointsModal(false)}
            >
              <form
                onSubmit={handleAdjustPoints}
                className="flex max-h-[85dvh] w-full max-w-sm flex-col overflow-hidden rounded-3xl bg-white p-5 shadow-2xl border border-slate-100 space-y-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2 text-teal-600 min-w-0">
                    <Coins className="h-5 w-5 shrink-0" />
                    <h3 className="text-sm font-black text-slate-900 truncate">
                      تعديل نقاط {userName}
                    </h3>
                  </div>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => setShowPointsModal(false)}
                    aria-label="إغلاق"
                    className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <p className="text-xs text-slate-500">
                  الرصيد الحالي:{" "}
                  <strong className="text-slate-900">
                    {toArabicNumerals(currentPoints)} نقاط
                  </strong>
                </p>

                <div className="overflow-y-auto space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      عدد النقاط (موجب للإضافة، سالب للخصم):
                    </label>
                    <input
                      type="number"
                      required
                      value={pointsDelta}
                      onChange={(e) => setPointsDelta(Number(e.target.value))}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-bold text-slate-900 focus:border-teal-600 focus:bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      سبب التعديل:
                    </label>
                    <input
                      type="text"
                      required
                      value={pointsReason}
                      onChange={(e) => setPointsReason(e.target.value)}
                      placeholder="مثال: تعويض عن طلب تبادل ملغى..."
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-medium text-slate-900 focus:border-teal-600 focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-teal-600 hover:bg-teal-700 py-2.5 text-xs font-black text-white transition active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? "جاري الحفظ..." : "تحديث الرصيد"}
                </button>
              </form>
            </div>
          )}

          {/* 📚 5. نافذة استعراض وحذف كتب المستخدم */}
          {showBooksModal && (
            <div
              dir="rtl"
              className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/55 p-3 sm:p-4 backdrop-blur-xs text-right"
              onClick={() => !loading && setShowBooksModal(false)}
            >
              <div
                className="flex max-h-[85dvh] w-full max-w-md flex-col overflow-hidden rounded-3xl bg-white p-5 shadow-2xl border border-slate-100 space-y-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2 text-blue-600 min-w-0">
                    <BookOpen className="h-5 w-5 shrink-0" />
                    <h3 className="text-sm font-black text-slate-900 truncate">
                      كتب {userName} ({toArabicNumerals(books.length)})
                    </h3>
                  </div>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => setShowBooksModal(false)}
                    aria-label="إغلاق"
                    className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {books.length > 0 ? (
                  <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 pr-1">
                    {books.map((book) => (
                      <div
                        key={book.id}
                        className="py-2.5 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-black text-slate-900 truncate">
                            {book.title}
                          </p>
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
                          {loading ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
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
        </>,
        document.body
      )
    : null;

  return (
    <div className="space-y-2 border-t border-slate-100 pt-3">
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
      <div className="flex flex-wrap items-center gap-2">
      

        {/* زر إرسال تنبيه */}
        <button
          type="button"
          onClick={() => setShowNotifyModal(true)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200/80 px-3 py-1.5 text-xs font-bold text-slate-700 transition cursor-pointer"
        >
          <Bell className="h-3.5 w-3.5 text-amber-500" />
          <span>إرسال تنبيه</span>
        </button>

        {/* زر تعديل النقاط */}
        <button
          type="button"
          onClick={() => setShowPointsModal(true)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200/80 px-3 py-1.5 text-xs font-bold text-slate-700 transition cursor-pointer"
        >
          <Coins className="h-3.5 w-3.5 text-teal-600" />
          <span>تعديل النقاط</span>
        </button>

        {/* زر استعراض وحذف الكتب */}
        <button
          type="button"
          onClick={() => setShowBooksModal(true)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200/80 px-3 py-1.5 text-xs font-bold text-slate-700 transition cursor-pointer"
        >
          <BookOpen className="h-3.5 w-3.5 text-blue-600" />
          <span>إدارة الكتب </span>
        </button>
  {/* زر الحظر / فك الحظر */}
        {isBanned ? (
          <button
            type="button"
            disabled={loading}
            onClick={handleToggleBan}
            className="inline-flex items-center gap-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 border border-teal-200 px-3 py-1.5 text-xs font-black text-teal-700 transition cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" />
            )}
            <span>فك الحظر</span>
          </button>
        ) : (
          <button
            type="button"
            disabled={loading}
            onClick={() => setShowBanModal(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-1.5 text-xs font-black text-amber-800 transition cursor-pointer disabled:opacity-50"
          >
            <Ban className="h-3.5 w-3.5" />
            <span>حظر</span>
          </button>
        )}
        
        {/* 🗑️ زر حذف الحساب نهائياً */}
        <button
          type="button"
          onClick={() => setShowDeleteUserModal(true)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3 py-1.5 text-xs font-black text-rose-700 transition cursor-pointer"
          title="حذف الحساب نهائياً من قاعدة البيانات"
        >
          <UserX className="h-3.5 w-3.5" />
          <span>حذف الحساب</span>
        </button>
      </div>

      {modals}
    </div>
  );
}