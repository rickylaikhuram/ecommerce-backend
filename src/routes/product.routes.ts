import { Router } from "express";
import { identifySessionUser } from "../middlewares/auth.middlewares";
import { handleViewingAllProducts, handleViewingCategoryProducts } from "../controllers/userProduct.controller";
const router = Router();

//get all the products
router.get("/all", identifySessionUser, handleViewingAllProducts);

router.get("/bycategory",identifySessionUser,handleViewingCategoryProducts)

export default router;