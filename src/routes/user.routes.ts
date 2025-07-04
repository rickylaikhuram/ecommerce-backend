import { Router } from "express";
import {
  userSignInInputValidationMiddleware,
  userSignupInputValidationMiddleware,
  validateOtpInput,
  validatePhone,
} from "../middlewares/validate.middlewares";
import {
  handleOtpSigninInitiate,
  handleUserName,
  handleUserSignin,
  handleUserSigninWithOtp,
  handleUserSignUpVerify,
  handleVerifiedUserSignup,
  queryExistingUserCheck,
} from "../controllers/user.controller";
import { identifySessionUser } from "../middlewares/auth.middlewares";

const router = Router();

//user signup routes
router.post(
  "/signup/initiate",
  identifySessionUser,
  userSignupInputValidationMiddleware,
  handleUserSignUpVerify
);
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

router.post("/signin/otp/verify",identifySessionUser, validateOtpInput, handleUserSigninWithOtp);

//update user name route
router.put(
  "/change/username",
  identifySessionUser,
  queryExistingUserCheck,
  handleUserName
);

export default router;
