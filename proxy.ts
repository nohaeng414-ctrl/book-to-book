import NextAuth from "next-auth";
import authConfig from "@/auth.config";

const { auth: withAuth } = NextAuth(authConfig);

export default withAuth((req) => {
  const isLoggedIn = !!req.auth;
  const { nextUrl } = req;

  const isProtectedPage =
    nextUrl.pathname.startsWith("/add-book") ||
    nextUrl.pathname.startsWith("/my-books") ||
    nextUrl.pathname.startsWith("/profile") ||
    nextUrl.pathname.startsWith("/requests");

  if (isProtectedPage && !isLoggedIn) {
    return Response.redirect(new URL("/login", nextUrl));
  }
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|logo.png).*)"],
};
