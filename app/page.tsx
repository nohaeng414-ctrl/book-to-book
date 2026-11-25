import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { auth } from "@/auth";
import BookCover from "@/components/BookCover";
import FiltersDropdown from "@/components/FiltersDropdown";
import SortSelect from "@/components/SortSelect";
import UserAvatar from "@/components/UserAvatar";
import { Sparkles, Clock, ArrowLeft } from "lucide-react";
import { BookCategory, Prisma } from "@/generated/prisma-full";

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

const formatBooksCount = (count: number) => {
  if (count === 1) return "كتاب واحد";
  if (count === 2) return "كتابان";
  if (count >= 3 && count <= 10) return `${count} كتب`;
  return `${count} كتاباً`;
};

const formatPoints = (count: number) => {
  if (count === 1) return "نقطة واحدة";
  if (count === 2) return "نقطتان";
  if (count >= 3 && count <= 10) return `${count} نقاط`;
  return `${count} نقطة`;
};

// جلب الكتب المتاحة مرة واحدة فقط وبدون سحب حقل coverUrl الثقيل!
const BOOKS_PER_PAGE = 24;

function buildAvailableBookWhere(options: {
  category?: string;
  condition?: string;
  city?: string;
  language?: string;
  points?: number;
  query?: string;
  excludeOwnerId?: string;
}) {
  const query = options.query?.trim().slice(0, 120);
  return {
    isAvailable: true,
    isDeleted: false,
    ...(options.category ? { category: options.category as never } : {}),
    ...(options.condition ? { condition: options.condition } : {}),
    ...(options.language ? { language: options.language } : {}),
    ...(options.points !== undefined ? { points: options.points } : {}),
    ...(options.excludeOwnerId ? { ownerId: { not: options.excludeOwnerId } } : {}),
    ...(options.city ? { owner: { city: options.city } } : {}),
    ...(query
      ? {
          OR: [
            { title: { contains: query, mode: "insensitive" as const } },
            { author: { contains: query, mode: "insensitive" as const } },
            { description: { contains: query, mode: "insensitive" as const } },
            { owner: { name: { contains: query, mode: "insensitive" as const } } },
            { owner: { city: { contains: query, mode: "insensitive" as const } } },
            { category: { in: Object.entries(categoryMap).filter(([, label]) => label.includes(query)).map(([category]) => category) as never[] } },
          ],
        }
      : {}),
  } satisfies Prisma.BookWhereInput;
}

async function getAvailableBooks(options: {
  category?: string;
  condition?: string;
  city?: string;
  language?: string;
  points?: number;
  query?: string;
  excludeOwnerId?: string;
  sort: string;
  page: number;
}) {
  const where = buildAvailableBookWhere(options);

  return prisma.book.findMany({
    where,
    select: {
      id: true,
      ownerId: true,
      title: true,
      author: true,
      description: true,
      createdAt: true,
      updatedAt: true,
      points: true,
      category: true,
      condition: true,
      language: true,
      owner: { select: { id: true, name: true, city: true } },
    },
    orderBy:
      options.sort === "oldest"
        ? [{ createdAt: "asc" }]
        : options.sort === "title-asc"
          ? [{ title: "asc" }, { createdAt: "desc" }]
          : options.sort === "points-asc"
            ? [{ points: "asc" }, { createdAt: "desc" }]
            : options.sort === "points-desc"
              ? [{ points: "desc" }, { createdAt: "desc" }]
              : options.sort === "condition-best"
                ? [{ condition: "desc" }, { createdAt: "desc" }]
                : [{ createdAt: "desc" }],
    skip: (options.page - 1) * BOOKS_PER_PAGE,
    take: BOOKS_PER_PAGE,
  });
}

function BookIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5">
      <path
        d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 1 4 17.5v-12Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M4 17.5A2.5 2.5 0 0 1 6.5 15H20M8 7h7M8 10h7"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{
    category?: string;
    q?: string;
    condition?: string;
    city?: string;
    language?: string;
    points?: string;
    sort?: string;
    page?: string;
  }>;
}) {
  // 1. جلب الجلسة والـ params والكتب المتاحة بالتوازي في نفس اللحظة
  const [session, params] = await Promise.all([
    auth(),
    searchParams,
  ]);

  const selectedCategory = params.category && categoryMap[params.category] ? params.category : undefined;
  const searchQuery = (params.q ?? "").trim().slice(0, 120);
  const selectedCondition = ["LIKE_NEW", "GOOD", "ACCEPTABLE"].includes(params.condition ?? "") ? params.condition! : "";
  const selectedCity = (params.city ?? "").slice(0, 100);
  const selectedLanguage = ["ARABIC", "ENGLISH", "FRENCH"].includes(params.language ?? "") ? params.language! : "";
  const selectedPoints = /^[1-3]$/.test(params.points ?? "") ? params.points! : "";

  const languageMap: Record<string, string> = {
    ARABIC: "العربية",
    ENGLISH: "الإنجليزية",
    FRENCH: "الفرنسية",
  };

  const sortOrder = [
    "newest",
    "oldest",
    "title-asc",
    "points-asc",
    "points-desc",
    "condition-best",
  ].includes(params.sort ?? "")
    ? params.sort!
    : "newest";

  // 2. جلب معرف المستخدم وقائمة الأشخاص الذين يتابعهم.
  let currentUserId: string | undefined = undefined;
  let followedOwnerIds = new Set<string>();

  if (session?.user?.email) {
    const dbUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        following: { select: { id: true } },
      },
    });
    currentUserId = dbUser?.id;
    if (dbUser?.following) {
      followedOwnerIds = new Set(dbUser.following.map((u) => u.id));
    }
  }

  const requestedPage = /^\d+$/.test(params.page ?? "") ? Number(params.page) : 1;
  const selectedPointsNumber = selectedPoints ? Number(selectedPoints) : undefined;
  const catalogWhere = buildAvailableBookWhere({
    category: selectedCategory,
    condition: selectedCondition,
    city: selectedCity,
    language: selectedLanguage,
    points: selectedPointsNumber,
    query: searchQuery,
    excludeOwnerId: currentUserId,
  });
  const categoryWhere = buildAvailableBookWhere({
    condition: selectedCondition,
    city: selectedCity,
    language: selectedLanguage,
    points: selectedPointsNumber,
    query: searchQuery,
    excludeOwnerId: currentUserId,
  });
  const totalBooks = await prisma.book.count({ where: catalogWhere });
  const pageCount = Math.max(1, Math.ceil(totalBooks / BOOKS_PER_PAGE));
  const page = Number.isFinite(requestedPage) ? Math.max(1, Math.min(requestedPage, pageCount)) : 1;
  const [rawCatalog, cities, languages, categoryCounts] = await Promise.all([
    getAvailableBooks({
      category: selectedCategory,
      condition: selectedCondition,
      city: selectedCity,
      language: selectedLanguage,
      points: selectedPointsNumber,
      query: searchQuery.slice(0, 120),
      excludeOwnerId: currentUserId,
      sort: sortOrder,
      page,
    }),
    prisma.user.findMany({ where: { city: { not: "" } }, select: { city: true }, distinct: ["city"], orderBy: { city: "asc" } }),
    prisma.book.findMany({ where: { isAvailable: true, isDeleted: false }, select: { language: true }, distinct: ["language"], orderBy: { language: "asc" } }),
    prisma.book.groupBy({ by: ["category"], where: categoryWhere, _count: { _all: true } }),
  ]);

  const isEnglish = searchQuery ? /^[a-zA-Z\s]+$/.test(searchQuery) : false;

  const catalog = rawCatalog.map((book) => ({
    ...book,
    createdAt: new Date(String(book.createdAt)),
    updatedAt: new Date(String(book.updatedAt)),
  }));

  // استبعاد كتب المستخدم الحالي من العرض العام
  const allBooks = currentUserId
    ? catalog.filter((book) => book.ownerId !== currentUserId)
    : catalog;

  // 3. استخراج التصنيفات المفضلة والكتب المقترحة ("من أجلك") فوراً من الذاكرة بـ 0ms!
  const preferredCategories = new Set(
    allBooks
      .filter((book) => followedOwnerIds.has(book.ownerId))
      .map((book) => book.category)
  );

  const recommendedBooks =
    preferredCategories.size > 0
      ? allBooks.filter((book) => preferredCategories.has(book.category)).slice(0, 4)
      : [];

  // عرض أول 4 كتب فقط في شريط أحدث الكتب (مع إعطاء الأولوية لمن يتابعهم)
  const latestPriorityBooks = [...allBooks]
    .sort((first, second) => {
      const isFirstFollowed = followedOwnerIds.has(first.ownerId);
      const isSecondFollowed = followedOwnerIds.has(second.ownerId);
      if (isFirstFollowed && !isSecondFollowed) return -1;
      if (!isFirstFollowed && isSecondFollowed) return 1;
      return new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime();
    })
    .slice(0, 4);

  const cityOptions = cities.map((item) => item.city).filter(Boolean);
  const languageOptions = languages.map((item) => item.language).filter(Boolean);
  const availableCategories = new Set(
    categoryCounts.filter((item) => item._count._all > 0).map((item) => item.category)
  );
  const categories = Object.keys(categoryMap).filter((category) =>
    availableCategories.has(category as BookCategory)
  );
  const categoryCountMap = new Map(categoryCounts.map((item) => [item.category, item._count._all]));

  const displayBooks = allBooks
    .sort((first, second) => {
      if (sortOrder === "newest" && followedOwnerIds.size > 0) {
        const isFirstFollowed = followedOwnerIds.has(first.ownerId);
        const isSecondFollowed = followedOwnerIds.has(second.ownerId);
        if (isFirstFollowed && !isSecondFollowed) return -1;
        if (!isFirstFollowed && isSecondFollowed) return 1;
      }
      return 0;
    });

  const filters = new URLSearchParams();
  if (searchQuery) filters.set("q", searchQuery);
  if (selectedCategory) filters.set("category", selectedCategory);
  if (selectedCity) filters.set("city", selectedCity);
  if (selectedLanguage) filters.set("language", selectedLanguage);
  if (selectedPoints) filters.set("points", selectedPoints);
  if (selectedCondition) filters.set("condition", selectedCondition);
  if (sortOrder !== "newest") filters.set("sort", sortOrder);
  const categoryHref = (category?: string) => {
    const query = new URLSearchParams(filters);
    query.delete("page");
    if (category) query.set("category", category);
    else query.delete("category");
    const anchor = category ? "#books" : "#categories";
    return query.size ? `/?${query.toString()}${anchor}` : `/${anchor}`;
  };
  const pageHref = (targetPage: number) => {
    const query = new URLSearchParams(filters);
    query.set("page", String(targetPage));
    return `/?${query.toString()}#books`;
  };

  const activeFiltersCount = [
    selectedCity,
    selectedLanguage,
    selectedPoints,
    selectedCondition,
  ].filter(Boolean).length;

  const isFilteredView = Boolean(
    searchQuery || selectedCategory || activeFiltersCount > 0 || sortOrder !== "newest"
  );
  const myBooksCount =
    displayBooks.length === 0 && !isFilteredView && currentUserId
      ? await prisma.book.count({
          where: { ownerId: currentUserId, isDeleted: false },
        })
      : 0;

  return (
    <div id="top" className="w-full pb-10">
      {/* شريط البحث */}
      <div className="sticky top-0 z-40 bg-[#F1F5F9]/95 backdrop-blur-md px-4 py-3 sm:px-6">
        <div className="w-full">
          <form method="GET" action="/" className="relative w-full">
            <span className="absolute inset-y-0 right-3.5 flex items-center pointer-events-none text-[#94A3B8]">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                />
              </svg>
            </span>
            <input
              type="text"
              name="q"
              maxLength={120}
              defaultValue={searchQuery}
              placeholder="ابحث عن كتاب، كاتب، تصنيف..."
              className="w-full rounded-2xl border border-[#CBD5E1] bg-white py-2.5 pr-10 pl-4 text-xs font-medium text-[#0F172A] placeholder-[#94A3B8] shadow-sm focus:border-[#1E293B] focus:outline-none transition"
            />
          </form>
        </div>
      </div>

 {/* بنر الترحيب */}
      <section dir={isEnglish ? "ltr" : "rtl"} className="w-full px-4 pb-7 pt-4 sm:px-6">
        <style>{`
          @keyframes ktbBookSoftFloat {
            0%, 100% {
              transform: translate3d(0, 0, 0) rotate(0deg);
            }
            50% {
              transform: translate3d(0, -4px, 0) rotate(-0.8deg);
            }
          }
          .ktb-book-float-1 {
            animation: ktbBookSoftFloat 3.2s ease-in-out infinite;
            will-change: transform;
          }
          .ktb-book-float-2 {
            animation: ktbBookSoftFloat 3.2s ease-in-out 0.4s infinite;
            will-change: transform;
          }
          .ktb-book-float-3 {
            animation: ktbBookSoftFloat 3.2s ease-in-out 0.8s infinite;
            will-change: transform;
          }
        `}</style>

        <div className="group relative overflow-hidden rounded-[28px] bg-gradient-to-r from-[#0F172A] via-[#1E293B] to-[#334155] px-5 py-8 text-white sm:px-9 sm:py-11 shadow-xl shadow-[#0F172A]/20 border border-[#334155]">
          <div aria-hidden="true" className="absolute -top-16 end-[-3rem] h-48 w-48 rounded-full border border-white/10" />
          <div aria-hidden="true" className="absolute -top-9 end-[-1.25rem] h-32 w-32 rounded-full border border-white/10" />

          <div
            className={`relative z-10 flex flex-col sm:flex-row ${
              isEnglish ? "sm:flex-row-reverse text-left" : "text-right"
            } items-start sm:items-end justify-between gap-10 sm:gap-16 lg:gap-24`}
          >
            <div className="relative max-w-sm lg:max-w-md z-10 pb-8 sm:pb-0">
              <p className="mb-2 text-2xl sm:text-xl font-semibold tracking-wide text-[#94A3B8]">
                {isEnglish ? "A community of readers" : "مجتمع القرّاء"}
              </p>
              <h1 className="text-2xl font-extrabold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
                {isEnglish ? "Discover new books" : "استبدل كتبك"}
                <span className="block text-[#E2E8F0] mt-1.5 font-bold">
                  {isEnglish ? "and exchange your books" : "واكتشف عوالم جديدة"}
                </span>
              </h1>
            </div>

            <div
              aria-hidden="true"
              className="absolute -bottom-8 end-2 sm:static sm:mt-auto sm:translate-y-10 sm:me-12 lg:me-20 flex items-end gap-1.5 sm:gap-2.5 shrink-0 origin-bottom transition-transform duration-500 group-hover:scale-105"
            >
              <div className="ktb-book-float-1 relative h-16 w-5 sm:h-24 sm:w-8 self-end group/yellow hover:-translate-y-4 transition-transform duration-300">
                <div className="absolute inset-0 origin-bottom-left rounded-t-md bg-[#E8B042] shadow-2xl border-r border-white/20">
                  <span className="absolute top-3 right-1/2 translate-x-1/2 h-4 w-1 rounded-full bg-black/15" />
                  <span className="absolute bottom-2 left-0 right-0 h-1 bg-black/10" />
                </div>
              </div>
              <div className="ktb-book-float-2 relative h-22 w-6 sm:h-32 sm:w-9 self-end group/pink hover:-translate-y-8 transition-transform duration-300 delay-75">
                <div className="absolute inset-0 origin-bottom-left rounded-t-md bg-[#D98CB3] shadow-2xl border-r border-white/25">
                  <span className="absolute top-4 right-1/2 translate-x-1/2 h-6 w-1 rounded-full bg-white/25" />
                  <span className="absolute bottom-2 left-0 right-0 h-1 bg-black/10" />
                </div>
              </div>
              <div className="ktb-book-float-3 relative h-18 w-5 sm:h-28 sm:w-8 self-end group/blue hover:-translate-y-6 transition-transform duration-300 delay-150">
                <div className="absolute inset-0 origin-bottom-left rounded-t-md bg-[#5A9BAE] shadow-xl border-r border-white/20">
                  <span className="absolute top-3 right-1/2 translate-x-1/2 h-4 w-1 rounded-full bg-black/15" />
                  <span className="absolute bottom-2 left-0 right-0 h-1 bg-black/10" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* تصفح حسب الفئة */}
      <section id="categories" className="w-full px-4 pb-6 sm:px-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-[#0F172A]">تصفّح حسب الفئة</h2>
        </div>
        {categories.length > 0 && (
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:px-0 scrollbar-none">
            <Link
              href={categoryHref()}
              className={`shrink-0 inline-flex items-center rounded-full px-4 py-2 text-xs sm:text-sm font-semibold transition-all duration-200 ${
                !selectedCategory
                  ? "bg-brand-accent text-white shadow-md shadow-brand-accent/30 scale-[1.02]"
                  : "bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300"
              }`}
            >
              كل الكتب
            </Link>
            {categories.map((category) => (
              <Link
                key={category}
                href={categoryHref(category)}
                className={`shrink-0 inline-flex items-center rounded-full px-4 py-2 text-xs sm:text-sm font-semibold transition-all duration-200 ${
                  selectedCategory === category
                    ? "bg-brand-accent text-white shadow-md shadow-brand-accent/30 scale-[1.02]"
                    : "bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300"
                }`}
              >
                {categoryMap[category] || "أخرى"}
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* 🎛️ فلتر منسدل موحّد والترتيب */}
      {isFilteredView && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <section className="w-full px-4 pb-6 sm:px-6">
            <div className="flex items-center gap-2">
              <FiltersDropdown
                cities={cityOptions}
                languages={languageOptions}
                languageMap={languageMap}
                selectedCity={selectedCity}
                selectedLanguage={selectedLanguage}
                selectedPoints={selectedPoints}
                selectedCondition={selectedCondition}
                sortOrder={sortOrder}
                searchQuery={searchQuery}
                selectedCategory={selectedCategory}
                activeCount={activeFiltersCount}
              />
              <SortSelect sortOrder={sortOrder} />
            </div>
          </section>
        </div>
      )}

      {/* ✨ قسم أحدث الكتب المضافة */}
      {latestPriorityBooks.length > 0 && !isFilteredView && (
        <section className="w-full px-4 pb-7 sm:px-6">
          <div className="mb-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-brand-teal" />
              <h2 className="text-lg font-extrabold text-[#0F172A]">أحدث الكتب المضافة</h2>
            </div>
          </div>

          <div className="-mx-4 flex gap-3.5 overflow-x-auto px-4 pb-3 sm:mx-0 sm:px-0 scrollbar-none">
            {latestPriorityBooks.map((book) => (
              <div
                key={`latest-${book.id}`}
                className="group w-64 sm:w-72 shrink-0 overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white transition-all hover:-translate-y-0.5 hover:shadow-md flex flex-col justify-between"
              >
                <Link href={`/books/${book.id}`} className="flex gap-3 p-3 flex-1">
                  <BookCover
                    bookId={book.id}
                    title={book.title}
                    updatedAt={book.updatedAt}
                    className="h-28 w-20 shrink-0 rounded-xl text-xs shadow-xs"
                  />
                  <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
                    <div>
                      <span className="rounded-full bg-[#F1F5F9] px-2 py-0.5 text-[10px] font-bold text-[#334155]">
                        {categoryMap[book.category] || "أخرى"}
                      </span>
                      <h3 className="mt-1.5 line-clamp-2 text-xs sm:text-sm font-extrabold text-[#0F172A] group-hover:text-brand-teal transition-colors">
                        {book.title}
                      </h3>
                      <p className="mt-0.5 truncate text-[11px] text-[#64748B]">
                        {book.author || ""}
                      </p>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[10px] text-[#64748B]">
                        {conditionMap[book.condition || "GOOD"] || "جيدة"}
                      </span>
                      <span className="rounded-md bg-amber-50 border border-amber-200/70 px-2 py-0.5 text-[10px] font-black text-amber-800">
                        {formatPoints(book.points)}
                      </span>
                    </div>
                  </div>
                </Link>

                <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2 bg-slate-50/70">
                  <Link href={`/users/${book.ownerId}`} className="flex items-center gap-2 min-w-0 flex-1">
                    <UserAvatar userId={book.ownerId} name={book.owner?.name} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-slate-800">{book.owner?.name || "قارئ"}</p>
                      <p className="truncate text-[10px] text-slate-400">{book.owner?.city || "الموقع غير محدد"}</p>
                    </div>
                  </Link>
                  <Link
                    href={session?.user ? `/swap/request?bookId=${book.id}` : "/login"}
                    className="rounded-lg bg-brand-primary hover:bg-brand-primary-hover px-3 py-1.5 text-[11px] font-bold text-white transition active:scale-95 shrink-0 ms-2"
                  >
                    اطلب الكتاب
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 💡 ترشيحات تناسب اهتماماتك القرائية */}
      {recommendedBooks.length > 0 && !isFilteredView && (
        <section className="w-full px-4 pb-7 sm:px-6">
          <div className="mb-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-teal-600" />
              <h2 className="text-lg font-extrabold text-[#0F172A]">من أجلك</h2>
            </div>
          </div>

          <div className="-mx-4 flex gap-3.5 overflow-x-auto px-4 pb-3 sm:mx-0 sm:px-0 scrollbar-none">
            {recommendedBooks.map((book) => (
              <div
                key={`rec-${book.id}`}
                className="group w-64 sm:w-72 shrink-0 overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white transition-all hover:-translate-y-0.5 hover:shadow-md flex flex-col justify-between"
              >
                <Link href={`/books/${book.id}`} className="flex gap-3 p-3 flex-1">
                  <BookCover
                    bookId={book.id}
                    title={book.title}
                    updatedAt={book.updatedAt}
                    className="h-28 w-20 shrink-0 rounded-xl text-xs shadow-xs"
                  />
                  <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
                    <div>
                      <span className="rounded-full bg-[#F1F5F9] px-2 py-0.5 text-[10px] font-bold text-[#334155]">
                        {categoryMap[book.category] || "أخرى"}
                      </span>
                      <h3 className="mt-1.5 line-clamp-2 text-xs sm:text-sm font-extrabold text-[#0F172A] group-hover:text-brand-teal transition-colors">
                        {book.title}
                      </h3>
                      <p className="mt-0.5 truncate text-[11px] text-[#64748B]">
                        {book.author || ""}
                      </p>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[10px] text-[#64748B]">
                        {conditionMap[book.condition || "GOOD"] || "جيدة"}
                      </span>
                      <span className="rounded-md bg-amber-50 border border-amber-200/70 px-2 py-0.5 text-[10px] font-black text-amber-800">
                        {formatPoints(book.points)}
                      </span>
                    </div>
                  </div>
                </Link>

                <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2 bg-slate-50/70">
                  <Link href={`/users/${book.ownerId}`} className="flex items-center gap-2 min-w-0 flex-1">
                    <UserAvatar userId={book.ownerId} name={book.owner?.name} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-slate-800">{book.owner?.name || "قارئ"}</p>
                      <p className="truncate text-[10px] text-slate-400">{book.owner?.city || "الموقع غير محدد"}</p>
                    </div>
                  </Link>
                  <Link
                    href={session?.user ? `/swap/request?bookId=${book.id}` : "/login"}
                    className="rounded-lg bg-brand-primary hover:bg-brand-primary-hover px-3 py-1.5 text-[11px] font-bold text-white transition active:scale-95 shrink-0 ms-2"
                  >
                    اطلب الكتاب
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 📚 عرض الكتب حسب الفئات */}
      <section id="books" className="w-full px-4 pb-6 sm:px-6">
       {displayBooks.length === 0 ? (
          !isFilteredView && myBooksCount > 0 ? (
            <div className="rounded-3xl border border-teal-200/80 bg-white px-5 py-12 text-center shadow-2xs">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-teal-50 text-teal-600 border border-teal-100">
                <BookIcon />
              </span>
              <h2 className="mt-3 text-base font-extrabold text-[#0F172A]">
                {myBooksCount === 1
                  ? "كتابك صار على الرف!"
                  : "كتبك صارت على الرف!"}
              </h2>
              <p className="mx-auto mt-1.5 max-w-sm text-xs sm:text-sm leading-relaxed text-[#64748B]">
                بانتظار انضمام قرّاء آخرين لتبدأ رحلة التبادل. يمكنك متابعة أو تعديل ما أضفته من مكتبتك.
              </p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
                <Link
                  href="/my-books"
                  className="inline-flex items-center justify-center rounded-xl bg-brand-primary hover:bg-brand-primary-hover px-4 py-2.5 text-xs font-bold text-white transition active:scale-95"
                >
                كتبي 
                </Link>
                <Link
                  href="/add-book"
                  className="inline-flex items-center justify-center rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] hover:bg-slate-100 px-4 py-2.5 text-xs font-bold text-[#334155] transition active:scale-95"
                >
                  إضافة كتاب جديد
                </Link>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-[#CBD5E1] bg-white px-5 py-14 text-center">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#F1F5F9] text-[#64748B]">
                <BookIcon />
              </span>
              <p className="mt-3 text-sm font-medium text-[#64748B]">
                {isFilteredView
                  ? "لم نتمكن من العثور على أي كتاب يطابق بحثك أو معايير التصفية."
                  : "الرفوف هادئة هنا.. كن أول من يضيف كتاباً!"}
              </p>
              {!isFilteredView && (
                <Link
                  href="/add-book"
                  className="mt-4 inline-flex items-center justify-center rounded-xl bg-brand-primary hover:bg-brand-primary-hover px-5 py-2.5 text-xs font-bold text-white transition active:scale-95"
                >
                  أضف كتابك الأول
                </Link>
              )}
            </div>
          )
        ) : (
          <div className="space-y-8">
            {(selectedCategory ? [selectedCategory] : categories).map((category) => {
              const categoryBooks = displayBooks.filter((book) => book.category === category);
              if (categoryBooks.length === 0) return null;

              const isExpandedCategory = selectedCategory === category;
              const visibleBooks = isExpandedCategory ? categoryBooks : categoryBooks.slice(0, 4);
              const hasMoreBooks = !isExpandedCategory && categoryBooks.length > 4;

              return (
                <section key={category} id={`category-${category}`} className="scroll-mt-24">
                  <div className="mb-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <h2 className="text-lg font-extrabold text-[#0F172A]">
                        {categoryMap[category] || "أخرى"}
                      </h2>
                      <span className="text-xs font-medium text-[#475569] bg-[#F8FAFC] border border-[#E2E8F0] px-2 py-0.5 rounded-md">
                        {formatBooksCount(categoryCountMap.get(category as BookCategory) ?? categoryBooks.length)}
                      </span>
                    </div>

                    {hasMoreBooks && (
                      <Link
                        href={categoryHref(category)}
                        className="inline-flex items-center gap-1 text-xs font-bold text-brand-primary hover:text-brand-teal transition-colors"
                      >
                        <span>عرض الكل</span>
                        <ArrowLeft className="h-3.5 w-3.5" />
                      </Link>
                    )}
                  </div>

                  <div
                    className={
                      isExpandedCategory
                        ? "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
                        : "-mx-4 flex gap-3.5 overflow-x-auto px-4 pb-3 sm:mx-0 sm:px-0 scrollbar-none"
                    }
                  >
                    {visibleBooks.map((book) => (
                      <div
                        key={book.id}
                        className={`group overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white transition-all hover:-translate-y-0.5 hover:shadow-md flex flex-col justify-between ${
                          isExpandedCategory ? "w-full" : "w-64 sm:w-72 shrink-0"
                        }`}
                      >
                        <Link href={`/books/${book.id}`} className="flex gap-3 p-3 flex-1">
                          <BookCover
                            bookId={book.id}
                            title={book.title}
                            updatedAt={book.updatedAt}
                            className="h-28 w-20 shrink-0 rounded-xl text-xs shadow-xs"
                          />
                          <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
                            <div>
                              <span className="rounded-full bg-[#F1F5F9] px-2 py-0.5 text-[10px] font-bold text-[#334155]">
                                {categoryMap[book.category] || "أخرى"}
                              </span>
                              <h3 className="mt-1.5 line-clamp-2 text-xs sm:text-sm font-extrabold text-[#0F172A] group-hover:text-brand-teal transition-colors">
                                {book.title}
                              </h3>
                              <p className="mt-0.5 truncate text-[11px] text-[#64748B]">
                                {book.author || ""}
                              </p>
                            </div>
                            <div className="mt-2 flex items-center justify-between">
                              <span className="text-[10px] text-[#64748B]">
                                {conditionMap[book.condition || "GOOD"] || "جيدة"}
                              </span>
                              <span className="rounded-md bg-amber-50 border border-amber-200/70 px-2 py-0.5 text-[10px] font-black text-amber-800">
                                {formatPoints(book.points)}
                              </span>
                            </div>
                          </div>
                        </Link>

                        <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2 bg-slate-50/70">
                          <Link href={`/users/${book.ownerId}`} className="flex items-center gap-2 min-w-0 flex-1">
                            <UserAvatar userId={book.ownerId} name={book.owner?.name} size="sm" />
                            <div className="min-w-0">
                              <p className="truncate text-xs font-bold text-slate-800 hover:text-brand-primary transition-colors">
                                {book.owner?.name || "قارئ"}
                              </p>
                              <p className="truncate text-[10px] text-slate-400">
                                {book.owner?.city || "الموقع غير محدد"}
                              </p>
                            </div>
                          </Link>

                          <Link
                            href={session?.user ? `/swap/request?bookId=${book.id}` : "/login"}
                            className="rounded-lg bg-brand-primary hover:bg-brand-primary-hover px-3 py-1.5 text-[11px] font-bold text-white transition active:scale-95 shrink-0 ms-2"
                          >
                            اطلب الكتاب
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </section>
      {pageCount > 1 && (
        <nav aria-label="صفحات الكتب" className="flex items-center justify-center gap-3 px-4 py-6">
          {page > 1 ? (
            <Link href={pageHref(page - 1)} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">السابق</Link>
          ) : (
            <span aria-disabled="true" className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-400">السابق</span>
          )}
          <span className="text-sm font-semibold text-slate-600">صفحة {page} من {pageCount}</span>
          {page < pageCount ? (
            <Link href={pageHref(page + 1)} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">التالي</Link>
          ) : (
            <span aria-disabled="true" className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-400">التالي</span>
          )}
        </nav>
      )}
    </div>
  );
}