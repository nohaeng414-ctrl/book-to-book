import { createHash } from "node:crypto";
import { Prisma } from "@/generated/prisma-full";
import { prisma } from "@/lib/prisma";

export function getClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "unknown";
}

export async function consumeRateLimit(
  scope: string,
  identity: string,
  maxAttempts: number,
  windowMs: number,
) {
  const key = createHash("sha256").update(`${scope}:${identity.toLowerCase()}`).digest("hex");
  const windowSeconds = Math.ceil(windowMs / 1000);
  const buckets = await prisma.$queryRaw<Array<{ count: number; resetAt: Date }>>(Prisma.sql`
    INSERT INTO "RateLimitBucket" ("key", "count", "resetAt", "updatedAt")
    VALUES (${key}, 1, NOW() + (${windowSeconds} * INTERVAL '1 second'), NOW())
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimitBucket"."resetAt" <= NOW() THEN 1 ELSE "RateLimitBucket"."count" + 1 END,
      "resetAt" = CASE WHEN "RateLimitBucket"."resetAt" <= NOW()
        THEN NOW() + (${windowSeconds} * INTERVAL '1 second')
        ELSE "RateLimitBucket"."resetAt" END,
      "updatedAt" = NOW()
    RETURNING "count", "resetAt"
  `);

  if (Math.random() < 0.01) {
    await prisma.rateLimitBucket.deleteMany({ where: { resetAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } } });
  }

  const bucket = buckets[0];
  return {
    allowed: bucket.count <= maxAttempts,
    retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt.getTime() - Date.now()) / 1000)),
  };
}
