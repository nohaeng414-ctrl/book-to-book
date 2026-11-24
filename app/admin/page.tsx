import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import BackButton from "@/components/BackButton";
import AdminBroadcastModal from "@/components/AdminBroadcastModal";
import {
  ShieldAlert,
  Users,
  BookOpen,
  ArrowRightLeft,
  Flag,
  ChevronLeft,
  TrendingUp,
  CheckCircle2,
  Clock,
  Sparkles,
  Megaphone,
} from "lucide-react";
import { toArabicNumerals } from "@/lib/formatting";

export const dynamic = "force-dynamic";

function formatShortDate(date: Date | string): string {
  return new Intl.DateTimeFormat("ar-SA", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");
  if (!(await isAdmin())) redirect("/");

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // جلب إحصائيات المنصة ومعدلات النمو بالتوازي
  const [
    usersCount,
    newUsersWeek,
    booksCount,
    newBooksWeek,
    completedSwapsCount,
    totalSwapsCount,
    pendingReportsCount,
    recentReports,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.book.count({ where: { isDeleted: false } }),
    prisma.book.count({
      where: { isDeleted: false, createdAt: { gte: sevenDaysAgo } },
    }),
    prisma.swap.count({ where: { status: "COMPLETED" } }),
    prisma.swap.count(),
    prisma.report.count({ where: { status: "PENDING" } }),
    prisma.report.findMany({
      where: { status: "PENDING" },
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        reporter: { select: { name: true } },
        reported: { select: { name: true } },
      },
    }),
  ]);

  const hasPendingReports = pendingReportsCount > 0;

  return (
    <main
      dir="rtl"
      className="mx-auto w-full max-w-4xl space-y-6 px-3 sm:px-4 pt-4 pb-28 text-[#0F172A]"
    >
      <header className="relative overflow-hidden rounded-3xl border border-slate-700/60 bg-gradient-to-br from-[#0B1120] via-[#1E293B] to-[#0F172A] p-6 text-white shadow-lg">
        {/* إضاءة خلفية ناعمة */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-20 -left-20 h-56 w-56 rounded-full bg-teal-500/15 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 -right-16 h-56 w-56 rounded-full bg-amber-400/10 blur-3xl"
        />

        {/* زر الرجوع */}
        <div className="absolute top-4 right-4 z-20">
          <BackButton className="!h-auto !w-auto !rounded-none !border-0 !bg-transparent !p-1.5 !backdrop-blur-none text-slate-200 hover:!bg-transparent hover:text-white active:scale-95 [&_svg]:text-slate-200" />
        </div>

        <div className="relative z-10 flex flex-col items-center w-full text-center pt-2">
          <div className="relative mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400/20 via-amber-500/10 to-transparent ring-1 ring-amber-400/30 shadow-[0_0_25px_-5px_rgba(251,191,36,0.35)] backdrop-blur-md">
            <ShieldAlert className="h-6 w-6 text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            لوحة تحكم الإدارة
          </h1>
        </div>
      </header>

      {/* 📢 شريط إشعار الجميع: الزر مباشرة جنب الكلام وبلون واضح ومتباين */}
      <section className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-3.5 shadow-2xs">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 ring-1 ring-amber-200/80">
            <Megaphone className="h-4 w-4" />
          </div>
          <h2 className="truncate text-xs sm:text-sm font-black text-slate-900">
            إشعار عام لجميع الأعضاء
          </h2>
        </div>

        <div className="shrink-0 [&_button]:!rounded-xl [&_button]:!border-0 [&_button]:!bg-amber-400 [&_button]:!px-3.5 [&_button]:!py-2 [&_button]:!text-xs [&_button]:!font-black [&_button]:!text-slate-950 [&_button]:!shadow-2xs hover:[&_button]:!bg-amber-300 [&_button]:active:scale-95 [&_svg]:!text-slate-950">
          <AdminBroadcastModal />
        </div>
      </section>

      {/* 📊 بطاقات المؤشرات الأساسية (قابلة للضغط + معدل النمو) */}
      <section aria-label="إحصائيات المنصة" className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* الأعضاء */}
        <Link
          href="/admin/users"
          className="group rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs transition-all hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-600 ring-1 ring-teal-100">
              <Users className="h-4 w-4" />
            </div>
            {newUsersWeek > 0 && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                <TrendingUp className="h-3 w-3" />+{toArabicNumerals(newUsersWeek)}
              </span>
            )}
          </div>
          <span className="block text-xl sm:text-2xl font-black text-slate-900">
            {toArabicNumerals(usersCount)}
          </span>
          <span className="text-[11px] font-bold text-slate-400 group-hover:text-teal-700 transition">
            إجمالي الأعضاء
          </span>
        </Link>

        {/* الكتب */}
        <Link
          href="/admin/books"
          className="group rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs transition-all hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
              <BookOpen className="h-4 w-4" />
            </div>
            {newBooksWeek > 0 && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                <TrendingUp className="h-3 w-3" />+{toArabicNumerals(newBooksWeek)}
              </span>
            )}
          </div>
          <span className="block text-xl sm:text-2xl font-black text-slate-900">
            {toArabicNumerals(booksCount)}
          </span>
          <span className="text-[11px] font-bold text-slate-400 group-hover:text-blue-700 transition">
            الكتب المعروضة
          </span>
        </Link>

        {/* التبادلات */}
        <Link
          href="/admin/swaps"
          className="group rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs transition-all hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 ring-1 ring-amber-100">
              <ArrowRightLeft className="h-4 w-4" />
            </div>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
              من {toArabicNumerals(totalSwapsCount)}
            </span>
          </div>
          <span className="block text-xl sm:text-2xl font-black text-slate-900">
            {toArabicNumerals(completedSwapsCount)}
          </span>
          <span className="text-[11px] font-bold text-slate-400 group-hover:text-amber-700 transition">
            تبادلات ناجحة
          </span>
        </Link>

        {/* البلاغات */}
        <Link
          href="/admin/reports"
          className={`group rounded-2xl border p-4 shadow-2xs transition-all hover:-translate-y-0.5 hover:shadow-md ${
            hasPendingReports
              ? "border-rose-200 bg-rose-50/40 hover:border-rose-300"
              : "border-slate-200/80 bg-white hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600 ring-1 ring-rose-100">
              <Flag className="h-4 w-4" />
            </div>
            {hasPendingReports && (
              <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white">
                عاجل
              </span>
            )}
          </div>
          <span className="block text-xl sm:text-2xl font-black text-slate-900">
            {toArabicNumerals(pendingReportsCount)}
          </span>
          <span className="text-[11px] font-bold text-slate-400 group-hover:text-rose-700 transition">
            بلاغات معلقة
          </span>
        </Link>
      </section>

      {/* ⚡ أقسام الإدارة السريعة */}
      <section className="space-y-2.5">
        <div className="flex items-center gap-1.5 px-1">
          <Sparkles className="h-3.5 w-3.5 text-slate-400" />
          <h2 className="text-xs font-black text-slate-500">أقسام الإدارة</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* 1. إدارة الأعضاء */}
          <Link
            href="/admin/users"
            className="group flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs transition-all hover:border-teal-300 hover:shadow-sm active:scale-[0.99]"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-600 ring-1 ring-teal-100 transition group-hover:bg-teal-600 group-hover:text-white">
                <Users className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs sm:text-sm font-black text-slate-900 group-hover:text-teal-700 transition">
                  إدارة الأعضاء
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                  الحسابات، الصلاحيات، النقاط، وحظر المخالفين
                </p>
              </div>
            </div>
            <ChevronLeft className="h-4 w-4 shrink-0 text-slate-400 group-hover:-translate-x-1 group-hover:text-teal-600 transition" />
          </Link>

          {/* 2. إدارة البلاغات والنزاعات */}
          <Link
            href="/admin/reports"
            className="group flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs transition-all hover:border-rose-300 hover:shadow-sm active:scale-[0.99]"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 ring-1 ring-rose-100 transition group-hover:bg-rose-600 group-hover:text-white">
                <Flag className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs sm:text-sm font-black text-slate-900 group-hover:text-rose-700 transition">
                    إدارة البلاغات والنزاعات
                  </h3>
                  {hasPendingReports && (
                    <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-black text-rose-700">
                      {toArabicNumerals(pendingReportsCount)}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                  مراجعة الشكاوى والفصل بين الأطراف
                </p>
              </div>
            </div>
            <ChevronLeft className="h-4 w-4 shrink-0 text-slate-400 group-hover:-translate-x-1 group-hover:text-rose-600 transition" />
          </Link>

          {/* 3. إدارة الكتب */}
          <Link
            href="/admin/books"
            className="group flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs transition-all hover:border-blue-300 hover:shadow-sm active:scale-[0.99]"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 ring-1 ring-blue-100 transition group-hover:bg-blue-600 group-hover:text-white">
                <BookOpen className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs sm:text-sm font-black text-slate-900 group-hover:text-blue-700 transition">
                  إدارة الكتب
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                  مراقبة المكتبة الشاملة وحذف العناوين المخالفة
                </p>
              </div>
            </div>
            <ChevronLeft className="h-4 w-4 shrink-0 text-slate-400 group-hover:-translate-x-1 group-hover:text-blue-600 transition" />
          </Link>

          {/* 4. إدارة الطلبات والتبادلات */}
          <Link
            href="/admin/swaps"
            className="group flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs transition-all hover:border-amber-400 hover:shadow-sm active:scale-[0.99]"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 ring-1 ring-amber-100 transition group-hover:bg-amber-500 group-hover:text-white">
                <ArrowRightLeft className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs sm:text-sm font-black text-slate-900 group-hover:text-amber-700 transition">
                  إدارة الطلبات
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                  متابعة التبادلات الجارية ومعالجة الطلبات المتعثرة
                </p>
              </div>
            </div>
            <ChevronLeft className="h-4 w-4 shrink-0 text-slate-400 group-hover:-translate-x-1 group-hover:text-amber-600 transition" />
          </Link>
        </div>
      </section>

      {/* 📌 أحدث البلاغات المعلقة */}
      <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
              <ShieldAlert className="h-4 w-4" />
            </div>
            <h2 className="text-xs sm:text-sm font-black text-slate-800">
              أحدث البلاغات التي تتطلب تدخلاً
            </h2>
          </div>
          <Link
            href="/admin/reports"
            className="text-[11px] font-bold text-teal-700 hover:text-teal-800 hover:underline"
          >
            عرض الكل
          </Link>
        </div>

        {recentReports.length > 0 ? (
          <div className="divide-y divide-slate-100 text-xs">
            {recentReports.map((report) => (
              <div
                key={report.id}
                className="py-3.5 first:pt-1 last:pb-1 flex items-center justify-between gap-3"
              >
                <div className="min-w-0 space-y-1">
                  <p className="font-black text-slate-900 truncate">
                    {report.reason}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-400">
                    <span>
                      المرسل:{" "}
                      <strong className="text-slate-700">
                        {report.reporter.name}
                      </strong>{" "}
                      ضد{" "}
                      <strong className="text-rose-600">
                        {report.reported.name}
                      </strong>
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatShortDate(report.createdAt)}
                    </span>
                  </div>
                </div>
                <Link
                  href="/admin/reports"
                  className="shrink-0 rounded-xl bg-slate-900 hover:bg-slate-800 px-3.5 py-1.5 text-[11px] font-bold text-white transition active:scale-95"
                >
                  مراجعة
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 mb-2.5">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <p className="text-xs font-black text-slate-700">
              كل شيء على ما يرام!
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400">
              لا توجد بلاغات معلقة حالياً في المنصة.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}