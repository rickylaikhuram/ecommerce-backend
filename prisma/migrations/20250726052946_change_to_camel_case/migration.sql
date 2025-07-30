/*
  Warnings:

  - You are about to drop the column `stockname` on the `CartItem` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId,productId,stockName]` on the table `CartItem` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `stockName` to the `CartItem` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "CartItem_userId_productId_stockname_key";

-- AlterTable
ALTER TABLE "CartItem" DROP COLUMN "stockname",
ADD COLUMN     "stockName" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "CartItem_userId_productId_stockName_key" ON "CartItem"("userId", "productId", "stockName");
