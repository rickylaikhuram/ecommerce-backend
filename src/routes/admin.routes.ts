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
  handleGetAdmin,
  handleGetAllOrders,
  handleGetAllUser,
  handleGetCategory,
  handleGetCustomer,
  handleGetLowLevelCategories,
  handleGetOrderDetails,
  handleGetTopLevelCategories,
  handleGetUser,
  handleGetUserAddress,
  handleGetUserCart,
  handleGetUserOrders,
  handleGetUserWishlist,
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

//
// USER
//

// get all users
router.get(
  "/users",
  identifySessionUser,
  isAdmin,
  handleGetAllUser
);

// get all customers
router.get(
  "/customers",
  identifySessionUser,
  isAdmin,
  handleGetCustomer
);

// get all admins
router.get(
  "/admins",
  identifySessionUser,
  isAdmin,
  handleGetAdmin
);

// get specific users details
router.get(
  "/users/:userId",
  identifySessionUser,
  isAdmin,
  handleGetUser
);

// get specific users order details
router.get(
  "/users-order/:userId",
  identifySessionUser,
  isAdmin,
  handleGetUserOrders
);

// get specific users address details
router.get(
  "/users-address/:userId",
  identifySessionUser,
  isAdmin,
  handleGetUserAddress
);

// get specific users wishlist details
router.get(
  "/users-wishlist/:userId",
  identifySessionUser,
  isAdmin,
  handleGetUserWishlist
);

// get specific users cart details
router.get(
  "/users-cart/:userId",
  identifySessionUser,
  isAdmin,
  handleGetUserCart
);

//
// ORDER
//

// get all orders
router.get(
  "/orders",
  identifySessionUser,
  isAdmin,
  handleGetAllOrders
);

// get specific order details
router.get(
  "/orders/:orderId",
  identifySessionUser,
  isAdmin,
  handleGetOrderDetails
);

// update order status
router.put(
  "/orders/:orderId",
  identifySessionUser,
  isAdmin,
  handleGetOrderDetails
);

export default router;
