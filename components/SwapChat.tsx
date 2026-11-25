"use client";

import { useState, useEffect, useRef } from "react";
import { Send, Loader2, MapPin, ExternalLink, ImagePlus, X } from "lucide-react";
import {
  sendSwapMessageAction,
  getSwapMessagesAction,
} from "@/app/actions/swapWorkflow";
import LocationPickerModal from "@/components/LocationPickerModal";

interface ChatMessage {
  id: string;
  content: string;
  senderId: string;
  createdAt: Date | string;
  sender: {
    id: string;
    name: string;
  };
}

const IMAGE_PREFIX = "__BOOK_IMG__:";

function extractMapData(text: string): { url: string; label: string } | null {
  const match = text.match(/https:\/\/www\.google\.com\/maps\?q=[-0-9.,]+/);
  if (!match) return null;

  const url = match[0];
  const label = text
    .replace(url, "")
    .replace(/📍/g, "")
    .trim();

  return {
    url,
    label: label || "موقع التسليم",
  };
}

function extractImageSrc(text: string): string | null {
  if (!text.startsWith(IMAGE_PREFIX)) return null;
  const src = text.slice(IMAGE_PREFIX.length).trim();
  if (src.startsWith("https://") || src.startsWith("/")) {
    return src;
  }
  return null;
}

async function compressImageToBlob(
  file: File,
  maxWidth = 800,
  quality = 0.65
): Promise<Blob> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });

  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      const scale = img.width > maxWidth ? maxWidth / img.width : 1;
      const width = Math.round(img.width * scale);
      const height = Math.round(img.height * scale);

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas context unavailable"));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Failed to compress image"));
            return;
          }
          resolve(blob);
        },
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = dataUrl;
  });
}

async function uploadSwapImage(blob: Blob): Promise<string> {
  const formData = new FormData();
  formData.append("file", blob, `swap-${Date.now()}.jpg`);

  const res = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });

  const data = await res.json().catch(() => null);
  const url = data?.url || data?.fileUrl || data?.path;

  if (!res.ok || !url || typeof url !== "string") {
    throw new Error(data?.error || "تعذر رفع صورة الكتاب إلى الخادم.");
  }

  return url;
}

export default function SwapChat({
  swapId,
  currentUserId,
  initialMessages = [],
}: {
  swapId: string;
  currentUserId: string;
  initialMessages?: ChatMessage[];
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [inputText, setInputText] = useState("");
  const [pendingBlob, setPendingBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState("");
  const [sending, setSending] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isInitialMount = useRef(true);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    const fetchMessages = async () => {
      const list = await getSwapMessagesAction(swapId);
      if (Array.isArray(list)) {
        setMessages(list as ChatMessage[]);
      }
    };

    const interval = setInterval(fetchMessages, 4000);
    return () => clearInterval(interval);
  }, [swapId]);

  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;

    if (isInitialMount.current) {
      container.scrollTop = container.scrollHeight;
      isInitialMount.current = false;
    } else {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages.length]);

  const clearPendingImage = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPendingBlob(null);
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageError("");
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setImageError("يرجى اختيار ملف صورة صالح.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setImageError("حجم الصورة كبير، يرجى اختيار صورة أقل من 5MB.");
      return;
    }

    try {
      const compressed = await compressImageToBlob(file, 800, 0.65);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPendingBlob(compressed);
      setPreviewUrl(URL.createObjectURL(compressed));
    } catch {
      setImageError("تعذر تجهيز الصورة، حاول مرة أخرى.");
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputText.trim();
    if ((!text && !pendingBlob) || sending) return;

    setImageError("");
    setSending(true);

    try {
      let sentAny = false;

      if (pendingBlob) {
        const uploadedUrl = await uploadSwapImage(pendingBlob);
        const imgPayload = `${IMAGE_PREFIX}${uploadedUrl}`;
        const imgRes = await sendSwapMessageAction(swapId, imgPayload);

        if (imgRes?.success && imgRes.message) {
          setMessages((prev) => [...prev, imgRes.message as ChatMessage]);
          clearPendingImage();
          sentAny = true;
        } else {
          setImageError(
            (imgRes as { error?: string } | null)?.error ||
              "تعذر إرسال صورة الكتاب، حاول مرة أخرى."
          );
          setSending(false);
          return;
        }
      }

      if (text) {
        setInputText("");
        const txtRes = await sendSwapMessageAction(swapId, text);
        if (txtRes?.success && txtRes.message) {
          setMessages((prev) => [...prev, txtRes.message as ChatMessage]);
          sentAny = true;
        } else {
          setInputText(text);
          if (!sentAny) {
            setImageError(
              (txtRes as { error?: string } | null)?.error ||
                "تعذر إرسال الرسالة، حاول مرة أخرى."
            );
            setSending(false);
            return;
          }
        }
      }
    } catch (err) {
      setImageError(
        err instanceof Error
          ? err.message
          : "حدث خطأ أثناء رفع أو إرسال صورة الكتاب."
      );
    } finally {
      setSending(false);
    }
  };

  const handleConfirmLocation = async ({
    lat,
    lng,
    label,
  }: {
    lat: number;
    lng: number;
    label: string;
  }) => {
    const mapUrl = `https://www.google.com/maps?q=${lat},${lng}`;
    const locationMessage = `📍 ${label}\n${mapUrl}`;

    const res = await sendSwapMessageAction(swapId, locationMessage);
    if (res?.success && res.message) {
      setMessages((prev) => [...prev, res.message as ChatMessage]);
    } else {
      throw new Error("Failed to send location");
    }
  };

  return (
    <div
      className="flex flex-col h-[380px] rounded-xl bg-slate-50 border border-slate-200/80 p-3"
      dir="rtl"
    >
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto space-y-2.5 px-1 py-1"
      >
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center text-xs text-slate-400">
            ابدأ المحادثة للتنسيق حول موعد ومكان التسليم أو معاينة الكتاب...
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === currentUserId;
            const mapData = extractMapData(msg.content);
            const imageSrc = extractImageSrc(msg.content);

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? "items-start" : "items-end"}`}
              >
                <span className="text-[10px] text-slate-400 mb-0.5 px-1 font-semibold">
                  {isMe ? "أنت" : msg.sender.name}
                </span>
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed break-words shadow-2xs ${
                    isMe
                      ? "bg-teal-600 text-white rounded-br-xs"
                      : "bg-white text-slate-800 border border-slate-200 rounded-bl-xs"
                  }`}
                >
                  {imageSrc ? (
                    <a
                      href={imageSrc}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block overflow-hidden rounded-xl"
                    >
                      <img
                        src={imageSrc}
                        alt="صورة إضافية للكتاب"
                        className="max-h-48 w-full object-cover rounded-xl"
                      />
                    </a>
                  ) : mapData ? (
                    <div className="space-y-1.5">
                      <div className="flex items-start gap-1.5 font-bold">
                        <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                        <span>{mapData.label}</span>
                      </div>
                      <a
                        href={mapData.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-black transition ${
                          isMe
                            ? "bg-white/20 text-white hover:bg-white/30"
                            : "bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100"
                        }`}
                      >
                        <span>فتح الموقع على الخريطة</span>
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {imageError && (
        <p className="mt-1.5 text-[11px] font-bold text-red-600 px-1">
          {imageError}
        </p>
      )}

      {previewUrl && (
        <div className="mt-2 flex items-center justify-between gap-2 rounded-xl border border-teal-200 bg-teal-50/70 px-2.5 py-1.5">
          <div className="flex items-center gap-2">
            <img
              src={previewUrl}
              alt="معاينة صورة الكتاب"
              className="h-11 w-11 rounded-lg object-cover border border-teal-200"
            />
            <span className="text-[11px] font-bold text-teal-800">
              صورة كتاب جاهزة للإرسال
            </span>
          </div>
          <button
            type="button"
            onClick={clearPendingImage}
            aria-label="إزالة الصورة المحددة"
            className="rounded-lg p-1 text-slate-500 hover:bg-white hover:text-red-600 transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <form
        onSubmit={handleSend}
        className="mt-2 flex items-center gap-2 pt-2 border-t border-slate-200"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageSelect}
          className="hidden"
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={sending}
          title="إرفاق صورة إضافية للكتاب"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-teal-600 hover:bg-teal-50 hover:border-teal-200 transition disabled:opacity-40 cursor-pointer shrink-0"
        >
          <ImagePlus className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => setIsMapOpen(true)}
          disabled={sending}
          title="تحديد موقع التسليم على الخريطة"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-teal-600 hover:bg-teal-50 hover:border-teal-200 transition disabled:opacity-40 cursor-pointer shrink-0"
        >
          <MapPin className="h-4 w-4" />
        </button>

        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="اكتب رسالة..."
          className="flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-hidden"
        />

        <button
          type="submit"
          disabled={sending || (!inputText.trim() && !pendingBlob)}
          aria-label="إرسال"
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-600 text-white hover:bg-teal-700 transition disabled:opacity-40 cursor-pointer shrink-0"
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </form>

      <LocationPickerModal
        isOpen={isMapOpen}
        onClose={() => setIsMapOpen(false)}
        onConfirm={handleConfirmLocation}
      />
    </div>
  );
}