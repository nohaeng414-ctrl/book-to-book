export default function BookCover({
  bookId,
  title,
  updatedAt,
  className,
}: {
  bookId: string;
  title: string;
  updatedAt: Date;
  className?: string;
}) {
  const imageUrl = `/api/books/${encodeURIComponent(bookId)}/cover?v=${updatedAt.getTime()}`;

  return (
    <div className={`relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#334155] to-[#0F172A] p-2 text-center font-extrabold leading-5 text-white shadow-inner ${className ?? ""}`}>
      <Image
  src={imageUrl}
  alt={`غلاف ${title}`}
  fill
  unoptimized // 👈 تمنع معالجة السيرفر المؤلمة وتلغي خطأ internal image response
  sizes="(max-width: 640px) 45vw, 150px"
  loading="lazy"
  className="absolute inset-0 h-full w-full object-cover z-20"
  
/>
    </div>
  );
}
import Image from "next/image";

