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

// signup: initiate signup and send OTP
export const handleUserSignUpVerify = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, phone, name, password } = req.body;

    if (await findUserByEmail(email)) {
      const error = new Error("User Email Already Exist") as any;
      error.statusCode = 409;
      throw error;
    }

    if (await findUserByPhone(phone)) {
      const error = new Error("User Phone Already Exist") as any;
      error.statusCode = 409;
      throw error;
    }

    const salt = await generateSalt(10);
    const hashedPassword = await hashPassword(password!, salt);
    const userData = { email, phone, name, password: hashedPassword, salt };

    await redisOtp.set(`signup:${phone}`, JSON.stringify(userData), "EX", 360);
    const otp = generateOTP();
    await redisOtp.set(`otp:${phone}`, otp, "EX", 300);

    const sent = await sendOtpSms(phone, otp);
    if (!sent) {
      const error = new Error("Failed to send OTP") as any;
      error.statusCode = 500;
      throw error;
    }

    res.status(200).json({ message: "OTP sent to your phone" });
  } catch (err) {
    next(err);
  }
};

// resend OTP during signup
export const handleResendSignupOtp = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      const error = new Error("Phone number is required") as any;
      error.statusCode = 400;
      throw error;
    }

    const redisUserKey = `signup:${phone}`;
    const userDataRaw = await redisOtp.get(redisUserKey);

    if (!userDataRaw) {
      const error = new Error(
        "Signup session expired. Please start over."
      ) as any;
      error.statusCode = 410;
      throw error;
    }

    await redisOtp.set(redisUserKey, userDataRaw, "EX", 360);

    const newOtp = generateOTP();
    await redisOtp.set(`otp:${phone}`, newOtp, "EX", 300);

    const sent = await sendOtpSms(phone, newOtp);
    if (!sent) {
      const error = new Error("Failed to send OTP") as any;
      error.statusCode = 500;
      throw error;
    }

    res.status(200).json({ message: "OTP resent successfully" });
  } catch (err) {
    next(err);
  }
};

// confirm signup with OTP
export const handleVerifiedUserSignup = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { phone, otp } = req.body;

    const redisOtpKey = `otp:${phone}`;
    const storedOtp = await redisOtp.get(redisOtpKey);

    if (!storedOtp) {
      const error = new Error("OTP expired or not found") as any;
      error.statusCode = 410;
      throw error;
    }

    if (storedOtp !== otp) {
      const error = new Error("Invalid OTP") as any;
      error.statusCode = 401;
      throw error;
    }

    const redisUserKey = `signup:${phone}`;
    const userDataRaw = await redisOtp.get(redisUserKey);

    if (!userDataRaw) {
      const error = new Error(
        "Signup session expired. Please register again."
      ) as any;
      error.statusCode = 410;
      throw error;
    }

    const { email, name, password, salt } = JSON.parse(userDataRaw);

    if (await findUserByEmail(email)) {
      const error = new Error("Email already exists") as any;
      error.statusCode = 409;
      throw error;
    }

    if (await findUserByPhone(phone)) {
      const error = new Error("Phone already exists") as any;
      error.statusCode = 409;
      throw error;
    }

    const user = await prisma.user.create({
      data: { email, phone, name, password, salt },
    });

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

    await redisOtp.del(redisOtpKey);
    await redisOtp.del(redisUserKey);

    res
      .status(200)
      .cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        maxAge: 5 * 24 * 60 * 60 * 1000,
      })
      .json({
        message: "Signup successful",
        user: { id: user.id, email: user.email, name: user.name },
      });
  } catch (err) {
    next(err);
  }
};

// signin with password
export const handleUserSignin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { identifierType, email, phone, password } = req.body;

    let existingUser;
    if (identifierType === "email" && email) {
      existingUser = await findUserByEmail(email);
    } else if (identifierType === "phone" && phone) {
      existingUser = await findUserByPhone(phone);
    }

    if (!existingUser) {
      const error = new Error("User not found") as any;
      error.statusCode = 404;
      throw error;
    }

    const isPasswordCorrect = await comparePassword(
      password,
      existingUser.password
    );
    if (!isPasswordCorrect) {
      const error = new Error("Unauthorized: Incorrect password") as any;
      error.statusCode = 401;
      throw error;
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

    res
      .status(200)
      .cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
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
  } catch (err) {
    next(err);
  }
};

// initiate signin with OTP
export const handleOtpSigninInitiate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { phone } = req.body;

    const existingUser = await findUserByPhone(phone);
    if (!existingUser) {
      const error = new Error("User not found. Please sign up first.") as any;
      error.statusCode = 404;
      throw error;
    }

    const otp = generateOTP();
    await redisOtp.set(`otp:${phone}`, otp, "EX", 300);

    const sent = await sendOtpSms(phone, otp);
    if (!sent) {
      const error = new Error("Failed to send OTP. Please try again.") as any;
      error.statusCode = 500;
      throw error;
    }

    res.status(200).json({ message: "OTP sent successfully" });
  } catch (err) {
    next(err);
  }
};

// confirm signin with OTP
export const handleUserSigninWithOtp = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { phone, otp } = req.body;

    const redisOtpKey = `otp:${phone}`;
    const storedOtp = await redisOtp.get(redisOtpKey);

    if (!storedOtp) {
      const error = new Error("OTP expired or not found") as any;
      error.statusCode = 410;
      throw error;
    }

    if (storedOtp !== otp) {
      const error = new Error("Invalid OTP") as any;
      error.statusCode = 401;
      throw error;
    }

    const existingUser = await findUserByPhone(phone);
    if (!existingUser) {
      const error = new Error("User not found. Please sign up first.") as any;
      error.statusCode = 404;
      throw error;
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

    await redisOtp.del(redisOtpKey);

    res
      .status(200)
      .cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        maxAge: 5 * 24 * 60 * 60 * 1000,
      })
      .json({
        message: "Signin successful",
        user: {
          id: existingUser.id,
          email: existingUser.email,
          name: existingUser.name,
          role: existingUser.isAdmin ? "admin" : "user",
        },
      });
  } catch (err) {
    next(err);
  }
};

export const logoutUser = (req: Request, res: Response) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  });
  res.status(200).json({ message: "Logged out" });
  return;
};
