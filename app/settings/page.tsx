import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import PendingSubmitButton from "@/components/PendingSubmitButton";
import { countriesList } from "@/data/locations";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import {
  User,
  LogOut,
  Globe,
  Lock,
  Bell,
  ShieldCheck,
  ChevronLeft,
  ArrowRight,
} from "lucide-react";
import UserAvatar from "@/components/UserAvatar";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ locationError?: string; locationSaved?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const params = await searchParams;

  const dbUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      name: true,
      email: true,
      country: true,
      language: true,
      city: true,
      neighborhood: true,
    },
  });

  if (!dbUser) redirect("/login");

  async function saveLocation(formData: FormData) {
    "use server";
    const current = await auth();
    if (!current?.user?.email) redirect("/login");

    const country = String(formData.get("country") ?? "");
    const language = String(formData.get("language") ?? "");
    const city = String(formData.get("city") ?? "").trim();
    const neighborhood = String(formData.get("neighborhood") ?? "").trim();

    if (
      !countriesList.includes(country) ||
      !["ar", "en"].includes(language) ||
      city.length < 2 ||
      city.length > 80 ||
      neighborhood.length > 100
    ) {
      redirect(
        `/settings?locationError=${encodeURIComponent(
          "تحقق من اللغة والدولة والمدينة والحي وحاول مجدداً.",
        )}`,
      );
    }

    await prisma.user.update({
      where: { email: current.user.email },
      data: { language, country, city, neighborhood: neighborhood || null },
    });

    const cookieStore = await cookies();
    cookieStore.set("book-language", language, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });

    revalidatePath("/profile");
    revalidatePath("/settings");
    revalidatePath("/");
    revalidatePath("/requests");
    redirect("/settings?locationSaved=1");
  }

  return (
    <main dir="rtl" className="mx-auto w-full max-w-3xl space-y-6 px-3 sm:px-4 py-6 text-[#0F172A]">
      {/* شريط الرجوع للبروفايل */}
<header className="relative -mt-6 mb-6 flex h-14 w-full items-center justify-between rounded-b-2xl border-x border-b border-slate-200 bg-white px-3 shadow-2xs">
  
  {/* زر الرجوع */}
  <Link
    href="/profile"
    title="رجوع"
    className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100 active:bg-slate-200 transition-colors"
  >
    <ArrowRight className="h-5 w-5" />
  </Link>

  {/* عنوان الصفحة بالمنتصف بدقة */}
  <h1 className="text-base font-extrabold text-slate-900 tracking-tight select-none">
    الإعدادات
  </h1>

  {/* موازن المساحة */}
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
            href="/profile/security"
            className="flex items-center justify-between px-4 py-3.5 transition hover:bg-slate-50 text-slate-700 font-bold"
          >
            <div className="flex items-center gap-3">
              <Lock className="h-4 w-4 text-slate-500" />
              تغيير كلمة المرور
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

      {/* قسم اللغة والموقع */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs sm:p-5">
        <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
          <Globe className="h-4 w-4 text-brand-teal" />
          <h2 className="text-sm font-extrabold text-slate-900">اللغة والموقع</h2>
        </div>

        {params.locationError && (
          <p role="alert" className="mb-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700">
            {params.locationError}
          </p>
        )}
        {params.locationSaved && (
          <p role="status" className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-700">
            تم حفظ تفضيلاتك بنجاح.
          </p>
        )}

        <form action={saveLocation} className="space-y-3.5">
          <label className="block text-xs font-bold text-slate-700">
            لغة التطبيق
            <select
              name="language"
              required
              defaultValue={dbUser.language}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs sm:text-sm"
            >
              <option value="ar">العربية</option>
              <option value="en">English</option>
            </select>
          </label>

          <label className="block text-xs font-bold text-slate-700">
            الدولة
            <select
              name="country"
              required
              defaultValue={dbUser.country ?? ""}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs sm:text-sm"
            >
              <option value="" disabled>اختر الدولة</option>
              {countriesList.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>

          <label className="block text-xs font-bold text-slate-700">
            المدينة
            <input
              name="city"
              required
              minLength={2}
              maxLength={80}
              defaultValue={dbUser.city}
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs sm:text-sm"
            />
          </label>

          <label className="block text-xs font-bold text-slate-700">
            الحي (اختياري)
            <input
              name="neighborhood"
              maxLength={100}
              defaultValue={dbUser.neighborhood ?? ""}
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs sm:text-sm"
            />
          </label>

          <PendingSubmitButton
            pendingText="جارٍ الحفظ..."
            className="w-full rounded-xl bg-brand-primary hover:bg-brand-primary-hover px-4 py-3 text-xs sm:text-sm font-bold text-white transition shadow-sm shadow-brand-primary/20"
          >
            حفظ التغييرات
          </PendingSubmitButton>
        </form>
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
          className="w-full flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50/60 py-3 text-xs font-bold text-red-600 transition hover:bg-red-100"
        >
          <LogOut className="h-4 w-4" />
          تسجيل الخروج
        </PendingSubmitButton>
      </form>
    </main>
  );
}