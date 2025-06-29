import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
export const deleteGuestCart = async (uid: string): Promise<void> => {
  await prisma.cartItem.deleteMany({
    where: {
      userId: null,
      sessionId: uid,
    },
  });
};
