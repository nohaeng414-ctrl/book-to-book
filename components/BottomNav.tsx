"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BookMarked, Plus, LibraryBig, User } from "lucide-react";

export default function BottomNav() {
  const pathname = usePathname();
  const hiddenOnPaths = [
    "/login",
    "/register",
    "/forgot-password",
    "/banned",
    "/connection-error",
  ];

  if (hiddenOnPaths.includes(pathname)) return null;

  const checkActive = (href: string) => {
    return href === "/" ? pathname === "/" : pathname.startsWith(href);
  };

  return (
    <nav
      aria-label="التنقل الرئيسي"
      className="shrink-0 z-50 border-t border-[#E2E8F0] bg-white/95 pb-[max(env(safe-area-inset-bottom),12px)] pt-2.5 backdrop-blur-md shadow-[0_-5px_15px_-10px_rgba(0,0,0,0.1)]"
    >
      <div className="mx-auto flex max-w-md items-center justify-between px-4">
        
        {/* 1. الرئيسية */}
        <Link
          href="/"
          className={`flex flex-col items-center gap-1.5 p-1 transition ${
            checkActive("/") ? "text-[#0F172A] font-bold" : "text-[#94A3B8] font-medium hover:text-[#64748B]"
          }`}
        >
          <Home className="h-5 w-5" strokeWidth={checkActive("/") ? 2.2 : 1.7} />
          <span className="text-[10px]">الرئيسية</span>
        </Link>

        {/* 2. الطلبات */}
        <Link
          href="/requests"
          className={`flex flex-col items-center gap-1.5 p-1 transition ${
            checkActive("/requests") ? "text-[#0F172A] font-bold" : "text-[#94A3B8] font-medium hover:text-[#64748B]"
          }`}
        >
          <BookMarked className="h-5 w-5" strokeWidth={checkActive("/requests") ? 2.2 : 1.7} />
          <span className="text-[10px]">الطلبات</span>
        </Link>

        {/* 3. زر الإضافة بالوسط */}
        <Link
          href="/add-book"
          aria-label="أضف كتاباً"
          className="-mt-8 grid h-14 w-14 place-items-center rounded-full bg-[#1E293B] text-white shadow-lg transition active:scale-95 border-4 border-white"
        >
          <Plus className="h-7 w-7" strokeWidth={2.2} />
        </Link>

        {/* 4. كتبي */}
        <Link
          href="/my-books"
          className={`flex flex-col items-center gap-1.5 p-1 transition ${
            checkActive("/my-books") ? "text-[#0F172A] font-bold" : "text-[#94A3B8] font-medium hover:text-[#64748B]"
          }`}
        >
          <LibraryBig className="h-5 w-5" strokeWidth={checkActive("/my-books") ? 2.2 : 1.7} />
          <span className="text-[10px]">كتبي</span>
        </Link>

        {/* 5. حسابي */}
        <Link
          href="/profile"
          className={`flex flex-col items-center gap-1.5 p-1 transition ${
            checkActive("/profile") ? "text-[#0F172A] font-bold" : "text-[#94A3B8] font-medium hover:text-[#64748B]"
          }`}
        >
          <User className="h-5 w-5" strokeWidth={checkActive("/profile") ? 2.2 : 1.7} />
          <span className="text-[10px]">حسابي</span>
        </Link>

      </div>
    </nav>
  );
}
