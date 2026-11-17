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
} from "lucide-react";
import { toArabicNumerals } from "@/lib/formatting";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");
  if (!(await isAdmin())) redirect("/");

  // جلب إحصائيات المنصة الحية بالتوازي
  const [
    usersCount,
    booksCount,
    completedSwapsCount,
    pendingReportsCount,
    recentReports,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.book.count({ where: { isDeleted: false } }),
    prisma.swap.count({ where: { status: "COMPLETED" } }),
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

  return (
    <main
      dir="rtl"
      className="mx-auto w-full max-w-4xl space-y-5 px-3 sm:px-4 pt-4 pb-28 text-[#0F172A]"
    >
      {/* 🧭 الهيدر العصري الموحد */}
      <header className="relative flex items-center justify-between rounded-3xl border border-slate-200/80 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 text-white shadow-md">
        
        {/* زر الرجوع */}
        <div className="absolute top-4 right-4 z-20">
          <BackButton />
        </div>

        {/* 📢 زر إشعار للجميع */}
        <div className="absolute top-4 left-4 z-20">
          <AdminBroadcastModal />
        </div>

        <div className="flex flex-col items-center w-full text-center pt-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400/10 border border-amber-400/20 text-amber-400 mb-2 shadow-inner">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            لوحة تحكم الإدارة
          </h1>
          <p className="mt-1 text-xs text-slate-300">
            مرحباً بكِ. نظرة شاملة على نشاط المنصة وتحكم كامل بكل أقسامها
          </p>
        </div>
      </header>

      {/* 📊 بطاقات المؤشرات الأساسية (KPI Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 text-center shadow-2xs space-y-1">
          <div className="flex items-center justify-center text-teal-600 mb-1">
            <Users className="h-5 w-5" />
          </div>
          <span className="block text-lg sm:text-xl font-black text-slate-900">
            {toArabicNumerals(usersCount)}
          </span>
          <span className="text-[11px] font-bold text-slate-400">إجمالي الأعضاء</span>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 text-center shadow-2xs space-y-1">
          <div className="flex items-center justify-center text-blue-600 mb-1">
            <BookOpen className="h-5 w-5" />
          </div>
          <span className="block text-lg sm:text-xl font-black text-slate-900">
            {toArabicNumerals(booksCount)}
          </span>
          <span className="text-[11px] font-bold text-slate-400">الكتب المعروضة</span>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 text-center shadow-2xs space-y-1">
          <div className="flex items-center justify-center text-amber-500 mb-1">
            <ArrowRightLeft className="h-5 w-5" />
          </div>
          <span className="block text-lg sm:text-xl font-black text-slate-900">
            {toArabicNumerals(completedSwapsCount)}
          </span>
          <span className="text-[11px] font-bold text-slate-400">تبادلات ناجحة</span>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 text-center shadow-2xs space-y-1">
          <div className="flex items-center justify-center text-rose-600 mb-1">
            <Flag className="h-5 w-5" />
          </div>
          <span className="block text-lg sm:text-xl font-black text-slate-900">
            {toArabicNumerals(pendingReportsCount)}
          </span>
          <span className="text-[11px] font-bold text-slate-400">بلاغات معلقة</span>
        </div>
      </div>

      {/* ⚡ أقسام الإدارة السريعة (Quick Navigation Panels) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* 1. رابط إدارة المستخدمين */}
        <Link
          href="/admin/users"
          className="group flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs transition hover:border-teal-300 hover:shadow-sm"
        >
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-600 ring-1 ring-teal-100">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-black text-slate-900 group-hover:text-teal-600 transition">
                إدارة الأعضاء
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                التحكم بالحسابات، الصلاحيات، والنقاط، وحظر المخالفين
              </p>
            </div>
          </div>
          <ChevronLeft className="h-4 w-4 text-slate-400 group-hover:-translate-x-1 transition" />
        </Link>

        {/* 2. رابط إدارة البلاغات والنزاعات */}
        <Link
          href="/admin/reports"
          className="group flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs transition hover:border-rose-300 hover:shadow-sm"
        >
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 ring-1 ring-rose-100">
              <Flag className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-black text-slate-900 group-hover:text-rose-600 transition">
                إدارة البلاغات والنزاعات
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                مراجعة الشكاوى، الصور، والفصل بين الأطراف
              </p>
            </div>
          </div>
          <ChevronLeft className="h-4 w-4 text-slate-400 group-hover:-translate-x-1 transition" />
        </Link>

        {/* 3. رابط إدارة الكتب */}
        <Link
          href="/admin/books"
          className="group flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs transition hover:border-blue-300 hover:shadow-sm"
        >
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-black text-slate-900 group-hover:text-blue-600 transition">
                إدارة الكتب
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                مراقبة المكتبة الشاملة، مراجعة العناوين، وحذف المخالف
              </p>
            </div>
          </div>
          <ChevronLeft className="h-4 w-4 text-slate-400 group-hover:-translate-x-1 transition" />
        </Link>

        {/* 4. رابط إدارة التبادلات */}
        <Link
          href="/admin/swaps"
          className="group flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs transition hover:border-amber-400 hover:shadow-sm"
        >
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 ring-1 ring-amber-100">
              <ArrowRightLeft className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-black text-slate-900 group-hover:text-amber-600 transition">
                إدارة الطلبات 
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                متابعة العمليات الجارية وإلغاء الطلبات المتعثرة إدارياً
              </p>
            </div>
          </div>
          <ChevronLeft className="h-4 w-4 text-slate-400 group-hover:-translate-x-1 transition" />
        </Link>
      </div>

      {/* 📌 أحدث البلاغات المعلقة (Live Activity Feed) */}
      <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-rose-600" />
            <h2 className="text-xs sm:text-sm font-black text-slate-800">
              أحدث البلاغات التي تتطلب تدخلاً
            </h2>
          </div>
          <Link
            href="/admin/reports"
            className="text-[11px] font-bold text-teal-700 hover:underline"
          >
            عرض الكل
          </Link>
        </div>

        {recentReports.length > 0 ? (
          <div className="divide-y divide-slate-100 text-xs">
            {recentReports.map((report) => (
              <div key={report.id} className="py-3.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-black text-slate-900 truncate">
                    {report.reason}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    المرسل: <strong className="text-slate-700">{report.reporter.name}</strong> ضد <strong className="text-rose-600">{report.reported.name}</strong>
                  </p>
                </div>
                <Link
                  href="/admin/reports"
                  className="shrink-0 rounded-xl bg-slate-100 hover:bg-slate-200 px-3 py-1.5 font-bold text-slate-700 transition"
                >
                  مراجعة
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-slate-400 font-medium">
            رائع! لا توجد بلاغات معلقة حالياً في المنصة.
          </div>
        )}
      </section>
    </main>
  );
}