import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createSwap, SwapError } from "@/lib/swaps";
import { SwapType } from "@/generated/prisma-full";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Link from "next/link";

import BackButton from "@/components/BackButton";
import PendingSubmitButton from "@/components/PendingSubmitButton";
import { ArrowLeftRight,ArrowRight, Coins, MapPin } from "lucide-react";
import { toArabicNumerals } from "@/lib/formatting";

export default async function SwapRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ bookId?: string; error?: string }>;
}) {
  // 1. جلب الجلسة والـ searchParams بالتوازي
  const [session, params] = await Promise.all([auth(), searchParams]);
  if (!session?.user?.email) redirect("/login");

  if (!params.bookId) redirect("/");

  const formatPoints = (count: number) => {
    if (count === 1) return "نقطة واحدة";
    if (count === 2) return "نقطتان";
    if (count >= 3 && count <= 10) return `${toArabicNumerals(count)} نقاط`;
    return `${toArabicNumerals(count)} نقطة`;
  };

  // 2. جلب بيانات المستخدم والكتاب المطلوب بالتوازي (بدون coverUrl الثقيل)
  const [user, book] = await Promise.all([
    prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        points: true,
        reservedPoints: true,
        isBanned: true,
        books: {
          where: { isAvailable: true, isDeleted: false },
          select: {
            id: true,
            points: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    }),
    prisma.book.findFirst({
      where: {
        id: params.bookId,
        isAvailable: true,
        isDeleted: false,
      },
      select: {
        id: true,
        title: true,
        author: true,
        points: true,
        ownerId: true,
        owner: {
          select: {
            id: true,
            name: true,
            city: true,
            neighborhood: true,
          },
        },
      },
    }),
  ]);

  if (!user) redirect("/login");
  if (user.isBanned) redirect("/banned");

  // التأكد من وجود الكتاب وأنه ليس ملكاً للمستخدم نفسه
  if (!book || book.ownerId === user.id) redirect("/");

  // فلترة الكتب المكافئة لنقاط الكتاب أو أقل
  const eligibleBooks = user.books.filter((b) => b.points <= book.points);
  const hasEligibleBooks = eligibleBooks.length > 0;
  const availablePoints = user.points - user.reservedPoints;
  const hasEnoughPoints = availablePoints >= book.points;

  const ownerLocation = [book.owner.neighborhood, book.owner.city]
    .filter(Boolean)
    .join("، ");

  async function submitRequest(formData: FormData) {
    "use server";
    const currentSession = await auth();
    const requesterEmail = currentSession?.user?.email;
    if (!requesterEmail) redirect("/login");

    const requester = await prisma.user.findUnique({
      where: { email: requesterEmail },
      select: { id: true, isBanned: true },
    });
    if (!requester) redirect("/login");
    if (requester.isBanned) redirect("/banned");

    const requestedBookId = String(formData.get("requestedBookId") || "");
    const type = String(formData.get("type") || "");
    const offeredBookIds = formData
      .getAll("offeredBookIds")
      .map((value) => String(value));

    try {
      if (type !== SwapType.DIRECT && type !== SwapType.POINTS) {
        throw new SwapError("اختر طريقة الحصول على الكتاب.");
      }
      await createSwap(requester.id, { requestedBookId, type, offeredBookIds });
      revalidatePath("/");
    } catch (error) {
      if (!(error instanceof SwapError)) throw error;
      const message = error.message;
      redirect(
        `/swap/request?bookId=${encodeURIComponent(
          requestedBookId
        )}&error=${encodeURIComponent(message)}`
      );
    }
    redirect("/requests?tab=outgoing&created=1");
  }

  return (
    <main
      dir="rtl"
      className="mx-auto w-full max-w-2xl space-y-3.5 px-3 sm:px-4 pb-28 text-[#0F172A]"
    >
      <header className="relative flex h-14 w-full items-center justify-between rounded-b-2xl border-x border-b border-slate-200 bg-white px-3 shadow-2xs">
        <Link
          href={`/books/${book.id}`}
          title="رجوع"
          aria-label="رجوع إلى صفحة الكتاب"
          className="relative z-10 flex h-10 w-10 items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100 active:bg-slate-200 transition-colors"
        >
          <ArrowRight className="h-5 w-5" />
        </Link>

        <h1 className="absolute inset-x-0 text-center text-sm sm:text-base font-black text-slate-900 pointer-events-none">
          اطلب الكتاب
        </h1>

        <div className="w-8 shrink-0" />
      </header>

      {params.error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700"
        >
          {params.error}
        </p>
      )}

      {/* بطاقة الكتاب المطلوب (متناسقة مع صفحة الطلبات وتفاصيل الطلب) */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs space-y-4">
        <div className="flex items-center gap-3.5 rounded-xl bg-slate-50 p-3">
          <div className="relative h-20 w-14 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/books/${book.id}/cover`}
              alt={book.title}
              className="h-full w-full object-cover"
            />
          </div>

          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-sm sm:text-base font-black text-slate-900 truncate">
                {book.title}
              </h2>
              <span className="shrink-0 rounded-lg bg-teal-50 border border-teal-200/70 px-2 py-0.5 text-[11px] font-black text-teal-800">
                {formatPoints(book.points)}
              </span>
            </div>

            {book.author && (
              <p className="text-xs text-slate-500 truncate">{book.author}</p>
            )}

            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 pt-0.5 text-[11px] text-slate-500">
              <Link
                href={`/users/${book.owner.id}`}
                className="font-bold text-slate-700 hover:text-teal-700 hover:underline"
              >
                {book.owner.name}
              </Link>
              {ownerLocation && (
                <span className="flex items-center gap-0.5 text-slate-400">
                  <MapPin className="h-3 w-3 text-teal-600 shrink-0" />
                  {ownerLocation}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* نموذج اختيار نوع الطلب */}
        <form action={submitRequest} className="space-y-3.5">
          <input type="hidden" name="requestedBookId" value={book.id} />

          {eligibleBooks.map((ownBook) => (
            <input
              key={ownBook.id}
              type="hidden"
              name="offeredBookIds"
              value={ownBook.id}
            />
          ))}

          <fieldset className="space-y-2.5">
            <legend className="mb-2 text-xs sm:text-sm font-black text-slate-800">
              اختر نوع الطلب:
            </legend>

            {/* 1. خيار: كتاب بكتاب */}
            <label
              className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3.5 transition ${
                hasEligibleBooks
                  ? "border-slate-200 bg-white hover:border-slate-300 has-[:checked]:border-blue-600 has-[:checked]:bg-blue-50/40 has-[:checked]:ring-1 has-[:checked]:ring-blue-600"
                  : "border-dashed border-slate-200 bg-slate-50/60 opacity-60 cursor-not-allowed"
              }`}
            >
              <input
                type="radio"
                name="type"
                value={SwapType.DIRECT}
                disabled={!hasEligibleBooks}
                defaultChecked={hasEligibleBooks}
                className="mt-1 accent-blue-600"
              />
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <ArrowLeftRight className="h-4 w-4 text-blue-600" />
                  <span className="text-xs sm:text-sm font-black text-slate-900">
                    كتاب بكتاب
                  </span>
                </div>
                <span className="mt-1 block text-xs leading-relaxed text-slate-500">
                  {hasEligibleBooks
                    ? `سيقوم ${book.owner.name} باختيار كتاب بديل من كتبك المتاحة.`
                    : "لا توجد لديك كتب متاحة حالياً تعادل نقاط هذا الكتاب أو أقل."}
                </span>
              </div>
            </label>

            {/* 2. خيار: طلب بالنقاط */}
            <label
              className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3.5 transition ${
                hasEnoughPoints
                  ? "border-slate-200 bg-white hover:border-slate-300 has-[:checked]:border-teal-600 has-[:checked]:bg-teal-50/40 has-[:checked]:ring-1 has-[:checked]:ring-teal-600"
                  : "border-slate-200 bg-white hover:border-slate-300 has-[:checked]:border-teal-600 has-[:checked]:bg-teal-50/40"
              }`}
            >
              <input
                type="radio"
                name="type"
                value={SwapType.POINTS}
                defaultChecked={!hasEligibleBooks}
                className="mt-1 accent-teal-600"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Coins className="h-4 w-4 text-teal-600" />
                    <span className="text-xs sm:text-sm font-black text-slate-900">
                      طلب بالنقاط
                    </span>
                  </div>
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700">
                    رصيدك المتاح: {toArabicNumerals(availablePoints)}
                  </span>
                </div>
                <span className="mt-1 block text-xs leading-relaxed text-slate-500">
                  تُحجز {formatPoints(book.points)} من رصيدك وتتحول لمالك الكتاب عند تأكيد الاستلام.
                </span>
              </div>
            </label>
          </fieldset>

          <PendingSubmitButton
            pendingText="جارٍ إرسال الطلب..."
            className="w-full rounded-xl bg-teal-600 px-5 py-3 text-xs sm:text-sm font-black text-white transition hover:bg-teal-700 active:scale-98 shadow-2xs cursor-pointer"
          >
            إرسال الطلب
          </PendingSubmitButton>
        </form>
      </section>
    </main>
  );
}
