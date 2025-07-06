/*
  Warnings:

  - You are about to drop the column `stockname` on the `ProductStock` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[productId,stockName]` on the table `ProductStock` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `stockName` to the `ProductStock` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "ProductStock_productId_stockname_key";

-- AlterTable
ALTER TABLE "ProductStock" DROP COLUMN "stockname",
ADD COLUMN     "stockName" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "ProductStock_productId_stockName_key" ON "ProductStock"("productId", "stockName");
