import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import BackButton from "@/components/BackButton";
import AdminSwapCardActions from "@/components/AdminSwapCardActions";
import { Search, X, ArrowRightLeft, Coins, Clock, CheckCircle2, Ban, ShieldAlert } from "lucide-react";
import { toArabicNumerals } from "@/lib/formatting";

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
  const validStatus = ["ALL", "ACTIVE", "COMPLETED", "CANCELLED"].includes(status) ? status : "ALL";

  const whereClause: any = {};

  if (validStatus === "ACTIVE") {
    whereClause.status = { in: ["PENDING", "ACCEPTED", "AWAITING_DELIVERY", "AWAITING_CONFIRMATION", "DISPUTED"] };
  } else if (validStatus === "COMPLETED") {
    whereClause.status = "COMPLETED";
  } else if (validStatus === "CANCELLED") {
    whereClause.status = { in: ["CANCELLED", "REJECTED"] };
  }

  if (searchQuery) {
    whereClause.OR = [
      { requestedBook: { title: { contains: searchQuery, mode: "insensitive" } } },
      { requester: { name: { contains: searchQuery, mode: "insensitive" } } },
      { receiver: { name: { contains: searchQuery, mode: "insensitive" } } },
    ];
  }

  const [swaps, totalCount, activeCount, completedCount, cancelledCount] = await Promise.all([
    prisma.swap.findMany({
      where: whereClause,
      select: {
        id: true,
        type: true,
        status: true,
        pointsCost: true,
        createdAt: true,
        requestedBook: { select: { title: true, points: true } },
        offeredBook: { select: { title: true } },
        requester: { select: { id: true, name: true } },
        receiver: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.swap.count(),
    prisma.swap.count({ where: { status: { in: ["PENDING", "ACCEPTED", "AWAITING_DELIVERY", "AWAITING_CONFIRMATION", "DISPUTED"] } } }),
    prisma.swap.count({ where: { status: "COMPLETED" } }),
    prisma.swap.count({ where: { status: { in: ["CANCELLED", "REJECTED"] } } }),
  ]);

  return (
    <main dir="rtl" className="mx-auto w-full max-w-4xl space-y-4 px-3 sm:px-4 pt-4 pb-28 text-[#0F172A]">
      {/* 🧭 الهيدر العصري الموحد */}
      <header className="relative flex items-center justify-between rounded-3xl border border-slate-200/80 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 text-white shadow-md">
        <div className="absolute top-4 right-4 z-20">
          <BackButton />
        </div>

        <div className="flex flex-col items-center w-full text-center pt-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400/10 border border-amber-400/20 text-amber-400 mb-2 shadow-inner">
            <ArrowRightLeft className="h-6 w-6" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            إدارة الطلبات
          </h1>
          <p className="mt-1 text-xs text-slate-300">
            متابعة العمليات الجارية، التحقق من الحالات، وإلغاء الطلبات المتعثرة
          </p>
        </div>
      </header>

      {/* 🔍 شريط البحث والفلترة الموحد */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 rounded-2xl border border-slate-200/80 bg-white p-2 shadow-2xs">
        <div className="grid grid-cols-4 gap-1 rounded-xl bg-slate-100 p-1 text-center text-xs font-bold md:w-[26rem] shrink-0">
          <Link
            href={`/admin/swaps?status=ALL${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ""}`}
            className={`rounded-lg py-2 transition flex items-center justify-center gap-1 ${
              validStatus === "ALL"
                ? "bg-white text-slate-900 shadow-2xs font-black"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <span>الكل ({toArabicNumerals(totalCount)})</span>
          </Link>
          <Link
            href={`/admin/swaps?status=ACTIVE${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ""}`}
            className={`rounded-lg py-2 transition flex items-center justify-center gap-1 ${
              validStatus === "ACTIVE"
                ? "bg-white text-teal-700 shadow-2xs font-black"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Clock className="h-3.5 w-3.5 hidden sm:inline" />
            <span>جارية ({toArabicNumerals(activeCount)})</span>
          </Link>
          <Link
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

        <form action="/admin/swaps" method="GET" className="flex items-center gap-1.5 flex-1">
          <input type="hidden" name="status" value={validStatus} />
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              name="q"
              defaultValue={searchQuery}
              placeholder="ابحث باسم الكتاب أو الأطراف..."
              className="w-full rounded-xl bg-slate-50 pr-9 pl-8 py-2 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-teal-600"
            />
            {searchQuery && (
              <Link
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
            className="rounded-xl bg-slate-900 hover:bg-slate-800 px-4 py-2 text-xs font-black text-white transition cursor-pointer"
          >
            بحث
          </button>
        </form>
      </div>

      {/* 🔄 القائمة الاحترافية الموحدة للطلبات */}
      <section className="rounded-3xl border border-slate-200/80 bg-white shadow-2xs divide-y divide-slate-100">
        {swaps.length > 0 ? (
          swaps.map((s) => (
            <article
              key={s.id}
              className="p-4 sm:p-5 hover:bg-slate-50/50 transition first:rounded-t-3xl last:rounded-b-3xl text-right"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                
                <div className="min-w-0 flex-1 space-y-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-black text-slate-900">
                      {s.requestedBook.title}
                    </span>
                    
                    {s.type === "POINTS" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                        <Coins className="h-3 w-3" />
                        بـ {toArabicNumerals(s.pointsCost)} نقطة
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                        <ArrowRightLeft className="h-3 w-3" />
                        مقابل كتاب
                      </span>
                    )}

                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black ${
                      s.status === "COMPLETED" ? "bg-teal-50 text-teal-700 border border-teal-200" :
                      ["CANCELLED", "REJECTED"].includes(s.status) ? "bg-rose-50 text-rose-700 border border-rose-200" :
                      s.status === "DISPUTED" ? "bg-rose-100 text-rose-800 border border-rose-300" :
                      "bg-slate-100 text-slate-700 border border-slate-200"
                    }`}>
                      {s.status === "DISPUTED" && <ShieldAlert className="inline h-3 w-3 ml-1" />}
                      {SWAP_STATUS_LABELS[s.status] || s.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
                    <div className="flex items-center gap-1.5 rounded-lg bg-slate-50 border border-slate-100 px-2 py-1">
                      <span className="text-slate-400">الطالب:</span>
                      <Link href={`/users/${s.requester.id}`} className="text-slate-800 hover:text-teal-600 transition">
                        {s.requester.name}
                      </Link>
                    </div>
                    <span className="text-slate-300">←</span>
                    <div className="flex items-center gap-1.5 rounded-lg bg-slate-50 border border-slate-100 px-2 py-1">
                      <span className="text-slate-400">المالك:</span>
                      <Link href={`/users/${s.receiver.id}`} className="text-slate-800 hover:text-teal-600 transition">
                        {s.receiver.name}
                      </Link>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-5 shrink-0 border-t sm:border-0 border-slate-100 pt-3 sm:pt-0 mt-2 sm:mt-0">
                  <span className="text-[10px] text-slate-400 font-medium">
                    {formatArabicDate(s.createdAt)}
                  </span>
                  
                  {/* ⋮ زر الإجراءات المنسدل الأنيق */}
                  <AdminSwapCardActions swapId={s.id} status={s.status} />
                </div>

              </div>
            </article>
          ))
        ) : (
          <div className="p-12 text-center text-xs text-slate-400 font-bold">
            لا توجد طلبات تبادل مطابقة لخيارات البحث.
          </div>
        )}
      </section>
    </main>
  );
}