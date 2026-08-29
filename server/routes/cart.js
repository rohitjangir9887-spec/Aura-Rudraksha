import express from "express";
import { calculateOrderTotals } from "../services/pricingService.js";
import { optionalAuth } from "../middleware/auth.js";

const router = express.Router();

/**
 * POST /api/cart/calculate
 * Single authoritative endpoint for computing cart & checkout totals
 * Body: { lines: [{ id, qty }], couponCode: "AURA20" }
 */
router.post("/calculate", optionalAuth, async (req, res, next) => {
  try {
    const { lines = [], couponCode = null } = req.body;
    const authUserId = req.user?.authUserId || null;

    const totals = await calculateOrderTotals({
      lines,
      couponCode,
      authUserId
    });

    return res.json({
      success: true,
      data: totals
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/cart/validate-coupon
 * Validates a coupon against the current cart lines
 */
router.post("/validate-coupon", optionalAuth, async (req, res, next) => {
  try {
    const { code, couponCode, lines = [] } = req.body;
    const cleanCode = (code || couponCode || "").trim().toUpperCase();
    const authUserId = req.user?.authUserId || null;

    if (!cleanCode) {
      return res.status(400).json({
        success: false,
        valid: false,
        message: "Coupon code is required"
      });
    }

    const totals = await calculateOrderTotals({
      lines,
      couponCode: cleanCode,
      authUserId
    });

    const isCouponValid = totals.couponValid;

    return res.json({
      success: true,
      valid: isCouponValid,
      status: totals.couponStatus,
      message: totals.couponReason,
      data: totals.appliedCoupon,
      totals: totals
    });
  } catch (err) {
    next(err);
  }
});

export default router;
