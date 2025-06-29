import { Router } from "express";
import { adminProductInputValidation ,adminCategoryInputValidation} from "../middlewares/validate.middlewares";
import { isAdmin, isAuthenticated } from "../middlewares/auth.middlewares";
import { handleAddCategory, handleAddProduct } from "../controllers/adminProduct.controller";

const router = Router();

//admin add product route
router.post(
  "/product/add",
  isAuthenticated,
  isAdmin,
  adminProductInputValidation,
  handleAddProduct
);

//admin add category route
router.post(
  "/category/add",
  isAuthenticated,
  isAdmin,
  adminCategoryInputValidation,
  handleAddCategory
);


export default router;
