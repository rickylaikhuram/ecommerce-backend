import { Router } from "express";
import {
  validateProductCore,
  adminCategoryInputValidation,
  adminPreSignedInputValidation,
  validateProductImages,
  validateProductStock,
  validateEditProductImages,
  adminEditSubCategoryInputValidation,
  validateOrderStatus,
  validatePriceSetting,
  adminBannerInputValidation,
} from "../middlewares/validate.middlewares";
import { isAdmin, identifySessionUser } from "../middlewares/auth.middlewares";
import {
  handleAddBanner,
  handleAddCategory,
  handleAddProduct,
  handleDeleteProduct,
  handleEditCategory,
  handleEditProduct,
  handleEditSubCategory,
  handleGetAdmin,
  handleGetAllBanner,
  handleGetAllOrders,
  handleGetAllUser,
  handleGetCategory,
  handleGetCustomer,
  handleGetLowLevelCategories,
  handleGetOrderDetails,
  handleGetPriceSetting,
  handleGetTopLevelCategories,
  handleGetUser,
  handleGetUserAddress,
  handleGetUserCart,
  handleGetUserOrders,
  handleGetUserWishlist,
  handleUpdateOrderStatus,
  handleUpdatePriceSetting,
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

// admin edit product route
router.put(
  "/edit/product/:id",
  identifySessionUser,
  isAdmin,
  validateProductCore,
  validateEditProductImages,
  validateProductStock,
  handleEditProduct
);

// admin delete product route
router.delete(
  "/delete/product/:productId",
  identifySessionUser,
  isAdmin,
  handleDeleteProduct
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
router.get("/users", identifySessionUser, isAdmin, handleGetAllUser);

// get all customers
router.get("/customers", identifySessionUser, isAdmin, handleGetCustomer);

// get all admins
router.get("/admins", identifySessionUser, isAdmin, handleGetAdmin);

// get specific users details
router.get("/users/:userId", identifySessionUser, isAdmin, handleGetUser);

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
router.get("/orders", identifySessionUser, isAdmin, handleGetAllOrders);

// get specific order details
router.get(
  "/orders/:orderId",
  identifySessionUser,
  isAdmin,
  handleGetOrderDetails
);

// update order status
router.patch(
  "/orders/:orderId",
  identifySessionUser,
  isAdmin,
  validateOrderStatus,
  handleUpdateOrderStatus
);

//
// FEE
//

// get order status
router.get(
  "/pricesetting",
  identifySessionUser,
  isAdmin,
  handleGetPriceSetting
);

// update order status
router.put(
  "/pricesetting",
  identifySessionUser,
  isAdmin,
  validatePriceSetting,
  handleUpdatePriceSetting
);

//
// BANNER
//

router.post(
  "/banner",
  identifySessionUser,
  isAdmin,
  adminBannerInputValidation,
  handleAddBanner
);

router.get(
  "/banner",
  identifySessionUser,
  isAdmin,
  adminBannerInputValidation,
  handleGetAllBanner
);

export default router;
