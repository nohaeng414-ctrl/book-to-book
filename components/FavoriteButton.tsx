"use client";

import { Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export default function FavoriteButton({
  bookId,
  isFavorite: initialFavorite,
  isLoggedIn,
}: {
  bookId: string;
  isFavorite: boolean;
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const [fav, setFav] = useState(initialFavorite);
  const [isPending, startTransition] = useTransition();

  const toggleFavorite = () => {
    if (!isLoggedIn) {
      router.push("/login");
      return;
    }
    const nextState = !fav;
    setFav(nextState);

    startTransition(async () => {
      try {
        const response = await fetch(`/api/books/${bookId}/favorite`, {
          method: "POST",
        });
        if (!response.ok) setFav(!nextState);
      } catch {
        setFav(!nextState);
      }
    });
  };

  return (
    <button
      type="button"
      onClick={toggleFavorite}
      disabled={isPending}
      aria-label="إضافة للمفضلة"
      className="p-1 text-slate-500 transition hover:text-slate-800 active:scale-90"
    >
      <Heart
        className={`h-5 w-5 transition-colors duration-200 ${
          fav
            ? "fill-red-500 text-red-500"
            : "text-slate-500 hover:text-slate-800 stroke-[2]"
        }`}
      />
    </button>
  );
}
