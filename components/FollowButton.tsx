"use client";

import Link from "next/link";
import { useState } from "react";
import { UserPlus, UserMinus, Loader2 } from "lucide-react";
import { toggleFollow } from "@/app/actions/follow";
import { toArabicNumerals } from "@/lib/formatting";
import { useRouter } from "next/navigation";

interface FollowButtonProps {
  targetUserId: string;
  initialIsFollowing: boolean;
  initialFollowersCount?: number;
  followingCount?: number;
  isSelf?: boolean;
  currentUserId?: string | null; // 👈 أضفنا معرف المستخدم الحالي للتحقق من تسجيل الدخول
}

export default function FollowButton({
  targetUserId,
  initialIsFollowing,
  initialFollowersCount,
  followingCount,
  isSelf = false,
  currentUserId,
}: FollowButtonProps) {
  const router = useRouter();
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [followersCount, setFollowersCount] = useState(initialFollowersCount ?? 0);
  const [loading, setLoading] = useState(false);

  // هل نحن في وضع الهيدر (المدمج معه العدادات)؟
  const hasCounters = typeof initialFollowersCount === "number" && typeof followingCount === "number";

  const handleToggle = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    // 🔒 إذا لم يكن المستخدم مسجلاً دخوله، حوله إلى صفحة تسجيل الدخول فوراً
    if (!currentUserId) {
      router.push("/login");
      return;
    }

    if (loading) return;
    setLoading(true);

    const nextState = !isFollowing;
    setIsFollowing(nextState);
    if (hasCounters) {
      setFollowersCount((prev) => (nextState ? prev + 1 : Math.max(0, prev - 1)));
    }

    try {
      const res = await toggleFollow(targetUserId);

      if (!res || !res.success) {
        setIsFollowing(!nextState);
        if (hasCounters) {
          setFollowersCount((prev) => (!nextState ? prev + 1 : Math.max(0, prev - 1)));
        }
      }
    } catch {
      setIsFollowing(!nextState);
      if (hasCounters) {
        setFollowersCount((prev) => (!nextState ? prev + 1 : Math.max(0, prev - 1)));
      }
    } finally {
      setLoading(false);
    }
  };

  // 1️⃣ نمط القوائم (صفحة network/page.tsx): زر متابعة مدمج وخفيف
  if (!hasCounters) {
    if (isSelf) return null;

    return (
      <button
        type="button"
        onClick={handleToggle}
        disabled={loading}
        className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold transition active:scale-95 shadow-xs disabled:opacity-75 ${
          isFollowing
            ? "bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-600 border border-slate-200 hover:border-red-200"
            : "bg-teal-600 hover:bg-teal-700 text-white"
        }`}
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : isFollowing ? (
          <>
            <UserMinus className="h-3.5 w-3.5" />
            <span>إلغاء المتابعة</span>
          </>
        ) : (
          <>
            <UserPlus className="h-3.5 w-3.5" />
            <span>متابعة</span>
          </>
        )}
      </button>
    );
  }

  // 2️⃣ نمط الهيدر (صفحة البروفايل): العدادات مع الزر
  return (
    <div className="flex flex-col items-center">
      {/* 👥 سطر المتابعين */}
      <div className="mt-2.5 flex items-center gap-4 text-xs font-semibold text-slate-300">
        <Link
          href={`/users/${targetUserId}/network?tab=followers`}
          className="transition hover:text-white hover:underline cursor-pointer"
        >
          <strong className="text-white">{toArabicNumerals(followersCount)}</strong> متابِعون
        </Link>

        <span className="text-slate-500">·</span>

        <Link
          href={`/users/${targetUserId}/network?tab=following`}
          className="transition hover:text-white hover:underline cursor-pointer"
        >
          <strong className="text-white">{toArabicNumerals(followingCount!)}</strong> متابعة
        </Link>
      </div>

      {/* 👤 زر المتابعة داخل الهيدر */}
      {!isSelf && (
        <div className="mt-4">
          <button
            type="button"
            onClick={handleToggle}
            disabled={loading}
            className={`inline-flex items-center gap-1.5 rounded-full px-5 py-1.5 text-xs font-bold transition active:scale-95 shadow-sm disabled:opacity-75 ${
              isFollowing
                ? "bg-white/10 hover:bg-red-500/20 text-slate-200 hover:text-red-300 border border-white/20 hover:border-red-400/40"
                : "bg-white hover:bg-slate-100 text-slate-900"
            }`}
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : isFollowing ? (
              <>
                <UserMinus className="h-3.5 w-3.5 text-slate-300" />
                <span>إلغاء المتابعة</span>
              </>
            ) : (
              <>
                <UserPlus className="h-3.5 w-3.5 text-slate-700" />
                <span>متابعة</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}