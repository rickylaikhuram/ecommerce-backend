/*
  Warnings:

  - You are about to drop the column `fakePrice` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `Product` table. All the data in the column will be lost.
  - Added the required column `discountedPrice` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `originalPrice` to the `Product` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Product" DROP COLUMN "fakePrice",
DROP COLUMN "price",
ADD COLUMN     "discountedPrice" DECIMAL(65,30) NOT NULL,
ADD COLUMN     "originalPrice" DECIMAL(65,30) NOT NULL;
