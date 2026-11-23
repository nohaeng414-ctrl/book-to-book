import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Heart } from "lucide-react";
import BookCover from "@/components/BookCover";
import UserAvatar from "@/components/UserAvatar";
import FavoriteButton from "@/components/FavoriteButton";

const categoryMap: Record<string, string> = {
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

const conditionMap: Record<string, string> = {
  LIKE_NEW: "شبه جديد",
  GOOD: "جيد",
  ACCEPTABLE: "مقبول",
};

const formatPoints = (count: number) => {
  if (count === 1) return "نقطة واحدة";
  if (count === 2) return "نقطتان";
  if (count >= 3 && count <= 10) return `${count} نقاط`;
  return `${count} نقطة`;
};

export default async function FavoritesPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      favoriteBooks: {
        where: { isDeleted: false },
        select: {
          id: true,
          title: true,
          author: true,
          points: true,
          category: true,
          condition: true,
          updatedAt: true,
          isAvailable: true,
          ownerId: true,
          owner: {
            select: {
              id: true,
              name: true,
              city: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!user) redirect("/login");

  return (
    <main
      dir="rtl"
      className="mx-auto w-full max-w-3xl space-y-6 px-3 sm:px-4 py-6 text-[#0F172A] pb-28"
    >
      {/* 🧭 الهيدر القياسي المتناسق مع التطبيق */}
      <header className="relative -mt-6 mb-6 flex h-14 w-full items-center justify-between rounded-b-2xl border-x border-b border-slate-200 bg-white px-3 shadow-2xs">
        <Link
          href="/profile"
          title="رجوع"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100 active:bg-slate-200 transition-colors"
        >
          <ArrowRight className="h-5 w-5" />
        </Link>

        <h1 className="text-base font-extrabold text-slate-900 tracking-tight select-none">
          المفضلة
        </h1>

        <div className="w-10" aria-hidden="true" />
      </header>

      {user.favoriteBooks.length === 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white px-5 py-12 text-center shadow-2xs">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-rose-50 text-rose-500 mb-3">
            <Heart className="h-5 w-5" />
          </span>
          <h2 className="mt-2 text-sm font-extrabold text-slate-900">
           احفظ كتبك المفضلة للوصول إليها سريعاً.
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            احفظ الكتب التي تعجبك لتصل إليها بسهولة لاحقاً.
          </p>
        </section>
      ) : (
        <section
          className="grid grid-cols-1 gap-3.5 sm:grid-cols-2"
          aria-label="الكتب المفضلة"
        >
          {user.favoriteBooks.map((book) => (
            <div
              key={book.id}
              className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:shadow-md hover:shadow-slate-900/5 group flex flex-col justify-between"
            >
              {/* تفاصيل الكتاب العلوية */}
              <Link
                href={`/books/${book.id}`}
                className="flex gap-3.5 p-3.5 flex-1"
              >
                <BookCover
                  bookId={book.id}
                  title={book.title}
                  updatedAt={book.updatedAt}
                  className="h-32 w-22 shrink-0 rounded-xl text-xs"
                />

                <div className="flex min-w-0 flex-1 flex-col py-0.5">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="w-fit rounded-full border border-slate-200/80 bg-slate-50 px-2.5 py-0.5 text-[10px] font-bold text-slate-600">
                      {categoryMap[book.category] || "أخرى"}
                    </span>
                    {!book.isAvailable && (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200/70">
                        محجوز حالياً
                      </span>
                    )}
                  </div>

                  <h3 className="mt-1.5 line-clamp-2 text-sm sm:text-base font-extrabold text-slate-900 leading-snug group-hover:text-teal-700 transition-colors">
                    {book.title}
                  </h3>
                  <p className="mt-0.5 truncate text-xs text-slate-400">
                    {book.author || "غير محدد"}
                  </p>

                  <div className="mt-auto flex items-center justify-between gap-2 pt-2.5">
                    <span className="truncate text-[11px] font-medium text-slate-500">
                      {conditionMap[book.condition || "GOOD"] || "جيد"}
                    </span>
                    <span className="shrink-0 rounded-lg bg-amber-50/80 border border-amber-200/70 px-2 py-0.5 text-[11px] font-extrabold text-amber-800">
                      {formatPoints(book.points)}
                    </span>
                  </div>
                </div>
              </Link>

              {/* شريط المالك وزر المفضلة على اليسار */}
              <div className="flex items-center justify-between border-t border-slate-100 px-3.5 py-2.5 bg-slate-50/70 relative z-10">
                <Link
                  href={`/users/${book.ownerId}`}
                  className="flex items-center gap-2 min-w-0 flex-1"
                >
                  <UserAvatar
                    userId={book.ownerId}
                    name={book.owner?.name}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-slate-800 hover:text-teal-700 transition-colors">
                      {book.owner?.name || "قارئ"}
                    </p>
                    <p className="truncate text-[10px] text-slate-400">
                      {book.owner?.city || "الموقع غير محدد"}
                    </p>
                  </div>
                </Link>

                <div className="shrink-0 ms-2">
                  <FavoriteButton
                    bookId={book.id}
                    isFavorite={true}
                    isLoggedIn={true}
                  />
                </div>
              </div>
            </div>
          ))}
        </section>
      )}
    </main>
  );
}