"use client";

import { useState, useEffect, type ReactNode } from "react";

export default function RequestTabs({
  initialTab,
  incomingCount,
  outgoingCount,
  incoming,
  outgoing,
}: {
  initialTab: "incoming" | "outgoing";
  incomingCount: number;
  outgoingCount: number;
  incoming: ReactNode;
  outgoing: ReactNode;
}) {
  const [activeTab, setActiveTab] = useState<"incoming" | "outgoing">(
    initialTab
  );

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const handleTabChange = (tab: "incoming" | "outgoing") => {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    window.history.replaceState(null, "", url.toString());
  };

  return (
    <div dir="rtl">
      <div
        role="tablist"
        aria-label="أقسام الطلبات"
        className="grid grid-cols-2 gap-2 rounded-2xl bg-[#F1F5F9] p-1.5"
      >
        <button
          type="button"
          role="tab"
          id="incoming-tab"
          aria-selected={activeTab === "incoming"}
          aria-controls="request-panel"
          onClick={() => handleTabChange("incoming")}
          className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-3 text-center text-sm font-extrabold transition cursor-pointer ${
            activeTab === "incoming"
              ? "bg-white text-[#0F172A] shadow-sm"
              : "text-[#64748B] hover:text-[#0F172A]"
          }`}
        >
          <span>الطلبات الواردة</span>
          <span className="text-xs">({incomingCount})</span>
        </button>

        <button
          type="button"
          role="tab"
          id="outgoing-tab"
          aria-selected={activeTab === "outgoing"}
          aria-controls="request-panel"
          onClick={() => handleTabChange("outgoing")}
          className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-3 text-center text-sm font-extrabold transition cursor-pointer ${
            activeTab === "outgoing"
              ? "bg-white text-[#0F172A] shadow-sm"
              : "text-[#64748B] hover:text-[#0F172A]"
          }`}
        >
          <span>طلباتي</span>
          <span className="text-xs">({outgoingCount})</span>
        </button>
      </div>

      <section
        key={activeTab}
        role="tabpanel"
        id="request-panel"
        aria-labelledby={
          activeTab === "incoming" ? "incoming-tab" : "outgoing-tab"
        }
        className="mt-4 space-y-3"
      >
        {activeTab === "incoming" ? incoming : outgoing}
      </section>
    </div>
  );
}