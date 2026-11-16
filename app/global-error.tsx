"use client";

import { useEffect } from "react";
import ConnectionErrorView from "@/components/ConnectionErrorView";
import "./globals.css";

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="ar" dir="rtl">
      <body className="bg-[#F1F5F9] text-[#0F172A] antialiased">
        <ConnectionErrorView onRetry={() => window.location.reload()} />
      </body>
    </html>
  );
}
