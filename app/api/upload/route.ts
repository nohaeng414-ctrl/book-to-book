import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import crypto from "crypto";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const token = process.env.SWAP_BLOB_READ_WRITE_TOKEN;

    if (!token) {
      return NextResponse.json(
        {
          error:
            process.env.NODE_ENV !== "production"
              ? "متغير SWAP_BLOB_READ_WRITE_TOKEN غير موجود في البيئة الحالية. أضفه ثم أعد تشغيل السيرفر أو اعمل Redeploy."
              : "تعذر رفع صورة الكتاب إلى التخزين السحابي.",
        },
        { status: 500 }
      );
    }

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

    const maxBytes = 2 * 1024 * 1024;
    if (blobFile.size > maxBytes) {
      return NextResponse.json(
        { error: "حجم الصورة بعد الضغط أكبر من المسموح." },
        { status: 400 }
      );
    }

    const ext = blobFile.type === "image/webp" ? "webp" : "jpg";
    const blobPath = `swaps/${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const buffer = Buffer.from(await blobFile.arrayBuffer());

    const blob = await put(blobPath, buffer, {
      access: "private",
      contentType: blobFile.type || "image/jpeg",
      token,
    });

    return NextResponse.json({
      url: blob.url,
      pathname: blob.pathname,
    });
  } catch (err) {
    console.error("Swap image upload error:", err);
    const details = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV !== "production"
            ? `تعذر رفع الصورة: ${details}`
            : "تعذر رفع صورة الكتاب إلى التخزين السحابي.",
      },
      { status: 500 }
    );
  }
}