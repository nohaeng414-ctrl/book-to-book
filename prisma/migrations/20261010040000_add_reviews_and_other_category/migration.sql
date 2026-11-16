ALTER TYPE "BookCategory" ADD VALUE IF NOT EXISTS 'OTHER';

CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "swapId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Review_swapId_reviewerId_key" ON "Review"("swapId", "reviewerId");
CREATE INDEX "Review_recipientId_createdAt_idx" ON "Review"("recipientId", "createdAt");

ALTER TABLE "Review" ADD CONSTRAINT "Review_swapId_fkey"
    FOREIGN KEY ("swapId") REFERENCES "Swap"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Review" ADD CONSTRAINT "Review_reviewerId_fkey"
    FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Review" ADD CONSTRAINT "Review_recipientId_fkey"
    FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
