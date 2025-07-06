import { Request, Response } from "express";
import prisma from "../config/prisma";

export const handleViewingAllProducts = async (req: Request, res: Response) => {
  const products = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      description: true,
      price: true,
      fakePrice: true,
      category: {
        select: {
          name: true,
        },
      },
      images: {
        select: {
          imageUrl: true,
          altText: true,
          isMain: true,
          position: true,
        },
        orderBy: {
          position: "asc",
        },
      },
      productSizes: {
        select: {
          stockName: true,
          stock: true,
        },
      },
    },
  });

  res.status(200).json({
    message: "Fetched products with images, category, and stock info",
    products,
  });
};
