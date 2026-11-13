import express from "express";
import { calculateOrderTotals } from "../services/pricingService.js";
import { optionalAuth, requireAuth } from "../middleware/auth.js";
import { Customer } from "../models/Customer.js";
import { isCustomMalaLine, sanitizeCustomMalaConfig } from "../../shared/customMalaCatalog.js";

const router = express.Router();

function sanitizeCustomBeadItems(rawList) {
  if (!Array.isArray(rawList)) return [];
  return rawList
    .slice(0, 50)
    .filter((b) => b && typeof b === "object" && (b.name || b.productId || b.id))
    .map((b) => ({
      id: String(b.id || b.productId || "").slice(0, 120),
      productId: String(b.productId || b.id || "").slice(0, 120),
      name: String(b.name || b.shortName || "Sacred Rudraksha").slice(0, 160),
      qty: Math.max(1, Math.floor(Number(b.qty || b.quantity) || 1)),
      unitPrice: Math.max(0, Math.round(Number(b.unitPrice ?? b.price) || 0)),
      lineTotal: Math.max(0, Math.round(Number(b.lineTotal) || 0)),
      ...(b.img ? { img: String(b.img).slice(0, 500) } : {})
    }));
}

function sanitizeCartLines(lines) {
  if (!Array.isArray(lines)) return [];
  const map = new Map();
  for (const item of lines) {
    if (!item) continue;
    let id = null;
    let qty = 1;
    let customPayload = null;
    if (typeof item === "string" || typeof item === "number") {
      id = String(item).trim();
    } else if (typeof item === "object" && (item.id || item.productId || item._id)) {
      const rawId = item.id || item.productId || item._id;
      if (typeof rawId === "object") continue;
      id = String(rawId).trim();
      qty = Math.max(1, Math.floor(Number(item.qty || item.quantity) || 1));
      if (isCustomMalaLine(item)) {
        const sanitizedBeads = sanitizeCustomBeadItems(item.customMalaItems);
        customPayload = {
          isCustomMala: true,
          customMala: sanitizeCustomMalaConfig(item.customMala),
          ...(sanitizedBeads.length > 0 ? { customMalaItems: sanitizedBeads } : {}),
          ...(item.name ? { name: String(item.name).slice(0, 160) } : {}),
          ...(item.customDescription ? { customDescription: String(item.customDescription).slice(0, 2000) } : {}),
          ...(item.img ? { img: String(item.img).slice(0, 500) } : {}),
          ...(item.size ? { size: String(item.size).slice(0, 100) } : {}),
          ...(item.variant ? { variant: String(item.variant).slice(0, 100) } : {}),
          ...(Number(item.price) > 0 ? { price: Number(item.price) } : {}),
          ...(Number(item.mrp) > 0 ? { mrp: Number(item.mrp) } : {})
        };
      }
    }
    if (!id || id === "[object Object]" || id === "undefined" || id === "null") continue;
    const prev = map.get(id);
    map.set(id, {
      id,
      qty: (prev?.qty || 0) + qty,
      ...(prev?.isCustomMala ? {
        isCustomMala: true,
        customMala: prev.customMala,
        ...(Array.isArray(prev.customMalaItems) && prev.customMalaItems.length > 0 ? { customMalaItems: prev.customMalaItems } : {}),
        ...(prev.name ? { name: prev.name } : {}),
        ...(prev.customDescription ? { customDescription: prev.customDescription } : {}),
        ...(prev.img ? { img: prev.img } : {}),
        ...(prev.size ? { size: prev.size } : {}),
        ...(prev.variant ? { variant: prev.variant } : {}),
        ...(Number(prev.price) > 0 ? { price: Number(prev.price) } : {}),
        ...(Number(prev.mrp) > 0 ? { mrp: Number(prev.mrp) } : {})
      } : {}),
      ...(customPayload || {})
    });
  }
  return Array.from(map.values());
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
      mergedMap.set(item.id, item);
    }
    for (const item of cleanGuest) {
      if (mergedMap.has(item.id)) {
        const existing = mergedMap.get(item.id);
        mergedMap.set(item.id, {
          ...existing,
          ...item,
          qty: Math.max(existing.qty, item.qty)
        });
      } else {
        mergedMap.set(item.id, item);
      }
    }

    const mergedLines = Array.from(mergedMap.values());

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
    const { lines = [], items = [], couponCode = null, code = null } = req.body;
    const rawLines = Array.isArray(lines) && lines.length > 0 ? lines : items;
    const authUserId = req.user?.authUserId || null;
    const cleanLines = sanitizeCartLines(rawLines);

    const totals = await calculateOrderTotals({
      lines: cleanLines,
      couponCode: couponCode || code,
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
    const { code, couponCode, lines = [], items = [] } = req.body;
    const rawLines = Array.isArray(lines) && lines.length > 0 ? lines : items;
    const cleanCode = (code || couponCode || "").trim().toUpperCase();
    const authUserId = req.user?.authUserId || null;
    const cleanLines = sanitizeCartLines(rawLines);

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
