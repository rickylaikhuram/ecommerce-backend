import dotenv from "dotenv";
import crypto from "crypto";
import { Request, Response, NextFunction } from "express";
import { AuthRequest } from "../types/customTypes";
import prisma from "../config/prisma";
import { findUserById } from "../services/user.service";
import { redisApp } from "../config/redis";
import { createOrderAndReserveStock } from "../services/create.order.service";
import { createCloverOrder } from "../services/upi.qr.payment.services";

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
      res.status(401).json({ message: "Unauthorized" });
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

      res.status(200).json({ message: "Removed from wishlist", removed: true });
      return;
    } else {
      // Add to wishlist
      const wishlist = await prisma.wishlistItem.create({
        data: { userId: uid, productId },
      });

      res
        .status(200)
        .json({ message: "Added to wishlist", wishlist, removed: false });
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

    res.status(200).json({ wishlistedIds });
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

    res.status(200).json({ products });
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
    console.log(req.body.address);
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
      await createOrderAndReserveStock(req);
    // reservedItems = [{ productId, variant, quantity }, ...]

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
        method: "UPI_QR_CLOVER",
        status: "INITIATED",
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
