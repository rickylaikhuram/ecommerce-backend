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

export const indianPhoneNumberSchema = z
  .string()
  .regex(/^[6-9]\d{9}$/, {
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