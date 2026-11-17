import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import BackButton from "@/components/BackButton";
import AdminReportCardActions from "@/components/AdminReportCardActions";
import {
  ShieldAlert,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Camera,
  MessageSquare,
  Coins,
  ArrowLeftRight,
} from "lucide-react";
import { toArabicNumerals } from "@/lib/formatting";

const SWAP_STATUS_LABELS: Record<string, string> = {
  PENDING: "بانتظار الموافقة",
  ACCEPTED: "مقبول",
  AWAITING_DELIVERY: "بانتظار التسليم",
  AWAITING_CONFIRMATION: "بانتظار تأكيد الطرف الثاني",
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
  const validFilter = ["ALL", "PENDING", "RESOLVED", "DISMISSED"].includes(
    filter
  )
    ? filter
    : "PENDING";

  // جلب البلاغات بحسب التبويب مع تفاصيل المبادلة وآخر رسائل المحادثة
  const [reports, pendingCount, resolvedCount, dismissedCount] =
    await Promise.all([
      prisma.report.findMany({
        where:
          validFilter === "ALL"
            ? {}
            : {
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
              requestedBook: { select: { title: true, points: true } },
              offeredBook: { select: { title: true, points: true } },
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

  return (
    <main
      dir="rtl"
      className="mx-auto w-full max-w-4xl space-y-4 px-3 sm:px-4 pt-4 pb-28 text-[#0F172A]"
    >
      {/* هيدر صفحة الإدارة */}
      <header className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-2xs">
        <div className="flex items-center gap-3">
          <BackButton />
          <div>
            <h1 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-rose-600" />
              <span>إدارة البلاغات</span>
            </h1>
            <p className="text-xs text-slate-500">
              مراجعة محادثات الطلبات وصور الإثبات والفصل في النزاعات
            </p>
          </div>
        </div>
      </header>

      {/* تبويبات الفلترة السريعة */}
      <div className="grid grid-cols-3 gap-1 rounded-2xl bg-slate-100 p-1 text-center font-bold text-xs">
        <Link
          href="/admin/reports?filter=PENDING"
          className={`rounded-xl py-2.5 transition flex items-center justify-center gap-1.5 ${
            validFilter === "PENDING"
              ? "bg-white text-rose-700 shadow-2xs"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <Clock className="h-3.5 w-3.5" />
          <span>قيد المراجعة ({toArabicNumerals(pendingCount)})</span>
        </Link>

        <Link
          href="/admin/reports?filter=RESOLVED"
          className={`rounded-xl py-2.5 transition flex items-center justify-center gap-1.5 ${
            validFilter === "RESOLVED"
              ? "bg-white text-teal-700 shadow-2xs"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>تمت معالجتها ({toArabicNumerals(resolvedCount)})</span>
        </Link>

        <Link
          href="/admin/reports?filter=DISMISSED"
          className={`rounded-xl py-2.5 transition flex items-center justify-center gap-1.5 ${
            validFilter === "DISMISSED"
              ? "bg-white text-slate-800 shadow-2xs"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <XCircle className="h-3.5 w-3.5" />
          <span>المرفوضة ({toArabicNumerals(dismissedCount)})</span>
        </Link>
      </div>

      {/* قائمة البلاغات */}
      <section className="space-y-3.5 pt-1">
        {reports.length > 0 ? (
          reports.map((report) => (
            <article
              key={report.id}
              className="rounded-3xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3.5 text-right"
            >
              {/* رأس البلاغ: السبب ونوعه والتاريخ */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4.5 w-4.5 text-rose-600 shrink-0" />
                  <span className="text-xs sm:text-sm font-black text-slate-900">
                    {report.reason}
                  </span>
                  {report.swap && (
                    <span className="rounded-lg bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                      {SWAP_STATUS_LABELS[report.swap.status] ||
                        report.swap.status}
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-medium text-slate-400">
                  {new Date(report.createdAt).toLocaleDateString("ar-SA")}
                </span>
              </div>

              {/* أطراف البلاغ */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                {/* المُشتكي */}
                <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 block mb-0.5">
                    المُبلِّغ (صاحب الشكوى):
                  </span>
                  <Link
                    href={`/users/${report.reporter.id}`}
                    className="font-black text-slate-800 hover:text-teal-700"
                  >
                    {report.reporter.name}
                  </Link>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {report.reporter.city} · {report.reporter.email}
                  </p>
                </div>

                {/* المُشتكى عليه */}
                <div className="rounded-xl bg-rose-50/60 p-2.5 border border-rose-100">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[10px] font-bold text-rose-700">
                      المُشتكى عليه:
                    </span>
                    {report.reported.isBanned && (
                      <span className="rounded-full bg-rose-600 text-white px-2 py-0.5 text-[9px] font-bold">
                        محظور حالياً
                      </span>
                    )}
                  </div>
                  <Link
                    href={`/users/${report.reported.id}`}
                    className="font-black text-rose-950 hover:underline"
                  >
                    {report.reported.name}
                  </Link>
                  <p className="text-[10px] text-rose-600 mt-0.5">
                    {report.reported.city} · {report.reported.email}
                  </p>
                </div>
              </div>

              {/* نص التوضيح إذا وُجد */}
              {report.details && (
                <div className="rounded-xl bg-slate-50/80 p-3 text-xs leading-relaxed text-slate-700 border border-slate-100">
                  <span className="font-bold text-slate-900 block mb-0.5">
                    تفاصيل الشكوى:
                  </span>
                  <p className="whitespace-pre-wrap">{report.details}</p>
                </div>
              )}

              {/* تفاصيل المبادلة وصور الإثبات وآخر الرسائل إذا كان البلاغ مرتبطاً بتبادل */}
              {report.swap && (
                <div className="rounded-2xl border border-slate-200/90 bg-slate-50/50 p-3 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-lg bg-white border border-slate-200 px-2 py-1 text-[11px] font-bold text-slate-700">
                        {report.swap.type === "POINTS" ? (
                          <>
                            <Coins className="h-3.5 w-3.5 text-teal-600" />
                            <span>تبادل بالنقاط</span>
                          </>
                        ) : (
                          <>
                            <ArrowLeftRight className="h-3.5 w-3.5 text-blue-600" />
                            <span>كتاب بكتاب</span>
                          </>
                        )}
                      </span>

                      <span className="font-black text-slate-800">
                        الكتاب المطلوب: {report.swap.requestedBook.title} (
                        {toArabicNumerals(report.swap.requestedBook.points)}{" "}
                        نقاط)
                      </span>

                      {report.swap.pointsCost > 0 && (
                        <span className="rounded-lg bg-teal-50 border border-teal-200 px-2 py-0.5 text-[11px] font-bold text-teal-800">
                          النقاط المحجوزة:{" "}
                          {toArabicNumerals(report.swap.pointsCost)}
                        </span>
                      )}
                    </div>

                    <Link
                      href={`/swaps/${report.swap.id}`}
                      className="inline-flex items-center gap-1 rounded-lg bg-white border border-slate-200 px-2.5 py-1 text-[11px] font-bold text-teal-700 hover:bg-teal-50"
                    >
                      <span>فتح صفحة الطلب</span>
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>

                  {/* معرض صور إثبات التسليم والاستلام */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="rounded-xl bg-white p-2 border border-slate-200 text-center">
                      <span className="text-[10px] font-bold text-slate-500 block mb-1">
                        إثبات صاحب الكتاب (التسليم):
                      </span>
                      {report.swap.deliveryProofUrl ? (
                        <a
                          href={report.swap.deliveryProofUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block overflow-hidden rounded-lg bg-slate-50"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={report.swap.deliveryProofUrl}
                            alt="إثبات التسليم"
                            className="h-32 w-full object-contain"
                          />
                        </a>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-32 text-slate-300 text-[10px]">
                          <Camera className="h-5 w-5 mb-1" />
                          <span>لم تُرفع صورة</span>
                        </div>
                      )}
                    </div>

                    <div className="rounded-xl bg-white p-2 border border-slate-200 text-center">
                      <span className="text-[10px] font-bold text-slate-500 block mb-1">
                        إثبات طالب الكتاب (الاستلام):
                      </span>
                      {report.swap.receiptProofUrl ? (
                        <a
                          href={report.swap.receiptProofUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block overflow-hidden rounded-lg bg-slate-50"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={report.swap.receiptProofUrl}
                            alt="إثبات الاستلام"
                            className="h-32 w-full object-contain"
                          />
                        </a>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-32 text-slate-300 text-[10px]">
                          <Camera className="h-5 w-5 mb-1" />
                          <span>لم تُرفع صورة</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* آخر رسائل المحادثة بين الطرفين */}
                  {report.swap.messages.length > 0 && (
                    <div className="rounded-xl bg-white p-2.5 border border-slate-200 space-y-1.5">
                      <span className="flex items-center gap-1.5 text-[11px] font-black text-slate-700">
                        <MessageSquare className="h-3.5 w-3.5 text-teal-600" />
                        <span>آخر رسائل المحادثة بين الطرفين:</span>
                      </span>
                      <div className="max-h-32 overflow-y-auto space-y-1 text-[11px] text-slate-600">
                        {[...report.swap.messages].reverse().map((msg, idx) => (
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
                    </div>
                  )}
                </div>
              )}

              {/* أزرار اتخاذ القرار الإداري والفصل المالي والحظر */}
              <AdminReportCardActions
                reportId={report.id}
                reportedUserId={report.reported.id}
                reportedUserName={report.reported.name}
                isUserBanned={report.reported.isBanned}
                reportStatus={report.status}
                swapId={report.swap?.id}
                swapStatus={report.swap?.status}
              />
            </article>
          ))
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center text-xs text-slate-400 font-medium">
            لا توجد بلاغات مسجلة ضمن هذا التصنيف حالياً.
          </div>
        )}
      </section>
    </main>
  );
}