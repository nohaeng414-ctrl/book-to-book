import type { Metadata } from "next";
import "./globals.css";
import AndroidBackHandler from "@/components/AndroidBackHandler";
import BottomNav from "@/components/BottomNav";
import NetworkStatus from "@/components/NetworkStatus";
import NavigationLoading from "@/components/NavigationLoading";
import LocaleTextLayer from "@/components/LocaleTextLayer";
import { cookies } from "next/headers";
import { auth } from "@/auth";

export const metadata: Metadata = {
  title: "كتاب بكتاب | منصة تبادل الكتب",
  description: "اكتشف كتباً جديدة واستبدل كتبك القديمة بكل سهولة.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [cookieStore, session] = await Promise.all([cookies(), auth()]);
  const savedLanguage = cookieStore.get("book-language")?.value ?? (session?.user as { language?: string } | undefined)?.language;
  const language = savedLanguage === "en" ? "en" : "ar";
  return (
    <html lang={language} dir={language === "en" ? "ltr" : "rtl"}>
      <body className="bg-[#F1F5F9] text-[#0F172A] antialiased flex flex-col h-[100dvh] overflow-hidden">
        <LocaleTextLayer language={language}>
          <NetworkStatus />
          <NavigationLoading />
          <AndroidBackHandler />

          <div className="w-full flex-1 overflow-y-auto bg-[#F1F5F9] pb-8">
            {children}
          </div>

          <BottomNav />
        </LocaleTextLayer>
      </body>
    </html>
  );
}