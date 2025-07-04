import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import { comparePassword, generateSalt, hashPassword } from "../utils/hash";
import dotenv from "dotenv";
import { generateToken } from "../utils/tokens";
import { AuthRequest, UserExtend } from "../types/customTypes";
import { mergeGuestCart } from "../services/guest.cart.services";
import { findUserByEmail, findUserByPhone } from "../services/user.service";
import redis from "../config/redis";
import { generateOTP } from "../utils/otp";
import { sendOtpSms } from "../services/otp.service";

dotenv.config();

const prisma = new PrismaClient();

// signup route : add user data to redis and send otp to verify
export const handleUserSignUpVerify = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, phone } = req.body;

    const existingUserByEmail = await findUserByEmail(email);

    if (existingUserByEmail) {
      res.status(404).json({ message: "User Email Already Exist" });
      return;
    }

    const existingUserByPhone = await findUserByPhone(phone);

    if (existingUserByPhone) {
      res.status(404).json({ message: "User Phone Already Exist" });
      return;
    }

    const { name, password } = req.body;

    const salt = await generateSalt(10);
    const hashedPassword = await hashPassword(password!, salt);
    // Prepare user data
    const userData = {
      email,
      phone,
      name,
      password: hashedPassword,
      salt,
    };

    // Store in Redis with TTL (6 minutes = 360 sec)
    const redisKey = `signup:${phone}`;
    await redis.set(redisKey, JSON.stringify(userData), { EX: 360 });

    // Generate and send OTP
    const otp = generateOTP();
    await redis.set(`otp:${phone}`, otp, { EX: 300 });

    const sent = await sendOtpSms(phone, otp);
    if (!sent) {
      res.status(500).json({ message: "Failed to send OTP" });
      return;
    }

    res.status(200).json({ message: "OTP sent to your phone" });
    return;
  } catch (error) {
    res.status(500).json({ message: "Internal server error", error });
  }
};

// signup route : otp verification and add user to database from redis
export const handleVerifiedUserSignup = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const { phone, otp } = req.body;

    // Validate OTP
    const redisOtpKey = `otp:${phone}`;
    const storedOtp = await redis.get(redisOtpKey);

    if (!storedOtp) {
      res.status(410).json({ message: "OTP expired or not found" });
      return;
    }

    if (storedOtp !== otp) {
      res.status(401).json({ message: "Invalid OTP" });
      return;
    }

    // Fetch user data from Redis
    const redisUserKey = `signup:${phone}`;
    const userDataRaw = await redis.get(redisUserKey);

    if (!userDataRaw) {
      res
        .status(410)
        .json({ message: "Signup session expired. Please register again." });
      return;
    }

    const { email, name, password, salt } = JSON.parse(userDataRaw);

    // Check again for existing users (edge-case)
    const existingUserByEmail = await findUserByEmail(email);
    if (existingUserByEmail) {
      res.status(409).json({ message: "Email already exists" });
      return;
    }

    const existingUserByPhone = await findUserByPhone(phone);
    if (existingUserByPhone) {
      res.status(409).json({ message: "Phone already exists" });
      return;
    }

    // Save to DB
    const user = await prisma.user.create({
      data: {
        email,
        phone,
        name,
        password,
        salt,
      },
    });

    // Optional: Merge cart if user was a guest
    if (req.user?.role === "guest") {
      await mergeGuestCart(req.user.uid, user.id);
    }

    // Generate token
    const token = generateToken(
      {
        uid: user.id,
        isAdmin: user.isAdmin,
        role: user.isAdmin ? "admin" : "user",
      },
      "5d"
    );

    //  Clean up Redis
    await redis.del(redisOtpKey);
    await redis.del(redisUserKey);

    // Send response
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
    return;
  } catch (error) {
    console.error("Signup verification failed:", error);
    res.status(500).json({ message: "Internal server error", error });
    return;
  }
};

// signin route : user signin with password Controller
export const handleUserSignin = async (req: AuthRequest, res: Response) => {
  try {
    const { identifierType, email, phone, password } = req.body;

    let existingUser;

    if (identifierType === "email" && email) {
      existingUser = await findUserByEmail(email);
    } else if (identifierType === "phone" && phone) {
      existingUser = await findUserByPhone(phone);
    }

    if (!existingUser) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const isPasswordCorrect = await comparePassword(
      password,
      existingUser.password
    );

    if (!isPasswordCorrect) {
      res.status(401).json({ message: "Unauthorized: Incorrect password" });
      return;
    }

    // Optional: Merge guest cart if user was browsing as guest
    if (req.user?.role === "guest") {
      await mergeGuestCart(req.user.uid, existingUser.id);
    }

    const token = generateToken(
      {
        uid: existingUser.id,
        isAdmin: existingUser.isAdmin,
        role: existingUser.isAdmin ? "admin" : "user",
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
          id: existingUser.id,
          name: existingUser.name,
          email: existingUser.email,
          phone: existingUser.phone,
        },
      });
    return;
  } catch (error) {
    console.error("Signin error:", error);
    res.status(500).json({ message: "Internal server error", error });
    return;
  }
};

// signin route : user signin to sent otp Controller
export const handleOtpSigninInitiate = async (req: Request, res: Response) => {
  const { phone } = req.body;

  try {
    const existingUser = await findUserByPhone(phone);
    if (!existingUser) {
      res
        .status(404)
        .json({ message: "User not found. Please sign up first." });
      return;
    }

    const otp = generateOTP(); // e.g. 4 or 6 digit code
    const redisKey = `otp:${phone}`;
    await redis.set(redisKey, otp, { EX: 300 }); // expires in 5 minutes

    const sent = await sendOtpSms(phone, otp);
    if (!sent) {
      res
        .status(500)
        .json({ message: "Failed to send OTP. Please try again." });
      return;
    }

    res.status(200).json({ message: "OTP sent successfully" });
    return;
  } catch (error) {
    console.error("OTP initiate error:", error);
    res.status(500).json({ message: "Internal server error", error });
    return;
  }
};

// signin route : user signin to verify otp Controller
export const handleUserSigninWithOtp = async (req: AuthRequest, res: Response) => {
  try {
    const { phone, otp } = req.body;

    const redisOtpKey = `otp:${phone}`;
    const storedOtp = await redis.get(redisOtpKey);

    if (!storedOtp) {
      res.status(410).json({ message: "OTP expired or not found" });
      return 
    }

    if (storedOtp !== otp) {
      res.status(401).json({ message: "Invalid OTP" });
      return 
    }

    const existingUser = await findUserByPhone(phone);
    if (!existingUser) {
      res.status(404).json({ message: "User not found. Please sign up first." });
      return 
    }

    if (req.user?.role === "guest") {
      await mergeGuestCart(req.user.uid, existingUser.id);
    }

    const token = generateToken(
      {
        uid: existingUser.id,
        isAdmin: existingUser.isAdmin,
        role: existingUser.isAdmin ? "admin" : "user",
      },
      "5d"
    );

    await redis.del(redisOtpKey);

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
          id: existingUser.id,
          email: existingUser.email,
          name: existingUser.name,
        },
      });
      return 
  } catch (error) {
    console.error("OTP Signin failed:", error);
    res.status(500).json({ message: "Internal server error", error });
    return 
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
