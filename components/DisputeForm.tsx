"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2 } from "lucide-react";
import { raiseDisputeAction } from "@/app/actions/swapWorkflow";

export default function DisputeForm({ swapId }: { swapId: string }) {
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function submitDispute(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setMessage("");
    const result = await raiseDisputeAction(swapId, reason);
    setPending(false);
    if (result?.error) setMessage(result.error);
    else {
      setMessage("تم تسجيل النزاع وإحالته إلى الإدارة.");
      router.refresh();
    }
  }

  return (
    <form onSubmit={submitDispute} className="space-y-2 rounded-xl border border-rose-100 bg-rose-50/50 p-3">
      <label htmlFor={`dispute-${swapId}`} className="block text-xs font-bold text-rose-900">
        واجهت مشكلة في الكتاب أو التسليم؟ اشرحها للإدارة
      </label>
      <textarea
        id={`dispute-${swapId}`}
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        maxLength={500}
        required
        rows={3}
        placeholder="اكتب تفاصيل المشكلة"
        className="w-full rounded-lg border border-rose-200 bg-white p-2.5 text-xs outline-none focus:border-rose-400"
      />
      {message && <p role="status" className="text-xs font-semibold text-rose-800">{message}</p>}
      <button
        type="submit"
        disabled={pending || !reason.trim()}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-rose-700 px-3 py-2.5 text-xs font-bold text-white hover:bg-rose-800 disabled:opacity-50"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
        تسجيل نزاع وإبلاغ الإدارة
      </button>
    </form>
  );
}
