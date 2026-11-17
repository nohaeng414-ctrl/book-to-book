import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import BackButton from "@/components/BackButton";
import AdminBookCardActions from "@/components/AdminBookCardActions";
import { Search, X, BookOpen, Trash2, CheckCircle2, User } from "lucide-react";
import { toArabicNumerals } from "@/lib/formatting";

export const dynamic = "force-dynamic";

export default async function AdminBooksPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");
  if (!(await isAdmin())) redirect("/");

  const { q = "", status = "ALL" } = await searchParams;
  const searchQuery = q.trim();
  const validStatus = ["ALL", "AVAILABLE", "DELETED"].includes(status) ? status : "ALL";

  const whereClause: any = {};

  if (validStatus === "DELETED") whereClause.isDeleted = true;
  if (validStatus === "AVAILABLE") whereClause.isDeleted = false;

  if (searchQuery) {
    whereClause.OR = [
      { title: { contains: searchQuery, mode: "insensitive" } },
      { author: { contains: searchQuery, mode: "insensitive" } },
      { owner: { name: { contains: searchQuery, mode: "insensitive" } } },
    ];
  }

  const [books, totalCount, activeCount, deletedCount] = await Promise.all([
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
        owner: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.book.count(),
    prisma.book.count({ where: { isDeleted: false } }),
    prisma.book.count({ where: { isDeleted: true } }),
  ]);

  return (
    <main dir="rtl" className="mx-auto w-full max-w-4xl space-y-4 px-3 sm:px-4 pt-4 pb-28 text-[#0F172A]">
      {/* 🧭 الهيدر العصري الموحد */}
      <header className="relative flex items-center justify-between rounded-3xl border border-slate-200/80 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 text-white shadow-md">
        <div className="absolute top-4 right-4 z-20">
          <BackButton />
        </div>

        <div className="flex flex-col items-center w-full text-center pt-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-400/10 border border-blue-400/20 text-blue-400 mb-2 shadow-inner">
            <BookOpen className="h-6 w-6" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            إدارة الكتب
          </h1>
          <p className="mt-1 text-xs text-slate-300">
            مراقبة المكتبة الشاملة، مراجعة العناوين، وحذف المحتوى المخالف
          </p>
        </div>
      </header>

      {/* 🔍 شريط البحث والفلترة الموحد */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 rounded-2xl border border-slate-200/80 bg-white p-2 shadow-2xs">
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 text-center text-xs font-bold sm:w-80 shrink-0">
          <Link
            href={`/admin/books?status=ALL${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ""}`}
            className={`rounded-lg py-2 transition flex items-center justify-center gap-1 ${
              validStatus === "ALL"
                ? "bg-white text-slate-900 shadow-2xs font-black"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <span>الكل ({toArabicNumerals(totalCount)})</span>
          </Link>

          <Link
            href={`/admin/books?status=AVAILABLE${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ""}`}
            className={`rounded-lg py-2 transition flex items-center justify-center gap-1 ${
              validStatus === "AVAILABLE"
                ? "bg-white text-teal-700 shadow-2xs font-black"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>متاح ({toArabicNumerals(activeCount)})</span>
          </Link>

          <Link
            href={`/admin/books?status=DELETED${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ""}`}
            className={`rounded-lg py-2 transition flex items-center justify-center gap-1 ${
              validStatus === "DELETED"
                ? "bg-white text-rose-700 shadow-2xs font-black"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>محذوف ({toArabicNumerals(deletedCount)})</span>
          </Link>
        </div>

        <form action="/admin/books" method="GET" className="flex items-center gap-1.5 flex-1">
          <input type="hidden" name="status" value={validStatus} />
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              name="q"
              defaultValue={searchQuery}
              placeholder="ابحث باسم الكتاب، الكاتب، أو المالك..."
              className="w-full rounded-xl bg-slate-50 pr-9 pl-8 py-2 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-teal-600"
            />
            {searchQuery && (
              <Link
                href={`/admin/books?status=${validStatus}`}
                title="مسح البحث"
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </Link>
            )}
          </div>
          <button
            type="submit"
            className="rounded-xl bg-slate-900 hover:bg-slate-800 px-4 py-2 text-xs font-black text-white transition cursor-pointer"
          >
            بحث
          </button>
        </form>
      </div>

      {/* 📚 القائمة الاحترافية الموحدة للكتب */}
      <section className="rounded-3xl border border-slate-200/80 bg-white shadow-2xs divide-y divide-slate-100">
        {books.length > 0 ? (
          books.map((b) => (
            <article
              key={b.id}
              className="p-4 sm:p-5 hover:bg-slate-50/50 transition first:rounded-t-3xl last:rounded-b-3xl text-right"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-black text-slate-900">{b.title}</span>
                      
                      {b.isDeleted ? (
                        <span className="rounded-full bg-rose-100 border border-rose-200 px-2 py-0.5 text-[10px] font-black text-rose-700">
                          محذوف إدارياً
                        </span>
                      ) : b.isAvailable ? (
                        <span className="rounded-full bg-teal-50 border border-teal-200 px-2 py-0.5 text-[10px] font-bold text-teal-700">
                          متاح للطلب
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                          محجوز بطلب
                        </span>
                      )}
                    </div>
                    
                    <p className="truncate text-xs text-slate-400 mt-0.5">الكاتب: {b.author}</p>
                    
                    <Link href={`/users/${b.owner.id}`} className="mt-1 flex items-center gap-1 text-[11px] font-bold text-teal-700 hover:underline">
                      <User className="h-3.5 w-3.5" /> 
                      أضيف بواسطة: {b.owner.name}
                    </Link>
                  </div>
                </div>

                {/* يسار الصف: الأرقام الهادئة + زر القائمة الثلاثية (⋮) */}
                <div className="flex items-center gap-3 sm:gap-5 shrink-0">
                  <div className="hidden sm:block text-center text-xs">
                    <span className="block font-black text-amber-600">{toArabicNumerals(b.points)}</span>
                    <span className="text-[10px] text-slate-400">نقطة</span>
                  </div>
                  
                  <AdminBookCardActions bookId={b.id} isDeleted={b.isDeleted} />
                </div>
              </div>
            </article>
          ))
        ) : (
          <div className="p-12 text-center text-xs text-slate-400 font-bold">
            لا توجد كتب مطابقة لخيارات البحث الحالية.
          </div>
        )}
      </section>
    </main>
  );
}