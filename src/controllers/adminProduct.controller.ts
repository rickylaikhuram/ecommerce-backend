import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import { comparePassword, generateSalt, hashPassword } from "../utils/hash";
import dotenv from "dotenv";
import { generateToken } from "../utils/tokens";
import { ProductRequest, UserExtend } from "../types/customTypes";

dotenv.config();

const prisma = new PrismaClient();

//add category Controller
export const handleAddCategory = async (req: Request, res: Response) => {
  try {
    const { category } = req.body;

    //check category already exist or not
    const categoryExist = await prisma.category.findUnique({
      where: { name: category },
    });

    if (categoryExist) {
      res.status(403).json({ message: "Category already exist" });
      return;
    }

    //create new category
    const createCategory = await prisma.category.create({
      data: {
        name: category,
      },
    });

    res.status(200).json({
      message: "Category created successfully",
      category: {
        name: createCategory.name,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error", error });
  }
};

//add product controller
export const handleAddProduct = async (req: Request, res: Response) => {
  try {
    const {
      productCategory,
      productName,
      productDescription,
      productFakePrice,
      productPrice,
    } = req.body;

    //check category already exist or not
    const categoryExist = await prisma.category.findUnique({
      where: { name: productCategory },
    });

    if (!categoryExist) {
      res.status(403).json({ message: "Category doesn't exist" });
      return;
    }

    //create new product
    const createProduct = await prisma.product.create({
      data: {
        name: productName,
        description: productDescription,
        price: productPrice,
        fakePrice: productFakePrice,
        categoryId: productCategory,
      },
    });

    res.status(200).json({
      message: "product created successfully",
      product: {
        name: createProduct.name,
        description: createProduct.description,
        price: createProduct.price,
        fakePrice: createProduct.fakePrice,
        categoryName: categoryExist.name,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error", error });
  }
};

//add product stock controller
export const handleAddStock = async (req: ProductRequest, res: Response) => {
  try {
    const productSizeAndStock = req.body;

    



  } catch (error) {
    res.status(500).json({ message: "Internal server error", error });
  }
};
