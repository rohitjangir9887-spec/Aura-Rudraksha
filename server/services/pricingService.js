import { Product } from "../models/Product.js";
import { Coupon } from "../models/Coupon.js";
import { ActiveOffer, Promotion } from "../models/Promotion.js";
import { isDbConnected } from "../config/db.js";
import { defaultProducts, defaultCoupons } from "../data/defaultData.js";

/**
 * Single Authoritative Pricing & Coupon Service for Aura Rudraksha
 * 
 * Used across:
 * - Cart calculation (/api/cart/calculate)
 * - Checkout calculation
 * - Order creation (/api/orders)
 * - Coupon validation (/api/coupons/validate)
 */

export const FREE_SHIPPING_THRESHOLD = 499;
export const STANDARD_SHIPPING_FEE = 50;

/**
 * Format date for user-friendly display (e.g., 27 Aug 2026)
 */
function formatDate(dateStr) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return String(dateStr);
  }
}

/**
 * Normalize and deduplicate lines input
 * Supports [{ id: "5", qty: 2 }] or [{ productId: "5", quantity: 2 }] or ["5", "mala"]
 */
export function normalizeLines(linesInput) {
  if (!linesInput) return [];
  
  if (Array.isArray(linesInput)) {
    // Array of string IDs
    if (linesInput.length > 0 && (typeof linesInput[0] === "string" || typeof linesInput[0] === "number")) {
      const counts = {};
      linesInput.forEach(id => {
        const strId = String(id).trim();
        if (strId) counts[strId] = (counts[strId] || 0) + 1;
      });
      return Object.entries(counts).map(([id, qty]) => ({ id, qty }));
    }

    // Array of objects
    const map = new Map();
    for (const item of linesInput) {
      if (!item) continue;
      const id = String(item.id || item.productId || item._id || "").trim();
      const qty = Math.max(1, Number(item.qty || item.quantity) || 1);
      if (id) {
        map.set(id, (map.get(id) || 0) + qty);
      }
    }
    return Array.from(map.entries()).map(([id, qty]) => ({ id, qty }));
  }

  return [];
}

/**
 * Fetch authoritative products from MongoDB (or defaultData fallback in demo)
 */
export async function getAuthoritativeProducts(productIds = []) {
  const ids = Array.from(new Set(productIds.map(String)));
  if (ids.length === 0) return [];

  if (isDbConnected()) {
    try {
      const dbProducts = await Product.find({
        $or: [
          { id: { $in: ids } },
          { _id: { $in: ids.filter(id => id.match(/^[0-9a-fA-F]{24}$/)) } }
        ]
      }).lean();

      if (dbProducts && dbProducts.length > 0) {
        return dbProducts;
      }
    } catch (err) {
      console.warn("PricingService DB product lookup warning:", err.message);
    }
  }

  // In production with no DB: do NOT silently serve demo catalog
  if (process.env.NODE_ENV === "production") {
    return [];
  }

  // Development-only fallback to default products
  return defaultProducts.filter(p => ids.includes(String(p.id)));
}

/**
 * Fetch authoritative coupon by code
 */
export async function getAuthoritativeCoupon(couponCode) {
  if (!couponCode) return null;
  const cleanCode = String(couponCode).trim().toUpperCase();

  if (isDbConnected()) {
    try {
      const coupon = await Coupon.findOne({ code: cleanCode }).lean();
      if (coupon) return coupon;

      // Also check central ActiveOffer
      const activeOffer = await ActiveOffer.findOne({
        couponCode: cleanCode,
        status: "Active",
        enabled: { $ne: false }
      }).lean();

      if (activeOffer) {
        return {
          id: activeOffer.id || "OFFER-CENTRAL-1",
          code: cleanCode,
          discount: Number(activeOffer.discountValue) || 200,
          type: activeOffer.discountType === "percentage" ? "percentage" : "fixed",
          status: "Active",
          expiry: activeOffer.expiresAt || activeOffer.expiry,
          minAmount: 0,
          description: activeOffer.subtitle || activeOffer.title
        };
      }

      // Also check general promotions
      const promo = await Promotion.findOne({
        $or: [{ code: cleanCode }, { couponCode: cleanCode }],
        status: "Active"
      }).lean();

      if (promo) {
        return {
          id: promo.id || String(promo._id),
          code: cleanCode,
          discount: Number(promo.discountValue || promo.value || 0),
          type: promo.discountType === "percentage" || promo.type === "percentage" ? "percentage" : "fixed",
          status: "Active",
          expiry: promo.expiresAt || promo.expiry,
          minAmount: Number(promo.minOrderValue || promo.minAmount || 0),
          description: promo.description || promo.title
        };
      }
    } catch (err) {
      console.warn("PricingService DB coupon lookup warning:", err.message);
    }
  }

  // In production with no DB: do NOT silently invent coupons
  if (process.env.NODE_ENV === "production") {
    return null;
  }

  // Development-only fallback to default coupons
  return defaultCoupons.find(c => c.code.toUpperCase() === cleanCode) || null;
}

/**
 * Authoritative Order / Cart Calculation
 * 
 * @param {Object} params
 * @param {Array} params.lines - Cart lines [{ id, qty }]
 * @param {string} params.couponCode - Coupon code to apply
 * @param {string} params.authUserId - User ID for per-user checks if needed
 * @returns {Promise<Object>} Authoritative pricing breakdown
 */
export async function calculateOrderTotals({ lines = [], couponCode = null, authUserId = null } = {}) {
  const normalized = normalizeLines(lines);
  const productIds = normalized.map(l => l.id);

  // 1. Fetch Authoritative Products
  const fetchedProducts = await getAuthoritativeProducts(productIds);
  
  let subtotal = 0;
  let totalMrp = 0;
  const validatedItems = [];
  const unavailableItems = [];

  for (const line of normalized) {
    const product = fetchedProducts.find(p => String(p.id) === String(line.id) || String(p._id) === String(line.id));
    if (!product) {
      unavailableItems.push({ id: line.id, reason: "Product not found or discontinued" });
      continue;
    }

    if (product.status === "Inactive" || product.status === "Draft") {
      unavailableItems.push({ id: line.id, name: product.name, reason: "Product is no longer available" });
      continue;
    }

    const unitPrice = Number(product.price) || 0;
    const mrp = Number(product.mrp || product.comparePrice || product.price || unitPrice);
    const itemSubtotal = unitPrice * line.qty;
    const itemMrpTotal = mrp * line.qty;

    subtotal += itemSubtotal;
    totalMrp += itemMrpTotal;

    validatedItems.push({
      id: String(product.id || product._id),
      productId: String(product.id || product._id),
      name: product.name || "Sacred Rudraksha Item",
      price: unitPrice,
      unitPrice: unitPrice,
      mrp: mrp,
      comparePrice: mrp,
      quantity: line.qty,
      qty: line.qty,
      itemTotal: itemSubtotal,
      stock: product.stock !== undefined ? product.stock : 50,
      image: (Array.isArray(product.images) && product.images[0]) || product.img || "/images/product-5mukhi.jpg",
      img: (Array.isArray(product.images) && product.images[0]) || product.img || "/images/product-5mukhi.jpg"
    });
  }

  const productSavings = Math.max(0, totalMrp - subtotal);

  // 2. Authoritative Shipping Calculation
  const isFreeShipping = subtotal >= FREE_SHIPPING_THRESHOLD || subtotal === 0;
  const shipping = (subtotal === 0 || isFreeShipping) ? 0 : STANDARD_SHIPPING_FEE;
  const shippingDiscount = isFreeShipping && subtotal > 0 ? STANDARD_SHIPPING_FEE : 0;

  // 3. Authoritative Coupon Validation & Discount
  let appliedCoupon = null;
  let couponDiscount = 0;
  let couponStatus = "NONE"; // NONE, APPLIED, EXPIRED, NOT_ELIGIBLE, INVALID, REMOVED

  if (couponCode && String(couponCode).trim()) {
    const cleanCode = String(couponCode).trim().toUpperCase();
    const coupon = await getAuthoritativeCoupon(cleanCode);

    if (!coupon) {
      couponStatus = "INVALID";
      appliedCoupon = {
        code: cleanCode,
        status: "INVALID",
        valid: false,
        discount: 0,
        discountAmount: 0,
        reason: `Coupon code '${cleanCode}' does not exist or is invalid.`
      };
    } else {
      const now = new Date();
      const expiryDate = coupon.expiry || coupon.expiresAt || null;
      const isExpiredByDate = expiryDate ? (new Date(expiryDate) < now) : false;
      const isStatusExpired = coupon.status === "Expired";
      const isInactive = coupon.status === "Inactive";
      const isLimitReached = Boolean(coupon.limit && (coupon.usage || 0) >= Number(coupon.limit));
      const minOrder = Number(coupon.minAmount || coupon.minOrder || coupon.minOrderValue || 0);
      const isMinOrderNotMet = Boolean(minOrder > 0 && subtotal < minOrder);

      const discountVal = Number(coupon.discount || coupon.value || 0);
      const couponType = coupon.type || "percentage";
      const formattedExpiry = formatDate(expiryDate);

      if (isExpiredByDate || isStatusExpired) {
        couponStatus = "EXPIRED";
        appliedCoupon = {
          id: coupon.id || coupon._id,
          code: coupon.code,
          status: "EXPIRED",
          valid: false,
          discount: discountVal,
          discountAmount: 0,
          type: couponType,
          expiry: expiryDate,
          formattedExpiry,
          reason: `This coupon expired on ${formattedExpiry || "recently"}.`
        };
      } else if (isInactive) {
        couponStatus = "INVALID";
        appliedCoupon = {
          id: coupon.id || coupon._id,
          code: coupon.code,
          status: "INVALID",
          valid: false,
          discount: discountVal,
          discountAmount: 0,
          type: couponType,
          reason: "This coupon is currently inactive."
        };
      } else if (isLimitReached) {
        couponStatus = "INVALID";
        appliedCoupon = {
          id: coupon.id || coupon._id,
          code: coupon.code,
          status: "INVALID",
          valid: false,
          discount: discountVal,
          discountAmount: 0,
          type: couponType,
          reason: "This coupon usage limit has been reached."
        };
      } else if (isMinOrderNotMet) {
        couponStatus = "NOT_ELIGIBLE";
        const shortfall = minOrder - subtotal;
        appliedCoupon = {
          id: coupon.id || coupon._id,
          code: coupon.code,
          status: "NOT_ELIGIBLE",
          valid: false,
          discount: discountVal,
          discountAmount: 0,
          type: couponType,
          minOrder,
          shortfall,
          reason: `Add ₹${shortfall.toLocaleString('en-IN')} more to use this coupon.`
        };
      } else {
        // Valid & Active Coupon
        couponStatus = "APPLIED";
        if (couponType === "fixed") {
          couponDiscount = Math.min(subtotal, discountVal);
        } else {
          couponDiscount = Math.min(subtotal, Math.round((subtotal * discountVal) / 100));
        }

        appliedCoupon = {
          id: coupon.id || coupon._id,
          code: coupon.code,
          status: "APPLIED",
          valid: true,
          discount: discountVal,
          discountAmount: couponDiscount,
          type: couponType,
          minOrder,
          description: couponType === "percentage" ? `${discountVal}% Discount` : `Flat ₹${discountVal} Off`,
          reason: `Coupon '${coupon.code}' applied successfully!`
        };
      }
    }
  }

  // 4. Final Totals
  const finalTotal = Math.max(0, subtotal - couponDiscount + shipping);
  const totalSavings = productSavings + couponDiscount + shippingDiscount;

  return {
    items: validatedItems,
    itemCount: validatedItems.reduce((n, it) => n + it.quantity, 0),
    unavailableItems,
    subtotal,
    totalMrp,
    productSavings,
    productDiscount: productSavings,
    couponDiscount,
    shipping,
    shippingFee: shipping,
    shippingDiscount,
    isFreeShipping,
    freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
    tax: 0,
    finalTotal,
    total: finalTotal,
    amount: finalTotal,
    savings: totalSavings,
    totalSavings,
    appliedCoupon,
    couponStatus,
    couponValid: Boolean(appliedCoupon?.valid),
    couponReason: appliedCoupon?.reason || ""
  };
}
