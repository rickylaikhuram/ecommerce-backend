import prisma from "../config/prisma";
import { ApiError } from "../utils/api.error";
import { generateOrderNumber } from "../utils/create.orderId";
import { redisApp } from "../config/redis";
import { CreateOrderRequest } from "../types/checkout.types";
import { AuthRequest } from "../types/customTypes";
import { validateCartItems } from "./cart.validate.services";
import { calculateOrderPricing } from "./price.calculation.services";
import type { DeliveryCalculationResult } from "./price.calculation.services";

export async function createOrderWithPaymentMethod(
  req: AuthRequest,
  paymentMethod: "UPI" | "COD"
): Promise<{
  order: any;
  pricingResult: DeliveryCalculationResult;
  validationResult: any;
  reservedItems?: {
    productId: string;
    stockName: string;
    quantity: number;
  }[];
}> {
  const uid = req.user!.uid;
  const name = req.userData!.name;
  const email = req.userData!.email;
  const phone = req.userData!.phone;

  const { productDatas, address }: CreateOrderRequest = req.body;

  // 1. Validate cart (this now properly checks Redis reservations)
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

  let reservedItems:
    | {
        productId: string;
        stockName: string;
        quantity: number;
      }[]
    | undefined;

  // 3. Handle stock based on payment method
  if (paymentMethod === "UPI") {
    // Reserve stock in Redis for UPI (temporary reservation)
    reservedItems = [];
    
    try {
      for (const item of productDatas) {
        const key = `stock:reservation:${item.productId}:${item.productVarient}`;

        // Use a more robust reservation system
        const pipeline = redisApp.pipeline();
        pipeline.incrby(key, item.quantity);
        pipeline.expire(key, 60 * 30); // 30 minutes expiry
        await pipeline.exec();

        reservedItems.push({
          productId: item.productId,
          stockName: item.productVarient,
          quantity: item.quantity,
        });
      }
    } catch (error) {
      // Rollback reservations if any fail
      if (reservedItems) {
        for (const item of reservedItems) {
          const key = `stock:reservation:${item.productId}:${item.stockName}`;
          await redisApp.decrby(key, item.quantity);
        }
      }
      throw error;
    }
  } else if (paymentMethod === "COD") {
    // For COD, directly update stock in database
    await prisma.$transaction(async (tx) => {
      for (const item of productDatas) {
        // Get current stock with proper table reference
        const productSize = await tx.productStock.findFirst({
          where: {
            productId: item.productId,
            stockName: item.productVarient,
          },
        });

        if (!productSize || productSize.stock < item.quantity) {
          throw new ApiError(
            400,
            "INSUFFICIENT_STOCK",
            `Insufficient stock for ${item.productVarient}`
          );
        }

        // Decrement stock immediately for COD
        await tx.productStock.updateMany({
          where: {
            productId: item.productId,
            stockName: item.productVarient,
          },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });
      }
    });
  }

  // 4. Create order in DB (rest of the code remains the same)
  let order;
  let created = false;

  while (!created) {
    try {
      const orderNumber = generateOrderNumber();

      order = await prisma.order.create({
        data: {
          orderNumber,
          userId: uid,
          totalAmount: pricingResult.finalTotal,
          status: "PENDING",
          customerName: name || address.fullName,
          customerEmail: email,
          customerPhone: phone || address.phone,
          shippingFullName: address.fullName,
          shippingPhone: address.phone,
          shippingPhone2: address.alternatePhone || null,
          shippingLine1: address.line1,
          shippingLine2: address.line2 || null,
          shippingLandmark: address.landmark || null,
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
              subTotal: item.price * item.quantity,
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

      created = true;
    } catch (err: any) {
      if (err.code === "P2002" && err.meta?.target?.includes("orderNumber")) {
        console.warn("Order number collision, retrying...");
        continue;
      }
      throw err;
    }
  }

  // 5. Clear cart
  await prisma.cartItem.deleteMany({
    where: {
      userId: uid,
      productId: { in: productDatas.map((p) => p.productId) },
    },
  });

  return { order: order!, pricingResult, validationResult, reservedItems };
}
