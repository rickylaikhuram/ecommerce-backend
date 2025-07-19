import { Request, Response } from "express";
import prisma from "../config/prisma";

// view all the products
export const handleGetFilteredProducts = async (
  req: Request,
  res: Response
) => {
  // Extract query parameters
  const { category, sortBy, limit, offset, filter, period, search } = req.query;

  // Build where conditions array
  const whereConditions: any[] = [];

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
      price: true,
      fakePrice: true,
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
  if (search) {
    message = `Found ${totalCount} products for "${search}"`;
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
  });
};

// Single product detail
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

// view 10 best sellers of the weeks
