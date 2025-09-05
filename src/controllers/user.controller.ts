import dotenv from "dotenv";
import crypto from "crypto";
import { Request, Response, NextFunction } from "express";
import { AuthRequest } from "../types/customTypes";
import prisma from "../config/prisma";
import {
  findUserByEmail,
  findUserById,
  findUserByPhone,
} from "../services/user.service";
import { redisApp, redisOtp } from "../config/redis";
import { createOrderWithPaymentMethod } from "../services/create.order.service";
import { createCloverOrder } from "../services/upi.qr.payment.services";
import { emailSchema, indianPhoneNumberSchema } from "../utils/inputValidation";
import { generateOTP } from "../utils/otp";
import { sendOtpSms } from "../services/otp.service";
import { comparePassword, generateSalt, hashPassword } from "../utils/hash";

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

//
// USER
//

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
        createdAt: true,
      },
    });
    if (!user) {
      const error = new Error("User not found") as any;
      error.statusCode = 404;
      throw error;
    }

    res.status(200).json({
      success: true,
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

    if (!name || typeof name !== "string" || name.trim().length < 3) {
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
      select: {
        name: true,
        email: true,
        phone: true,
        createdAt: true,
      },
    });

    res.status(200).json({
      success: true,
      message: "Name changed successfully",
      user: updatedUser,
    });
  } catch (err) {
    next(err);
  }
};

// send otp to update email
export const updateEmailVerify = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email } = req.body;
    const parsedEmail = emailSchema.safeParse(email);
    if (!parsedEmail.success) {
      throw {
        statusCode: 400,
        message: "Invalid email format",
        errors: parsedEmail.error.flatten().fieldErrors,
      };
    }

    if (await findUserByEmail(email)) {
      const error = new Error("User Email Already Exist") as any;
      error.statusCode = 409;
      throw error;
    }

    const uid = req.user?.uid;
    const phone = req.userData?.phone;

    if (!uid || !phone) {
      const error = new Error("Unauthorized") as any;
      error.statusCode = 401;
      throw error;
    }

    await redisOtp.set(
      `updateEmail:${phone}`,
      JSON.stringify(email),
      "EX",
      360
    );

    const otp = generateOTP();
    await redisOtp.set(`emailupdateotp:${phone}`, otp, "EX", 300);

    const sent = await sendOtpSms(phone, otp);
    if (!sent) {
      const error = new Error("Failed to send OTP") as any;
      error.statusCode = 500;
      throw error;
    }

    res
      .status(200)
      .json({ success: true, message: "OTP sent to your phone no." });
    return;
  } catch (err) {
    next(err);
  }
};

// verify otp to update email
export const updateEmailVeried = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { otp } = req.body;

    const uid = req.user?.uid;
    const phone = req.userData?.phone;

    if (!phone) {
      const error = new Error("Unauthorized") as any;
      error.statusCode = 401;
      throw error;
    }

    const redisOtpKey = `emailupdateotp:${phone}`;
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

    const redisUserEmailKey = `updateEmail:${phone}`;
    const userEmailRaw = await redisOtp.get(redisUserEmailKey);

    if (!userEmailRaw) {
      const error = new Error(
        "Update email session expired. Please try again."
      ) as any;
      error.statusCode = 410;
      throw error;
    }

    const email = JSON.parse(userEmailRaw);
    const updatedUser = await prisma.user.update({
      where: { id: uid },
      data: { email },
      select: {
        name: true,
        email: true,
        phone: true,
        createdAt: true,
      },
    });
    res.status(200).json({
      success: true,
      message: "Email Updated Successfully",
      user: updatedUser,
    });
    return;
  } catch (err) {
    next(err);
  }
};

// send otp to update phone
export const updatePhoneVerify = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { phone } = req.body;
    const parsedPhone = indianPhoneNumberSchema.safeParse(phone);
    if (!parsedPhone.success) {
      throw {
        statusCode: 400,
        message: "Invalid phone format",
        errors: parsedPhone.error.flatten().fieldErrors,
      };
    }

    if (await findUserByPhone(phone)) {
      const error = new Error("User Phone Already Exist") as any;
      error.statusCode = 409;
      throw error;
    }

    const uid = req.user?.uid;
    const previousPhone = req.userData?.phone;

    if (!uid || !previousPhone) {
      const error = new Error("Unauthorized") as any;
      error.statusCode = 401;
      throw error;
    }

    await redisOtp.set(
      `updatephone:${previousPhone}`,
      JSON.stringify(phone),
      "EX",
      360
    );

    const otp = generateOTP();
    await redisOtp.set(`phoneupdateotp:${previousPhone}`, otp, "EX", 300);

    const sent = await sendOtpSms(phone, otp);
    if (!sent) {
      const error = new Error("Failed to send OTP") as any;
      error.statusCode = 500;
      throw error;
    }

    res
      .status(200)
      .json({ success: true, message: "OTP sent to your new phone no." });
    return;
  } catch (err) {
    next(err);
  }
};

// verify otp to update email
export const updatePhoneVeried = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { otp } = req.body;

    const uid = req.user?.uid;
    const phone = req.userData?.phone;

    if (!phone) {
      const error = new Error("Unauthorized") as any;
      error.statusCode = 401;
      throw error;
    }

    const redisOtpKey = `phoneupdateotp:${phone}`;
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

    const redisUserPhoneKey = `updatephone:${phone}`;
    const userPhoneRaw = await redisOtp.get(redisUserPhoneKey);

    if (!userPhoneRaw) {
      const error = new Error(
        "Update phone session expired. Please try again."
      ) as any;
      error.statusCode = 410;
      throw error;
    }

    const newPhone = JSON.parse(userPhoneRaw);
    const updatedUser = await prisma.user.update({
      where: { id: uid },
      data: { phone: newPhone },
      select: {
        name: true,
        email: true,
        phone: true,
        createdAt: true,
      },
    });
    res.status(200).json({
      success: true,
      message: "Phone Updated Successfully",
      user: updatedUser,
    });
    return;
  } catch (err) {
    next(err);
  }
};

// change password
export const changePassword = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const hashedOldPassword = req.userData?.password;

    if (!hashedOldPassword) {
      const error = new Error("Something went wrong") as any;
      error.statusCode = 500;
      throw error;
    }

    const result = await comparePassword(currentPassword, hashedOldPassword);

    if (!result) {
      const error = new Error("Your Current Password is Wrong") as any;
      error.statusCode = 401;
      throw error;
    }

    const salt = await generateSalt(10);
    const hashedNewPassword = await hashPassword(newPassword, salt);

    const uid = req.user?.uid;
    const updatedUser = await prisma.user.update({
      where: { id: uid },
      data: { password: hashedNewPassword, salt },
      select: {
        name: true,
        email: true,
        phone: true,
        createdAt: true,
      },
    });
    res.status(200).json({
      success: true,
      message: "Password Changed Successfully",
      user: updatedUser,
    });
    return;
  } catch (err) {
    next(err);
  }
};

//
// WISHLIST
//

// add or remove a product to wishlist
export const handleToggleWishlist = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id: productId } = req.params;
    const uid = req.user?.uid;

    if (!uid) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const existing = await prisma.wishlistItem.findFirst({
      where: { userId: uid, productId },
    });

    if (existing) {
      // Remove from wishlist
      await prisma.wishlistItem.delete({
        where: { id: existing.id },
      });

      res.status(200).json({
        success: true,
        message: "Removed from wishlist",
        removed: true,
      });
      return;
    } else {
      // Add to wishlist
      const wishlist = await prisma.wishlistItem.create({
        data: { userId: uid, productId },
      });

      res.status(200).json({
        success: true,
        message: "Added to wishlist",
        wishlist,
        removed: false,
      });
      return;
    }
  } catch (err) {
    next(err);
  }
};

// get wishlisted ids for products
export const getWishlistedProductIds = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const uid = req.user!.uid;

    const items = await prisma.wishlistItem.findMany({
      where: { userId: uid },
      select: { productId: true },
    });

    const wishlistedIds = items.map((item) => item.productId);

    res.status(200).json({ success: true, wishlistedIds });
  } catch (error) {
    next(error);
  }
};

// get wislisted product of a user
export const getWishlist = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const uid = req.user!.uid;

    const wishlist = await prisma.wishlistItem.findMany({
      where: { userId: uid },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            originalPrice: true,
            discountedPrice: true,
            images: {
              where: { isMain: true },
              select: {
                imageUrl: true,
                altText: true,
              },
            },
            productSizes: {
              select: {
                stock: true,
              },
            },
          },
        },
      },
    });

    // Transform the data to include only necessary fields with stock status
    const products = wishlist.map((item) => {
      const totalStock = item.product.productSizes.reduce(
        (sum, size) => sum + size.stock,
        0
      );

      return {
        id: item.product.id,
        name: item.product.name,
        originalPrice: item.product.originalPrice,
        discountedPrice: item.product.discountedPrice,
        mainImage: item.product.images[0] || null,
        inStock: totalStock > 0,
        wishlistItemId: item.id,
      };
    });

    res.status(200).json({ success: true, products });
  } catch (error) {
    next(error);
  }
};

//
// ADDRESS
//

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
      success: true,
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
      success: true,
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
      success: true,
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

    res
      .status(200)
      .json({ success: true, message: "Default address updated successfully" });
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

    res
      .status(200)
      .json({ success: true, message: "Address deleted successfully" });
  } catch (err) {
    next(err);
  }
};

//
// ORDER
//

// upi qr payment
export const upiQrPaymentController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { order, pricingResult, reservedItems } =
      await createOrderWithPaymentMethod(req, "UPI");

    // 1. Generate unique verification token (remark1)
    const verificationToken = crypto.randomBytes(16).toString("hex");

    // 2. Save mapping in Redis (per-order snapshot)
    //    TTL matches payment timeout (30 mins + buffer)
    await redisApp.set(
      `order:reservation:${verificationToken}`,
      JSON.stringify({
        orderId: order.id,
        userId: req.userData!.id,
        amount: pricingResult.finalTotal,
        items: reservedItems,
      }),
      "EX",
      60 * 35
    );

    // Create payment record in DB
    await prisma.payment.create({
      data: {
        orderId: order.id,
        method: "UPI",
        status: "PENDING",
      },
    });

    // 3. Call Clover create-order API
    const cloverOrder = await createCloverOrder(
      order.customerPhone, // customer_mobile
      pricingResult.finalTotal, // amount
      order.id, // order_id
      verificationToken // remark1
    );
    // 4. Respond to client
    res.status(200).json({
      success: true,
      orderId: order.id,
      amount: pricingResult.finalTotal,
      paymentUrl: cloverOrder.payment_url,
    });
  } catch (err) {
    next(err);
  }
};

export const cashOnDeliveryController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { order, pricingResult } = await createOrderWithPaymentMethod(
      req,
      "COD"
    );

    // Create payment record in DB
    await prisma.payment.create({
      data: {
        orderId: order.id,
        method: "COD",
        status: "COMPLETED",
      },
    });

    // Respond to client
    res.status(200).json({
      success: true,
      orderId: order.id,
      amount: pricingResult.finalTotal,
      message:
        "Order placed successfully. Payment will be collected on delivery.",
    });
  } catch (err) {
    next(err);
  }
};

export const getAllOrder = async (
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

    const order = await prisma.order.findMany({
      where: { userId: uid },
      orderBy: { createdAt: "desc" }, // optional: newest first
      select: {
        id: true,
        totalAmount: true,
        status: true,
        createdAt: true,
        payment: {
          select: {
            status: true,
            method: true,
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      message: "Order fetched successfully",
      order,
    });
  } catch (err) {
    next(err);
  }
};

export const getOrderDetails = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const uid = req.user?.uid;
    const orderId = req.params.orderId;
    if (!uid) {
      const error = new Error("Unauthorized") as any;
      error.statusCode = 401;
      throw error;
    }
    if (!orderId || typeof orderId !== "string") {
      const error = new Error("Order id is necessary") as any;
      error.statusCode = 400; // 400 is better for bad request
      throw error;
    }

    const orderDetails = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        totalAmount: true,
        status: true,
        createdAt: true,

        customerName: true,
        customerEmail: true,
        customerPhone: true,

        shippingFullName: true,
        shippingPhone: true,
        shippingLine1: true,
        shippingLine2: true,
        shippingCity: true,
        shippingState: true,
        shippingCountry: true,
        shippingZipCode: true,

        payment: {
          select: {
            status: true,
            method: true,
          },
        },
        orderItems: {
          select: {
            id: true,
            orderId: true,
            productId: true,
            stockName: true,
            quantity: true,
            price: true,
            productName: true,
            productDescription: true,
            productImageUrl: true,
            productCategory: true,
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      message: "Order Details fetched successfully",
      orderDetails,
    });
  } catch (err) {
    next(err);
  }
};
