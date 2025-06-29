import { Response, NextFunction } from "express";
import dotenv from "dotenv";
import { AuthRequest } from "../types/customTypes";
import { decodeToken, verifyToken } from "../utils/tokens";
import { createGuestTokens } from "../utils/guest";
import { deleteGuestCart } from "../services/guest.cart.services";

dotenv.config();

//check if the user is authenticated or not
export const isAuthenticated = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const token = req.cookies.token;

  try {
    if (!token) throw new Error("No token");

    const decoded = verifyToken(token);
    req.user = decoded;
    return next();
  } catch (err: any) {
    // Decode manually to check role (even if expired)
    let decodedGuest;
    try {
      decodedGuest = decodeToken(token); 
    } catch (decodeErr) {
      console.error("Failed to decode token:", decodeErr);
    }
    // delete or clean guest cart
    if (decodedGuest?.role === "guest") {
      try {
        await deleteGuestCart(decodedGuest.uid); // 🧹 cleanup guest cart
        console.log(`🗑️ Deleted cart for expired guest: ${decodedGuest.uid}`);
      } catch (deleteErr) {
        console.error("Failed to delete guest cart:", deleteErr);
      }
    }

    try {
      const guestToken = createGuestTokens(); 
      res
        .cookie("token", guestToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          maxAge: 1 * 24 * 60 * 60 * 1000,
        })
        .status(200)
        .json({ message: "Logged in as guest due to invalid/expired token" });
    } catch (guestErr) {
      console.error("Guest token creation failed:", guestErr);
      res.status(500).json({ message: "Internal server error" });
    }
  }
};

//check if the user is admin
export const isAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (req.user?.isAdmin) {
    res.status(403).json({ message: "Admin access denied" });
    return;
  }
  next();
};
