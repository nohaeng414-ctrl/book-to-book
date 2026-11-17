import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import BackButton from "@/components/BackButton";

import Link from "next/link";
import { ArrowRight, User, AtSign, AlignLeft } from "lucide-react";
import PendingSubmitButton from "@/components/PendingSubmitButton";

export default async function EditProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
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
    if (!name || name.length > 80 || bio.length > 300) {
      redirect(
        `/profile/edit?error=${encodeURIComponent(
          "اكتب اسماً من 1 إلى 80 حرفاً، واجعل النبذة أقل من 300 حرف."
        )}`
      );
    }
    await prisma.user.update({
      where: { email: current.user.email },
      data: { name, bio: bio || null },
    });
    revalidatePath("/profile");
    revalidatePath("/my-books");
    revalidatePath("/");

    redirect("/profile");
  }

  return (
    <main
      dir="rtl"
      className="mx-auto w-full max-w-2xl space-y-5 px-3 sm:px-4 pt-4 pb-28 text-[#0F172A]"
    >
      {/* 🧭 الهيدر المتناسق */}
      <div className="relative flex flex-col items-center justify-center rounded-3xl bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#334155] p-6 text-white shadow-md border border-slate-700/50">
          <div className="absolute top-4 right-4 z-20">
        
                  <BackButton />
                </div>
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-400/20 text-teal-400 mb-3 border border-teal-400/30">
          <User className="h-7 w-7" />
        </div>
        <h1 className="text-xl sm:text-2xl font-black">تعديل الملف الشخصي</h1>
    
      </div>

      {/* 📋 نموذج التعديل (Clean Form) */}
      <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xs">
        {params.error && (
          <div
            role="alert"
            className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-bold text-rose-700 text-center"
          >
            {params.error}
          </div>
        )}

        <form action={saveProfile} className="space-y-4">
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-black text-slate-700">
              <User className="h-3.5 w-3.5 text-slate-400" />
              الاسم الكامل
            </label>
            <input
              name="name"
              required
              maxLength={80}
              defaultValue={user.name}
              placeholder="اكتب اسمك الحقيقي أو المستعار..."
              className="w-full rounded-2xl border border-slate-200/80 bg-slate-50/50 px-4 py-3 text-sm font-bold text-slate-900 transition focus:border-teal-500 focus:bg-white focus:outline-hidden"
            />
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-black text-slate-700">
              <AtSign className="h-3.5 w-3.5 text-slate-400" />
              البريد الإلكتروني (غير قابل للتعديل)
            </label>
            <input
              type="email"
              value={user.email}
              readOnly
              className="w-full cursor-not-allowed rounded-2xl border border-slate-200/60 bg-slate-100/60 px-4 py-3 text-sm font-bold text-slate-500 opacity-80 focus:outline-hidden"
            />
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-black text-slate-700">
              <AlignLeft className="h-3.5 w-3.5 text-slate-400" />
              نبذة عنك (اختياري)
            </label>
            <textarea
              name="bio"
              rows={4}
              maxLength={300}
              defaultValue={user.bio ?? ""}
              placeholder="شارك القراء اهتماماتك بالكتب والمجالات التي تحب القراءة فيها..."
              className="w-full resize-y rounded-2xl border border-slate-200/80 bg-slate-50/50 px-4 py-3 text-sm font-medium text-slate-900 transition focus:border-teal-500 focus:bg-white focus:outline-hidden"
            />
            <p className="text-[10px] font-bold text-slate-400 px-1">
              الحد الأقصى 300 حرف.
            </p>
          </div>

          <div className="pt-2">
            <PendingSubmitButton
              pendingText="جارٍ الحفظ..."
              className="w-full rounded-2xl bg-teal-600 px-5 py-3.5 text-sm font-black text-white transition hover:bg-teal-700 active:scale-98"
            >
              حفظ التعديلات
            </PendingSubmitButton>
          </div>
        </form>
      </section>
    </main>
  );
}