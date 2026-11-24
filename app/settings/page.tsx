import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdminEmail } from "@/lib/admin"; // 👈 استيراد دالة التحقق من المشرف
import Link from "next/link";
import BackButton from "@/components/BackButton";

import PendingSubmitButton from "@/components/PendingSubmitButton";
import { redirect } from "next/navigation";
import {
  User,
  LogOut,
  Globe,
  Lock,
  Bell,
  ShieldCheck,
  ShieldAlert, // 👈 أيقونة الإدارة
  ChevronLeft,
  ArrowRight,
} from "lucide-react";
import UserAvatar from "@/components/UserAvatar";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  if (!dbUser) redirect("/login");

  return (
    <main dir="rtl" className="mx-auto w-full max-w-3xl space-y-6 px-3 sm:px-4 py-6 text-[#0F172A]">
      {/* شريط الرجوع للبروفايل */}
      <header className="relative -mt-6 mb-6 flex h-14 w-full items-center justify-between rounded-b-2xl border-x border-b border-slate-200 bg-white px-3 shadow-2xs">
            <div className="shrink-0 z-10">
                 <BackButton />
               </div>
        <h1 className="text-base font-extrabold text-slate-900 tracking-tight select-none">
          الإعدادات
        </h1>
        <div className="w-10" aria-hidden="true" />
      </header>

      {/* بطاقة تعريفية سريعة بالحساب */}
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
        <UserAvatar userId={dbUser.id} name={dbUser.name} size="md" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-slate-900">{dbUser.name}</p>
          <p className="truncate text-xs text-slate-400">{dbUser.email}</p>
        </div>
      </div>

      {/* إدارة الحساب والأمان */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            الأمان والخصوصية
          </h2>
        </div>

        <div className="divide-y divide-slate-100 text-xs">
          
          {/* 🛡️ زر لوحة الإدارة (يظهر حصرياً للمشرف) */}
          {isAdminEmail(dbUser.email) && (
            <Link
              href="/admin"
              className="flex items-center justify-between px-4 py-3.5 transition hover:bg-amber-50/50 text-amber-700 font-black bg-amber-50/30"
            >
              <div className="flex items-center gap-3">
                <ShieldAlert className="h-4 w-4 text-amber-600" />
                لوحة تحكم الإدارة 
              </div>
              <ChevronLeft className="h-4 w-4 text-amber-500" />
            </Link>
          )}

          <Link
            href="/profile/edit"
            className="flex items-center justify-between px-4 py-3.5 transition hover:bg-slate-50 text-slate-700 font-bold"
          >
            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-slate-500" />
              المعلومات الشخصية
            </div>
            <ChevronLeft className="h-4 w-4 text-slate-400" />
          </Link>

          <Link
            href="/profile/country-language"
            className="flex items-center justify-between px-4 py-3.5 transition hover:bg-slate-50 text-slate-700 font-bold"
          >
            <div className="flex items-center gap-3">
<Globe className="h-4 w-4 text-slate-500" />
             اللغة والموقع
            </div>
            <ChevronLeft className="h-4 w-4 text-slate-400" />
          </Link>

          <Link
            href="/profile/security"
            className="flex items-center justify-between px-4 py-3.5 transition hover:bg-slate-50 text-slate-700 font-bold"
          >
            <div className="flex items-center gap-3">
              <Lock className="h-4 w-4 text-slate-500" />
             الأمان وإدارة الحساب
            </div>
            <ChevronLeft className="h-4 w-4 text-slate-400" />
          </Link>

          <Link
            href="/profile/notifications"
            className="flex items-center justify-between px-4 py-3.5 transition hover:bg-slate-50 text-slate-700 font-bold"
          >
            <div className="flex items-center gap-3">
              <Bell className="h-4 w-4 text-slate-500" />
              الإشعارات
            </div>
            <ChevronLeft className="h-4 w-4 text-slate-400" />
          </Link>

          <Link
            href="/profile/privacy"
            className="flex items-center justify-between px-4 py-3.5 transition hover:bg-slate-50 text-slate-700 font-bold"
          >
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-4 w-4 text-slate-500" />
              سياسة الخصوصية
            </div>
            <ChevronLeft className="h-4 w-4 text-slate-400" />
          </Link>
        </div>
      </div>

 
      {/* زر تسجيل الخروج */}
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/login" });
        }}
      >
        <PendingSubmitButton
          pendingText="جارٍ تسجيل الخروج..."
          className="w-full flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50/60 py-3 text-xs font-bold text-red-600 transition hover:bg-red-100"
        >
          <LogOut className="h-4 w-4" />
          تسجيل الخروج
        </PendingSubmitButton>
      </form>
    </main>
  );
}
