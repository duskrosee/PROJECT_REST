/*
  Warnings:

  - A unique constraint covering the columns `[checkoutToken]` on the table `Transaction` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN "checkoutToken" TEXT;
ALTER TABLE "Transaction" ADD COLUMN "couponCode" TEXT;
ALTER TABLE "Transaction" ADD COLUMN "discountApplied" REAL DEFAULT 0;
ALTER TABLE "Transaction" ADD COLUMN "originalPrice" REAL;

-- CreateTable
CREATE TABLE "Coupon" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "discountPercent" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiryDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Coupon_code_key" ON "Coupon"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_checkoutToken_key" ON "Transaction"("checkoutToken");
