// server/routes/authRoutes.ts
import { Router } from "express";
import {
  userSignInInputValidationMiddleware,
  userSignupInputValidationMiddleware,
  validateOtpInput,
  validatePhone,
} from "../middlewares/validate.middlewares";
import {
  handleUserSignUpVerify,
  handleResendSignupOtp,
  handleVerifiedUserSignup,
  handleUserSignin,
  handleOtpSigninInitiate,
  handleUserSigninWithOtp,
  logoutUser,
  handleOtpForgotPasswordInitiate,
  handleOtpForgotPasswordVerify,
  handleOtpForgotPasswordResend,
  handleResetForgotPassword,
} from "../controllers/auth.controller";
import { identifySessionUser } from "../middlewares/auth.middlewares";
import { AuthRequest } from "../types/customTypes";

const router = Router();

//get current user
router.get("/me", identifySessionUser, (req: AuthRequest, res) => {
  res.status(200).json({ success: true, user: req.user, token: req.token });
});

/* -------------------- SIGN UP -------------------- */

// Step 1: Initiate signup - save data to Redis & send OTP
router.post(
  "/signup/initiate",
  identifySessionUser,
  userSignupInputValidationMiddleware,
  handleUserSignUpVerify
);

// Resend OTP
router.post("/signup/resend", identifySessionUser, handleResendSignupOtp);

// Step 2: Confirm OTP and create account
router.post(
  "/signup/confirm",
  identifySessionUser,
  validateOtpInput,
  handleVerifiedUserSignup
);

/* -------------------- SIGN IN -------------------- */

// Password-based sign-in
router.post(
  "/signin/password",
  identifySessionUser,
  userSignInInputValidationMiddleware,
  handleUserSignin
);

// OTP sign-in: Step 1 - Send OTP
router.post(
  "/signin/otp/initiate",
  identifySessionUser,
  validatePhone,
  handleOtpSigninInitiate
);

// OTP sign-in: Step 2 - Verify OTP
router.post(
  "/signin/otp/verify",
  identifySessionUser,
  validateOtpInput,
  handleUserSigninWithOtp
);

/* -------------------- FORGOT - PASSWORD -------------------- */

// OTP  ||  FORGOT - PASSWORD: Step 1 - Send OTP IF USER EXIST
router.post(
  "/forgot-password/initiate",
  identifySessionUser,
  validatePhone,
  handleOtpForgotPasswordInitiate
);

// OTP  ||  FORGOT - PASSWORD: Step 2 - Verify OTP and Send Session ID
router.post(
  "/forgot-password/verify-otp",
  identifySessionUser,
  validateOtpInput,
  handleOtpForgotPasswordVerify
);

// OTP  ||  FORGOT - PASSWORD: Step 3 - Update Password
router.post(
  "/forgot-password/reset",
  identifySessionUser,
  handleResetForgotPassword
);

// OTP  ||  FORGOT - PASSWORD: Step 4 - Resend OTP
router.post(
  "/forgot-password/resend",
  identifySessionUser,
  validatePhone,
  handleOtpForgotPasswordResend
);

/* -------------------- LOGOUT -------------------- */

router.post("/logout", logoutUser);

export default router;
