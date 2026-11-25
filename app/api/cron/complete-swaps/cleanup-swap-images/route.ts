import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // عدّلي المسار حسب مكان تعريف prisma عندك

export const runtime = "nodejs";

export async function GET() {
  const now = new Date();
  const deleted = await prisma.tempSwapImage.deleteMany({
    where: { expiresAt: { lte: now } },
  });

  return NextResponse.json({ deletedCount: deleted.count });
}