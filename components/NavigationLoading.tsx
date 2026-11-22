"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { LoaderCircle } from "lucide-react";

export default function NavigationLoading() {
  const pathname = usePathname();
  return <NavigationLoadingIndicator key={pathname} pathname={pathname} />;
}

function NavigationLoadingIndicator({ pathname }: { pathname: string }) {
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const pending = pendingPath === pathname;

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const start = () => {
      setPendingPath(pathname);
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => setPendingPath(null), 15000);
    };
    const stop = () => {
      setPendingPath(null);
      if (timeout) clearTimeout(timeout);
    };
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (!(event.target instanceof Element)) return;
      const anchor = event.target.closest<HTMLAnchorElement>("a[href]");
      if (!anchor || anchor.hasAttribute("download") || (anchor.target && anchor.target !== "_self")) return;
      const destination = new URL(anchor.href, window.location.href);
      if (destination.origin !== window.location.origin || destination.pathname === window.location.pathname) return;
      start();
    };

    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", stop);
    window.addEventListener("pageshow", stop);
    window.addEventListener("app:navigation-start", start);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", stop);
      window.removeEventListener("pageshow", stop);
      window.removeEventListener("app:navigation-start", start);
      if (timeout) clearTimeout(timeout);
    };
  }, [pathname]);

  if (!pending) return null;
  return (
    <div className="fixed inset-0 z-[100] grid place-content-center justify-items-center gap-3 bg-white/75 px-4 text-center text-[#334155] backdrop-blur-[2px]" role="status" aria-live="polite" aria-busy="true" dir="rtl">
      <LoaderCircle aria-hidden="true" className="h-9 w-9 animate-spin text-[#CF9932]" />
      <p className="text-sm font-bold">جارٍ تحميل الصفحة...</p>
      <span className="sr-only">يرجى الانتظار</span>
    </div>
  );
}
