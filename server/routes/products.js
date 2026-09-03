import express from "express";
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
} from "../controllers/productController.js";
import { requireAdmin, optionalAuth } from "../middleware/auth.js";

const router = express.Router();

router.route("/")
  .get(optionalAuth, getProducts)
  .post(requireAdmin, createProduct);

router.route("/:id")
  .get(optionalAuth, getProductById)
  .put(requireAdmin, updateProduct)
  .delete(requireAdmin, deleteProduct);

export default router;
