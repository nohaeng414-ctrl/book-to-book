"use client";

import { useState } from "react";
import { Globe, MapPin, Building2, Navigation } from "lucide-react";
import PendingSubmitButton from "@/components/PendingSubmitButton";
import { COUNTRIES_WITH_CITIES, COUNTRY_LIST } from "@/lib/locations";
const OTHER_CITY = "__OTHER__";

interface LocationLanguageFormProps {
  action: (formData: FormData) => Promise<void>;
  initialLanguage: string;
  initialCountry: string;
  initialCity: string;
  initialNeighborhood: string;
}

export default function LocationLanguageForm({
  action,
  initialLanguage,
  initialCountry,
  initialCity,
  initialNeighborhood,
}: LocationLanguageFormProps) {
  const isKnownCountry = Boolean(
    initialCountry && COUNTRIES_WITH_CITIES[initialCountry]
  );

  const [selectedCountry, setSelectedCountry] = useState(
    isKnownCountry ? initialCountry : ""
  );

  const availableCities = selectedCountry
    ? COUNTRIES_WITH_CITIES[selectedCountry] ?? []
    : [];

  const isKnownCity = availableCities.includes(initialCity);

  const [selectedCityOption, setSelectedCityOption] = useState(() => {
    if (!initialCity) return "";
    return isKnownCity ? initialCity : OTHER_CITY;
  });

  const [customCity, setCustomCity] = useState(
    !isKnownCity && initialCity ? initialCity : ""
  );

  const handleCountryChange = (newCountry: string) => {
    setSelectedCountry(newCountry);
    setSelectedCityOption("");
    setCustomCity("");
  };

  const finalCityValue =
    selectedCityOption === OTHER_CITY ? customCity : selectedCityOption;

  return (
    <form action={action} noValidate className="space-y-4">
      {/* اللغة */}
      <div className="space-y-1.5">
        <label
          htmlFor="language"
          className="flex items-center gap-1.5 text-xs font-black text-slate-700"
        >
          <Globe className="h-3.5 w-3.5 text-slate-400" />
          لغة التطبيق
        </label>
        <select
          id="language"
          name="language"
          defaultValue={initialLanguage || "ar"}
          className="w-full rounded-2xl border border-slate-200/80 bg-slate-50/50 px-4 py-3 text-sm font-bold text-slate-900 transition focus:border-teal-500 focus:bg-white focus:outline-hidden"
        >
          <option value="ar">العربية</option>
          <option value="en">English</option>
        </select>
      </div>

      {/* الدولة */}
      <div className="space-y-1.5">
        <label
          htmlFor="country"
          className="flex items-center gap-1.5 text-xs font-black text-slate-700"
        >
          <MapPin className="h-3.5 w-3.5 text-slate-400" />
          الدولة
        </label>
        <select
          id="country"
          name="country"
          required
          value={selectedCountry}
          onChange={(e) => handleCountryChange(e.target.value)}
          className="w-full rounded-2xl border border-slate-200/80 bg-slate-50/50 px-4 py-3 text-sm font-bold text-slate-900 transition focus:border-teal-500 focus:bg-white focus:outline-hidden"
        >
          <option value="" disabled>
            اختر الدولة...
          </option>
          {COUNTRY_LIST.map((country) => (
            <option key={country} value={country}>
              {country}
            </option>
          ))}
        </select>
      </div>

      {/* المدينة */}
      <div className="space-y-1.5">
        <label
          htmlFor="citySelect"
          className="flex items-center gap-1.5 text-xs font-black text-slate-700"
        >
          <Building2 className="h-3.5 w-3.5 text-slate-400" />
          المدينة
        </label>
        <select
          id="citySelect"
          required
          disabled={!selectedCountry}
          value={selectedCityOption}
          onChange={(e) => setSelectedCityOption(e.target.value)}
          className="w-full rounded-2xl border border-slate-200/80 bg-slate-50/50 px-4 py-3 text-sm font-bold text-slate-900 transition focus:border-teal-500 focus:bg-white focus:outline-hidden disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="" disabled>
            {selectedCountry ? "اختر المدينة..." : "اختر الدولة أولاً..."}
          </option>
          {availableCities.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
          {selectedCountry && <option value={OTHER_CITY}>مدينة أخرى...</option>}
        </select>

        {/* حقل يظهر فقط إذا اختار المستخدم "مدينة أخرى" */}
        {selectedCityOption === OTHER_CITY && (
          <input
            type="text"
            required
            value={customCity}
            onChange={(e) => setCustomCity(e.target.value)}
            placeholder="اكتب اسم مدينتك..."
            className="mt-2 w-full rounded-2xl border border-slate-200/80 bg-slate-50/50 px-4 py-3 text-sm font-bold text-slate-900 transition focus:border-teal-500 focus:bg-white focus:outline-hidden"
          />
        )}

        {/* حقل مخفي يرسل قيمة المدينة النهائية للخادم */}
        <input type="hidden" name="city" value={finalCityValue} />
      </div>

      {/* الحي */}
      <div className="space-y-1.5">
        <label
          htmlFor="neighborhood"
          className="flex items-center gap-1.5 text-xs font-black text-slate-700"
        >
          <Navigation className="h-3.5 w-3.5 text-slate-400" />
          الحي
        </label>
        <input
          id="neighborhood"
          type="text"
          name="neighborhood"
          defaultValue={initialNeighborhood}
          placeholder="(اختياري)"
          className="w-full rounded-2xl border border-slate-200/80 bg-slate-50/50 px-4 py-3 text-sm font-bold text-slate-900 transition focus:border-teal-500 focus:bg-white focus:outline-hidden"
        />
      </div>

      <div className="pt-2">
        <PendingSubmitButton
          pendingText="جارٍ حفظ التعديلات..."
          className="w-full rounded-2xl bg-slate-900 px-5 py-3.5 text-sm font-black text-white transition hover:bg-slate-800 active:scale-98"
        >
          حفظ التعديلات
        </PendingSubmitButton>
      </div>
    </form>
  );
}