import { Router } from "express";
import { isAuthenticated } from "../middlewares/auth.middlewares";
import { handleViewingAllProducts } from "../controllers/userProduct.controller";
const router = Router();

//get all the products
router.get("/", isAuthenticated, handleViewingAllProducts);

export default router;