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

export const mergeGuestCart = async (guestUid: string,userUid:string): Promise<void> => {
  await prisma.cartItem.updateMany({
    where: {
      sessionId: guestUid,
    },
    data:{
      userId:userUid,
      sessionId:null
    }
  });
};
