import { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import {
  emailSchema,
  stringSchema,
  passwordSchema,
  indianPhoneNumberSchema,
  otpSchema,
  numberSchema,
} from "../utils/inputValidation";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
dotenv.config();

//user sign up input validation middleware using zod
export const userSignupInputValidationMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, email, phone, password } = req.body;

    const errors: Record<string, string[]> = {};

    // Always validate phone, email and password
    const phoneParsed = indianPhoneNumberSchema.safeParse(phone);
    const emailParsed = emailSchema.safeParse(email);
    const nameParsed = stringSchema.safeParse(name);
    const passwordParsed = passwordSchema.safeParse(password);

    if (!phoneParsed.success) {
      errors.phone = phoneParsed.error.format()._errors;
    }
    if (!emailParsed.success) {
      errors.email = emailParsed.error.format()._errors;
    }

    if (!passwordParsed.success) {
      errors.password = passwordParsed.error.format()._errors;
    }

    if (!nameParsed.success) {
      errors.name = nameParsed.error.format()._errors;
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
      name: nameParsed.data,
      email: emailParsed.data,
      phone: phoneParsed.data,
      password: passwordParsed.data,
    };

    next();
  } catch (error) {
    res.status(500).json({ message: "Internal server error", error });
  }
};

//user sign in input validation middleware using zod
export const userSignInInputValidationMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { identifierType, identifier, password } = req.body;
    const errors: Record<string, string[]> = {};

    // Validate identifierType
    if (identifierType !== "email" && identifierType !== "phone") {
      res.status(400).json({
        message: "Invalid identifierType. Must be 'email' or 'phone'.",
      });
      return;
    }

    // Validate identifier based on type
    let identifierParsed;
    if (identifierType === "email") {
      identifierParsed = emailSchema.safeParse(identifier);
      if (!identifierParsed.success) {
        errors.identifier = identifierParsed.error.format()._errors;
      }
    } else if (identifierType === "phone") {
      identifierParsed = indianPhoneNumberSchema.safeParse(identifier);
      if (!identifierParsed.success) {
        errors.identifier = identifierParsed.error.format()._errors;
      }
    }

    // Validate password
    const passwordParsed = passwordSchema.safeParse(password);
    if (!passwordParsed.success) {
      errors.password = passwordParsed.error.format()._errors;
    }

    // If any errors, return
    if (Object.keys(errors).length > 0) {
      res.status(411).json({
        message: "Validation failed",
        errors,
      });
      return;
    }

    // Reassign validated values
    req.body = {
      identifierType,
      email: identifierType === "email" ? identifierParsed!.data : undefined,
      phone: identifierType === "phone" ? identifierParsed!.data : undefined,
      password: passwordParsed.data,
    };

    next();
  } catch (error) {
    res.status(500).json({ message: "Internal server error", error });
    return;
  }
};

//validating phone number
export const validatePhone = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { phone } = req.body;

  const result = indianPhoneNumberSchema.safeParse(phone);

  if (!result.success) {
    res.status(400).json({
      message: "Invalid phone number",
      errors: result.error.format()._errors,
    });
    return;
  }

  req.body.phone = result.data; // assign the parsed phone number
  next();
};

//validate otp and phone number
export const validateOtpInput = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { phone, otp } = req.body;

  const phoneParsed = indianPhoneNumberSchema.safeParse(phone);

  if (!phoneParsed.success) {
    res.status(400).json({
      message: "Invalid phone number",
      errors: phoneParsed.error.format()._errors,
    });
    return;
  }
  const otpParsed = otpSchema.safeParse(otp);
  if (!otpParsed.success) {
    res.status(400).json({
      message: "Invalid OTP Format",
      errors: otpParsed.error.format()._errors,
    });
    return;
  }

  req.body.phone = phoneParsed.data; // assign the parsed phone number
  req.body.otp = otpParsed.data; // assign the parsed phone number
  next();
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
    const productFakePriceParsed = numberSchema.safeParse(productFakePrice);
    const productPriceParsed = numberSchema.safeParse(productPrice);

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
export const adminCategoryInputValidation = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
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
      category: categoryParsed.data,
    };

    next();
  } catch (error) {
    res.status(500).json({ message: "Internal server error", error });
  }
};
