import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import UserAvatar from "@/components/UserAvatar";
import BackButton from "@/components/BackButton";
import FollowButton from "@/components/FollowButton";
import { toArabicNumerals } from "@/lib/formatting";

export default async function UserNetworkPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab = "followers" } = await searchParams;
  const activeTab = tab === "following" ? "following" : "followers";

  const session = await auth();

  // جلب المستخدم الحالي وقائمة من يتابعهم للتأكد من حالة المتابعة لكل بطاقة
  const currentUser = session?.user?.email
    ? await prisma.user.findUnique({
        where: { email: session.user.email },
        select: {
          id: true,
          following: { select: { id: true } },
        },
      })
    : null;

  // جلب بيانات صاحب الصفحة مع قائمتي المتابعين ومن يتابعهم
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      _count: {
        select: {
          followedBy: true,
          following: true,
        },
      },
      followedBy: {
        select: {
          id: true,
          name: true,
          city: true,
          neighborhood: true,
          bio: true,
        },
      },
      following: {
        select: {
          id: true,
          name: true,
          city: true,
          neighborhood: true,
          bio: true,
        },
      },
    },
  });

  if (!user) notFound();

  // القائمة المعروضة بحسب التبويب النشط
  const list = activeTab === "followers" ? user.followedBy : user.following;
  const myFollowingIds = new Set(currentUser?.following?.map((f) => f.id) ?? []);

  return (
    <main dir="rtl" className="mx-auto w-full max-w-2xl space-y-4 px-3 sm:px-4 pt-4 pb-24 text-[#0F172A]">
      
      {/* 🧭 الهيدر العلوي */}
      <header className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-3">
          <BackButton />
          <div>
            <h1 className="text-base sm:text-lg font-black text-slate-900">{user.name}</h1>
            <p className="text-xs text-slate-500">شبكة القرّاء</p>
          </div>
        </div>
      </header>

      {/* 📑 تبويبات العرض (Tabs) بالتسميات العالمية */}
      <div className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1 text-center font-bold text-xs">
        <Link
          href={`/users/${user.id}/network?tab=followers`}
          className={`rounded-xl py-2 transition ${
            activeTab === "followers"
              ? "bg-white text-slate-900 shadow-2xs font-black"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          المتابِعون ({toArabicNumerals(user._count.followedBy)})
        </Link>

        <Link
          href={`/users/${user.id}/network?tab=following`}
          className={`rounded-xl py-2 transition ${
            activeTab === "following"
              ? "bg-white text-slate-900 shadow-2xs font-black"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
           المتابعة ({toArabicNumerals(user._count.following)})
        </Link>
      </div>

      {/* 👥 قائمة المستخدمين */}
      <section className="space-y-2.5 pt-1">
        {list.length > 0 ? (
          list.map((item) => {
            const isMe = currentUser?.id === item.id;
            const isFollowingThisUser = myFollowingIds.has(item.id);

            return (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs transition hover:border-slate-300"
              >
                <Link href={`/users/${item.id}`} className="flex items-center gap-3 min-w-0">
                  <UserAvatar userId={item.id} name={item.name} size="md" />
                  <div className="truncate text-right">
                    <h2 className="truncate text-xs sm:text-sm font-black text-slate-900 hover:text-teal-700">
                      {item.name}
                    </h2>
                    {(item.neighborhood || item.city) && (
                      <p className="text-[11px] text-slate-400 truncate">
                        {[item.neighborhood, item.city].filter(Boolean).join("، ")}
                      </p>
                    )}
                  </div>
                </Link>

                {/* زر المتابعة الفردي التفاعلي */}
              {!isMe && currentUser && (
  <div className="shrink-0">
    <FollowButton
      targetUserId={item.id}
      initialIsFollowing={isFollowingThisUser}
      currentUserId={currentUser.id}
    />
  </div>
)}
              </div>
            );
          })
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-xs text-slate-400 font-medium">
            {activeTab === "followers"
              ? "لا يوجد متابعون لهذا القارئ بعد."
              : "لم يقم هذا القارئ بمتابعة أحد بعد."}
          </div>
        )}
      </section>

    </main>
  );
}
