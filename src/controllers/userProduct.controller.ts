import { NextFunction, Request, Response } from "express";
import prisma from "../config/prisma";
import { findProductById } from "../services/product.services";
import { AuthRequest, CartItemResponse, CartSummary } from "../types/customTypes";

// view all the products
export const handleGetFilteredProducts = async (
  req: AuthRequest,
  res: Response
) => {
  // Extract query parameters
  const { category, sortBy, limit, offset, filter, period, search, status } =
    req.query;
  // Check user role (adjust based on your auth implementation)
  const isAdmin = req.user?.role === "admin";

  // Build where conditions array
  const whereConditions: any[] = [];

  // Handle product status filter
  if (isAdmin && status && typeof status === "string") {
    switch (status) {
      case "active":
        whereConditions.push({ isActive: true });
        break;
      case "inactive":
        whereConditions.push({ isActive: false });
        break;
      case "all":
        // No filter needed - show all products
        break;
      default:
        // If invalid status is provided, default to active
        whereConditions.push({ isActive: true });
    }
  } else if (!isAdmin) {
    // Non-admin users always see only active products
    whereConditions.push({ isActive: true });
  }
  // If admin and no status specified, show all products

  // Add search functionality
  if (search && typeof search === "string") {
    // Split search terms for better matching
    const searchTerms = search
      .trim()
      .toLowerCase()
      .split(" ")
      .filter((term) => term.length > 0);

    if (searchTerms.length > 0) {
      whereConditions.push({
        OR: [
          // Match all terms in name (AND condition)
          {
            AND: searchTerms.map((term) => ({
              name: {
                contains: term,
                mode: "insensitive",
              },
            })),
          },
          // Match any term in description (OR condition)
          {
            OR: searchTerms.map((term) => ({
              description: {
                contains: term,
                mode: "insensitive",
              },
            })),
          },
          // Match full search string in category
          {
            category: {
              name: {
                contains: search,
                mode: "insensitive",
              },
            },
          },
        ],
      });
    }
  }

  // Add category filter
  if (category && typeof category === "string") {
    whereConditions.push({
      category: {
        name: {
          equals: category,
          mode: "insensitive",
        },
      },
    });
  }

  // Handle special filters (bestsellers with time period)
  if (filter === "bestsellers" && period && period !== "alltime") {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case "week":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "year":
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // Default to week
    }

    whereConditions.push({
      orderItems: {
        some: {
          order: {
            createdAt: {
              gte: startDate,
            },
          },
        },
      },
    });
  }

  // Combine all where conditions
  const whereClause =
    whereConditions.length > 0 ? { AND: whereConditions } : {};

  // Build orderBy clause
  let orderByClause: any = {};

  if (filter === "bestsellers") {
    // Sort by total sales for bestsellers
    orderByClause = { totalSales: "desc" };
  } else if (filter === "trending") {
    // Sort by views for trending products
    orderByClause = { views: "desc" };
  } else if (sortBy && typeof sortBy === "string") {
    switch (sortBy) {
      case "price-asc":
        orderByClause = { price: "asc" };
        break;
      case "price-desc":
        orderByClause = { price: "desc" };
        break;
      case "name-asc":
        orderByClause = { name: "asc" };
        break;
      case "name-desc":
        orderByClause = { name: "desc" };
        break;
      case "newest":
        orderByClause = { createdAt: "desc" };
        break;
      case "popular":
        orderByClause = { totalSales: "desc" };
        break;
      default:
        orderByClause = { createdAt: "desc" };
    }
  } else {
    // Default sorting
    orderByClause = { createdAt: "desc" };
  }

  // Parse pagination parameters
  const take = limit ? parseInt(limit as string) : undefined;
  const skip = offset ? parseInt(offset as string) : undefined;

  // Validate pagination parameters
  if (take && (isNaN(take) || take < 1 || take > 100)) {
    res.status(400).json({
      message: "Invalid limit parameter. Must be between 1 and 100.",
    });
    return;
  }

  if (skip && (isNaN(skip) || skip < 0)) {
    res.status(400).json({
      message: "Invalid offset parameter. Must be 0 or greater.",
    });
    return;
  }

  // Fetch products
  const products = await prisma.product.findMany({
    where: whereClause,
    orderBy: orderByClause,
    take: take,
    skip: skip,
    select: {
      id: true,
      name: true,
      description: true,
      originalPrice: true,
      discountedPrice: true,
      isActive: isAdmin, // Only include isActive field for admin users
      totalSales: true,
      views: true,
      createdAt: true,
      category: {
        select: {
          id: true,
          name: true,
        },
      },
      images: {
        select: {
          imageUrl: true,
          altText: true,
          isMain: true,
          position: true,
        },
        orderBy: {
          position: "asc",
        },
      },
      productSizes: {
        select: {
          stockName: true,
          stock: true,
        },
      },
    },
  });

  // Get total count for pagination info
  const totalCount = await prisma.product.count({
    where: whereClause,
  });

  // Build response message
  let message = "Fetched products successfully";

  // Add status info to message for admin
  if (isAdmin && status) {
    const statusText = status === "all" ? "all" : status;
    message += ` (${statusText} products)`;
  }

  if (search) {
    message = `Found ${totalCount} products for "${search}"`;
    if (isAdmin && status) {
      message += ` (${status} products)`;
    }
  } else if (filter === "bestsellers") {
    message = `Fetched best selling products${period ? " for " + period : ""}`;
  } else if (filter === "trending") {
    message = "Fetched trending products";
  } else if (category) {
    message = `Fetched products in ${category} category`;
  }

  res.status(200).json({
    message,
    products,
    pagination: {
      total: totalCount,
      limit: take || null,
      offset: skip || 0,
      hasMore: skip && take ? skip + take < totalCount : false,
    },
    // Include search term in response for frontend reference
    ...(search && { searchTerm: search }),
    // Include status filter info for admin
    ...(isAdmin && status && { statusFilter: status }),
    // Include user role in response (useful for frontend)
    ...(isAdmin && { userRole: "admin" }),
  });
};

// single product detail
export const handleGetProductById = async (req: Request, res: Response) => {
  const { id } = req.params;

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      images: {
        orderBy: { position: "asc" },
      },
      productSizes: true,
    },
  });

  if (!product) {
    res.status(404).json({ message: "Product not found" });
    return;
  }

  // Increment views
  await prisma.product.update({
    where: { id },
    data: { views: { increment: 1 } },
  });

  res.json({ product });
};

// check a product exist or not
export const queryExistingProductCheck = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    if (!id) {
      const error = new Error("Product ID is required") as any;
      error.statusCode = 400;
      throw error;
    }

    const product = await findProductById(id);

    if (!product) {
      const error = new Error("Product not found") as any;
      error.statusCode = 404;
      throw error;
    }

    next();
  } catch (err) {
    next(err);
  }
};

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

// get cart
export const getCart = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const uid = req.user!.uid;

    const cartItems = await prisma.cartItem.findMany({
      where: { userId: uid },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            originalPrice: true,
            discountedPrice: true,
            isActive: true,
            isDeleted: true,
            category: {
              select: {
                id: true,
                name: true,
                parent: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
            images: {
              where: { isMain: true },
              select: {
                imageUrl: true,
                altText: true,
              },
              orderBy: {
                position: 'asc',
              },
            },
            productSizes: {
              select: {
                stock: true,
                stockName: true,
              },
            },
          },
        },
      },
      orderBy: {
        addedAt: 'desc',
      },
    });

    // Filter out deleted or inactive products and transform data
    const items: CartItemResponse[] = cartItems
      .filter((item) => !item.product.isDeleted && item.product.isActive)
      .map((item) => {
        const totalStock = item.product.productSizes.reduce(
          (sum, size) => sum + size.stock,
          0
        );

        // Find stock for specific stockName
        const stockInfo = item.product.productSizes.find(
          (stock) => stock.stockName === item.stockName
        );
        const availableStock = stockInfo?.stock || 0;

        // Convert Decimal to number for calculations
        const originalPrice = item.product.originalPrice.toNumber();
        const discountedPrice = item.product.discountedPrice.toNumber();

        return {
          id: item.id,
          productId: item.product.id,
          name: item.product.name,
          originalPrice,
          discountedPrice,
          mainImage: item.product.images[0] || null,
          quantity: item.quantity,
          stockName: item.stockName,
          addedAt: item.addedAt,
          category: {
            id: item.product.category.id,
            name: item.product.category.name,
            parentCategory: item.product.category.parent || null,
          },
          inStock: totalStock > 0,
          stockVariantInStock: availableStock > 0,
          availableStock,
          subtotal: item.quantity * discountedPrice,
          originalSubtotal: item.quantity * originalPrice,
          discount: item.quantity * (originalPrice - discountedPrice),
        };
      });

    // Calculate cart summary
    const summary: CartSummary = {
      totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
      totalUniqueItems: items.length,
      totalPrice: items.reduce((sum, item) => sum + item.subtotal, 0),
      totalOriginalPrice: items.reduce(
        (sum, item) => sum + item.originalSubtotal,
        0
      ),
      totalDiscount: items.reduce((sum, item) => sum + item.discount, 0),
    };

    res.status(200).json({ 
      items,
      summary,
    });
  } catch (error) {
    next(error);
  }
};

// add to cart
export const addToCart = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const uid = req.user!.uid;
    const { productId, stockName, quantity = 1 } = req.body;

    // Check if already exists
    const existingItem = await prisma.cartItem.findUnique({
      where: {
        userId_productId_stockName: {
          userId: uid,
          productId,
          stockName,
        },
      },
    });

    if (existingItem) {
      // Don't error, just inform frontend
      res.status(200).json({
        success: true,
        alreadyInCart: true,
        cartItem: {
          id: existingItem.id,
          quantity: existingItem.quantity,
        },
        message: "Item already in cart",
      });
      return;
    }

    // Validate product and stock
    const product = await prisma.product.findFirst({
      where: { id: productId, isDeleted: false, isActive: true },
      include: { productSizes: { where: { stockName } } },
    });

    if (!product || !product.productSizes[0]) {
      throw {
        statusCode: 404,
        message: "Product or size not available",
      };
    }

    if (quantity > product.productSizes[0].stock) {
      throw {
        statusCode: 400,
        message: "Insufficient stock",
        data: { availableStock: product.productSizes[0].stock },
      };
    }

    // Create new cart item
    const cartItem = await prisma.cartItem.create({
      data: {
        userId: uid,
        productId,
        stockName,
        quantity,
      },
    });

    res.status(201).json({
      success: true,
      alreadyInCart: false,
      cartItem: {
        id: cartItem.id,
        quantity: cartItem.quantity,
      },
      message: "Added to cart",
    });
  } catch (error) {
    next(error);
  }
};

// update cart item quantity
export const updateCartItemQuantity = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const uid = req.user!.uid;
    const { cartItemId } = req.params;
    const { quantity } = req.body;

    // Get cart item with product stock info
    const cartItem = await prisma.cartItem.findFirst({
      where: {
        id: cartItemId,
        userId: uid,
      },
      include: {
        product: {
          include: {
            productSizes: true,
          },
        },
      },
    });

    if (!cartItem) {
      throw {
        statusCode: 404,
        message: "Cart item not found",
      };
    }

    // Check if product is still available
    if (cartItem.product.isDeleted || !cartItem.product.isActive) {
      throw {
        statusCode: 400,
        message: "Product is no longer available",
      };
    }

    // Check stock for the specific variant
    const stockInfo = cartItem.product.productSizes.find(
      (size) => size.stockName === cartItem.stockName
    );

    if (!stockInfo || quantity > stockInfo.stock) {
      throw {
        statusCode: 400,
        message: "Insufficient stock",
        data: {
          availableStock: stockInfo?.stock || 0,
        },
      };
    }

    // Update quantity
    await prisma.cartItem.update({
      where: { id: cartItemId },
      data: { quantity },
    });

    // Return updated cart
    await getCart(req, res, next);
  } catch (error) {
    next(error);
  }
};

// remove product from cart 
export const removeFromCart = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const uid = req.user!.uid;
    const { cartItemId } = req.params;

    // Verify ownership and delete
    const cartItem = await prisma.cartItem.findFirst({
      where: {
        id: cartItemId,
        userId: uid,
      },
    });

    if (!cartItem) {
      throw {
        statusCode: 404,
        message: "Cart item not found",
      };
    }

    await prisma.cartItem.delete({
      where: { id: cartItemId },
    });

    // Return updated cart
    await getCart(req, res, next);
  } catch (error) {
    next(error);
  }
};

// clear all the product from cart
export const clearCart = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const uid = req.user!.uid;

    const result = await prisma.cartItem.deleteMany({
      where: { userId: uid },
    });

    if (result.count === 0) {
      throw {
        statusCode: 404,
        message: "Cart is already empty",
      };
    }

    res.status(200).json({
      items: [],
      summary: {
        totalItems: 0,
        totalUniqueItems: 0,
        totalPrice: 0,
        totalOriginalPrice: 0,
        totalDiscount: 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

// check if a product is in cart
export const checkProductsInCart = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const uid = req.user!.uid;
    const { productIds } = req.body;

    const cartItems = await prisma.cartItem.findMany({
      where: {
        userId: uid,
        productId: { in: productIds },
      },
      select: {
        productId: true,
        stockName: true,
        quantity: true,
        id: true,
      },
    });

    // Group by productId
    const cartStatus = productIds.reduce((acc: Record<string, any>, productId: string) => {
      const items = cartItems.filter(item => item.productId === productId);
      acc[productId] = {
        inCart: items.length > 0,
        variants: items.map(item => ({
          cartItemId: item.id,
          stockName: item.stockName,
          quantity: item.quantity,
        })),
      };
      return acc;
    }, {});

    res.status(200).json(cartStatus);
  } catch (error) {
    next(error);
  }
};

// get cart count
export const getCartCount = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const uid = req.user!.uid;

    const count = await prisma.cartItem.aggregate({
      where: { 
        userId: uid,
        product: {
          isDeleted: false,
          isActive: true
        }
      },
      _sum: { quantity: true }
    });

    res.status(200).json({ 
      count: count._sum.quantity || 0 
    });
  } catch (error) {
    next(error);
  }
};