import { Router } from "express";
import { identifySessionUser } from "../middlewares/auth.middlewares";
import { handleGetFilteredProducts, handleGetProductById } from "../controllers/userProduct.controller";
const router = Router();

//get all the products
router.get("/", identifySessionUser, handleGetFilteredProducts);

// Single product detail
router.get("/:id", identifySessionUser, handleGetProductById);

// // 2. Search with autocomplete
// router.get("/search", identifySessionUser, handleProductSearch);

// // 3. Related/Similar products
// router.get("/:id/related", identifySessionUser, handleGetRelatedProducts);

export default router;