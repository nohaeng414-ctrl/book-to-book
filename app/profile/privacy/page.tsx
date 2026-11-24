import Link from "next/link";
import { auth } from "@/auth";
import {
  ArrowRight,
  User,
  MapPin,
  BookOpen,
  MessageSquare,
  Camera,
  Lock,
  UserCheck,
  ShieldAlert,
  Mail,
} from "lucide-react";

export const metadata = {
  title: "سياسة الخصوصية | كتاب بكتاب",
};

const DEVELOPER_NAME = "نهى حسن الزيبق";
const CONTACT_EMAIL = "nohazibaq@gmail.com";

const PRIVACY_SECTIONS = [
  {
    id: "account",
    title: "معلومات الحساب الأساسية وملفات الارتباط",
    icon: User,
    iconWrapClass: "bg-teal-50 text-teal-700 border-teal-200/70",
    description:
      'يحتفظ تطبيق "كتاب بكتاب" باسمك وبريدك الإلكتروني واهتماماتك القرائية التي تضيفها لتخصيص تجربتك وإدارة حسابك. يتم تشفير كلمات المرور بالكامل (Hashed) ولا تُخزَّن أو تُعرض كنص عادي إطلاقاً. كما نستخدم ملفات تعريف ارتباط تقنية (Cookies) ضرورية فقط لحفظ جلسة تسجيل الدخول وتفضيل اللغة.',
  },
  {
    id: "location",
    title: "بيانات الموقع الجغرافي",
    icon: MapPin,
    iconWrapClass: "bg-rose-50 text-rose-600 border-rose-200/70",
    description:
      "تظهر مدينتك والحي الذي تختاره يدوياً فقط في ملفك الشخصي وبجوار كتبك المعروضة لمساعدة القرّاء على معرفة النطاق الجغرافي للتبادل. لا يتتبع التطبيق موقعك الجغرافي (GPS) في الخلفية، وعند التنسيق داخل المحادثة تتحكم أنت بالكامل في تحديد نقطة تسليم عامة.",
  },
  {
    id: "media",
    title: "الصور والوسائط المرفوعة",
    icon: Camera,
    iconWrapClass: "bg-purple-50 text-purple-700 border-purple-200/70",
    description:
      "عند إضافتك لكتاب أو رفع صورة إثبات تسليم/استلام، يطلب التطبيق إذن الوصول إلى معرض الصور أو الكاميرا فقط لاختيار الصورة التي تريد رفعها. تُستخدم هذه الصور حصراً لعرض الكتب وتوثيق عمليات التبادل داخل المنصة.",
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
    title: "حماية البيانات ومزوّدو البنية التحتية",
    icon: Lock,
    iconWrapClass: "bg-slate-100 text-slate-700 border-slate-200",
    description:
      "نلتزم التزاماً تاماً بعدم بيع أو تأجير أو مشاركة بياناتك الشخصية مع أي جهات إعلانية أو تسويقية. يتم نقل البيانات عبر اتصال مشفّر (HTTPS) واستضافتها لدى مزوّدي خدمات سحابية موثوقين حصراً لتشغيل التطبيق وضمان أمانه واستقراره.",
  },
 {
    id: "rights",
    title: "الاحتفاظ بالبيانات وحذف الحساب",
    icon: UserCheck,
    iconWrapClass: "bg-emerald-50 text-emerald-700 border-emerald-200/70",
    description:
      "لك كامل الحق في تعديل بياناتك وحذف كتبك في أي وقت من إعدادات حسابك. كما يمكنك حذف حسابك من قسم (الأمان وإدارة الحساب) داخل التطبيق أو طلب حذفه نهائياً عبر البريد الإلكتروني الموضح أدناه، وذلك بشرط ألا توجد طلبات تبادل معلّقة حتى تُسوّى النقاط وتُحفظ حقوق الطرفين؛ وتتم إزالة البيانات خلال مدة أقصاها 30 يوماً مع استثناء السجلات اللازمة للنزاعات أو الالتزامات القانونية إن وُجدت.",
  },
  {
    id: "children",
    title: "خصوصية الأطفال",
    icon: ShieldAlert,
    iconWrapClass: "bg-orange-50 text-orange-700 border-orange-200/70",
    description:
      'تطبيق "كتاب بكتاب" غير موجّه للأطفال دون سن 13 عاماً، ولا نجمع عن علم أي بيانات شخصية من الأطفال. إذا علمت بوجود حساب لطفل دون هذا السن، يرجى التواصل معنا فوراً لحذف الحساب وبياناته.',
  },
  {
    id: "contact",
    title: "التواصل وتحديثات السياسة",
    icon: Mail,
    iconWrapClass: "bg-indigo-50 text-indigo-700 border-indigo-200/70",
    description: `يُدار تطبيق "كتاب بكتاب" بواسطة (${DEVELOPER_NAME}). قد نقوم بتحديث هذه السياسة من وقت لآخر، وسيتم نشر أي تعديل في هذه الصفحة مع تحديث التاريخ أدناها. لأي استفسار أو طلب يتعلق بالخصوصية أو حذف البيانات، يمكنك التواصل معنا مباشرة عبر البريد الإلكتروني: ${CONTACT_EMAIL}`,
  },
];

export default async function PrivacyPage() {
  const session = await auth();
  const isLoggedIn = Boolean(session?.user?.email);

  return (
    <main dir="rtl" className="mx-auto w-full max-w-3xl space-y-6 px-3 sm:px-4 py-6 text-[#0F172A]">
      <header className="relative -mt-6 mb-6 flex h-14 w-full items-center justify-between rounded-b-2xl border-x border-b border-slate-200 bg-white px-3 shadow-2xs">
        <Link
          href={isLoggedIn ? "/settings" : "/"}
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

      <div className="px-2 text-center">
        <p className="text-xs font-semibold text-slate-500">
          آخر تحديث: نوفمبر 2026
        </p>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4 sm:p-5 text-center space-y-2">
        {isLoggedIn ? (
          <>
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
          </>
        ) : (
          <>
            <p className="text-xs font-bold text-slate-700">
              لطلب حذف حسابك أو الاستفسار عن الخصوصية:
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <a
                href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("طلب حذف حساب - كتاب بكتاب")}`}
                className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-slate-800"
              >
                طلب حذف الحساب عبر البريد
              </a>
            </div>
          </>
        )}
      </section>
    </main>
  );
}