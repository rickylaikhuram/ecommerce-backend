import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const handleViewingAllProducts = async (req: Request, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      include: {
        images: true,
      },
    });

    res.status(200).json({
      message: "get all the products successfully",
      products,
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error", error });
  }
};
