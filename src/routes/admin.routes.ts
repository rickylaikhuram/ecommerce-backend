import { Router } from "express";
import { adminProductInputValidation ,adminCategoryInputValidation} from "../middlewares/validate.middlewares";
import { isAdmin, identifySessionUser } from "../middlewares/auth.middlewares";
import { handleAddCategory, handleAddProduct } from "../controllers/adminProduct.controller";

const router = Router();

//admin add product route
router.post(
  "/add/product",
  identifySessionUser,
  isAdmin,
  adminProductInputValidation,
  handleAddProduct
);

//admin add category route
router.post(
  "/add/category",
  identifySessionUser,
  isAdmin,
  adminCategoryInputValidation,
  handleAddCategory
);


export default router;
