-- CreateEnum
CREATE TYPE "SwapType" AS ENUM ('DIRECT', 'POINTS');

-- CreateEnum
CREATE TYPE "PointTransactionType" AS ENUM ('EARNED', 'SPENT', 'RESERVED', 'RELEASED', 'REFUNDED', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "BookCategory" AS ENUM ('NOVELS', 'HISTORY', 'SELF_DEVELOPMENT', 'PHILOSOPHY', 'SCIENCE', 'RELIGION', 'POETRY', 'ARTS');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SwapStatus" ADD VALUE 'AWAITING_DELIVERY';
ALTER TYPE "SwapStatus" ADD VALUE 'AWAITING_CONFIRMATION';
ALTER TYPE "SwapStatus" ADD VALUE 'CANCELLED';
ALTER TYPE "SwapStatus" ADD VALUE 'DISPUTED';

-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_senderId_fkey";

-- DropForeignKey
ALTER TABLE "Swap" DROP CONSTRAINT "Swap_offeredBookId_fkey";

-- AlterTable
ALTER TABLE "Book" ADD COLUMN     "category" "BookCategory" NOT NULL DEFAULT 'NOVELS',
ADD COLUMN     "points" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "Swap" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "deliveryConfirmed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pointsCost" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "receiptConfirmed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "type" "SwapType" NOT NULL DEFAULT 'DIRECT';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "points" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "reservedPoints" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "PointTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "type" "PointTransactionType" NOT NULL,
    "swapId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PointTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_UserFavorites" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "PointTransaction_idempotencyKey_key" ON "PointTransaction"("idempotencyKey");

-- CreateIndex
CREATE INDEX "PointTransaction_userId_createdAt_idx" ON "PointTransaction"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "PointTransaction_swapId_idx" ON "PointTransaction"("swapId");

-- CreateIndex
CREATE UNIQUE INDEX "_UserFavorites_AB_unique" ON "_UserFavorites"("A", "B");

-- CreateIndex
CREATE INDEX "_UserFavorites_B_index" ON "_UserFavorites"("B");

-- CreateIndex
CREATE INDEX "Book_ownerId_idx" ON "Book"("ownerId");

-- CreateIndex
CREATE INDEX "Book_category_idx" ON "Book"("category");

-- CreateIndex
CREATE INDEX "Book_isAvailable_idx" ON "Book"("isAvailable");

-- CreateIndex
CREATE INDEX "Message_swapId_createdAt_idx" ON "Message"("swapId", "createdAt");

-- CreateIndex
CREATE INDEX "Message_senderId_idx" ON "Message"("senderId");

-- CreateIndex
CREATE INDEX "Swap_requesterId_status_idx" ON "Swap"("requesterId", "status");

-- CreateIndex
CREATE INDEX "Swap_receiverId_status_idx" ON "Swap"("receiverId", "status");

-- CreateIndex
CREATE INDEX "Swap_requestedBookId_status_idx" ON "Swap"("requestedBookId", "status");

-- CreateIndex
CREATE INDEX "Swap_offeredBookId_idx" ON "Swap"("offeredBookId");

-- CreateIndex
CREATE INDEX "Swap_type_status_idx" ON "Swap"("type", "status");

-- AddForeignKey
ALTER TABLE "Swap" ADD CONSTRAINT "Swap_offeredBookId_fkey" FOREIGN KEY ("offeredBookId") REFERENCES "Book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointTransaction" ADD CONSTRAINT "PointTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointTransaction" ADD CONSTRAINT "PointTransaction_swapId_fkey" FOREIGN KEY ("swapId") REFERENCES "Swap"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserFavorites" ADD CONSTRAINT "_UserFavorites_A_fkey" FOREIGN KEY ("A") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserFavorites" ADD CONSTRAINT "_UserFavorites_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
