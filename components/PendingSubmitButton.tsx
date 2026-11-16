"use client";

import { useFormStatus } from "react-dom";
import { LoaderCircle } from "lucide-react";
import type { ReactNode } from "react";

export default function PendingSubmitButton({
  children,
  pendingText = "جارٍ التنفيذ...",
  className,
  disabled = false,
}: {
  children: ReactNode;
  pendingText?: string;
  className: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending || disabled} aria-busy={pending} className={`${className} disabled:cursor-not-allowed disabled:opacity-70`}>
      <span className="inline-flex items-center justify-center gap-2">
        {pending ? <><LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />{pendingText}</> : children}
      </span>
    </button>
  );
}
