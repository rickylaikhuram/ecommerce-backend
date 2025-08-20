import { Request, Response } from "express";
import prisma from "../config/prisma";
import dotenv from "dotenv";
import { deleteS3File } from "../services/s3.service";

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

  console.log("Edit category request:", { id, categoryName });

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

  console.log("Edit category request:", {
    id,
    name,
    parentId,
    altText,
    deleteImage,
    updatedImages,
  });

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
  const result = await prisma.$transaction(async (tx) => {
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
  });

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
  const result = await prisma.$transaction(async (tx) => {
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
  });

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
  console.log(
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
    id
  );
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
  const result = await prisma.$transaction(async (tx) => {
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
        imagesToDelete.map(async (img) => {
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
  });

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

//
// BANNER
//
