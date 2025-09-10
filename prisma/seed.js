import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Check if PriceSetting already exists
  const existingSetting = await prisma.priceSetting.findFirst();

  if (!existingSetting) {
    await prisma.priceSetting.create({
      data: {
        takeDeliveryFee: true,
        checkThreshold: true,
        deliveryFee: 50.0,
        freeDeliveryThreshold: 500.0,
        allowedZipCodes: [],
        isActive: true,
      },
    });
    console.log("Initial PriceSetting created successfully");
  } else {
    console.log("PriceSetting already exists, skipping creation");
  }
}

main()
  .catch((e) => {
    console.error("❌ Error creating initial PriceSetting:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
