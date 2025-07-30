import { PrismaClient, Product } from "@prisma/client";
import { User } from "@prisma/client";

const prisma = new PrismaClient();
export const findUserByEmail = async (email: string): Promise<User | null> => {
  return await prisma.user.findUnique({
    where: { email },
  });
};
export const findUserByPhone = async (phone: string): Promise<User | null> => {
  return await prisma.user.findUnique({
    where: { phone },
  });
};
export const findUserById = async (id: string): Promise<User | null> => {
  return await prisma.user.findFirst({
    where: {
      id,
      isDeleted: false,
    },
  });
};