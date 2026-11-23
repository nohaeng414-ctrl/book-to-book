import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import AdminBookDeleteButton from "@/components/AdminBookDeleteButton";
import { redirect } from "next/navigation";
import Link from "next/link";
import BackButton from "@/components/BackButton";
import AdminReportCardActions from "@/components/AdminReportCardActions";
import AdminSendWarningButton from "@/components/AdminSendWarningButton";
import {
  Flag,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Camera,
  MessageSquare,
  Coins,
  ArrowLeftRight,
  User,
  BookOpen,
} from "lucide-react";
import { toArabicNumerals } from "@/lib/formatting";

export const dynamic = "force-dynamic";

function formatArabicDate(date: Date | string): string {
  return new Intl.DateTimeFormat("ar-SA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

function parseBookReportDetails(details?: string | null): {
  bookTitle: string | null;
  cleanDetails: string;
} {
  if (!details) return { bookTitle: null, cleanDetails: "" };
  const match = details.match(/^\[بلاغ عن كتاب:\s*(.+?)\]\s*/);
  if (!match) return { bookTitle: null, cleanDetails: details };
  return {
    bookTitle: match[1].trim(),
    cleanDetails: details.slice(match[0].length).trim(),
  };
}

function extractFallbackSwapId(details?: string | null): string | null {
  if (!details) return null;
  const match = details.match(/\/swaps\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

const SWAP_STATUS_LABELS: Record<string, string> = {
  PENDING: "بانتظار الموافقة",
  ACCEPTED: "مقبول",
  AWAITING_DELIVERY: "بانتظار التسليم",
  AWAITING_CONFIRMATION: "بانتظار تأكيد الاستلام",
  COMPLETED: "مكتمل",
  CANCELLED: "ملغى",
  REJECTED: "مرفوض",
  DISPUTED: "متنازع عليه",
};

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");
  if (!(await isAdmin())) redirect("/");

  const { filter = "PENDING" } = await searchParams;
  const validFilter = ["PENDING", "RESOLVED", "DISMISSED"].includes(filter)
    ? filter
    : "PENDING";

  const [reports, pendingCount, resolvedCount, dismissedCount] =
    await Promise.all([
      prisma.report.findMany({
        where: {
          status: validFilter as "PENDING" | "RESOLVED" | "DISMISSED",
        },
        include: {
          reporter: {
            select: { id: true, name: true, city: true, email: true },
          },
          reported: {
            select: {
              id: true,
              name: true,
              city: true,
              email: true,
              isBanned: true,
            },
          },
          swap: {
            select: {
              id: true,
              type: true,
              status: true,
              pointsCost: true,
              deliveryProofUrl: true,
              receiptProofUrl: true,
              requestedBook: { select: { id: true, title: true, points: true } },
              offeredBook: { select: { id: true, title: true, points: true } },
              messages: {
                include: { sender: { select: { name: true } } },
                orderBy: { createdAt: "desc" },
                take: 5,
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.report.count({ where: { status: "PENDING" } }),
      prisma.report.count({ where: { status: "RESOLVED" } }),
      prisma.report.count({ where: { status: "DISMISSED" } }),
    ]);

  // جلب معرّفات الكتب المبلّغ عنها مباشرة (التي ليست مرتبطة بطلب)
  const bookReportQueries = reports
    .filter((r) => !r.swap)
    .map((r) => {
      const { bookTitle } = parseBookReportDetails(r.details);
      return bookTitle ? { title: bookTitle, ownerId: r.reportedId } : null;
    })
    .filter(Boolean) as { title: string; ownerId: string }[];

  const matchedBooks =
    bookReportQueries.length > 0
      ? await prisma.book.findMany({
          where: {
            OR: bookReportQueries.map((q) => ({
              title: q.title,
              ownerId: q.ownerId,
            })),
          },
          select: { id: true, title: true, ownerId: true },
        })
      : [];

  const bookLookup = new Map<string, string>();
  for (const b of matchedBooks) {
    bookLookup.set(`${b.ownerId}::${b.title}`, b.id);
  }

  // جلب آخر طلب مشترك بين الطرفين للبلاغات التي ليس لها swapId (وليست بلاغات كتب)
  const unlinkedPairs = reports
    .filter((r) => !r.swap && !parseBookReportDetails(r.details).bookTitle)
    .map((r) => ({ reporterId: r.reporterId, reportedId: r.reportedId }));

  const fallbackSwaps =
    unlinkedPairs.length > 0
      ? await prisma.swap.findMany({
          where: {
            OR: unlinkedPairs.flatMap((p) => [
              { requesterId: p.reporterId, receiverId: p.reportedId },
              { requesterId: p.reportedId, receiverId: p.reporterId },
            ]),
          },
          select: {
            id: true,
            requesterId: true,
            receiverId: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        })
      : [];

  const fallbackSwapLookup = new Map<string, string>();
  for (const s of fallbackSwaps) {
    const k1 = `${s.requesterId}::${s.receiverId}`;
    const k2 = `${s.receiverId}::${s.requesterId}`;
    if (!fallbackSwapLookup.has(k1)) fallbackSwapLookup.set(k1, s.id);
    if (!fallbackSwapLookup.has(k2)) fallbackSwapLookup.set(k2, s.id);
  }

  const hasPending = pendingCount > 0;

  return (
    <main
      dir="rtl"
      className="mx-auto w-full max-w-4xl space-y-5 px-3 sm:px-4 pt-4 pb-28 text-[#0F172A]"
    >
      {/* الهيدر */}
      <header className="relative overflow-hidden rounded-3xl border border-slate-700/60 bg-gradient-to-br from-[#0B1120] via-[#1E293B] to-[#0F172A] p-6 text-white shadow-lg">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-20 -left-20 h-56 w-56 rounded-full bg-rose-500/15 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 -right-16 h-56 w-56 rounded-full bg-amber-400/10 blur-3xl"
        />

        <div className="absolute top-4 right-4 z-20">
          <BackButton className="!h-auto !w-auto !rounded-none !border-0 !bg-transparent !p-1.5 !backdrop-blur-none text-slate-200 hover:!bg-transparent hover:text-white active:scale-95 [&_svg]:text-slate-200" />
        </div>

        <div className="relative z-10 flex flex-col items-center w-full text-center pt-2">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-rose-400 ring-1 ring-white/15">
            <Flag className="h-5 w-5 stroke-[1.75]" />
          </div>

          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            إدارة البلاغات والنزاعات
          </h1>
          <p className="mt-1 text-xs text-slate-300">
            مراجعة بلاغات الكتب والطلبات، فحص الإثباتات، واتخاذ القرار المناسب
          </p>

          <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1 text-[11px] font-bold text-slate-200 backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span
                className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
                  hasPending ? "bg-rose-400" : "bg-emerald-400"
                }`}
              />
              <span
                className={`relative inline-flex h-2 w-2 rounded-full ${
                  hasPending ? "bg-rose-500" : "bg-emerald-500"
                }`}
              />
            </span>
            <span>
              {hasPending
                ? `${toArabicNumerals(pendingCount)} بلاغات قيد المراجعة`
                : "لا توجد بلاغات معلقة حالياً"}
            </span>
          </div>
        </div>
      </header>

     {/* التبويبات */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-1.5 shadow-2xs">
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 text-center font-bold text-xs">
          <Link
            replace
            href="/admin/reports?filter=PENDING"
            className={`rounded-lg py-2.5 transition flex items-center justify-center gap-1.5 ${
              validFilter === "PENDING"
                ? "bg-white text-rose-700 shadow-2xs font-black"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Clock className="h-3.5 w-3.5 hidden sm:inline" />
            <span>قيد المراجعة ({toArabicNumerals(pendingCount)})</span>
          </Link>

          <Link
            replace
            href="/admin/reports?filter=RESOLVED"
            className={`rounded-lg py-2.5 transition flex items-center justify-center gap-1.5 ${
              validFilter === "RESOLVED"
                ? "bg-white text-teal-700 shadow-2xs font-black"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5 hidden sm:inline" />
            <span>تمت معالجتها ({toArabicNumerals(resolvedCount)})</span>
          </Link>

          <Link
            replace
            href="/admin/reports?filter=DISMISSED"
            className={`rounded-lg py-2.5 transition flex items-center justify-center gap-1.5 ${
              validFilter === "DISMISSED"
                ? "bg-white text-slate-900 shadow-2xs font-black"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <XCircle className="h-3.5 w-3.5 hidden sm:inline" />
            <span>مرفوضة ({toArabicNumerals(dismissedCount)})</span>
          </Link>
        </div>
      </div>
      {/* قائمة البلاغات */}
      <section className="space-y-4">
        {reports.length > 0 ? (
          reports.map((report) => {
            const { bookTitle: parsedBookTitle, cleanDetails } =
              parseBookReportDetails(report.details);
            const matchedBookId = parsedBookTitle
              ? bookLookup.get(`${report.reportedId}::${parsedBookTitle}`)
              : undefined;

            const targetBookId = report.swap?.requestedBook.id ?? matchedBookId;
            const targetBookTitle =
              report.swap?.requestedBook.title ?? parsedBookTitle;

            const resolvedSwapId =
              report.swap?.id ??
              report.swapId ??
              extractFallbackSwapId(report.details) ??
              (!parsedBookTitle
                ? fallbackSwapLookup.get(
                    `${report.reporterId}::${report.reportedId}`
                  ) ?? null
                : null);

            return (
              <article
                key={report.id}
                className="rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-2xs space-y-4 text-right"
              >
                {/* 1. رأس البطاقة: السبب + التصنيف + التاريخ */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 ring-1 ring-rose-100">
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                    <span className="text-xs sm:text-sm font-black text-slate-900">
                      {report.reason}
                    </span>

                    {resolvedSwapId ? (
                      <span className="rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
                        بلاغ طلب
                        {report.swap?.status
                          ? ` · ${SWAP_STATUS_LABELS[report.swap.status] || report.swap.status}`
                          : ""}
                      </span>
                    ) : targetBookTitle ? (
                      <span className="rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-[10px] font-bold text-blue-800">
                        بلاغ كتاب
                      </span>
                    ) : null}
                  </div>

                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
                    <Clock className="h-3 w-3" />
                    {formatArabicDate(report.createdAt)}
                  </span>
                </div>

                {/* 2. شريط الوصول السريع (زر واحد موحّد لتفاصيل الطلب / الكتاب) */}
                {(targetBookTitle || resolvedSwapId) && (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200/70 bg-slate-50/70 px-3.5 py-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <BookOpen className="h-4 w-4 shrink-0 text-teal-600" />
                      <span className="truncate text-xs font-black text-slate-800">
                        {targetBookTitle || `طلب #${resolvedSwapId?.slice(0, 8)}`}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {resolvedSwapId && (
                        <Link
                          href={`/swaps/${resolvedSwapId}`}
                          className="inline-flex items-center gap-1 rounded-xl bg-slate-900 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-slate-800 transition"
                        >
                          <span>تفاصيل الطلب</span>
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      )}

                      {targetBookId ? (
                        <Link
                          href={`/books/${targetBookId}`}
                          className="inline-flex items-center gap-1 rounded-xl bg-white border border-slate-200 px-3 py-1.5 text-[11px] font-bold text-slate-700 hover:border-teal-300 hover:text-teal-700 transition"
                        >
                          <span>فتح الكتاب</span>
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      ) : targetBookTitle ? (
                        <Link
                          href={`/admin/books?q=${encodeURIComponent(targetBookTitle)}`}
                          className="inline-flex items-center gap-1 rounded-xl bg-white border border-slate-200 px-3 py-1.5 text-[11px] font-bold text-slate-700 hover:border-teal-300 hover:text-teal-700 transition"
                        >
                          <span>بحث في الكتب</span>
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      ) : null}

                      {!resolvedSwapId && targetBookId && targetBookTitle && (
                        <AdminBookDeleteButton
                          bookId={targetBookId}
                          bookTitle={targetBookTitle}
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* 3. أطراف البلاغ */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div className="rounded-2xl bg-slate-50/80 p-3 border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 block mb-1">
                      المُبلِّغ
                    </span>
                    <Link
                      href={`/users/${report.reporter.id}`}
                      className="inline-flex items-center gap-1.5 font-black text-slate-800 hover:text-teal-700 transition"
                    >
                      <User className="h-3.5 w-3.5 text-teal-600" />
                      <span>{report.reporter.name}</span>
                    </Link>
                    <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                      {report.reporter.city} · {report.reporter.email}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-rose-50/50 p-3 border border-rose-100">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold text-rose-700">
                        المُشتكى عليه
                      </span>
                      {report.reported.isBanned && (
                        <span className="rounded-full bg-rose-600 text-white px-2 py-0.5 text-[9px] font-bold">
                          محظور
                        </span>
                      )}
                    </div>
                    <Link
                      href={`/users/${report.reported.id}`}
                      className="inline-flex items-center gap-1.5 font-black text-rose-950 hover:underline"
                    >
                      <User className="h-3.5 w-3.5 text-rose-600" />
                      <span>{report.reported.name}</span>
                    </Link>
                    <p className="text-[11px] text-rose-600/90 mt-0.5 truncate">
                      {report.reported.city} · {report.reported.email}
                    </p>
                  </div>
                </div>

                {/* 4. تفاصيل الشكوى */}
                {cleanDetails && (
                  <div className="rounded-2xl bg-slate-50/80 p-3.5 text-xs leading-relaxed text-slate-700 border border-slate-100">
                    <span className="font-black text-slate-900 block mb-1">
                      تفاصيل الشكوى:
                    </span>
                    <p className="whitespace-pre-wrap">{cleanDetails}</p>
                  </div>
                )}

                {/* 5. ملخص الطلب والأدلة (عند وجود طلب) */}
                {report.swap && (
                  <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-3.5 space-y-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="inline-flex items-center gap-1 rounded-full bg-white border border-slate-200 px-2.5 py-0.5 text-[11px] font-bold text-slate-700">
                        {report.swap.type === "POINTS" ? (
                          <>
                            <Coins className="h-3.5 w-3.5 text-amber-600" />
                            <span>تبادل بالنقاط</span>
                          </>
                        ) : (
                          <>
                            <ArrowLeftRight className="h-3.5 w-3.5 text-blue-600" />
                            <span>كتاب بكتاب</span>
                          </>
                        )}
                      </span>

                      {report.swap.pointsCost > 0 && (
                        <span className="rounded-full bg-teal-50 border border-teal-200 px-2.5 py-0.5 text-[10px] font-bold text-teal-800">
                          محجوز: {toArabicNumerals(report.swap.pointsCost)} نقطة
                        </span>
                      )}

                      {report.swap.offeredBook && (
                        <span className="rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-[10px] font-bold text-blue-800 truncate max-w-xs">
                          مقابل: {report.swap.offeredBook.title}
                        </span>
                      )}
                    </div>

                    {/* صور الإثبات */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="rounded-xl bg-white p-2.5 border border-slate-200/80 text-center">
                        <span className="text-[10px] font-bold text-slate-500 block mb-1.5">
                          إثبات التسليم
                        </span>
                        {report.swap.deliveryProofUrl ? (
                          <a
                            href={report.swap.deliveryProofUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block overflow-hidden rounded-lg bg-slate-50 hover:opacity-90 transition"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={report.swap.deliveryProofUrl}
                              alt="إثبات التسليم"
                              className="h-28 w-full object-contain"
                            />
                          </a>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-28 text-slate-300 text-[10px]">
                            <Camera className="h-5 w-5 mb-1" />
                            <span>لا توجد صورة</span>
                          </div>
                        )}
                      </div>

                      <div className="rounded-xl bg-white p-2.5 border border-slate-200/80 text-center">
                        <span className="text-[10px] font-bold text-slate-500 block mb-1.5">
                          إثبات الاستلام
                        </span>
                        {report.swap.receiptProofUrl ? (
                          <a
                            href={report.swap.receiptProofUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block overflow-hidden rounded-lg bg-slate-50 hover:opacity-90 transition"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={report.swap.receiptProofUrl}
                              alt="إثبات الاستلام"
                              className="h-28 w-full object-contain"
                            />
                          </a>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-28 text-slate-300 text-[10px]">
                            <Camera className="h-5 w-5 mb-1" />
                            <span>لا توجد صورة</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* آخر الرسائل (قابلة للطي لتبقى البطاقة مرتّبة) */}
                    {report.swap.messages.length > 0 && (
                      <details className="rounded-xl bg-white p-3 border border-slate-200/80">
                        <summary className="flex cursor-pointer list-none items-center justify-between text-[11px] font-black text-slate-700">
                          <span className="flex items-center gap-1.5">
                            <MessageSquare className="h-3.5 w-3.5 text-teal-600" />
                            <span>
                              آخر رسائل المحادثة (
                              {toArabicNumerals(report.swap.messages.length)})
                            </span>
                          </span>
                          <span className="text-[10px] font-bold text-teal-600">
                            عرض / إخفاء
                          </span>
                        </summary>
                        <div className="mt-2.5 max-h-36 overflow-y-auto space-y-1.5 text-[11px] text-slate-600">
                          {[...report.swap.messages]
                            .reverse()
                            .map((msg, idx) => (
                              <p
                                key={idx}
                                className="rounded-lg bg-slate-50 px-2.5 py-1.5 break-words"
                              >
                                <strong className="text-slate-900">
                                  {msg.sender.name}:
                                </strong>{" "}
                                {msg.content}
                              </p>
                            ))}
                        </div>
                      </details>
                    )}
                  </div>
                )}

                {/* 6. شريط الإجراءات الإدارية */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-slate-100 pt-3">
                  <AdminSendWarningButton
                    userId={report.reported.id}
                    userName={report.reported.name}
                    context={resolvedSwapId ? "SWAP" : "BOOK"}
                    reportReason={report.reason}
                    bookTitle={targetBookTitle}
                  />

                  <AdminReportCardActions
                    reportId={report.id}
                    reportedUserId={report.reported.id}
                    reportedUserName={report.reported.name}
                    isUserBanned={report.reported.isBanned}
                    reportStatus={report.status}
                    swapId={resolvedSwapId ?? undefined}
                    swapStatus={report.swap?.status}
                  />
                </div>
              </article>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-200/80 bg-white p-12 text-center shadow-2xs">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 mb-3">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <p className="text-xs font-black text-slate-700">
          لا توجد بلاغات هنا
            </p>
      
          </div>
        )}
      </section>
    </main>
  );
}