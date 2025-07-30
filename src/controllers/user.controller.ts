import { Request, Response, NextFunction } from "express";
import { AuthRequest } from "../types/customTypes";
import dotenv from "dotenv";
import prisma from "../config/prisma";
import { findUserById } from "../services/user.service";
// import { comparePassword, generateSalt, hashPassword } from "../utils/hash";
// import { generateToken } from "../utils/tokens";
// import { mergeGuestCart } from "../services/guest.cart.services";
// import { findUserByEmail, findUserByPhone } from "../services/user.service";
// import { redisOtp } from "../config/redis";
// import { generateOTP } from "../utils/otp";
// import { sendOtpSms } from "../services/otp.service";

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
      const error = new Error("Unauthorized") as any;
      error.statusCode = 401;
      throw error;
    }

    const user = await findUserById(uid);

    if (!user) {
      const error = new Error("User does not exist or is deleted") as any;
      error.statusCode = 401;
      throw error;
    }

    // Optional: attach full user to request
    req.userData = user;

    next();
  } catch (err) {
    next(err);
  }
};

// get existing user
export const handleGettingUserProfile = async (
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

    const user = await prisma.user.findUnique({
      where: { id: uid },
      select: {
        name: true,
        email: true,
        phone: true,
        // createdAt: true
      },
    });
    if (!user) {
      const error = new Error("User not found") as any;
      error.statusCode = 404;
      throw error;
    }

    res.status(200).json({
      message: "Get User Sucessfully",
      user,
    });
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

// add user address
export const createAddress = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const uid = req.user?.uid;

    if (!uid) {
      const error = new Error("Unauthorized") as any;
      error.statusCode = 401;
      throw error;
    }

    const {
      fullName,
      phone,
      alternatePhone = null,
      line1,
      line2 = null,
      landmark = null,
      city,
      state,
      country,
      zipCode,
      label = null,
      isDefault = false,
    } = req.body.address;

    const result = await prisma.$transaction(async (tx) => {
      if (isDefault) {
        // Unset previous default addresses
        await tx.address.updateMany({
          where: {
            userId: uid,
            isDefault: true,
          },
          data: {
            isDefault: false,
          },
        });
      }

      // Create new address
      const newAddress = await tx.address.create({
        data: {
          fullName,
          phone,
          alternatePhone,
          line1,
          line2,
          landmark,
          city,
          state,
          country,
          zipCode,
          label,
          isDefault,
          userId: uid,
        },
      });

      return newAddress;
    });

    res.status(201).json({
      message: "Address created successfully",
      address: result,
    });
  } catch (err) {
    next(err);
  }
};

// get user all addresses
export const getAllAddresses = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const uid = req.user?.uid;

    if (!uid) {
      const error = new Error("Unauthorized") as any;
      error.statusCode = 401;
      throw error;
    }

    const addresses = await prisma.address.findMany({
      where: { userId: uid },
      orderBy: { createdAt: "desc" }, // optional: newest first
    });

    res.status(200).json({
      message: "Addresses fetched successfully",
      addresses,
    });
  } catch (err) {
    next(err);
  }
};

// update all the field for address
export const putEditAddress = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const uid = req.user?.uid;
    const addressId = req.params.id;

    if (!uid) {
      const error = new Error("Unauthorized") as any;
      error.statusCode = 401;
      throw error;
    }

    const {
      fullName,
      phone,
      alternatePhone = null,
      line1,
      line2 = null,
      landmark = null,
      city,
      state,
      country,
      zipCode,
      label = null,
      isDefault = false,
    } = req.body.address;
    console.log(req.body.address)
    const address = await prisma.address.findUnique({
      where: { id: addressId },
    });

    if (!address || address.userId !== uid) {
      const error = new Error("Address not found or unauthorized") as any;
      error.statusCode = 404;
      throw error;
    }

    const result = await prisma.$transaction(async (tx) => {
      if (isDefault) {
        await tx.address.updateMany({
          where: { userId: uid, isDefault: true },
          data: { isDefault: false },
        });
      }

      return await tx.address.update({
        where: { id: addressId },
        data: {
          fullName,
          phone,
          alternatePhone,
          line1,
          line2,
          landmark,
          city,
          state,
          country,
          zipCode,
          label,
          isDefault,
        },
      });
    });

    res.status(200).json({
      message: "Address updated successfully",
      address: result,
    });
  } catch (err) {
    next(err);
  }
};

// update isDefalut Address
export const patchIsDefaultAddress = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const uid = req.user?.uid;
    const addressId = req.params.id;

    if (!uid) {
      const error = new Error("Unauthorized") as any;
      error.statusCode = 401;
      throw error;
    }

    // Check if the address belongs to the user
    const address = await prisma.address.findUnique({
      where: { id: addressId },
    });

    if (!address || address.userId !== uid) {
      const error = new Error("Address not found or unauthorized") as any;
      error.statusCode = 404;
      throw error;
    }

    // Begin transaction to set all others to false and this one to true
    await prisma.$transaction([
      prisma.address.updateMany({
        where: { userId: uid, isDefault: true },
        data: { isDefault: false },
      }),
      prisma.address.update({
        where: { id: addressId },
        data: { isDefault: true },
      }),
    ]);

    res.status(200).json({
      message: "Default address updated successfully",
    });
  } catch (err) {
    next(err);
  }
};

// delete address
export const deleteAddress = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const uid = req.user?.uid;
    const addressId = req.params.id;

    if (!uid) {
      const error = new Error("Unauthorized") as any;
      error.statusCode = 401;
      throw error;
    }

    // Find the address and verify ownership
    const address = await prisma.address.findUnique({
      where: { id: addressId },
    });

    if (!address || address.userId !== uid) {
      const error = new Error("Address not found or unauthorized") as any;
      error.statusCode = 404;
      throw error;
    }

    // Delete the address
    await prisma.address.delete({
      where: { id: addressId },
    });

    res.status(200).json({
      message: "Address deleted successfully",
    });
  } catch (err) {
    next(err);
  }
};
