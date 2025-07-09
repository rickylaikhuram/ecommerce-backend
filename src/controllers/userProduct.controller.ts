import { Request, Response } from "express";
import prisma from "../config/prisma";

// view all the products
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
          id: true,
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

// view only a specific category
export const handleViewingCategoryProducts = async (
  req: Request,
  res: Response
) => {
  const { categoryId } = req.body;

  if (!categoryId) {
    throw { status: 400, message: "categoryId is required" };
  }

  const products = await prisma.product.findMany({
    where: {
      categoryId: categoryId,
    },
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
    message: "Fetched products by category",
    products,
  });
};

// view 10 best sellers of the weeks