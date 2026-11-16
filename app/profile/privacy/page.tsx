import ProfileSettingsPage from "@/components/ProfileSettingsPage";

export default function PrivacyPage() {
  return (
    <ProfileSettingsPage title="الخصوصية" >
      <div className="space-y-5 text-sm leading-7 text-[#475569]">
        <section>
          <h2 className="font-extrabold text-[#0F172A]">معلومات الحساب</h2>
          <p>يحتفظ التطبيق باسمك وبريدك الإلكتروني والنبذة التي تضيفها لإدارة حسابك. كلمة المرور لا تُعرض كنص عادي.</p>
        </section>
        <section>
          <h2 className="font-extrabold text-[#0F172A]">الموقع والكتب</h2>
          <p>تظهر المدينة واسم صاحب الكتاب في صفحة الكتاب لمساعدة القراء على تنسيق التبادل. وتظهر معلومات الكتاب وصورة غلافه للزوار عندما يكون معروضاً.</p>
        </section>
        <section>
          <h2 className="font-extrabold text-[#0F172A]">طلبات التبادل والنقاط</h2>
          <p>تُحفظ تفاصيل الطلبات وسجل النقاط لتشغيل المبادلات وعرض حالتها وإتمام التسوية بعد تأكيد الاستلام.</p>
        </section>
        
      </div>
    </ProfileSettingsPage>
  );
}
