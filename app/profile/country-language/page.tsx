import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";
import LocationLanguageForm from "@/components/LocationLanguageForm";

const PAGE_PATH = "/profile/country-language";

export default async function LocationLanguagePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const params = await searchParams;
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      language: true,
      country: true,
      city: true,
      neighborhood: true,
    },
  });
  if (!user) redirect("/login");

  async function updateLocationAndLanguage(formData: FormData) {
    "use server";
    const current = await auth();
    if (!current?.user?.email) redirect("/login");

    const account = await prisma.user.findUnique({
      where: { email: current.user.email },
      select: { id: true },
    });
    if (!account) redirect("/login");

    const language = String(formData.get("language") ?? "ar").trim() || "ar";
    const country = String(formData.get("country") ?? "").trim();
    const city = String(formData.get("city") ?? "").trim();
    const neighborhood = String(formData.get("neighborhood") ?? "").trim();

    if (!country || !city) {
      redirect(
        `${PAGE_PATH}?error=${encodeURIComponent(
          "يرجى اختيار الدولة والمدينة على الأقل."
        )}`
      );
    }

    try {
      await prisma.user.update({
        where: { id: account.id },
        data: {
          language,
          country,
          city,
          neighborhood: neighborhood || null,
        },
      });
    } catch {
      redirect(
        `${PAGE_PATH}?error=${encodeURIComponent(
          "تعذّر حفظ التعديلات، حاول مجدداً."
        )}`
      );
    }

    revalidatePath(PAGE_PATH);
    revalidatePath("/settings");
    redirect(`${PAGE_PATH}?saved=1`);
  }

  return (
    <main
      dir="rtl"
      className="mx-auto w-full max-w-2xl space-y-5 px-3 sm:px-4 pt-4 pb-28 text-[#0F172A]"
    >
     <header className="relative -mt-6 mb-6 flex h-14 w-full items-center justify-between rounded-b-2xl border-x border-b border-slate-200 bg-white px-3 shadow-2xs">
        <Link
          href="/profile"
          title="رجوع"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100 active:bg-slate-200 transition-colors"
        >
          <ArrowRight className="h-5 w-5" />
        </Link>
        <h1 className="text-base font-extrabold text-slate-900 tracking-tight select-none">
          اللغة والموقع
        </h1>
        <div className="w-10" aria-hidden="true" />
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xs">
        {params.error && (
          <div
            role="alert"
            className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-bold text-rose-700 text-center flex items-center justify-center gap-2"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            {params.error}
          </div>
        )}

        {params.saved === "1" && (
          <div
            role="status"
            className="mb-5 rounded-2xl border border-teal-200 bg-teal-50 p-3.5 text-xs font-bold text-teal-700 text-center flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            تم حفظ إعدادات اللغة والموقع بنجاح.
          </div>
        )}

        <LocationLanguageForm
          action={updateLocationAndLanguage}
          initialLanguage={user.language || "ar"}
          initialCountry={user.country ?? ""}
          initialCity={user.city ?? ""}
          initialNeighborhood={user.neighborhood ?? ""}
        />
      </section>
    </main>
  );
}