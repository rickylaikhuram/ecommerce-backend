import { Router } from "express";
import { adminProductInputValidation ,adminCategoryInputValidation} from "../middlewares/validate.middlewares";
import { isAdmin, isAuthenticated } from "../middlewares/auth.middlewares";
import { handleAddCategory, handleAddProduct } from "../controllers/adminProduct.controller";

const app = Router();

//user signup route
app.post(
  "/product/add",
  isAuthenticated,
  isAdmin,
  adminProductInputValidation,
  handleAddProduct
);

//user signin route
app.post(
  "/category/add",
  isAuthenticated,
  isAdmin,
  adminCategoryInputValidation,
  handleAddCategory
);


export default app;
