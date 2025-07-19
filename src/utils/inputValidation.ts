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
export const stockSchema = z.array(
  z.object({
    stockName: z.string().min(1),
    stock: z.number(),
  })
);
export const deleteStockSchema = z.array(
  z.object({
    stockName: z.string().min(1),
  })
);
