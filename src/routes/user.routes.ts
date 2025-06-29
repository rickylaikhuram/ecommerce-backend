import { Router } from "express";
import { userInputValidationMiddleware } from "../middlewares/validate.middlewares";
import { handleUserName, handleUserSignin, handleUserSignup, queryExistingUserCheck } from "../controllers/user.controller";
import { isAuthenticated } from "../middlewares/auth.middlewares";

const router = Router();

//user signup route
router.post(
  "/signup",
  isAuthenticated,
  userInputValidationMiddleware("signup"),
  handleUserSignup
);

//user signin route
router.post(
  "/signin",
  isAuthenticated,
  userInputValidationMiddleware("signin"),
  handleUserSignin
);

//change user name route
router.post(
  "/change/username",
  isAuthenticated,
  queryExistingUserCheck,
  handleUserName
);


export default router;
