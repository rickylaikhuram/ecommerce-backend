// Input Validation
import z from "zod";
export const emailSchema = z
  .string()
  .email({ message: "Invalid email address format" });

export const passwordSchema = z
  .string()
  .min(6, { message: "Password must be at least 6 characters long" })
  .max(30, { message: "Password must be at most 30 characters long" });

export const stringSchema = z
  .string()
  .min(1, { message: "This field cannot be empty" });

export const indianPhoneNumberSchema = z.string().regex(/^[6-9]\d{9}$/, {
  message: "Must be 10 digits starting with 6-9.",
});

export const genderSchema = z
  .union([z.enum(["male", "female", "other"]), z.null()])
  .optional();

export const numberSchema = z.number();

export const otpSchema = z
  .string()
  .length(6, "OTP must be exactly 6 digits")
  .regex(/^\d{6}$/, "OTP must contain only digits");

export const fileUploadSchema = z.array(
  z.object({
    fileName: z.string().min(1),
    fileType: z.enum([
      // ✅ Image formats
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",

      // ✅ Video formats
      "video/mp4",
      "video/webm",
      "video/quicktime", // .mov
      "video/x-matroska", // .mkv
      "video/avi",
    ]),
  })
);

export const imageSchema = z.array(
  z.object({
    imageKey: z.string().min(1),
    altText: z.string().optional(),
    position: z.number().optional(),
    isMain: z.boolean().default(false),
  })
);

// Schema for deleted images
const deleteImageSchema = z
  .array(
    z.object({
      id: z.string().min(1), // Changed from UUID to allow any string ID
      imageUrl: z.string().min(1), // Changed from imageKey to imageUrl to match frontend
    })
  )
  .default([]);

// Schema for updated existing images
const updatedImageSchema = z
  .array(
    z.object({
      id: z.string().min(1), // Changed from UUID to allow any string ID
      imageUrl: z.string().min(1), // Changed from imageKey to imageUrl to match frontend
      altText: z.string().min(1), // Made required since frontend always sends it
      position: z.number().int().min(0), // Made required and added int validation
      isMain: z.boolean(), // Made required since frontend always sends it
    })
  )
  .default([]);

// Schema for new images
const newImageSchema = z
  .array(
    z.object({
      imageKey: z.string().min(1), // This is correct - new images use imageKey
      altText: z.string().min(1), // Made required since frontend always sends it
      position: z.number().int().min(0), // Made required and added int validation
      isMain: z.boolean(), // Made required since frontend always sends it
    })
  )
  .default([]);

// Main schema
export const editImagesSchema = z.object({
  deletedImages: deleteImageSchema,
  updatedImages: updatedImageSchema,
  newImages: newImageSchema,
});


export const stockSchema = z.array(
  z.object({
    stockName: z.string().min(1, "Stock name is required"),
    stock: z.number().min(1, "Stock must be at least 1"),
  })
).min(1, "At least one stock item is required");

export const deleteStockSchema = z.array(
  z.object({
    stockName: z.string().min(1),
  })
);

export const isPublishedSchema = z.coerce.boolean().default(true);

// schema for category
export const categorySchema = z.object({
  name: z
    .string()
    .min(2, "Category name must be at least 2 characters")
    .max(50, "Category name must be less than 50 characters")
    .trim(),
  parentId: z.string().uuid().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  altText: z.string().nullable().optional(),
});

// schema for add to cart
export const addToCartSchema = z.object({
  productId: z.string().uuid(),
  stockName: z.string().min(1),
  quantity: z.number().int().positive().optional().default(1),
});

export const updateQuantitySchema = z.object({
  quantity: z.number().int().positive(),
});

export const checkProductsSchema = z
  .array(
    z.object({
      productId: z.string().uuid("Invalid product ID format"),
      productVarient: z.string().min(1, "Product variant is required"),
      quantity: z.number().int().min(1, "Quantity must be at least 1"),
    })
  )
  .min(1, "At least one product is required");

export const cartItemIdSchema = z.string().uuid("Invalid cart item ID format");

// Custom Indian ZIP code (PIN code) schema
export const indianZipCodeSchema = z.string().regex(/^[1-9][0-9]{5}$/, {
  message: "Must be a valid 6-digit Indian PIN code.",
});

// add address input validation
const baseAddressSchema = z.object({
  fullName: z.string().min(1),
  phone: indianPhoneNumberSchema,
  alternatePhone: indianPhoneNumberSchema.optional(),
  line1: z.string().min(1),
  line2: z.string().optional(),
  landmark: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  country: z.string().min(1),
  zipCode: indianZipCodeSchema,
  label: z.string().optional(),
  isDefault: z.boolean().optional().default(false),
});

export const createAddressSchema = baseAddressSchema;
export const updateAddressSchema = baseAddressSchema.partial(); // all fields optional
