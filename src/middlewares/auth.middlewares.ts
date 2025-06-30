import { Response, NextFunction } from "express";
import dotenv from "dotenv";
import { AuthRequest } from "../types/customTypes";
import { decodeToken, verifyToken } from "../utils/tokens";
import { createGuestTokens } from "../utils/guest";
import { deleteGuestCart } from "../services/guest.cart.services";

dotenv.config();

// Middleware: Check if user is authenticated or create guest identity
export const isAuthenticated = async (
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
    // Try to decode expired or invalid token manually to clean up guest cart
    let decodedGuest;
    try {
      decodedGuest = decodeToken(token);
    } catch (decodeErr) {
      console.error("Failed to decode token:", decodeErr);
    }

    // Cleanup guest cart if token was guest
    if (decodedGuest?.role === "guest") {
      try {
        await deleteGuestCart(decodedGuest.uid);
        console.log(`🗑️ Deleted cart for expired guest: ${decodedGuest.uid}`);
      } catch (deleteErr) {
        console.error("Failed to delete guest cart:", deleteErr);
      }
    }

    // Generate a new guest token and attach to request
    try {
      const guestToken = createGuestTokens(); 
      let guestDecoded;
      try {
        guestDecoded = decodeToken(guestToken);
      } catch (decodeErr) {
        console.error("Failed to decode new guest token:", decodeErr);
        res.status(500).json({ message: "Internal server error" });
        return 
      }

      // Set new guest token in cookie
      res.cookie("token", guestToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 1 * 24 * 60 * 60 * 1000, // 1 day
      });

      req.user = guestDecoded

      return next();
    } catch (guestErr) {
      console.error("Guest token creation failed:", guestErr);
      res.status(500).json({ message: "Internal server error" });
      return 
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
    res.status(403).json({ message: "Admin access only" });
    return 
  }
  next();
};

//check if the user is a user
export const isUser = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (req.user.role !== "user") {
    return res.status(403).json({ message: "Only user access allowed" });
  }

  next();
};

