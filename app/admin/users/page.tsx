import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import BackButton from "@/components/BackButton";
import UserAvatar from "@/components/UserAvatar";
import AdminUserCardActions from "@/components/AdminUserCardActions";
import AdminBroadcastModal from "@/components/AdminBroadcastModal";
import {
  Users,
  Search,
  MapPin,
  Coins,
  BookOpen,
  ArrowRightLeft,
  Flag,
  CheckCircle2,
  Ban,
  Calendar,
  X,
} from "lucide-react";
import { toArabicNumerals } from "@/lib/formatting";

export const dynamic = "force-dynamic";

function formatArabicDate(date: Date | string): string {
  return new Intl.DateTimeFormat("ar-SA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");
  if (!(await isAdmin())) redirect("/");

  const { q = "", status = "ALL" } = await searchParams;
  const searchQuery = q.trim();
  const validStatus = ["ALL", "ACTIVE", "BANNED"].includes(status)
    ? status
    : "ALL";

  const whereClause: {
    isBanned?: boolean;
    OR?: Array<{
      name?: { contains: string; mode: "insensitive" };
      email?: { contains: string; mode: "insensitive" };
      city?: { contains: string; mode: "insensitive" };
    }>;
  } = {};

  if (validStatus === "BANNED") whereClause.isBanned = true;
  if (validStatus === "ACTIVE") whereClause.isBanned = false;

  if (searchQuery) {
    whereClause.OR = [
      { name: { contains: searchQuery, mode: "insensitive" } },
      { email: { contains: searchQuery, mode: "insensitive" } },
      { city: { contains: searchQuery, mode: "insensitive" } },
    ];
  }

  const [users, totalCount, activeCount, bannedCount] = await Promise.all([
    prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        city: true,
        country: true,
        neighborhood: true,
        points: true,
        reservedPoints: true,
        isBanned: true,
        banReason: true,
        createdAt: true,
        books: {
          where: { isDeleted: false },
          select: { id: true, title: true, author: true, points: true },
          orderBy: { createdAt: "desc" },
        },
        _count: {
          select: {
            initiatedSwaps: { where: { status: "COMPLETED" } },
            receivedSwaps: { where: { status: "COMPLETED" } },
            reportsReceived: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.user.count(),
    prisma.user.count({ where: { isBanned: false } }),
    prisma.user.count({ where: { isBanned: true } }),
  ]);

  return (
    <main
      dir="rtl"
      className="mx-auto w-full max-w-4xl space-y-4 px-3 sm:px-4 pt-4 pb-28 text-[#0F172A]"
    >
      {/* 🧭 الهيدر التنفيذي الموحّد */}
      <header className="relative overflow-hidden rounded-3xl border border-slate-700/60 bg-gradient-to-br from-[#0B1120] via-[#1E293B] to-[#0F172A] p-5 sm:p-6 text-white shadow-lg">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-20 -left-20 h-56 w-56 rounded-full bg-teal-500/15 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 -right-16 h-56 w-56 rounded-full bg-amber-400/10 blur-3xl"
        />

        <div className="relative z-30 flex items-center justify-between gap-3">
          <div className="shrink-0">
            <BackButton className="!h-auto !w-auto !rounded-none !border-0 !bg-transparent !p-1.5 !backdrop-blur-none text-slate-200 hover:!bg-transparent hover:text-white active:scale-95 [&_svg]:text-slate-200" />
          </div>
          <div className="shrink-0">
            <AdminBroadcastModal />
          </div>
        </div>

        <div className="relative z-10 mt-1 flex flex-col items-center w-full text-center">
          <div className="mb-2.5 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-teal-400 ring-1 ring-white/15">
            <Users className="h-5 w-5 stroke-[1.75]" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            إدارة الأعضاء
          </h1>
          <p className="mt-1 text-xs text-slate-300">
            متابعة حسابات القراء، أرصدة النقاط، المكتبات، وإجراءات الحظر والتنبيه
          </p>

         
        </div>
      </header>

      {/* 🔍 شريط الفلترة والبحث */}
      <div className="space-y-2.5 rounded-2xl border border-slate-200/80 bg-white p-2.5 shadow-2xs">
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 text-center text-xs font-bold">
          <Link
            href={`/admin/users?status=ALL${
              searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ""
            }`}
            className={`rounded-lg py-2 transition flex items-center justify-center gap-1 ${
              validStatus === "ALL"
                ? "bg-white text-slate-900 shadow-2xs font-black"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <span>الكل ({toArabicNumerals(totalCount)})</span>
          </Link>

          <Link
            href={`/admin/users?status=ACTIVE${
              searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ""
            }`}
            className={`rounded-lg py-2 transition flex items-center justify-center gap-1 ${
              validStatus === "ACTIVE"
                ? "bg-white text-teal-700 shadow-2xs font-black"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            <span>نشط ({toArabicNumerals(activeCount)})</span>
          </Link>

          <Link
            href={`/admin/users?status=BANNED${
              searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ""
            }`}
            className={`rounded-lg py-2 transition flex items-center justify-center gap-1 ${
              validStatus === "BANNED"
                ? "bg-white text-rose-700 shadow-2xs font-black"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Ban className="h-3.5 w-3.5 shrink-0" />
            <span>محظور ({toArabicNumerals(bannedCount)})</span>
          </Link>
        </div>

        <form
          action="/admin/users"
          method="GET"
          className="flex items-center gap-2"
        >
          <input type="hidden" name="status" value={validStatus} />
          <div className="relative flex-1 min-w-0">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              name="q"
              defaultValue={searchQuery}
              placeholder="ابحث بالاسم، البريد، أو المدينة..."
              className="w-full rounded-xl border border-slate-200/70 bg-slate-50 pr-9 pl-8 py-2 text-xs font-bold text-slate-900 placeholder:text-slate-400 transition focus:border-teal-500 focus:bg-white focus:outline-none"
            />
            {searchQuery && (
              <Link
                href={`/admin/users?status=${validStatus}`}
                title="مسح البحث"
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </Link>
            )}
          </div>
          <button
            type="submit"
            className="shrink-0 rounded-xl bg-slate-900 hover:bg-slate-800 px-4 py-2 text-xs font-black text-white transition active:scale-95 cursor-pointer"
          >
            بحث
          </button>
        </form>
      </div>

      {/* 👥 قائمة الأعضاء */}
      <section className="rounded-3xl border border-slate-200/80 bg-white shadow-2xs divide-y divide-slate-100">
        {users.length > 0 ? (
          users.map((u) => {
            const completedSwaps =
              u._count.initiatedSwaps + u._count.receivedSwaps;
            const isCurrentAdmin = u.email === session.user?.email;
            const locationText =
              [u.neighborhood, u.city, u.country].filter(Boolean).join("، ") ||
              "غير محدد";

            return (
              <article
               key={u.id}
                className="p-4 sm:p-5 hover:bg-slate-50/60 transition first:rounded-t-3xl last:rounded-b-3xl space-y-3 text-right"
              >
                {/* الصف العلوي: الصورة جنب الاسم مباشرة + الشارات + إحصائيات سطح المكتب */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="shrink-0">
                      <UserAvatar userId={u.id} name={u.name} size="md" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <Link
                          href={`/users/${u.id}`}
                          className="text-sm font-black text-slate-900 hover:text-teal-700 transition truncate"
                        >
                          {u.name || "عضو"}
                        </Link>

                        {isCurrentAdmin && (
                          <span className="shrink-0 rounded-full bg-amber-100 border border-amber-200 px-2 py-0.5 text-[10px] font-black text-amber-800">
                            المشرف
                          </span>
                        )}

                        {u.isBanned ? (
                          <span className="shrink-0 rounded-full bg-rose-100 border border-rose-200 px-2 py-0.5 text-[10px] font-black text-rose-700">
                            محظور
                          </span>
                        ) : (
                          <span className="shrink-0 rounded-full bg-teal-50 border border-teal-200 px-2 py-0.5 text-[10px] font-bold text-teal-700">
                            نشط
                          </span>
                        )}

                        {u._count.reportsReceived > 0 && (
                          <Link
                            href="/admin/reports"
                            className="shrink-0 inline-flex items-center gap-1 rounded-full bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2 py-0.5 text-[10px] font-black text-rose-700 transition"
                          >
                            <Flag className="h-3 w-3 text-rose-500" />
                            <span>
                              {toArabicNumerals(u._count.reportsReceived)} بلاغ
                            </span>
                          </Link>
                        )}
                      </div>

                      <p className="truncate text-xs text-slate-400 mt-0.5">
                        {u.email}
                      </p>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 mt-1">
                        <span className="inline-flex items-center gap-1 min-w-0 truncate">
                          <MapPin className="h-3 w-3 shrink-0 text-teal-500" />
                          <span className="truncate">{locationText}</span>
                        </span>
                        <span className="inline-flex items-center gap-1 text-slate-400">
                          <Calendar className="h-3 w-3 shrink-0" />
                          <span>{formatArabicDate(u.createdAt)}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* مؤشرات العضو على الشاشات الكبيرة */}
                  <div className="hidden sm:flex items-center gap-2 text-xs shrink-0">
                    <span
                      className="inline-flex items-center gap-1 rounded-xl bg-slate-50 border border-slate-200/70 px-2.5 py-1 font-bold text-slate-700"
                      title={
                        u.reservedPoints > 0
                          ? `منها ${toArabicNumerals(u.reservedPoints)} نقاط محجوزة`
                          : "رصيد النقاط"
                      }
                    >
                      <Coins className="h-3.5 w-3.5 text-amber-500" />
                      <span>{toArabicNumerals(u.points)}</span>
                    </span>

                    <span className="inline-flex items-center gap-1 rounded-xl bg-slate-50 border border-slate-200/70 px-2.5 py-1 font-bold text-slate-700">
                      <BookOpen className="h-3.5 w-3.5 text-blue-500" />
                      <span>{toArabicNumerals(u.books.length)}</span>
                    </span>

                    <span className="inline-flex items-center gap-1 rounded-xl bg-slate-50 border border-slate-200/70 px-2.5 py-1 font-bold text-slate-700">
                      <ArrowRightLeft className="h-3.5 w-3.5 text-teal-600" />
                      <span>{toArabicNumerals(completedSwaps)}</span>
                    </span>
                  </div>
                </div>

                {/* شريط المؤشرات المخصص للجوال */}
                <div className="flex sm:hidden items-center gap-2 overflow-x-auto pb-0.5 text-[11px]">
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-slate-50 border border-slate-200/70 px-2.5 py-1 font-bold text-slate-700">
                    <Coins className="h-3.5 w-3.5 text-amber-500" />
                    <span>{toArabicNumerals(u.points)} نقطة</span>
                  </span>

                  <span className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-slate-50 border border-slate-200/70 px-2.5 py-1 font-bold text-slate-700">
                    <BookOpen className="h-3.5 w-3.5 text-blue-500" />
                    <span>{toArabicNumerals(u.books.length)} كتاب</span>
                  </span>

                  <span className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-slate-50 border border-slate-200/70 px-2.5 py-1 font-bold text-slate-700">
                    <ArrowRightLeft className="h-3.5 w-3.5 text-teal-600" />
                    <span>{toArabicNumerals(completedSwaps)} تبادل</span>
                  </span>
                </div>

                {/* سبب الحظر يظهر بسطر هادئ فقط إذا كان العضو محظوراً */}
                {u.isBanned && u.banReason && (
                  <div className="rounded-xl bg-rose-50/70 border border-rose-100 px-3 py-2 text-xs text-rose-800">
                    <strong>سبب الحظر:</strong> {u.banReason}
                  </div>
                )}

                {/* أزرار الإجراءات أسفل البطاقة بسطر مستقل */}
                <AdminUserCardActions
                  userId={u.id}
                  userName={u.name}
                  isBanned={u.isBanned}
                  banReason={u.banReason}
                  currentPoints={u.points}
                  books={u.books}
                />
              </article>
            );
          })
        ) : (
          <div className="p-12 text-center text-xs text-slate-400 font-bold">
            لا يوجد أعضاء مطابقون لخيارات البحث الحالية.
          </div>
        )}
      </section>
    </main>
  );
}