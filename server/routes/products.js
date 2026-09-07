import express from "express";
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  reorderProducts
} from "../controllers/productController.js";
import { requireAdmin, optionalAuth } from "../middleware/auth.js";

const router = express.Router();

router.route("/")
  .get(optionalAuth, getProducts)
  .post(requireAdmin, createProduct);

router.route("/reorder")
  .put(requireAdmin, reorderProducts);

router.route("/:id")
  .get(optionalAuth, getProductById)
  .put(requireAdmin, updateProduct)
  .delete(requireAdmin, deleteProduct);

export default router;
