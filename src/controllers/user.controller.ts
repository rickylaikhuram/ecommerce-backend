import { Request, Response, NextFunction } from "express";
import { comparePassword, generateSalt, hashPassword } from "../utils/hash";
import dotenv from "dotenv";
import { generateToken } from "../utils/tokens";
import { AuthRequest } from "../types/customTypes";
import { mergeGuestCart } from "../services/guest.cart.services";
import { findUserByEmail, findUserByPhone } from "../services/user.service";
import { redisOtp } from "../config/redis";
import { generateOTP } from "../utils/otp";
import { sendOtpSms } from "../services/otp.service";
import prisma from "../config/prisma";

dotenv.config();

// check if user exists by UID in token
export const queryExistingUserCheck = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const uid = req.user?.uid;

    if (!uid) {
      const error = new Error("Uid is required") as any;
      error.statusCode = 400;
      throw error;
    }

    const user = await prisma.user.findUnique({ where: { id: uid } });
    if (!user) {
      const error = new Error("User not found") as any;
      error.statusCode = 404;
      throw error;
    }

    next();
  } catch (err) {
    next(err);
  }
};

// change user name
export const handleUserName = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name } = req.body;

    if (!name || typeof name !== "string" || name.trim().length < 2) {
      const error = new Error("Invalid name") as any;
      error.statusCode = 400;
      throw error;
    }

    const uid = req.user?.uid;
    if (!uid) {
      const error = new Error("Unauthorized") as any;
      error.statusCode = 401;
      throw error;
    }

    const updatedUser = await prisma.user.update({
      where: { id: uid },
      data: { name },
    });

    res.status(200).json({
      message: "Name changed successfully",
      user: updatedUser,
    });
  } catch (err) {
    next(err);
  }
};
