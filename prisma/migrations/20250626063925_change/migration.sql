/*
  Warnings:

  - You are about to drop the column `stock` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `tags` on the `Product` table. All the data in the column will be lost.
  - Added the required column `fakePrice` to the `Product` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Product" DROP COLUMN "stock",
DROP COLUMN "tags",
ADD COLUMN     "fakePrice" DECIMAL(65,30) NOT NULL;
