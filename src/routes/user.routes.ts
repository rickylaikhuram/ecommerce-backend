import { Router } from "express";
import {
  userSignInInputValidationMiddleware,
  userSignupInputValidationMiddleware,
  validateAddressBody,
  validateAddToCart,
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
  getWishlist,
  getWishlistedProductIds,
  getCartCount,
  handleToggleWishlist,
  queryExistingProductCheck,
  getCart,
  addToCart,
  updateCartItemQuantity,
  removeFromCart,
  clearCart,
  checkProductsInCart,
} from "../controllers/userProduct.controller";

const router = Router();

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

//user signin routes
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

//get user data route
router.get("/profile", identifySessionUser, handleGettingUserProfile);

//update user name route
router.put(
  "/change/username",
  identifySessionUser,
  queryExistingUserCheck,
  handleUserName
);

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

// get cart count
router.get("/cart/count", identifySessionUser, getCartCount);

// get all cart products
router.get("/cart", identifySessionUser, getCart);

// Add to cart
router.post("/cart/add", identifySessionUser, validateAddToCart, addToCart);

// Update quantity
router.patch(
  "/cart/update/:cartItemId",
  identifySessionUser,
  validateUpdateQuantity,
  updateCartItemQuantity
);

// Remove from cart
router.delete("/cart/remove/:cartItemId", identifySessionUser, removeFromCart);

// Clear cart
router.delete("/cart/clear", identifySessionUser, clearCart);

// Check if products are in cart
router.post(
  "/cart/check-products",
  identifySessionUser,
  validateCheckProducts,
  checkProductsInCart
);

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

// log out user
router.post("/logout", logoutUser);

export default router;
