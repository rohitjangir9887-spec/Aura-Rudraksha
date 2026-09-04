import express from "express";
import {
  getOrders,
  getOrderById,
  createOrder,
  updateOrder,
  getMyOrders
} from "../controllers/orderController.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = express.Router();

// Strict anti-caching for all order endpoints
router.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");
  next();
});

router.route("/my")
  .get(requireAuth, getMyOrders);

router.route("/")
  .get(requireAdmin, getOrders)
  .post(requireAuth, createOrder);

router.route("/:id")
  .get(requireAuth, getOrderById)
  .put(requireAuth, updateOrder);

export default router;
