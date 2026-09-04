import express from "express";
import { calculateOrderTotals } from "../services/pricingService.js";
import { optionalAuth, requireAuth } from "../middleware/auth.js";
import { Customer } from "../models/Customer.js";

const router = express.Router();

function sanitizeCartLines(lines) {
  if (!Array.isArray(lines)) return [];
  const map = new Map();
  for (const item of lines) {
    if (!item) continue;
    let id = null;
    let qty = 1;
    if (typeof item === "string" || typeof item === "number") {
      id = String(item).trim();
    } else if (typeof item === "object" && item.id) {
      if (typeof item.id === "object") continue;
      id = String(item.id).trim();
      qty = Math.max(1, Math.floor(Number(item.qty) || 1));
    }
    if (!id || id === "[object Object]" || id === "undefined" || id === "null") continue;
    map.set(id, (map.get(id) || 0) + qty);
  }
  return Array.from(map.entries()).map(([id, qty]) => ({ id, qty }));
}

/**
 * GET /api/cart
 * Get persistent cart for logged in user
 */
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const authUserId = req.user.authUserId;
    const customer = await Customer.findOne({ authUserId });
    const cart = sanitizeCartLines(customer?.cart || []);
    return res.json({ success: true, data: { lines: cart } });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/cart
 * Save persistent cart for logged in user
 */
router.post("/", requireAuth, async (req, res, next) => {
  try {
    const authUserId = req.user.authUserId;
    const { lines = [] } = req.body;
    const cleanLines = sanitizeCartLines(lines);

    await Customer.updateOne(
      { authUserId },
      { $set: { cart: cleanLines } },
      { upsert: false }
    );

    return res.json({ success: true, data: { lines: cleanLines } });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/cart/merge
 * Deterministically merge guest cart into user cart without creating duplicates
 */
router.post("/merge", requireAuth, async (req, res, next) => {
  try {
    const authUserId = req.user.authUserId;
    const { guestLines = [] } = req.body;
    const cleanGuest = sanitizeCartLines(guestLines);

    const customer = await Customer.findOne({ authUserId });
    const userCart = sanitizeCartLines(customer?.cart || []);

    const mergedMap = new Map();
    for (const item of userCart) {
      mergedMap.set(item.id, item.qty);
    }
    for (const item of cleanGuest) {
      if (mergedMap.has(item.id)) {
        // Deterministic rule: take max quantity to avoid unexpected duplication
        mergedMap.set(item.id, Math.max(mergedMap.get(item.id), item.qty));
      } else {
        mergedMap.set(item.id, item.qty);
      }
    }

    const mergedLines = Array.from(mergedMap.entries()).map(([id, qty]) => ({ id, qty }));

    if (customer) {
      customer.cart = mergedLines;
      await customer.save();
    }

    return res.json({ success: true, data: { lines: mergedLines } });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/cart/calculate
 * Single authoritative endpoint for computing cart & checkout totals
 * Body: { lines: [{ id, qty }], couponCode: "AURA20" }
 */
router.post("/calculate", optionalAuth, async (req, res, next) => {
  try {
    const { lines = [], couponCode = null } = req.body;
    const authUserId = req.user?.authUserId || null;
    const cleanLines = sanitizeCartLines(lines);

    const totals = await calculateOrderTotals({
      lines: cleanLines,
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
    const cleanLines = sanitizeCartLines(lines);

    if (!cleanCode) {
      return res.status(400).json({
        success: false,
        valid: false,
        message: "Coupon code is required"
      });
    }

    const totals = await calculateOrderTotals({
      lines: cleanLines,
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
