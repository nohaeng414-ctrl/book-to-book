"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  XCircle,
  Ban,
  UserCheck,
  Loader2,
  Scale,
  AlertCircle,
} from "lucide-react";
import {
  adminResolveSwapCompleteAction,
  adminResolveSwapCancelAction,
  adminUpdateReportStatusAction,
  adminToggleBanUserAction,
} from "@/app/actions/admin";

export default function AdminReportCardActions({
  reportId,
  reportedUserId,
  reportedUserName,
  isUserBanned,
  reportStatus,
  swapId,
  swapStatus,
}: {
  reportId: string;
  reportedUserId: string;
  reportedUserName?: string;
  isUserBanned: boolean;
  reportStatus: "PENDING" | "RESOLVED" | "DISMISSED";
  swapId?: string | null;
  swapStatus?: string | null;
}) {
  const router = useRouter();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canSettleSwap =
    Boolean(swapId) &&
    swapStatus !== "COMPLETED" &&
    swapStatus !== "CANCELLED" &&
    swapStatus !== "REJECTED";

  async function runAction(
    key: string,
    fn: () => Promise<{ success?: boolean; error?: string }>
  ) {
    if (loadingAction) return;
    setLoadingAction(key);
    setError(null);
    try {
      const res = await fn();
      if (res?.error) {
        setError(res.error);
      } else {
        router.refresh();
      }
    } catch {
      setError("حدث خطأ غير متوقع.");
    } finally {
      setLoadingAction(null);
    }
  }

  return (
    <div className="space-y-2.5 pt-2 border-t border-slate-100">
      {error && (
        <div className="flex items-center gap-1.5 rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* أزرار الفصل المالي في النزاع إذا كان البلاغ مرتبطاً بطلب تبادل غير محسوم */}
      {canSettleSwap && swapId && (
        <div className="rounded-2xl border border-amber-200/80 bg-amber-50/50 p-3 space-y-2">
          <div className="flex items-center gap-1.5 text-[11px] font-black text-amber-900">
            <Scale className="h-3.5 w-3.5 text-amber-600 shrink-0" />
            <span>الفصل في طلب التبادل (ينقل الكتب والنقاط ويغلق البلاغ تلقائياً):</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              disabled={loadingAction !== null}
              onClick={() =>
                runAction("COMPLETE_SWAP", () =>
                  adminResolveSwapCompleteAction(swapId, reportId)
                )
              }
              className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2.5 text-xs font-black text-white hover:bg-emerald-700 transition disabled:opacity-50 cursor-pointer"
            >
              {loadingAction === "COMPLETE_SWAP" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              )}
              <span>إتمام التبادل وصرف النقاط</span>
            </button>

            <button
              type="button"
              disabled={loadingAction !== null}
              onClick={() =>
                runAction("CANCEL_SWAP", () =>
                  adminResolveSwapCancelAction(swapId, reportId)
                )
              }
              className="flex items-center justify-center gap-1.5 rounded-xl bg-rose-600 px-3 py-2.5 text-xs font-black text-white hover:bg-rose-700 transition disabled:opacity-50 cursor-pointer"
            >
              {loadingAction === "CANCEL_SWAP" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <XCircle className="h-3.5 w-3.5 shrink-0" />
              )}
              <span>إلغاء الطلب وإرجاع النقاط</span>
            </button>
          </div>
        </div>
      )}

      {/* أزرار حالة البلاغ + حظر المستخدم */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {reportStatus === "PENDING" ? (
            <>
              <button
                type="button"
                disabled={loadingAction !== null}
                onClick={() =>
                  runAction("RESOLVE_REPORT", () =>
                    adminUpdateReportStatusAction(reportId, "RESOLVED")
                  )
                }
                className="inline-flex items-center gap-1 rounded-xl bg-teal-600 px-3 py-2 text-xs font-bold text-white hover:bg-teal-700 transition disabled:opacity-50 cursor-pointer"
              >
                {loadingAction === "RESOLVE_REPORT" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                )}
                <span>تمت المعالجة</span>
              </button>

              <button
                type="button"
                disabled={loadingAction !== null}
                onClick={() =>
                  runAction("DISMISS_REPORT", () =>
                    adminUpdateReportStatusAction(reportId, "DISMISSED")
                  )
                }
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition disabled:opacity-50 cursor-pointer"
              >
                {loadingAction === "DISMISS_REPORT" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <XCircle className="h-3.5 w-3.5" />
                )}
                <span>رفض البلاغ</span>
              </button>
            </>
          ) : (
            <span
              className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold ${
                reportStatus === "RESOLVED"
                  ? "bg-teal-50 text-teal-800 border border-teal-200"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {reportStatus === "RESOLVED"
                ? "✓ تمت معالجة البلاغ"
                : "تم رفض البلاغ"}
            </span>
          )}
        </div>

        {/* زر حظر / فك حظر المشتكى عليه */}
        <button
          type="button"
          disabled={loadingAction !== null}
          onClick={() =>
            runAction("TOGGLE_BAN", () =>
              adminToggleBanUserAction(reportedUserId)
            )
          }
          className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-black transition disabled:opacity-50 cursor-pointer ${
            isUserBanned
              ? "border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
              : "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
          }`}
        >
          {loadingAction === "TOGGLE_BAN" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : isUserBanned ? (
            <UserCheck className="h-3.5 w-3.5" />
          ) : (
            <Ban className="h-3.5 w-3.5" />
          )}
          <span>
            {isUserBanned
              ? `فك الحظر${reportedUserName ? ` عن ${reportedUserName}` : ""}`
              : `حظر حساب${reportedUserName ? ` ${reportedUserName}` : " المشتكى عليه"}`}
          </span>
        </button>
      </div>
    </div>
  );
}