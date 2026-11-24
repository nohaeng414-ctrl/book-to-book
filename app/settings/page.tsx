import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdminEmail } from "@/lib/admin";
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
  ShieldAlert,
  ChevronLeft,
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

  const isAdmin = isAdminEmail(dbUser.email);

  return (
    <main
      dir="rtl"
      className="mx-auto w-full max-w-3xl space-y-5 px-3 sm:px-4 py-6 text-[#0F172A]"
    >
      {/* شريط العلوي */}
      <header className="relative -mt-6 mb-5 flex h-14 w-full items-center justify-between rounded-b-2xl border-x border-b border-slate-200 bg-white px-3 shadow-2xs">
        <div className="shrink-0 z-10">
          <BackButton />
        </div>
        <h1 className="text-base font-extrabold text-slate-900 tracking-tight select-none">
          الإعدادات
        </h1>
        <div className="w-10" aria-hidden="true" />
      </header>

      {/* بطاقة الحساب */}
      <section className="flex items-center gap-3.5 rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs">
        <UserAvatar userId={dbUser.id} name={dbUser.name} size="md" />
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-black text-slate-900">
              {dbUser.name}
            </p>
            {isAdmin && (
              <span className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-black text-amber-800">
                مشرف
              </span>
            )}
          </div>
          <p className="truncate text-xs font-medium text-slate-500">
            {dbUser.email}
          </p>
        </div>
      </section>

      {/* القسم الأول: الحساب والتفضيلات */}
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xs">
        <div className="border-b border-slate-100 bg-slate-50/70 px-4 py-3">
          <h2 className="text-xs font-black text-slate-600">
            الحساب والتفضيلات
          </h2>
        </div>

        <div className="divide-y divide-slate-100">
          <Link
            href="/profile/edit"
            className="flex items-center justify-between gap-3 px-4 py-3.5 transition hover:bg-slate-50/90 active:bg-slate-100/70"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200/80 bg-slate-50 text-slate-700">
                <User className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-bold text-slate-900">
                  المعلومات الشخصية
                </p>
                <p className="truncate text-[11px] text-slate-500">
                  الاسم والنبذة التعريفية للحساب
                </p>
              </div>
            </div>
            <ChevronLeft
              className="h-4 w-4 shrink-0 text-slate-400"
              aria-hidden="true"
            />
          </Link>

          <Link
            href="/profile/country-language"
            className="flex items-center justify-between gap-3 px-4 py-3.5 transition hover:bg-slate-50/90 active:bg-slate-100/70"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200/80 bg-slate-50 text-slate-700">
                <Globe className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-bold text-slate-900">
                  اللغة والموقع
                </p>
                <p className="truncate text-[11px] text-slate-500">
                  الدولة والمدينة ولغة الواجهة
                </p>
              </div>
            </div>
            <ChevronLeft
              className="h-4 w-4 shrink-0 text-slate-400"
              aria-hidden="true"
            />
          </Link>

          <Link
            href="/profile/notifications"
            className="flex items-center justify-between gap-3 px-4 py-3.5 transition hover:bg-slate-50/90 active:bg-slate-100/70"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200/80 bg-slate-50 text-slate-700">
                <Bell className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-bold text-slate-900">
                  الإشعارات
                </p>
                <p className="truncate text-[11px] text-slate-500">
                  تنبيهات طلبات التبادل والرسائل والكتب الجديدة
                </p>
              </div>
            </div>
            <ChevronLeft
              className="h-4 w-4 shrink-0 text-slate-400"
              aria-hidden="true"
            />
          </Link>
        </div>
      </section>

      {/* القسم الثاني: الأمان والخصوصية والإدارة */}
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xs">
        <div className="border-b border-slate-100 bg-slate-50/70 px-4 py-3">
          <h2 className="text-xs font-black text-slate-600">
            الأمان والخصوصية
          </h2>
        </div>

        <div className="divide-y divide-slate-100">
          {isAdmin && (
            <Link
              href="/admin"
              className="flex items-center justify-between gap-3 bg-amber-50/40 px-4 py-3.5 transition hover:bg-amber-50/80 active:bg-amber-100/60"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-200 bg-amber-100/70 text-amber-700">
                  <ShieldAlert className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-black text-amber-900">
                    لوحة تحكم الإدارة
                  </p>
                  <p className="truncate text-[11px] font-medium text-amber-700/90">
                    إدارة المستخدمين والكتب والتبادلات والبلاغات
                  </p>
                </div>
              </div>
              <ChevronLeft
                className="h-4 w-4 shrink-0 text-amber-600"
                aria-hidden="true"
              />
            </Link>
          )}

          <Link
            href="/profile/security"
            className="flex items-center justify-between gap-3 px-4 py-3.5 transition hover:bg-slate-50/90 active:bg-slate-100/70"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200/80 bg-slate-50 text-slate-700">
                <Lock className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-bold text-slate-900">
                  الأمان وإدارة الحساب
                </p>
                <p className="truncate text-[11px] text-slate-500">
                  تغيير كلمة المرور أو حذف الحساب نهائياً
                </p>
              </div>
            </div>
            <ChevronLeft
              className="h-4 w-4 shrink-0 text-slate-400"
              aria-hidden="true"
            />
          </Link>

          <Link
            href="/profile/privacy"
            className="flex items-center justify-between gap-3 px-4 py-3.5 transition hover:bg-slate-50/90 active:bg-slate-100/70"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200/80 bg-slate-50 text-slate-700">
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-bold text-slate-900">
                  سياسة الخصوصية
                </p>
                <p className="truncate text-[11px] text-slate-500">
                  كيفية حماية بياناتك وإدارة خصوصيتك
                </p>
              </div>
            </div>
            <ChevronLeft
              className="h-4 w-4 shrink-0 text-slate-400"
              aria-hidden="true"
            />
          </Link>
        </div>
      </section>

      {/* زر تسجيل الخروج */}
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/login" });
        }}
      >
        <PendingSubmitButton
          pendingText="جارٍ تسجيل الخروج..."
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50/70 py-3 text-xs font-black text-rose-700 transition hover:bg-rose-100 active:scale-[0.99] cursor-pointer"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          <span>تسجيل الخروج</span>
        </PendingSubmitButton>
      </form>
    </main>
  );
}