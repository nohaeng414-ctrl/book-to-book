// app/banned/page.tsx
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Ban, LogOut } from "lucide-react";

export default async function BannedPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { isBanned: true, banReason: true },
  });

  // إذا تم إلغاء حظره، يرجع للصفحة الرئيسية
  if (!user?.isBanned) redirect("/");

  return (
    <main dir="rtl" className="flex min-h-screen items-center justify-center bg-slate-50 p-4 text-[#0F172A]">
      <div className="w-full max-w-md rounded-3xl border border-rose-200 bg-white p-6 sm:p-8 text-center shadow-lg">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
          <Ban className="h-8 w-8" />
        </div>

        <h1 className="text-lg font-black text-slate-900 mb-2">تم حظر هذا الحساب</h1>
        
        <p className="text-xs text-slate-600 leading-relaxed mb-4">
          تم تعليق نشاط حسابك لمخالفة شروط وسياسات الاستخدام الخاصة بالمنصة وبناءً على بلاغات تم التحقق منها.
        </p>

        {user.banReason && (
          <div className="rounded-2xl bg-rose-50/70 border border-rose-100 p-3 text-xs font-semibold text-rose-900 mb-6">
            <span className="block text-[11px] text-rose-500 font-bold mb-0.5">سبب الحظر:</span>
            {user.banReason}
          </div>
        )}

        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white transition hover:bg-slate-800 cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            <span>تسجيل الخروج</span>
          </button>
        </form>
      </div>
    </main>
  );
}