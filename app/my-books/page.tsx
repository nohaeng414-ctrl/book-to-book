import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen, Edit3, CheckCircle2, Clock } from "lucide-react";
import BookCover from "@/components/BookCover";
import DeleteBookForm from "@/components/DeleteBookForm";

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

export default async function MyBooksPage({
  searchParams,
}: {
  searchParams: Promise<{ deleteError?: string; deleted?: string }>;
}) {
  const [query, session] = await Promise.all([searchParams, auth()]);
  if (!session?.user?.email) redirect("/login");

  // جلب كتب المستخدم غير المحذوفة فقط وبدون سحب coverUrl الثقيل
  const dbUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      isBanned: true,
      books: {
        where: { isDeleted: false },
        select: {
          id: true,
          title: true,
          author: true,
          category: true,
          condition: true,
          isAvailable: true,
          points: true,
          updatedAt: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (dbUser?.isBanned) redirect("/banned");

  const myBooks = dbUser?.books ?? [];

  return (
    <div className="w-full min-w-full pb-28 px-3 sm:px-4 pt-4">
      {query.deleteError && (
        <p
          role="alert"
          className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700"
        >
          {query.deleteError === "not-owner"
            ? "لا تملك صلاحية حذف هذا الكتاب أو أنه لم يعد موجوداً."
            : query.deleteError}
        </p>
      )}

      {query.deleted === "1" && (
        <p
          role="status"
          className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-700"
        >
          تم حذف الكتاب بنجاح.
        </p>
      )}

      {/* 📚 قائمة الكتب */}
      {myBooks.length === 0 ? (
        <div className="w-full rounded-3xl border border-dashed border-[#CBD5E1] bg-white px-5 py-14 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#F1F5F9] text-[#64748B]">
            <BookOpen className="h-6 w-6" />
          </span>
          <p className="mt-3 text-sm font-bold text-slate-700">
            ليس لديك أي كتب معروضة حالياً
          </p>
          <Link
            className="mt-5 inline-flex rounded-xl bg-gradient-to-r from-[#E8B042] to-[#CF9932] px-5 py-3 text-xs font-bold text-white transition hover:scale-105 active:scale-95 shadow-xs"
            href="/add-book"
          >
            أضف كتابك الأول
          </Link>
        </div>
      ) : (
        <div className="w-full grid grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-3.5">
          {myBooks.map((book) => (
            <article
              key={book.id}
              className="relative w-full overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white transition hover:shadow-md group flex flex-col justify-between"
            >
              <Link
                href={`/books/${book.id}`}
                aria-label={`عرض تفاصيل كتاب ${book.title}`}
                className="absolute inset-0 z-0 rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#E8B042]"
              />

              <div className="relative z-10 flex flex-1 pointer-events-none gap-3.5 p-3.5">
                {/* غلاف الكتاب */}
                <BookCover
                  bookId={book.id}
                  title={book.title}
                  updatedAt={book.updatedAt}
                  className="h-36 w-24 shrink-0 rounded-xl text-xs shadow-xs"
                />

                {/* تفاصيل الكتاب */}
                <div className="flex min-w-0 flex-1 flex-col py-0.5">
                  <div className="flex items-center justify-between mb-1 gap-1">
                    <span className="w-fit rounded-full bg-[#F1F5F9] px-2 py-0.5 text-[10px] font-bold text-[#334155]">
                      {categoryMap[book.category] || "أخرى"}
                    </span>

                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        book.isAvailable
                          ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                          : "bg-amber-50 text-amber-600 border border-amber-200"
                      }`}
                    >
                      {book.isAvailable ? (
                        <>
                          <CheckCircle2 className="h-3 w-3" /> متاح للتبادل
                        </>
                      ) : (
                        <>
                          <Clock className="h-3 w-3" /> قيد الاستبدال
                        </>
                      )}
                    </span>
                  </div>

                  <h3 className="mt-1 line-clamp-2 text-sm sm:text-base font-extrabold text-[#0F172A] leading-snug">
                    {book.title}
                  </h3>
                  <p className="mt-0.5 truncate text-xs text-[#64748B]">
                    {book.author || "غير محدد"}
                  </p>

                  <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                    <span className="truncate text-[11px] text-[#64748B]">
                      {conditionMap[book.condition || "GOOD"] || "جيدة"}
                    </span>
                    <span className="shrink-0 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] px-2 py-1 text-[11px] font-extrabold text-[#334155]">
                      {formatPoints(book.points)}
                    </span>
                  </div>
                </div>
              </div>

              {/* شريط الإجراءات */}
              <div className="relative z-10 flex pointer-events-none items-center justify-between border-t border-[#F1F5F9] px-4 py-2.5 bg-[#F8FAFC]">
                <div className="relative z-20 flex pointer-events-auto items-center gap-2">
                  <Link
                    href={`/my-books/edit/${book.id}`}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#CBD5E1] bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 active:scale-95 shadow-2xs"
                  >
                    <Edit3 className="h-3.5 w-3.5 text-slate-500" />
                    تعديل
                  </Link>

                  <DeleteBookForm
                    bookId={book.id}
                    bookTitle={book.title}
                    source="my-books"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50/70 px-3.5 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-100 active:scale-95 shadow-2xs"
                  />
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}