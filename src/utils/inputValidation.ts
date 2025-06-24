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

export const contactSchema = z
  .string()
  .length(10, { message: "Contact number must be exactly 10 digits" })
  .regex(/^\d+$/, { message: "Contact number must contain only digits" });

export const genderSchema = z
  .union([z.enum(["male", "female", "other"]), z.null()])
  .optional();

