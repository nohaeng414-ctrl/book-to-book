import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import BackButton from "@/components/BackButton";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  User,
  AtSign,
  Sparkles,
  Lock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import PendingSubmitButton from "@/components/PendingSubmitButton";

const PAGE_PATH = "/profile/edit";

export default async function EditProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const params = await searchParams;
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { name: true, email: true, bio: true },
  });
  if (!user) redirect("/login");

  async function saveProfile(formData: FormData) {
    "use server";
    const current = await auth();
    if (!current?.user?.email) redirect("/login");

    const name = String(formData.get("name") ?? "").trim();
    const bio = String(formData.get("bio") ?? "").trim();

    if (!name || name.length > 80) {
      redirect(
        `${PAGE_PATH}?error=${encodeURIComponent(
          "يرجى كتابة اسم صالح بين 1 و 80 حرفاً."
        )}`
      );
    }

    if (bio.length > 300) {
      redirect(
        `${PAGE_PATH}?error=${encodeURIComponent(
          "يجب أن لا تتجاوز الاهتمامات 300 حرف."
        )}`
      );
    }

    try {
      await prisma.user.update({
        where: { email: current.user.email },
        data: { name, bio: bio || null },
      });
    } catch {
      redirect(
        `${PAGE_PATH}?error=${encodeURIComponent(
          "تعذّر حفظ التعديلات، حاول مجدداً."
        )}`
      );
    }

    revalidatePath(PAGE_PATH);
    revalidatePath("/profile");
    revalidatePath("/my-books");
    revalidatePath("/");
    redirect(`${PAGE_PATH}?saved=1`);
  }

  return (
    <main
      dir="rtl"
      className="mx-auto w-full max-w-2xl space-y-5 px-3 sm:px-4 pt-4 pb-28 text-[#0F172A]"
    >
      <header className="relative -mt-6 mb-6 flex h-14 w-full items-center justify-between rounded-b-2xl border-x border-b border-slate-200 bg-white px-3 shadow-2xs">
          <div className="shrink-0 z-10">
          <BackButton />
        </div>
        <h1 className="text-base font-extrabold text-slate-900 tracking-tight select-none">
          تعديل الملف الشخصي
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
            تم حفظ تعديلات الملف الشخصي بنجاح.
          </div>
        )}

        <form action={saveProfile} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="name"
              className="flex items-center gap-1.5 text-xs font-black text-slate-700"
            >
              <User className="h-3.5 w-3.5 text-slate-400" />
              الاسم الكامل
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              maxLength={80}
              defaultValue={user.name}
              placeholder="اكتب اسمك الحقيقي أو المستعار..."
              className="w-full rounded-2xl border border-slate-200/80 bg-slate-50/50 px-4 py-3 text-sm font-bold text-slate-900 transition focus:border-teal-500 focus:bg-white focus:outline-hidden"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="flex items-center justify-between text-xs font-black text-slate-700"
            >
              <span className="flex items-center gap-1.5">
                <AtSign className="h-3.5 w-3.5 text-slate-400" />
                البريد الإلكتروني
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400">
                <Lock className="h-3 w-3" />
                غير قابل للتعديل
              </span>
            </label>
            <input
              id="email"
              type="email"
              value={user.email}
              readOnly
              className="w-full cursor-not-allowed rounded-2xl border border-slate-200/60 bg-slate-100/70 px-4 py-3 text-sm font-bold text-slate-500 focus:outline-hidden"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="bio"
              className="flex items-center justify-between text-xs font-black text-slate-700"
            >
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-teal-600" />
                اهتماماتي
              </span>
              <span className="text-[11px] font-medium text-slate-400">
                اختياري • حتى 300 حرف
              </span>
            </label>
            <textarea
              id="bio"
              name="bio"
              rows={4}
              maxLength={300}
              defaultValue={user.bio ?? ""}
placeholder="مثلاً: الروايات التاريخية، الأدب، الفلسفة، وتطوير الذات..."
              className="w-full resize-none rounded-2xl border border-slate-200/80 bg-slate-50/50 px-4 py-3 text-sm font-medium leading-relaxed text-slate-900 transition focus:border-teal-500 focus:bg-white focus:outline-hidden"
            />
          </div>

          <div className="pt-2">
            <PendingSubmitButton
              pendingText="جارٍ حفظ التعديلات..."
              className="w-full rounded-2xl bg-slate-900 px-5 py-3.5 text-sm font-black text-white transition hover:bg-slate-800 active:scale-98"
            >
              حفظ التعديلات
            </PendingSubmitButton>
          </div>
        </form>
      </section>
    </main>
  );
}
