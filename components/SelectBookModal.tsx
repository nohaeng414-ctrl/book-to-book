"use client";

import { useState } from "react";
import {
  BookOpen,
  Check,
  Search,
  X,
  Loader2,
  RefreshCw,
  CheckCircle2,
  Coins,
  AlertCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  acceptSwapWithOfferFromModalAction,
  updateSwapStatusAction,
} from "@/app/actions/swapWorkflow";
import { toArabicNumerals } from "@/lib/formatting";

interface CandidateBook {
  id: string;
  title: string;
  author: string | null;
  points: number;
  condition: string | null;
}

const CONDITION_LABELS: Record<string, string> = {
  LIKE_NEW: "شبه جديد",
  GOOD: "جيد جداً",
  ACCEPTABLE: "مقبول",
};

function normalizeArabic(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .trim();
}

export default function SelectBookModal({
  swapId,
  candidateBooks,
  ownerName,
  requestedBookPoints,
  requesterAvailablePoints,
}: {
  swapId: string;
  candidateBooks: CandidateBook[];
  ownerName: string;
  requestedBookPoints: number;
  requesterAvailablePoints?: number;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  // الكتب المؤقتة داخل النافذة المنبثقة
  const [draftBookIds, setDraftBookIds] = useState<string[]>([]);
  // الكتب المعتمدة للعرض في الصفحة قبل القبول النهائي
  const [confirmedBookIds, setConfirmedBookIds] = useState<string[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [modalHint, setModalHint] = useState("");
  const [submittingAction, setSubmittingAction] = useState<
    "ACCEPT" | "REJECT" | null
  >(null);
  const [error, setError] = useState("");

  const confirmedBooks = candidateBooks.filter((b) =>
    confirmedBookIds.includes(b.id)
  );
  const confirmedPointsSum = confirmedBooks.reduce(
    (sum, b) => sum + b.points,
    0
  );
  const confirmedPointsDiff = Math.max(
    0,
    requestedBookPoints - confirmedPointsSum
  );

  const draftBooks = candidateBooks.filter((b) => draftBookIds.includes(b.id));
  const draftPointsSum = draftBooks.reduce((sum, b) => sum + b.points, 0);
  const draftPointsDiff = Math.max(0, requestedBookPoints - draftPointsSum);

  // التحقق من كفاية رصيد صاحب الطلب لتغطية فرق النقاط إن وُجد
  const isRequesterShortOnPoints =
    typeof requesterAvailablePoints === "number" &&
    draftPointsIdsHaveSelection(draftBookIds) &&
    draftPointsDiff > requesterAvailablePoints;

  const normalizedQuery = normalizeArabic(searchQuery);

  const filteredBooks = candidateBooks.filter((b) => {
    if (!normalizedQuery) return true;
    const titleMatch = normalizeArabic(b.title).includes(normalizedQuery);
    const authorMatch = b.author
      ? normalizeArabic(b.author).includes(normalizedQuery)
      : false;
    return titleMatch || authorMatch;
  });

  const handleOpen = () => {
    setSearchQuery("");
    setModalHint("");
    setError("");
    if (confirmedBookIds.length > 0) {
      setDraftBookIds(confirmedBookIds);
    } else {
      setDraftBookIds([]);
    }
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setSearchQuery("");
    setModalHint("");
  };

  const toggleDraftBook = (book: CandidateBook) => {
    setModalHint("");

    // إذا كان الكتاب محدداً مسبقاً -> إلغاء تحديده
    if (draftBookIds.includes(book.id)) {
      setDraftBookIds((prev) => prev.filter((id) => id !== book.id));
      return;
    }

    // إذا كانت نقاط الكتاب وحده أكبر من نقاط الكتاب المطلوب
    if (book.points > requestedBookPoints) {
      setModalHint(
        `قيمة هذا الكتاب (${toArabicNumerals(
          book.points
        )} نقاط) أعلى من قيمة كتابك المطلوب (${toArabicNumerals(
          requestedBookPoints
        )} نقاط).`
      );
      return;
    }

    // إذا كان إضافة الكتاب لا يتجاوز نقاط الكتاب المطلوب -> إضافته للقائمة
    if (draftPointsSum + book.points <= requestedBookPoints) {
      setDraftBookIds((prev) => [...prev, book.id]);
      return;
    }

    // إذا كان هناك كتاب واحد فقط محدد والكتاب الجديد يتجاوز المجموع -> استبدال الاختيار به مباشرة
    if (draftBookIds.length === 1) {
      setDraftBookIds([book.id]);
      return;
    }

    setModalHint(
      `لا يمكن أن يتجاوز مجموع الكتب المختارة ${toArabicNumerals(
        requestedBookPoints
      )} نقاط؛ ألغِ تحديد أحد الكتب أولاً.`
    );
  };

  // الخطوة 1: اعتماد الكتب المختارة وعرضها في الصفحة
  const handleConfirmBookSelection = (e: React.FormEvent) => {
    e.preventDefault();
    if (draftBookIds.length === 0 || isRequesterShortOnPoints) return;
    setConfirmedBookIds(draftBookIds);
    setError("");
    setIsOpen(false);
    setSearchQuery("");
  };

  // الخطوة 2أ: قبول الطلب بالكتب المختارة
  const handleAcceptRequest = async () => {
    if (confirmedBookIds.length === 0 || submittingAction) return;
    setSubmittingAction("ACCEPT");
    setError("");

    try {
      const result = await acceptSwapWithOfferFromModalAction(
        swapId,
        confirmedBookIds
      );

      if (result?.error) {
        setError(result.error);
        return;
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ غير متوقع.");
    } finally {
      setSubmittingAction(null);
    }
  };

  // الخطوة 2ب: رفض الطلب
  const handleRejectRequest = async () => {
    if (submittingAction) return;
    setSubmittingAction("REJECT");
    setError("");

    try {
      const result = await updateSwapStatusAction(
        swapId,
        "REJECT",
        "رفض الطلب"
      );

      if (result?.error) {
        setError(result.error);
        return;
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ غير متوقع.");
    } finally {
      setSubmittingAction(null);
    }
  };

  return (
    <div className="space-y-2.5">
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700"
        >
          {error}
        </p>
      )}

      {/* عرض بطاقة الكتب المختارة أو زر فتح مكتبة صاحب الطلب */}
      {confirmedBooks.length > 0 ? (
        <div className="rounded-2xl border-2 border-emerald-500/70 bg-emerald-50/40 p-3 space-y-2.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-black text-emerald-800">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>
                {confirmedBooks.length === 1
                  ? "الكتاب المختار للمبادلة:"
                  : `الكتب المختارة للمبادلة (${toArabicNumerals(
                      confirmedBooks.length
                    )}):`}
              </span>
            </span>

            <button
              type="button"
              onClick={handleOpen}
              disabled={submittingAction !== null}
              className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-white px-2.5 py-1 text-[11px] font-bold text-emerald-800 hover:bg-emerald-50 transition disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className="h-3 w-3" />
              <span>تغيير الاختيار</span>
            </button>
          </div>

          <div className="space-y-2">
            {confirmedBooks.map((book) => (
              <div
                key={book.id}
                className="flex items-center gap-3 rounded-xl border border-emerald-200/80 bg-white p-2.5"
              >
                <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/books/${book.id}/cover`}
                    alt={book.title}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="min-w-0 flex-1 space-y-0.5">
                  <span className="block truncate text-xs sm:text-sm font-black text-slate-900">
                    {book.title}
                  </span>
                  <span className="block truncate text-[11px] text-slate-500">
                    {book.author || "مؤلف غير محدد"}
                  </span>
                  <span className="block text-[10px] font-bold text-teal-700">
                    {toArabicNumerals(book.points)} نقاط
                    {book.condition
                      ? ` · ${
                          CONDITION_LABELS[book.condition] || book.condition
                        }`
                      : ""}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {confirmedPointsDiff > 0 && (
            <div className="flex items-center justify-between rounded-xl border border-teal-200 bg-teal-50/80 px-3 py-2 text-xs">
              <span className="font-bold text-teal-800">
                فرق النقاط (يُخصم من {ownerName}):
              </span>
              <span className="inline-flex items-center gap-1 font-black text-teal-950">
                <Coins className="h-3.5 w-3.5 text-teal-600" />+{" "}
                {toArabicNumerals(confirmedPointsDiff)} نقاط لرصيدك
              </span>
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          disabled={candidateBooks.length === 0 || submittingAction !== null}
          onClick={handleOpen}
          className="flex w-full items-center justify-between rounded-xl border border-teal-300 bg-teal-50 px-4 py-3.5 text-xs sm:text-sm font-black text-teal-900 transition hover:bg-teal-100 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
        >
          <span className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-teal-600" />
            <span>
              اختر من مكتبة {ownerName} (بما يعادل{" "}
              {toArabicNumerals(requestedBookPoints)} نقاط)
            </span>
          </span>
          <span className="rounded-full bg-teal-200/70 px-2.5 py-0.5 text-[11px] font-bold text-teal-800">
            {candidateBooks.length > 0
              ? `${toArabicNumerals(candidateBooks.length)} كتب متاحة`
              : "لا توجد كتب متاحة"}
          </span>
        </button>
      )}

      {/* زرا القبول والرفض */}
      <div className="grid grid-cols-2 gap-2 pt-0.5">
        <button
          type="button"
          onClick={handleAcceptRequest}
          disabled={confirmedBooks.length === 0 || submittingAction !== null}
          title={
            confirmedBooks.length === 0
              ? "اختر كتاباً من المكتبة أولاً لتفعيل القبول"
              : undefined
          }
          className="flex items-center justify-center rounded-xl bg-emerald-600 py-3 text-xs font-black text-white shadow-2xs transition hover:bg-emerald-700 disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer"
        >
          {submittingAction === "ACCEPT" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "قبول الطلب"
          )}
        </button>

        <button
          type="button"
          onClick={handleRejectRequest}
          disabled={submittingAction !== null}
          className="flex items-center justify-center rounded-xl bg-red-600 py-3 text-xs font-black text-white shadow-2xs transition hover:bg-red-700 disabled:opacity-50 cursor-pointer"
        >
          {submittingAction === "REJECT" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "رفض الطلب"
          )}
        </button>
      </div>

      {/* النافذة المنبثقة لاختيار الكتب */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div
            dir="rtl"
            className="flex flex-col max-h-[85vh] w-full max-w-lg rounded-3xl border border-slate-200 bg-white shadow-2xl overflow-hidden"
          >
            {/* رأس النافذة */}
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
              <div>
                <span className="block text-xs sm:text-sm font-black text-slate-900">
                  اختر من مكتبة {ownerName}
                </span>
                <span className="block text-[11px] font-semibold text-slate-500">
                  قيمة كتابك المطلوب: {toArabicNumerals(requestedBookPoints)}{" "}
                  نقاط (يمكنك اختيار كتاب أو أكثر)
                </span>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-full bg-slate-100 p-1.5 text-slate-500 hover:bg-slate-200 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* شريط حساب النقاط الفوري */}
            <div className="border-b border-slate-100 bg-slate-50 px-5 py-2.5 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700">
                  مجموع الكتب المختارة:
                </span>
                <span className="font-black text-teal-700">
                  {toArabicNumerals(draftPointsSum)} من{" "}
                  {toArabicNumerals(requestedBookPoints)} نقاط
                </span>
              </div>

              {draftBookIds.length > 0 && draftPointsDiff > 0 && (
                <div className="flex items-center justify-between rounded-lg bg-teal-50 border border-teal-200/70 px-2.5 py-1.5 text-[11px]">
                  <span className="font-bold text-teal-800">
                    فرق النقاط المتبقي:
                  </span>
                  <span className="font-black text-teal-950">
                    + {toArabicNumerals(draftPointsDiff)} نقاط تُضاف لرصيدك
                  </span>
                </div>
              )}

              {isRequesterShortOnPoints && (
                <div className="flex items-center gap-1.5 rounded-lg bg-rose-50 border border-rose-200 px-2.5 py-1.5 text-[11px] font-bold text-rose-700">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    رصيد {ownerName} المتاح (
                    {toArabicNumerals(requesterAvailablePoints ?? 0)} نقاط) لا
                    يكفي لتغطية فرق النقاط ({toArabicNumerals(draftPointsDiff)}{" "}
                    نقاط)؛ اختر كتباً إضافية.
                  </span>
                </div>
              )}

              {modalHint && (
                <p className="text-[11px] font-bold text-amber-700">
                  {modalHint}
                </p>
              )}
            </div>

            {/* محتوى النافذة */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {candidateBooks.length > 3 && (
                <div className="relative">
                  <Search className="absolute right-3.5 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="ابحث عن عنوان الكتاب أو المؤلف..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pr-10 pl-3.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-hidden"
                  />
                </div>
              )}

              <div className="space-y-3">
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {filteredBooks.map((book) => {
                    const isSelected = draftBookIds.includes(book.id);
                    const exceedsBookValue = book.points > requestedBookPoints;

                    return (
                      <div
                        key={book.id}
                        onClick={() => toggleDraftBook(book)}
                        className={`flex items-center gap-3 rounded-2xl border p-3 transition ${
                          exceedsBookValue
                            ? "border-slate-200 bg-slate-100/70 opacity-55 cursor-not-allowed"
                            : isSelected
                            ? "border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-600/20 cursor-pointer"
                            : "border-slate-200 bg-white hover:border-slate-300 cursor-pointer"
                        }`}
                      >
                        <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={`/api/books/${book.id}/cover`}
                            alt={book.title}
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                        </div>

                        <div className="min-w-0 flex-1 space-y-0.5">
                          <span className="block truncate text-xs font-black text-slate-900">
                            {book.title}
                          </span>
                          <span className="block truncate text-[11px] text-slate-500">
                            {book.author || ""}
                          </span>
                          <span className="block text-[10px] font-bold text-teal-700">
                            {toArabicNumerals(book.points)} نقاط
                            {book.condition
                              ? ` · ${
                                  CONDITION_LABELS[book.condition] ||
                                  book.condition
                                }`
                              : ""}
                          </span>
                          {exceedsBookValue && (
                            <span className="block text-[10px] font-bold text-rose-600">
                              أعلى من نقاط كتابك
                            </span>
                          )}
                        </div>

                        <div
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                            isSelected
                              ? "border-emerald-600 bg-emerald-600 text-white"
                              : "border-slate-300 bg-white text-transparent"
                          }`}
                        >
                          <Check className="h-3 w-3" />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {filteredBooks.length === 0 && (
                  <p className="py-8 text-center text-xs text-slate-400 font-medium">
                    لا توجد كتب مطابقة لبحثك.
                  </p>
                )}
              </div>
            </div>

            {/* ذيل النافذة */}
            <div className="border-t border-slate-100 bg-slate-50/50 p-4">
              <form
                onSubmit={handleConfirmBookSelection}
                className="grid grid-cols-2 gap-2"
              >
                <button
                  type="submit"
                  disabled={
                    draftBookIds.length === 0 || isRequesterShortOnPoints
                  }
                  className="flex items-center justify-center rounded-xl bg-teal-600 py-3 text-xs font-black text-white shadow-2xs transition hover:bg-teal-700 disabled:opacity-50 cursor-pointer"
                >
                  اعتماد الاختيار
                </button>

                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-xl border border-slate-300 bg-white py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  إلغاء
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function draftPointsIdsHaveSelection(ids: string[]): boolean {
  return ids.length > 0;
}
