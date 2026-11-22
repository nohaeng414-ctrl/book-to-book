import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import BackButton from "@/components/BackButton";
import UserAvatar from "@/components/UserAvatar";
import ConfirmReceiptModal from "@/components/ConfirmReceiptModal";
import SwapReviewModal from "@/components/SwapReviewModal";
import SwapChat from "@/components/SwapChat";
import CancelAcceptedSwapButton from "@/components/CancelAcceptedSwapButton";
import AdminSwapCancelButton from "@/components/AdminSwapCancelButton";
import SelectBookModal from "@/components/SelectBookModal";
import SwapDisputeModal from "@/components/SwapDisputeModal";
import { updateSwapStatusAction } from "@/app/actions/swapWorkflow";
import {
  autoCompleteExpiredSwap,
  AUTO_CONFIRM_MS,
  COMPLAINT_WINDOW_MS,
} from "@/lib/swaps";
import {
  Coins,
  MapPin,
  XCircle,
  ArrowLeftRight,
  CheckCircle2,
  Clock,
  ShieldAlert,
} from "lucide-react";
import { toArabicNumerals } from "@/lib/formatting";

function formatRemainingDuration(remainingMs: number): string {
  const totalMinutes = Math.max(1, Math.ceil(remainingMs / (1000 * 60)));
  if (totalMinutes < 60) {
    return `${toArabicNumerals(totalMinutes)} دقيقة`;
  }
  const hours = Math.ceil(remainingMs / (1000 * 60 * 60));
  return `${toArabicNumerals(hours)} ساعة`;
}

const CONDITION_LABELS: Record<string, string> = {
  LIKE_NEW: "شبه جديد",
  GOOD: "جيد جداً",
  ACCEPTABLE: "مقبول",
};

function getConditionLabel(condition: string | null | undefined): string {
  if (!condition) return "";
  return CONDITION_LABELS[condition] || condition;
}

const STATUS_STEP: Record<string, number> = {
  PENDING: 1,
  ACCEPTED: 2,
  AWAITING_DELIVERY: 2,
  AWAITING_CONFIRMATION: 3,
  COMPLETED: 4,
  REJECTED: 0,
  CANCELLED: 0,
  DISPUTED: 0,
};

const ADMIN_CANCELLABLE_STATUSES = [
  "PENDING",
  "ACCEPTED",
  "AWAITING_DELIVERY",
  "AWAITING_CONFIRMATION",
  "DISPUTED",
];

export default async function SwapDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ id }, query, session, adminUser] = await Promise.all([
    params,
    searchParams,
    auth(),
    isAdmin(),
  ]);
  if (!session?.user?.email) redirect("/login");

  const currentUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, name: true },
  });

  if (!currentUser) redirect("/login");

  // إتمام الطلب تلقائياً إذا انقضت مهلة 48 ساعة على تأكيد الطرف الأول
  await autoCompleteExpiredSwap(id);

  const swap = await prisma.swap.findUnique({
    where: { id },
    include: {
      requester: {
        select: {
          id: true,
          name: true,
          city: true,
          neighborhood: true,
          points: true,
          reservedPoints: true,
        },
      },
      receiver: {
        select: { id: true, name: true, city: true, neighborhood: true },
      },
      requestedBook: {
        select: {
          id: true,
          title: true,
          author: true,
          condition: true,
          points: true,
        },
      },
      offeredBook: {
        select: {
          id: true,
          title: true,
          author: true,
          condition: true,
          points: true,
        },
      },
      reviews: {
        select: { reviewerId: true, rating: true, comment: true },
      },
      messages: {
        include: { sender: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
        take: 30,
      },
    },
  });

  if (!swap) notFound();

  const isRequester = swap.requesterId === currentUser.id;
  const isReceiver = swap.receiverId === currentUser.id;
  const isParticipant = isRequester || isReceiver;
  const isAdminOnly = adminUser && !isParticipant;

  if (!isParticipant && !adminUser) redirect("/swaps/history");

  const otherParty = isRequester ? swap.receiver : swap.requester;
  const otherPartyLocation = [otherParty.neighborhood, otherParty.city]
    .filter(Boolean)
    .join("، ");

  const myReview = isParticipant
    ? swap.reviews.find((r) => r.reviewerId === currentUser.id) || null
    : null;

  const candidateBooks =
    swap.type === "DIRECT" && isReceiver && swap.status === "PENDING"
      ? await prisma.book.findMany({
          where: {
            ownerId: swap.requesterId,
            isAvailable: true,
            isDeleted: false,
          },
          select: {
            id: true,
            title: true,
            author: true,
            points: true,
            condition: true,
          },
          orderBy: { createdAt: "desc" },
        })
      : [];

  // جلب جميع الكتب المعروضة المعتمدة بعد قبول الطلب
  const acceptedOfferedIds =
    swap.type === "DIRECT" && swap.status !== "PENDING"
      ? [
          ...new Set(
            [
              ...(swap.offeredBookIds ?? []),
              ...(swap.offeredBookId ? [swap.offeredBookId] : []),
            ].filter(Boolean)
          ),
        ]
      : [];

  const acceptedOfferedBooks =
    acceptedOfferedIds.length > 0
      ? await prisma.book.findMany({
          where: { id: { in: acceptedOfferedIds } },
          select: {
            id: true,
            title: true,
            author: true,
            points: true,
            condition: true,
          },
        })
      : swap.offeredBook
      ? [swap.offeredBook]
      : [];

  const requesterAvailablePoints = Math.max(
    0,
    swap.requester.points - swap.requester.reservedPoints
  );

  const swapId = swap.id;
  const currentStep = STATUS_STEP[swap.status] ?? 1;

  const isDeliveryStage =
    swap.status === "ACCEPTED" ||
    swap.status === "AWAITING_DELIVERY" ||
    swap.status === "AWAITING_CONFIRMATION";

  const isCompleted = swap.status === "COMPLETED";

  const now = new Date();
  const myConfirmed = isReceiver
    ? swap.deliveryConfirmed
    : swap.receiptConfirmed;
  const otherConfirmed = isReceiver
    ? swap.receiptConfirmed
    : swap.deliveryConfirmed;

  const isAwaitingSecondConfirm =
    swap.status === "AWAITING_CONFIRMATION" &&
    (myConfirmed || otherConfirmed);

  const remainingMs = isAwaitingSecondConfirm
    ? Math.max(0, swap.updatedAt.getTime() + AUTO_CONFIRM_MS - now.getTime())
    : AUTO_CONFIRM_MS;

  const remainingLabel = formatRemainingDuration(remainingMs);

  // يُسمح لمقدّم الطلب بإلغائه قبل الموافقة، وللطرفين بعد القبول قبل تأكيد التسليم
  const canCancelSwap =
    isParticipant &&
    ((swap.status === "PENDING" && !isReceiver) ||
      ((swap.status === "ACCEPTED" || swap.status === "AWAITING_DELIVERY") &&
        !swap.deliveryConfirmed &&
        !swap.receiptConfirmed));

  // زر رفع الشكوى متاح أثناء مرحلة الاستلام والتسليم ولمدة 7 أيام بعد الاكتمال
  const completedReferenceDate = swap.completedAt ?? swap.updatedAt;
  const isWithinComplaintWindow =
    isCompleted &&
    now.getTime() - completedReferenceDate.getTime() <= COMPLAINT_WINDOW_MS;

  const canShowComplaintButton =
    isParticipant && (isDeliveryStage || isWithinComplaintWindow);

  // هل يحق للأدمن إلغاء هذا الطلب إدارياً؟
  const canAdminCancel =
    adminUser && ADMIN_CANCELLABLE_STATUSES.includes(swap.status);

  async function handleAccept() {
    "use server";
    await updateSwapStatusAction(swapId, "ACCEPT");
  }

  async function handleReject() {
    "use server";
    await updateSwapStatusAction(swapId, "REJECT", "رفض الطلب");
  }

  const steps = [
    { id: 1, title: "إرسال الطلب" },
    { id: 2, title: "موافقة الطرفين" },
    { id: 3, title: "الاستلام والتسليم" },
    { id: 4, title: "اكتمال الطلب" },
  ];

  return (
    <main
      dir="rtl"
      className="mx-auto w-full max-w-2xl space-y-3.5 px-3 sm:px-4 pb-28 text-[#0F172A]"
    >
      {/* 1. الشريط العلوي */}
      <header className="relative flex h-14 w-full items-center justify-between rounded-b-2xl border-x border-b border-slate-200 bg-white px-3 shadow-2xs">
        <div className="shrink-0 z-10">
          <BackButton />
        </div>

        <h1 className="absolute inset-x-0 text-center text-sm sm:text-base font-black text-slate-900 pointer-events-none">
          تفاصيل الطلب
        </h1>
      </header>

      {/* شارة وضع معاينة الإدارة */}
      {isAdminOnly && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-amber-200 bg-amber-50/80 px-3.5 py-2.5 text-xs">
          <div className="flex items-center gap-2 font-black text-amber-900">
            <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
            <span>وضع معاينة الإدارة</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600">
            <Link
              href={`/users/${swap.requester.id}`}
              className="text-slate-900 hover:text-teal-700 hover:underline"
            >
              {swap.requester.name}
            </Link>
            <span className="text-slate-400">←</span>
            <Link
              href={`/users/${swap.receiver.id}`}
              className="text-slate-900 hover:text-teal-700 hover:underline"
            >
              {swap.receiver.name}
            </Link>
          </div>
        </div>
      )}

      {query.error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700"
        >
          {query.error}
        </p>
      )}

      {/* 2. شريط مراحل التبادل */}
      {currentStep > 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs">
          <div className="grid grid-cols-4 gap-1">
            {steps.map((s) => {
              const isDone = currentStep >= s.id;
              const isCurrent = currentStep === s.id;
              return (
                <div key={s.id} className="flex flex-col items-center text-center">
                  <div
                    className={`mb-1.5 flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-black transition ${
                      isDone
                        ? "bg-teal-600 text-white"
                        : "bg-slate-100 text-slate-400"
                    } ${isCurrent ? "ring-4 ring-teal-100" : ""}`}
                  >
                    {isDone ? "✓" : toArabicNumerals(s.id)}
                  </div>
                  <span
                    className={`text-[10px] sm:text-[11px] font-bold ${
                      isDone ? "text-slate-800" : "text-slate-400"
                    }`}
                  >
                    {s.title}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      ) : (
        <section className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-xs font-bold text-slate-600">
          <XCircle className="h-4 w-4 shrink-0 text-rose-500" />
          <span>
            {swap.status === "DISPUTED"
              ? "هذا الطلب قيد المراجعة الإدارية."
              : swap.status === "REJECTED"
              ? "تم رفض هذا الطلب."
              : swap.cancelReason
              ? `تم إلغاء هذا الطلب (${swap.cancelReason}).`
              : "تم إلغاء هذا الطلب."}
          </span>
        </section>
      )}

      {/* 3. بطاقة تفاصيل الطرف الآخر والكتب */}
      <section className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <Link
            href={`/users/${otherParty.id}`}
            className="flex items-center gap-2.5 min-w-0 group"
          >
            <UserAvatar userId={otherParty.id} name={otherParty.name} size="sm" />
            <div className="min-w-0">
              <span className="block text-xs sm:text-sm font-black text-slate-900 group-hover:text-teal-700 truncate">
                {otherParty.name}
              </span>
              {otherPartyLocation && (
                <span className="flex items-center gap-0.5 text-[11px] text-slate-400">
                  <MapPin className="h-3 w-3 text-teal-600 shrink-0" />
                  <span className="truncate">{otherPartyLocation}</span>
                </span>
              )}
            </div>
          </Link>

          <span
            className={`shrink-0 inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold ${
              swap.type === "POINTS"
                ? "bg-teal-50 text-teal-800 border border-teal-200/70"
                : "bg-blue-50 text-blue-800 border border-blue-200/70"
            }`}
          >
            {swap.type === "POINTS" ? (
              <>
                <Coins className="h-3.5 w-3.5 text-teal-600" />
                <span>طلب بالنقاط</span>
              </>
            ) : (
              <>
                <ArrowLeftRight className="h-3.5 w-3.5 text-blue-600" />
                <span>كتاب بكتاب</span>
              </>
            )}
          </span>
        </div>

        {/* بطاقة الكتاب المطلوب */}
        <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-2.5">
          <Link
            href={`/books/${swap.requestedBook.id}`}
            className="relative h-16 w-12 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-200"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/books/${swap.requestedBook.id}/cover`}
              alt={swap.requestedBook.title}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          </Link>

          <div className="min-w-0 flex-1 space-y-0.5">
            <span className="text-[10px] font-bold text-slate-400 block">
              {isReceiver ? "كتابك المطلوب" : "الكتاب المطلوب"}
            </span>
            <Link
              href={`/books/${swap.requestedBook.id}`}
              className="block text-xs sm:text-sm font-black text-slate-900 hover:text-teal-700 truncate"
            >
              {swap.requestedBook.title}
            </Link>
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              {swap.requestedBook.author && (
                <span className="truncate">{swap.requestedBook.author}</span>
              )}
              <span className="text-[10px] font-bold text-teal-700">
                {toArabicNumerals(swap.requestedBook.points)} نقاط
                {getConditionLabel(swap.requestedBook.condition)
                  ? ` · ${getConditionLabel(swap.requestedBook.condition)}`
                  : ""}
              </span>
            </div>
          </div>
        </div>

        {/* المقابل: نقاط أو كتب معروضة (+ فرق نقاط إن وُجد) */}
        {swap.type === "POINTS" ? (
          <div className="flex items-center justify-between rounded-xl bg-teal-50/70 border border-teal-100 px-3.5 py-2.5">
            <span className="text-xs font-bold text-teal-800">المقابل:</span>
            <span className="flex items-center gap-1.5 text-xs font-black text-teal-950">
              <Coins className="h-4 w-4 text-teal-600" />
              {toArabicNumerals(swap.pointsCost)} نقاط
            </span>
          </div>
        ) : acceptedOfferedBooks.length > 0 ? (
          <div className="space-y-2">
            {acceptedOfferedBooks.map((book) => (
              <div
                key={book.id}
                className="flex items-center gap-3 rounded-xl bg-blue-50/40 border border-blue-100 p-2.5"
              >
                <Link
                  href={`/books/${book.id}`}
                  className="relative h-16 w-12 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-200"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/books/${book.id}/cover`}
                    alt={book.title}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                </Link>

                <div className="min-w-0 flex-1 space-y-0.5">
                  <span className="text-[10px] font-bold text-blue-600 block">
                    {isRequester ? "كتابك المعروض" : "الكتاب المعروض"}
                  </span>
                  <Link
                    href={`/books/${book.id}`}
                    className="block text-xs sm:text-sm font-black text-slate-900 hover:text-teal-700 truncate"
                  >
                    {book.title}
                  </Link>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    {book.author && (
                      <span className="truncate">{book.author}</span>
                    )}
                    <span className="text-[10px] font-bold text-blue-700">
                      {toArabicNumerals(book.points)} نقاط
                      {getConditionLabel(book.condition)
                        ? ` · ${getConditionLabel(book.condition)}`
                        : ""}
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {swap.pointsCost > 0 && (
              <div className="flex items-center justify-between rounded-xl bg-teal-50/70 border border-teal-100 px-3.5 py-2">
                <span className="text-xs font-bold text-teal-800">
                  + فرق النقاط المضاف:
                </span>
                <span className="flex items-center gap-1.5 text-xs font-black text-teal-950">
                  <Coins className="h-3.5 w-3.5 text-teal-600" />
                  {toArabicNumerals(swap.pointsCost)} نقاط
                </span>
              </div>
            )}
          </div>
        ) : null}
      </section>

      {/* 4. الإجراء الأساسي: القبول أو الرفض في مرحلة الانتظار */}
      {swap.status === "PENDING" && isReceiver && (
        <div className="space-y-2.5">
          {swap.type === "DIRECT" ? (
            candidateBooks.length > 0 ? (
              <SelectBookModal
                swapId={swap.id}
                candidateBooks={candidateBooks}
                ownerName={otherParty.name}
                requestedBookPoints={swap.requestedBook.points}
                requesterAvailablePoints={requesterAvailablePoints}
              />
            ) : (
              <div className="space-y-2.5">
                <p className="rounded-xl border border-slate-200 bg-white p-3 text-xs font-semibold text-slate-600">
                  لا توجد كتب متاحة حالياً في مكتبة {otherParty.name} للتبادل.
                </p>
                <form action={handleReject}>
                  <button
                    type="submit"
                    className="w-full rounded-xl bg-red-600 py-3 text-xs font-black text-white shadow-2xs transition hover:bg-red-700 cursor-pointer"
                  >
                    رفض الطلب
                  </button>
                </form>
              </div>
            )
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <form action={handleAccept}>
                <button
                  type="submit"
                  className="w-full rounded-xl bg-emerald-600 py-3 text-xs font-black text-white shadow-2xs transition hover:bg-emerald-700 cursor-pointer"
                >
                  قبول الطلب
                </button>
              </form>
              <form action={handleReject}>
                <button
                  type="submit"
                  className="w-full rounded-xl bg-red-600 py-3 text-xs font-black text-white shadow-2xs transition hover:bg-red-700 cursor-pointer"
                >
                  رفض الطلب
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* 4ب. الإجراء الأساسي: زر تأكيد الاستلام/التسليم مع عدّاد 48 ساعة */}
      {isParticipant && isDeliveryStage && (
        <div className="space-y-2">
          {myConfirmed ? (
            <div className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3.5 text-xs font-black text-emerald-800">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>
                {swap.type === "POINTS" && isReceiver
                  ? "تم تأكيد التسليم من طرفك"
                  : "تم تأكيد الاستلام من طرفك"}{" "}
                — سيكتمل الطلب تلقائياً خلال {remainingLabel} ما لم يعترض{" "}
                {otherParty.name}
              </span>
            </div>
          ) : (
            <ConfirmReceiptModal
              swapId={swap.id}
              isReceiver={isReceiver}
              swapType={swap.type}
            />
          )}

          {otherConfirmed && !myConfirmed && (
            <p className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-amber-800">
              <Clock className="h-3.5 w-3.5 text-amber-600 shrink-0" />
              <span>
                أكّد {otherParty.name}{" "}
                {swap.type === "POINTS" && !isReceiver
                  ? "تسليم الكتاب"
                  : "استلام الكتاب"}{" "}
                — لديك {remainingLabel} للتأكيد أو رفع شكوى قبل الاكتمال
                التلقائي
              </span>
            </p>
          )}

          {!otherConfirmed && !myConfirmed && (
            <p className="text-center text-[11px] font-medium text-slate-500">
              عند تأكيد أحد الطرفين، تبدأ مهلة ٤٨ ساعة لتأكيد الطرف الآخر أو
              إتمام الطلب تلقائياً.
            </p>
          )}
        </div>
      )}

      {/* 5. التقييم بعد الاكتمال */}
      {isParticipant && isCompleted && (
        <SwapReviewModal
          swapId={swap.id}
          recipientId={otherParty.id}
          recipientName={otherParty.name}
          existingReview={myReview}
        />
      )}

      {/* 6. قسم التواصل والمحادثة */}
      {swap.status !== "CANCELLED" && swap.status !== "REJECTED" && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
          <h2 className="mb-3 text-sm font-black text-slate-800">
            محادثة الطلب
          </h2>
          <SwapChat
            swapId={swap.id}
            initialMessages={[...swap.messages].reverse()}
            currentUserId={currentUser.id}
          />
        </section>
      )}

      {/* 7. الإجراءات الثانوية والإدارية في أسفل الصفحة */}
      {(canCancelSwap || canShowComplaintButton || canAdminCancel) && (
        <footer className="space-y-2.5 border-t border-slate-200/80 pt-3">
          {canCancelSwap && <CancelAcceptedSwapButton swapId={swap.id} />}

          {canShowComplaintButton && (
            <SwapDisputeModal
              swapId={swap.id}
              reportedUserId={otherParty.id}
              reportedUserName={otherParty.name}
              isCompleted={isCompleted}
            />
          )}

          {canAdminCancel && (
            <AdminSwapCancelButton
              swapId={swap.id}
              bookTitle={swap.requestedBook.title}
            />
          )}
        </footer>
      )}
    </main>
  );
}