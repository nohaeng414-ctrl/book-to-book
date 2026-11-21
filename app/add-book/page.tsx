import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import AddBookForm from "@/components/AddBookForm";
import { BookImageError, getBookImageDataUrl } from "@/lib/book-image";
import { BookCategory, SwapStatus } from "@/generated/prisma-full";

const allowedConditions = ["LIKE_NEW", "GOOD", "ACCEPTABLE"];

export default async function AddBookPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  const params = await searchParams;

  if (!session?.user) {
    redirect("/login");
  }

  // Server Action لحفظ البيانات وتنبيه المتابعين ومنح نقطة أول كتاب
  async function handleAddBook(formData: FormData) {
    "use server";

    const title = String(formData.get("title") ?? "").trim();
    const author = String(formData.get("author") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const categoryValue = String(formData.get("category") ?? "");
    const condition = String(formData.get("condition") ?? "");
    const points = Number(formData.get("points") || 1);

    if (
      !title ||
      description.length > 2000 ||
      !Object.values(BookCategory).includes(categoryValue as BookCategory) ||
      !allowedConditions.includes(condition) ||
      !Number.isInteger(points) ||
      points < 1 ||
      points > 3
    ) {
      redirect(
        `/add-book?error=${encodeURIComponent(
          "أكمل بيانات الكتاب وتأكد أن النقاط بين 1 و3."
        )}`
      );
    }

    let coverUrl: string;
    try {
      const image = await getBookImageDataUrl(formData.get("bookImage"));
      if (!image) throw new BookImageError("أضف صورة للكتاب قبل الحفظ.");
      coverUrl = image;
    } catch (error) {
      const message =
        error instanceof BookImageError
          ? error.message
          : "تعذر حفظ صورة الكتاب.";
      redirect(`/add-book?error=${encodeURIComponent(message)}`);
    }

    const sessionUser = await auth();
    if (!sessionUser?.user?.email) redirect("/login");

    // جلب معرف واسم المستخدم الحالي مع معرّفات جميع متابعيه
    const user = await prisma.user.findUnique({
      where: { email: sessionUser.user.email },
      select: {
        id: true,
        name: true,
        isBanned: true,
        followedBy: {
          select: { id: true },
        },
      },
    });

    if (!user) redirect("/login");
    if (user.isBanned) redirect("/banned");

    try {
      // تنفيذ الإضافة وفحص مكافأة أول كتاب داخل Transaction بمهلة آمنة
      const newBook = await prisma.$transaction(
        async (tx) => {
          // فحص عدد الكتب الحالية والتبادلات المكتملة قبل الإضافة
          const [existingBooksCount, completedSwapsCount] = await Promise.all([
            tx.book.count({
              where: { ownerId: user.id, isDeleted: false },
            }),
            tx.swap.count({
              where: {
                status: SwapStatus.COMPLETED,
                OR: [{ requesterId: user.id }, { receiverId: user.id }],
              },
            }),
          ]);

          // 1. إنشاء الكتاب وحفظه في قاعدة البيانات
          const createdBook = await tx.book.create({
            data: {
              title,
              author,
              description: description || null,
              category: categoryValue as BookCategory,
              condition,
              points,
              coverUrl,
              isAvailable: true,
              ownerId: user.id,
            },
          });

          // 🎁 إذا كان هذا أول كتاب في مكتبته ولم يقم بأي تبادل مكتمل سابقاً، يحصل على نقطة ترحيبية
          if (existingBooksCount === 0 && completedSwapsCount === 0) {
            await tx.user.update({
              where: { id: user.id },
              data: { points: { increment: 1 } },
            });
          }

          return createdBook;
        },
        {
          maxWait: 10000,
          timeout: 15000,
        }
      );

      // 2. إرسال إشعار فوري لجميع المتابعين في حال وجودهم
      if (user.followedBy.length > 0) {
        await prisma.notification.createMany({
          data: user.followedBy.map((follower: { id: string }) => ({
            userId: follower.id,
            actorId: user.id,
            type: "NEW_BOOK_FROM_FOLLOWED",
            title: "كتاب جديد من قارئ تتابعه",
            body: `أضاف ${user.name || "قارئ تتابعه"} كتاباً جديداً: «${newBook.title}»`,
            link: `/books/${newBook.id}`,
            isRead: false,
          })),
        });
      }
    } catch (error) {
      console.error("Error adding book or notifying followers:", error);
      throw error;
    }

    revalidatePath("/my-books");
    revalidatePath("/profile");
    revalidatePath("/profile/notifications");
    revalidatePath("/");
    redirect("/my-books");
  }

  return (
    <div className="w-full min-w-full pb-20 px-3 sm:px-4 pt-4">
      {/* 📝 نموذج إضافة الكتاب */}
      <AddBookForm action={handleAddBook} error={params.error} />
    </div>
  );
}
