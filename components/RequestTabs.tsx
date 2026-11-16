"use client";

import { useState, type ReactNode } from "react";

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
  const [activeTab, setActiveTab] = useState(initialTab);

  return (
    <div>
      <div role="tablist" aria-label="أقسام الطلبات" className="grid grid-cols-2 gap-2 rounded-2xl bg-[#F1F5F9] p-1.5">
        <button
          type="button"
          role="tab"
          id="incoming-tab"
          aria-selected={activeTab === "incoming"}
          aria-controls="request-panel"
          onClick={() => setActiveTab("incoming")}
          className={`rounded-xl px-3 py-3 text-center text-sm font-extrabold transition ${activeTab === "incoming" ? "bg-white text-[#0F172A] shadow-sm" : "text-[#64748B] hover:text-[#0F172A]"}`}
        >
          الطلبات الواردة <span className="mr-1 text-xs">({incomingCount})</span>
        </button>
        <button
          type="button"
          role="tab"
          id="outgoing-tab"
          aria-selected={activeTab === "outgoing"}
          aria-controls="request-panel"
          onClick={() => setActiveTab("outgoing")}
          className={`rounded-xl px-3 py-3 text-center text-sm font-extrabold transition ${activeTab === "outgoing" ? "bg-white text-[#0F172A] shadow-sm" : "text-[#64748B] hover:text-[#0F172A]"}`}
        >
       طلباتي <span className="mr-1 text-xs">({outgoingCount})</span>
        </button>
      </div>
      <section
        role="tabpanel"
        id="request-panel"
        aria-labelledby={activeTab === "incoming" ? "incoming-tab" : "outgoing-tab"}
        className="mt-4 space-y-3"
      >
        {activeTab === "incoming" ? incoming : outgoing}
      </section>
    </div>
  );
}
