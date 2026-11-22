"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import type { Map as LeafletMap } from "leaflet";
import {
  MapPin,
  X,
  Search,
  Crosshair,
  Loader2,
} from "lucide-react";
import "leaflet/dist/leaflet.css";

interface LocationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: { lat: number; lng: number; label: string }) => Promise<void>;
}

const DEFAULT_CENTER: [number, number] = [24.7136, 46.6753];

export default function LocationPickerModal({
  isOpen,
  onClose,
  onConfirm,
}: LocationPickerModalProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<LeafletMap | null>(null);

  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({
    lat: DEFAULT_CENTER[0],
    lng: DEFAULT_CENTER[1],
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // منع تمرير الصفحة الخلفية أثناء فتح النافذة
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !mounted || !mapContainerRef.current) return;

    let isMounted = true;

    const initMap = async () => {
      const L = (await import("leaflet")).default;
      if (!isMounted || !mapContainerRef.current || mapInstanceRef.current) return;

      const map = L.map(mapContainerRef.current, {
        center: DEFAULT_CENTER,
        zoom: 14,
        zoomControl: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap",
        maxZoom: 19,
      }).addTo(map);

      map.on("moveend", () => {
        const center = map.getCenter();
        setCoords({
          lat: Number(center.lat.toFixed(6)),
          lng: Number(center.lng.toFixed(6)),
        });
      });

      mapInstanceRef.current = map;

      setTimeout(() => {
        map.invalidateSize();
      }, 250);
    };

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isOpen, mounted]);

  if (!isOpen || !mounted) return null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q || searching) return;

    setError(null);
    setSearching(true);

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1&accept-language=ar`
      );
      const results = await res.json();

      if (Array.isArray(results) && results.length > 0) {
        const lat = parseFloat(results[0].lat);
        const lng = parseFloat(results[0].lon);
        setCoords({ lat, lng });
        mapInstanceRef.current?.flyTo([lat, lng], 16, { duration: 1.2 });
      } else {
        setError("لم يتم العثور على هذا المكان، جرب اسماً آخر أو حرّك الخريطة يدوياً.");
      }
    } catch {
      setError("تعذر البحث حالياً، يمكنك تحريك الخريطة وتحديد الموقع يدوياً.");
    } finally {
      setSearching(false);
    }
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      setError("متصفحك لا يدعم تحديد الموقع الجغرافي.");
      return;
    }

    setError(null);
    setLocating(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ lat: latitude, lng: longitude });
        mapInstanceRef.current?.flyTo([latitude, longitude], 16, { duration: 1.2 });
        setLocating(false);
      },
      () => {
        setLocating(false);
        setError("تعذر الوصول لموقعك الحالي، تأكد من تفعيل صلاحية الموقع.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleConfirm = async () => {
    if (sending) return;
    setSending(true);
    setError(null);

    try {
      await onConfirm({
        lat: coords.lat,
        lng: coords.lng,
        label: note.trim() || searchQuery.trim() || "موقع مقترح للتسليم",
      });
      setNote("");
      setSearchQuery("");
      onClose();
    } catch {
      setError("تعذر إرسال الموقع، حاول مرة أخرى.");
    } finally {
      setSending(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 p-3 backdrop-blur-xs"
      dir="rtl"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* الرأس */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-3">
          <div>
            <h3 className="text-sm font-black text-slate-900">تحديد موقع التسليم</h3>
            
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* شريط البحث */}
        <form onSubmit={handleSearch} className="flex shrink-0 gap-2 border-b border-slate-100 p-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن حي، شارع، أو مكتبة..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pr-9 pl-3 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-hidden"
            />
          </div>
          <button
            type="submit"
            disabled={searching || !searchQuery.trim()}
            className="rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white hover:bg-slate-800 transition disabled:opacity-40 cursor-pointer"
          >
            {searching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "بحث"}
          </button>
        </form>

        {/* منطقة الخريطة المرنة */}
        <div className="relative min-h-[220px] flex-1 w-full bg-slate-100">
          <div ref={mapContainerRef} className="h-full w-full min-h-[220px] z-0" />

          {/* الدبوس الثابت في المنتصف */}
          <div className="pointer-events-none absolute left-1/2 top-1/2 z-[400] -translate-x-1/2 -translate-y-full">
            <div className="flex flex-col items-center">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-600 text-white shadow-lg ring-4 ring-white">
                <MapPin className="h-5 w-5" />
              </div>
              <div className="h-2.5 w-0.5 bg-teal-700" />
              <div className="h-1.5 w-3 rounded-full bg-slate-900/25 blur-[1px]" />
            </div>
          </div>

          {/* زر تحديد موقعي الحالي */}
          <button
            type="button"
            onClick={handleLocateMe}
            disabled={locating}
            title="الانتقال إلى موقعي الحالي"
            className="absolute bottom-3 left-3 z-[400] flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-teal-700 shadow-md hover:bg-teal-50 transition cursor-pointer"
          >
            {locating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Crosshair className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* الملاحظة والأزرار */}
        <div className="shrink-0 space-y-2.5 border-t border-slate-100 bg-white p-3.5">
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="وصف مختصر للمكان (اختياري) مثلاً: أمام مكتبة جرير"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-hidden"
          />

          {error && (
            <p className="rounded-lg bg-rose-50 border border-rose-200 px-2.5 py-1.5 text-[11px] font-bold text-rose-600">
              {error}
            </p>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={sending}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-teal-600 py-2.5 text-xs font-black text-white hover:bg-teal-700 transition disabled:opacity-40 cursor-pointer"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <span>إرسال الموقع</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            >
              إلغاء
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
