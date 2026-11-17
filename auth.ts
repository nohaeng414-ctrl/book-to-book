import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import authConfig from "@/auth.config";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { consumeRateLimit, getClientIp } from "@/lib/rate-limit";

class TooManyRequestsError extends CredentialsSignin {
  code = "TOO_MANY_REQUESTS";
}

class EmailNotVerifiedError extends CredentialsSignin {
  code = "EMAIL_NOT_VERIFIED";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "البريد الإلكتروني", type: "email" },
        password: { label: "كلمة المرور", type: "password" },
      },
      async authorize(credentials, request) {
        if (
          typeof credentials?.email !== "string" ||
          typeof credentials?.password !== "string" ||
          credentials.email.length > 254 ||
          Buffer.byteLength(credentials.password, "utf8") > 72
        ) {
          return null;
        }

        const email = credentials.email.trim().toLowerCase();
        const [ipLimit, emailLimit] = await Promise.all([
          consumeRateLimit("login-ip", getClientIp(request), 20, 15 * 60 * 1000),
          consumeRateLimit("login-email", email, 8, 15 * 60 * 1000),
        ]);

        if (!ipLimit.allowed || !emailLimit.allowed) {
          throw new TooManyRequestsError();
        }

      const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            name: true,
            email: true,
            language: true,
            hashedPassword: true,
            isBanned: true,
            emailVerified: true,
          },
        });

        if (!user) {
          console.log("❌ خطأ: المستخدم غير مسجل بهذا البريد الإلكتروني");
          return null;
        }

        if (!user.hashedPassword) {
          console.log("❌ خطأ: الحساب ليس له كلمة مرور (ممكن مسجل بطريقة أخرى)");
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.hashedPassword
        );
        
        if (!isPasswordValid) {
          console.log("❌ خطأ: كلمة المرور المدخلة غير صحيحة!");
          return null;
        }

        // 🛑 منع تسجيل الدخول فوراً إذا كان المستخدم محظوراً
        if (user.isBanned) {
          console.log("❌ خطأ: هذا الحساب محظور من قبل الإدارة!");
          throw new Error("ACCOUNT_BANNED");
        }

   

        console.log("✅ نجاح: تم التحقق من بيانات المستخدم وتسجيل دخوله بنجاح:", user.email);
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          language: user.language,
          isBanned: user.isBanned,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        const authUser = user as typeof user & { language?: string; isBanned?: boolean };
        token.language = authUser.language;
        token.isBanned = authUser.isBanned;
      }

      // فحص متجدد لحالة الحظر مع كل طلب للتأكد من طرد الجلسات الفعالة فور حظرها
      if (token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { isBanned: true },
        });
        token.isBanned = Boolean(dbUser?.isBanned);
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        const sessionUser = session.user as typeof session.user & {
          language?: string;
          isBanned?: boolean;
        };
        sessionUser.language = token.language as string | undefined;
        sessionUser.isBanned = token.isBanned as boolean | undefined;
      }
      return session;
    },
  },
});