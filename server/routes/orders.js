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

router.route("/my")
  .get(requireAuth, getMyOrders);

router.route("/")
  .get(requireAdmin, getOrders)
  .post(requireAuth, createOrder); // createOrder requires Auth

router.route("/:id")
  .get(requireAuth, getOrderById)
  .put(requireAuth, updateOrder);

export default router;
