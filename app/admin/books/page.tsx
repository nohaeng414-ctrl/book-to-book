import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import BackButton from "@/components/BackButton";
import AdminBookDeleteButton from "@/components/AdminBookDeleteButton";
import {
  Search,
  X,
  BookOpen,
  User,
  Clock,
  Coins,
  ExternalLink,
} from "lucide-react";
import { toArabicNumerals } from "@/lib/formatting";
import { Prisma } from "@/generated/prisma-full";

export const dynamic = "force-dynamic";

function formatShortDate(date: Date | string): string {
  return new Intl.DateTimeFormat("ar-SA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

export default async function AdminBooksPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");
  if (!(await isAdmin())) redirect("/");

  const { q = "" } = await searchParams;
  const searchQuery = q.trim();

  const whereClause: Prisma.BookWhereInput = searchQuery
    ? {
        OR: [
          { title: { contains: searchQuery, mode: "insensitive" } },
          { author: { contains: searchQuery, mode: "insensitive" } },
          { owner: { name: { contains: searchQuery, mode: "insensitive" } } },
        ],
      }
    : {};

  const [books, totalCount, availableCount] = await Promise.all([
    prisma.book.findMany({
      where: whereClause,
      select: {
        id: true,
        title: true,
        author: true,
        points: true,
        isDeleted: true,
        isAvailable: true,
        createdAt: true,
        updatedAt: true,
        owner: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.book.count(),
    prisma.book.count({ where: { isAvailable: true, isDeleted: false } }),
  ]);

  return (
    <main
      dir="rtl"
      className="mx-auto w-full max-w-4xl space-y-5 px-3 sm:px-4 pt-4 pb-28 text-[#0F172A]"
    >
      <header className="relative overflow-hidden rounded-3xl border border-slate-700/60 bg-gradient-to-br from-[#0B1120] via-[#1E293B] to-[#0F172A] p-6 text-white shadow-lg">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-20 -left-20 h-56 w-56 rounded-full bg-blue-500/15 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 -right-16 h-56 w-56 rounded-full bg-teal-400/10 blur-3xl"
        />

        <div className="absolute top-4 right-4 z-20">
          <BackButton className="!h-auto !w-auto !rounded-none !border-0 !bg-transparent !p-1.5 !backdrop-blur-none text-slate-200 hover:!bg-transparent hover:text-white active:scale-95 [&_svg]:text-slate-200" />
        </div>

        <div className="relative z-10 flex flex-col items-center w-full text-center pt-2">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-blue-400 ring-1 ring-white/15">
            <BookOpen className="h-5 w-5 stroke-[1.75]" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            إدارة الكتب
          </h1>
          <p className="mt-1 text-xs text-slate-300">
            مراقبة المكتبة الشاملة، مراجعة العناوين، وحذف المحتوى المخالف
          </p>

         
        </div>
      </header>

      {/* 🔍 شريط البحث المباشر */}
      <form
        action="/admin/books"
        method="GET"
        className="flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-white p-2.5 shadow-2xs"
      >
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            name="q"
            defaultValue={searchQuery}
            placeholder="ابحث باسم الكتاب، الكاتب، أو المالك..."
            className="w-full rounded-xl border border-slate-200/70 bg-slate-50 pr-9 pl-8 py-2.5 text-xs font-bold text-slate-900 placeholder:text-slate-400 transition focus:border-teal-500 focus:bg-white focus:outline-none"
          />
          {searchQuery && (
            <Link
              href="/admin/books"
              title="مسح البحث"
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </Link>
          )}
        </div>
        <button
          type="submit"
          className="rounded-xl bg-slate-900 hover:bg-slate-800 px-5 py-2.5 text-xs font-black text-white transition active:scale-95 cursor-pointer"
        >
          بحث
        </button>
      </form>

      {/* 📚 قائمة الكتب */}
      <section className="rounded-3xl border border-slate-200/80 bg-white shadow-2xs divide-y divide-slate-100">
        {books.length > 0 ? (
          books.map((b) => (
            <article
              key={b.id}
              className="p-4 sm:p-5 hover:bg-slate-50/60 transition first:rounded-t-3xl last:rounded-b-3xl text-right"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  {/* غلاف الكتاب المصغّر (قابل للضغط) */}
                  <Link
                    href={`/books/${b.id}`}
                    className="relative h-14 w-10 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-2xs transition hover:opacity-90"
                  >
                    <BookOpen
                      aria-hidden="true"
                      className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 text-slate-300"
                    />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/books/${encodeURIComponent(b.id)}/cover?v=${b.updatedAt.getTime()}`}
                      alt={b.title}
                      loading="lazy"
                      className="relative z-10 h-full w-full object-cover"
                    />
                  </Link>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/books/${b.id}`}
                        className={`group inline-flex items-center gap-1 truncate text-sm font-black transition ${
                          b.isDeleted
                            ? "text-slate-400 line-through"
                            : "text-slate-900 hover:text-teal-700"
                        }`}
                      >
                        <span className="truncate">{b.title}</span>
                        <ExternalLink className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-100 transition" />
                      </Link>

                      {b.isAvailable && !b.isDeleted ? (
                        <span className="rounded-full bg-teal-50 border border-teal-200 px-2 py-0.5 text-[10px] font-bold text-teal-700">
                          متاح للطلب
                        </span>
                      ) : !b.isDeleted ? (
                        <span className="rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                          محجوز بطلب
                        </span>
                      ) : (
                        <span className="rounded-full bg-rose-50 border border-rose-200 px-2 py-0.5 text-[10px] font-black text-rose-700">
                          محذوف سابقاً
                        </span>
                      )}
                    </div>

                    <p className="truncate text-xs text-slate-500 mt-0.5">
                      {b.author || ""}
                    </p>

                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
                      <Link
                        href={`/users/${b.owner.id}`}
                        className="inline-flex items-center gap-1 font-bold text-teal-700 hover:underline"
                      >
                        <User className="h-3 w-3" />
                        <span>{b.owner.name}</span>
                      </Link>

                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatShortDate(b.createdAt)}
                      </span>

                      <span className="inline-flex items-center gap-1 font-bold text-amber-600 sm:hidden">
                        <Coins className="h-3 w-3" />
                        {toArabicNumerals(b.points)} نقطة
                      </span>
                    </div>
                  </div>
                </div>

                {/* النقاط + زر الحذف المباشر */}
                <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                  <div className="hidden sm:flex flex-col items-center rounded-xl bg-amber-50/70 border border-amber-100 px-3 py-1.5 text-xs">
                    <span className="font-black text-amber-700 leading-none">
                      {toArabicNumerals(b.points)}
                    </span>
                    <span className="text-[10px] font-bold text-amber-600/80 mt-0.5">
                      نقطة
                    </span>
                  </div>

                  <AdminBookDeleteButton bookId={b.id} bookTitle={b.title} />
                </div>
              </div>
            </article>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-3">
              <BookOpen className="h-6 w-6" />
            </div>
            <p className="text-xs font-black text-slate-700">
              لا توجد كتب مطابقة
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              جرّب تغيير كلمات البحث المحددة.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}