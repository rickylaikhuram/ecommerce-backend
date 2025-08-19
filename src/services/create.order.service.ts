import prisma from "../config/prisma";
import { ApiError } from "../utils/api.error";
import { redisApp } from "../config/redis";
import { CreateOrderRequest } from "../types/checkout.types";
import { AuthRequest } from "../types/customTypes";
import { validateCartItems } from "./cart.validate.services";
import { calculateOrderPricing } from "./price.calculation.services";

export async function createOrderAndReserveStock(req: AuthRequest) {
  const uid = req.user!.uid;
  const name = req.userData!.name;
  const email = req.userData!.email;
  const phone = req.userData!.phone;

  const { productDatas, address }: CreateOrderRequest = req.body;

  // 1. Validate cart
  const validationResult = await validateCartItems(uid, productDatas);
  if (!validationResult.canProceed) {
    throw new ApiError(400, "CART_VALIDATION_FAILED", validationResult.message);
  }

  // 2. Pricing
  const pricingResult = await calculateOrderPricing(
    validationResult.totalOrderAmount,
    address.zipCode
  );
  if (!pricingResult.canDeliver) {
    throw new Error(pricingResult.message);
  }

  // 3. Reserve stock in Redis (per product)
  const reservedItems: {
    productId: string;
    stockName: string;
    quantity: number;
  }[] = [];

  for (const item of productDatas) {
    const key = `stock:reservation:${item.productId}:${item.productVarient}`;

    // Atomically increment reservedQty
    const newReservedQty = await redisApp.incrby(key, item.quantity);

    // Reset TTL (ensure key auto-expires if no payment happens)
    await redisApp.expire(key, 60 * 30);

    reservedItems.push({
      productId: item.productId,
      stockName: item.productVarient,
      quantity: item.quantity,
    });
  }

  // 4. Create order in DB
  const order = await prisma.order.create({
    data: {
      userId: uid,
      totalAmount: pricingResult.finalTotal,
      status: "PENDING",
      customerName: name || address.fullName,
      customerEmail: email,
      customerPhone: phone || address.phone,
      shippingFullName: address.fullName,
      shippingPhone: address.phone,
      shippingLine1: address.line1,
      shippingLine2: address.line2 || null,
      shippingCity: address.city,
      shippingState: address.state,
      shippingCountry: address.country,
      shippingZipCode: address.zipCode,
      orderItems: {
        create: validationResult.validatedItems.map((item) => ({
          productId: item.productId,
          stockName: item.stockName,
          quantity: item.quantity,
          price: item.price,
          productName: item.productName,
          productDescription: item.productDescription,
          productImageUrl: item.productImageUrl,
          productCategory: item.productCategory,
        })),
      },
    },
    include: {
      orderItems: {
        select: {
          id: true,
          stockName: true,
          quantity: true,
          price: true,
          productName: true,
          productImageUrl: true,
        },
      },
    },
  });

  // 5. Clear cart
  await prisma.cartItem.deleteMany({
    where: {
      userId: uid,
      productId: { in: productDatas.map((p) => p.productId) },
    },
  });

  // Return reservedItems for payment controller to save with verification token
  return { order, pricingResult, validationResult, reservedItems };
}
