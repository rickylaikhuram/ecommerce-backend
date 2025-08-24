import { Router } from "express";
import {
  userSignInInputValidationMiddleware,
  userSignupInputValidationMiddleware,
  validateAddressBody,
  validateAddToCart,
  validateChangePassword,
  validateCheckProducts,
  validateOtpInput,
  validatePhone,
  validateUpdateQuantity,
} from "../middlewares/validate.middlewares";
import {
  createAddress,
  deleteAddress,
  getAllAddresses,
  handleGettingUserProfile,
  handleUserName,
  patchIsDefaultAddress,
  putEditAddress,
  queryExistingUserCheck,
  getWishlist,
  getWishlistedProductIds,
  handleToggleWishlist,
  upiQrPaymentController,
  updateEmailVeried,
  updateEmailVerify,
  updatePhoneVerify,
  updatePhoneVeried,
  getAllOrder,
  getOrderDetails,
  changePassword,
  cashOnDeliveryController,
} from "../controllers/user.controller";
import {
  handleOtpSigninInitiate,
  handleResendSignupOtp,
  handleUserSignin,
  handleUserSigninWithOtp,
  handleUserSignUpVerify,
  handleVerifiedUserSignup,
} from "../controllers/auth.controller";
import { identifySessionUser, isUser } from "../middlewares/auth.middlewares";
import { logoutUser } from "../controllers/auth.controller";
import {
  getCartCount,
  queryExistingProductCheck,
  getCart,
  addToCart,
  updateCartItemQuantity,
  removeFromCart,
  clearCart,
  checkProductsInCart,
} from "../controllers/userProduct.controller";

const router = Router();

//
// USER SIGN-UP ROUTES
//

//user signup routes
router.post(
  "/signup/initiate",
  identifySessionUser,
  userSignupInputValidationMiddleware,
  handleUserSignUpVerify
);

router.post("/signup/resend", identifySessionUser, handleResendSignupOtp);

router.post(
  "/signup/confirm",
  identifySessionUser,
  validateOtpInput,
  handleVerifiedUserSignup
);

//
// USER SIGN-IN ROUTES
//

// Password-based sign-in
router.post(
  "/signin/password",
  identifySessionUser,
  userSignInInputValidationMiddleware,
  handleUserSignin
);

// OTP-based sign-in
router.post(
  "/signin/otp/initiate",
  identifySessionUser,
  validatePhone,
  handleOtpSigninInitiate
);

// OTP verify
router.post(
  "/signin/otp/verify",
  identifySessionUser,
  validateOtpInput,
  handleUserSigninWithOtp
);

//
// USER DATA ROUTES
//

//get user data route
router.get(
  "/profile",
  identifySessionUser,
  isUser,
  queryExistingUserCheck,
  handleGettingUserProfile
);

//update user name route
router.patch(
  "/profile/name",
  identifySessionUser,
  isUser,
  queryExistingUserCheck,
  handleUserName
);

// get otp to update user email route
router.patch(
  "/profile/email",
  identifySessionUser,
  isUser,
  queryExistingUserCheck,
  updateEmailVerify
);

// verify otp to update user email route
router.patch(
  "/profile/email/verify",
  identifySessionUser,
  isUser,
  queryExistingUserCheck,
  updateEmailVeried
);

// get otp to update user phone route
router.patch(
  "/profile/phone",
  identifySessionUser,
  isUser,
  queryExistingUserCheck,
  updatePhoneVerify
);

// verify otp to update user phone route
router.patch(
  "/profile/phone/verify",
  identifySessionUser,
  isUser,
  queryExistingUserCheck,
  updatePhoneVeried
);

// change password route
router.patch(
  "/profile/change-password",
  identifySessionUser,
  queryExistingUserCheck,
  validateChangePassword,
  changePassword
);

//
// USER WISHLIST ROUTES
//

// add or remove wishlist product
router.post(
  "/wishlist/toggle/:id",
  identifySessionUser,
  queryExistingUserCheck,
  queryExistingProductCheck,
  handleToggleWishlist
);

// get wishlisted product ids
router.get(
  "/wishlist/ids",
  identifySessionUser,
  queryExistingUserCheck,
  getWishlistedProductIds
);

// get wishlisted product
router.get(
  "/wishlist",
  identifySessionUser,
  queryExistingUserCheck,
  getWishlist
);

//
// CART ROUTES
//

// get cart count
router.get("/cart/count", identifySessionUser, getCartCount);

// get all cart products
router.get("/cart", identifySessionUser, getCart);

// Add to cart
router.post("/cart/add", identifySessionUser, validateAddToCart, addToCart);

// Update quantity
router.patch(
  "/cart/items/:cartItemId/quantity",
  identifySessionUser,
  validateUpdateQuantity,
  updateCartItemQuantity
);

// Remove from cart
router.delete("/cart/items/:cartItemId", identifySessionUser, removeFromCart);

// Clear cart
router.delete("/cart/clear", identifySessionUser, clearCart);

// Check if products are in cart
router.post(
  "/cart/check-products",
  identifySessionUser,
  validateCheckProducts,
  checkProductsInCart
);

//
// USER ADDRESS ROUTES
//

// add address
router.post(
  "/address",
  identifySessionUser,
  isUser,
  validateAddressBody,
  queryExistingUserCheck,
  createAddress
);

// get all addresses
router.get(
  "/address",
  identifySessionUser,
  isUser,
  queryExistingUserCheck,
  getAllAddresses
);

// edit address
router.put(
  "/address/:id",
  identifySessionUser,
  isUser,
  validateAddressBody,
  queryExistingUserCheck,
  putEditAddress
);

// edit is default address
router.patch(
  "/address/:id/default",
  identifySessionUser,
  isUser,
  queryExistingUserCheck,
  patchIsDefaultAddress
);

// delete address
router.delete(
  "/address/:id",
  identifySessionUser,
  isUser,
  queryExistingUserCheck,
  deleteAddress
);

//
// USER ORDER ROUTES
//

router.post(
  "/create-order/upi-qr",
  identifySessionUser,
  isUser,
  queryExistingUserCheck,
  validateAddressBody,
  validateCheckProducts,
  upiQrPaymentController
);

router.post(
  "/create-order/cod",
  identifySessionUser,
  isUser,
  queryExistingUserCheck,
  validateAddressBody,
  validateCheckProducts,
  cashOnDeliveryController
);

router.get(
  "/orders",
  identifySessionUser,
  isUser,
  queryExistingUserCheck,
  getAllOrder
);

router.get(
  "/orders/:orderId",
  identifySessionUser,
  isUser,
  queryExistingUserCheck,
  getOrderDetails
);

// log out user
router.post("/logout", logoutUser);

export default router;
