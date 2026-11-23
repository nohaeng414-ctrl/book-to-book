import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import BookCover from "@/components/BookCover";
import PendingSubmitButton from "@/components/PendingSubmitButton";
import { transitionSwap, SwapError } from "@/lib/swaps";
import { revalidatePath } from "next/cache";

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

export default async function UserBooksPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  const currentUser = session?.user?.email
    ? await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true },
      })
    : null;

  const targetUser = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      city: true,
      books: {
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
          // جلب الطلب المعلق الخاص بالمستخدم الحالي إن وجد
          swapsAsRequested: {
            where: {
              status: "PENDING",
              ...(currentUser ? { requesterId: currentUser.id } : {}),
            },
            select: { id: true },
            take: 1,
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!targetUser) notFound();

  const isSelf = session?.user?.email === targetUser.email;

  // Server Action لإلغاء الطلب مباشرة من الكارت
  async function cancelSwapAction(formData: FormData) {
    "use server";
    const currentSession = await auth();
    if (!currentSession?.user?.email) redirect("/login");
    const userRecord = await prisma.user.findUnique({
      where: { email: currentSession.user.email },
      select: { id: true },
    });
    if (!userRecord) redirect("/login");

    const swapId = String(formData.get("swapId") || "");
    try {
      await transitionSwap(userRecord.id, swapId, "cancel");
    } catch (error) {
      if (!(error instanceof SwapError)) throw error;
    }
    revalidatePath(`/users/${id}/books`);
    revalidatePath("/requests");
  }

  return (
    <main dir="rtl" className="mx-auto w-full max-w-4xl space-y-6 px-3 sm:px-4 py-6 text-[#0F172A] pb-28">
      <header className="relative -mt-6 mb-6 flex h-14 w-full items-center justify-between rounded-b-2xl border-x border-b border-slate-200 bg-white px-3 shadow-2xs">
        <Link
          href={`/users/${targetUser.id}`}
          title="رجوع"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100 active:bg-slate-200 transition-colors"
        >
          <ArrowRight className="h-5 w-5" />
        </Link>

        <h1 className="text-base font-extrabold text-slate-900 tracking-tight select-none">
          كتب {targetUser.name}
        </h1>

                <div className="w-10" aria-hidden="true" />

      </header>

      {targetUser.books.length === 0 ? (
        <section className="rounded-3xl border border-dashed border-[#CBD5E1] bg-white px-5 py-14 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-500 mb-3">
            <BookOpen className="h-6 w-6" />
          </span>
          <h2 className="mt-2 text-base font-extrabold text-slate-800">لا توجد كتب معروضة حالياً</h2>
          <p className="mt-1 text-xs text-slate-500">لم يقم {targetUser.name} بإضافة أي كتب للمكتبة بعد.</p>
        </section>
      ) : (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2" aria-label={`كتب ${targetUser.name}`}>
          {targetUser.books.map((book) => {
            const activeSwap = book.swapsAsRequested[0];

            return (
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

                {/* شريط الإجراء السفلي */}
                <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5 bg-slate-50/80 relative z-10">
                  <span className="text-xs font-semibold text-slate-500">
                  </span>

                  {isSelf ? (
                    <Link
                      href={`/my-books/edit/${book.id}`}
                      className="inline-flex items-center justify-center rounded-xl bg-slate-200 hover:bg-slate-300 px-3.5 py-1.5 text-xs font-bold text-slate-700 transition active:scale-95"
                    >
                      تعديل
                    </Link>
                  ) : book.isAvailable ? (
                    <Link
                      href={session?.user ? `/swap/request?bookId=${book.id}` : "/login"}
                      className="inline-flex items-center justify-center rounded-xl bg-[#1E293B] hover:bg-[#334155] px-4 py-2 text-xs font-bold text-white transition hover:scale-105 active:scale-95 shadow-sm shadow-[#1E293B]/20"
                    >
                      اطلب الكتاب
                    </Link>
                  ) : activeSwap ? (
                    /* زر إلغاء الطلب بلون أحمر ناعم ومختلف تماماً */
                    <form action={cancelSwapAction}>
                      <input type="hidden" name="swapId" value={activeSwap.id} />
                      <PendingSubmitButton
                        pendingText="جارٍ الإلغاء..."
                        className="inline-flex items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-1.5 text-xs font-bold text-rose-700 transition hover:bg-rose-100 active:scale-95 shadow-2xs"
                      >
                        إلغاء الطلب
                      </PendingSubmitButton>
                    </form>
                  ) : (
                    <span className="rounded-lg bg-slate-100 border border-slate-200 px-2.5 py-1 text-[11px] font-bold text-slate-500">
                      محجوز
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </section>
      )}
    </main>
  );
}