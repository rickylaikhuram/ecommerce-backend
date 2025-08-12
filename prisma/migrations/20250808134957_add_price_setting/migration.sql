-- CreateTable
CREATE TABLE "PriceSetting" (
    "id" TEXT NOT NULL,
    "takeDeliveryFee" BOOLEAN NOT NULL DEFAULT true,
    "checkThreshold" BOOLEAN NOT NULL DEFAULT true,
    "deliveryFee" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "freeDeliveryThreshold" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "allowedZipCodes" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PriceSetting_pkey" PRIMARY KEY ("id")
);
