import { PrismaClient } from "@prisma/client";
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
