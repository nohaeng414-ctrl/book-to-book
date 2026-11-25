import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // عدّلي المسار حسب مكان تعريف prisma عندك

export const runtime = "nodejs";

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_DAYS = 3;
const MAX_RETENTION_DAYS = 15;
const MAX_BYTES = 2 * 1024 * 1024;

function resolveRetentionDays(rawDays: FormDataEntryValue | null, url: URL): number {
  const fromForm = typeof rawDays === "string" ? Number(rawDays) : NaN;
  const fromQuery = Number(url.searchParams.get("days"));
  const candidate = Number.isFinite(fromForm) && fromForm > 0 ? fromForm : fromQuery;

  if (!Number.isFinite(candidate) || candidate <= 0) {
    return DEFAULT_DAYS;
  }

  return Math.min(Math.round(candidate), MAX_RETENTION_DAYS);
}

export async function POST(req: Request) {
  try {
    const now = new Date();
    await prisma.tempSwapImage.deleteMany({
      where: { expiresAt: { lte: now } },
    });

    const formData = await req.formData();
    const file = formData.get("file");

    const isBlobLike =
      typeof file === "object" &&
      file !== null &&
      "arrayBuffer" in file &&
      typeof (file as Blob).arrayBuffer === "function";

    if (!isBlobLike) {
      return NextResponse.json(
        { error: "لم يتم استلام ملف الصورة." },
        { status: 400 }
      );
    }

    const blobFile = file as Blob;

    if (!blobFile.type || !blobFile.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "نوع الملف غير مدعوم، يرجى رفع صورة." },
        { status: 400 }
      );
    }

    if (blobFile.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "حجم الصورة بعد الضغط أكبر من المسموح." },
        { status: 400 }
      );
    }

    const retentionDays = resolveRetentionDays(
      formData.get("days"),
      new URL(req.url)
    );
    const buffer = Buffer.from(await blobFile.arrayBuffer());
    const expiresAt = new Date(Date.now() + retentionDays * DAY_MS);

    const record = await prisma.tempSwapImage.create({
      data: {
        mimeType: blobFile.type || "image/jpeg",
        data: buffer,
        expiresAt,
      },
      select: { id: true, expiresAt: true },
    });

    return NextResponse.json({
      url: `/api/swap-image/${record.id}`,
      expiresAt: record.expiresAt,
    });
  } catch (err) {
    console.error("Swap image DB upload error:", err);
    return NextResponse.json(
      { error: "تعذر رفع صورة الكتاب إلى الخادم." },
      { status: 500 }
    );
  }
}