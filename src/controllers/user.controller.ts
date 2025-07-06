import { Request, Response, NextFunction } from "express";
import { comparePassword, generateSalt, hashPassword } from "../utils/hash";
import dotenv from "dotenv";
import { generateToken } from "../utils/tokens";
import { AuthRequest, UserExtend } from "../types/customTypes";
import { mergeGuestCart } from "../services/guest.cart.services";
import { findUserByEmail, findUserByPhone } from "../services/user.service";
import redis from "../config/redis";
import { generateOTP } from "../utils/otp";
import { sendOtpSms } from "../services/otp.service";
import prisma from "../config/prisma"

dotenv.config();


// signup route : add user data to redis and send otp to verify
export const handleUserSignUpVerify = async (
  req: AuthRequest,
  res: Response
) => {
  const { email, phone, name, password } = req.body;

  const existingUserByEmail = await findUserByEmail(email);
  if (existingUserByEmail) {
    throw { status: 409, message: "User Email Already Exist" };
  }

  const existingUserByPhone = await findUserByPhone(phone);
  if (existingUserByPhone) {
    throw { status: 409, message: "User Phone Already Exist" };
  }

  const salt = await generateSalt(10);
  const hashedPassword = await hashPassword(password!, salt);

  const userData = {
    email,
    phone,
    name,
    password: hashedPassword,
    salt,
  };

  const redisKey = `signup:${phone}`;
  await redis.set(redisKey, JSON.stringify(userData), { EX: 360 });

  const otp = generateOTP();
  await redis.set(`otp:${phone}`, otp, { EX: 300 });

  const sent = await sendOtpSms(phone, otp);
  if (!sent) {
    throw { status: 500, message: "Failed to send OTP" };
  }

  res.status(200).json({ message: "OTP sent to your phone" });
};

// signup route : otp verification and add user to database from redis
export const handleVerifiedUserSignup = async (
  req: AuthRequest,
  res: Response
) => {
  const { phone, otp } = req.body;

  const redisOtpKey = `otp:${phone}`;
  const storedOtp = await redis.get(redisOtpKey);

  if (!storedOtp) {
    throw { status: 410, message: "OTP expired or not found" };
  }

  if (storedOtp !== otp) {
    throw { status: 401, message: "Invalid OTP" };
  }

  const redisUserKey = `signup:${phone}`;
  const userDataRaw = await redis.get(redisUserKey);

  if (!userDataRaw) {
    throw {
      status: 410,
      message: "Signup session expired. Please register again.",
    };
  }

  const { email, name, password, salt } = JSON.parse(userDataRaw);

  // Edge-case re-checks
  if (await findUserByEmail(email)) {
    throw { status: 409, message: "Email already exists" };
  }

  if (await findUserByPhone(phone)) {
    throw { status: 409, message: "Phone already exists" };
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

  await redis.del(redisOtpKey);
  await redis.del(redisUserKey);

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
};

// signin route : user signin with password Controller
export const handleUserSignin = async (req: AuthRequest, res: Response) => {
  const { identifierType, email, phone, password } = req.body;

  let existingUser;

  if (identifierType === "email" && email) {
    existingUser = await findUserByEmail(email);
  } else if (identifierType === "phone" && phone) {
    existingUser = await findUserByPhone(phone);
  }

  if (!existingUser) {
    throw { status: 404, message: "User not found" };
  }

  const isPasswordCorrect = await comparePassword(
    password,
    existingUser.password
  );

  if (!isPasswordCorrect) {
    throw { status: 401, message: "Unauthorized: Incorrect password" };
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
};

// signin route : user signin to sent otp Controller
export const handleOtpSigninInitiate = async (req: Request, res: Response) => {
  const { phone } = req.body;

  const existingUser = await findUserByPhone(phone);
  if (!existingUser) {
    throw { status: 404, message: "User not found. Please sign up first." };
  }

  const otp = generateOTP(); // e.g. 4 or 6 digit code
  const redisKey = `otp:${phone}`;
  await redis.set(redisKey, otp, { EX: 300 }); // expires in 5 minutes

  const sent = await sendOtpSms(phone, otp);
  if (!sent) {
    throw { status: 500, message: "Failed to send OTP. Please try again." };
  }

  res.status(200).json({ message: "OTP sent successfully" });
};

// signin route : user signin to verify otp Controller
export const handleUserSigninWithOtp = async (req: AuthRequest, res: Response) => {
  const { phone, otp } = req.body;

  const redisOtpKey = `otp:${phone}`;
  const storedOtp = await redis.get(redisOtpKey);

  if (!storedOtp) {
    throw { status: 410, message: "OTP expired or not found" };
  }

  if (storedOtp !== otp) {
    throw { status: 401, message: "Invalid OTP" };
  }

  const existingUser = await findUserByPhone(phone);
  if (!existingUser) {
    throw { status: 404, message: "User not found. Please sign up first." };
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
};

//check existingUser in the database for query
export const queryExistingUserCheck = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const uid = req.user?.uid;

  if (!uid) {
    throw { status: 400, message: "Uid is required" };
  }

  const user = await prisma.user.findUnique({
    where: { id: uid },
  });

  if (!user) {
    throw { status: 404, message: "User not found" };
  }

  next();
};

// Change user name
export const handleUserName = async (req: AuthRequest, res: Response) => {
  const { name } = req.body;

  if (!name || typeof name !== "string" || name.trim().length < 2) {
    throw { status: 400, message: "Invalid name" };
  }

  const uid = req.user?.uid;

  if (!uid) {
    throw { status: 401, message: "Unauthorized" };
  }

  const updatedUser = await prisma.user.update({
    where: { id: uid },
    data: { name },
  });

  res.status(200).json({
    message: "Name changed successfully",
    user: updatedUser,
  });
};
