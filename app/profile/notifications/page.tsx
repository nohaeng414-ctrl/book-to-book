import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { SwapStatus } from "@/generated/prisma-full";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell, ArrowRight } from "lucide-react";

const statusLabels: Record<SwapStatus, string> = {
  PENDING: "بانتظار الرد",
  ACCEPTED: "تمت الموافقة",
  REJECTED: "رُفض الطلب",
  AWAITING_DELIVERY: "بانتظار تأكيد التسليم",
  AWAITING_CONFIRMATION: "بانتظار تأكيد الاستلام",
  COMPLETED: "اكتمل التبادل",
  CANCELLED: "أُلغي الطلب",
  DISPUTED: "توجد مشكلة في الطلب",
};

const dateFormatter = new Intl.DateTimeFormat("ar-SA", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Riyadh",
});

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");
  
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!user) redirect("/login");

  const swaps = await prisma.swap.findMany({
    where: { OR: [{ requesterId: user.id }, { receiverId: user.id }] },
    include: {
      requestedBook: { select: { title: true } },
      requester: { select: { name: true } },
      receiver: { select: { name: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 30,
  });

  return (
    <main
      dir="rtl"
      className="mx-auto w-full max-w-2xl space-y-5 px-3 sm:px-4 pt-4 pb-28 text-[#0F172A]"
    >
       {/* شريط الرجوع  */}
      <header className="relative -mt-6 mb-6 flex h-14 w-full items-center justify-between rounded-b-2xl border-x border-b border-slate-200 bg-white px-3 shadow-2xs">
        <Link
          href="/settings"
          title="رجوع"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100 active:bg-slate-200 transition-colors"
        >
          <ArrowRight className="h-5 w-5" />
        </Link>
        <h1 className="text-base font-extrabold text-slate-900 tracking-tight select-none">
          الإشعارات
        </h1>
        <div className="w-10" aria-hidden="true" />
      </header>

      {/* 📋 قائمة الإشعارات */}
      <section className="rounded-3xl border border-slate-200 bg-white p-2 shadow-2xs">
        {swaps.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400 font-bold">
            لا توجد تحديثات بعد.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {swaps.map((swap) => {
              const incoming = swap.receiverId === user.id;
              const otherPerson = incoming
                ? swap.requester.name
                : swap.receiver.name;
                
              return (
                <li key={swap.id}>
                  <Link
                    href={`/requests?tab=${incoming ? "incoming" : "outgoing"}`}
                    className="block rounded-2xl px-4 py-3.5 transition hover:bg-slate-50/70"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-black text-slate-900">
                        {incoming
                          ? `طلب وارد من ${otherPerson}`
                          : `تحديث على طلبك لدى ${otherPerson}`}
                      </p>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">
                        {statusLabels[swap.status]}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs font-medium text-slate-600">
                      الكتاب: {swap.requestedBook.title}
                    </p>
                    <time
                      dateTime={swap.updatedAt.toISOString()}
                      className="mt-1 block text-[10px] text-slate-400 font-bold"
                    >
                      {dateFormatter.format(swap.updatedAt)}
                    </time>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}