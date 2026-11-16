import { auth } from "@/auth";
import ProfileSettingsPage from "@/components/ProfileSettingsPage";
import PendingSubmitButton from "@/components/PendingSubmitButton";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export default async function EditProfilePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");
  const params = await searchParams;
  const user = await prisma.user.findUnique({ where: { email: session.user.email }, select: { name: true, email: true, bio: true } });
  if (!user) redirect("/login");

  async function saveProfile(formData: FormData) {
    "use server";
    const current = await auth();
    if (!current?.user?.email) redirect("/login");
    const name = String(formData.get("name") ?? "").trim();
    const bio = String(formData.get("bio") ?? "").trim();
    if (!name || name.length > 80 || bio.length > 300) {
      redirect(`/profile/edit?error=${encodeURIComponent("اكتب اسماً من 1 إلى 80 حرفاً، واجعل النبذة أقل من 300 حرف.")}`);
    }
    await prisma.user.update({ where: { email: current.user.email }, data: { name, bio: bio || null } });
    revalidatePath("/profile");
    revalidatePath("/my-books");
    revalidatePath("/");
    
    // العودة مباشرة لصفحة البروفايل بعد الحفظ بنجاح
    redirect("/profile");
  }

  return (
    <ProfileSettingsPage title="المعلومات الشخصية" >
      {params.error && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{params.error}</p>}
      <form action={saveProfile} className="space-y-4">
        <label className="block text-xs font-bold">الاسم
          <input name="name" required maxLength={80} defaultValue={user.name} className="mt-1.5 w-full rounded-xl border border-[#CBD5E1] px-3.5 py-3 text-sm" />
        </label>
        <label className="block text-xs font-bold">البريد الإلكتروني
          <input type="email" value={user.email} readOnly className="mt-1.5 w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3.5 py-3 text-sm text-[#64748B]" />
        </label>
        <label className="block text-xs font-bold">نبذة عنك (اختيارية)
          <textarea name="bio" rows={4} maxLength={300} defaultValue={user.bio ?? ""} placeholder="شارك القراء اهتماماتك بالكتب..." className="mt-1.5 w-full resize-y rounded-xl border border-[#CBD5E1] px-3.5 py-3 text-sm" />
        </label>
        <PendingSubmitButton pendingText="جارٍ حفظ المعلومات..." className="w-full rounded-xl bg-[#1E293B] px-5 py-3 text-sm font-extrabold text-white transition hover:bg-[#334155]">حفظ التعديلات</PendingSubmitButton>
      </form>
    </ProfileSettingsPage>
  );
}