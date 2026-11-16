import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { SwapError, transitionSwap } from "@/lib/swaps";
import RequestTabs from "@/components/RequestTabs";
import { SwapStatus } from "@/generated/prisma-full";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import ReviewForm from "@/components/ReviewForm";
import UserAvatar from "@/components/UserAvatar";
import Link from "next/link";
import PendingSubmitButton from "@/components/PendingSubmitButton";

import { BookOpen, Coins, MapPin, ArrowLeftRight } from "lucide-react";
import { toArabicNumerals } from "@/lib/formatting";

const statusLabels: Record<SwapStatus, string> = {
  PENDING: "بانتظار الموافقة",
  ACCEPTED: "تمت الموافقة",
  REJECTED: "مرفوض",
  AWAITING_DELIVERY: "بانتظار التسليم",
  AWAITING_CONFIRMATION: "بانتظار تأكيد الاستلام",
  COMPLETED: "مكتمل",
  CANCELLED: "ملغى",
  DISPUTED: "قيد المراجعة",
};

const statusBadgeStyles: Record<SwapStatus, string> = {
  PENDING: "border-amber-200 bg-amber-50 text-amber-800",
  ACCEPTED: "border-blue-200 bg-blue-50 text-blue-800",
  AWAITING_DELIVERY: "border-blue-200 bg-blue-50 text-blue-800",
  AWAITING_CONFIRMATION: "border-indigo-200 bg-indigo-50 text-indigo-800",
  COMPLETED: "border-teal-200 bg-teal-50 text-teal-800",
  REJECTED: "border-slate-200 bg-slate-100 text-slate-600",
  CANCELLED: "border-slate-200 bg-slate-100 text-slate-600",
  DISPUTED: "border-rose-200 bg-rose-50 text-rose-800",
};

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
  const savedLanguage =
    (await cookies()).get("book-language")?.value ??
    (session.user as { language?: string }).language;
  const locale = savedLanguage === "en" ? "en-US" : "ar-SA";

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      points: true,
      initiatedSwaps: {
        where: { hiddenForRequester: false },
        select: {
          id: true,
          requesterId: true,
          receiverId: true,
          status: true,
          type: true,
          pointsCost: true,
          offeredBookId: true,
          offeredBookIds: true,
          cancelReason: true,
          createdAt: true,
          reviews: { where: { reviewerId: currentUserId }, select: { id: true } },
          requestedBook: {
            select: { id: true, title: true, points: true },
          },
          offeredBook: {
            select: { id: true, title: true, points: true },
          },
          receiver: { select: { name: true, city: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      receivedSwaps: {
        where: { hiddenForReceiver: false },
        select: {
          id: true,
          requesterId: true,
          receiverId: true,
          status: true,
          type: true,
          pointsCost: true,
          offeredBookId: true,
          offeredBookIds: true,
          cancelReason: true,
          createdAt: true,
          reviews: { where: { reviewerId: currentUserId }, select: { id: true } },
          requestedBook: {
            select: { id: true, title: true, points: true },
          },
          offeredBook: {
            select: { id: true, title: true, points: true },
          },
          requester: { select: { name: true, city: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!user) redirect("/login");
  const activeTab = params.tab === "outgoing" ? "outgoing" : "incoming";

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

    if (!swap)
      redirect(
        "/requests?error=" +
          encodeURIComponent("لا يمكن حذف هذا الطلب من القائمة.")
      );

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

  async function updateSwap(formData: FormData) {
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
    const action = String(formData.get("action") || "");
    const offeredBookId = String(formData.get("offeredBookId") || "");
    const tab = formData.get("tab") === "outgoing" ? "outgoing" : "incoming";

    if (!["accept", "reject", "cancel", "delivery", "receipt"].includes(action)) {
      redirect(`/requests?tab=${tab}&error=إجراء+غير+صالح`);
    }

    try {
      await transitionSwap(
        currentUser.id,
        id,
        action as "accept" | "reject" | "cancel" | "delivery" | "receipt",
        offeredBookId || undefined
      );
    } catch (error) {
      if (!(error instanceof SwapError)) throw error;
      const message =
        error instanceof SwapError ? error.message : "تعذر تحديث الطلب حالياً.";
      redirect(`/requests?tab=${tab}&error=${encodeURIComponent(message)}`);
    }

    revalidatePath("/requests");
    revalidatePath("/my-books");
    revalidatePath("/profile");
    revalidatePath("/");
  }

  const isOngoingSwap = (status: SwapStatus) =>
    status !== SwapStatus.CANCELLED &&
    status !== SwapStatus.REJECTED &&
    status !== SwapStatus.COMPLETED;

  const card = (
    swap: {
      id: string;
      createdAt: Date;
      status: SwapStatus;
      type: string;
      pointsCost: number;
      offeredBookIds: string[];
      cancelReason: string | null;
      reviews: { id: string }[];
      counterpartyId: string;
      requestedBook: {
        id: string;
        title: string;
        points: number;
      };
      offeredBook: {
        id: string;
        title: string;
        points: number;
      } | null;
      offeredBookId: string | null;
      counterpartyName: string;
      counterpartyCity: string;
    },
    incoming: boolean
  ) => {
    return (
      <article
        key={swap.id}
        className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs space-y-3"
      >
        {/* 1. السطر العلوي: الطرف الآخر + موقعه + شارة الحالة ونوع الطلب */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <Link
            href={`/users/${swap.counterpartyId}`}
            className="flex items-center gap-2.5 min-w-0 group"
          >
            <UserAvatar
              userId={swap.counterpartyId}
              name={swap.counterpartyName}
              size="sm"
            />
            <div className="min-w-0">
              <span className="block text-xs sm:text-sm font-black text-slate-900 group-hover:text-teal-700 truncate">
                {swap.counterpartyName}
              </span>
              <span className="flex items-center gap-1 text-[11px] text-slate-400">
                {swap.counterpartyCity && (
                  <>
                    <MapPin className="h-3 w-3 text-teal-600 shrink-0" />
                    <span className="truncate">{swap.counterpartyCity}</span>
                    <span>·</span>
                  </>
                )}
                <time dateTime={swap.createdAt.toISOString()}>
                  {new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
                    swap.createdAt
                  )}
                </time>
              </span>
            </div>
          </Link>

          <div className="flex flex-col items-end gap-1 shrink-0">
            <span
              className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
                statusBadgeStyles[swap.status] ||
                "border-slate-200 bg-slate-100 text-slate-700"
              }`}
            >
              {statusLabels[swap.status]}
            </span>

            <span
              className={`inline-flex items-center gap-1 text-[10px] font-bold ${
                swap.type === "POINTS" ? "text-teal-700" : "text-blue-700"
              }`}
            >
              {swap.type === "POINTS" ? (
                <>
                  <Coins className="h-3 w-3" />
                  <span>طلب بالنقاط</span>
                </>
              ) : (
                <>
                  <ArrowLeftRight className="h-3 w-3" />
                  <span>كتاب بكتاب</span>
                </>
              )}
            </span>
          </div>
        </div>

        {/* 2. الكتاب المطلوب */}
        <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-2.5">
          <Link
            href={`/books/${swap.requestedBook.id}`}
            className="relative flex h-16 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-200 text-slate-400"
          >
            <BookOpen className="h-4 w-4 absolute z-0" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/books/${swap.requestedBook.id}/cover`}
              alt={swap.requestedBook.title}
              loading="lazy"
              className="relative z-10 h-full w-full object-cover"
            />
          </Link>

          <div className="min-w-0 flex-1 space-y-0.5">
            <span className="text-[10px] font-bold text-slate-400 block">
              {incoming
                ? "كتابك المطلوب"
                : `الكتاب المطلوب`}
            </span>
            <Link
              href={`/books/${swap.requestedBook.id}`}
              className="block text-xs sm:text-sm font-black text-slate-900 hover:text-teal-700 truncate"
            >
              {swap.requestedBook.title}
            </Link>
          </div>
        </div>

        {/* 3. المقابل: النقاط أو الكتاب الآخر */}
        {swap.type === "POINTS" ? (
          <div className="flex items-center justify-between rounded-xl bg-teal-50/70 border border-teal-100 px-3 py-2">
            <span className="text-xs font-bold text-teal-800">المقابل:</span>
            <span className="flex items-center gap-1.5 text-xs font-black text-teal-950">
              <Coins className="h-4 w-4 text-teal-600 shrink-0" />
              <span>{toArabicNumerals(swap.pointsCost)} نقاط</span>
            </span>
          </div>
        ) : swap.offeredBook ? (
          <div className="flex items-center gap-3 rounded-xl bg-blue-50/40 border border-blue-100 p-2.5">
            <Link
              href={`/books/${swap.offeredBook.id}`}
              className="relative flex h-14 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-200 text-slate-400"
            >
              <BookOpen className="h-3.5 w-3.5 absolute z-0" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/books/${swap.offeredBook.id}/cover`}
                alt={swap.offeredBook.title}
                loading="lazy"
                className="relative z-10 h-full w-full object-cover"
              />
            </Link>
            <div className="min-w-0 flex-1 space-y-0.5">
              <span className="text-[10px] font-bold text-blue-600 block">
                {incoming
                  ? `الكتاب المعروض`
                  : "كتابك المعروض"}
              </span>
              <Link
                href={`/books/${swap.offeredBook.id}`}
                className="block text-xs font-black text-slate-900 hover:text-teal-700 truncate"
              >
                {swap.offeredBook.title}
              </Link>
            </div>
          </div>
        )  : null}

        {swap.cancelReason === "NO_AVAILABLE_OFFER" && (
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
            أُلغي الطلب تلقائياً لأن الكتب المعروضة لم تعد متاحة.
          </p>
        )}

        {/* 4. أزرار الإجراءات */}
        <div className="space-y-2 pt-1">
          {/* أ) للطلبات الواردة المعلقة: زر قبول الطلب (أخضر) + زر رفض الطلب (أحمر) بجوار بعضهما دائماً */}
          {incoming && swap.status === SwapStatus.PENDING && (
            <div className="grid grid-cols-2 gap-2">
              {swap.type === "POINTS" ? (
                <form action={updateSwap}>
                  <input type="hidden" name="swapId" value={swap.id} />
                  <input type="hidden" name="action" value="accept" />
                  <input type="hidden" name="tab" value="incoming" />
                 <PendingSubmitButton
                                   pendingText="جارٍ القبول..."
                                   className="w-full rounded-xl bg-teal-600 py-3 text-xs font-black text-white shadow-2xs transition hover:bg-teal-700 cursor-pointer"
                                 >
                                   قبول الطلب
                                 </PendingSubmitButton>
                </form>
              ) : (
                <Link
                  href={`/swaps/${swap.id}`}
                  className="flex w-full items-center justify-center rounded-xl bg-emerald-600 py-3 text-xs font-black text-white hover:bg-emerald-700 transition"
                >
                  قبول الطلب
                </Link>
              )}

      <form action={updateSwap}>
                <input type="hidden" name="swapId" value={swap.id} />
                <input type="hidden" name="action" value="reject" />
                <input type="hidden" name="tab" value="incoming" />
                <button
                  type="submit"
                  className="w-full rounded-xl bg-red-600 py-3 text-xs font-black text-white hover:bg-red-700 transition cursor-pointer shadow-2xs"
                >
                  رفض الطلب
                </button>
              </form>
            </div>
          )}

          {/* ب) للطلبات الصادرة المعلقة: زر إلغاء الطلب باللون الأحمر */}
          {!incoming && swap.status === SwapStatus.PENDING && (
          <form action={updateSwap}>
              <input type="hidden" name="swapId" value={swap.id} />
              <input type="hidden" name="action" value="cancel" />
              <input type="hidden" name="tab" value="outgoing" />
              <button
                type="submit"
                className="w-full rounded-xl bg-red-600 py-3 text-xs font-black text-white hover:bg-red-700 transition cursor-pointer shadow-2xs"
              >
                إلغاء الطلب
              </button>
            </form>
          )}

          {/* ج) تأكيد التسليم / الاستلام */}
          {incoming && swap.status === SwapStatus.AWAITING_DELIVERY && (
            <form action={updateSwap}>
              <input type="hidden" name="swapId" value={swap.id} />
              <input type="hidden" name="action" value="delivery" />
              <input type="hidden" name="tab" value="incoming" />
              <button
                type="submit"
                className="w-full rounded-xl bg-slate-900 py-3 text-xs font-bold text-white hover:bg-slate-800 transition cursor-pointer"
              >
                تأكيد تسليم الكتاب
              </button>
            </form>
          )}

          {!incoming && swap.status === SwapStatus.AWAITING_CONFIRMATION && (
            <form action={updateSwap}>
              <input type="hidden" name="swapId" value={swap.id} />
              <input type="hidden" name="action" value="receipt" />
              <input type="hidden" name="tab" value="outgoing" />
              <button
                type="submit"
                className="w-full rounded-xl bg-slate-900 py-3 text-xs font-bold text-white hover:bg-slate-800 transition cursor-pointer"
              >
                تأكيد استلام الكتاب
              </button>
            </form>
          )}

          {/* د) زر تفاصيل الطلب لحاله بسطر مستقل */}
          <Link
            href={`/swaps/${swap.id}`}
            className="flex w-full items-center justify-center rounded-xl border border-slate-300 bg-white py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
          >
            تفاصيل الطلب
          </Link>

          {/* هـ) زر حذف الطلب (للملغى أو المرفوض) */}
          {(swap.status === SwapStatus.CANCELLED ||
            swap.status === SwapStatus.REJECTED) && (
            <form action={hideCancelledSwap}>
              <input type="hidden" name="swapId" value={swap.id} />
              <button
                             type="submit"
                  className="w-full rounded-xl border border-red-200 bg-red-50 py-3 text-xs font-bold text-red-600 hover:bg-red-100 transition cursor-pointer"
                >
                حذف الطلب
              </button>
            </form>
          )}
        </div>

        {swap.status === SwapStatus.COMPLETED && swap.reviews.length === 0 && (
          <ReviewForm swapId={swap.id} tab={incoming ? "incoming" : "outgoing"} />
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
      className="mx-auto max-w-2xl space-y-4 px-3 sm:px-4 py-4 pb-28 text-[#0F172A]"
    >
      {params.created && (
        <p
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-700"
        >
          تم إرسال طلبك بنجاح.
        </p>
      )}
      {params.reviewed && (
        <p
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-700"
        >
          شكراً لك، تم إرسال التقييم.
        </p>
      )}
      {params.reviewError && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700"
        >
          {params.reviewError}
        </p>
      )}
      {params.error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700"
        >
          {params.error}
        </p>
      )}

      <RequestTabs
        initialTab={activeTab}
        incomingCount={activeIncomingCount}
        outgoingCount={activeOutgoingCount}
        incoming={
          user.receivedSwaps.length ? (
            user.receivedSwaps.map((swap) =>
              card(
                {
                  ...swap,
                  counterpartyId: swap.requesterId,
                  counterpartyName: swap.requester.name,
                  counterpartyCity: swap.requester.city,
                },
                true
              )
            )
          ) : (
            <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-xs text-slate-400 font-medium">
              لا توجد طلبات واردة.
            </p>
          )
        }
        outgoing={
          user.initiatedSwaps.length ? (
            user.initiatedSwaps.map((swap) =>
              card(
                {
                  ...swap,
                  counterpartyId: swap.receiverId,
                  counterpartyName: swap.receiver.name,
                  counterpartyCity: swap.receiver.city,
                },
                false
              )
            )
          ) : (
            <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-xs text-slate-400 font-medium">
              لم ترسل أي طلبات بعد.
            </p>
          )
        }
      />
    </main>
  );
}
