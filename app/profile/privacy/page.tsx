import Link from "next/link";
import {
  ArrowRight,
  ShieldCheck,
  User,
  MapPin,
  BookOpen,
  MessageSquare,
  Lock,
  UserCheck,
  CalendarClock,
  CheckCircle2,
} from "lucide-react";

export const metadata = {
  title: "سياسة الخصوصية | كتاب بكتاب",
};

const PRIVACY_SECTIONS = [
 {
    id: "account",
    title: "معلومات الحساب الأساسية",
    icon: User,
    iconWrapClass: "bg-teal-50 text-teal-700 border-teal-200/70",
    description:
      'يحتفظ تطبيق "كتاب بكتاب" باسمك وبريدك الإلكتروني واهتماماتك القرائية التي تضيفها لتخصيص تجربتك وإدارة حسابك. يتم تشفير كلمات المرور بالكامل (Hashed) ولا تُخزَّن أو تُعرض كنص عادي إطلاقاً.',
  },
  {
    id: "location",
    title: "بيانات الموقع الجغرافي",
    icon: MapPin,
    iconWrapClass: "bg-rose-50 text-rose-600 border-rose-200/70",
    description:
      "تظهر مدينتك والحي الذي تختاره فقط في ملفك الشخصي وبجوار كتبك المعروضة لمساعدة القرّاء على معرفة النطاق الجغرافي للتبادل. وعند التنسيق داخل المحادثة، تتحكم أنت بالكامل في تحديد نقطة تسليم عامة على الخريطة دون كشف موقعك الفعلي تلقائياً.",
  },
  {
    id: "swaps",
    title: "الكتب، التبادلات، ونظام النقاط",
    icon: BookOpen,
    iconWrapClass: "bg-blue-50 text-blue-700 border-blue-200/70",
    description:
      "تُحفظ بيانات الكتب التي تعرضها، وسجل النقاط المكتسبة والمحجوزة، وحالات طلبات التبادل لضمان شفافية العمليات، وحماية حقوق الطرفين، وتسوية النقاط تلقائياً عند إتمام التبادل أو إلغائه.",
  },
  {
    id: "messages",
    title: "المحادثات الخاصة والبلاغات",
    icon: MessageSquare,
    iconWrapClass: "bg-amber-50 text-amber-600 border-amber-200/70",
    description:
      "تُحفظ الرسائل المتبادلة داخل غرف الطلبات كمرجع للاتفاق بين الطرفين، ولا يطّلع عليها سوى أطراف التبادل. يحق لإدارة المنصة مراجعة المحادثة أو صور إثبات التسليم والاستلام فقط في حال فتح بلاغ أو نزاع رسمي للفصل فيه.",
  },
  {
    id: "security",
    title: "حماية البيانات وعدم مشاركتها",
    icon: Lock,
    iconWrapClass: "bg-slate-100 text-slate-700 border-slate-200",
    description:
      "نلتزم التزاماً تاماً بعدم بيع أو تأجير أو مشاركة بياناتك الشخصية مع أي جهات إعلانية أو أطراف خارجية. تُستخدم جميع المعلومات والصور المرفوعة حصراً لتشغيل خدمات المنصة وضمان أمان التبادل.",
  },
  {
    id: "rights",
    title: "حقوقك والتحكم ببياناتك",
    icon: UserCheck,
    iconWrapClass: "bg-emerald-50 text-emerald-700 border-emerald-200/70",
    description:
      "لك كامل الحق في تعديل بياناتك الشخصية، وتحديث دولتك ومدينتك، وحذف كتبك المعروضة في أي وقت من خلال إعدادات حسابك، كما يمكنك طلب حذف حسابك وبياناتك نهائياً بالتواصل مع إدارة المنصة.",
  },
];

const TRUST_HIGHLIGHTS = [
  "لا نبيع بياناتك لأي جهة",
  "تشفير كامل لكلمات المرور",
  "التواصل آمن داخل المنصة",
];

export default function PrivacyPage() {
  return (
    <main
      dir="rtl"
      className="mx-auto w-full max-w-2xl space-y-5 px-3 sm:px-4 pt-4 pb-28 text-[#0F172A]"
    >
      {/* الهيدر الموحّد */}
      <header className="relative -mt-6 mb-6 flex h-14 w-full items-center justify-between rounded-b-2xl border-x border-b border-slate-200 bg-white px-3 shadow-2xs">
        <Link
          href="/settings"
          title="رجوع"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100 active:bg-slate-200 transition-colors"
        >
          <ArrowRight className="h-5 w-5" />
        </Link>
        <h1 className="text-base font-extrabold text-slate-900 tracking-tight select-none">
          سياسة الخصوصية
        </h1>
        <div className="w-10" aria-hidden="true" />
      </header>

  

      {/* بنود سياسة الخصوصية */}
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xs">
        <div className="divide-y divide-slate-100">
         {PRIVACY_SECTIONS.map((section) => {
            const Icon = section.icon;
            return (
              <article
                key={section.id}
                className="flex items-start gap-3.5 p-5 sm:p-6"
              >
                <div
                  className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${section.iconWrapClass}`}
                >
                  <Icon className="h-4.5 w-4.5" />
                </div>

                <div className="min-w-0 flex-1 space-y-1.5">
                  <h3 className="text-sm font-black text-slate-900">
                    {section.title}
                  </h3>
                  <p className="text-xs leading-relaxed text-slate-600">
                    {section.description}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* تذييل التحكم السريع */}
      <section className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4 sm:p-5 text-center space-y-2">
        <p className="text-xs font-bold text-slate-700">
          هل ترغب في تحديث بياناتك أو إعدادات الأمان؟
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
          <Link
            href="/profile/edit"
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            تعديل الملف الشخصي
          </Link>
          <Link
            href="/profile/security"
            className="rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-slate-800"
          >
            إعدادات الأمان
          </Link>
        </div>
      </section>
    </main>
  );
}