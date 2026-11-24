import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Coins,
  Edit3,
  Plus,
} from "lucide-react";
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
    <main
      dir="rtl"
      className="mx-auto w-full max-w-3xl space-y-6 px-3 sm:px-4 py-6 pb-28 text-[#0F172A]"
    >
    


      {/* رسائل التنبيه */}
      {query.deleteError && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50/80 p-3.5 text-xs font-bold text-red-700"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>
            {query.deleteError === "not-owner"
              ? "لا تملك صلاحية حذف هذا الكتاب أو أنه لم يعد موجوداً."
              : query.deleteError}
          </span>
        </div>
      )}

      {query.deleted === "1" && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-3.5 text-xs font-bold text-emerald-700"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>تم حذف الكتاب بنجاح.</span>
        </div>
      )}

      {/* 📚 قائمة الكتب */}
      {myBooks.length === 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white px-5 py-12 text-center shadow-2xs">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-500">
            <BookOpen className="h-5 w-5" />
          </span>
          <h2 className="mt-3 text-sm font-extrabold text-slate-900">
            ليس لديك أي كتب معروضة حالياً
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            أضف كتبك وابدأ بتبادلها مع القرّاء.
          </p>
          <Link
            href="/add-book"
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-slate-800 active:scale-95"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>أضف كتابك الأول</span>
          </Link>
        </section>
      ) : (
        <section
          aria-label="قائمة كتبي"
          className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs"
        >
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              الكتب المضافة
            </h2>
          </div>

          <div className="divide-y divide-slate-100">
            {myBooks.map((book) => (
              <article
                key={book.id}
                className="p-4 transition hover:bg-slate-50/60 space-y-3"
              >
                <div className="flex items-start gap-3.5">
                  {/* غلاف الكتاب */}
                  <Link
                    href={`/books/${book.id}`}
                    aria-label={`عرض تفاصيل كتاب ${book.title}`}
                    className="shrink-0 group"
                  >
                    <BookCover
                      bookId={book.id}
                      title={book.title}
                      updatedAt={book.updatedAt}
                      className="h-28 w-20 rounded-xl text-xs shadow-2xs transition-transform duration-200 group-hover:scale-[1.02]"
                    />
                  </Link>

                  {/* تفاصيل الكتاب */}
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[10px] font-bold text-slate-600">
                        {categoryMap[book.category] || "أخرى"}
                      </span>

                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
                          book.isAvailable
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-amber-200 bg-amber-50 text-amber-700"
                        }`}
                      >
                        {book.isAvailable ? (
                          <>
                            <CheckCircle2 className="h-3 w-3" />
                            <span>متاح للتبادل</span>
                          </>
                        ) : (
                          <>
                            <Clock className="h-3 w-3" />
                            <span>قيد الاستبدال</span>
                          </>
                        )}
                      </span>
                    </div>

                    <Link
                      href={`/books/${book.id}`}
                      className="mt-1.5 line-clamp-2 text-sm font-extrabold text-slate-900 hover:text-teal-700 transition-colors leading-snug"
                    >
                      {book.title}
                    </Link>

                    <p className="mt-0.5 truncate text-xs text-slate-400">
                      {book.author || "غير محدد"}
                    </p>

                    <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11px]">
                      <span className="rounded-lg border border-slate-200/80 bg-slate-50 px-2 py-0.5 font-bold text-slate-600">
                        الحالة: {conditionMap[book.condition || "GOOD"] || "جيد"}
                      </span>

                      <span className="inline-flex items-center gap-1 rounded-lg border border-amber-200/70 bg-amber-50/70 px-2 py-0.5 font-bold text-amber-800">
                        <Coins className="h-3 w-3 text-amber-600" />
                        <span>{formatPoints(book.points)}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* أزرار التعديل والحذف */}
                <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100/80">
                  <Link
                    href={`/my-books/edit/${book.id}`}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 active:scale-95"
                  >
                    <Edit3 className="h-3.5 w-3.5 text-slate-500" />
                    <span>تعديل</span>
                  </Link>

                  <DeleteBookForm
                    bookId={book.id}
                    bookTitle={book.title}
                    source="my-books"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50/60 px-3.5 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-100 active:scale-95"
                  />
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}