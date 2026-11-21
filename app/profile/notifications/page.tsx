import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NotificationType, SwapStatus } from "@/generated/prisma-full";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Bell,
  BellOff,
  BookOpen,
  ArrowRightLeft,
  CheckCircle2,
  Star,
  CheckCheck,
  ChevronLeft,
  Inbox,
} from "lucide-react";

const PAGE_PATH = "/profile/notifications";

const statusMeta: Record<
  SwapStatus,
  { label: string; badgeClass: string }
> = {
  PENDING: {
    label: "بانتظار الرد",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200/80",
  },
  ACCEPTED: {
    label: "تمت الموافقة",
    badgeClass: "bg-teal-50 text-teal-700 border-teal-200/80",
  },
  AWAITING_DELIVERY: {
    label: "بانتظار التسليم",
    badgeClass: "bg-sky-50 text-sky-700 border-sky-200/80",
  },
  AWAITING_CONFIRMATION: {
    label: "بانتظار تأكيد الاستلام",
    badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200/80",
  },
  COMPLETED: {
    label: "اكتمل التبادل",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
  },
  REJECTED: {
    label: "رُفض الطلب",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200/80",
  },
  CANCELLED: {
    label: "أُلغي الطلب",
    badgeClass: "bg-slate-100 text-slate-600 border-slate-200/80",
  },
  DISPUTED: {
    label: "توجد مشكلة",
    badgeClass: "bg-rose-100 text-rose-800 border-rose-300",
  },
};

const notificationTypeMeta: Record<
  NotificationType,
  { icon: typeof Bell; wrapClass: string }
> = {
  NEW_BOOK_FROM_FOLLOWED: {
    icon: BookOpen,
    wrapClass: "bg-teal-50 text-teal-700 border-teal-200/70",
  },
  SWAP_REQUEST: {
    icon: ArrowRightLeft,
    wrapClass: "bg-blue-50 text-blue-700 border-blue-200/70",
  },
  SWAP_ACCEPTED: {
    icon: CheckCircle2,
    wrapClass: "bg-emerald-50 text-emerald-700 border-emerald-200/70",
  },
  REVIEW_RECEIVED: {
    icon: Star,
    wrapClass: "bg-amber-50 text-amber-600 border-amber-200/70",
  },
};

const dateFormatter = new Intl.DateTimeFormat("ar-SA", {
  dateStyle: "medium",
  timeStyle: "short",
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

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const params = await searchParams;
  const activeTab =
    params.tab === "unread" || params.tab === "swaps" ? params.tab : "all";

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!user) redirect("/login");

  async function markAllAsRead() {
    "use server";
    const current = await auth();
    if (!current?.user?.email) redirect("/login");

    const account = await prisma.user.findUnique({
      where: { email: current.user.email },
      select: { id: true },
    });
    if (!account) redirect("/login");

    await prisma.notification.updateMany({
      where: { userId: account.id, isRead: false },
      data: { isRead: true },
    });

    revalidatePath(PAGE_PATH);
    revalidatePath("/", "layout");
  }

  async function openNotification(notificationId: string, targetLink: string) {
    "use server";
    const current = await auth();
    if (!current?.user?.email) redirect("/login");

    const account = await prisma.user.findUnique({
      where: { email: current.user.email },
      select: { id: true },
    });

    if (account) {
      await prisma.notification.updateMany({
        where: {
          id: notificationId,
          userId: account.id,
          isRead: false,
        },
        data: { isRead: true },
      });
    }

    revalidatePath(PAGE_PATH);
    revalidatePath("/", "layout");

    const safeLink = targetLink.startsWith("/") ? targetLink : PAGE_PATH;
    redirect(safeLink);
  }

  const [notifications, unreadCount, swaps] = await Promise.all([
    prisma.notification.findMany({
      where: {
        userId: user.id,
        ...(activeTab === "unread" ? { isRead: false } : {}),
      },
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        link: true,
        isRead: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.notification.count({
      where: { userId: user.id, isRead: false },
    }),
    prisma.swap.findMany({
      where: { OR: [{ requesterId: user.id }, { receiverId: user.id }] },
      include: {
        requestedBook: { select: { title: true } },
        requester: { select: { name: true } },
        receiver: { select: { name: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 30,
    }),
  ]);

  const showNotifications = activeTab === "all" || activeTab === "unread";
  const showSwaps = activeTab === "all" || activeTab === "swaps";

  return (
    <main
      dir="rtl"
      className="mx-auto w-full max-w-2xl space-y-5 px-3 sm:px-4 pt-4 pb-28 text-[#0F172A]"
    >
      {/* الهيدر الموحّد */}
      <header className="relative -mt-6 mb-6 flex h-14 w-full items-center justify-between rounded-b-2xl border-x border-b border-slate-200 bg-white px-3 shadow-2xs">
        <Link
          href="/settings"
          title="رجوع"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100 active:bg-slate-200 transition-colors"
        >
          <ArrowRight className="h-5 w-5" />
        </Link>

        <div className="flex items-center gap-2">
          <h1 className="text-base font-extrabold text-slate-900 tracking-tight select-none">
            الإشعارات
          </h1>
          {unreadCount > 0 && (
            <span className="rounded-full bg-teal-600 px-2 py-0.5 text-[10px] font-black text-white">
              {unreadCount}
            </span>
          )}
        </div>

        <div className="w-10" aria-hidden="true" />
      </header>

      {/* شريط التصفية + زر تحديد الكل كمقروء */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <nav
          aria-label="تصفية الإشعارات"
          className="inline-flex rounded-2xl border border-slate-200 bg-white p-1 shadow-2xs"
        >
          <Link
            href={PAGE_PATH}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
              activeTab === "all"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            الكل
          </Link>
          <Link
            href={`${PAGE_PATH}?tab=unread`}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
              activeTab === "unread"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>غير مقروءة</span>
            {unreadCount > 0 && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-black ${
                  activeTab === "unread"
                    ? "bg-white/20 text-white"
                    : "bg-teal-50 text-teal-700"
                }`}
              >
                {unreadCount}
              </span>
            )}
          </Link>
          <Link
            href={`${PAGE_PATH}?tab=swaps`}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
              activeTab === "swaps"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            الطلبات
          </Link>
        </nav>

        {unreadCount > 0 && (
          <form action={markAllAsRead}>
            <button
              type="submit"
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-teal-700 transition hover:border-teal-200 hover:bg-teal-50 active:scale-95"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              <span>تحديد الكل كمقروء</span>
            </button>
          </form>
        )}
      </div>

      {/* قسم الإشعارات */}
      {showNotifications && (
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xs">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-teal-600" />
              <h2 className="text-xs font-black text-slate-800">
                {activeTab === "unread" ? "الإشعارات غير المقروءة" : "أحدث الإشعارات"}
              </h2>
            </div>
            <span className="text-[11px] font-bold text-slate-400">
              {notifications.length}
            </span>
          </div>

          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <BellOff className="h-5 w-5" />
              </div>
              <p className="text-sm font-black text-slate-700">
                {activeTab === "unread"
                  ? "أنت مطّلع على كل شيء!"
                  : "لا توجد إشعارات حالياً"}
              </p>
              <p className="mt-1 text-xs font-medium text-slate-400">
                {activeTab === "unread"
                  ? "لقد قرأت جميع إشعاراتك."
                  : "ستظهر هنا تنبيهات الكتب الجديدة وطلبات التبادل والتقييمات."}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {notifications.map((notification) => {
                const meta = notificationTypeMeta[notification.type] ?? {
                  icon: Bell,
                  wrapClass: "bg-slate-100 text-slate-600 border-slate-200",
                };
                const Icon = meta.icon;

                return (
                  <li key={notification.id}>
                    <form
                      action={openNotification.bind(
                        null,
                        notification.id,
                        notification.link || PAGE_PATH
                      )}
                    >
                      <button
                        type="submit"
                        className={`group flex w-full cursor-pointer items-start gap-3.5 px-4 py-4 text-right transition sm:px-5 ${
                          notification.isRead
                            ? "bg-white hover:bg-slate-50/80"
                            : "bg-teal-50/35 hover:bg-teal-50/60"
                        }`}
                      >
                        <div
                          className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${meta.wrapClass}`}
                        >
                          <Icon className="h-4.5 w-4.5" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs sm:text-sm font-black text-slate-900 leading-snug">
                              {notification.title}
                            </p>
                            <div className="flex shrink-0 items-center gap-1.5">
                              {!notification.isRead && (
                                <span
                                  title="غير مقروء"
                                  className="h-2 w-2 rounded-full bg-teal-600"
                                />
                              )}
                              <time
                                dateTime={notification.createdAt.toISOString()}
                                title={dateFormatter.format(notification.createdAt)}
                                className="text-[10px] font-bold text-slate-400"
                              >
                                {formatRelativeTime(notification.createdAt)}
                              </time>
                            </div>
                          </div>

                          <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-slate-600">
                            {notification.body}
                          </p>
                        </div>

                        <ChevronLeft className="mt-2.5 h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:-translate-x-0.5 group-hover:text-slate-500" />
                      </button>
                    </form>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {/* قسم تحديثات الطلبات */}
      {showSwaps && (
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xs">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4 text-slate-700" />
              <h2 className="text-xs font-black text-slate-800">
                تحديثات الطلبات
              </h2>
            </div>
            <span className="text-[11px] font-bold text-slate-400">
              {swaps.length}
            </span>
          </div>

          {swaps.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <Inbox className="h-5 w-5" />
              </div>
              <p className="text-sm font-black text-slate-700">
                لا توجد تحديثات على الطلبات بعد
              </p>
              <p className="mt-1 text-xs font-medium text-slate-400">
                عند إرسال أو استقبال طلب مبادلة، ستظهر جميع التحديثات هنا.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {swaps.map((swap) => {
                const incoming = swap.receiverId === user.id;
                const otherPerson = incoming
                  ? swap.requester.name
                  : swap.receiver.name;
                const status = statusMeta[swap.status];

                return (
                  <li key={swap.id}>
                    <Link
                      href={`/requests?tab=${incoming ? "incoming" : "outgoing"}`}
                      className="group flex items-start gap-3.5 px-4 py-4 transition hover:bg-slate-50/80 sm:px-5"
                    >
                      <div
                        className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${
                          incoming
                            ? "border-teal-200/70 bg-teal-50 text-teal-700"
                            : "border-slate-200 bg-slate-50 text-slate-600"
                        }`}
                      >
                        <ArrowRightLeft className="h-4 w-4" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs sm:text-sm font-black text-slate-900">
                            {incoming
                              ? `طلب وارد من ${otherPerson}`
                              : `طلبك لدى ${otherPerson}`}
                          </p>
                          <span
                            className={`rounded-full border px-2.5 py-0.5 text-[10px] font-black ${status.badgeClass}`}
                          >
                            {status.label}
                          </span>
                        </div>

                        <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-600">
                          <BookOpen className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                          <span className="truncate">
                            {swap.requestedBook.title}
                          </span>
                        </p>

                        <time
                          dateTime={swap.updatedAt.toISOString()}
                          title={dateFormatter.format(swap.updatedAt)}
                          className="mt-1.5 block text-[10px] font-bold text-slate-400"
                        >
                          {formatRelativeTime(swap.updatedAt)}
                        </time>
                      </div>

                      <ChevronLeft className="mt-2.5 h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:-translate-x-0.5 group-hover:text-slate-500" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}
    </main>
  );
}