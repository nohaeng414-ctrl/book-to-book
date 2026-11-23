import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import RequestTabs from "@/components/RequestTabs";
import { SwapStatus, SwapType } from "@/generated/prisma-full";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import UserAvatar from "@/components/UserAvatar";
import Link from "next/link";
import {
  BookOpen,
  ArrowRightLeft,
  Coins,
  ChevronLeft,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Inbox,
  Send,
  Clock,
} from "lucide-react";

const statusMeta: Record<
  SwapStatus,
  {
    label: string;
    badgeClass: string;
    dotClass: string;
    pulse?: boolean;
  }
> = {
  PENDING: {
    label: "بانتظار الموافقة",
    badgeClass: "border-amber-200/80 bg-amber-50 text-amber-800",
    dotClass: "bg-amber-500",
    pulse: true,
  },
  ACCEPTED: {
    label: "تمت الموافقة",
    badgeClass: "border-teal-200/80 bg-teal-50 text-teal-800",
    dotClass: "bg-teal-500",
  },
  AWAITING_DELIVERY: {
    label: "بانتظار التسليم",
    badgeClass: "border-sky-200/80 bg-sky-50 text-sky-800",
    dotClass: "bg-sky-500",
    pulse: true,
  },
  AWAITING_CONFIRMATION: {
    label: "بانتظار تأكيد الاستلام",
    badgeClass: "border-indigo-200/80 bg-indigo-50 text-indigo-800",
    dotClass: "bg-indigo-500",
    pulse: true,
  },
  COMPLETED: {
    label: "مكتمل",
    badgeClass: "border-emerald-200/80 bg-emerald-50 text-emerald-800",
    dotClass: "bg-emerald-500",
  },
  REJECTED: {
    label: "مرفوض",
    badgeClass: "border-slate-200 bg-slate-100 text-slate-600",
    dotClass: "bg-slate-400",
  },
  CANCELLED: {
    label: "ملغى",
    badgeClass: "border-slate-200 bg-slate-100 text-slate-600",
    dotClass: "bg-slate-400",
  },
  DISPUTED: {
    label: "قيد المراجعة",
    badgeClass: "border-rose-200 bg-rose-50 text-rose-700",
    dotClass: "bg-rose-500",
    pulse: true,
  },
};

const dateFormatter = new Intl.DateTimeFormat("ar-SA", {
  month: "short",
  day: "numeric",
  timeZone: "Asia/Riyadh",
});

function formatRelativeTime(date: Date): string {
  const diffSeconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSeconds < 60) return "الآن";

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    if (diffMinutes === 1) return "منذ دقيقة";
    if (diffMinutes === 2) return "منذ دقيقتين";
    if (diffMinutes <= 10) return `منذ ${diffMinutes} دقائق`;
    return `منذ ${diffMinutes} دقيقة`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    if (diffHours === 1) return "منذ ساعة";
    if (diffHours === 2) return "منذ ساعتين";
    if (diffHours <= 10) return `منذ ${diffHours} ساعات`;
    return `منذ ${diffHours} ساعة`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "أمس";
  if (diffDays === 2) return "منذ يومين";
  if (diffDays <= 7) return `منذ ${diffDays} أيام`;

  return dateFormatter.format(date);
}

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    created?: string;
    tab?: string;
    reviewed?: string;
    reviewError?: string;
  }>;
}) {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");
  const currentUserId = (session.user as { id?: string }).id;
  if (!currentUserId) redirect("/login");

  const params = await searchParams;
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      points: true,
      initiatedSwaps: {
        where: { hiddenForRequester: false },
        select: {
          id: true,
          type: true,
          pointsCost: true,
          status: true,
          updatedAt: true,
          requestedBook: {
            select: { id: true, title: true, author: true },
          },
          receiverId: true,
          receiver: { select: { name: true } },
        },
        orderBy: { updatedAt: "desc" },
      },
      receivedSwaps: {
        where: { hiddenForReceiver: false },
        select: {
          id: true,
          type: true,
          pointsCost: true,
          status: true,
          updatedAt: true,
          requestedBook: {
            select: { id: true, title: true, author: true },
          },
          requesterId: true,
          requester: { select: { name: true } },
        },
        orderBy: { updatedAt: "desc" },
      },
    },
  });

  if (!user) redirect("/login");
const activeTab =
    params.tab === "outgoing" || Boolean(params.created)
      ? "outgoing"
      : "incoming";
  async function hideCancelledSwap(formData: FormData) {
    "use server";
    const currentSession = await auth();
    const email = currentSession?.user?.email;
    if (!email) redirect("/login");
    const currentUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (!currentUser) redirect("/login");

    const id = String(formData.get("swapId") || "");
    const swap = await prisma.swap.findFirst({
      where: {
        id,
        status: { in: [SwapStatus.CANCELLED, SwapStatus.REJECTED] },
        OR: [{ requesterId: currentUser.id }, { receiverId: currentUser.id }],
      },
      select: { requesterId: true, receiverId: true },
    });

    if (!swap) {
      redirect(
        "/requests?error=" +
          encodeURIComponent("لا يمكن حذف هذا الطلب من القائمة.")
      );
    }

    await prisma.swap.updateMany({
      where: {
        id,
        status: { in: [SwapStatus.CANCELLED, SwapStatus.REJECTED] },
      },
      data:
        swap.requesterId === currentUser.id
          ? { hiddenForRequester: true }
          : { hiddenForReceiver: true },
    });
    revalidatePath("/requests");
  }

  const isOngoingSwap = (status: SwapStatus) =>
    status !== SwapStatus.CANCELLED &&
    status !== SwapStatus.REJECTED &&
    status !== SwapStatus.COMPLETED;

  const renderCard = (
    swap: {
      id: string;
      type: SwapType;
      pointsCost: number;
      status: SwapStatus;
      updatedAt: Date;
      counterpartyId: string;
      counterpartyName: string;
      requestedBook: {
        id: string;
        title: string;
        author: string;
      };
    },
    incoming: boolean
  ) => {
    const meta = statusMeta[swap.status];
    const statusLabel =
      swap.status === SwapStatus.PENDING
        ? incoming
          ? "بانتظار موافقتك"
          : "بانتظار الرد"
        : meta.label;

    const canRemove =
      swap.status === SwapStatus.CANCELLED ||
      swap.status === SwapStatus.REJECTED;

    return (
      <article
        key={swap.id}
        className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-2xs transition hover:border-slate-300 hover:shadow-xs"
      >
        {/* رأس البطاقة: الطرف الآخر + حالة الطلب */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <UserAvatar
              userId={swap.counterpartyId}
              name={swap.counterpartyName}
              size="sm"
            />
            <div className="min-w-0">
              <span className="block truncate text-xs sm:text-sm font-black text-slate-900">
                {swap.counterpartyName}
              </span>
              <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                <Clock className="h-2.5 w-2.5 shrink-0" />
                {formatRelativeTime(swap.updatedAt)}
              </span>
            </div>
          </div>

          <span
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black ${meta.badgeClass}`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${meta.dotClass} ${
                meta.pulse ? "animate-pulse" : ""
              }`}
            />
            {statusLabel}
          </span>
        </div>

        {/* جسم البطاقة: تفاصيل الكتاب ونوع التبادل */}
        <Link
          href={`/swaps/${swap.id}`}
          className="group flex items-center gap-3.5 p-4 transition hover:bg-slate-50/70"
        >
          <div className="relative flex h-20 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200/80 bg-slate-100 text-slate-400 shadow-2xs">
            <BookOpen className="absolute z-0 h-4 w-4" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/books/${swap.requestedBook.id}/cover`}
              alt={swap.requestedBook.title}
              loading="lazy"
              className="relative z-10 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </div>

          <div className="min-w-0 flex-1 space-y-1.5">
            <div>
              <h3 className="truncate text-sm font-black text-slate-900 group-hover:text-teal-700 transition-colors">
                {swap.requestedBook.title}
              </h3>
              {swap.requestedBook.author && (
                <p className="truncate text-[11px] font-medium text-slate-500 mt-0.5">
                  {swap.requestedBook.author}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              {swap.type === SwapType.POINTS ? (
                <span className="inline-flex items-center gap-1 rounded-lg border border-amber-200/70 bg-amber-50/70 px-2 py-0.5 text-[10px] font-black text-amber-700">
                  <Coins className="h-3 w-3" />
                  {swap.pointsCost} نقطة
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-lg border border-teal-200/70 bg-teal-50/70 px-2 py-0.5 text-[10px] font-black text-teal-700">
                  <ArrowRightLeft className="h-3 w-3" />
                  تبادل مباشر
                </span>
              )}


            </div>
          </div>

          <ChevronLeft className="h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:-translate-x-0.5 group-hover:text-teal-600" />
        </Link>

        {/* شريط سفلي أنيق لإزالة الطلبات الملغاة أو المرفوضة */}
        {canRemove && (
          <div className="flex items-center justify-end border-t border-slate-100 bg-slate-50/60 px-4 py-2">
            <form action={hideCancelledSwap}>
              <input type="hidden" name="swapId" value={swap.id} />
              <button
                type="submit"
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-bold text-rose-600 transition hover:bg-rose-50 active:scale-95"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>إزالة من القائمة</span>
              </button>
            </form>
          </div>
        )}
      </article>
    );
  };

  const activeIncomingCount = user.receivedSwaps.filter((swap) =>
    isOngoingSwap(swap.status)
  ).length;

  const activeOutgoingCount = user.initiatedSwaps.filter((swap) =>
    isOngoingSwap(swap.status)
  ).length;

  return (
    <main
      dir="rtl"
      className="mx-auto w-full max-w-2xl space-y-5 px-3 sm:px-4 pt-4 pb-28 text-[#0F172A]"
    >
   

      {/* رسائل التنبيه والحالة */}
      {params.created && (
        <div
          role="status"
          className="flex items-center justify-center gap-2 rounded-2xl border border-teal-200 bg-teal-50 p-3.5 text-center text-xs font-bold text-teal-700"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          تم إرسال طلبك بنجاح.
        </div>
      )}
      {params.reviewed && (
        <div
          role="status"
          className="flex items-center justify-center gap-2 rounded-2xl border border-teal-200 bg-teal-50 p-3.5 text-center text-xs font-bold text-teal-700"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          شكراً لك، تم إرسال التقييم بنجاح.
        </div>
      )}
      {params.reviewError && (
        <div
          role="alert"
          className="flex items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-center text-xs font-bold text-rose-700"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          {params.reviewError}
        </div>
      )}
      {params.error && (
        <div
          role="alert"
          className="flex items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-center text-xs font-bold text-rose-700"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          {params.error}
        </div>
      )}

      <RequestTabs
        initialTab={activeTab}
        incomingCount={activeIncomingCount}
        outgoingCount={activeOutgoingCount}
        incoming={
          user.receivedSwaps.length ? (
            <div className="space-y-3.5">
              {user.receivedSwaps.map((swap) =>
                renderCard(
                  {
                    ...swap,
                    counterpartyId: swap.requesterId,
                    counterpartyName: swap.requester.name,
                  },
                  true
                )
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white px-6 py-14 text-center shadow-2xs">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <Inbox className="h-5 w-5" />
              </div>
              <p className="text-sm font-black text-slate-800">
                لا توجد طلبات واردة حالياً
              </p>
              <p className="mt-1 max-w-xs text-xs font-medium leading-relaxed text-slate-400">
                عندما يطلب أحد القرّاء أحد كتبك المعروضة، سيظهر الطلب هنا فوراً.
              </p>
            </div>
          )
        }
        outgoing={
          user.initiatedSwaps.length ? (
            <div className="space-y-3.5">
              {user.initiatedSwaps.map((swap) =>
                renderCard(
                  {
                    ...swap,
                    counterpartyId: swap.receiverId,
                    counterpartyName: swap.receiver.name,
                  },
                  false
                )
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white px-6 py-14 text-center shadow-2xs">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <Send className="h-5 w-5" />
              </div>
              <p className="text-sm font-black text-slate-800">
                لم ترسل أي طلبات بعد
              </p>
              <p className="mt-1 max-w-xs text-xs font-medium leading-relaxed text-slate-400">
                تصفّح الكتب المتاحة في مدينتك وابدأ أول عملية تبادل.
              </p>
              <Link
                href="/"
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-black text-white transition hover:bg-slate-800 active:scale-95"
              >
                <BookOpen className="h-3.5 w-3.5" />
                <span>تصفّح الكتب</span>
              </Link>
            </div>
          )
        }
      />
    </main>
  );
}