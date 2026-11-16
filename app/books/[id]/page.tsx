import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import BackButton from "@/components/BackButton";
import ReportModal from "@/components/ReportModal";
import ConfirmReceiptModal from "@/components/ConfirmReceiptModal";
import SwapReviewModal from "@/components/SwapReviewModal";
import SwapChat from "@/components/SwapChat";
import DisputeForm from "@/components/DisputeForm";
import CancelAcceptedSwapButton from "@/components/CancelAcceptedSwapButton";
import PendingSubmitButton from "@/components/PendingSubmitButton";
import {
  acceptSwapWithOfferAction,
  updateSwapStatusAction,
} from "@/app/actions/swapWorkflow";
import {
  Coins,
  CheckCircle2,
  MapPin,
  Clock,
  BookOpen,
  XCircle,
} from "lucide-react";
import { toArabicNumerals } from "@/lib/formatting";

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

export default async function SwapDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const currentUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, name: true },
  });

  if (!currentUser) redirect("/login");

  const swap = await prisma.swap.findUnique({
    where: { id },
    include: {
      requester: {
        select: { id: true, name: true, city: true, neighborhood: true },
      },
      receiver: {
        select: { id: true, name: true, city: true, neighborhood: true },
      },
      requestedBook: {
        select: {
          id: true,
          title: true,
          author: true,
          coverUrl: true,
          condition: true,
          points: true,
        },
      },
      offeredBook: {
        select: {
          id: true,
          title: true,
          author: true,
          coverUrl: true,
          condition: true,
          points: true,
        },
      },
      reviews: { select: { reviewerId: true } },
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

  if (!isRequester && !isReceiver) redirect("/swaps/history");

  const otherParty = isRequester ? swap.receiver : swap.requester;
  const hasReviewed = swap.reviews.some((r) => r.reviewerId === currentUser.id);

  const candidateIds = swap.offeredBookIds.length
    ? swap.offeredBookIds
    : swap.offeredBookId
    ? [swap.offeredBookId]
    : [];

  const candidateBooks =
    swap.type === "DIRECT" && isReceiver && swap.status === "PENDING"
      ? await prisma.book.findMany({
          where: {
            id: { in: candidateIds },
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
            coverUrl: true,
          },
          orderBy: { createdAt: "desc" },
        })
      : [];

  const swapId = swap.id;
  const currentStep = STATUS_STEP[swap.status] ?? 1;

  async function handleAccept() {
    "use server";
    await updateSwapStatusAction(swapId, "ACCEPT");
  }

  async function handleReject() {
    "use server";
    await updateSwapStatusAction(swapId, "REJECT", "اعتذار عن الطلب");
  }

  const steps = [
    { id: 1, title: "إرسال الطلب" },
    { id: 2, title: "موافقة الطرفين" },
    { id: 3, title: "الاستلام والتسليم" },
    { id: 4, title: "اكتمال الطلب" },
  ];

  const receiverLocation = [swap.receiver.neighborhood, swap.receiver.city]
    .filter(Boolean)
    .join("، ");
  const requesterLocation = [swap.requester.neighborhood, swap.requester.city]
    .filter(Boolean)
    .join("، ");

  return (
    <main
      dir="rtl"
      className="mx-auto w-full max-w-2xl space-y-3.5 px-3 sm:px-4 pb-28 text-[#0F172A]"
    >
      {/* 🧭 الهيدر القياسي */}
      <header className="relative flex h-14 w-full items-center justify-between rounded-b-2xl border-x border-b border-slate-200 bg-white px-3 shadow-2xs">
        <div className="shrink-0 z-10">
          <BackButton />
        </div>

        <h1 className="absolute inset-x-0 text-center text-sm sm:text-base font-black text-slate-900 pointer-events-none">
          تفاصيل الطلب
        </h1>

        <div className="shrink-0 z-10">
          <ReportModal
            reportedUserId={otherParty.id}
            reportedUserName={otherParty.name}
            swapId={swap.id}
          />
        </div>
      </header>

      {query.error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700"
        >
          {query.error}
        </p>
      )}

      {/* خط سير الطلب */}
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
              ? "تم الاعتذار عن هذا الطلب."
              : "تم إلغاء هذا الطلب."}
          </span>
        </section>
      )}

      {/* بطاقة الكتاب والمقابل ببساطة تامة */}
      <section className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs space-y-3">
        {/* الكتاب المطلوب + اسم صاحبه أسفله مباشرة */}
        <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
          <Link href={`/books/${swap.requestedBook.id}`} className="shrink-0">
            {swap.requestedBook.coverUrl ? (
              <div className="relative h-16 w-12 overflow-hidden rounded-lg border border-slate-200">
                <Image
                  src={swap.requestedBook.coverUrl}
                  alt={swap.requestedBook.title}
                  fill
                  sizes="48px"
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="flex h-16 w-12 items-center justify-center rounded-lg bg-slate-200 text-slate-400">
                <BookOpen className="h-4 w-4" />
              </div>
            )}
          </Link>

          <div className="min-w-0 flex-1 space-y-0.5">
            <Link
              href={`/books/${swap.requestedBook.id}`}
              className="block text-xs sm:text-sm font-black text-slate-900 hover:text-teal-700 truncate"
            >
              {swap.requestedBook.title}
            </Link>

            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-500">
              <Link
                href={`/users/${swap.receiver.id}`}
                className="font-bold text-slate-700 hover:text-teal-700 hover:underline"
              >
                {swap.receiver.name}
              </Link>
              {receiverLocation && (
                <span className="flex items-center gap-0.5 text-slate-400">
                  <MapPin className="h-3 w-3 text-teal-600" />
                  {receiverLocation}
                </span>
              )}
            </div>

            {getConditionLabel(swap.requestedBook.condition) && (
              <span className="inline-block text-[10px] font-bold text-teal-700">
                {getConditionLabel(swap.requestedBook.condition)}
              </span>
            )}
          </div>
        </div>

        {/* أسفله مباشرة: إما عدد النقاط أو الكتاب الآخر */}
        {swap.type === "POINTS" ? (
          <div className="flex items-center justify-between rounded-xl bg-teal-50/70 border border-teal-100 px-3.5 py-2.5">
            <div className="flex items-center gap-2 text-xs font-black text-teal-900">
              <Coins className="h-4 w-4 text-teal-600 shrink-0" />
              <span>{toArabicNumerals(swap.pointsCost)} نقاط</span>
            </div>
            <Link
              href={`/users/${swap.requester.id}`}
              className="text-[11px] font-bold text-slate-600 hover:text-teal-700 hover:underline"
            >
              {swap.requester.name}
            </Link>
          </div>
        ) : swap.offeredBook ? (
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
            <Link href={`/books/${swap.offeredBook.id}`} className="shrink-0">
              {swap.offeredBook.coverUrl ? (
                <div className="relative h-16 w-12 overflow-hidden rounded-lg border border-slate-200">
                  <Image
                    src={swap.offeredBook.coverUrl}
                    alt={swap.offeredBook.title}
                    fill
                    sizes="48px"
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="flex h-16 w-12 items-center justify-center rounded-lg bg-slate-200 text-slate-400">
                  <BookOpen className="h-4 w-4" />
                </div>
              )}
            </Link>

            <div className="min-w-0 flex-1 space-y-0.5">
              <Link
                href={`/books/${swap.offeredBook.id}`}
                className="block text-xs sm:text-sm font-black text-slate-900 hover:text-teal-700 truncate"
              >
                {swap.offeredBook.title}
              </Link>

              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-500">
                <Link
                  href={`/users/${swap.requester.id}`}
                  className="font-bold text-slate-700 hover:text-teal-700 hover:underline"
                >
                  {swap.requester.name}
                </Link>
                {requesterLocation && (
                  <span className="flex items-center gap-0.5 text-slate-400">
                    <MapPin className="h-3 w-3 text-teal-600" />
                    {requesterLocation}
                  </span>
                )}
              </div>

              {getConditionLabel(swap.offeredBook.condition) && (
                <span className="inline-block text-[10px] font-bold text-blue-700">
                  {getConditionLabel(swap.offeredBook.condition)}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-amber-300 bg-amber-50/40 p-3 text-xs font-bold text-amber-800">
            <Clock className="h-4 w-4 text-amber-600 shrink-0" />
            <span>بانتظار اختيار الكتاب من</span>
            <Link
              href={`/users/${swap.requester.id}`}
              className="font-black underline hover:text-teal-700"
            >
              {swap.requester.name}
            </Link>
          </div>
        )}
      </section>

      {/* شريط الإجراءات حسب الحالة */}
      {swap.status === "PENDING" && isReceiver && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-3.5 space-y-2.5">
          <p className="text-xs font-bold text-amber-900">
            {swap.type === "DIRECT"
              ? "اختر الكتاب الذي ترغب به من القائمة، ثم اقبل الطلب:"
              : "تحدث مع القارئ بالأسفل، ثم اختر قرارك:"}
          </p>
          <div className="space-y-2.5">
            {swap.type === "DIRECT" ? (
              candidateBooks.length > 0 ? (
                <form action={acceptSwapWithOfferAction} className="space-y-2.5">
                  <input type="hidden" name="swapId" value={swap.id} />
                  <fieldset className="grid gap-2 sm:grid-cols-2">
                    <legend className="sr-only">اختر كتاباً</legend>
                    {candidateBooks.map((book, index) => (
                      <label
                        key={book.id}
                        className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white p-2.5 transition has-[:checked]:border-teal-600 has-[:checked]:bg-teal-50"
                      >
                        <input
                          type="radio"
                          name="offeredBookId"
                          value={book.id}
                          required
                          defaultChecked={index === 0}
                          className="accent-teal-700"
                        />
                        {book.coverUrl ? (
                          <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded-lg">
                            <Image
                              src={book.coverUrl}
                              alt={book.title}
                              fill
                              sizes="40px"
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <div className="h-14 w-10 shrink-0 rounded-lg bg-slate-100" />
                        )}
                        <span className="min-w-0">
                          <span className="block truncate text-xs font-black text-slate-800">
                            {book.title}
                          </span>
                          <span className="block truncate text-[11px] text-slate-500">
                            {book.author || ""}
                          </span>
                          <span className="mt-0.5 block text-[10px] font-bold text-teal-700">
                            {toArabicNumerals(book.points)} نقاط
                            {getConditionLabel(book.condition)
                              ? ` · ${getConditionLabel(book.condition)}`
                              : ""}
                          </span>
                        </span>
                      </label>
                    ))}
                  </fieldset>
                  <PendingSubmitButton
                    pendingText="جارٍ القبول..."
                    className="w-full rounded-xl bg-teal-600 py-2.5 text-xs font-black text-white transition hover:bg-teal-700"
                  >
                    قبول الطلب بالكتاب المحدد
                  </PendingSubmitButton>
                </form>
              ) : (
                <p className="rounded-xl border border-amber-200 bg-white p-3 text-xs font-semibold text-amber-800">
                  لم تعد الكتب المعروضة متاحة حالياً.
                </p>
              )
            ) : (
              <form action={handleAccept}>
                <button
                  type="submit"
                  className="w-full rounded-xl bg-teal-600 py-2.5 text-xs font-black text-white hover:bg-teal-700 transition cursor-pointer"
                >
                  قبول الطلب
                </button>
              </form>
            )}
            <form action={handleReject}>
              <button
                type="submit"
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                اعتذار
              </button>
            </form>
          </div>
        </div>
      )}

      {(swap.status === "ACCEPTED" ||
        swap.status === "AWAITING_DELIVERY" ||
        swap.status === "AWAITING_CONFIRMATION") && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-slate-800">حالة الاستلام والتسليم:</span>
            <span className="text-teal-600">
              {swap.deliveryConfirmed && swap.receiptConfirmed
                ? "أكّد الطرفان"
                : swap.deliveryConfirmed || swap.receiptConfirmed
                ? "أكّد أحد الطرفين"
                : "بانتظار التسليم"}
            </span>
          </div>

          {((isReceiver &&
            (swap.status === "ACCEPTED" || swap.status === "AWAITING_DELIVERY")) ||
            (isRequester && swap.status === "AWAITING_CONFIRMATION")) && (
            <ConfirmReceiptModal swapId={swap.id} isReceiver={isReceiver} />
          )}

          {(swap.status === "ACCEPTED" || swap.status === "AWAITING_DELIVERY") &&
            !swap.deliveryConfirmed &&
            !swap.receiptConfirmed && (
              <CancelAcceptedSwapButton swapId={swap.id} />
            )}

          <DisputeForm swapId={swap.id} />
        </div>
      )}

      {swap.status === "COMPLETED" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-2xl bg-teal-50 p-3 text-xs font-bold text-teal-800 border border-teal-200">
            <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-teal-600" />
            <span>اكتمل الطلب بنجاح!</span>
          </div>

          <SwapReviewModal
            swapId={swap.id}
            recipientId={otherParty.id}
            recipientName={otherParty.name}
            hasReviewed={hasReviewed}
          />
        </div>
      )}

      {/* 💬 محادثة الطلب */}
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
    </main>
  );
}
