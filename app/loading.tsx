export default function Loading() {
  return (
    <main dir="rtl" role="status" aria-live="polite" className="grid min-h-[45vh] place-content-center justify-items-center gap-3 px-4 text-center text-[#334155]">
      <span aria-hidden="true" className="h-9 w-9 animate-spin rounded-full border-4 border-[#E2E8F0] border-t-[#E8B042]" />
      <p className="text-sm font-bold">جارٍ تحميل الصفحة...</p>
      <span className="sr-only">يرجى الانتظار</span>
    </main>
  );
}