"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  BookOpen,
  Coins,
  FileText,
  ImagePlus,
  Layers,
  Save,
  Sparkles,
  UserPen,
  X,
} from "lucide-react";
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

  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

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
      setImageError(
        "حجم الصورة الأصلية كبير جداً؛ اختر صورة أقل من 15 ميغابايت."
      );
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

      setImagePreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(compressed);
      });
    } catch (err) {
      setImageError(err instanceof Error ? err.message : "تعذر ضغط الصورة.");
      input.value = "";
      setImagePreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    } finally {
      setIsCompressing(false);
    }
  }

  return (
    <form
      dir="rtl"
      action={action}
      className="space-y-5 rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xs text-right"
    >
      {error && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-700"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-4">
        <div className="space-y-1.5">
          <label
            htmlFor="book-title"
            className="flex items-center gap-1.5 text-xs font-black text-slate-700"
          >
            <BookOpen className="h-3.5 w-3.5 text-slate-400" />
            <span>عنوان الكتاب</span>
          </label>
          <input
            id="book-title"
            name="title"
            required
            defaultValue={book.title}
            className="w-full rounded-2xl border border-slate-200/90 bg-slate-50/50 px-4 py-3 text-sm font-bold text-slate-900 transition focus:border-teal-500 focus:bg-white focus:outline-hidden"
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="book-author"
            className="flex items-center gap-1.5 text-xs font-black text-slate-700"
          >
            <UserPen className="h-3.5 w-3.5 text-slate-400" />
            <span>اسم الكاتب (اختياري)</span>
          </label>
          <input
            id="book-author"
            name="author"
            defaultValue={book.author}
            className="w-full rounded-2xl border border-slate-200/90 bg-slate-50/50 px-4 py-3 text-sm font-bold text-slate-900 transition focus:border-teal-500 focus:bg-white focus:outline-hidden"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label
              htmlFor="book-category"
              className="flex items-center gap-1.5 text-xs font-black text-slate-700"
            >
              <Layers className="h-3.5 w-3.5 text-slate-400" />
              <span>التصنيف</span>
            </label>
            <select
              id="book-category"
              name="category"
              defaultValue={book.category}
              className="w-full rounded-2xl border border-slate-200/90 bg-slate-50/50 px-4 py-3 text-sm font-bold text-slate-900 transition focus:border-teal-500 focus:bg-white focus:outline-hidden"
            >
              {categories.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="book-condition"
              className="flex items-center gap-1.5 text-xs font-black text-slate-700"
            >
              <Sparkles className="h-3.5 w-3.5 text-slate-400" />
              <span>حالة الكتاب</span>
            </label>
            <select
              id="book-condition"
              name="condition"
              defaultValue={book.condition ?? "GOOD"}
              className="w-full rounded-2xl border border-slate-200/90 bg-slate-50/50 px-4 py-3 text-sm font-bold text-slate-900 transition focus:border-teal-500 focus:bg-white focus:outline-hidden"
            >
              <option value="LIKE_NEW">شبه جديد</option>
              <option value="GOOD">جيد</option>
              <option value="ACCEPTABLE">مقبول</option>
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="book-points"
            className="flex items-center gap-1.5 text-xs font-black text-slate-700"
          >
            <Coins className="h-3.5 w-3.5 text-slate-400" />
            <span>قيمة الكتاب بالنقاط</span>
          </label>
          <input
            id="book-points"
            name="points"
            type="number"
            min={1}
            max={3}
            required
            defaultValue={book.points}
            className="w-full rounded-2xl border border-slate-200/90 bg-slate-50/50 px-4 py-3 text-sm font-bold text-slate-900 transition focus:border-teal-500 focus:bg-white focus:outline-hidden"
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="book-description"
            className="flex items-center gap-1.5 text-xs font-black text-slate-700"
          >
            <FileText className="h-3.5 w-3.5 text-slate-400" />
            <span>وصف الكتاب (اختياري)</span>
          </label>
          <textarea
            id="book-description"
            name="description"
            rows={4}
            defaultValue={book.description ?? ""}
            className="w-full resize-y rounded-2xl border border-slate-200/90 bg-slate-50/50 px-4 py-3 text-sm font-medium text-slate-900 transition focus:border-teal-500 focus:bg-white focus:outline-hidden"
          />
        </div>
      </div>

      <div className="space-y-2">
        <p className="flex items-center gap-1.5 text-xs font-black text-slate-700">
          <ImagePlus className="h-3.5 w-3.5 text-slate-400" />
          <span>صورة الغلاف</span>
        </p>

        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-4 text-center">
          {imagePreview || book.coverUrl ? (
            <Image
              src={imagePreview ?? book.coverUrl ?? ""}
              alt="غلاف الكتاب"
              width={144}
              height={192}
              unoptimized
              className="h-48 w-36 rounded-2xl border border-slate-200 object-cover shadow-2xs"
            />
          ) : (
            <p className="text-xs font-medium text-slate-500">
              لا توجد صورة حالية.
            </p>
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
            <p
              role="alert"
              className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700"
            >
              {imageError}
            </p>
          )}

          <label
            htmlFor="cover-upload"
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-2xs transition hover:bg-slate-50 active:scale-[0.99]"
          >
            <span>تغيير صورة الغلاف</span>
          </label>

          <p className="text-[11px] leading-relaxed text-slate-500">
            تُصغّر الأبعاد إلى 1400 بكسل وتُضغط تلقائياً حتى 500 كيلوبايت
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 border-t border-slate-100 pt-4">
        <PendingSubmitButton
          disabled={isCompressing}
          pendingText="جارٍ حفظ التعديلات..."
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs font-black text-white transition hover:bg-slate-800 active:scale-[0.99] disabled:opacity-60 cursor-pointer"
        >
          <Save className="h-4 w-4 text-amber-400 shrink-0" />
          <span>حفظ التعديلات</span>
        </PendingSubmitButton>

        <button
          type="button"
          onClick={handleCancel}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50 active:scale-[0.99] cursor-pointer"
        >
          <X className="h-4 w-4 text-slate-500 shrink-0" />
          <span>إلغاء</span>
        </button>
      </div>
    </form>
  );
}