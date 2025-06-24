import { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import {
  emailSchema,
  stringSchema,
  passwordSchema,
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
      res.status(500).json({ message: "Internal server error hehe", error });
    }
  };
