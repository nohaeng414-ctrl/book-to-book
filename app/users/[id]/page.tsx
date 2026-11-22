import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  MapPin,
  Star,
  MessageSquareQuote,
  Sparkles,
  BookOpen,
  ArrowRightLeft,
  Flag,
  ChevronDown,
  ExternalLink,
  ShieldAlert,
  Clock,
} from "lucide-react";
import UserAvatar from "@/components/UserAvatar";
import BackButton from "@/components/BackButton";
import FollowButton from "@/components/FollowButton";
import AdminReportCardActions from "@/components/AdminReportCardActions";
import { toArabicNumerals } from "@/lib/formatting";

function formatArabicDate(date: Date | string): string {
  return new Intl.DateTimeFormat("ar-SA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

const REPORT_STATUS_BADGE: Record<string, { label: string; style: string }> = {
  PENDING: {
    label: "قيد المراجعة",
    style: "bg-rose-50 text-rose-700 border-rose-200",
  },
  RESOLVED: {
    label: "تمت المعالجة",
    style: "bg-teal-50 text-teal-700 border-teal-200",
  },
  DISMISSED: {
    label: "مرفوض",
    style: "bg-slate-100 text-slate-600 border-slate-200",
  },
};

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [session, viewerIsAdmin] = await Promise.all([auth(), isAdmin()]);

  // جلب المستخدم الحالي للتحقق من المتابعة وحسابه
  const currentUser = session?.user?.email
    ? await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true },
      })
    : null;

  // جلب بيانات القارئ وتقييماته الواردة
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      bio: true,
      city: true,
      country: true,
      neighborhood: true,
      isBanned: true,
      reviewsReceived: {
        select: {
          id: true,
          rating: true,
          comment: true,
          createdAt: true,
          reviewer: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      _count: {
        select: {
          books: { where: { isAvailable: true, isDeleted: false } },
          favoriteBooks: { where: { isDeleted: false } },
          followedBy: true,
          following: true,
          reviewsReceived: true,
        },
      },
      followedBy: currentUser
        ? {
            where: { id: currentUser.id },
            select: { id: true },
          }
        : false,
    },
  });

  if (!user) notFound();

  const isSelf = currentUser?.id === user.id;
  const isFollowing = Boolean(user.followedBy && user.followedBy.length > 0);

  // حساب التبادلات المكتملة، متوسط التقييم، وبلاغات الحساب (للمدير فقط) بالتوازي
  const [completedSwapsCount, ratingStats, userReports] = await Promise.all([
    prisma.swap.count({
      where: {
        status: "COMPLETED",
        OR: [{ requesterId: user.id }, { receiverId: user.id }],
      },
    }),
    prisma.review.aggregate({
      where: { recipientId: user.id },
      _avg: { rating: true },
    }),
    viewerIsAdmin
      ? prisma.report.findMany({
          where: { reportedId: user.id },
          select: {
            id: true,
            reason: true,
            details: true,
            status: true,
            createdAt: true,
            swapId: true,
            swap: { select: { id: true, status: true } },
            reporter: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 20,
        })
      : Promise.resolve([]),
  ]);

  const averageRating = ratingStats._avg.rating;
  const pendingReportsCount = userReports.filter(
    (r) => r.status === "PENDING"
  ).length;

  return (
    <main
      dir="rtl"
      className="mx-auto w-full max-w-4xl space-y-5 px-3 sm:px-4 pt-4 pb-28 text-[#0F172A]"
    >
      {/* هيدر البروفايل */}
      <div className="relative rounded-3xl bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#334155] p-6 text-white shadow-md border border-slate-700/50">
        {/* زر الرجوع */}
        <div className="absolute top-4 right-4 z-20">
          <BackButton className="!h-auto !w-auto !rounded-none !border-0 !bg-transparent !p-1.5 !backdrop-blur-none text-[#F8FAFC] hover:!bg-transparent hover:text-white active:scale-95 [&_svg]:text-[#F8FAFC]" />
        </div>

        {/* شارة حالة الحظر (تظهر للمدير فقط) */}
        {viewerIsAdmin && user.isBanned && (
          <div className="absolute top-4 left-4 z-20 inline-flex items-center gap-1 rounded-full bg-rose-600 px-2.5 py-1 text-[10px] font-black text-white shadow-sm">
            <ShieldAlert className="h-3 w-3" />
            <span>حساب محظور</span>
          </div>
        )}

        <div className="flex flex-col items-center text-center">
          <UserAvatar
            userId={user.id}
            name={user.name}
            size="lg"
            className="h-20 w-20 border-2 border-white/20 shadow-md mb-3"
          />

          <h1 className="text-xl sm:text-2xl font-black text-white">
            {user.name}
          </h1>

          <p className="mt-1 flex items-center justify-center gap-1.5 text-xs text-slate-300">
            <MapPin className="h-3.5 w-3.5 text-teal-400 shrink-0" />
            {[user.neighborhood, user.city, user.country]
              .filter(Boolean)
              .join("، ") || "الموقع غير محدد"}
          </p>

          {/* شارة التقييم */}
          {user._count.reviewsReceived > 0 && (
            <a
              href="#reviews-section"
              title="الانتقال إلى تقييمات وآراء القرّاء"
              className="mt-3.5 inline-flex items-center gap-2 rounded-full bg-slate-800/40 hover:bg-slate-800/70 border border-white/10 hover:border-amber-400/40 px-3.5 py-1 text-xs text-slate-200 transition-all duration-200 active:scale-95 backdrop-blur-md shadow-xs cursor-pointer group"
            >
              <span className="flex items-center gap-1 font-black text-amber-400">
                <Star className="h-3.5 w-3.5 fill-amber-400 transition-transform duration-200 group-hover:scale-110" />
                <span className="text-xs sm:text-sm">
                  {toArabicNumerals(Number((averageRating ?? 0).toFixed(1)))}
                </span>
              </span>
            </a>
          )}

          {/* 👥 سطر المتابعين */}
          <div className="mt-2.5 flex items-center gap-4 text-xs font-semibold text-slate-300">
            <Link
              href={`/users/${user.id}/network?tab=followers`}
              className="transition hover:text-white hover:underline cursor-pointer"
            >
              <strong className="text-white">
                {toArabicNumerals(user._count.followedBy)}
              </strong>{" "}
              متابِعون
            </Link>

            <span className="text-slate-500">·</span>

            <Link
              href={`/users/${user.id}/network?tab=following`}
              className="transition hover:text-white hover:underline cursor-pointer"
            >
              <strong className="text-white">
                {toArabicNumerals(user._count.following)}
              </strong>{" "}
              متابعة
            </Link>
          </div>

          {/* زر المتابعة الموحد */}
          {!isSelf && currentUser && (
            <div className="mt-4 shrink-0">
              <FollowButton
                targetUserId={user.id}
                initialIsFollowing={isFollowing}
                currentUserId={currentUser.id}
              />
            </div>
          )}
        </div>
      </div>

   
      {/* بطاقات المؤشرات الأساسية */}
      <div className="grid grid-cols-2 gap-2.5">
        <Link
          href={`/users/${user.id}/books`}
          className="rounded-2xl border border-slate-200 bg-white p-3 text-center transition hover:shadow-xs hover:border-slate-300 active:scale-98 shadow-2xs"
        >
          <div className="flex items-center justify-center gap-1 mb-0.5 text-teal-600">
            <BookOpen className="h-4 w-4" />
          </div>
          <span className="block text-base sm:text-lg font-black text-slate-900">
            {toArabicNumerals(user._count.books)}
          </span>
          <span className="text-[11px] text-slate-500 font-medium">الكتب</span>
        </Link>

        <div className="rounded-2xl border border-slate-200 bg-white p-3 text-center shadow-2xs">
          <div className="flex items-center justify-center gap-1 mb-0.5 text-blue-600">
            <ArrowRightLeft className="h-4 w-4" />
          </div>
          <span className="block text-base sm:text-lg font-black text-slate-900">
            {toArabicNumerals(completedSwapsCount)}
          </span>
          <span className="text-[11px] text-slate-500 font-medium">
            مرات الاستبدال
          </span>
        </div>
      </div>

      {/* بطاقة اهتمامات القارئ */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-2.5">
          <Sparkles className="h-4 w-4 text-teal-600" />
          <h2 className="text-xs font-black text-slate-700">اهتمامات القارئ</h2>
        </div>
        <p className="text-xs sm:text-sm leading-relaxed text-slate-700 font-medium">
          {user.bio ? (
            user.bio
          ) : (
            <span className="text-slate-400 italic">
              لم يقم القارئ بإضافة اهتمامات بعد.
            </span>
          )}
        </p>
      </section>

      {/* قسم التقييمات وآراء القرّاء */}
      <section
        id="reviews-section"
        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <MessageSquareQuote className="h-4 w-4 text-amber-500" />
            <h2 className="text-xs font-black text-slate-700">
              التقييمات وآراء القرّاء
            </h2>
          </div>
          <span className="text-[11px] font-bold text-slate-400">
            ({toArabicNumerals(user._count.reviewsReceived)})
          </span>
        </div>

        {user.reviewsReceived.length === 0 ? (
          <p className="py-4 text-xs text-slate-400 font-medium">
            لم يتلقَّ هذا المستخدم أي تقييمات بعد...
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {user.reviewsReceived.map((review) => (
              <div
                key={review.id}
                className="py-3 first:pt-1 last:pb-1 space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <Link
                    href={`/users/${review.reviewer.id}`}
                    className="flex items-center gap-2 min-w-0 group"
                  >
                    <UserAvatar
                      userId={review.reviewer.id}
                      name={review.reviewer.name}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <span className="block text-xs font-black text-slate-800 group-hover:text-teal-700 truncate">
                        {review.reviewer.name}
                      </span>
                      <span className="block text-[10px] text-slate-400">
                        {formatArabicDate(review.createdAt)}
                      </span>
                    </div>
                  </Link>

                  <div className="flex items-center gap-0.5 shrink-0" dir="rtl">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-3.5 w-3.5 ${
                          star <= review.rating
                            ? "fill-amber-400 text-amber-400"
                            : "text-slate-200"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {review.comment && (
                  <p className="text-xs leading-relaxed text-slate-600 pr-1">
                    {review.comment}
                  </p>
                )}
              </div>
            ))}
          </div>

          
        )}


      </section>

         {/* 🚩 زر وقائمة البلاغات (تظهر للمدير فقط) */}
      {viewerIsAdmin && (
        <details className="group rounded-2xl border border-rose-200/80 bg-white shadow-2xs overflow-hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 bg-rose-50/60 hover:bg-rose-50 transition">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
                <Flag className="h-4 w-4" />
              </div>
              <div className="text-right">
                <span className="block text-xs font-black text-slate-900">
                  بلاغات الحساب ({toArabicNumerals(userReports.length)})
                </span>
                <span className="block text-[11px] text-slate-500">
                  {pendingReportsCount > 0
                    ? `${toArabicNumerals(pendingReportsCount)} بلاغات قيد المراجعة`
                    : "لا توجد بلاغات معلّقة على هذا الحساب"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {pendingReportsCount > 0 && (
                <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-black text-white">
                  {toArabicNumerals(pendingReportsCount)} جديد
                </span>
              )}
              <ChevronDown className="h-4 w-4 text-slate-500 transition-transform duration-200 group-open:rotate-180" />
            </div>
          </summary>

          <div className="border-t border-rose-100 p-4 space-y-3">
            {userReports.length === 0 ? (
              <p className="py-3 text-center text-xs font-medium text-slate-400">
                سجل نظيف — لم تُسجَّل أي بلاغات ضد هذا الحساب.
              </p>
            ) : (
              <div className="space-y-3">
                {userReports.map((report) => {
                  const badge =
                    REPORT_STATUS_BADGE[report.status] ||
                    REPORT_STATUS_BADGE.PENDING;
                  const swapId = report.swap?.id ?? report.swapId;

                  return (
                    <div
                      key={report.id}
                      className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3.5 space-y-2.5 text-right"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-black text-slate-900">
                            {report.reason}
                          </span>
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${badge.style}`}
                          >
                            {badge.label}
                          </span>
                        </div>

                        <span className="inline-flex items-center gap-1 text-[10px] text-slate-400">
                          <Clock className="h-3 w-3" />
                          {formatArabicDate(report.createdAt)}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                        <span>
                          المُبلِّغ:{" "}
                          <Link
                            href={`/users/${report.reporter.id}`}
                            className="font-bold text-slate-800 hover:text-teal-700 hover:underline"
                          >
                            {report.reporter.name}
                          </Link>
                        </span>

                        {swapId && (
                          <Link
                            href={`/swaps/${swapId}`}
                            className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1 text-[10px] font-bold text-white hover:bg-slate-800 transition"
                          >
                            <span>تفاصيل الطلب</span>
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        )}
                      </div>

                      {report.details && (
                        <p className="rounded-xl bg-white p-2.5 text-xs leading-relaxed text-slate-700 border border-slate-100 whitespace-pre-wrap">
                          {report.details}
                        </p>
                      )}

                      <div className="pt-1 border-t border-slate-200/60 flex justify-end">
                        <AdminReportCardActions
                          reportId={report.id}
                          reportedUserId={user.id}
                          reportedUserName={user.name}
                          isUserBanned={user.isBanned}
                          reportStatus={report.status}
                          swapId={swapId ?? undefined}
                          swapStatus={report.swap?.status}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex justify-end pt-1">
              <Link
                href="/admin/reports"
                className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-700 hover:underline"
              >
                <span>الذهاب إلى صفحة إدارة البلاغات</span>
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </details>
      )}

    </main>
  );
}