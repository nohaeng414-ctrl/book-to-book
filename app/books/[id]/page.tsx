import { auth } from "@/auth";
import BackButton from "@/components/BackButton";
import FavoriteButton from "@/components/FavoriteButton";
import ShareButton from "@/components/ShareButton";
import UserAvatar from "@/components/UserAvatar";
import { prisma } from "@/lib/prisma";
import {  Star, BookmarkCheck, ShieldCheck, FileText } from "lucide-react";
import { toArabicNumerals } from "@/lib/formatting";
import {
  ArrowLeftRight,
  BookOpen,
  Globe,
  MapPin,
  Sparkles,
  UserCheck,
  UserPlus,
} from "lucide-react";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

const categoryLabels: Record<string, string> = {
  NOVELS: "روايات",
  HISTORY: "تاريخ",
  SELF_DEVELOPMENT: "تطوير الذات",
  PHILOSOPHY: "فلسفة وعلم نفس",
  SCIENCE: "علوم ومعارف",
  RELIGION: "علوم دينية",
  POETRY: "شعر وأدب",
  ARTS: "فنون وعمارة",
  OTHER: "أخرى",
};

const conditionLabels: Record<string, string> = {
  LIKE_NEW: "شبه جديد",
  GOOD: "جيد",
  ACCEPTABLE: "مقبول",
};

function formatPoints(points: number) {
  if (points === 1) return "نقطة واحدة";
  if (points === 2) return "نقطتان";
  if (points >= 3 && points <= 10) return `${toArabicNumerals(points)} نقاط`;
  return `${toArabicNumerals(points)} نقطة`;
}

function formatLanguage(lang?: string | null) {
  if (lang === "ar" || lang === "ARABIC") return "العربية";
  if (lang === "en" || lang === "ENGLISH") return "الإنجليزية";
  return lang || "غير محددة";
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!id) return { title: "الكتاب غير موجود | كتاب بكتاب" };

  const book = await prisma.book.findFirst({
    where: { id, isDeleted: false },
    select: { title: true, author: true },
  });

  return {
    title: book ? `${book.title} | كتاب بكتاب` : "الكتاب غير موجود | كتاب بكتاب",
    description: book
      ? `تفاصيل كتاب ${book.title}${book.author ? ` للمؤلف ${book.author}` : ""} على منصة كتاب بكتاب.`
      : "تعذر العثور على هذا الكتاب.",
  };
}

export default async function BookDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, session] = await Promise.all([params, auth()]);
  if (!id) notFound();

  const book = await prisma.book.findFirst({
    where: { id, isDeleted: false },
    select: {
      id: true,
      title: true,
      author: true,
      description: true,
      points: true,
      category: true,
      condition: true,
      language: true,
      isAvailable: true,
      createdAt: true,
      updatedAt: true,
      ownerId: true,
      owner: {
        select: { id: true, name: true, city: true, country: true },
      },
    },
  });

  if (!book) notFound();

  const currentUser = session?.user?.email
    ? await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true },
      })
    : null;

  const isOwner = currentUser?.id === book.ownerId;
  const isFavorite = currentUser
    ? (await prisma.book.count({
        where: { id: book.id, favoritedBy: { some: { id: currentUser.id } } },
      })) > 0
    : false;

  // التحقق مما إذا كان المستخدم يتابع صاحب الكتاب (يدعم أشهر تسميات جداول المتابعة في Prisma)
  let isFollowing = false;
  if (currentUser && !isOwner) {
    try {
      const prismaAny = prisma as Record<string, any>;
      if (prismaAny.follow) {
        const count = await prismaAny.follow.count({
          where: { followerId: currentUser.id, followingId: book.ownerId },
        });
        isFollowing = count > 0;
      } else {
        const userWithFollow = await prismaAny.user.findFirst({
          where: {
            id: currentUser.id,
            following: { some: { id: book.ownerId } },
          },
          select: { id: true },
        });
        isFollowing = Boolean(userWithFollow);
      }
    } catch {
      isFollowing = false;
    }
  }

  // دالة تنفيذ المتابعة أو إلغائها مباشرة عند الضغط على الزر
  async function handleFollowToggle() {
    "use server";
    const activeSession = await auth();
    if (!activeSession?.user?.email) {
      redirect("/login");
    }

    const viewer = await prisma.user.findUnique({
      where: { email: activeSession.user.email },
      select: { id: true },
    });

    if (!viewer || viewer.id === book?.ownerId) return;

    const prismaAny = prisma as Record<string, any>;
    try {
      if (prismaAny.follow) {
        const existing = await prismaAny.follow.findFirst({
          where: { followerId: viewer.id, followingId: book!.ownerId },
        });
        if (existing) {
          await prismaAny.follow.delete({ where: { id: existing.id } });
        } else {
          await prismaAny.follow.create({
            data: { followerId: viewer.id, followingId: book!.ownerId },
          });
        }
      } else {
        const existing = await prismaAny.user.findFirst({
          where: {
            id: viewer.id,
            following: { some: { id: book!.ownerId } },
          },
        });
        await prismaAny.user.update({
          where: { id: viewer.id },
          data: {
            following: existing
              ? { disconnect: { id: book!.ownerId } }
              : { connect: { id: book!.ownerId } },
          },
        });
      }
    } catch (error) {
      console.error("Follow toggle error:", error);
    }

    revalidatePath(`/books/${id}`);
  }

  const location = [book.owner.city, book.owner.country]
    .filter(Boolean)
    .join("، ");

  return (
    <main
      dir="rtl"
      className="mx-auto w-full max-w-3xl space-y-4 px-3 pt-0 pb-28 text-slate-900 sm:px-4"
    >
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between rounded-b-2xl border-x border-b border-slate-200 bg-white/95 px-3 backdrop-blur-sm">
        <BackButton />
        <h1 className="pointer-events-none absolute inset-x-12 truncate text-center text-sm font-black sm:text-base">
          تفاصيل الكتاب
        </h1>
        <div className="flex items-center gap-2">
          <ShareButton title={book.title} />
          <FavoriteButton
            bookId={book.id}
            isFavorite={isFavorite}
            isLoggedIn={Boolean(session?.user)}
          />
        </div>
      </header>

      <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xs">
        <div className="grid gap-6 p-4 sm:grid-cols-[210px_1fr] sm:gap-7 sm:p-6">
          <div className="mx-auto w-40 sm:w-full">
            <div className="relative aspect-[2/3] overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm">
              <BookOpen
                aria-hidden="true"
                className="absolute left-1/2 top-1/2 h-9 w-9 -translate-x-1/2 -translate-y-1/2 text-slate-300"
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/books/${encodeURIComponent(book.id)}/cover?v=${book.updatedAt.getTime()}`}
                alt={`غلاف كتاب ${book.title}`}
                className="relative z-10 h-full w-full object-cover"
              />
            </div>
          </div>

          <div className="flex min-w-0 flex-col">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                {categoryLabels[book.category] ?? "أخرى"}
              </span>
              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">
                {formatPoints(book.points)}
              </span>
            </div>

            <h2 className="mt-3 text-2xl font-black leading-tight text-slate-950 sm:text-3xl">
              {book.title}
            </h2>

            {book.author && (
              <p className="mt-1 text-sm font-medium text-slate-500">
                {book.author}
              </p>
            )}

      {/* شريط مواصفات احترافي بدون خط فاصل */}
<div className="mt-5 grid grid-cols-2 rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-50/90 via-white to-slate-50/50 p-2.5 shadow-2xs">
  
  {/* العنصر الأول: حالة الكتاب */}
  <div className="flex items-center gap-3.5 px-3 py-2">
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-600 ring-1 ring-teal-100 shadow-2xs">
      <Star className="h-5 w-5 " />
    </div>
    <div className="min-w-0 text-right">
      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
        حالة الكتاب
      </span>
      <span className="block truncate text-xs font-black text-slate-900 sm:text-sm">
        {conditionLabels[book.condition ?? ""] ?? "غير محددة"}
      </span>
    </div>
  </div>

  {/* العنصر الثاني: اللغة */}
  <div className="flex items-center gap-3.5 px-3 py-2">
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 ring-1 ring-sky-100 shadow-2xs">
      <Globe className="h-5 w-5" />
    </div>
    <div className="min-w-0 text-right">
      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
        لغة الكتاب
      </span>
      <span className="block truncate text-xs font-black text-slate-900 sm:text-sm">
        {formatLanguage(book.language)}
      </span>
    </div>
  </div>

</div>

            {/* بطاقة صاحب الكتاب مع زر متابعة تفاعلي */}
            <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-slate-100 p-3 transition hover:border-slate-200">
              <Link
                href={`/users/${book.owner.id}`}
                className="flex min-w-0 flex-1 items-center gap-3"
              >
                <UserAvatar userId={book.owner.id} name={book.owner.name} size="md" />
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-black text-slate-800 hover:text-teal-700">
                    {book.owner.name || "قارئ"}
                  </span>
                  {location && (
                    <span className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-teal-700" />
                      <span className="truncate">{location}</span>
                    </span>
                  )}
                </div>
              </Link>

              {!isOwner && (
                <form action={handleFollowToggle}>
                  <button
                    type="submit"
                    className={`flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition active:scale-95 ${
                      isFollowing
                        ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        : "bg-teal-50 text-teal-800 hover:bg-teal-100"
                    }`}
                  >
                    {isFollowing ? (
                      <>
                        <UserCheck className="h-3.5 w-3.5 text-teal-700" />
                        <span>متابَع</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-3.5 w-3.5" />
                        <span>متابعة</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>

            <div className="mt-auto pt-5">
              {isOwner ? (
                <Link
                  href={`/my-books/edit/${book.id}`}
                  className="flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-800"
                >
                  تعديل بيانات الكتاب
                </Link>
              ) : book.isAvailable ? (
               <Link
  href={session?.user ? `/swap/request?bookId=${book.id}` : "/login"}
  className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-primary px-4 py-3 text-sm font-black text-white transition hover:bg-brand-primary-hover active:scale-[0.98]"
>
  طلب الكتاب
</Link>

                 
              ) : (
                <p className="rounded-xl bg-slate-100 px-4 py-3 text-center text-sm font-bold text-slate-600">
                  هذا الكتاب غير متاح للتبادل حالياً.
                </p>
              )}
            </div>
          </div>
        </div>

        {book.description && (
          <section className="border-t border-slate-100 px-4 py-5 sm:px-6">
            <h3 className="text-sm font-black text-slate-900">نبذة عن الكتاب</h3>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-600">
              {book.description}
            </p>
          </section>
        )}
      </article>

      <p className="px-1 text-center text-xs text-slate-400">
        أُضيف في {new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium" }).format(book.createdAt)}
      </p>
    </main>
  );
}