import { Router } from "express";
import {
  userSignInInputValidationMiddleware,
  userSignupInputValidationMiddleware,
  validateOtpInput,
  validatePhone,
} from "../middlewares/validate.middlewares";
import {
  handleUserName,
  queryExistingUserCheck,
} from "../controllers/user.controller";
import {handleOtpSigninInitiate,
  handleResendSignupOtp,
  
  handleUserSignin,
  handleUserSigninWithOtp,
  handleUserSignUpVerify,
  handleVerifiedUserSignup,}from "../controllers/auth.controller"
import { identifySessionUser } from "../middlewares/auth.middlewares";
import { logoutUser } from "../controllers/auth.controller";

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
  validatePhone, // Validate phone & otp
  handleOtpSigninInitiate // New controller
);

// OTP verify
router.post(
  "/signin/otp/verify",
  identifySessionUser,
  validateOtpInput,
  handleUserSigninWithOtp
);

//update user name route
router.put(
  "/change/username",
  identifySessionUser,
  queryExistingUserCheck,
  handleUserName
);
// log out user
router.post("/logout", logoutUser);

export default router;
