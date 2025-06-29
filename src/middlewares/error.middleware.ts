import { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client"; // Import Prisma error types

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error("🔥 Global Error:", err);

  // Handle JWT errors
  if (err.name === "UnauthorizedError") {
    res.status(401).json({ message: "Invalid or expired token" });
    return 
  }

  // Handle Prisma known errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    res.status(400).json({
      message: "Database error",
      code: err.code,
      detail: err.meta,
    });
    return 
  }

  // Handle Prisma validation errors
  if (err instanceof Prisma.PrismaClientValidationError) {
    res.status(400).json({
      message: "Invalid input data for Prisma",
      detail: err.message,
    });
    return 
  }

  // Fallback error
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
  return 
};
