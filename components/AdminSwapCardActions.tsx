"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MoreVertical, Ban, ExternalLink, Loader2, X, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { adminCancelSwapAction } from "@/app/actions/admin-swaps";

interface Props {
  swapId: string;
  status: string;
}

export default function AdminSwapCardActions({ swapId, status }: Props) {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  
  const [menuOpen, setMenuOpen] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const isActive = ["PENDING", "ACCEPTED", "AWAITING_DELIVERY", "AWAITING_CONFIRMATION", "DISPUTED"].includes(status);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCancelSwap = async () => {
    setLoading(true);
    try {
      await adminCancelSwapAction(swapId);
      setShowCancelModal(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setMenuOpen((prev) => !prev)}
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition shadow-2xs cursor-pointer"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {menuOpen && (
        <div className="absolute left-0 top-11 z-30 w-48 overflow-hidden rounded-2xl border border-slate-200/90 bg-white py-1.5 shadow-xl text-right text-xs font-bold text-slate-700">
          <Link
            href={`/swaps/${swapId}`}
            target="_blank"
            className="flex w-full items-center gap-2.5 px-3.5 py-2.5 hover:bg-slate-50 transition"
          >
            <ExternalLink className="h-4 w-4 text-slate-400" />
            <span>عرض تفاصيل الطلب</span>
          </Link>

          {isActive && (
            <>
              <div className="my-1 border-t border-slate-100" />
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  setShowCancelModal(true);
                }}
                className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-rose-600 hover:bg-rose-50/60 transition cursor-pointer"
              >
                <Ban className="h-4 w-4" />
                <span>إلغاء الطلب إدارياً</span>
              </button>
            </>
          )}
        </div>
      )}

      {/* نافذة تأكيد الإلغاء الإداري */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs text-right">
          <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl space-y-4 border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-rose-600">
                <ShieldAlert className="h-5 w-5" />
                <h3 className="text-sm font-black text-slate-900">إلغاء إداري للطلب</h3>
              </div>
              <button onClick={() => setShowCancelModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs leading-relaxed text-slate-600">
              هل أنتِ متأكدة من الإلغاء؟ سيتم فك الحجز عن الكتب المشمولة بهذا الطلب، وسيتم إرجاع النقاط تلقائياً في حال كان التبادل بالنقاط.
            </p>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                disabled={loading}
                onClick={handleCancelSwap}
                className="flex-1 rounded-xl bg-rose-600 hover:bg-rose-700 py-2.5 text-xs font-black text-white transition disabled:opacity-50 cursor-pointer"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "نعم، ألغِ الطلب فوراً"}
              </button>
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="rounded-xl bg-slate-100 hover:bg-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 cursor-pointer"
              >
                تراجع
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}