import { prisma } from "@/lib/prisma";

function escapeXml(value: string) {
  return value.replace(/[<>&"']/g, (character) => {
    const entities: Record<string, string> = {
      "<": "&lt;",
      ">": "&gt;",
      "&": "&amp;",
      '"': "&quot;",
      "'": "&apos;",
    };
    return entities[character];
  });
}

function placeholderCover(title: string) {
  const words = title.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    if (line && `${line} ${word}`.length > 14) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) lines.push(line);

  const visibleLines = lines.slice(0, 4);
  const startY = 170 - (visibleLines.length - 1) * 14;
const text = visibleLines
    .map(
      (part, index) =>
        `<text x="125" y="${startY + index * 28}" text-anchor="middle">${escapeXml(part)}</text>`,
    )
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="360" viewBox="0 0 240 360">
    <defs>
      <!-- تدرج بترولي حيوي وعميق -->
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#195568"/>
        <stop offset="50%" stop-color="#144252"/>
        <stop offset="100%" stop-color="#0a242d"/>
      </linearGradient>
      <!-- توهج علوي مشرق -->
      <radialGradient id="glow" cx="20%" cy="15%" r="65%">
        <stop offset="0%" stop-color="#5A9BAE" stop-opacity="0.45"/>
        <stop offset="100%" stop-color="#5A9BAE" stop-opacity="0"/>
      </radialGradient>
    </defs>

    <!-- الخلفية والتوهج -->
    <rect width="240" height="360" fill="url(#bg)"/>
    <rect width="240" height="360" fill="url(#glow)"/>

    <!-- كعب الكتاب (Spine) على الجهة اليمنى -->
    <rect x="222" y="0" width="18" height="360" fill="#000000" fill-opacity="0.32"/>
    <line x1="222" y1="0" x2="222" y2="360" stroke="#ffffff" stroke-opacity="0.2" stroke-width="1.5"/>

    <!-- أيقونة كتاب لطيفة بالأعلى -->
    <g transform="translate(112, 45)" stroke="#9fe0ef" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path d="M2 3h5a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H2z"></path>
      <path d="M18 3h-5a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h6z"></path>
    </g>

    <!-- عنوان الكتاب بحجم كبير وعريض (20px) ومقروء جداً -->
    <g fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="900" direction="rtl">
      ${text}
    </g>

    <!-- شارة أسفل الغلاف -->
    <rect x="75" y="315" width="90" height="22" rx="11" fill="#000000" fill-opacity="0.25"/>
    <text x="120" y="330" text-anchor="middle" fill="#88d8ea" font-family="system-ui, sans-serif" font-size="10" font-weight="700">كتاب بكتاب</text>
  </svg>`;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const book = await prisma.book.findUnique({
    where: { id },
    select: {
      title: true,
      coverUrl: true,
      ownerId: true,
      isAvailable: true,
      isDeleted: true,
      updatedAt: true,
    },
  });

  // إذا الكتاب غير موجود نهائياً
  if (!book || book.isDeleted) {
    return new Response(placeholderCover("كتاب غير متوفر"), {
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }

  // إذا لا يوجد غلاف مرفوع، أرجع الـ SVG فوراً
  if (!book.coverUrl) {
    return new Response(placeholderCover(book.title), {
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }

  // فحص Base64 للصورة المرفوعة
  const match = /^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/]+={0,2})$/.exec(
    book.coverUrl,
  );

  // إذا كانت صيغة الـ Base64 تالفة، نرجع الـ SVG كبديل آمن بدل 404 الفارغ
  if (!match) {
    return new Response(placeholderCover(book.title), {
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "public, max-age=60",
      },
    });
  }

  const image = Buffer.from(match[2], "base64");
  if (image.length > 5 * 1024 * 1024) {
    return new Response(placeholderCover(book.title), {
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "public, max-age=60",
      },
    });
  }

  return new Response(new Uint8Array(image), {
    headers: {
      "Content-Type": match[1],
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
