import { prisma } from "@/lib/prisma";
import Link from "next/link";

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

function BookIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5">
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 1 4 17.5v-12Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M4 17.5A2.5 2.5 0 0 1 6.5 15H20M8 7h7M8 10h7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function ExchangeBooksIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-6 w-6">
      <path d="M4 8c2.3-.8 4.8-.5 8 1v10c-3.2-1.5-5.7-1.8-8-1V8Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M20 8c-2.3-.8-4.8-.5-8 1v10c3.2-1.5 5.7-1.8 8-1V8Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M7 4h10m0 0-2-2m2 2-2 2" stroke="#F2D9C9" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 22H7m0 0 2-2m-2 2 2 2" stroke="#F2D9C9" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5">
      <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V10Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5">
      <rect x="4" y="4" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
      <rect x="14" y="4" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
      <rect x="4" y="14" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
      <rect x="14" y="14" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const params = await searchParams;
  const selectedCategory = params.category;

  const books = await prisma.book.findMany({
    where: {
      isAvailable: true,
      ...(selectedCategory ? { category: selectedCategory as any } : {}),
    },
    include: { owner: true },
    orderBy: { createdAt: "desc" },
  });

  const categories = [...new Set(books.map((book) => book.category))];

  return (
    <main id="top" dir="rtl" className="min-h-screen bg-[#F8F7F3] pb-24 text-[#25372d] md:pb-0">
      <header className="sticky top-0 z-30 border-b border-[#e8ece5] bg-[#F8F7F3]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
          <Link className="flex items-center gap-2.5" href="/">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#465D7A] text-white">
              <ExchangeBooksIcon/>
            </span>
            <span className="text-lg font-extrabold tracking-tight">كتاب بكتاب</span>
          </Link>
          <Link className="inline-flex items-center gap-2 rounded-xl bg-[#465D7A] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#374A65]" href="/add-book">
            <span className="text-lg leading-none">+</span>
            <span>أضف كتابك</span>
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 pb-7 pt-8 sm:px-6 sm:pt-12">
        <div className="relative overflow-hidden rounded-[28px] bg-[#465D7A] px-5 py-7 text-white sm:px-9 sm:py-10">
          <div aria-hidden="true" className="absolute -left-12 -top-16 h-48 w-48 rounded-full border border-white/10" />
          <div aria-hidden="true" className="absolute -left-5 -top-9 h-32 w-32 rounded-full border border-white/10" />
          <div className="relative max-w-2xl">
            <p className="mb-3 text-sm font-semibold text-[#F2D9C9]">مجتمع القرّاء</p>
            <h1 className="text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              اكتشف كتباً جديدة
              <span className="block text-[#F2D9C9]">واستبدل كتابك</span>
            </h1>
          </div>
          <div aria-hidden="true" className="absolute bottom-0 left-8 hidden h-32 items-end gap-2 sm:flex">
            <span className="h-20 w-9 rounded-t-md bg-[#d99169] shadow-lg" />
            <span className="h-28 w-10 rounded-t-md bg-[#e4d7ad] shadow-lg" />
            <span className="h-24 w-9 rounded-t-md bg-[#91a88b] shadow-lg" />
          </div>
        </div>
      </section>

      <section id="categories" className="mx-auto max-w-6xl px-4 pb-8 sm:px-6">
        <div className="mb-4 flex items-end justify-between">
          <h2 className="mt-1 text-xl font-extrabold">تصفّح حسب الفئة</h2>
        </div>

        {categories.length > 0 && (
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:px-0">
            <Link !selectedCategory "border-[#465D7A] "border-[#e2e8df] ${ : ? bg-[#465D7A] bg-white border className="{`shrink-0" font-semibold href="/" inline-flex px-4 py-2.5 rounded-full text-[#53665a]" text-sm text-white" transition }`}>
              كل الكتب
            </Link>

            {categories.map((category) => (
              <Link "border-[#465D7A] "border-[#e2e8df] ${ : ? bg-[#465D7A] bg-white border category className="{`shrink-0" font-semibold href="{`/?category=${encodeURIComponent(category)}`}" inline-flex key="{category}" px-4 py-2.5 rounded-full selectedCategory="==" text-[#53665a]" text-sm text-white" transition }`}>
                {categoryMap[category] || "أخرى"}
              </Link>
            ))}
          </div>
        )}
      </section>

      <section id="books" className="mx-auto max-w-6xl px-4 pb-12 sm:px-6">
        {books.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#dce4d9] bg-white px-5 py-14 text-center">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#EEF1F4] text-[#465D7A]">
              <BookIcon/>
            </span>
            <p className="mt-2 text-sm text-[#7d8980]">أضف كتابك ليبدأ رحلته إلى قارئ جديد.</p>
            <Link className="mt-5 inline-flex rounded-xl bg-[#465D7A] px-5 py-3 text-sm font-bold text-white" href="/add-book">
              أضف كتابك
            </Link>
          </div>
        ) : (
          <div className="space-y-9">
            {(selectedCategory ? [selectedCategory] : categories).map((category) => {
              const categoryBooks = books.filter((book) => book.category === category);
              if (categoryBooks.length === 0) return null;

              return (
                <section key={category} id={`category-${category}`} className="scroll-mt-24">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-xl font-extrabold">{categoryMap[category] || "أخرى"}</h2>
                    <span className="text-sm text-[#7d8980]">{categoryBooks.length} كتاب</span>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {categoryBooks.map((book) => (
                      <article key={book.id} className="overflow-hidden rounded-2xl border border-[#e8ece5] bg-white transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#25372d]/5">
                        <div className="flex gap-4 p-3.5">
                          <div
                            className="relative flex h-36 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-[#8F6E63] to-[#465D7A] p-2.5 text-center text-sm font-extrabold leading-6 text-white"
                            style={
                              book.coverUrl
                                ? { backgroundImage: `linear-gradient(#20362c33,#20362c33), url("${book.coverUrl}")`, backgroundSize: "cover", backgroundPosition: "center" }
                                : undefined
                            }
                          >
                            {!book.coverUrl && book.title}
                          </div>

                          <div className="flex min-w-0 flex-1 flex-col py-1">
                            <span className="w-fit rounded-full bg-[#EEF1F4] px-2.5 py-1 text-[11px] font-bold text-[#4D647D]">
                              {categoryMap[book.category] || "أخرى"}
                            </span>
                            <h3 className="mt-2 line-clamp-2 text-base font-extrabold leading-6">{book.title}</h3>
                            <p className="mt-1 truncate text-xs text-[#7d8980]">{book.author}</p>
                            <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                              <span className="truncate text-[11px] text-[#6f7c72]">{conditionMap[book.condition || "GOOD"] || "جيدة"}</span>
                              <span className="shrink-0 rounded-lg bg-[#f4f1e5] px-2.5 py-1.5 text-xs font-extrabold text-[#74633c]">{book.points} نقاط</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between border-t border-[#f0f2ed] px-4 py-3">
                          <div className="min-w-0">
                            <p className="truncate text-xs font-bold">{book.owner?.name || "قارئ"}</p>
                            <p className="mt-0.5 truncate text-[11px] text-[#8a958c]">{book.owner?.city || "الموقع غير محدد"}</p>
                          </div>
                          <button type="button" className="rounded-xl bg-[#465D7A] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#374A65]">
                            اطلب الكتاب
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </section>

      <nav aria-label="التنقل الرئيسي" className="fixed inset-x-0 bottom-0 z-40 border-t border-[#e8ece5] bg-white/95 px-5 pb-[max(env(safe-area-inset-bottom),10px)] pt-2 backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-md items-center justify-around">
          <a href="#top" className="flex min-w-16 flex-col items-center gap-1 py-1 text-[#465D7A]">
            <HomeIcon/>
            <span className="text-[10px] font-bold">الرئيسية</span>
          </a>
          <a href="#categories" className="flex min-w-16 flex-col items-center gap-1 py-1 text-[#7d8980]">
            <GridIcon/>
            <span className="text-[10px] font-semibold">الفئات</span>
          </a>
          <Link aria-label="أضيفي كتاباً" className="-mt-6 grid h-12 w-12 place-items-center rounded-2xl bg-[#465D7A] text-2xl text-white shadow-lg shadow-[#465D7A]/25" href="/add-book">
            +
          </Link>
          <a href="#books" className="flex min-w-16 flex-col items-center gap-1 py-1 text-[#7d8980]">
            <BookIcon/>
            <span className="text-[10px] font-semibold">الكتب</span>
          </a>
        </div>
      </nav>
    </main>
  );
}