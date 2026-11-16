import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import ReportModal from "@/components/ReportModal";
import {
  MapPin,
  Star,
  MessageSquareQuote,
  Sparkles,
  BookOpen,
  ArrowRightLeft,
} from "lucide-react";
import UserAvatar from "@/components/UserAvatar";
import BackButton from "@/components/BackButton";
import FollowButton from "@/components/FollowButton";
import { toArabicNumerals } from "@/lib/formatting";

function formatArabicDate(date: Date | string): string {
  return new Intl.DateTimeFormat("ar-SA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

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

  // حساب التبادلات المكتملة ومتوسط التقييم بالتوازي
  const [completedSwapsCount, ratingStats] = await Promise.all([
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
  ]);

  const averageRating = ratingStats._avg.rating;

  return (
    <main
      dir="rtl"
      className="mx-auto w-full max-w-4xl space-y-5 px-3 sm:px-4 pt-4 pb-28 text-[#0F172A]"
    >
      {/* هيدر البروفايل */}
      <div className="relative rounded-3xl bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#334155] p-6 text-white shadow-md border border-slate-700/50">
        {/* زر الرجوع في اليمين */}
        <div className="absolute top-4 right-4 z-20">
          <BackButton />
        </div>

        {/* زر الإبلاغ في اليسار (يظهر فقط إذا كان الزائر يتصفح حساب شخص آخر) */}
        {!isSelf && (
          <div className="absolute top-4 left-4 z-20">
            <ReportModal
              reportedUserId={user.id}
              reportedUserName={user.name}
            />
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

          {/* زر المتابعة وسطر المتابعين */}
          <FollowButton
            targetUserId={user.id}
            initialIsFollowing={isFollowing}
            initialFollowersCount={user._count.followedBy}
            followingCount={user._count.following}
            isSelf={isSelf}
          />
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
              <div key={review.id} className="py-3 first:pt-1 last:pb-1 space-y-1.5">
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
    </main>
  );
}
