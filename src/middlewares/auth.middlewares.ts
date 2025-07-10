import { Response, NextFunction } from "express";
import dotenv from "dotenv";
import { AuthRequest } from "../types/customTypes";
import { decodeToken, verifyToken } from "../utils/tokens";
import { createGuestTokens } from "../utils/guest";

dotenv.config();

// Middleware: Check if user is authenticated or create guest identity
export const identifySessionUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const token = req.cookies.token;

  try {
    if (!token) throw new Error("No token");

    const decoded = verifyToken(token); // Will throw if invalid or expired
    req.user = decoded;
    return next(); // Proceed with valid user
  } catch (err: any) {
    try {
      const guestToken = createGuestTokens();
      let guestDecoded;
      try {
        guestDecoded = decodeToken(guestToken);
      } catch (decodeErr) {
        console.error("Failed to decode new guest token:", decodeErr);
        throw { statusCode: 500, message: "Internal server error" };
      }

      res.cookie("token", guestToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        maxAge: 1 * 24 * 60 * 60 * 1000,
      })

      req.user = guestDecoded;
      return next();
    } catch (guestErr) {
      console.error("Guest token creation failed:", guestErr);
      throw { statusCode: 500, message: "Internal server error" };
    }
  }
};

//check if the user is admin
export const isAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user || !req.user.isAdmin) {
    throw { statusCode: 403, message: "Admin access only" };
  }
  next();
};

//check if the user is a user
export const isUser = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    throw { statusCode: 401, message: "Unauthorized" };
  }

  if (req.user.role !== "user") {
    throw { statusCode: 403, message: "Only user access allowed" };
  }

  next();
};
