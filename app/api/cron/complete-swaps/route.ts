import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SwapStatus } from "@/generated/prisma-full";
import { AUTO_CONFIRM_MS, autoCompleteExpiredSwap } from "@/lib/swaps";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - AUTO_CONFIRM_MS);

  const expiredSwaps = await prisma.swap.findMany({
    where: {
      status: SwapStatus.AWAITING_CONFIRMATION,
      updatedAt: { lte: cutoff },
    },
    select: { id: true },
    take: 50,
  });

  let completedCount = 0;

  for (const item of expiredSwaps) {
    const done = await autoCompleteExpiredSwap(item.id);
    if (done) completedCount++;
  }

  return NextResponse.json({
    checked: expiredSwaps.length,
    completed: completedCount,
  });
}