"use client";

import { useState } from "react";
import PendingSubmitButton from "@/components/PendingSubmitButton";
import { createReview } from "@/app/actions/reviews";

export default function ReviewForm({
  swapId,
  tab,
}: {
  swapId: string;
  tab: "incoming" | "outgoing";
}) {
  const [rating, setRating] = useState(0);

  return (
    <form
      action={createReview}
      dir="rtl"
      className="mt-4 space-y-3 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4"
    >
      <input type="hidden" name="swapId" value={swapId} />
      <input type="hidden" name="tab" value={tab} />
      <input type="hidden" name="rating" value={rating} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-extrabold text-[#334155]">
          قيّم تجربتك مع هذا المستخدم
        </span>

        <div
          className="flex items-center gap-1"
          dir="rtl"
          role="group"
          aria-label="التقييم من نجمة إلى خمس نجوم"
        >
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              aria-label={`${value} من 5 نجوم`}
              aria-pressed={rating === value}
              onClick={() => setRating(value)}
              className={`cursor-pointer rounded-md px-0.5 text-2xl sm:text-3xl leading-none transition ${
                value <= rating
                  ? "text-[#E8B042]"
                  : "text-slate-300 hover:text-[#E8B042]"
              }`}
            >
              ★
            </button>
          ))}
        </div>
      </div>

      <label className="block text-xs font-bold text-[#334155]">
        <textarea
          name="comment"
          rows={2}
          maxLength={300}
          placeholder="شارك تجربتك..."
          className="mt-1.5 w-full resize-y rounded-xl border border-[#CBD5E1] bg-white px-3.5 py-3 text-sm font-normal"
        />
      </label>

      <PendingSubmitButton
        pendingText="جارٍ إرسال التقييم..."
        disabled={rating === 0}
        className="rounded-xl bg-[#1E293B] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#334155]"
      >
        إرسال التقييم
      </PendingSubmitButton>
    </form>
  );
}