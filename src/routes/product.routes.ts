import { Router } from "express";
import { identifySessionUser } from "../middlewares/auth.middlewares";
import {
  handleGetAllCategories,
  handleGetFilteredProducts,
  handleGetProductById,
  handlePopularSearches,
  handleSearchAutocomplete,
} from "../controllers/userProduct.controller";
import { handleGetAllBanner } from "../controllers/adminProduct.controller";
const router = Router();

//get all the products
router.get("/", identifySessionUser, handleGetFilteredProducts);

//get all the category
router.get("/categories", identifySessionUser, handleGetAllCategories);

// Search with autocomplete
router.get(
  "/search/autocomplete",
  identifySessionUser,
  handleSearchAutocomplete
);

// get with Popular searches
router.get("/search/popular", identifySessionUser, handlePopularSearches);

// // 3. Related/Similar products
// router.get("/:id/related", identifySessionUser, handleGetRelatedProducts);

//
// BANNERS
//

router.get("/banners", identifySessionUser, handleGetAllBanner);

// Single product detail
router.get("/:id", identifySessionUser, handleGetProductById);
export default router;
