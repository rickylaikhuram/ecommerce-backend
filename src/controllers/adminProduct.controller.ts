import { Request, Response } from "express";
import prisma from "../config/prisma";
import dotenv from "dotenv";

dotenv.config();

//add category Controller
export const handleAddCategory = async (req: Request, res: Response) => {
  const { category } = req.body;

  // Check if category already exists
  const categoryExist = await prisma.category.findUnique({
    where: { name: category },
  });

  if (categoryExist) {
    throw { status: 403, message: "Category already exists" };
  }

  // Create new category
  const createCategory = await prisma.category.create({
    data: { name: category },
  });

  res.status(200).json({
    message: "Category created successfully",
    category: { name: createCategory.name },
  });
};
export const handleGetCategory = async (req: Request, res: Response) => {
  // get all category
  const allCategory = await prisma.category.findMany({});

  res.status(200).json({
    message: "Get all Category successfully",
    category: allCategory,
  });
};

//add product controller
export const handleAddProduct = async (req: Request, res: Response) => {
  const {
    category,
    name,
    description,
    fakePrice,
    price,
    images,
    productStocks,
  } = req.body;

  // Check category exists
  const categoryExist = await prisma.category.findUnique({
    where: { name: category },
  });

  if (!categoryExist) {
    throw { status: 403, message: "Category doesn't exist" };
  }

  // Transaction to create product, images, and stocks
  const result = await prisma.$transaction(async (tx) => {
    const createdProduct = await tx.product.create({
      data: {
        name,
        description,
        price,
        fakePrice,
        categoryId: categoryExist.id,
      },
    });

    if (images?.length > 0) {
      await tx.productImage.createMany({
        data: images.map((img: any) => ({
          imageUrl: img.imageKey,
          altText: img.altText || null,
          position: img.position || null,
          isMain: img.isMain || false,
          productId: createdProduct.id,
        })),
      });
    }

    if (productStocks?.length > 0) {
      await tx.productStock.createMany({
        data: productStocks.map((stock: any) => ({
          stockName: stock.stockName,
          stock: stock.stock,
          productId: createdProduct.id,
        })),
      });
    }

    return createdProduct;
  });

  res.status(200).json({
    message: "Product created successfully",
    product: {
      name: result.name,
      description: result.description,
      price: result.price,
      fakePrice: result.fakePrice,
      categoryName: categoryExist.name,
    },
  });
};

//update product stock controller
export const handleUpdateStock = async (req: Request, res: Response) => {
  const { productId, productStocks } = req.body;

  if (!productId) {
    throw { status: 403, message: "Product Id is required" };
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    throw { status: 404, message: "Product not found" };
  }

  const result = [];

  for (const { stockName, stock } of productStocks) {
    const existingStock = await prisma.productStock.findFirst({
      where: { productId, stockName },
    });

    if (!existingStock) {
      result.push({
        stockName,
        status: "not found",
      });
      continue;
    }

    const updated = await prisma.productStock.update({
      where: { id: existingStock.id },
      data: { stock },
    });

    result.push({
      stockName,
      status: "updated",
      newStock: updated.stock,
    });
  }

  res.status(200).json({
    message: "Stock update complete",
    result,
  });
};

//add product stock controller
export const handleAddStock = async (req: Request, res: Response) => {
  const { productId, productStocks } = req.body;

  if (!productId) {
    throw { status: 403, message: "Product Id is required" };
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    throw { status: 404, message: "Product not found" };
  }

  const result = [];

  for (const { stockName, stock } of productStocks) {
    const exists = await prisma.productStock.findFirst({
      where: { productId, stockName },
    });

    if (exists) {
      result.push({
        stockName,
        status: "already exists",
      });
      continue;
    }

    const created = await prisma.productStock.create({
      data: {
        productId,
        stockName,
        stock,
      },
    });

    result.push({
      stockName,
      status: "created",
      stock: created.stock,
    });
  }

  res.status(201).json({
    message: "Stock creation complete",
    result,
  });
};

//delete product stock controller
export const handleDeleteStock = async (req: Request, res: Response) => {
  const { productId, productStocks } = req.body;

  if (!productId) {
    throw { status: 403, message: "Product Id is required" };
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    throw { status: 404, message: "Product not found" };
  }

  const result = [];

  for (const { stockName } of productStocks) {
    const existing = await prisma.productStock.findFirst({
      where: { productId, stockName },
    });

    if (!existing) {
      result.push({
        stockName,
        status: "not found",
      });
      continue;
    }

    await prisma.productStock.delete({
      where: { id: existing.id },
    });

    result.push({
      stockName,
      status: "deleted",
    });
  }

  res.status(200).json({
    message: "Stock deletion complete",
    result,
  });
};
