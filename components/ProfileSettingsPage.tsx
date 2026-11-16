import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";

export default function ProfileSettingsPage({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <main dir="rtl" className="mx-auto w-full max-w-2xl space-y-5 px-4 py-8 text-[#0F172A]">
      <header className="relative flex items-center justify-center">
        <Link
          href="/profile"
          aria-label="رجوع"
          className="absolute right-0 inline-flex items-center justify-center text-[#0F172A] transition hover:text-[#000000]"
        >
          <ArrowRight className="h-5 w-5" />
        </Link>
        <h1 className="text-center text-xl font-extrabold tracking-tight text-[#0F172A] sm:text-2xl">
          {title}
        </h1>
      </header>

      <section className="rounded-3xl border border-[#E2E8F0] bg-white p-5 shadow-sm sm:p-6">
        {children}
      </section>
    </main>
  );
}