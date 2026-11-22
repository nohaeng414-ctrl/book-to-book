"use client";

interface UserAvatarProps {
  userId: string;
  name?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses: Record<"sm" | "md" | "lg", string> = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-20 w-20",
};

export default function UserAvatar({
  userId,
  name,
  size = "md",
  className = "",
}: UserAvatarProps) {
  const seed = encodeURIComponent(userId || name || "reader");

  // رابط توليد شخصية كرتونية فريدة وثابتة لكل مستخدم
  const avatarUrl = `https://api.dicebear.com/9.x/thumbs/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200/80 ${sizeClasses[size]} ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={avatarUrl}
        alt={name ? `صورة ${name}` : "صورة المستخدم"}
        loading="lazy"
        className="h-full w-full object-cover"
      />
    </div>
  );
}