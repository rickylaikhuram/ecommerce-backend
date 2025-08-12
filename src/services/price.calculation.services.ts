import prisma from "../config/prisma";

interface DeliveryCalculationResult {
  canDeliver: boolean;
  deliveryFee: number;
  freeDeliveryApplied: boolean;
  finalTotal: number;
  message: string;
}

export const calculateOrderPricing = async (
  subtotal: number,
  shippingZipCode: string
): Promise<DeliveryCalculationResult> => {
  // Get active price settings
  const priceSetting = await prisma.priceSetting.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });

  if (!priceSetting) {
    return {
      canDeliver: false,
      deliveryFee: 0,
      freeDeliveryApplied: false,
      finalTotal: subtotal,
      message: "No pricing configuration found",
    };
  }

  // Check if delivery is available to this zip code
  const canDeliver =
    priceSetting.allowedZipCodes.length === 0 ||
    priceSetting.allowedZipCodes.includes(shippingZipCode);

  if (!canDeliver) {
    return {
      canDeliver: false,
      deliveryFee: 0,
      freeDeliveryApplied: false,
      finalTotal: subtotal,
      message: `Delivery not available to zip code: ${shippingZipCode}`,
    };
  }

  let deliveryFee = 0;
  let freeDeliveryApplied = false;

  // Calculate delivery fee based on settings
  if (priceSetting.takeDeliveryFee) {
    if (priceSetting.checkThreshold) {
      // Check if order qualifies for free delivery
      if (subtotal >= priceSetting.freeDeliveryThreshold.toNumber()) {
        deliveryFee = 0;
        freeDeliveryApplied = true;
      } else {
        deliveryFee = priceSetting.deliveryFee.toNumber();
      }
    } else {
      // Always apply delivery fee (no threshold check)
      deliveryFee = priceSetting.deliveryFee.toNumber();
    }
  }
  // If takeDeliveryFee is false, deliveryFee remains 0

  return {
    canDeliver: true,
    deliveryFee,
    freeDeliveryApplied,
    finalTotal: subtotal + deliveryFee,
    message: freeDeliveryApplied
      ? `Free delivery applied (order above $${priceSetting.freeDeliveryThreshold})`
      : deliveryFee > 0
      ? `Delivery fee: $${deliveryFee}`
      : "No delivery fee",
  };
};
