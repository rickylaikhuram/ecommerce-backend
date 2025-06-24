import { Router } from "express";
import { userInputValidationMiddleware } from "../middlewares/userMiddlewares";
import { existingUserCheck, handleUserSignin, handleUserSignup } from "../controllers/user";

const app = Router();

//user signup route
app.post(
  "/signup",
  userInputValidationMiddleware("signup"),
  existingUserCheck("signup"),
  handleUserSignup
);

//user signin route
app.post(
  "/signin",
  userInputValidationMiddleware("signin"),
  existingUserCheck("signin"),
  handleUserSignin
);


export default app;
