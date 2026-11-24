"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Save, X } from "lucide-react";
import PendingSubmitButton from "@/components/PendingSubmitButton";
import { compressImageFile } from "@/lib/client-image";

type BookFormValues = {
  id: string;
  title: string;
  author: string;
  category: string;
  condition: string | null;
  points: number;
  description: string | null;
  coverUrl: string | null;
};

const categories = [
  ["NOVELS", "روايات"],
  ["HISTORY", "تاريخ"],
  ["SELF_DEVELOPMENT", "تطوير الذات"],
  ["PHILOSOPHY", "فلسفة وعلم نفس"],
  ["SCIENCE", "علوم ومعارف"],
  ["RELIGION", "علوم دينية"],
  ["POETRY", "شعر وأدب"],
  ["ARTS", "فنون وعمارة"],
  ["OTHER", "أخرى"],
];

export default function EditBookForm({
  book,
  action,
  error,
}: {
  book: BookFormValues;
  action: (formData: FormData) => Promise<void>;
  error?: string;
}) {
  const router = useRouter();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageError, setImageError] = useState("");
  const [isCompressing, setIsCompressing] = useState(false);

  function handleCancel() {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.replace(`/books/${book.id}`);
    }
  }

  async function previewImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const input = event.currentTarget;
    if (file.size > 15 * 1024 * 1024) {
      setImageError("حجم الصورة الأصلية كبير جداً؛ اختر صورة أقل من 15 ميغابايت.");
      input.value = "";
      return;
    }
    setIsCompressing(true);
    setImageError("");
    try {
      const compressed = await compressImageFile(file, {
        maxBytes: 500 * 1024,
        maxDimension: 1400,
      });
      const files = new DataTransfer();
      files.items.add(compressed);
      input.files = files.files;
      setImagePreview(URL.createObjectURL(compressed));
    } catch (error) {
      setImageError(error instanceof Error ? error.message : "تعذر ضغط الصورة.");
      input.value = "";
      setImagePreview(null);
    } finally {
      setIsCompressing(false);
    }
  }

  return (
    <form
      action={action}
      className="space-y-4 rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm sm:p-6"
    >
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700"
        >
          {error}
        </p>
      )}
      <label className="block text-xs font-bold">
        عنوان الكتاب
        <input
          name="title"
          required
          defaultValue={book.title}
          className="mt-1.5 w-full rounded-xl border border-[#CBD5E1] px-3.5 py-2.5 text-sm"
        />
      </label>
      <label className="block text-xs font-bold">
        اسم الكاتب (اختياري)
        <input
          name="author"
          defaultValue={book.author}
          className="mt-1.5 w-full rounded-xl border border-[#CBD5E1] px-3.5 py-2.5 text-sm"
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-xs font-bold">
          التصنيف
          <select
            name="category"
            defaultValue={book.category}
            className="mt-1.5 w-full rounded-xl border border-[#CBD5E1] bg-white px-3.5 py-2.5 text-sm"
          >
            {categories.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-bold">
          حالة الكتاب
          <select
            name="condition"
            defaultValue={book.condition ?? "GOOD"}
            className="mt-1.5 w-full rounded-xl border border-[#CBD5E1] bg-white px-3.5 py-2.5 text-sm"
          >
            <option value="LIKE_NEW">شبه جديد</option>
            <option value="GOOD">جيد</option>
            <option value="ACCEPTABLE">مقبول</option>
          </select>
        </label>
      </div>
      <label className="block text-xs font-bold">
        قيمة الكتاب بالنقاط
        <input
          name="points"
          type="number"
          min={1}
          max={3}
          required
          defaultValue={book.points}
          className="mt-1.5 w-full rounded-xl border border-[#CBD5E1] px-3.5 py-2.5 text-sm"
        />
      </label>
      <label className="block text-xs font-bold">
        وصف الكتاب (اختياري)
        <textarea
          name="description"
          rows={4}
          defaultValue={book.description ?? ""}
          className="mt-1.5 w-full resize-y rounded-xl border border-[#CBD5E1] px-3.5 py-2.5 text-sm"
        />
      </label>

      <div>
        <p className="mb-2 text-xs font-bold">صورة الغلاف</p>

        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-4 text-center">
          {imagePreview || book.coverUrl ? (
            <Image
              src={imagePreview ?? book.coverUrl ?? ""}
              alt="غلاف الكتاب"
              width={144}
              height={192}
              unoptimized
              className="h-48 w-36 rounded-xl border border-[#E2E8F0] object-cover shadow-sm"
            />
          ) : (
            <p className="text-xs text-[#64748B]">لا توجد صورة حالية.</p>
          )}

          <input
            type="file"
            id="cover-upload"
            name="bookImage"
            accept="image/*"
            onChange={previewImage}
            className="hidden"
          />
          {imageError && (
            <p role="alert" className="text-xs font-bold text-rose-600">
              {imageError}
            </p>
          )}

          <label
            htmlFor="cover-upload"
            className="cursor-pointer inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-95"
          >
            <span>تغيير صورة الغلاف</span>
          </label>

          <p className="text-[11px] text-slate-400">
            تُصغّر الأبعاد إلى 1400 بكسل وتُضغط تلقائياً حتى 500 كيلوبايت
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <PendingSubmitButton
          disabled={isCompressing}
          pendingText="جارٍ حفظ التعديلات..."
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#1E293B] px-5 py-3 text-sm font-extrabold text-white transition hover:bg-[#334155]"
        >
          <Save className="h-4 w-4 text-[#E8B042]" /> حفظ التعديلات
        </PendingSubmitButton>

        <button
          type="button"
          onClick={handleCancel}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#CBD5E1] bg-white px-5 py-3 text-sm font-bold text-[#334155] transition hover:bg-slate-50 active:scale-95"
        >
          <X className="h-4 w-4 text-[#64748B]" /> إلغاء
        </button>
      </div>
    </form>
  );
}