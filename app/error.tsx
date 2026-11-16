"use client";

import { useEffect } from "react";
import ConnectionErrorView from "@/components/ConnectionErrorView";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return <ConnectionErrorView onRetry={reset} />;
}
