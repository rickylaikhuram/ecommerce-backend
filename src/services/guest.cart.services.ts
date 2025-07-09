import { PrismaClient } from "@prisma/client";
import {redisOtp} from "../config/redis";
import { GuestCartItem } from "../types/customTypes";

const prisma = new PrismaClient();


export const mergeGuestCart = async (guestUid: string, userUid: string): Promise<void> => {
  const redisKey = `cart:${guestUid}`;
  const cartData = await redisOtp.get(redisKey);

  if (!cartData) return;

   const cartItems: GuestCartItem[] = JSON.parse(cartData);

  if (!cartItems || cartItems.length === 0) return;

  await prisma.$transaction(
    cartItems.map((item) =>
      prisma.cartItem.upsert({
        where: {
          userId_productId_stockname: {
            userId: userUid,
            productId: item.productId,
            stockname: item.stockname,
          },
        },
        update: {
          quantity: {
            increment: item.quantity,
          },
        },
        create: {
          userId: userUid,
          productId: item.productId,
          stockname: item.stockname,
          quantity: item.quantity,
        },
      })
    )
  );

  await redisOtp.del(redisKey);
};