import { Router } from "express";
import { identifySessionUser } from "../middlewares/auth.middlewares";
import { handleViewingAllProducts } from "../controllers/userProduct.controller";
const router = Router();

//get all the products
router.get("/", identifySessionUser, handleViewingAllProducts);

export default router;