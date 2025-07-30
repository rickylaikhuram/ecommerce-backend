import { PrismaClient, Product } from "@prisma/client";

const prisma = new PrismaClient();

export const findProductById = async (id: string): Promise<Product | null> => {
  return await prisma.product.findUnique({
    where: { id },
  });
};
