import { PrismaClient, BookCategory } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // إنشاء مستخدم تجريبي
  const user = await prisma.user.upsert({
    where: { email: 'noha@example.com' },
    update: {},
    create: {
      name: 'نهى الزيبق',
      email: 'noha@example.com',
      city: 'الرياض',
      bio: 'عاشقة للروايات والكتب الفلسفية والتاريخية.',
    },
  })

  // تنظيف الرفوف القديمة عشان ما يصير تكرار
  await prisma.book.deleteMany({
    where: { ownerId: user.id }
  })

  // إضافة الكتب بالتصنيفات البرمجية الصح (Enums)
  await prisma.book.createMany({
    data: [
      {
        title: 'دمشق لنا إلى يوم القيامة',
        author: 'نهى الزيبق',
        description: 'رواية تأخذك في رحلة عميقة بين عبق الحارات القديمة وحكايات الصمود والذكريات التي لا تموت.',
        category: 'NOVELS', // روايات
        condition: 'LIKE_NEW',
        ownerId: user.id,
      },
      {
        title: 'الإنسان يبحث عن المعنى',
        author: 'فيكتور فرانكل',
        description: 'كتاب نفسي وعميق يستكشف قوة الإرادة البشرية وإيجاد المعنى حتى في أقسى الظروف.',
        category: 'PHILOSOPHY', // فلسفة وعلم نفس
        condition: 'GOOD',
        ownerId: user.id,
      },
      {
        title: 'قواعد العشق الأربعون',
        author: 'إليف شافاق',
        description: 'رواية ساحرة تمتزج فيها روح الصوفية وحب جلال الدين الرومي وشمس التبريزي.',
        category: 'HISTORY', // تاريخ
        condition: 'LIKE_NEW',
        ownerId: user.id,
      },
      {
        title: 'فن اللامبالاة',
        author: 'مارك مانسون',
        description: 'دليلك المخالف للمألوف لعش حياة ممتازة وبسيطة بدون ضغوطات وهمية.',
        category: 'SELF_DEVELOPMENT', // تطوير ذات
        condition: 'ACCEPTABLE',
        ownerId: user.id,
      },
    ],
  })

  console.log('تم تعبئة الرفوف وتوزيع التصنيفات بنجاح! 📚✨')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })