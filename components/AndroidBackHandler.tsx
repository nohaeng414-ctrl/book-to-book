"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

const GO_HOME_ROUTES = [
  "/requests",
  "/my-books",
  "/add-book",
  "/profile",
];

function isGoHomeRoute(path: string) {
  const clean = (path || "/").replace(/\/$/, "") || "/";
  return GO_HOME_ROUTES.includes(clean);
}

export default function AndroidBackHandler() {
  const pathname = usePathname();
  const router = useRouter();
  const prevPathRef = useRef(pathname);
  const isBackNavRef = useRef(false);

  useEffect(() => {
    const onPopState = () => {
      isBackNavRef.current = true;
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    const fromPath = prevPathRef.current;
    prevPathRef.current = pathname;

    if (isBackNavRef.current) {
      isBackNavRef.current = false;
      if ((fromPath === "/" || isGoHomeRoute(fromPath)) && pathname !== "/") {
        router.replace("/");
      }
    }
  }, [pathname, router]);

  return null;
}