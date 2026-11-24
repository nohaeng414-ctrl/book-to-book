import NextAuth from "next-auth";
import authConfig from "@/auth.config";

const { auth: withAuth } = NextAuth(authConfig);

export default withAuth((req) => {
  const isLoggedIn = !!req.auth;
  const { nextUrl } = req;

  // السماح بعرض صفحات الكتب للزوار ومحركات البحث
if (
    nextUrl.pathname.startsWith("/books/") ||
    nextUrl.pathname === "/profile/privacy" ||
    nextUrl.pathname.startsWith("/profile/privacy/")
  ) {
    return;
  }

  const isProtectedPage =
    nextUrl.pathname.startsWith("/add-book") ||
    nextUrl.pathname.startsWith("/my-books") ||
    nextUrl.pathname.startsWith("/profile") ||
    nextUrl.pathname.startsWith("/requests") ||
    nextUrl.pathname.startsWith("/swaps");

  if (isProtectedPage && !isLoggedIn) {
    return Response.redirect(new URL("/login", nextUrl));
  }
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|logo.png).*)"],
};