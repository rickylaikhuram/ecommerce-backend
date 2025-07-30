/*
  Warnings:

  - You are about to drop the column `billingCity` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `billingCountry` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `billingFullName` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `billingLine1` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `billingLine2` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `billingPhone` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `billingSameAsShipping` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `billingState` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `billingZipCode` on the `Order` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Address" ADD COLUMN     "alternatePhone" TEXT,
ADD COLUMN     "landmark" TEXT;

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "billingCity",
DROP COLUMN "billingCountry",
DROP COLUMN "billingFullName",
DROP COLUMN "billingLine1",
DROP COLUMN "billingLine2",
DROP COLUMN "billingPhone",
DROP COLUMN "billingSameAsShipping",
DROP COLUMN "billingState",
DROP COLUMN "billingZipCode";
