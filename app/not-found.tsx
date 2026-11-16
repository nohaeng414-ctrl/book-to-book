import Link from "next/link";

export default function NotFound() {
  return (
    <main
      dir="rtl"
      className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-5 text-center"
    >
      <p className="text-sm font-bold text-teal-700">404</p>
      <h1 className="mt-2 text-2xl font-black text-slate-900">الصفحة غير موجودة</h1>
      <p className="mt-3 text-sm leading-7 text-slate-600">
        ربما تغيّر الرابط أو أزيلت الصفحة. يمكنك العودة إلى الكتب المعروضة.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-700"
      >
        العودة إلى الصفحة الرئيسية
      </Link>
    </main>
  );
}
