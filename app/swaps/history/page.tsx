import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  ArrowRight,
  ArrowRightLeft,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  Coins,
  Repeat,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function SwapHistoryPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!user) redirect("/login");

  const swaps = await prisma.swap.findMany({
    where: {
      status: "COMPLETED",
      OR: [{ requesterId: user.id }, { receiverId: user.id }],
    },
    include: {
      requestedBook: { select: { id: true, title: true } },
      offeredBook: { select: { id: true, title: true } },
      pointTransactions: {
        where: { userId: user.id },
        select: { amount: true },
      },
    },
    orderBy: { completedAt: "desc" },
  });

  const dateFormatter = new Intl.DateTimeFormat("ar", { dateStyle: "medium" });

  return (
    <main
      dir="rtl"
      className="mx-auto w-full max-w-3xl space-y-6 px-3 sm:px-4 py-6 pb-24 text-[#0F172A]"
    >
      {/* شريط الرجوع للبروفايل مطابق لصفحة الإعدادات */}
      <header className="relative -mt-6 mb-6 flex h-14 w-full items-center justify-between rounded-b-2xl border-x border-b border-slate-200 bg-white px-3 shadow-2xs">
        <Link
          href="/profile"
          title="رجوع"
          aria-label="العودة إلى الحساب"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100 active:bg-slate-200 transition-colors"
        >
          <ArrowRight className="h-5 w-5" />
        </Link>
        <h1 className="text-base font-extrabold text-slate-900 tracking-tight select-none">
          سجل التبادل
        </h1>
        <div className="w-10" aria-hidden="true" />
      </header>

     

      {swaps.length === 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white px-5 py-12 text-center shadow-2xs">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-500">
            <BookOpen className="h-5 w-5" />
          </span>
          <h2 className="mt-3 text-sm font-extrabold text-slate-900">
            لا توجد عمليات مكتملة بعد
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            ستظهر هنا الكتب والنقاط بعد تأكيد الاستلام.
          </p>
          <Link
            href="/"
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-slate-800 active:scale-95"
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>اكتشف الكتب</span>
          </Link>
        </section>
      ) : (
        <section
          aria-label="العمليات المكتملة"
          className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs"
        >
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              تفاصيل العمليات
            </h2>
          </div>

          <div className="divide-y divide-slate-100">
            {swaps.map((swap) => {
              const isRequester = swap.requesterId === user.id;
              const pointsChange = swap.pointTransactions.reduce(
                (total, transaction) => total + transaction.amount,
                0
              );

              return (
                <article
                  key={swap.id}
                  className="p-4 transition hover:bg-slate-50/60 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600">
                        {swap.type === "POINTS" ? (
                          <Coins className="h-4 w-4 text-amber-600" />
                        ) : (
                          <Repeat className="h-4 w-4 text-teal-600" />
                        )}
                      </span>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>اكتملت العملية</span>
                          </span>

                          {swap.completedAt && (
                            <time
                              dateTime={swap.completedAt.toISOString()}
                              className="text-[11px] font-medium text-slate-400"
                            >
                              {dateFormatter.format(swap.completedAt)}
                            </time>
                          )}
                        </div>

                        <h3 className="mt-1.5 text-xs sm:text-sm font-bold leading-snug text-slate-900">
                          {swap.type === "POINTS"
                            ? isRequester
                              ? `اقتنيت: ${swap.requestedBook.title}`
                              : `تم بيع: ${swap.requestedBook.title}`
                            : isRequester
                            ? `استلمت ${swap.requestedBook.title} وقدّمت ${
                                swap.offeredBook?.title ?? "كتاباً"
                              }`
                            : `استلمت ${
                                swap.offeredBook?.title ?? "كتاباً"
                              } وقدّمت ${swap.requestedBook.title}`}
                        </h3>
                      </div>
                    </div>
                  </div>

                  {swap.type === "POINTS" && (
                    <div
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold ${
                        pointsChange >= 0
                          ? "border-emerald-200/70 bg-emerald-50/70 text-emerald-700"
                          : "border-amber-200/70 bg-amber-50/70 text-amber-800"
                      }`}
                    >
                      <Coins className="h-3.5 w-3.5 shrink-0" />
                      <span>
                        {pointsChange >= 0
                          ? `أضيفت ${pointsChange} نقطة إلى رصيدك`
                          : `استُخدمت ${Math.abs(pointsChange)} نقطة`}
                      </span>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/books/${swap.requestedBook.id}`}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
                    >
                      <BookOpen className="h-3.5 w-3.5 text-slate-500" />
                      <span>{swap.requestedBook.title}</span>
                      <ChevronLeft className="h-3.5 w-3.5 text-slate-400" />
                    </Link>

                    {swap.offeredBook && (
                      <Link
                        href={`/books/${swap.offeredBook.id}`}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
                      >
                        <BookOpen className="h-3.5 w-3.5 text-slate-500" />
                        <span>{swap.offeredBook.title}</span>
                        <ChevronLeft className="h-3.5 w-3.5 text-slate-400" />
                      </Link>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}