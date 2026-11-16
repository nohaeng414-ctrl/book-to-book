-- AlterTable
ALTER TABLE "Swap" ADD COLUMN     "offeredBookIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
