import { Router } from "express";
import { identifySessionUser } from "../middlewares/auth.middlewares";
import { handleGetAllCategories, handleGetFilteredProducts, handleGetProductById } from "../controllers/userProduct.controller";
const router = Router();

//get all the products
router.get("/", identifySessionUser, handleGetFilteredProducts);

//get all the category
router.get("/categories", identifySessionUser, handleGetAllCategories);

// Single product detail
router.get("/:id", identifySessionUser, handleGetProductById);


// // 2. Search with autocomplete
// router.get("/search", identifySessionUser, handleProductSearch);

// // 3. Related/Similar products
// router.get("/:id/related", identifySessionUser, handleGetRelatedProducts);

export default router;