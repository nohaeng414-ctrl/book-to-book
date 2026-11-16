import { auth } from "@/auth";
import ProfileSettingsPage from "@/components/ProfileSettingsPage";
import PendingSubmitButton from "@/components/PendingSubmitButton";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
// ✅ حذفنا revalidatePath لأنه زائد (المشكلة #3)

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

  // ✅ تعريف الـ action (يمكن نقله لملف actions.ts لاحقاً - المشكلة #7)
  async function changePassword(formData: FormData) {
    "use server";
    const current = await auth();
    if (!current?.user?.email) redirect("/login");

    const account = await prisma.user.findUnique({
      where: { email: current.user.email },
      select: { id: true, hashedPassword: true },
    });
    if (!account?.hashedPassword)
      redirect(
        `/profile/security?error=${encodeURIComponent("لا توجد كلمة مرور لهذا الحساب.")}`,
      );

    const currentPassword = String(formData.get("currentPassword") ?? "");
    const newPassword = String(formData.get("newPassword") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    // ✅ #1 فحص كلمة المرور الحالية
    if (!(await bcrypt.compare(currentPassword, account.hashedPassword))) {
      redirect(
        `/profile/security?error=${encodeURIComponent("كلمة المرور الحالية غير صحيحة.")}`,
      );
    }

    // ✅ #2 توحيد التحقق: نستخدم البايتات (حد bcrypt الحقيقي)
    // ونعيد نفس القاعدة في input عبر maxLength أدناه
    const newPasswordBytes = Buffer.byteLength(newPassword, "utf8");
    if (newPassword.length < 8 || newPasswordBytes > 72) {
      redirect(
        `/profile/security?error=${encodeURIComponent(
          "يجب أن لا يقل طول كلمة المرور عن 8 أحرف.",
        )}`,
      );
    }

    // ✅ #4 منع إعادة استخدام نفس كلمة المرور
    if (newPassword === currentPassword) {
      redirect(
        `/profile/security?error=${encodeURIComponent("كلمة المرور الجديدة مطابقة للحالية.")}`,
      );
    }

    if (newPassword !== confirmPassword) {
      redirect(
        `/profile/security?error=${encodeURIComponent("كلمتي المرور غير متطابقتين.")}`,
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
        `/profile/security?error=${encodeURIComponent("تعذّر تحديث كلمة المرور، حاول مجدداً.")}`,
      );
    }

 
    redirect("/profile/security?saved=1");
  }

  return (
    <ProfileSettingsPage title="تغيير كلمة المرور">
      {params.error && (
        <p
          role="alert"
          className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700"
        >
          {params.error}
        </p>
      )}
      {params.saved === "1" && (
        <p
          role="status"
          className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-700"
        >
          تم تغيير كلمة المرور.
        </p>
      )}

      {!user.hashedPassword ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
          هذا الحساب لا يملك كلمة مرور محفوظة، لذلك لا يمكن تغييرها من هنا.
        </p>
      ) : (
        <form action={changePassword} noValidate className="space-y-4">
          <label className="block text-xs font-bold">
            كلمة المرور الحالية
            <input
              type="password"
              name="currentPassword"
              required
              autoComplete="off"
              className="mt-1.5 w-full rounded-xl border border-[#CBD5E1] px-3.5 py-3 text-sm"
            />
          </label>

          <label className="block text-xs font-bold">
            كلمة المرور الجديدة
            <input
              type="password"
              name="newPassword"
              required
              minLength={8}
         
              maxLength={72}
              autoComplete="new-password"
              className="mt-1.5 w-full rounded-xl border border-[#CBD5E1] px-3.5 py-3 text-sm"
            />
          </label>

          <label className="block text-xs font-bold">
            تأكيد كلمة المرور الجديدة
            <input
              type="password"
              name="confirmPassword"
              required
              minLength={8}
              maxLength={72}
              autoComplete="new-password"
              className="mt-1.5 w-full rounded-xl border border-[#CBD5E1] px-3.5 py-3 text-sm"
            />
          </label>

          <PendingSubmitButton
            pendingText="جارٍ تغيير كلمة المرور..."
            className="w-full rounded-xl bg-[#1E293B] px-5 py-3 text-sm font-extrabold text-white transition hover:bg-[#334155]"
          >
            تغيير كلمة المرور
          </PendingSubmitButton>
        </form>
      )}
    </ProfileSettingsPage>
  );
}