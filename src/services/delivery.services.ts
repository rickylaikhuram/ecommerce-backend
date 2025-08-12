// services/deliveryService.ts
import prisma from "../config/prisma";

interface DeliveryAvailabilityResult {
  canDeliver: boolean;
  message: string;
  priceSetting?: any; // We can return the setting for use in pricing
}

export const checkDeliveryAvailability = async (
  shippingZipCode: string
): Promise<DeliveryAvailabilityResult> => {
  // Get active price settings
  const priceSetting = await prisma.priceSetting.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });

  if (!priceSetting) {
    return {
      canDeliver: false,
      message: "No delivery configuration found",
    };
  }

  // Check if delivery is available to this zip code
  const canDeliver =
    priceSetting.allowedZipCodes.length === 0 ||
    priceSetting.allowedZipCodes.includes(shippingZipCode);

  if (!canDeliver) {
    return {
      canDeliver: false,
      message: `Delivery not available to zip code: ${shippingZipCode}`,
    };
  }

  return {
    canDeliver: true,
    message: "Delivery available",
    priceSetting, // Return for pricing calculation
  };
};