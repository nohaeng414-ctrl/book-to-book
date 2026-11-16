"use client";

import { useEffect, useState } from "react";
import ConnectionErrorView from "@/components/ConnectionErrorView";

export default function NetworkStatus() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    // Keep development sessions free of service-worker caching; register the
    // offline shell only for production builds on supported secure origins.
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        // Offline support is an enhancement; registration failure must not
        // prevent the online app from working.
      });
    }

    const updateStatus = () => setOffline(!window.navigator.onLine);
    updateStatus();
    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", updateStatus);
    return () => {
      window.removeEventListener("online", updateStatus);
      window.removeEventListener("offline", updateStatus);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-[#F1F5F9] px-4">
      <ConnectionErrorView offline onRetry={() => window.location.reload()} />
    </div>
  );
}
