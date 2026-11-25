import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; 
export const runtime = "nodejs";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const now = new Date();

  const image = await prisma.tempSwapImage.findUnique({
    where: { id },
  });

  if (!image) {
    return NextResponse.json({ error: "الصورة غير موجودة." }, { status: 404 });
  }

  if (image.expiresAt <= now) {
    await prisma.tempSwapImage.delete({ where: { id } }).catch(() => {});
    return NextResponse.json({ error: "انتهت صلاحية الصورة." }, { status: 404 });
  }

  return new NextResponse(Buffer.from(image.data), {
    status: 200,
    headers: {
      "Content-Type": image.mimeType,
      "Cache-Control": "no-store",
    },
  });
}