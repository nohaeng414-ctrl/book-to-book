import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const length = Number(request.headers.get("content-length") ?? 0);
    if (length > 2_000) return NextResponse.json({ error: "الطلب كبير جداً" }, { status: 413 });

    const payload: unknown = await request.json();
    if (!payload || typeof payload !== "object") {
      return NextResponse.json({ error: "بيانات تغيير كلمة المرور غير صالحة" }, { status: 400 });
    }

    const { token, password } = payload as { token?: unknown; password?: unknown };
    if (typeof token !== "string" || token.length < 32 || token.length > 128 || typeof password !== "string") {
      return NextResponse.json({ error: "الرابط أو كلمة المرور غير صالحة" }, { status: 400 });
    }
    if (password.length < 8 || Buffer.byteLength(password, "utf8") > 72) {
      return NextResponse.json({ error: "يجب أن تكون كلمة المرور 8 أحرف على الأقل وألا تتجاوز 72 بايت" }, { status: 400 });
    }

    const tokenHash = createHash("sha256").update(token).digest("hex");
    const hashedPassword = await bcrypt.hash(password, 12);
    const now = new Date();

    const changed = await prisma.$transaction(async (tx) => {
      const tokenRecord = await tx.passwordResetToken.findFirst({
        where: { tokenHash, expiresAt: { gt: now } },
        select: { userId: true },
      });
      if (!tokenRecord) return false;

      const consumed = await tx.passwordResetToken.deleteMany({
        where: { tokenHash, expiresAt: { gt: now } },
      });
      if (consumed.count !== 1) return false;

      await tx.user.update({
        where: { id: tokenRecord.userId },
        data: { hashedPassword },
      });
      return true;
    });

    if (!changed) {
      return NextResponse.json({ error: "انتهت صلاحية الرابط أو استُخدم مسبقاً. اطلب رابطاً جديداً." }, { status: 400 });
    }

    return NextResponse.json({ message: "تم تغيير كلمة المرور بنجاح. يمكنك تسجيل الدخول الآن." });
  } catch {
    return NextResponse.json({ error: "تعذر تغيير كلمة المرور حالياً. حاول لاحقاً." }, { status: 500 });
  }
}