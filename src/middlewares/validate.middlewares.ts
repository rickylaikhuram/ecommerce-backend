import { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import {
  emailSchema,
  stringSchema,
  passwordSchema,
  indianPhoneNumberSchema,
  otpSchema,
  numberSchema,
  fileUploadSchema,
  imageSchema,
  stockSchema,
  deleteStockSchema,
} from "../utils/inputValidation";
import { sanitizeFileName } from "../utils/sanatizeString";

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

    // Validate all fields
    const nameParsed = stringSchema.safeParse(name);
    const emailParsed = emailSchema.safeParse(email);
    const phoneParsed = indianPhoneNumberSchema.safeParse(phone);
    const passwordParsed = passwordSchema.safeParse(password);

    if (!nameParsed.success) {
      errors.name = nameParsed.error.format()._errors;
    }
    if (!emailParsed.success) {
      errors.email = emailParsed.error.format()._errors;
    }
    if (!phoneParsed.success) {
      errors.phone = phoneParsed.error.format()._errors;
    }
    if (!passwordParsed.success) {
      errors.password = passwordParsed.error.format()._errors;
    }

    if (Object.keys(errors).length > 0) {
      throw {
        statusCode: 411,
        message: "Validation failed",
        errors,
      };
    }

    // Reassign validated values back to body
    req.body = {
      name: nameParsed.data,
      email: emailParsed.data,
      phone: phoneParsed.data,
      password: passwordParsed.data,
    };

    next();
  } catch (error: any) {
    throw {
      statusCode: error?.statusCode || 500,
      message: error?.message || "Internal server error",
      error: error?.errors || error,
    };
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
      throw {
        statusCode: 400,
        message: "Invalid identifierType. Must be 'email' or 'phone'.",
      };
    }

    // Validate identifier based on type
    let identifierParsed;
    if (identifierType === "email") {
      identifierParsed = emailSchema.safeParse(identifier);
      if (!identifierParsed.success) {
        errors.identifier = identifierParsed.error.format()._errors;
      }
    } else {
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

    if (Object.keys(errors).length > 0) {
      throw {
        statusCode: 411,
        message: "Validation failed",
        errors,
      };
    }

    req.body = {
      identifierType,
      email: identifierType === "email" ? identifierParsed!.data : undefined,
      phone: identifierType === "phone" ? identifierParsed!.data : undefined,
      password: passwordParsed.data,
    };

    next();
  } catch (error: any) {
    throw {
      statusCode: error?.statusCode || 500,
      message: error?.message || "Internal server error",
      error: error?.errors || error,
    };
  }
};

//validating phone number
export const validatePhone = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { phone } = req.body;

    const result = indianPhoneNumberSchema.safeParse(phone);

    if (!result.success) {
      throw {
        statusCode: 400,
        message: "Invalid phone number",
        errors: { phone: result.error.format()._errors },
      };
    }

    req.body.phone = result.data;
    next();
  } catch (error: any) {
    throw {
      statusCode: error?.statusCode || 500,
      message: error?.message || "Internal server error",
      error: error?.errors || error,
    };
  }
};

//validate otp and phone number
export const validateOtpInput = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { phone, otp } = req.body;

    const phoneParsed = indianPhoneNumberSchema.safeParse(phone);
    const otpParsed = otpSchema.safeParse(otp);

    const errors: Record<string, string[]> = {};

    if (!phoneParsed.success) {
      errors.phone = phoneParsed.error.format()._errors;
    }

    if (!otpParsed.success) {
      errors.otp = otpParsed.error.format()._errors;
    }

    if (Object.keys(errors).length > 0) {
      throw {
        statusCode: 400,
        message: "Invalid OTP or phone format",
        errors,
      };
    }

    req.body.phone = phoneParsed.data;
    req.body.otp = otpParsed.data;

    next();
  } catch (error: any) {
    throw {
      statusCode: error?.statusCode || 500,
      message: error?.message || "Internal server error",
      error: error?.errors || error,
    };
  }
};

// admin get presigned url input validation
export const adminPreSignedInputValidation = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const parsed = fileUploadSchema.safeParse(req.body);

    if (!parsed.success) {
      throw {
        statusCode: 400,
        message: "Invalid file upload input",
        errors: parsed.error.flatten().fieldErrors,
      };
    }

    req.body.files = parsed.data.files.map((file) => ({
      sanitizedFileName: sanitizeFileName(file.fileName),
      fileType: file.fileType,
    }));

    next();
  } catch (error: any) {
    throw {
      statusCode: error?.statusCode || 500,
      message: error?.message || "Internal server error",
      error: error?.errors || error,
    };
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

    const categoryParsed = stringSchema.safeParse(category);

    if (!categoryParsed.success) {
      errors.category = categoryParsed.error.format()._errors;
    }

    if (Object.keys(errors).length > 0) {
      throw {
        statusCode: 411,
        message: "Validation failed",
        errors,
      };
    }

    // Keep other req.body fields if needed
    Object.assign(req.body, {
      category: categoryParsed.data,
    });

    next();
  } catch (error: any) {
    throw {
      statusCode: error?.statusCode || 500,
      message: error?.message || "Internal server error",
      error: error?.errors || error,
    };
  }
};

export const validateProductCore = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, description, category } = req.body;
    const productFakePrice = Number(req.body.fakePrice);
    const productPrice = Number(req.body.price);

    const errors: Record<string, string[]> = {};

    const productNameParsed = stringSchema.safeParse(name);
    const productDescriptionParsed = stringSchema.safeParse(description);
    const productCategoryParsed = stringSchema.safeParse(category);
    const productFakePriceParsed = numberSchema.safeParse(productFakePrice);
    const productPriceParsed = numberSchema.safeParse(productPrice);

    if (!productNameParsed.success) {
      errors.name = productNameParsed.error.format()._errors;
    }

    if (!productDescriptionParsed.success) {
      errors.description = productDescriptionParsed.error.format()._errors;
    }

    if (!productCategoryParsed.success) {
      errors.category = productCategoryParsed.error.format()._errors;
    }

    if (!productFakePriceParsed.success) {
      errors.fakePrice = productFakePriceParsed.error.format()._errors;
    }

    if (!productPriceParsed.success) {
      errors.price = productPriceParsed.error.format()._errors;
    }

    if (Object.keys(errors).length > 0) {
      throw {
        statusCode: 411,
        message: "Validation failed",
        errors,
      };
    }

    // Merge validated values back into req.body without removing the rest
    Object.assign(req.body, {
      name: productNameParsed.data,
      description: productDescriptionParsed.data,
      category: productCategoryParsed.data,
      fakePrice: productFakePriceParsed.data,
      price: productPriceParsed.data,
    });

    next();
  } catch (error: any) {
    // Rethrow for global handler
    throw {
      statusCode: error?.statusCode || 500,
      message: error?.message || "Internal server error",
      error: error?.errors || error,
    };
  }
};

// admin product images input validation
export const validateProductImages = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const result = imageSchema.safeParse(req.body.images);

  if (!result.success) {
    throw {
      statusCode: 400,
      message: "Invalid images format",
      errors: result.error.flatten().fieldErrors,
    };
    return;
  }

  req.body.images = result.data;
  next();
};

// admin validate product stock
export const validateProductStock = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const result = stockSchema.safeParse(req.body.productStocks);

  if (!result.success) {
    throw {
      statusCode: 400,
      message: "Invalid stocks format",
      errors: result.error.flatten().fieldErrors,
    };
  }

  req.body.productStocks = result.data;
  next();
};

// admin validate product stock
export const validateDeleteProductStock = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const result = deleteStockSchema.safeParse(req.body.productStocks);

  if (!result.success) {
    throw {
      statusCode: 400,
      message: "Invalid delete stocks format",
      errors: result.error.flatten().fieldErrors,
    };
  }

  req.body.productStocks = result.data;
  next();
};
