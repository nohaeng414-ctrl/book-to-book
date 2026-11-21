import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  MapPin,
  Star,
  Sparkles,
  Settings,
  ArrowRightLeft,
  Heart,
  Coins,
  MessageSquareQuote,
} from "lucide-react";
import UserAvatar from "@/components/UserAvatar";
import { toArabicNumerals } from "@/lib/formatting";

function formatArabicDate(date: Date | string): string {
  return new Intl.DateTimeFormat("ar-SA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  // البحث عن المستخدم الحالي عبر البريد الإلكتروني المضمون في الجلسة
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      name: true,
      email: true,
      bio: true,
      city: true,
      country: true,
      neighborhood: true,
      points: true,
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
          books: { where: { isDeleted: false } },
          favoriteBooks: { where: { isDeleted: false } },
          followedBy: true,
          following: true,
          reviewsReceived: true,
        },
      },
    },
  });

  if (!user) redirect("/login");

  // جلب إحصائيات التبادلات المكتملة ومتوسط التقييمات
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
      
        {/* زر الإعدادات في اليسار */}
        <Link
          href="/settings"
          title="الإعدادات"
          className="absolute top-4 left-4 z-20 flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white transition-all backdrop-blur-md border border-white/10 active:scale-95"
        >
          <Settings className="h-4.5 w-4.5" />
        </Link>

        <div className="flex flex-col items-center text-center">
          <UserAvatar
            userId={user.id}
            name={user.name}
            size="lg"
            className="h-20 w-20 border-2 border-white/20 shadow-md mb-3"
          />

          <h2 className="text-xl sm:text-2xl font-black text-white">
            {user.name}
          </h2>

          <p className="mt-1 flex items-center justify-center gap-1.5 text-xs text-slate-300">
            <MapPin className="h-3.5 w-3.5 text-teal-400 shrink-0" />
            {[user.neighborhood, user.city, user.country]
              .filter(Boolean)
              .join("، ") || "الموقع غير محدد"}
          </p>

          {/* سطر المتابعين */}
          <div className="mt-2.5 flex items-center gap-4 text-xs font-semibold text-slate-300">
            <Link
              href={`/users/${user.id}/network?tab=followers`}
              className="transition hover:text-white hover:underline cursor-pointer"
            >
              <strong className="text-white">
                {toArabicNumerals(user._count.followedBy)}
              </strong>{" "}
              متابعيني
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
        </div>
      </div>

      {/* بطاقات المؤشرات الأساسية */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="rounded-2xl border border-slate-200 bg-white p-3 text-center shadow-2xs">
          <div className="flex items-center justify-center gap-1 mb-0.5 text-teal-600">
            <Coins className="h-4 w-4" />
          </div>
          <span className="block text-base sm:text-lg font-black text-slate-900">
            {toArabicNumerals(user.points)}
          </span>
          <span className="text-[11px] text-slate-500 font-medium">
            رصيد النقاط
          </span>
        </div>

        <Link
          href="/swaps/history"
          className="rounded-2xl border border-slate-200 bg-white p-3 text-center transition hover:shadow-xs hover:border-slate-300 active:scale-98 shadow-2xs"
        >
          <div className="flex items-center justify-center gap-1 mb-0.5 text-blue-600">
            <ArrowRightLeft className="h-4 w-4" />
          </div>
          <span className="block text-base sm:text-lg font-black text-slate-900">
            {toArabicNumerals(completedSwapsCount)}
          </span>
          <span className="text-[11px] text-slate-500 font-medium">
            مرات الاستبدال
          </span>
        </Link>

        <Link
          href="/favorites"
          className="rounded-2xl border border-slate-200 bg-white p-3 text-center transition hover:shadow-xs hover:border-slate-300 active:scale-98 shadow-2xs"
        >
          <div className="flex items-center justify-center gap-1 mb-0.5 text-rose-500">
            <Heart className="h-4 w-4" />
          </div>
          <span className="block text-base sm:text-lg font-black text-slate-900">
            {toArabicNumerals(user._count.favoriteBooks)}
          </span>
          <span className="text-[11px] text-slate-500 font-medium">المفضلة</span>
        </Link>
      </div>

      {/* بطاقة الاهتمامات القرائية */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2.5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-teal-600" />
            <h3 className="text-xs font-black text-slate-700">اهتماماتي</h3>
          </div>
          <Link
            href="/profile/edit"
            className="text-[11px] font-bold text-teal-700 hover:underline"
          >
            تعديل
          </Link>
        </div>
        <p className="text-xs sm:text-sm leading-relaxed text-slate-700 font-medium">
          {user.bio ? (
            user.bio
          ) : (
            <span className="text-slate-400 italic">
             لم تقم بإضافة اهتماماتك بعد.
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
            لم تتلقَّ أي تقييمات بعد...
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

                  <div
                    className="flex items-center gap-0.5 shrink-0"
                    dir="rtl"
                  >
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