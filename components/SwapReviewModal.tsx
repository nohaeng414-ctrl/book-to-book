"use client";

import { useState } from "react";
import { Star, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface ExistingReview {
  rating: number;
  comment?: string | null;
}

export default function SwapReviewModal({
  swapId,
  recipientId,
  recipientName,
  hasReviewed,
  existingReview = null,
}: {
  swapId: string;
  recipientId: string;
  recipientName: string;
  hasReviewed?: boolean;
  existingReview?: ExistingReview | null;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [rating, setRating] = useState(existingReview?.rating ?? 5);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState(existingReview?.comment ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [savedReview, setSavedReview] = useState<ExistingReview | null>(
    existingReview || (hasReviewed ? { rating: 5, comment: "" } : null)
  );

  // عرض التقييم المسجل مباشرة (النجوم من اليمين لليسار + التعليق)
  if (savedReview) {
    return (
      <div className="rounded-2xl border border-amber-200/80 bg-amber-50/40 p-3.5 shadow-2xs space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-slate-800">
            تقييمك لـ {recipientName}
          </span>
          <div className="flex items-center gap-0.5" dir="rtl">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`h-4 w-4 ${
                  star <= savedReview.rating
                    ? "fill-amber-400 text-amber-400"
                    : "text-slate-300"
                }`}
              />
            ))}
          </div>
        </div>
        {savedReview.comment && (
          <p className="text-xs leading-relaxed text-slate-600 pt-1 border-t border-amber-200/50">
            {savedReview.comment}
          </p>
        )}
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          swapId,
          recipientId,
          rating,
          comment: comment.trim(),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "تعذر حفظ التقييم حالياً.");
      }

      setSavedReview({ rating, comment: comment.trim() });
      setIsOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ غير متوقع.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-amber-300 bg-amber-50 py-3 text-xs font-black text-amber-900 transition hover:bg-amber-100 cursor-pointer"
      >
        <Star className="h-4 w-4 fill-amber-400 text-amber-500" />
        <span>قيّم تجربتك مع {recipientName}</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div
            dir="rtl"
            className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-5 shadow-xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900">
                تقييم {recipientName}
              </h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                إغلاق
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* النجوم من اليمين (1) إلى اليسار (5) بدون نص "اختر عدد النجوم" */}
              <div className="flex justify-center py-2">
                <div className="flex items-center gap-1.5" dir="rtl">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoveredRating(star)}
                      onMouseLeave={() => setHoveredRating(0)}
                      aria-label={`${star} نجوم`}
                      className="p-1 transition hover:scale-110 cursor-pointer"
                    >
                      <Star
                        className={`h-7 w-7 ${
                          star <= (hoveredRating || rating)
                            ? "fill-amber-400 text-amber-400"
                            : "text-slate-300"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <textarea
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="اكتب تعليقك حول تجربة التبادل (اختياري)..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-hidden"
                />
              </div>

              {error && (
                <p className="rounded-xl bg-red-50 p-2.5 text-xs font-bold text-red-600">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 py-2.5 text-xs font-black text-white transition hover:bg-teal-700 disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "إرسال التقييم"
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}