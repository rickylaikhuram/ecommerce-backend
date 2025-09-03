import { Request, Response } from "express";
import prisma from "../config/prisma";
import dotenv from "dotenv";
import { deleteS3File } from "../services/s3.service";
import { Prisma, OrderStatus } from "@prisma/client";
import { ImageToDelete } from "../types/admin.product.types";
import { redisApp } from "../config/redis";

dotenv.config();

//
// CATEGORY
//

// add category Controller
export const handleAddCategory = async (req: Request, res: Response) => {
  const { name, parentId, imageUrl, altText } = req.body;

  // If parentId is provided, validate parent exists
  if (parentId) {
    if (!imageUrl?.trim() || !altText?.trim()) {
      throw {
        statusCode: 400,
        message: "Subcategories must include an image and alt text.",
      };
    }

    const parentCategory = await prisma.category.findUnique({
      where: { id: parentId },
    });

    if (!parentCategory) {
      throw { statusCode: 404, message: "Parent category not found." };
    }

    // Check if subcategory already exists under this parent
    const existingSubCategory = await prisma.category.findFirst({
      where: {
        name: name.trim(),
        parentId: parentId,
      },
    });

    if (existingSubCategory) {
      throw {
        statusCode: 409,
        message:
          "A subcategory with this name already exists under the selected parent category.",
      };
    }
  } else {
    // Check if top-level category already exists
    const existingCategory = await prisma.category.findFirst({
      where: {
        name: name.trim(),
        parentId: null,
      },
    });

    if (existingCategory) {
      throw { statusCode: 409, message: "Category already exists" };
    }
  }

  // Create category/subcategory
  const createCategory = await prisma.category.create({
    data: {
      name: name.trim(),
      parentId: parentId || null,
      imageUrl: imageUrl || null,
      altText: altText || null,
    },
  });

  res.status(201).json({
    success: true,
    message: parentId
      ? "Subcategory created successfully."
      : "Category created successfully.",
    category: {
      id: createCategory.id,
      name: createCategory.name,
      parentId: createCategory.parentId,
      imageUrl: createCategory.imageUrl,
      altText: createCategory.altText,
    },
  });
};

// edit category Controller
export const handleEditCategory = async (req: Request, res: Response) => {
  const { name: categoryName } = req.body;
  const id = req.params.id;

  if (!categoryName) {
    throw { status: 403, message: "Need Category Name to edit" };
  }
  if (!id) {
    throw { status: 403, message: "Need Category ID to edit" };
  }

  const categoryExist = await prisma.category.findUnique({
    where: { id },
  });

  if (!categoryExist) {
    throw { status: 403, message: "Category doesn't exist" };
  }

  if (categoryExist.parentId) {
    throw {
      status: 403,
      message: "A Child category is not allowed in this route",
    };
  }

  const updatedCategory = await prisma.category.update({
    where: { id },
    data: {
      name: categoryName,
    },
  });

  const updatedCategoryWithChildren = await prisma.category.findUnique({
    where: { id: updatedCategory.id },
  });

  res.status(200).json({
    message: "Category updated successfully",
    category: {
      id: updatedCategoryWithChildren!.id,
      name: updatedCategoryWithChildren!.name,
    },
  });
};

// edit subcategory Controller
export const handleEditSubCategory = async (req: Request, res: Response) => {
  const {
    name,
    parentId,
    altText,
    deleteImage, // Boolean - true if user wants to delete existing image
    updatedImages, // Array with imageKey and altText (can be empty)
  } = req.body;

  const id = req.params.id;
  if (!id) {
    throw { status: 403, message: "Need Category ID to edit" };
  }

  // Check if category exists
  const categoryExist = await prisma.category.findUnique({
    where: { id },
  });

  if (!categoryExist) {
    throw { status: 403, message: "Category doesn't exist" };
  }

  // If parentId is provided, check if parent category exists
  if (parentId) {
    const parentCategoryExist = await prisma.category.findUnique({
      where: { id: parentId },
    });

    if (!parentCategoryExist) {
      throw { status: 403, message: "Parent category doesn't exist" };
    }
  }

  // Transaction to update category and handle image changes
  const result = await prisma.$transaction(
    async (tx: Prisma.TransactionClient) => {
      // 1. Handle image deletion if requested
      if (deleteImage && categoryExist.imageUrl) {
        // Delete from S3 in background
        deleteS3File(categoryExist.imageUrl).catch((error) => {
          console.error(
            `Failed to delete S3 file: ${categoryExist.imageUrl}`,
            error
          );
        });
      }

      // 2. Prepare category update data
      const updateData: any = {
        name,
        altText: altText || name,
      };

      // Handle parentId (can be null for top-level categories)
      if (parentId !== undefined) {
        updateData.parentId = parentId || null;
      }

      // 3. Handle image update/deletion
      if (deleteImage) {
        // If deleting image, set to null
        updateData.imageUrl = null;
        updateData.altText = name; // Reset altText to category name
      }

      // 4. Handle updated images (new image or keeping existing)
      if (updatedImages?.length > 0) {
        const imageToUpdate = updatedImages[0];
        if (imageToUpdate?.imageKey) {
          updateData.imageUrl = imageToUpdate.imageKey;
          updateData.altText = imageToUpdate.altText || name;
        }
      }

      // 5. Update the category with all changes
      const updatedCategory = await tx.category.update({
        where: { id: categoryExist.id },
        data: updateData,
      });

      return updatedCategory;
    }
  );

  // Get updated category with parent info for response
  const updatedCategoryWithParent = await prisma.category.findUnique({
    where: { id: result.id },
    include: {
      parent: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  res.status(200).json({
    message: "Category updated successfully",
    category: {
      id: updatedCategoryWithParent!.id,
      name: updatedCategoryWithParent!.name,
      altText: updatedCategoryWithParent!.altText,
      imageUrl: updatedCategoryWithParent!.imageUrl,
      parentId: updatedCategoryWithParent!.parentId,
      parentName: updatedCategoryWithParent!.parent?.name || null,
    },
  });
};

// get category Controller
export const handleGetCategory = async (req: Request, res: Response) => {
  // get all category
  const allCategory = await prisma.category.findMany({});

  res.status(200).json({
    message: "Get all Category successfully",
    category: allCategory,
  });
};

// get top level category Controller
export const handleGetTopLevelCategories = async (
  req: Request,
  res: Response
) => {
  const categories = await prisma.category.findMany({
    where: {
      parentId: null, // Only top-level categories
    },
    orderBy: {
      name: "asc",
    },
  });

  res.status(200).json({
    success: true,
    categories: categories,
  });
};

// get low level category Controller
export const handleGetLowLevelCategories = async (
  req: Request,
  res: Response
) => {
  try {
    // Get categories that are not parents of any other category
    const leafCategories = await prisma.category.findMany({
      where: {
        children: {
          none: {}, // No children
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    res.status(200).json({
      success: true,
      categories: leafCategories,
    });
  } catch (error) {
    console.error("Error fetching low-level categories:", error);
    throw {
      statusCode: 500,
      message: "Failed to fetch low-level categories",
    };
  }
};

//
// PRODUCT
//

//add product controller
export const handleAddProduct = async (req: Request, res: Response) => {
  const {
    category,
    name,
    description,
    originalPrice,
    discountedPrice,
    isActive,
    images,
    productStocks,
  } = req.body;

  // Check category exists
  const categoryExist = await prisma.category.findUnique({
    where: { name: category },
  });

  if (!categoryExist) {
    throw { status: 403, message: "Category doesn't exist" };
  }

  // Transaction to create product, images, and stocks
  const result = await prisma.$transaction(
    async (tx: Prisma.TransactionClient) => {
      const createdProduct = await tx.product.create({
        data: {
          name,
          description,
          discountedPrice,
          originalPrice,
          isActive,
          categoryId: categoryExist.id,
        },
      });

      if (images?.length > 0) {
        await tx.productImage.createMany({
          data: images.map((img: any) => ({
            imageUrl: img.imageKey,
            altText: img.altText || null,
            position: img.position || null,
            isMain: img.isMain || false,
            productId: createdProduct.id,
          })),
        });
      }

      if (productStocks?.length > 0) {
        await tx.productStock.createMany({
          data: productStocks.map((stock: any) => ({
            stockName: stock.stockName,
            stock: stock.stock,
            productId: createdProduct.id,
          })),
        });
      }

      return createdProduct;
    }
  );

  res.status(200).json({
    message: "Product created successfully",
    product: {
      name: result.name,
      description: result.description,
      price: result.originalPrice,
      fakePrice: result.discountedPrice,
      categoryName: categoryExist.name,
      isActive: result.isActive,
    },
  });
};

// edit product controller
export const handleEditProduct = async (req: Request, res: Response) => {
  const {
    category,
    name,
    description,
    originalPrice,
    discountedPrice,
    productStocks,
    isActive,
    deletedImages,
    updatedImages,
    newImages,
  } = req.body;

  const id = req.params.id;
  if (!id) {
    throw { status: 403, message: "Need Product ID to edit" };
  }
  // Check Product exists
  const productExist = await prisma.product.findUnique({
    where: { id },
    include: {
      images: true,
      productSizes: true,
    },
  });

  if (!productExist) {
    throw { status: 403, message: "Product doesn't exist" };
  }

  // Check category exists
  const categoryExist = await prisma.category.findUnique({
    where: { name: category },
  });

  if (!categoryExist) {
    throw { status: 403, message: "Category doesn't exist" };
  }

  // Transaction to update product, images, and stocks
  const result = await prisma.$transaction(
    async (tx: Prisma.TransactionClient) => {
      // 1. Update the main product data
      const updatedProduct = await tx.product.update({
        where: { id: productExist.id },
        data: {
          name,
          description,
          discountedPrice,
          originalPrice,
          isActive,
          categoryId: categoryExist.id,
        },
      });

      // 2. Handle deleted images
      if (deletedImages?.length > 0) {
        // Get the images to be deleted for S3 cleanup
        const imagesToDelete = await tx.productImage.findMany({
          where: {
            id: {
              in: deletedImages.map((img: any) => img.id),
            },
          },
          select: {
            imageUrl: true,
          },
        });

        // Delete from database
        await tx.productImage.deleteMany({
          where: {
            id: {
              in: deletedImages.map((img: any) => img.id),
            },
          },
        });

        // Delete from S3 (run in background)
        Promise.all(
          imagesToDelete.map(async (img: ImageToDelete) => {
            try {
              await deleteS3File(img.imageUrl);
            } catch (error) {
              console.error(`Failed to delete S3 file: ${img.imageUrl}`, error);
            }
          })
        ).catch((error) => {
          console.error("Error deleting S3 files:", error);
        });
      }

      // 3. Handle updated images
      if (updatedImages?.length > 0) {
        for (const img of updatedImages) {
          await tx.productImage.update({
            where: { id: img.id },
            data: {
              altText: img.altText || null,
              position: img.position || 0,
              isMain: img.isMain || false,
            },
          });
        }
      }

      // 4. Handle new images
      if (newImages?.length > 0) {
        await tx.productImage.createMany({
          data: newImages.map((img: any) => ({
            imageUrl: img.imageKey,
            altText: img.altText || null,
            position: img.position || 0,
            isMain: img.isMain || false,
            productId: productExist.id, // Use original ID
          })),
        });
      }

      // 5. Handle product stocks - FIXED: Use original ID
      if (productStocks?.length > 0) {
        // Delete all existing stocks
        await tx.productStock.deleteMany({
          where: { productId: productExist.id },
        });

        // Create new stocks
        await tx.productStock.createMany({
          data: productStocks.map((stock: any) => ({
            stockName: stock.stockName,
            stock: stock.stock,
            productId: productExist.id, // Use original ID
          })),
        });
      }

      return updatedProduct;
    }
  );

  res.status(200).json({
    message: "Product updated successfully",
    product: {
      id: result.id,
      name: result.name,
      description: result.description,
      originalPrice: result.originalPrice,
      discountedPrice: result.discountedPrice,
      categoryName: categoryExist.name,
      isActive: result.isActive,
    },
  });
};

// delete product Controller
export const handleDeleteProduct = async (req: Request, res: Response) => {
  const productId = req.params.productId;
  if (!productId || typeof productId !== "string") {
    throw { status: 403, message: "Need Product ID to get details" };
  }

  const productDetails = await prisma.product.update({
    where: { id: productId },
    data: {
      isDeleted: true,
    },
  });

  res.status(201).json({
    success: true,
    message: "Deleted product successfully",
    deletedProduct: productDetails || [],
  });
};

//
// USER
//

// get Admin Controller
export const handleGetAdmin = async (req: Request, res: Response) => {
  const allAdmin = await prisma.user.findMany({
    where: { isAdmin: true },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      createdAt: true,
    },
  });

  res.status(200).json({
    message: "Fetched admins successfully",
    admins: allAdmin,
  });
};

// get All Users Controller
export const handleGetAllUser = async (req: Request, res: Response) => {
  const allUser = await prisma.user.findMany({
    where: { isAdmin: false },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      createdAt: true,
      orders: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          totalAmount: true,
          status: true,
          createdAt: true,
        },
      },
    },
  });

  // flatten latest order
  const formattedUsers = allUser.map((u) => ({
    ...u,
    latestOrder: u.orders[0] || null,
  }));

  res.status(200).json({
    message: "Fetched users successfully",
    users: formattedUsers,
  });
};

// get Customers Controller
export const handleGetCustomer = async (req: Request, res: Response) => {
  const allCustomers = await prisma.user.findMany({
    where: {
      isAdmin: false,
      orders: { some: {} }, // ensures they have at least 1 order
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      createdAt: true,
      orders: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          totalAmount: true,
          status: true,
          createdAt: true,
        },
      },
    },
  });

  // flatten latest order
  const formattedCustomers = allCustomers.map((c) => ({
    ...c,
    latestOrder: c.orders[0] || null,
  }));

  res.status(200).json({
    message: "Fetched customers successfully",
    customers: formattedCustomers,
  });
};

// get user details Controller
export const handleGetUser = async (req: Request, res: Response) => {
  const userId = req.params.userId;
  if (!userId || typeof userId !== "string") {
    throw { status: 403, message: "Need User ID to get details" };
  }
  const userDetails = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      createdAt: true,
      orders: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          totalAmount: true,
          status: true,
          createdAt: true,
        },
      },
    },
  });

  res.status(200).json({
    message: "Fetched users successfully",
    users: userDetails,
  });
};

// get user orders details Controller
export const handleGetUserOrders = async (req: Request, res: Response) => {
  const userId = req.params.userId;
  if (!userId || typeof userId !== "string") {
    throw { status: 403, message: "Need User ID to get details" };
  }

  const userOrderDetails = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      orders: {
        select: {
          id: true,
          orderNumber: true,
          totalAmount: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: { orderItems: true }, // count order items
          },
        },
      },
    },
  });

  res.status(200).json({
    message: "Fetched user orders successfully",
    order: userOrderDetails?.orders || [],
  });
};

// get user address details Controller
export const handleGetUserAddress = async (req: Request, res: Response) => {
  const userId = req.params.userId;
  if (!userId || typeof userId !== "string") {
    throw { status: 403, message: "Need User ID to get details" };
  }

  const userAddressDetails = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      addresses: {
        select: {
          id: true,
          fullName: true,
          phone: true,
          alternatePhone: true,
          line1: true,
          line2: true,
          landmark: true,
          city: true,
          state: true,
          country: true,
          zipCode: true,

          // Address metadata
          label: true,
          isDefault: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  res.status(200).json({
    message: "Fetched user address successfully",
    address: userAddressDetails?.addresses || [],
  });
};

// get user wishlist details Controller
export const handleGetUserWishlist = async (req: Request, res: Response) => {
  const userId = req.params.userId;
  if (!userId || typeof userId !== "string") {
    throw { status: 403, message: "Need User ID to get details" };
  }

  const userWishlistDetails = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      wishlistItems: {
        select: {
          id: true,
          productId: true,
          addedAt: true,
          product: {
            select: {
              id: true,
              name: true,
              description: true,
              discountedPrice: true,
              originalPrice: true,
              isActive: true,
              images: {
                where: {
                  isMain: true,
                },
                select: {
                  imageUrl: true,
                },
              },
            },
          },
        },
      },
    },
  });

  res.status(200).json({
    message: "Fetched user wishlist successfully",
    wishlist: userWishlistDetails?.wishlistItems || [],
  });
};

// get user cart details Controller
export const handleGetUserCart = async (req: Request, res: Response) => {
  const userId = req.params.userId;
  if (!userId || typeof userId !== "string") {
    throw { status: 403, message: "Need User ID to get details" };
  }

  const userCartDetails = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      cartItems: {
        select: {
          id: true,
          productId: true,
          addedAt: true,
          product: {
            select: {
              id: true,
              name: true,
              description: true,
              discountedPrice: true,
              originalPrice: true,
              isActive: true,
              images: {
                where: {
                  isMain: true,
                },
                select: {
                  imageUrl: true,
                },
              },
            },
          },
        },
      },
    },
  });

  res.status(200).json({
    message: "Fetched user cart successfully",
    cart: userCartDetails?.cartItems || [],
  });
};

//
// ORDER
//

// get All Orders Controller
export const handleGetAllOrders = async (req: Request, res: Response) => {
  const allOrders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      userId: true,
      totalAmount: true,
      status: true,
      createdAt: true,
      _count: {
        select: { orderItems: true }, // count order items
      },
    },
  });

  res.status(200).json({
    message: "Fetched all orders successfully",
    orders: allOrders,
  });
};

// get Orders Details Controller
export const handleGetOrderDetails = async (req: Request, res: Response) => {
  const orderId = req.params.orderId;
  if (!orderId || typeof orderId !== "string") {
    throw { status: 403, message: "Need Order ID to get details" };
  }

  const orderDetails = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      orderNumber: true,
      totalAmount: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      // Customer info snapshot
      customerName: true,
      customerEmail: true,
      customerPhone: true,

      // Shipping address snapshot
      shippingFullName: true,
      shippingPhone: true,
      shippingLine1: true,
      shippingLine2: true,
      shippingCity: true,
      shippingState: true,
      shippingCountry: true,
      shippingZipCode: true,
      _count: {
        select: { orderItems: true }, // count order items
      },
      orderItems: {
        select: {
          id: true,
          orderId: true,
          productId: true,
          stockName: true,
          quantity: true,
          price: true,
          subTotal: true,
          productName: true,
          product: {
            select: {
              images: {
                where: {
                  isMain: true,
                },
                select: {
                  imageUrl: true,
                },
              },
            },
          },
        },
      },
      payment: {
        select: {
          id: true,
          method: true,
          transactionId: true,
          status: true,
          paidAt: true,
          updatedAt: true,
        },
      },
    },
  });

  res.status(200).json({
    message: "Fetched user order details successfully",
    order: orderDetails || [],
  });
};

// update Orders status Controller
export const handleUpdateOrderStatus = async (req: Request, res: Response) => {
  const orderId = req.params.orderId;
  if (!orderId || typeof orderId !== "string") {
    throw { status: 403, message: "Need Order ID to get details" };
  }

  const status = req.body.status as OrderStatus;

  const orderDetails = await prisma.order.update({
    where: { id: orderId },
    data: {
      status,
    },
  });

  res.status(200).json({
    message: "updated order status successfully",
    order: orderDetails || [],
  });
};

//
// FEE
//

// get price setting
export const handleGetPriceSetting = async (req: Request, res: Response) => {
  const priceDetails = await prisma.priceSetting.findFirst({
    select: {
      id: true,
      takeDeliveryFee: true,
      checkThreshold: true,
      deliveryFee: true,
      freeDeliveryThreshold: true,
      allowedZipCodes: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  res.status(200).json({
    success: true,
    message: "fetched fee setting successfully",
    priceSetting: priceDetails || [],
  });
};

// update price setting
export const handleUpdatePriceSetting = async (req: Request, res: Response) => {
  const {
    id,
    takeDeliveryFee,
    checkThreshold,
    deliveryFee,
    freeDeliveryThreshold,
    allowedZipCodes,
  } = req.body;

  const priceDetails = await prisma.priceSetting.update({
    where: { id },
    data: {
      takeDeliveryFee,
      checkThreshold,
      deliveryFee,
      freeDeliveryThreshold,
      allowedZipCodes,
    },
    select:{
      id:true,
      createdAt:true,
      updatedAt:true,
      takeDeliveryFee:true,
      checkThreshold:true,
      deliveryFee:true,
      freeDeliveryThreshold:true,
      allowedZipCodes:true,
    }
  });

  // update Redis cache
  const key = `delivery:settings`;
  await redisApp.set(
    key,
    JSON.stringify(priceDetails),
    "EX",
    60 * 60 // 30 minutes
  );

  res.status(200).json({
    success: true,
    message: "Updated delivery settings successfully",
    priceSetting: priceDetails,
  });
};

//
// BANNER
//

// add banner
export const handleAddBanner = async (req: Request, res: Response) => {
  const { imageUrl, altText, redirectUrl } = req.body;
  const addedBanner = await prisma.banner.create({
    data: {
      imageUrl,
      altText: altText || null,
      redirectUrl,
    },
  });

  res.status(201).json({
    success: true,
    message: "banner added successfully",
    banner: addedBanner,
  });
};

// get banner
export const handleGetAllBanner = async (req: Request, res: Response) => {
  const fetchedAllBanner = await prisma.banner.findMany({});

  res.status(200).json({
    success: true,
    message: "fetched all banner successfully",
    banner: fetchedAllBanner,
  });
};

// edit banner Controller
export const handleEditBanner = async (req: Request, res: Response) => {
  const { altText, deleteImage, updatedImages, redirectUrl } = req.body;

  const id = req.params.id;
  if (!id) throw { status: 403, message: "Need Banner ID to edit" };

  const bannerExist = await prisma.banner.findUnique({ where: { id } });
  if (!bannerExist) throw { status: 403, message: "Banner doesn't exist" };

  const result = await prisma.$transaction(async (tx) => {
    // 1. Delete old image if requested
    if (deleteImage && bannerExist.imageUrl) {
      deleteS3File(bannerExist.imageUrl).catch((error) => {
        console.error(
          `Failed to delete S3 file: ${bannerExist.imageUrl}`,
          error
        );
      });
    }

    // 2. Prepare update data
    const updateData: any = {
      altText: altText.trim(),
      redirectUrl,
    };

    // 3. Handle new image logic
    if (updatedImages.length > 0) {
      // Take the first new image (or extend to handle multiple)
      const imageToUpdate = updatedImages[0];
      updateData.imageUrl = imageToUpdate.imageKey;
      updateData.altText = imageToUpdate.altText?.trim() || altText.trim();
    } else {
      // No new image → keep the old one
      updateData.imageUrl = bannerExist.imageUrl;
    }

    return await tx.banner.update({
      where: { id: bannerExist.id },
      data: updateData,
    });
  });

  res.status(200).json({
    success: true,
    message: "Banner updated successfully",
    banner: {
      id: result.id,
      imageUrl: result.imageUrl,
      altText: result.altText,
      redirectUrl: result.redirectUrl,
    },
  });
};

// delete banner Controller
export const handleDeleteBanner = async (req: Request, res: Response) => {
  const id = req.params.id;
  if (!id) throw { status: 400, message: "Banner ID is required" }; // Changed from 403 to 400

  const bannerExist = await prisma.banner.findUnique({ where: { id } });
  if (!bannerExist) throw { status: 404, message: "Banner not found" }; // Changed from 403 to 404

  // Delete the banner from database first
  const deleted = await prisma.banner.delete({ where: { id: bannerExist.id } });

  // Try to delete S3 file - don't block the response if it fails
  deleteS3File(bannerExist.imageUrl).catch((error) => {
    console.error(`Failed to delete S3 file: ${bannerExist.imageUrl}`, error);
    // Consider adding logging service here for production
  });

  res.status(200).json({
    success: true,
    message: "Banner deleted successfully", // Fixed message
    banner: {
      id: deleted.id,
      imageUrl: deleted.imageUrl,
      altText: deleted.altText,
      redirectUrl: deleted.redirectUrl,
    },
  });
};
