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
    <main dir="rtl" className="mx-auto w-full max-w-4xl space-y-6 px-3 sm:px-4 py-6 text-[#0F172A] pb-28">
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
        <section className="rounded-3xl border border-dashed border-[#CBD5E1] bg-white px-5 py-14 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-rose-50 text-rose-500 mb-3">
            <Heart className="h-6 w-6" />
          </span>
          <h2 className="mt-2 text-base font-extrabold text-slate-800">لم تضف كتبًا للمفضلة بعد</h2>
          <p className="mt-1 text-xs text-slate-500">تصفح المعرض واضغط على رمز القلب لحفظ الكتب التي تعجبك.</p>
        </section>
      ) : (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2" aria-label="الكتب المفضلة">
          {user.favoriteBooks.map((book) => (
            <div
              key={book.id}
              className="relative overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white transition hover:-translate-y-1 hover:shadow-lg hover:shadow-[#334155]/15 group flex flex-col justify-between"
            >
              {/* تفاصيل الكتاب العلوية */}
              <Link href={`/books/${book.id}`} className="flex gap-4 p-3.5 flex-1">
                <BookCover
                  bookId={book.id}
                  title={book.title}
                  updatedAt={book.updatedAt}
                  className="h-36 w-24 shrink-0 rounded-xl text-sm"
                />

                <div className="flex min-w-0 flex-1 flex-col py-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="w-fit rounded-full bg-[#F1F5F9] px-2.5 py-1 text-[11px] font-bold text-[#334155]">
                      {categoryMap[book.category] || "أخرى"}
                    </span>
                    {!book.isAvailable && (
                      <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200/60">
                        محجوز حالياً
                      </span>
                    )}
                  </div>

                  <h3 className="mt-2 line-clamp-2 text-base font-extrabold text-[#0F172A] leading-6 group-hover:text-teal-700 transition-colors">
                    {book.title}
                  </h3>
                  <p className="mt-1 truncate text-xs text-[#64748B]">{book.author || "غير محدد"}</p>

                  <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                    <span className="truncate text-[11px] text-[#64748B]">
                      {conditionMap[book.condition || "GOOD"] || "جيدة"}
                    </span>
                    <span className="shrink-0 rounded-lg bg-amber-50 border border-amber-200/70 px-2.5 py-1.5 text-xs font-black text-amber-800">
                      {formatPoints(book.points)}
                    </span>
                  </div>
                </div>
              </Link>

              {/* شريط المالك وزر المفضلة على اليسار */}
              <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5 bg-slate-50/80 relative z-10">
                <Link href={`/users/${book.ownerId}`} className="flex items-center gap-2.5 min-w-0 flex-1">
                  <UserAvatar userId={book.ownerId} name={book.owner?.name} size="sm" />
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
                  <FavoriteButton bookId={book.id} isFavorite={true} isLoggedIn={true} />
                </div>
              </div>
            </div>
          ))}
        </section>
      )}
    </main>
  );
}