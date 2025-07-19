import { Router } from "express";
import {
  validateProductCore,
  adminCategoryInputValidation,
  adminPreSignedInputValidation,
  validateProductImages,
  validateProductStock,
  validateDeleteProductStock,
} from "../middlewares/validate.middlewares";
import { isAdmin, identifySessionUser } from "../middlewares/auth.middlewares";
import {
  handleAddCategory,
  handleAddProduct,
  handleAddStock,
  handleDeleteStock,
  handleGetCategory,
  handleUpdateStock,
} from "../controllers/adminProduct.controller";
import { generateUploadUrl } from "../controllers/s3.controller";

const router = Router();

// admin add product images and get presigned url
router.post(
  "/add/product/images/presigned-urls",
  identifySessionUser,
  isAdmin,
  adminPreSignedInputValidation,
  generateUploadUrl
);

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

// admin add category route
router.post(
  "/add/category",
  identifySessionUser,
  isAdmin,
  adminCategoryInputValidation,
  handleAddCategory
);
// admin get categories
router.get(
  "/get/categories",
  identifySessionUser,
  isAdmin,
  handleGetCategory
);

// admin add stock
router.post(
  "/stock",
  identifySessionUser,
  isAdmin,
  validateProductStock,
  handleAddStock
);

// admin update stock
router.put(
  "/stock",
  identifySessionUser,
  isAdmin,
  validateProductStock,
  handleUpdateStock
);

// admin delete stock
router.delete(
  "/stock",
  identifySessionUser,
  isAdmin,
  validateDeleteProductStock,
  handleDeleteStock
);
export default router;
