import express from "express";
import {
  getCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  validateCoupon
} from "../controllers/couponController.js";
import { requireAdmin, optionalAuth, isAdminUser, hasAdminRole } from "../middleware/auth.js";

const router = express.Router();

router.post("/validate", validateCoupon);

// GET / stays public because the storefront (cart/checkout) displays active
// coupons to shoppers. optionalAuth lets the controller return the full
// dataset to authenticated admins and a reduced, public-safe view (active
// coupons only, no usage/limit counters) to everyone else.
router.route("/")
  .get(optionalAuth, getCoupons)
  .post(requireAdmin, createCoupon);

router.route("/:id")
  .put(requireAdmin, updateCoupon)
  .delete(requireAdmin, deleteCoupon);

export default router;

