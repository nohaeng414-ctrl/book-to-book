"use client";

import { useState, useEffect, useRef } from "react";
import { Send, Loader2, MapPin, ExternalLink } from "lucide-react";
import {
  sendSwapMessageAction,
  getSwapMessagesAction,
} from "@/app/actions/swapWorkflow";

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

// استخراج رابط الخريطة إذا كانت الرسالة تحتوي على موقع جغرافي
function extractMapUrl(text: string): string | null {
  const match = text.match(/https:\/\/www\.google\.com\/maps\?q=[-0-9.,]+/);
  return match ? match[0] : null;
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
  const [sending, setSending] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const isInitialMount = useRef(true);

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

  // تمرير صندوق المحادثة الداخلي فقط دون سحب الصفحة الرئيسية للأسفل
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

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text || sending || locating) return;

    setLocationError(null);
    setInputText("");
    setSending(true);

    const res = await sendSwapMessageAction(swapId, text);
    setSending(false);

    if (res?.success && res.message) {
      setMessages((prev) => [...prev, res.message as ChatMessage]);
    } else {
      setInputText(text);
    }
  };

  const handleShareLocation = () => {
    if (sending || locating) return;
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError("متصفحك لا يدعم ميزة تحديد الموقع.");
      return;
    }

    setLocating(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const mapUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
        const locationMessage = `📍 موقع الاستلام والتسليم:\n${mapUrl}`;

        const res = await sendSwapMessageAction(swapId, locationMessage);
        setLocating(false);

        if (res?.success && res.message) {
          setMessages((prev) => [...prev, res.message as ChatMessage]);
        } else {
          setLocationError("تعذر إرسال الموقع، حاول مرة أخرى.");
        }
      },
      (error) => {
        setLocating(false);
        if (error.code === error.PERMISSION_DENIED) {
          setLocationError("يرجى السماح للمتصفح بالوصول إلى موقعك الجغرافي.");
        } else {
          setLocationError("تعذر تحديد موقعك الحالي، تأكد من تفعيل خدمة الموقع.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div
      className="flex flex-col h-[360px] rounded-xl bg-slate-50 border border-slate-200/80 p-3"
      dir="rtl"
    >
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto space-y-2.5 px-1 py-1"
      >
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center text-xs text-slate-400">
            ابدأ المحادثة للتنسيق حول موعد ومكان التسليم...
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === currentUserId;
            const mapUrl = extractMapUrl(msg.content);

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
                  {mapUrl ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 font-bold">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span>موقع مقترح للتسليم</span>
                      </div>
                      <a
                        href={mapUrl}
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

      {locationError && (
        <p className="mt-1.5 rounded-lg bg-rose-50 border border-rose-200 px-2.5 py-1.5 text-[11px] font-bold text-rose-600">
          {locationError}
        </p>
      )}

      <form
        onSubmit={handleSend}
        className="mt-2 flex items-center gap-2 pt-2 border-t border-slate-200"
      >
        <button
          type="button"
          onClick={handleShareLocation}
          disabled={sending || locating}
          title="إرسال موقعي الحالي"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-teal-600 hover:bg-teal-50 hover:border-teal-200 transition disabled:opacity-40 cursor-pointer shrink-0"
        >
          {locating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MapPin className="h-4 w-4" />
          )}
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
          disabled={sending || locating || !inputText.trim()}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-600 text-white hover:bg-teal-700 transition disabled:opacity-40 cursor-pointer shrink-0"
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4 rtl:rotate-180" />
          )}
        </button>
      </form>
    </div>
  );
}