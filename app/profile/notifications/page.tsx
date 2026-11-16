import { auth } from "@/auth";
import ProfileSettingsPage from "@/components/ProfileSettingsPage";
import { prisma } from "@/lib/prisma";
import { SwapStatus } from "@/generated/prisma-full";
import Link from "next/link";
import { redirect } from "next/navigation";

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

const dateFormatter = new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Riyadh" });

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");
  const user = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
  if (!user) redirect("/login");

  const swaps = await prisma.swap.findMany({
    where: { OR: [{ requesterId: user.id }, { receiverId: user.id }] },
    include: { requestedBook: { select: { title: true } }, requester: { select: { name: true } }, receiver: { select: { name: true } } },
    orderBy: { updatedAt: "desc" },
    take: 30,
  });

  return (
    <ProfileSettingsPage title="الإشعارات" >
     
      {swaps.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[#CBD5E1] p-8 text-center text-sm text-[#64748B]">لا توجد تحديثات بعد.</p>
      ) : (
        <ul className="divide-y divide-[#F1F5F9]">
          {swaps.map((swap) => {
            const incoming = swap.receiverId === user.id;
            const otherPerson = incoming ? swap.requester.name : swap.receiver.name;
            return (
              <li key={swap.id}>
                <Link href={`/requests?tab=${incoming ? "incoming" : "outgoing"}`} className="block rounded-xl px-3 py-4 transition hover:bg-[#F8FAFC]">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-extrabold">{incoming ? `طلب وارد من ${otherPerson}` : `تحديث على طلبك لدى ${otherPerson}`}</p>
                    <span className="rounded-full bg-[#F1F5F9] px-2.5 py-1 text-[11px] font-bold text-[#475569]">{statusLabels[swap.status]}</span>
                  </div>
                  <p className="mt-1 text-xs text-[#64748B]">الكتاب: {swap.requestedBook.title}</p>
                  <time dateTime={swap.updatedAt.toISOString()} className="mt-1 block text-[11px] text-[#94A3B8]">{dateFormatter.format(swap.updatedAt)}</time>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </ProfileSettingsPage>
  );
}
