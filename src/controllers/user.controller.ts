import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import { comparePassword, generateSalt, hashPassword } from "../utils/hash";
import dotenv from "dotenv";
import { generateToken } from "../utils/tokens";
import { AuthRequest, UserExtend } from "../types/customTypes";
import { mergeGuestCart } from "../services/guest.cart.services";
import { findUserByEmail } from "../services/user.service";

dotenv.config();

const prisma = new PrismaClient();

//user signup Controller
export const handleUserSignup = async (req: AuthRequest, res: Response) => {
  try {
    const email = req.body;

    const existingUser = await findUserByEmail(email);

    if (existingUser) {
      res.status(404).json({ message: "User Already Exist" });
      return;
    }

    const { name, password } = req.body;

    const salt = await generateSalt(10);
    const hashedPassword = await hashPassword(password!, salt);
    const user = await prisma.user.create({
      data: {
        email: email!,
        name: name!,
        password: hashedPassword,
        salt: salt,
      },
    });

    // Merge guest cart if applicable
    if (req.user?.role === "guest") {
      await mergeGuestCart(req.user.uid, user.id);
    }

    const token = generateToken(
      {
        uid: user.id,
        isAdmin: user.isAdmin,
        role: user.isAdmin ? "admin" : "user",
      },
      "5d"
    );

    res
      .status(200)
      .cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 5 * 24 * 60 * 60 * 1000,
      })
      .json({
        message: "Signup successful",
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      });
  } catch (error) {
    res.status(500).json({ message: "Internal server error", error });
  }
};

//user signin Controller
export const handleUserSignin = async (req: AuthRequest, res: Response) => {
  try {
    const email = req.body;

    const existingUser = await findUserByEmail(email);

    if (!existingUser) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const { password } = req.body;

    // Check password
    const isPasswordCorrect = await comparePassword(password, existingUser.password);
    if (!isPasswordCorrect) {
       res.status(401).json({ message: "Unauthorized: Incorrect password" });
       return
    }

    // Merge guest cart if applicable
    if (req.user?.role === "guest") {
      await mergeGuestCart(req.user.uid, existingUser.id);
    }


    const token = generateToken(
      {
        uid: existingUser?.id,
        isAdmin: existingUser?.isAdmin,
        role: existingUser?.isAdmin ? "admin" : "user",
      },
      "5d"
    );

    res
      .status(200)
      .cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 5 * 24 * 60 * 60 * 1000,
      })
      .json({
        message: "Signin successful",
        user: {
          id: existingUser?.id,
          email: existingUser?.email,
          name: existingUser?.name,
        },
      });
  } catch (error) {
    res.status(500).json({ message: "Internal server error", error });
  }
};

//check existingUser in the database for query
export const queryExistingUserCheck = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const uid = req.user?.uid;

    if (!uid) {
      res.status(400).json({ message: "Uid is required" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: uid },
    });

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    next();
  } catch (error) {
    res.status(500).json({ message: "Internal server error", error });
  }
};

// Change user name
export const handleUserName = async (req: AuthRequest, res: Response) => {
  try {
    const { name } = req.body;

    // Validate name
    if (!name || typeof name !== "string" || name.trim().length < 2) {
      res.status(400).json({ message: "Invalid name" });
      return;
    }

    const uid = req.user?.uid;

    if (!uid) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id: uid },
      data: { name },
    });

    res.status(200).json({
      message: "Name changed successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Failed to update user name:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
