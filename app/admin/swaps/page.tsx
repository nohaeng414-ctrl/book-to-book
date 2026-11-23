import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import BackButton from "@/components/BackButton";
import {
  Search,
  X,
  ArrowRightLeft,
  Coins,
  Clock,
  CheckCircle2,
  Ban,
  ShieldAlert,
  BookOpen,
  User,
  ChevronLeft,
} from "lucide-react";
import { toArabicNumerals } from "@/lib/formatting";
import { Prisma } from "@/generated/prisma-full";

export const dynamic = "force-dynamic";

function formatArabicDate(date: Date | string): string {
  return new Intl.DateTimeFormat("ar-SA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

const SWAP_STATUS_LABELS: Record<string, string> = {
  PENDING: "بانتظار الموافقة",
  ACCEPTED: "تم القبول",
  AWAITING_DELIVERY: "جاري التسليم",
  AWAITING_CONFIRMATION: "بانتظار التأكيد",
  COMPLETED: "مكتمل",
  CANCELLED: "ملغى",
  REJECTED: "مرفوض",
  DISPUTED: "متنازع عليه",
};

const ACTIVE_STATUSES = [
  "PENDING",
  "ACCEPTED",
  "AWAITING_DELIVERY",
  "AWAITING_CONFIRMATION",
  "DISPUTED",
] as const;

export default async function AdminSwapsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");
  if (!(await isAdmin())) redirect("/");

  const { q = "", status = "ALL" } = await searchParams;
  const searchQuery = q.trim();
  const validStatus = ["ALL", "ACTIVE", "COMPLETED", "CANCELLED"].includes(
    status
  )
    ? status
    : "ALL";

  const whereClause: Prisma.SwapWhereInput = {};

  if (validStatus === "ACTIVE") {
    whereClause.status = { in: [...ACTIVE_STATUSES] };
  } else if (validStatus === "COMPLETED") {
    whereClause.status = "COMPLETED";
  } else if (validStatus === "CANCELLED") {
    whereClause.status = { in: ["CANCELLED", "REJECTED"] };
  }

  if (searchQuery) {
    whereClause.OR = [
      {
        requestedBook: {
          title: { contains: searchQuery, mode: "insensitive" },
        },
      },
      { requester: { name: { contains: searchQuery, mode: "insensitive" } } },
      { receiver: { name: { contains: searchQuery, mode: "insensitive" } } },
    ];
  }

  const [swaps, totalCount, activeCount, disputedCount] = await Promise.all([
    prisma.swap.findMany({
      where: whereClause,
      select: {
        id: true,
        type: true,
        status: true,
        pointsCost: true,
        createdAt: true,
        requestedBook: {
          select: { id: true, title: true, points: true, updatedAt: true },
        },
        offeredBook: { select: { id: true, title: true } },
        requester: { select: { id: true, name: true } },
        receiver: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.swap.count(),
    prisma.swap.count({ where: { status: { in: [...ACTIVE_STATUSES] } } }),
    prisma.swap.count({ where: { status: "DISPUTED" } }),
  ]);

  return (
    <main
      dir="rtl"
      className="mx-auto w-full max-w-4xl space-y-5 px-3 sm:px-4 pt-4 pb-28 text-[#0F172A]"
    >
      <header className="relative overflow-hidden rounded-3xl border border-slate-700/60 bg-gradient-to-br from-[#0B1120] via-[#1E293B] to-[#0F172A] p-6 text-white shadow-lg">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-20 -left-20 h-56 w-56 rounded-full bg-amber-500/15 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 -right-16 h-56 w-56 rounded-full bg-teal-400/10 blur-3xl"
        />

        <div className="absolute top-4 right-4 z-20">
          <BackButton className="!h-auto !w-auto !rounded-none !border-0 !bg-transparent !p-1.5 !backdrop-blur-none text-slate-200 hover:!bg-transparent hover:text-white active:scale-95 [&_svg]:text-slate-200" />
        </div>

        <div className="relative z-10 flex flex-col items-center w-full text-center pt-2">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-amber-400 ring-1 ring-white/15">
            <ArrowRightLeft className="h-5 w-5 stroke-[1.75]" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            إدارة الطلبات
          </h1>
          <p className="mt-1 text-xs text-slate-300">
            متابعة التبادلات الجارية، التحقق من الحالات، ومعالجة الطلبات المتعثرة
          </p>

          <div className="mt-3 inline-flex flex-wrap items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1 text-[11px] font-bold text-slate-200 backdrop-blur-md">
            <span>إجمالي الطلبات:</span>
            <strong className="text-white">{toArabicNumerals(totalCount)}</strong>
            <span className="text-slate-500">•</span>
            <span className="text-teal-300">
              {toArabicNumerals(activeCount)} جارية
            </span>
            {disputedCount > 0 && (
              <>
                <span className="text-slate-500">•</span>
                <span className="text-rose-400">
                  {toArabicNumerals(disputedCount)} متنازع عليه
                </span>
              </>
            )}
          </div>
        </div>
      </header>

      {/* 🔍 شريط البحث والفلترة */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 rounded-2xl border border-slate-200/80 bg-white p-2.5 shadow-2xs">
        <div className="grid grid-cols-4 gap-1 rounded-xl bg-slate-100 p-1 text-center text-xs font-bold md:w-[25rem] shrink-0">
          <Link
            replace
            href={`/admin/swaps?status=ALL${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ""}`}
            className={`rounded-lg py-2 transition flex items-center justify-center gap-1 ${
              validStatus === "ALL"
                ? "bg-white text-slate-900 shadow-2xs font-black"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <span>الكل</span>
          </Link>

          <Link
            replace
            href={`/admin/swaps?status=ACTIVE${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ""}`}
            className={`rounded-lg py-2 transition flex items-center justify-center gap-1 ${
              validStatus === "ACTIVE"
                ? "bg-white text-teal-700 shadow-2xs font-black"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Clock className="h-3.5 w-3.5 hidden sm:inline" />
            <span>جارية</span>
          </Link>

          <Link
            replace
            href={`/admin/swaps?status=COMPLETED${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ""}`}
            className={`rounded-lg py-2 transition flex items-center justify-center gap-1 ${
              validStatus === "COMPLETED"
                ? "bg-white text-blue-700 shadow-2xs font-black"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5 hidden sm:inline" />
            <span>مكتملة</span>
          </Link>

          <Link
            replace
            href={`/admin/swaps?status=CANCELLED${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ""}`}
            className={`rounded-lg py-2 transition flex items-center justify-center gap-1 ${
              validStatus === "CANCELLED"
                ? "bg-white text-rose-700 shadow-2xs font-black"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Ban className="h-3.5 w-3.5 hidden sm:inline" />
            <span>ملغاة</span>
          </Link>
        </div>

        <form
          action="/admin/swaps"
          method="GET"
          className="flex items-center gap-1.5 flex-1"
        >
          <input type="hidden" name="status" value={validStatus} />
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              name="q"
              defaultValue={searchQuery}
              placeholder="ابحث باسم الكتاب أو الأطراف..."
              className="w-full rounded-xl border border-slate-200/70 bg-slate-50 pr-9 pl-8 py-2 text-xs font-bold text-slate-900 placeholder:text-slate-400 transition focus:border-teal-500 focus:bg-white focus:outline-none"
            />
            {searchQuery && (
              <Link
                replace
                href={`/admin/swaps?status=${validStatus}`}
                title="مسح البحث"
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </Link>
            )}
          </div>
          <button
            type="submit"
            className="rounded-xl bg-slate-900 hover:bg-slate-800 px-4 py-2 text-xs font-black text-white transition active:scale-95 cursor-pointer"
          >
            بحث
          </button>
        </form>
      </div>

      {/* 🔄 قائمة الطلبات */}
      <section className="rounded-3xl border border-slate-200/80 bg-white shadow-2xs divide-y divide-slate-100">
        {swaps.length > 0 ? (
          swaps.map((s) => (
            <Link
              key={s.id}
              href={`/swaps/${s.id}`}
              className="group block p-4 sm:p-5 hover:bg-slate-50/70 transition first:rounded-t-3xl last:rounded-b-3xl text-right"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  {/* غلاف الكتاب المطلوب */}
                  <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-2xs">
                    <BookOpen
                      aria-hidden="true"
                      className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 text-slate-300"
                    />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/books/${encodeURIComponent(s.requestedBook.id)}/cover?v=${s.requestedBook.updatedAt.getTime()}`}
                      alt={s.requestedBook.title}
                      loading="lazy"
                      className="relative z-10 h-full w-full object-cover"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    {/* العنوان + الشارات */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-black text-slate-900 group-hover:text-teal-700 transition">
                        {s.requestedBook.title}
                      </span>

                      {s.type === "POINTS" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                          <Coins className="h-3 w-3" />
                          {toArabicNumerals(s.pointsCost)} نقطة
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                          <ArrowRightLeft className="h-3 w-3" />
                          مقابل كتاب
                        </span>
                      )}

                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-black border ${
                          s.status === "COMPLETED"
                            ? "bg-teal-50 text-teal-700 border-teal-200"
                            : ["CANCELLED", "REJECTED"].includes(s.status)
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : s.status === "DISPUTED"
                            ? "bg-rose-100 text-rose-800 border-rose-300"
                            : "bg-slate-100 text-slate-700 border-slate-200"
                        }`}
                      >
                        {s.status === "DISPUTED" && (
                          <ShieldAlert className="inline h-3 w-3 ml-1" />
                        )}
                        {SWAP_STATUS_LABELS[s.status] || s.status}
                      </span>
                    </div>

                    {/* الكتاب المعروض بالمقابل (إن وجد) */}
                    {s.type === "DIRECT" && s.offeredBook && (
                      <p className="truncate text-xs text-slate-500 mt-0.5">
                        المقابل:{" "}
                        <span className="font-bold text-slate-700">
                          {s.offeredBook.title}
                        </span>
                      </p>
                    )}

                    {/* الأطراف */}
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-400">
                      <span className="inline-flex items-center gap-1 font-bold text-slate-700">
                        <User className="h-3 w-3 text-teal-600" />
                        <span>{s.requester.name}</span>
                      </span>

                      <span className="text-slate-300">←</span>

                      <span className="font-bold text-slate-700">
                        {s.receiver.name}
                      </span>
                    </div>

                    {/* التاريخ بسطر مستقل */}
                    <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-400">
                      <Clock className="h-3 w-3" />
                      <span>{formatArabicDate(s.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {/* سهم الدخول لتفاصيل الطلب */}
                <ChevronLeft className="h-4 w-4 shrink-0 text-slate-400 group-hover:-translate-x-1 group-hover:text-teal-600 transition" />
              </div>
            </Link>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-3">
              <ArrowRightLeft className="h-6 w-6" />
            </div>
            <p className="text-xs font-black text-slate-700">
              لا توجد طلبات مطابقة
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              جرّب تغيير كلمات البحث أو الفلتر المحدد.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}