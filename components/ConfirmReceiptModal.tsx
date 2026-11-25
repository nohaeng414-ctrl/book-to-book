"use client";

import { useEffect, useId, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import {
  Camera,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Handshake,
  Truck,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { confirmReceiptWithProofAction } from "@/app/actions/swapWorkflow";

const subscribeToHydration = () => () => {};
const getHydratedSnapshot = () => true;
const getServerSnapshot = () => false;

const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
const MAX_DIMENSION = 1280;

async function compressImageBeforeUpload(file: File): Promise<File> {
  if (file.size <= MAX_UPLOAD_BYTES && file.type === "image/jpeg") {
    return file;
  }

  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(
      1,
      MAX_DIMENSION / bitmap.width,
      MAX_DIMENSION / bitmap.height
    );
    const targetWidth = Math.max(1, Math.round(bitmap.width * scale));
    const targetHeight = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);

    let quality = 0.8;
    let blob: Blob | null = null;

    while (quality >= 0.45) {
      blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", quality)
      );
      if (blob && blob.size <= MAX_UPLOAD_BYTES) {
        break;
      }
      quality -= 0.1;
    }

    if (!blob) return file;

    const baseName = file.name.replace(/\.[^/.]+$/, "") || "proof";
    return new File([blob], `${baseName}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } finally {
    bitmap.close();
  }
}

export default function ConfirmReceiptModal({
  swapId,
  isReceiver,
  swapType = "DIRECT",
}: {
  swapId: string;
  isReceiver: boolean;
  swapType?: "DIRECT" | "POINTS";
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [deliveryMethod, setDeliveryMethod] = useState<"IN_PERSON" | "COURIER">(
    "IN_PERSON"
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dialogId = useId();
  const mounted = useSyncExternalStore(
    subscribeToHydration,
    getHydratedSnapshot,
    getServerSnapshot
  );

  // في طلب النقاط: صاحب الكتاب (isReceiver) يقوم بالتسليم، بينما طالب الكتاب يقوم بالاستلام.
  // في تبادل كتاب بكتاب: كلا الطرفين يؤكدان الاستلام.
  const isDeliveryRole = swapType === "POINTS" && isReceiver;

  const buttonLabel = isDeliveryRole
    ? "تأكيد تسليم الكتاب"
    : "تأكيد استلام الكتاب";

  const modalTitle = isDeliveryRole
    ? "تأكيد تسليم الكتاب"
    : "إثبات استلام الكتاب";

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !loading) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, loading]);

  useEffect(() => {
    return () => {
      if (imagePreview?.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const clearSelectedImage = () => {
    if (imagePreview?.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }
    setSelectedFile(null);
    setImagePreview(null);
  };

  const handleOpen = () => {
    setError(null);
    clearSelectedImage();
    setDeliveryMethod("IN_PERSON");
    setIsOpen(true);
  };

  const handleClose = () => {
    if (loading) return;
    setIsOpen(false);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    if (imagePreview?.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }
    setSelectedFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);

    try {
      const shouldSendProof = !isDeliveryRole || deliveryMethod === "COURIER";
      let uploadedProofUrl: string | undefined = undefined;

      if (shouldSendProof && selectedFile) {
        const fileToUpload = await compressImageBeforeUpload(selectedFile);

        if (fileToUpload.size > MAX_UPLOAD_BYTES) {
          setError("حجم الصورة بعد الضغط أكبر من المسموح.");
          setLoading(false);
          return;
        }

        const formData = new FormData();
        formData.append("file", fileToUpload);

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
          cache: "no-store",
        });

        const uploadData = await uploadRes.json().catch(() => null);
        if (!uploadRes.ok || !uploadData?.url) {
          setError(uploadData?.error || "تعذر رفع صورة الكتاب إلى الخادم.");
          setLoading(false);
          return;
        }

        uploadedProofUrl = uploadData.url as string;
      }

      const res = await confirmReceiptWithProofAction({
        swapId,
        proofUrl: uploadedProofUrl,
      });

      if (res?.error) {
        setError(res.error);
        setLoading(false);
        return;
      }

      setLoading(false);
      setIsOpen(false);
      clearSelectedImage();
      router.refresh();
    } catch {
      setError("حدث خطأ غير متوقع أثناء تأكيد العملية.");
      setLoading(false);
    }
  };

  const modalContent = isOpen ? (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-3 sm:p-4 backdrop-blur-xs"
      onClick={handleClose}
    >
      <section
        dir="rtl"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${dialogId}-title`}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85dvh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl text-right"
      >
        {/* رأس النافذة */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 p-4">
          <h2
            id={`${dialogId}-title`}
            className="text-sm font-black text-slate-900"
          >
            {modalTitle}
          </h2>
      
        </div>

        {/* محتوى النافذة */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {error && (
            <div className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs font-bold text-rose-600">
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          {isDeliveryRole ? (
            <div className="space-y-3">
              <p className="text-xs leading-relaxed text-slate-600">
                اختر طريقة تسليم الكتاب؛ عند التأكيد ستبدأ مهلة ٤٨ ساعة
                للمستلم لتأكيد الاستلام قبل إتمام الطلب تلقائياً.
              </p>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setDeliveryMethod("IN_PERSON");
                    clearSelectedImage();
                  }}
                  className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-right transition cursor-pointer ${
                    deliveryMethod === "IN_PERSON"
                      ? "border-teal-600 bg-teal-50/70 text-teal-950 ring-2 ring-teal-600/15"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <Handshake
                    className="h-4 w-4 text-teal-600"
                    aria-hidden="true"
                  />
                  <span className="text-xs font-black">تسليم مباشر</span>
                  <span className="text-[10px] text-slate-500">
                    وجهاً لوجه بالاتفاق
                  </span>
                </button>

                <button
                  type="button"
                  disabled={loading}
                  onClick={() => setDeliveryMethod("COURIER")}
                  className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-right transition cursor-pointer ${
                    deliveryMethod === "COURIER"
                      ? "border-teal-600 bg-teal-50/70 text-teal-950 ring-2 ring-teal-600/15"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <Truck className="h-4 w-4 text-teal-600" aria-hidden="true" />
                  <span className="text-xs font-black">مندوب أو شحن</span>
                  <span className="text-[10px] text-slate-500">
                    إرفاق إيصال التوصيل
                  </span>
                </button>
              </div>

              {deliveryMethod === "IN_PERSON" ? (
                <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-600">
                  يُعتمد اتفاق الموعد ومكان اللقاء المسجّل في محادثة الطلب
                  كمرجع أساسي عند الحاجة.
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-4 transition hover:bg-slate-50 cursor-pointer">
                  {imagePreview ? (
                    <Image
                      src={imagePreview}
                      alt="معاينة إيصال الشحن"
                      width={600}
                      height={400}
                      unoptimized
                      className="max-h-40 rounded-xl object-contain shadow-xs"
                    />
                  ) : (
                    <div className="flex flex-col items-center text-slate-400">
                      <Camera
                        className="mb-1.5 h-7 w-7 text-teal-600"
                        aria-hidden="true"
                      />
                      <span className="text-xs font-bold text-slate-700">
                        إرفاق صورة إيصال الشحن أو المندوب
                      </span>
                      <span className="text-[10px] text-slate-400">
                        اختياري · PNG أو JPG
                      </span>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleImageChange}
                  />
                </label>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs leading-relaxed text-slate-600">
                يرجى التقاط صورة للكتاب الذي استلمته كإثبات رسمي لضمان حقك
                وحل أي شكوى مستقبلية.
              </p>

              <label className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-4 transition hover:bg-slate-50 cursor-pointer">
                {imagePreview ? (
                  <Image
                    src={imagePreview}
                    alt="معاينة الكتاب المستلم"
                    width={600}
                    height={400}
                    unoptimized
                    className="max-h-44 rounded-xl object-contain shadow-xs"
                  />
                ) : (
                  <div className="flex flex-col items-center text-slate-400">
                    <Camera
                      className="mb-1.5 h-8 w-8 text-teal-600"
                      aria-hidden="true"
                    />
                    <span className="text-xs font-bold text-slate-700">
                      اضغط لالتقاط صورة الكتاب المستلَم
                    </span>
                    <span className="text-[10px] text-slate-400">
                      PNG أو JPG بوضوح
                    </span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleImageChange}
                />
              </label>
            </div>
          )}
        </div>

        {/* أزرار الفوتر */}
        <div className="grid shrink-0 grid-cols-2 gap-2 border-t border-slate-100 bg-slate-50/60 px-4 py-3">
          <button
            type="button"
            disabled={loading}
            onClick={handleConfirm}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2.5 text-xs font-black text-white transition hover:bg-teal-700 active:scale-[0.99] disabled:opacity-50 cursor-pointer"
          >
            {loading && (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            )}
            <span>{loading ? "جارٍ التأكيد..." : "تأكيد الآن"}</span>
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={handleClose}
            className="flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 active:scale-[0.99] disabled:opacity-50 cursor-pointer"
          >
            إلغاء
          </button>
        </div>
      </section>
    </div>
  ) : null;

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-teal-600 px-4 py-3.5 text-xs sm:text-sm font-black text-white shadow-sm transition hover:bg-teal-700 active:scale-98 cursor-pointer"
      >
        <CheckCircle2 className="h-4.5 w-4.5 shrink-0" aria-hidden="true" />
        <span>{buttonLabel}</span>
      </button>

      {mounted && modalContent ? createPortal(modalContent, document.body) : null}
    </>
  );
}