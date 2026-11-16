"use client";

import { useState } from "react";
import Link from "next/link";
import { Users, Compass, BookOpen } from "lucide-react";
import BookCover from "@/components/BookCover";
import UserAvatar from "@/components/UserAvatar";
import { toArabicNumerals } from "@/lib/formatting";

interface BookItem {
  id: string;
  title: string;
  author: string | null;
  points: number;
  updatedAt: Date;
  owner: {
    id: string;
    name: string | null;
    city: string | null;
  };
}

interface HomeBookFeedProps {
  allBooks: BookItem[];
  followedBooks: BookItem[];
  isLoggedIn: boolean;
}

export default function HomeBookFeed({
  allBooks,
  followedBooks,
  isLoggedIn,
}: HomeBookFeedProps) {
  const [activeTab, setActiveTab] = useState<"all" | "following">("all");

  const currentBooks = activeTab === "all" ? allBooks : followedBooks;

  return (
    <section className="space-y-4">
      {/* 🧭 شريط التبويبات القياسي */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("all")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition-all ${
            activeTab === "all"
              ? "bg-slate-900 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Compass className="h-4 w-4" />
          <span>استكشف الجميع</span>
          <span className="rounded-md bg-white/20 px-1.5 py-0.2 text-[11px]">
            {toArabicNumerals(allBooks.length)}
          </span>
        </button>

        {isLoggedIn && (
          <button
            type="button"
            onClick={() => setActiveTab("following")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition-all ${
              activeTab === "following"
                ? "bg-teal-700 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Users className="h-4 w-4" />
            <span>من أتابعهم</span>
            <span
              className={`rounded-md px-1.5 py-0.2 text-[11px] ${
                activeTab === "following" ? "bg-white/20" : "bg-teal-50 text-teal-800"
              }`}
            >
              {toArabicNumerals(followedBooks.length)}
            </span>
          </button>
        )}
      </div>

      {/* 📚 شبكة عرض الكتب */}
      {currentBooks.length > 0 ? (
        <div className="grid gap-3.5 sm:grid-cols-2">
          {currentBooks.map((book) => (
            <Link
              key={book.id}
              href={`/books/${book.id}`}
              className="group flex gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
            >
              <BookCover
                bookId={book.id}
                title={book.title}
                updatedAt={book.updatedAt}
                className="h-28 w-20 shrink-0 rounded-xl"
              />

              <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
                <div>
                  <h3 className="line-clamp-2 text-sm font-black text-slate-900 leading-snug group-hover:text-teal-700 transition-colors">
                    {book.title}
                  </h3>
                  <p className="mt-1 truncate text-xs text-slate-500">
                    {book.author || "غير محدد"}
                  </p>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <UserAvatar userId={book.owner.id} name={book.owner.name} size="sm" />
                    <span className="truncate text-[11px] font-bold text-slate-700">
                      {book.owner.name || "قارئ"}
                    </span>
                  </div>

                  <span className="shrink-0 rounded-lg bg-teal-50 border border-teal-200/60 px-2 py-0.5 text-[11px] font-bold text-teal-800">
                    {toArabicNumerals(book.points)} {book.points === 1 ? "نقطة" : "نقاط"}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center space-y-2">
          <BookOpen className="mx-auto h-8 w-8 text-slate-400" />
          <p className="text-xs sm:text-sm font-bold text-slate-700">
            {activeTab === "following"
              ? "لم يضف القراء الذين تتابعهم أي كتب متاحة للتبادل حالياً."
              : "لا توجد كتب متاحة حالياً."}
          </p>
          {activeTab === "following" && (
            <p className="text-xs text-slate-400">
              تابع المزيد من القراء في منطقتك لتظهر كتبهم هنا تلقائياً!
            </p>
          )}
        </div>
      )}
    </section>
  );
}
