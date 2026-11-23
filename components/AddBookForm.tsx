"use client";

import { useState } from "react";
import Image from "next/image";
import { BookPlus, Camera, X } from "lucide-react";
import PendingSubmitButton from "@/components/PendingSubmitButton";
import { compressImageFile } from "@/lib/client-image";


export default function AddBookForm({ action, error }: { action: (formData: FormData) => void; error?: string }) {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageError, setImageError] = useState("");
  const [isCompressing, setIsCompressing] = useState(false);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const input = e.currentTarget;
    if (file.size > 15 * 1024 * 1024) {
      setImageError("حجم الصورة الأصلية كبير جداً؛ اختر صورة أقل من 15 ميغابايت.");
      input.value = "";
      return;
    }
    setIsCompressing(true);
    setImageError("");
    try {
      const compressed = await compressImageFile(file, { maxBytes: 500 * 1024, maxDimension: 1400 });
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
  };

  return (

  <div className="w-full rounded-2xl border border-[#E2E8F0] bg-white p-5 sm:p-6 shadow-xs">
        <form action={action} className="space-y-4">
          {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
          
          {/* عنوان الكتاب */}
          <div>
            <label className="block text-xs font-bold text-[#0F172A] mb-1.5">عنوان الكتاب *</label>
            <input
              type="text"
              name="title"
              required
              placeholder="عنوان الكتاب..."
              className="w-full rounded-xl border border-[#CBD5E1] bg-white px-3.5 py-2.5 text-xs font-medium text-[#0F172A] placeholder-[#94A3B8] shadow-2xs focus:border-[#1E293B] focus:outline-none transition"
            />
          </div>

          {/* اسم الكاتب */}
          <div>
            <label className="block text-xs font-bold text-[#0F172A] mb-1.5">اسم الكاتب (اختياري)</label>
            <input
              type="text"
              name="author"
              placeholder="اسم المؤلف..."
              className="w-full rounded-xl border border-[#CBD5E1] bg-white px-3.5 py-2.5 text-xs font-medium text-[#0F172A] placeholder-[#94A3B8] shadow-2xs focus:border-[#1E293B] focus:outline-none transition"
            />
          </div>

          <div>
            <label htmlFor="book-description" className="mb-1.5 block text-xs font-bold text-[#0F172A]">وصف الكتاب (اختياري)</label>
            <textarea
              id="book-description"
              name="description"
              rows={4}
              maxLength={2000}
              placeholder="اكتب نبذة قصيرة عن الكتاب أو حالته..."
              className="w-full resize-y rounded-xl border border-[#CBD5E1] bg-white px-3.5 py-2.5 text-xs font-medium text-[#0F172A] placeholder-[#94A3B8] shadow-2xs transition focus:border-[#1E293B] focus:outline-none"
            />
          </div>

          {/* الفئة والتصنيف */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#0F172A] mb-1.5">التصنيف / الفئة *</label>
              <select
                name="category"
                required
                className="w-full rounded-xl border border-[#CBD5E1] bg-white px-3.5 py-2.5 text-xs font-medium text-[#0F172A] shadow-2xs focus:border-[#1E293B] focus:outline-none transition"
              >
                <option value="NOVELS">روايات</option>
                <option value="HISTORY">تاريخ</option>
                <option value="SELF_DEVELOPMENT">تطوير الذات</option>
                <option value="PHILOSOPHY">فلسفة وعلم نفس</option>
                <option value="SCIENCE">علوم ومعارف</option>
                <option value="RELIGION">علوم دينية</option>
                <option value="POETRY">شعر وأدب</option>
                <option value="ARTS">فنون وعمارة</option>
                <option value="OTHER">أخرى</option>
              </select>
            </div>

            {/* حالة الكتاب */}
            <div>
              <label className="block text-xs font-bold text-[#0F172A] mb-1.5">حالة الكتاب *</label>
              <select
                name="condition"
                required
                className="w-full rounded-xl border border-[#CBD5E1] bg-white px-3.5 py-2.5 text-xs font-medium text-[#0F172A] shadow-2xs focus:border-[#1E293B] focus:outline-none transition"
              >
                <option value="LIKE_NEW">شبه جديد</option>
                <option value="GOOD">جيد</option>
                <option value="ACCEPTABLE">مقبول</option>
              </select>
            </div>
          </div>

          {/* عدد النقاط المقدرة */}
          <div>
            <label className="block text-xs font-bold text-[#0F172A] mb-1.5">النقاط المقدرة للاستبدال</label>
            <input
              type="number"
              name="points"
              defaultValue={1}
              min={1}
              max={3}
              className="w-full rounded-xl border border-[#CBD5E1] bg-white px-3.5 py-2.5 text-xs font-medium text-[#0F172A] shadow-2xs focus:border-[#1E293B] focus:outline-none transition"
            />
          </div>

         

        {/* الكاميرا ومعاينة الصورة */}
        <div>
          <label className="block text-xs font-bold text-[#0F172A] mb-1.5 text-center w-full">صورة الكتاب *</label>
          <input
            type="file"
            id="book-image-upload"
            name="bookImage"
            accept="image/*"
            capture="environment"
            required
            onChange={handleImageChange}
            className="sr-only"
          />
          {imagePreview ? (
            <div className="relative w-36 h-48 mx-auto rounded-2xl overflow-hidden border-2 border-[#1E293B] shadow-md bg-slate-100">
              <Image src={imagePreview} alt="معاينة الكتاب" width={144} height={192} unoptimized className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => {
                  URL.revokeObjectURL(imagePreview);
                  setImagePreview(null);
                  const input = document.querySelector<HTMLInputElement>('input[name="bookImage"]');
                  if (input) input.value = "";
                }}
                className="absolute top-2 left-2 grid h-7 w-7 place-items-center rounded-full bg-red-600 text-white shadow-md transition hover:bg-red-700"
                aria-label="حذف الصورة"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <label htmlFor="book-image-upload" className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#CBD5E1] bg-slate-50 py-6 px-4 text-center cursor-pointer transition hover:border-[#1E293B] hover:bg-slate-100 group">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-[#1E293B] text-white shadow-md mb-2 group-hover:scale-105 transition-transform">
                <Camera className="h-5 w-5" />
              </span>
              <span className="text-xs font-bold text-slate-700">التقط صورة للكتاب</span>
              <span className="text-[10px] text-slate-400 mt-0.5">ضماناً لمصداقية حالة الكتاب </span>
              
            </label>
          )}
          {imageError && <p role="alert" className="mt-2 text-center text-xs font-bold text-rose-600">{imageError}</p>}
          <p className="mt-2 text-center text-[10px] text-slate-400">تُصغّر الأبعاد إلى 1400 بكسل وتُضغط تلقائياً حتى 500 كيلوبايت</p>
        </div>

        {/* زر الإضافة */}
        <div className="pt-4">
          <PendingSubmitButton
            pendingText="جارٍ إضافة الكتاب..."
            disabled={isCompressing}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1E293B] to-[#334155] py-3 text-xs font-bold text-white transition hover:from-[#0F172A] hover:to-[#1E293B] active:scale-98 shadow-md"
          >
            <BookPlus className="h-4 w-4 text-[#E8B042]" />
            إضافة الكتاب
          </PendingSubmitButton>
        </div>

      </form>
    </div>
  );
}
