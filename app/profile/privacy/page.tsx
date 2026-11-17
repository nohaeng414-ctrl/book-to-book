import Link from "next/link";
import { 
  ArrowRight, 
  ShieldCheck, 
  User, 
  MapPin, 
  BookOpen, 
  MessageSquare, 
  Lock, 
  UserCheck 
} from "lucide-react";

export default function PrivacyPage() {
  return (
    <main
      dir="rtl"
      className="mx-auto w-full max-w-2xl space-y-5 px-3 sm:px-4 pt-4 pb-28 text-[#0F172A]"
    >
      {/* 🧭 الهيدر المتناسق */}
      <div className="relative flex flex-col items-center justify-center rounded-3xl bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#334155] p-6 text-white shadow-md border border-slate-700/50">
        <Link
          href="/settings"
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-slate-200 transition-all hover:bg-white/20 hover:text-white backdrop-blur-md border border-white/10 active:scale-95"
        >
          <ArrowRight className="h-5 w-5" />
        </Link>
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-400/20 text-teal-400 mb-3 border border-teal-400/30">
          <ShieldCheck className="h-7 w-7" />
        </div>
        <h1 className="text-xl sm:text-2xl font-black">سياسة الخصوصية</h1>
        <p className="mt-1 text-xs text-slate-300">
          كيف نحمي بياناتك ونحافظ على خصوصيتك 
        </p>
      </div>

      {/* 📜 محتوى سياسة الخصوصية */}
      <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-7 shadow-2xs space-y-6">
        
        <div className="space-y-2">
          <h2 className="flex items-center gap-2 text-sm font-black text-slate-900">
            <User className="h-4 w-4 text-teal-600" />
            معلومات الحساب الأساسية
          </h2>
          <p className="text-xs leading-relaxed text-slate-600">
            يحتفظ تطبيق "كتاب بكتاب" باسمك وبريدك الإلكتروني والنبذة الشخصية التي تضيفها لتسهيل إدارة حسابك وتجربتك. كلمات المرور يتم تشفيرها بالكامل (Hashed) ولا تُعرض أو تُخزن كنص عادي إطلاقاً.
          </p>
        </div>

        <div className="space-y-2 border-t border-slate-100 pt-4">
          <h2 className="flex items-center gap-2 text-sm font-black text-slate-900">
            <MapPin className="h-4 w-4 text-rose-500" />
            بيانات الموقع الجغرافي
          </h2>
          <p className="text-xs leading-relaxed text-slate-600">
            تتم مشاركة مدينتك والحي الذي تقيم فيه فقط في ملفك الشخصي وبجوار كتبك المعروضة، وذلك لمساعدة القراء الآخرين على معرفة المسافة التقريبية وتنسيق عمليات التسليم والاستلام يدوياً.
          </p>
        </div>

        <div className="space-y-2 border-t border-slate-100 pt-4">
          <h2 className="flex items-center gap-2 text-sm font-black text-slate-900">
            <BookOpen className="h-4 w-4 text-blue-600" />
            الكتب، التبادلات، ونظام النقاط
          </h2>
          <p className="text-xs leading-relaxed text-slate-600">
            تُحفظ تفاصيل الكتب التي ترفعها، سجل النقاط المكتسبة والمخصومة، وحالات طلبات التبادل، وذلك لضمان شفافية العمليات وتسوية الحسابات تلقائياً عند إتمام التبادل أو إلغائه.
          </p>
        </div>

        <div className="space-y-2 border-t border-slate-100 pt-4">
          <h2 className="flex items-center gap-2 text-sm font-black text-slate-900">
            <MessageSquare className="h-4 w-4 text-amber-500" />
            المحادثات الخاصة
          </h2>
          <p className="text-xs leading-relaxed text-slate-600">
            الرسائل المتبادلة بينك وبين القراء الآخرين داخل غرف طلبات التبادل تُحفظ لضمان مرجعية الاتفاق بين الطرفين، ولا يطلع عليها سوى أطراف التبادل وإدارة المنصة في حال تم فتح "بلاغ أو نزاع" للفصل فيه.
          </p>
        </div>

        <div className="space-y-2 border-t border-slate-100 pt-4">
          <h2 className="flex items-center gap-2 text-sm font-black text-slate-900">
            <Lock className="h-4 w-4 text-slate-700" />
            حماية البيانات والمشاركة
          </h2>
          <p className="text-xs leading-relaxed text-slate-600">
            نحن نلتزم بعدم بيع أو تأجير بياناتك الشخصية لأي جهات خارجية. جميع العمليات محمية وموثقة، والصور المرفوعة لإثبات التسليم والاستلام تستخدم فقط للتحقق من سلامة العمليات.
          </p>
        </div>

        <div className="space-y-2 border-t border-slate-100 pt-4">
          <h2 className="flex items-center gap-2 text-sm font-black text-slate-900">
            <UserCheck className="h-4 w-4 text-teal-700" />
            حقوقك وصلاحياتك
          </h2>
          <p className="text-xs leading-relaxed text-slate-600">
            يحق لك في أي وقت تعديل بياناتك الشخصية، تحديث موقعك الجغرافي، حذف كتبك المعروضة، أو طلب حذف حسابك نهائياً من قاعدة البيانات عبر التواصل مع إدارة المنصة.
          </p>
        </div>

      </section>
    </main>
  );
}