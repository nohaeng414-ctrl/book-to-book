import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  ShieldCheck,
  KeyRound,
  Lock,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import PendingSubmitButton from "@/components/PendingSubmitButton";

const PAGE_PATH = "/profile/security";

export default async function SecurityPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const params = await searchParams;
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { hashedPassword: true },
  });
  if (!user) redirect("/login");

  async function changePassword(formData: FormData) {
    "use server";
    const current = await auth();
    if (!current?.user?.email) redirect("/login");

    const account = await prisma.user.findUnique({
      where: { email: current.user.email },
      select: { id: true, hashedPassword: true },
    });

    if (!account?.hashedPassword) {
      redirect(
        `${PAGE_PATH}?error=${encodeURIComponent(
          "لا توجد كلمة مرور لهذا الحساب."
        )}`
      );
    }

    const currentPassword = String(formData.get("currentPassword") ?? "");
    const newPassword = String(formData.get("newPassword") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (!(await bcrypt.compare(currentPassword, account.hashedPassword))) {
      redirect(
        `${PAGE_PATH}?error=${encodeURIComponent(
          "كلمة المرور الحالية غير صحيحة."
        )}`
      );
    }

    const newPasswordBytes = Buffer.byteLength(newPassword, "utf8");
    if (newPassword.length < 8 || newPasswordBytes > 72) {
      redirect(
        `${PAGE_PATH}?error=${encodeURIComponent(
          "يجب أن لا يقل طول كلمة المرور عن 8 أحرف."
        )}`
      );
    }

    if (newPassword === currentPassword) {
      redirect(
        `${PAGE_PATH}?error=${encodeURIComponent(
          "كلمة المرور الجديدة مطابقة للحالية."
        )}`
      );
    }

    if (newPassword !== confirmPassword) {
      redirect(
        `${PAGE_PATH}?error=${encodeURIComponent(
          "كلمتا المرور غير متطابقتين."
        )}`
      );
    }

    try {
      const hashedPassword = await bcrypt.hash(newPassword, 12);
      await prisma.user.update({
        where: { id: account.id },
        data: { hashedPassword },
      });
    } catch {
      redirect(
        `${PAGE_PATH}?error=${encodeURIComponent(
          "تعذّر تحديث كلمة المرور، حاول مجدداً."
        )}`
      );
    }

    redirect(`${PAGE_PATH}?saved=1`);
  }

  return (
    <main
      dir="rtl"
      className="mx-auto w-full max-w-2xl space-y-5 px-3 sm:px-4 pt-4 pb-28 text-[#0F172A]"
    >
      <header className="relative -mt-6 mb-6 flex h-14 w-full items-center justify-between rounded-b-2xl border-x border-b border-slate-200 bg-white px-3 shadow-2xs">
        <Link
          href="/settings"
          title="رجوع"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100 active:bg-slate-200 transition-colors"
        >
          <ArrowRight className="h-5 w-5" />
        </Link>
        <h1 className="text-base font-extrabold text-slate-900 tracking-tight select-none">
          تغيير كلمة المرور
        </h1>
        <div className="w-10" aria-hidden="true" />
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xs">
        {params.error && (
          <div
            role="alert"
            className="mb-5 flex items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-center text-xs font-bold text-rose-700"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            {params.error}
          </div>
        )}

        {params.saved === "1" && (
          <div
            role="status"
            className="mb-5 flex items-center justify-center gap-2 rounded-2xl border border-teal-200 bg-teal-50 p-3.5 text-center text-xs font-bold text-teal-700"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            تم تغيير كلمة المرور بنجاح.
          </div>
        )}

        {!user.hashedPassword ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center text-amber-800">
            <ShieldAlert className="mb-2 h-8 w-8 opacity-80" />
            <p className="text-xs sm:text-sm font-bold leading-relaxed">
              هذا الحساب مُسجّل عبر (Google) ولا يملك كلمة مرور محفوظة هنا، لذلك لا يمكن تغييرها من هذه الصفحة.
            </p>
          </div>
        ) : (
          <form action={changePassword} noValidate className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="currentPassword"
                className="flex items-center gap-1.5 text-xs font-black text-slate-700"
              >
                <KeyRound className="h-3.5 w-3.5 text-slate-400" />
                كلمة المرور الحالية
              </label>
              <input
                id="currentPassword"
                type="password"
                name="currentPassword"
                required
                autoComplete="current-password"
                placeholder="أدخل كلمة المرور الحالية..."
                className="w-full rounded-2xl border border-slate-200/80 bg-slate-50/50 px-4 py-3 text-sm font-bold text-slate-900 transition focus:border-teal-500 focus:bg-white focus:outline-hidden"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="newPassword"
                className="flex items-center justify-between text-xs font-black text-slate-700"
              >
                <span className="flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-slate-400" />
                  كلمة المرور الجديدة
                </span>
                <span className="text-[11px] font-medium text-slate-400">
                  8 أحرف على الأقل
                </span>
              </label>
              <input
                id="newPassword"
                type="password"
                name="newPassword"
                required
                minLength={8}
                maxLength={72}
                autoComplete="new-password"
                placeholder="أدخل كلمة المرور الجديدة..."
                className="w-full rounded-2xl border border-slate-200/80 bg-slate-50/50 px-4 py-3 text-sm font-bold text-slate-900 transition focus:border-teal-500 focus:bg-white focus:outline-hidden"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="confirmPassword"
                className="flex items-center gap-1.5 text-xs font-black text-slate-700"
              >
                <ShieldCheck className="h-3.5 w-3.5 text-slate-400" />
                تأكيد كلمة المرور الجديدة
              </label>
              <input
                id="confirmPassword"
                type="password"
                name="confirmPassword"
                required
                minLength={8}
                maxLength={72}
                autoComplete="new-password"
                placeholder="أعد إدخال كلمة المرور الجديدة للتأكيد..."
                className="w-full rounded-2xl border border-slate-200/80 bg-slate-50/50 px-4 py-3 text-sm font-bold text-slate-900 transition focus:border-teal-500 focus:bg-white focus:outline-hidden"
              />
            </div>

            <div className="pt-2">
              <PendingSubmitButton
                pendingText="جارٍ التحقق وتغيير كلمة المرور..."
                className="w-full rounded-2xl bg-slate-900 px-5 py-3.5 text-sm font-black text-white transition hover:bg-slate-800 active:scale-98"
              >
                تحديث كلمة المرور
              </PendingSubmitButton>
            </div>
          </form>
        )}
      </section>
    </main>
  );
}