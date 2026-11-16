interface UserAvatarProps {
  userId?: string | null;
  name?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

function getInitials(name: string | null | undefined) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "ق";
  return parts.length > 1
    ? `${Array.from(parts[0])[0]}${Array.from(parts[1])[0]}`
    : Array.from(parts[0]).slice(0, 2).join("");
}

export default function UserAvatar({
  name,
  size = "md",
  className = "",
}: UserAvatarProps) {
  const sizeClasses =
    size === "sm" ? "h-7 w-7 text-[10px]" : size === "lg" ? "h-20 w-20 text-2xl" : "h-9 w-9 text-xs";

  return (
    <div
      aria-label={name ? `الصورة الرمزية لـ ${name}` : "الصورة الرمزية للمستخدم"}
      role="img"
      className={`relative shrink-0 aspect-square overflow-hidden rounded-full border border-slate-200/90 bg-slate-100 flex items-center justify-center font-bold text-slate-600 shadow-xs ${sizeClasses} ${className}`}
    >
      {getInitials(name)}
    </div>
  );
}
