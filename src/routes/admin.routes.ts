import { Router } from "express";
import {
  validateProductCore,
  adminCategoryInputValidation,
  adminPreSignedInputValidation,
  validateProductImages,
  validateProductStock,
  validateEditProductImages,
  adminEditSubCategoryInputValidation,
} from "../middlewares/validate.middlewares";
import { isAdmin, identifySessionUser } from "../middlewares/auth.middlewares";
import {
  handleAddCategory,
  handleAddProduct,
  handleEditCategory,
  handleEditProduct,
  handleEditSubCategory,
  handleGetCategory,
  handleGetLowLevelCategories,
  handleGetTopLevelCategories,
} from "../controllers/adminProduct.controller";
import { generateUploadUrl } from "../controllers/s3.controller";

const router = Router();

//
// IMAGES
//

// admin add product images and get presigned url
router.post(
  "/add/images/presigned-urls",
  identifySessionUser,
  isAdmin,
  adminPreSignedInputValidation,
  generateUploadUrl
);

//
// PRODUCTS
//

// admin add product route
router.post(
  "/add/product",
  identifySessionUser,
  isAdmin,
  validateProductCore,
  validateProductImages,
  validateProductStock,
  handleAddProduct
);

router.put(
  "/edit/product/:id",
  identifySessionUser,
  isAdmin,
  validateProductCore,
  validateEditProductImages,
  validateProductStock,
  handleEditProduct
);

//
// CATEGORY
//

// admin add category or subcategory route
router.post(
  "/add/category",
  identifySessionUser,
  isAdmin,
  adminCategoryInputValidation,
  handleAddCategory
);

// admin edit category route
router.put(
  "/update/category/:id",
  identifySessionUser,
  isAdmin,
  handleEditCategory
);

// admin edit subcategory route
router.put(
  "/update/subcategory/:id",
  identifySessionUser,
  isAdmin,
  adminEditSubCategoryInputValidation,
  handleEditSubCategory
);

// admin get all categories
router.get("/categories", identifySessionUser, isAdmin, handleGetCategory);

// admin get top categories
router.get(
  "/topcategories",
  identifySessionUser,
  isAdmin,
  handleGetTopLevelCategories
);

// admin get sub categories
router.get(
  "/lowcategories",
  identifySessionUser,
  isAdmin,
  handleGetLowLevelCategories
);

export default router;
