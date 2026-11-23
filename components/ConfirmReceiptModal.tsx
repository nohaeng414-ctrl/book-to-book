"use client";

import { useState } from "react";
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
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [deliveryMethod, setDeliveryMethod] = useState<"IN_PERSON" | "COURIER">(
    "IN_PERSON"
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // في طلب النقاط: صاحب الكتاب (isReceiver) يقوم بالتسليم، بينما طالب الكتاب يقوم بالاستلام.
  // في تبادل كتاب بكتاب: كلا الطرفين يؤكدان الاستلام.
  const isDeliveryRole = swapType === "POINTS" && isReceiver;

  const buttonLabel = isDeliveryRole
    ? "تأكيد تسليم الكتاب"
    : "تأكيد استلام الكتاب";

  const modalTitle = isDeliveryRole
    ? "تأكيد تسليم الكتاب"
    : "إثبات استلام الكتاب";

  const handleOpen = () => {
    setError(null);
    setImagePreview(null);
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

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);

    const shouldSendProof =
      !isDeliveryRole || deliveryMethod === "COURIER";

    const res = await confirmReceiptWithProofAction({
      swapId,
      proofUrl: shouldSendProof ? imagePreview || undefined : undefined,
    });

    setLoading(false);

    if (res?.error) {
      setError(res.error);
    } else {
      setIsOpen(false);
      router.refresh();
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-teal-600 px-4 py-3.5 text-xs sm:text-sm font-black text-white shadow-sm transition hover:bg-teal-700 active:scale-98 cursor-pointer"
      >
        <CheckCircle2 className="h-4.5 w-4.5 shrink-0" />
        <span>{buttonLabel}</span>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
          dir="rtl"
        >
          <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl border border-slate-100 text-right space-y-4">
            {/* رأس النافذة */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900">
                {modalTitle}
              </h3>
              <button
                type="button"
                disabled={loading}
                onClick={handleClose}
                className="rounded-full bg-slate-100 p-1.5 text-slate-500 hover:bg-slate-200 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {error && (
              <div className="flex items-center gap-1.5 rounded-xl bg-rose-50 border border-rose-200 p-2.5 text-xs font-bold text-rose-600">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {isDeliveryRole ? (
              /* واجهة صاحب الكتاب في طلب النقاط: اختيار طريقة التسليم */
              <div className="space-y-3">
                <p className="text-xs leading-relaxed text-slate-500">
                  اختر طريقة تسليم الكتاب؛ عند التأكيد ستبدأ مهلة ٤٨ ساعة
                  للمستلم لتأكيد الاستلام قبل إتمام الطلب تلقائياً.
                </p>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDeliveryMethod("IN_PERSON");
                      setImagePreview(null);
                    }}
                    className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-right transition cursor-pointer ${
                      deliveryMethod === "IN_PERSON"
                        ? "border-teal-600 bg-teal-50/70 text-teal-950 ring-2 ring-teal-600/15"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    <Handshake className="h-4 w-4 text-teal-600" />
                    <span className="text-xs font-black">تسليم مباشر</span>
                    <span className="text-[10px] text-slate-500">
                      وجهاً لوجه بالاتفاق
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeliveryMethod("COURIER")}
                    className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-right transition cursor-pointer ${
                      deliveryMethod === "COURIER"
                        ? "border-teal-600 bg-teal-50/70 text-teal-950 ring-2 ring-teal-600/15"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    <Truck className="h-4 w-4 text-teal-600" />
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
                  <label className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-4 hover:bg-slate-50 transition cursor-pointer">
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
                        <Camera className="h-7 w-7 mb-1.5 text-teal-600" />
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
              /* واجهة المستلم (في طلب النقاط أو تبادل كتاب بكتاب): تصوير الكتاب المستلم */
              <div className="space-y-3">
                <p className="text-xs leading-relaxed text-slate-500">
                  يرجى التقاط صورة للكتاب الذي استلمته كإثبات رسمي لضمان حقك
                  وحل أي شكوى مستقبلية.
                </p>

                <label className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-4 hover:bg-slate-50 transition cursor-pointer">
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
                      <Camera className="h-8 w-8 mb-1.5 text-teal-600" />
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

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                disabled={loading}
                onClick={handleConfirm}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-teal-600 py-3 text-xs font-black text-white hover:bg-teal-700 transition disabled:opacity-50 cursor-pointer"
              >
                {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>تأكيد الآن</span>
              </button>
             
            </div>
          </div>
        </div>
      )}
    </>
  );
}
