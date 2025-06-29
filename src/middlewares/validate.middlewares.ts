import { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import {
  emailSchema,
  stringSchema,
  passwordSchema,
  numberSchema,
} from "../utils/inputValidation";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
dotenv.config();

//user input validation middleware using zod
export const userInputValidationMiddleware =
  (mode: "signup" | "signin") =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, email, password } = req.body;

      const errors: Record<string, string[]> = {};

      // Always validate email and password
      const emailParsed = emailSchema.safeParse(email);
      const passwordParsed = passwordSchema.safeParse(password);

      if (!emailParsed.success) {
        errors.email = emailParsed.error.format()._errors;
      }

      if (!passwordParsed.success) {
        errors.password = passwordParsed.error.format()._errors;
      }

      // Only validate name during signup
      let nameParsed;
      if (mode === "signup") {
        nameParsed = stringSchema.safeParse(name);
        if (!nameParsed.success) {
          errors.name = nameParsed.error.format()._errors;
        }
      }

      if (Object.keys(errors).length > 0) {
        res.status(411).json({
          message: "Validation failed",
          errors,
        });
        return;
      }

      // Reassign validated values
      req.body = {
        email: emailParsed.data,
        password: passwordParsed.data,
        ...(mode === "signup" && { name: nameParsed!.data }),
      };

      next();
    } catch (error) {
      res.status(500).json({ message: "Internal server error", error });
    }
  };




// admin add product input validation
export const adminProductInputValidation = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { productName, productDescription } = req.body;
    const productFakePrice = Number(req.body.productFakePrice);
    const productPrice = Number(req.body.productPrice);

    const errors: Record<string, string[]> = {};

    // Validate string for product Name and Description
    const productNameParsed = stringSchema.safeParse(productName);
    const productDescriptionParsed = stringSchema.safeParse(productDescription);
    const productFakePriceParsed = numberSchema.safeParse(productFakePrice)
    const productPriceParsed = numberSchema.safeParse(productPrice)

    if (!productNameParsed.success) {
      errors.email = productNameParsed.error.format()._errors;
    }

    if (!productDescriptionParsed.success) {
      errors.password = productDescriptionParsed.error.format()._errors;
    }
    if (!productFakePriceParsed.success) {
      errors.password = productFakePriceParsed.error.format()._errors;
    }
    if (!productPriceParsed.success) {
      errors.password = productPriceParsed.error.format()._errors;
    }

    if (Object.keys(errors).length > 0) {
      res.status(411).json({
        message: "Validation failed",
        errors,
      });
      return;
    }

    // Reassign validated values
    req.body = {
      productName: productNameParsed.data,
      productDescription: productDescriptionParsed.data,
      productFakePrice: productFakePriceParsed.data,
      productPrice: productPriceParsed.data,
    };

    next();
  } catch (error) {
    res.status(500).json({ message: "Internal server error ", error });
  }
};

// admin add category input validation
export const adminCategoryInputValidation =
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { category } = req.body;

      const errors: Record<string, string[]> = {};

      // validate category input as string
      const categoryParsed = stringSchema.safeParse(category);

      if (!categoryParsed.success) {
        errors.email = categoryParsed.error.format()._errors;
      }

      if (Object.keys(errors).length > 0) {
        res.status(411).json({
          message: "Validation failed",
          errors,
        });
        return;
      }

      // Reassign validated values
      req.body = {
        category: categoryParsed.data
      };

      next();
    } catch (error) {
      res.status(500).json({ message: "Internal server error", error });
    }
  };
