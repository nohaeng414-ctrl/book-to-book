import { auth } from "@/auth";
import EditBookForm from "@/components/EditBookForm";
import { getBookImageDataUrl, BookImageError } from "@/lib/book-image";
import { prisma } from "@/lib/prisma";
import { BookCategory } from "@/generated/prisma-full";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";

const allowedCategories = ["NOVELS", "HISTORY", "SELF_DEVELOPMENT", "PHILOSOPHY", "SCIENCE", "RELIGION", "POETRY", "ARTS", "OTHER"];
const allowedConditions = ["LIKE_NEW", "GOOD", "ACCEPTABLE"];

export default async function EditBookPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const user = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
  if (!user) redirect("/login");
  const book = await prisma.book.findFirst({ where: { id, ownerId: user.id, isDeleted: false } });
  if (!book) notFound();

  async function saveBook(formData: FormData) {
    "use server";
    const currentSession = await auth();
    if (!currentSession?.user?.email) redirect("/login");
    const currentUser = await prisma.user.findUnique({ where: { email: currentSession.user.email }, select: { id: true } });
    if (!currentUser) redirect("/login");

    const title = String(formData.get("title") ?? "").trim();
    const author = String(formData.get("author") ?? "").trim();
    const category = String(formData.get("category") ?? "");
    const condition = String(formData.get("condition") ?? "");
    const points = Number(formData.get("points"));
    const description = String(formData.get("description") ?? "").trim();
    if (!title || !allowedCategories.includes(category) || !allowedConditions.includes(condition) || !Number.isInteger(points) || points < 1 || points > 3) {
      redirect(`/my-books/edit/${id}?error=${encodeURIComponent("تحقق من البيانات المدخلة وحاول مجدداً.")}`);
    }

    let coverUrl: string | undefined;
    try {
      coverUrl = await getBookImageDataUrl(formData.get("bookImage"));
    } catch (error) {
      const message = error instanceof BookImageError ? error.message : "تعذر حفظ صورة الكتاب.";
      redirect(`/my-books/edit/${id}?error=${encodeURIComponent(message)}`);
    }

    const result = await prisma.book.updateMany({
      where: { id, ownerId: currentUser.id, isAvailable: true, isDeleted: false },
      data: {
        title,
        author,
        category: category as BookCategory,
        condition,
        points,
        description: description || null,
        ...(coverUrl ? { coverUrl } : {}),
      },
    });
    if (result.count !== 1) {
      redirect(`/my-books/edit/${id}?error=${encodeURIComponent("لا يمكن تعديل الكتاب أثناء وجود طلب تبادل عليه.")}`);
    }

    revalidatePath("/my-books");
    revalidatePath(`/books/${id}`);
    revalidatePath("/");
    redirect(`/books/${id}`);
  }

  return (
    <main dir="rtl" className="mx-auto max-w-2xl space-y-5 px-4 py-8 text-[#0F172A]">
      <EditBookForm book={book} action={saveBook} error={query.error} />
    </main>
  );
}
