import type { NextAuthConfig } from "next-auth";

const authConfig: NextAuthConfig = {
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id;
      if (user && "language" in user) token.language = user.language;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        (session.user as { id?: string }).id = token.id as string;
      }
      if (session.user && token.language) {
        (session.user as { language?: string }).language = token.language as string;
      }
      return session;
    },
  },
};

export default authConfig;
