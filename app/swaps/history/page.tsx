import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ArrowRight, BookOpen, Coins, Repeat } from "lucide-react";
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
    <main dir="rtl" className="mx-auto max-w-3xl space-y-6 px-4 py-8 text-[#0F172A]">
      <header className="flex items-center gap-3">
        <Link href="/profile" aria-label="العودة إلى الحساب" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#E2E8F0] bg-white text-[#334155] hover:bg-[#F8FAFC]">
          <ArrowRight className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-extrabold">سجل التبادل</h1>
          <p className="mt-1 text-sm text-[#64748B]">الكتب والنقاط في عملياتك المكتملة.</p>
        </div>
      </header>

      {swaps.length === 0 ? (
        <section className="rounded-3xl border border-dashed border-[#CBD5E1] bg-white px-5 py-14 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#F1F5F9] text-[#64748B]"><BookOpen className="h-6 w-6" /></span>
          <h2 className="mt-4 text-base font-extrabold">لا توجد عمليات مكتملة بعد</h2>
          <p className="mt-1 text-sm text-[#64748B]">ستظهر هنا الكتب والنقاط بعد تأكيد الاستلام.</p>
          <Link href="/" className="mt-5 inline-flex rounded-xl bg-[#1E293B] px-5 py-3 text-sm font-bold text-white hover:bg-[#334155]">اكتشف الكتب</Link>
        </section>
      ) : (
        <section className="space-y-3" aria-label="العمليات المكتملة">
          {swaps.map((swap) => {
            const isRequester = swap.requesterId === user.id;
            const pointsChange = swap.pointTransactions.reduce((total, transaction) => total + transaction.amount, 0);

            return (
              <article key={swap.id} className="rounded-3xl border border-[#E2E8F0] bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#F1F5F9] text-[#334155]">
                      {swap.type === "POINTS" ? <Coins className="h-5 w-5" /> : <Repeat className="h-5 w-5" />}
                    </span>
                    <div>
                      <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">اكتملت العملية</span>
                      <h2 className="mt-2 text-base font-extrabold">
                        {swap.type === "POINTS"
                          ? isRequester ? `اقتنيت: ${swap.requestedBook.title}` : `تم بيع: ${swap.requestedBook.title}`
                          : isRequester
                            ? `استلمت ${swap.requestedBook.title} وقدّمت ${swap.offeredBook?.title ?? "كتاباً"}`
                            : `استلمت ${swap.offeredBook?.title ?? "كتاباً"} وقدّمت ${swap.requestedBook.title}`}
                      </h2>
                    </div>
                  </div>
                  {swap.completedAt && <time dateTime={swap.completedAt.toISOString()} className="text-xs text-[#64748B]">{dateFormatter.format(swap.completedAt)}</time>}
                </div>

                {swap.type === "POINTS" && (
                  <p className={`mt-4 flex items-center gap-2 rounded-xl p-3 text-sm font-bold ${pointsChange >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>
                    <Coins className="h-4 w-4" />
                    {pointsChange >= 0 ? `أضيفت ${pointsChange} نقطة إلى رصيدك` : `استُخدمت ${Math.abs(pointsChange)} نقطة`}
                  </p>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href={`/books/${swap.requestedBook.id}`} className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-xs font-bold text-[#334155] hover:bg-[#F8FAFC]">{swap.requestedBook.title}</Link>
                  {swap.offeredBook && <Link href={`/books/${swap.offeredBook.id}`} className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-xs font-bold text-[#334155] hover:bg-[#F8FAFC]">{swap.offeredBook.title}</Link>}
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
