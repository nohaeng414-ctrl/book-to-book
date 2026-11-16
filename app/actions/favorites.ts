"use server";

import { auth } from "@/auth";
import { Prisma } from "@/generated/prisma-full";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function toggleFavorite(bookId: string) {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const user = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
  if (!user) redirect("/login");

  await prisma.$transaction(async (tx) => {
    const book = await tx.book.findFirst({
      where: { id: bookId, isDeleted: false },
      select: { id: true, favoritedBy: { where: { id: user.id }, select: { id: true } } },
    });
    if (!book) return;

    await tx.book.update({
      where: { id: book.id },
      data: { favoritedBy: book.favoritedBy.length > 0 ? { disconnect: { id: user.id } } : { connect: { id: user.id } } },
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  revalidatePath("/favorites");
  revalidatePath(`/books/${bookId}`);
  revalidatePath("/profile");
}
