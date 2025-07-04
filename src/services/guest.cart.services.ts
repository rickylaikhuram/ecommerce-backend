import { PrismaClient } from "@prisma/client";
import redis from "../config/redis";
import { GuestCartItem } from "../types/customTypes";

const prisma = new PrismaClient();


export const mergeGuestCart = async (guestUid: string, userUid: string): Promise<void> => {
  const redisKey = `cart:${guestUid}`;
  const cartData = await redis.get(redisKey);

  if (!cartData) return;

   const cartItems: GuestCartItem[] = JSON.parse(cartData);

  if (!cartItems || cartItems.length === 0) return;

  await prisma.$transaction(
    cartItems.map((item) =>
      prisma.cartItem.upsert({
        where: {
          userId_productId_size: {
            userId: userUid,
            productId: item.productId,
            size: item.size,
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
          size: item.size,
          quantity: item.quantity,
        },
      })
    )
  );

  await redis.del(redisKey);
};