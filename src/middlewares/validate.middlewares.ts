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
  isPublishedSchema,
  categorySchema,
  addToCartSchema,
  checkProductsSchema,
  updateQuantitySchema,
  cartItemIdSchema,
  createAddressSchema,
} from "../utils/inputValidation";
import { sanitizeFileName } from "../utils/sanatizeString";

dotenv.config();

//
// USER SIGN IN SIGN UP ROUTES
//

//user sign up input validation middleware using zod
export const userSignupInputValidationMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, email, phone, password } = req.body;
    const errors: Record<string, string[]> = {};

    // Convert email to lowercase before validation
    const normalizedEmail =
      typeof email === "string" ? email.toLowerCase() : email;

    // Validate all fields
    const nameParsed = stringSchema.safeParse(name);
    const emailParsed = emailSchema.safeParse(normalizedEmail);
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

    // Normalize and validate identifier based on type
    let identifierParsed;
    if (identifierType === "email") {
      const normalizedEmail =
        typeof identifier === "string" ? identifier.toLowerCase() : identifier;
      identifierParsed = emailSchema.safeParse(normalizedEmail);
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

//
// ADMIN RELATED VALIDATION ROUTES
//

// admin get presigned url input validation
export const adminPreSignedInputValidation = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const parsed = fileUploadSchema.safeParse(req.body.files);
    const folderName = stringSchema.safeParse(req.body.folderName);
    console.log(parsed);

    if (!parsed.success) {
      throw {
        statusCode: 400,
        message: "Invalid file upload input",
        errors: parsed.error.flatten().fieldErrors,
      };
    }
    if (!folderName.success) {
      throw {
        statusCode: 400,
        message: "Need Folder Name",
        errors: folderName.error.flatten().fieldErrors,
      };
    }

    req.body.files = parsed.data.map((file) => ({
      sanitizedFileName: sanitizeFileName(file.fileName),
      fileType: file.fileType,
    }));
    req.body.folderName = folderName.data;

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
    const result = categorySchema.safeParse(req.body);

    if (!result.success) {
      const errors = result.error.format();
      throw {
        statusCode: 411,
        message: "Validation failed",
        errors: errors,
      };
    }

    req.body = result.data;
    next();
  } catch (error: any) {
    res.status(error?.statusCode || 500).json({
      success: false,
      message: error?.message || "Internal server error",
      errors: error?.errors || error,
    });
  }
};

// validate product core
export const validateProductCore = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, description, category, isActive } = req.body;
    const productOriginalPrice = Number(req.body.originalPrice);
    const productDiscountedPrice = Number(req.body.discountedPrice);

    const errors: Record<string, string[]> = {};

    const productNameParsed = stringSchema.safeParse(name);
    const productDescriptionParsed = stringSchema.safeParse(description);
    const productCategoryParsed = stringSchema.safeParse(category);
    const productOriginalPriceParsed =
      numberSchema.safeParse(productOriginalPrice);
    const productDiscountedPriceParsed = numberSchema.safeParse(
      productDiscountedPrice
    );
    const productIsActiveParsed = isPublishedSchema.safeParse(isActive);

    if (!productNameParsed.success) {
      errors.name = productNameParsed.error.format()._errors;
    }
    if (!productIsActiveParsed.success) {
      errors.isActive = productIsActiveParsed.error.format()._errors;
    }

    if (!productDescriptionParsed.success) {
      errors.description = productDescriptionParsed.error.format()._errors;
    }

    if (!productCategoryParsed.success) {
      errors.category = productCategoryParsed.error.format()._errors;
    }

    if (!productOriginalPriceParsed.success) {
      errors.originalPrice = productOriginalPriceParsed.error.format()._errors;
    }

    if (!productDiscountedPriceParsed.success) {
      errors.discountedPrice =
        productDiscountedPriceParsed.error.format()._errors;
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
      originalPrice: productOriginalPriceParsed.data,
      discountedPrice: productDiscountedPriceParsed.data,
      isActive: productIsActiveParsed.data,
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

//
// USER RELATED VALIDATION ROUTES
//

// add to cart validation
export const validateAddToCart = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const result = addToCartSchema.safeParse(req.body);

  if (!result.success) {
    throw {
      statusCode: 400,
      message: "Invalid add to cart format",
      errors: result.error.flatten().fieldErrors,
    };
  }

  req.body = result.data;
  next();
};

// update quantity validation
export const validateUpdateQuantity = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const result = updateQuantitySchema.safeParse(req.body);

  if (!result.success) {
    throw {
      statusCode: 400,
      message: "Invalid quantity update format",
      errors: result.error.flatten().fieldErrors,
    };
  }

  req.body = result.data;
  next();
};

export const validateCheckProducts = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const result = checkProductsSchema.safeParse(req.body.productDatas);

  if (!result.success) {
    throw {
      statusCode: 400,
      message: "Invalid product check format",
      errors: result.error.flatten().fieldErrors,
    };
  }

  req.body.productDatas = result.data;
  next();
};

// Additional validation for cart item ID in params
export const validateCartItemId = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const result = cartItemIdSchema.safeParse(req.params.cartItemId);

  if (!result.success) {
    throw {
      statusCode: 400,
      message: "Invalid cart item ID",
      errors: { cartItemId: result.error.flatten().formErrors },
    };
  }

  next();
};

// validate address data for user
export const validateAddressBody = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const result = createAddressSchema.safeParse(req.body.address);

  if (!result.success) {
    const formatted = result.error.flatten();

    throw {
      statusCode: 400,
      message: "Invalid address input",
      errors: formatted.fieldErrors,
    };
  }

  next();
};

// change password validation
export const validateChangePassword = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const currentPasswordResult = passwordSchema.safeParse(
    req.body.currentPassword
  );
  const newPasswordResult = passwordSchema.safeParse(req.body.newPassword);

  if (!currentPasswordResult.success) {
    throw {
      statusCode: 400,
      message: "Invalid password format",
      errors: currentPasswordResult.error.flatten().fieldErrors,
    };
  }
  if (!newPasswordResult.success) {
    throw {
      statusCode: 400,
      message: "Invalid password format",
      errors: newPasswordResult.error.flatten().fieldErrors,
    };
  }
  if (currentPasswordResult.data === newPasswordResult.data) {
    const error = new Error(
      "New password cannot be the same as the current password"
    ) as any;
    error.statusCode = 400;
    throw error;
  }

  req.body.newPassword = newPasswordResult.data;
  req.body.currentPassword = currentPasswordResult.data;
  next();
};
