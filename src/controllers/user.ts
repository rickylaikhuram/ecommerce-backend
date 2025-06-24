import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import { generateSalt, hashPassword } from "../utils/hash";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import { generateToken } from "../utils/tokens";
import { UserExtend } from "../types/customTypes";

dotenv.config();

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET as string;


//check existingUser in the database
export const existingUserCheck =
  (mode: "signup" | "signin") =>
  async (req: UserExtend, res: Response, next: NextFunction) => {
    try {
      const { email } = req.body;

      if (!email) {
        res.status(400).json({ message: "Email is required" });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (mode === "signup" && user) {
        res.status(403).json({ message: "Email already registered" });
        return;
      }

      if (mode === "signin" && !user) {
        res.status(404).json({ message: "Email not found" });
        return;
      }

      req.user = user || undefined;

      next();
    } catch (error) {
      res.status(500).json({ message: "Internal server error", error });
    }
  };

//user signup Controller
export const handleUserSignup = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

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

    const token = generateToken({ uid: user.id, isAdmin: user.isAdmin }, "5d");

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
export const handleUserSignin = async (req: UserExtend, res: Response) => {
  try {
    const { password } = req.body;
    const user = req.user

    const hashedPassword = await hashPassword(password!, user?.salt!);

    if(hashedPassword!==user?.password){
      res.status(401).json({message:"Unauthorized, Password is Wrong"})
      return
    }

    const token = generateToken({ uid: user.id, isAdmin: user.isAdmin }, "5d");

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
          id: user.id,
          email: user.email,
          name: user.name,
        },
      });
  } catch (error) {
    res.status(500).json({ message: "Internal server error", error });
  }
};
