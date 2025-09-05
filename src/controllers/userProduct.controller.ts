import { NextFunction, Request, Response } from "express";
import prisma from "../config/prisma";
import { findProductById } from "../services/product.services";
import { AuthRequest } from "../types/customTypes";
import { checkDeliveryAvailability } from "../services/delivery.services";
import { AutocompleteResult } from "../types/product.types";
import { redisApp } from "../config/redis";

//
// PRODUCT
//

// autocomplete search controller
export const handleSearchAutocomplete = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    // Extract query parameter
    const { q, limit } = req.query;

    // Validate query parameter
    if (!q || typeof q !== "string") {
      res
        .status(400)
        .json({
          success: false,
          message: 'Query parameter "q" is required and must be a string',
          suggestions: [],
        });
      return;
    }

    const query = q.trim();

    // Return empty results for very short queries to avoid too many results
    if (query.length < 2) {
      res
        .status(200)
        .json({ success: true, message: "Query too short", suggestions: [] });
      return;
    }

    // Parse limit with default and validation (UI-friendly limits)
    const searchLimit = limit ? parseInt(limit as string) : 6;
    if (isNaN(searchLimit) || searchLimit < 1 || searchLimit > 8) {
      res
        .status(400)
        .json({
          success: false,
          message: "Invalid limit parameter. Must be between 1 and 8.",
          suggestions: [],
        });
      return;
    }

    // Check user role for product visibility
    const isAdmin = req.user?.role === "admin";

    // Split search terms for better matching
    const searchTerms = query
      .toLowerCase()
      .split(" ")
      .filter((term) => term.length > 0);

    const results: AutocompleteResult[] = [];

    // Search for products (prioritize products in limited results)
    const productLimit = Math.max(1, Math.ceil(searchLimit * 0.7)); // ~70% for products

    const products = await prisma.product.findMany({
      where: {
        AND: [
          // Only show active products for non-admin users
          ...(isAdmin ? [] : [{ isActive: true }]),
          {
            OR: [
              // Match in product name (prioritize exact matches)
              {
                name: {
                  contains: query,
                  mode: "insensitive",
                },
              },
              // Match all search terms in name
              {
                AND: searchTerms.map((term) => ({
                  name: {
                    contains: term,
                    mode: "insensitive",
                  },
                })),
              },
              // Match in description (lower priority)
              {
                description: {
                  contains: query,
                  mode: "insensitive",
                },
              },
            ],
          },
        ],
      },
      select: {
        id: true,
        name: true,
        description: true,
        discountedPrice: true,
        category: {
          select: {
            name: true,
          },
        },
        images: {
          select: {
            imageUrl: true,
            isMain: true,
          },
          where: {
            isMain: true,
          },
          take: 1,
        },
      },
      orderBy: [
        // Prioritize exact name matches
        {
          name: "asc",
        },
        // Then by popularity/sales
        {
          totalSales: "desc",
        },
      ],
      take: productLimit,
    });

    // Add products to results
    products.forEach((product) => {
      results.push({
        type: "product",
        id: product.id,
        name: product.name,
        description:
          product.description?.substring(0, 60) +
          (product.description && product.description.length > 60 ? "..." : ""),
        category: product.category?.name,
        imageUrl: product.images[0]?.imageUrl,
      });
    });

    // Search for categories (remaining slots, but maximum 2 categories)
    const categoryLimit = Math.min(2, searchLimit - results.length);

    if (categoryLimit > 0) {
      const categories = await prisma.category.findMany({
        where: {
          OR: [
            {
              name: {
                contains: query,
                mode: "insensitive",
              },
            },
            // Match any search term in category name
            {
              OR: searchTerms.map((term) => ({
                name: {
                  contains: term,
                  mode: "insensitive",
                },
              })),
            },
          ],
        },
        select: {
          id: true,
          name: true,
          parentId: true,
          parent: {
            select: {
              name: true,
            },
          },
          // Count products in this category for relevance
          _count: {
            select: {
              products: {
                where: isAdmin ? {} : { isActive: true },
              },
            },
          },
        },
        orderBy: [
          {
            name: "asc",
          },
        ],
        take: categoryLimit + 2, // Get a few extra to filter
      });

      // Add categories to results (only if they have products)
      categories
        .filter((category) => category._count.products > 0)
        .slice(0, categoryLimit) // Take only what we need
        .forEach((category) => {
          const categoryName = category.parent
            ? `${category.parent.name} > ${category.name}`
            : category.name;

          results.push({
            type: "category",
            id: category.id,
            name: categoryName,
            description: `${category._count.products} products`,
          });
        });
    }

    // Sort results to prioritize exact matches and products over categories
    const sortedResults = results.sort((a, b) => {
      // Exact name matches first
      const aExactMatch = a.name.toLowerCase() === query.toLowerCase();
      const bExactMatch = b.name.toLowerCase() === query.toLowerCase();

      if (aExactMatch && !bExactMatch) return -1;
      if (!aExactMatch && bExactMatch) return 1;

      // Then prioritize products over categories
      if (a.type === "product" && b.type === "category") return -1;
      if (a.type === "category" && b.type === "product") return 1;

      // Finally sort alphabetically
      return a.name.localeCompare(b.name);
    });

    res.status(200).json({
      success: true,
      message: `Found ${sortedResults.length} suggestions for "${query}"`,
      query: query,
      suggestions: sortedResults.slice(0, searchLimit),
    });
    return;
  } catch (error) {
    console.error("Search autocomplete error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error during search",
      suggestions: [],
    });
    return;
  }
};

// Optional: Get popular search terms (can be used for trending suggestions)
export const handlePopularSearches = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { limit } = req.query;
    const searchLimit = limit ? parseInt(limit as string) : 5; // Default to 5 for popular

    if (isNaN(searchLimit) || searchLimit < 1 || searchLimit > 6) {
      res
        .status(400)
        .json({
          success: false,
          message: "Invalid limit parameter. Must be between 1 and 6.",
          suggestions: [],
        });
      return;
    }

    const isAdmin = req.user?.role === "admin";

    // Get most popular categories (by product count)
    const popularCategories = await prisma.category.findMany({
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            products: {
              where: isAdmin ? {} : { isActive: true },
            },
          },
        },
      },
      orderBy: {
        products: {
          _count: "desc",
        },
      },
      take: Math.ceil(searchLimit / 2),
    });

    // Get bestselling products
    const popularProducts = await prisma.product.findMany({
      where: isAdmin ? {} : { isActive: true },
      select: {
        id: true,
        name: true,
        totalSales: true,
      },
      orderBy: {
        totalSales: "desc",
      },
      take: Math.floor(searchLimit / 2),
    });

    const suggestions: AutocompleteResult[] = [
      // Add popular categories
      ...popularCategories
        .filter((cat) => cat._count.products > 0)
        .map((cat) => ({
          type: "category" as const,
          id: cat.id,
          name: cat.name,
          description: `${cat._count.products} products`,
        })),
      // Add popular products
      ...popularProducts.map((product) => ({
        type: "product" as const,
        id: product.id,
        name: product.name,
        description: `${product.totalSales || 0} sales`,
      })),
    ];

    res.status(200).json({
      success: true,
      message: "Popular search suggestions",
      suggestions: suggestions.slice(0, searchLimit),
    });
    return;
  } catch (error) {
    console.error("Popular searches error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      suggestions: [],
    });
    return;
  }
};

// view all the products
export const handleGetFilteredProducts = async (
  req: AuthRequest,
  res: Response
) => {
  // Extract query parameters
  const { category, sortBy, limit, offset, filter, period, search, status } =
    req.query;
  // Handle sizes parameter (axios sends arrays as 'sizes[]')
  const sizes = req.query.sizes || req.query["sizes[]"];

  // Check user role (adjust based on your auth implementation)
  const isAdmin = req.user?.role === "admin";

  // Build where conditions array
  const whereConditions: any[] = [{ isDeleted: false }];

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
    // First, check if this is a parent category
    const categoryRecord = await prisma.category.findFirst({
      where: {
        name: {
          equals: category,
          mode: "insensitive",
        },
      },
      select: {
        id: true,
        parentId: true,
      },
    });

    if (categoryRecord) {
      if (categoryRecord.parentId === null) {
        // This is a parent category - get all child categories
        const childCategories = await prisma.category.findMany({
          where: {
            parentId: categoryRecord.id,
          },
          select: {
            id: true,
            name: true,
          },
        });
        if (childCategories.length > 0) {
          // Include products from both parent and all child categories
          whereConditions.push({
            OR: [
              // Products directly in parent category (if any)
              {
                category: {
                  name: {
                    equals: category,
                    mode: "insensitive",
                  },
                },
              },
              // Products in any child category
              {
                category: {
                  id: {
                    in: childCategories.map((child) => child.id),
                  },
                },
              },
            ],
          });
        } else {
          // No child categories, just match the parent category
          whereConditions.push({
            category: {
              name: {
                equals: category,
                mode: "insensitive",
              },
            },
          });
        }
      } else {
        // This is already a child category - match directly
        whereConditions.push({
          category: {
            name: {
              equals: category,
              mode: "insensitive",
            },
          },
        });
      }
    }
  }

  // Add sizes filter
  if (sizes) {
    // Debug: Show all available sizes in database (remove this after debugging)
    const availableSizes = await prisma.productStock.findMany({
      select: { stockName: true },
      distinct: ["stockName"],
      take: 20, // Limit to avoid too much output
    });

    let sizeList: string[] = [];

    // Handle different types that req.query can provide
    if (Array.isArray(sizes)) {
      // Frontend sent an array - filter to only strings
      sizeList = sizes
        .filter(
          (size): size is string => typeof size === "string" && size.length > 0
        )
        .map((size) => size.trim());
    } else if (typeof sizes === "string") {
      // Handle URL encoded string format
      let decodedSizes;
      try {
        decodedSizes = decodeURIComponent(sizes);
      } catch (error) {
        decodedSizes = sizes;
      }

      sizeList = decodedSizes
        .split(",")
        .map((size) => size.trim().replace(/\+/g, " "))
        .filter((size) => size.length > 0);
    }
    // Ignore other types (QueryString.ParsedQs, etc.)

    if (sizeList.length > 0) {
      // Use exact matching with case insensitive mode
      const sizeCondition = {
        productSizes: {
          some: {
            stockName: {
              in: sizeList,
              mode: "insensitive",
            },
          },
        },
      };
      whereConditions.push(sizeCondition);
    }
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
        orderByClause = { discountedPrice: "asc" };
        break;
      case "price-desc":
        orderByClause = { discountedPrice: "desc" };
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
    res
      .status(400)
      .json({
        success: false,
        message: "Invalid limit parameter. Must be between 1 and 100.",
      });
    return;
  }

  if (skip && (isNaN(skip) || skip < 0)) {
    res
      .status(400)
      .json({
        success: false,
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
          id: isAdmin,
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
          id: true,
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

  // Add sizes info to message
  if (sizes) {
    const sizeList = decodeURIComponent(sizes as string).split(",");
    message += ` with sizes: ${sizeList.join(", ")}`;
  }

  res.status(200).json({
    success: true,
    message,
    products,
    pagination: {
      total: totalCount,
      limit: take ?? 20,
      offset: skip || 0,
      hasMore: skip && take ? skip + take < totalCount : false,
    },
    // Include search term in response for frontend reference
    ...(search && { searchTerm: search }),
    // Include status filter info for admin
    ...(isAdmin && status && { statusFilter: status }),
    // Include sizes filter info
    ...(sizes && {
      sizesFilter: decodeURIComponent(sizes as string).split(","),
    }),
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
    res.status(404).json({ success: false, message: "Product not found" });
    return;
  }

  // Replace stock with available stock
  product.productSizes = await Promise.all(
    product.productSizes.map(async (variant) => {
      const reservationKey = `stock:reservation:${product.id}:${variant.stockName}`;
      const reservedQty = await redisApp.get(reservationKey);

      return {
        ...variant,
        stock: Math.max(
          0,
          variant.stock - (reservedQty ? parseInt(reservedQty) : 0)
        ), // overwrite stock here
      };
    })
  );

  // Increment views
  await prisma.product.update({
    where: { id },
    data: { views: { increment: 1 } },
  });

  res.json({ success: true, product });
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

//
// CATEGORY
//

export const handleGetAllCategories = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const categories = await prisma.category.findMany({
      where: {
        parentId: null, // top-level only
      },
      include: {
        children: {
          include: {
            products: true, // only for filtering
            children: {
              include: {
                products: true, // only for filtering
              },
            },
          },
        },
        products: true, // only for filtering
      },
    });

    // recursive filter to keep only categories that have products in them or their children
    function filterCategories(cats: any[]): any[] {
      return cats
        .map((cat) => {
          const filteredChildren = filterCategories(cat.children || []);

          const hasProducts =
            (cat.products && cat.products.length > 0) ||
            filteredChildren.length > 0;

          if (!hasProducts) return null;

          // remove products from response (don’t expose them)
          return {
            id: cat.id,
            name: cat.name,
            parentId: cat.parentId,
            imageUrl: cat.imageUrl,
            altText: cat.altText,
            children: filteredChildren,
          };
        })
        .filter(Boolean);
    }

    const filtered = filterCategories(categories);

    if (filtered.length === 0) {
      res.status(404).json({ success: false, message: "Categories not found" });
      return;
    }

    res.json({ success: true, categories: filtered });
  } catch (error) {
    next(error);
  }
};

//
// CART
//

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
                position: "asc",
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
        addedAt: "desc",
      },
    });

    // **NEW: Fetch Redis reservations for all cart items at once**
    const activeCartItems = cartItems.filter(
      (item) => !item.product.isDeleted && item.product.isActive
    );

    // Get all Redis reservations in parallel
    const reservationPromises = activeCartItems.map(async (item) => {
      const key = `stock:reservation:${item.product.id}:${item.stockName}`;
      try {
        const reserved = await redisApp.get(key);
        return {
          productId: item.product.id,
          stockName: item.stockName,
          reservedQuantity: reserved ? parseInt(reserved) : 0,
        };
      } catch (error) {
        console.warn(`Failed to get reservation for ${key}:`, error);
        return {
          productId: item.product.id,
          stockName: item.stockName,
          reservedQuantity: 0,
        };
      }
    });

    const reservations = await Promise.all(reservationPromises);

    // Create reservation lookup map
    const reservationMap = new Map<string, number>();
    reservations.forEach(({ productId, stockName, reservedQuantity }) => {
      reservationMap.set(`${productId}:${stockName}`, reservedQuantity);
    });

    // Enhanced stock validation logic
    const items: any[] = [];
    let totalValidItems = 0;
    let totalPrice = 0;
    let hasOutOfStockItems = false;
    let hasLowStockWarnings = false;
    let hasQuantityIssues = false;
    let canProceedToCheckout = true;

    activeCartItems.forEach((item) => {
      const stockInfo = item.product.productSizes.find(
        (stock) => stock.stockName === item.stockName
      );

      const dbStock = stockInfo?.stock || 0;
      const cartQuantity = item.quantity;

      // **ENHANCED: Calculate available stock considering Redis reservations**
      const reservationKey = `${item.product.id}:${item.stockName}`;
      const reservedQuantity = reservationMap.get(reservationKey) || 0;
      const availableStock = Math.max(0, dbStock - reservedQuantity);

      const originalPrice = item.product.originalPrice.toNumber();
      const discountedPrice = item.product.discountedPrice.toNumber();

      // Stock validation logic with Redis considerations
      let status = "available";
      let statusCode = "IN_STOCK";
      let message = "Item is available.";
      let action = "proceed";
      let itemCanCheckout = true;

      if (availableStock === 0) {
        status = "out_of_stock";
        statusCode = "OUT_OF_STOCK";
        message =
          reservedQuantity > 0
            ? "This item is currently reserved by other customers and unavailable."
            : "This item is currently out of stock.";
        action = "remove";
        itemCanCheckout = false;
        hasOutOfStockItems = true;
        canProceedToCheckout = false;
      } else if (cartQuantity > availableStock) {
        status = "quantity_exceeded";
        statusCode = "QUANTITY_EXCEEDED";
        message =
          reservedQuantity > 0
            ? `Only ${availableStock} available (${reservedQuantity} reserved by others). Please reduce quantity to ${availableStock}.`
            : `Only ${availableStock} item${
                availableStock === 1 ? "" : "s"
              } available. Please reduce quantity.`;
        action = "reduce_quantity";
        itemCanCheckout = false;
        hasQuantityIssues = true;
        canProceedToCheckout = false;
      } else if (availableStock < 10) {
        status = "low_stock_warning";
        statusCode = "LOW_STOCK";
        message =
          reservedQuantity > 0
            ? `Only ${availableStock} available (${reservedQuantity} reserved by others). Hurry up!`
            : `Only ${availableStock} item${
                availableStock === 1 ? "" : "s"
              } left in stock!`;
        action = "proceed_with_caution";
        hasLowStockWarnings = true;
      }

      const subtotal = itemCanCheckout ? cartQuantity * discountedPrice : 0;
      const originalSubtotal = itemCanCheckout
        ? cartQuantity * originalPrice
        : 0;

      if (itemCanCheckout) {
        totalValidItems += cartQuantity;
        totalPrice += subtotal;
      }

      items.push({
        id: item.id,
        productId: item.product.id,
        name: item.product.name,
        originalPrice,
        discountedPrice,
        mainImage: item.product.images[0] || null,
        quantity: cartQuantity,
        stockName: item.stockName,
        addedAt: item.addedAt,
        category: {
          id: item.product.category.id,
          name: item.product.category.name,
          parentCategory: item.product.category.parent || null,
        },
        // Enhanced stock information with Redis data
        status,
        statusCode,
        message,
        action,
        canProceedToCheckout: itemCanCheckout,
        stockInfo: {
          availableStock,
          dbStock, // **NEW: Show original database stock**
          reservedQuantity, // **NEW: Show how much is reserved**
          cartQuantity,
          maxAllowed: Math.min(cartQuantity, availableStock),
          isOutOfStock: availableStock === 0,
          isLowStock: availableStock < 10 && availableStock > 0,
          hasReservations: reservedQuantity > 0, // **NEW: Flag for UI**
        },
        // Original fields for backward compatibility
        inStock: availableStock > 0,
        stockVariantInStock: availableStock > 0,
        availableStock,
        subtotal,
        originalSubtotal,
        discount: originalSubtotal - subtotal,
      });
    });

    // Overall cart status
    let overallStatus = "ready";
    let checkoutMessage = "Your cart is ready for checkout.";

    if (hasOutOfStockItems || hasQuantityIssues) {
      overallStatus = "requires_action";
      if (hasOutOfStockItems && hasQuantityIssues) {
        checkoutMessage =
          "Some items are out of stock and others exceed available quantity. Please review your cart.";
      } else if (hasOutOfStockItems) {
        checkoutMessage =
          "Some items in your cart are out of stock or reserved by others. Please remove them to continue.";
      } else {
        checkoutMessage =
          "Some items exceed available stock. Please adjust quantities to continue.";
      }
    } else if (hasLowStockWarnings) {
      overallStatus = "low_stock_warning";
      checkoutMessage =
        "Some items have limited stock. Complete your purchase soon!";
    }

    // **ENHANCED: Calculate total reservations for summary**
    const totalReservations = Array.from(reservationMap.values()).reduce(
      (sum, reserved) => sum + reserved,
      0
    );

    // Enhanced summary
    const summary = {
      totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
      totalUniqueItems: items.length,
      totalPrice,
      totalValidItems,
      totalOriginalPrice: items.reduce(
        (sum, item) => sum + item.originalSubtotal,
        0
      ),
      totalDiscount: items.reduce((sum, item) => sum + item.discount, 0),
      // Cart health information
      overallStatus,
      canProceedToCheckout,
      checkoutMessage,
      hasOutOfStockItems,
      hasLowStockWarnings,
      hasQuantityIssues,
      itemsRequiringAttention: items.filter(
        (item) => !item.canProceedToCheckout
      ).length,
      // **NEW: Reservation summary**
      reservationInfo: {
        totalReservedItems: totalReservations,
        itemsWithReservations: items.filter(
          (item) => item.stockInfo.hasReservations
        ).length,
        affectedByReservations: totalReservations > 0,
      },
      // **NEW: Timestamp for cache invalidation**
      lastChecked: new Date().toISOString(),
    };

    res.status(200).json({ success: true, items, summary });
  } catch (error) {
    console.error("Get cart error:", error);
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

    // Validate quantity
    if (quantity < 0) {
      res.status(400).json({
        success: false,
        error: "INVALID_QUANTITY",
        message: "Quantity cannot be negative",
      });
      return;
    }

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
      res.status(404).json({
        success: false,
        error: "ITEM_NOT_FOUND",
        message: "Cart item not found",
      });
      return;
    }

    // Check if product is still available
    if (cartItem.product.isDeleted || !cartItem.product.isActive) {
      res.status(400).json({
        success: false,
        error: "PRODUCT_UNAVAILABLE",
        message: "Product is no longer available",
        action: "remove",
      });
      return;
    }

    // Check stock for the specific variant
    const stockInfo = cartItem.product.productSizes.find(
      (size) => size.stockName === cartItem.stockName
    );

    const currentStock = stockInfo?.stock || 0;

    // Handle different stock scenarios
    if (currentStock === 0) {
      res.status(400).json({
        success: false,
        error: "OUT_OF_STOCK",
        message: "This item is now out of stock",
        availableStock: 0,
        requestedQuantity: quantity,
        currentCartQuantity: cartItem.quantity,
        action: "remove",
        productInfo: {
          name: cartItem.product.name,
          size: cartItem.stockName,
        },
      });
      return;
    }

    if (quantity > currentStock) {
      res.status(400).json({
        success: false,
        error: "INSUFFICIENT_STOCK",
        message: `Only ${currentStock} item${
          currentStock === 1 ? "" : "s"
        } available`,
        availableStock: currentStock,
        requestedQuantity: quantity,
        currentCartQuantity: cartItem.quantity,
        maxAllowed: currentStock,
        action: "reduce_quantity",
        productInfo: {
          name: cartItem.product.name,
          size: cartItem.stockName,
        },
      });
      return;
    }

    // Update quantity (all validations passed)
    await prisma.cartItem.update({
      where: { id: cartItemId },
      data: { quantity },
    });

    // Return updated cart using the enhanced getCart function
    req.url = "/cart"; // Set URL for getCart to work properly
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
      success: true,
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
    const productDatas = req.body.productDatas as {
      productId: string;
      productVarient: string;
      quantity: number;
    }[];

    const productIds = productDatas.map((p) => p.productId);

    // Fetch products and cart items from the database
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        isActive: true,
        isDeleted: false,
      },
      select: {
        id: true,
        name: true,
        description: true,
        discountedPrice: true,
        originalPrice: true,
        images: {
          where: { isMain: true },
          select: { imageUrl: true, altText: true },
        },
        productSizes: true,
      },
    });

    const cartItems = await prisma.cartItem.findMany({
      where: {
        userId: uid,
        productId: { in: productIds },
      },
      select: {
        id: true,
        productId: true,
        stockName: true,
        quantity: true,
      },
    });

    // Create a map of cart items for easy lookup
    const cartMap = new Map<string, Map<string, (typeof cartItems)[0]>>();
    cartItems.forEach((item) => {
      if (!cartMap.has(item.productId)) {
        cartMap.set(item.productId, new Map());
      }
      cartMap.get(item.productId)!.set(item.stockName, item);
    });

    // **NEW: Fetch Redis reservations for all products at once**
    const reservationPromises = productDatas.map(
      async ({ productId, productVarient }) => {
        const key = `stock:reservation:${productId}:${productVarient}`;
        const reserved = await redisApp.get(key);
        return {
          productId,
          productVarient,
          reservedQuantity: reserved ? parseInt(reserved) : 0,
        };
      }
    );

    const reservations = await Promise.all(reservationPromises);
    const reservationMap = new Map<string, number>();
    reservations.forEach(({ productId, productVarient, reservedQuantity }) => {
      reservationMap.set(`${productId}:${productVarient}`, reservedQuantity);
    });

    // Preparing response data
    const responseProducts: any[] = [];
    let totalValidItems = 0;
    let totalDiscountedPrice = 0;
    let totalOriginalPrice = 0;
    let hasOutOfStockItems = false;
    let hasLowStockWarnings = false;
    let hasQuantityIssues = false;

    for (const { productId, productVarient } of productDatas) {
      const product = products.find((p) => p.id === productId);

      if (!product) {
        responseProducts.push({
          productId,
          status: "error",
          statusCode: "PRODUCT_NOT_FOUND",
          message: "Product not found or no longer available.",
          action: "remove",
          canProceedToCheckout: false,
        });
        continue;
      }

      const variant = product.productSizes.find(
        (v) => v.stockName === productVarient
      );

      if (!variant) {
        responseProducts.push({
          productId,
          status: "error",
          statusCode: "VARIANT_NOT_FOUND",
          message: `Size ${productVarient} is no longer available.`,
          action: "remove",
          canProceedToCheckout: false,
          productDetails: {
            id: product.id,
            name: product.name,
            discountedPrice: product.discountedPrice,
            originalPrice: product.originalPrice,
            mainImage: product.images[0] || null,
          },
        });
        continue;
      }

      const itemInCart = cartMap.get(productId)?.get(productVarient);

      if (!itemInCart) {
        responseProducts.push({
          productId,
          status: "error",
          statusCode: "ITEM_NOT_IN_CART",
          message: `Item not found in your cart.`,
          action: "remove",
          canProceedToCheckout: false,
        });
        continue;
      }

      // **FIXED: Calculate available stock considering Redis reservations**
      const dbStock = variant.stock;
      const reservedQuantity =
        reservationMap.get(`${productId}:${productVarient}`) || 0;
      const availableStock = Math.max(0, dbStock - reservedQuantity);
      const cartQuantity = itemInCart.quantity;
      const itemDiscountedTotal = cartQuantity * product.discountedPrice.toNumber();
      const itemOriginalTotal = cartQuantity * product.originalPrice.toNumber();

      // Handle different stock scenarios
      if (availableStock === 0) {
        hasOutOfStockItems = true;
        responseProducts.push({
          productId,
          status: "out_of_stock",
          statusCode: "OUT_OF_STOCK",
          message:
            reservedQuantity > 0
              ? `This item is currently reserved by other customers and unavailable.`
              : `This item is currently out of stock.`,
          action: "remove",
          canProceedToCheckout: false,
          stockInfo: {
            availableStock: 0,
            dbStock,
            reservedQuantity,
            cartQuantity,
            isOutOfStock: true,
            isLowStock: false,
          },
          productDetails: {
            id: product.id,
            name: product.name,
            discountedPrice: product.discountedPrice,
            originalPrice: product.originalPrice,
            mainImage: product.images[0] || null,
          },
          cartDetails: {
            cartItemId: itemInCart.id,
            stockName: itemInCart.stockName,
            quantity: cartQuantity,
            itemTotal: 0,
          },
        });
        continue;
      }

      if (cartQuantity > availableStock) {
        hasQuantityIssues = true;
        responseProducts.push({
          productId,
          status: "quantity_exceeded",
          statusCode: "QUANTITY_EXCEEDED",
          message:
            reservedQuantity > 0
              ? `Only ${availableStock} available (${reservedQuantity} reserved by others). Please reduce quantity to ${availableStock}.`
              : `Only ${availableStock} item${
                  availableStock === 1 ? "" : "s"
                } available. Please reduce quantity.`,
          action: "reduce_quantity",
          canProceedToCheckout: false,
          stockInfo: {
            availableStock,
            dbStock,
            reservedQuantity,
            cartQuantity,
            maxAllowed: availableStock,
            isOutOfStock: false,
            isLowStock: availableStock < 10,
          },
          productDetails: {
            id: product.id,
            name: product.name,
            discountedPrice: product.discountedPrice,
            originalPrice: product.originalPrice,
            mainImage: product.images[0] || null,
          },
          cartDetails: {
            cartItemId: itemInCart.id,
            stockName: itemInCart.stockName,
            quantity: cartQuantity,
            itemTotal: availableStock * product.discountedPrice.toNumber(),
          },
        });
        continue;
      }

      // **IMPROVED: Better low stock detection**
      const lowStockThreshold = 10;
      if (availableStock <= lowStockThreshold && availableStock > 0) {
        hasLowStockWarnings = true;
        totalDiscountedPrice += itemDiscountedTotal;
        totalOriginalPrice += itemOriginalTotal;
        totalValidItems += 1;

        responseProducts.push({
          productId,
          status: "low_stock_warning",
          statusCode: "LOW_STOCK",
          message:
            reservedQuantity > 0
              ? `Only ${availableStock} available (${reservedQuantity} reserved by others). Hurry up!`
              : `Only ${availableStock} item${
                  availableStock === 1 ? "" : "s"
                } left in stock!`,
          action: "proceed_with_caution",
          canProceedToCheckout: true,
          stockInfo: {
            availableStock,
            dbStock,
            reservedQuantity,
            cartQuantity,
            isOutOfStock: false,
            isLowStock: true,
          },
          productDetails: {
            id: product.id,
            name: product.name,
            discountedPrice: product.discountedPrice,
            originalPrice: product.originalPrice,
            mainImage: product.images[0] || null,
          },
          cartDetails: {
            cartItemId: itemInCart.id,
            stockName: itemInCart.stockName,
            quantity: cartQuantity,
            itemDiscountedTotal,
            itemOriginalTotal
          },
        });
        continue;
      }

      // All good - normal stock levels
      totalDiscountedPrice += itemDiscountedTotal;
      totalOriginalPrice += itemOriginalTotal;
      totalValidItems += 1;

      responseProducts.push({
        productId,
        status: "available",
        statusCode: "IN_STOCK",
        message: "Item is available.",
        action: "proceed",
        canProceedToCheckout: true,
        stockInfo: {
          availableStock,
          dbStock,
          reservedQuantity,
          cartQuantity,
          isOutOfStock: false,
          isLowStock: false,
        },
        productDetails: {
          id: product.id,
          name: product.name,
          discountedPrice: product.discountedPrice,
          originalPrice: product.originalPrice,
          mainImage: product.images[0] || null,
        },
        cartDetails: {
          cartItemId: itemInCart.id,
          stockName: itemInCart.stockName,
          quantity: cartQuantity,
          itemDiscountedTotal,
        },
      });
    }

    // Determine overall cart status and provide guidance
    let overallStatus = "ready";
    let checkoutMessage = "Your cart is ready for checkout.";
    let canProceedToCheckout = true;

    if (hasOutOfStockItems || hasQuantityIssues) {
      overallStatus = "requires_action";
      canProceedToCheckout = false;
      if (hasOutOfStockItems && hasQuantityIssues) {
        checkoutMessage =
          "Some items are out of stock and others exceed available quantity. Please review your cart.";
      } else if (hasOutOfStockItems) {
        checkoutMessage =
          "Some items in your cart are out of stock or reserved by others. Please remove them to continue.";
      } else {
        checkoutMessage =
          "Some items exceed available stock. Please adjust quantities to continue.";
      }
    } else if (hasLowStockWarnings) {
      overallStatus = "low_stock_warning";
      checkoutMessage =
        "Some items have limited stock. Complete your purchase soon!";
    }

    // **IMPROVED: Add timestamp for cache management**
    const responseData = {
      success: true,
      timestamp: new Date().toISOString(),
      overallStatus,
      canProceedToCheckout,
      checkoutMessage,
      cartSummary: {
        totalValidItems,
        totalDiscountedPrice,
        totalOriginalPrice,
        itemsRequiringAttention: responseProducts.filter(
          (p) => !p.canProceedToCheckout
        ).length,
        hasOutOfStockItems,
        hasLowStockWarnings,
        hasQuantityIssues,
        totalReservedItems: reservations.reduce(
          (sum, r) => sum + r.reservedQuantity,
          0
        ),
      },
      products: responseProducts,
      recommendations: {
        outOfStockCount: responseProducts.filter(
          (p) => p.statusCode === "OUT_OF_STOCK"
        ).length,
        quantityIssuesCount: responseProducts.filter(
          (p) => p.statusCode === "QUANTITY_EXCEEDED"
        ).length,
        lowStockCount: responseProducts.filter(
          (p) => p.statusCode === "LOW_STOCK"
        ).length,
        actionRequired: !canProceedToCheckout,
      },
    };

    res.status(200).json(responseData);
  } catch (err) {
    console.error("Cart check error:", err);
    next(err);
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
          isActive: true,
        },
      },
      _sum: { quantity: true },
    });

    res.status(200).json({ success: true, count: count._sum.quantity || 0 });
  } catch (error) {
    next(error);
  }
};

// check delivery availability
export const checkDeliveryController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { zipCode } = req.body;

    if (!zipCode) {
      res.status(400).json({
        success: false,
        message: "Zip code is required",
      });
      return;
    }

    // Check delivery availability
    const deliveryCheck = await checkDeliveryAvailability(zipCode);

    res.status(200).json({
      success: true,
      canDeliver: deliveryCheck.canDeliver,
      message: deliveryCheck.message,
    });
    return;
  } catch (err) {
    next(err);
  }
};

//
// DELIVERY
//

// get delivery settings
export const getDeliverySettings = async (req: Request, res: Response) => {
  const key = `delivery:settings`;
  const cachedDeliverySettings = await redisApp.get(key);

  if (cachedDeliverySettings) {
    return res.status(200).json({
      success: true,
      message: "Fetched delivery settings successfully",
      setting: JSON.parse(cachedDeliverySettings),
    });
  }

  const fetchedDeliverySettings = await prisma.priceSetting.findFirst({
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

  if (!fetchedDeliverySettings) {
    // Let global error handler take care of it
    throw new Error("No delivery settings found");
  }

  await redisApp.set(
    key,
    JSON.stringify(fetchedDeliverySettings),
    "EX",
    60 * 60 // 30 minutes
  );

  return res.status(200).json({
    success: true,
    message: "Fetched delivery settings successfully",
    setting: fetchedDeliverySettings,
  });
};
