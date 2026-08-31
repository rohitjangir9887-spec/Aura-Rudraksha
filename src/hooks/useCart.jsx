import React, { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from "react";
import { db } from "../lib/db";

const CartContext = createContext(null);

const CART_STORAGE_KEY = "aura-cart";
const COUPON_STORAGE_KEY = "aura-applied-coupon-code";

function readStoredCart() {
  try {
    const raw = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || "[]");
    if (!Array.isArray(raw)) return [];
    return raw
      .map((item) => {
        if (typeof item === "string" || typeof item === "number") {
          return { id: String(item), qty: 1 };
        }
        if (item && item.id) {
          return { id: String(item.id), qty: Math.max(1, Number(item.qty) || 1) };
        }
        return null;
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

function readStoredCoupon() {
  try {
    const raw = localStorage.getItem(COUPON_STORAGE_KEY);
    return raw ? String(raw).trim().toUpperCase() : "";
  } catch {
    return "";
  }
}

const defaultTotals = {
  subtotal: 0,
  totalMrp: 0,
  productSavings: 0,
  productDiscount: 0,
  couponDiscount: 0,
  shipping: 0,
  shippingFee: 0,
  shippingDiscount: 0,
  isFreeShipping: false,
  freeShippingThreshold: 499,
  tax: 0,
  finalTotal: 0,
  total: 0,
  amount: 0,
  savings: 0,
  totalSavings: 0,
  appliedCoupon: null,
  couponStatus: "NONE", // NONE, APPLIED, EXPIRED, NOT_ELIGIBLE, INVALID
  couponValid: false,
  couponReason: "",
  items: [],
  itemCount: 0
};

export function CartProvider({ children }) {
  const [lines, setLines] = useState(readStoredCart);
  const [couponCode, setCouponCode] = useState(readStoredCoupon);
  const [totals, setTotals] = useState(defaultTotals);
  const [loadingTotals, setLoadingTotals] = useState(false);
  const isMounted = useRef(false);

  // Synchronize localStorage for lines
  const persistLines = useCallback((nextLines) => {
    setLines(nextLines);
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(nextLines));
    } catch (_) {}
  }, []);

  // Synchronize localStorage for coupon
  const persistCouponCode = useCallback((code) => {
    const clean = code ? String(code).trim().toUpperCase() : "";
    setCouponCode(clean);
    try {
      if (clean) {
        localStorage.setItem(COUPON_STORAGE_KEY, clean);
      } else {
        localStorage.removeItem(COUPON_STORAGE_KEY);
      }
    } catch (_) {}
  }, []);

  // Fetch authoritative pricing from server
  const fetchAuthoritativeTotals = useCallback(async (currentLines, currentCoupon) => {
    if (!currentLines || currentLines.length === 0) {
      setTotals({
        ...defaultTotals,
        appliedCoupon: currentCoupon ? {
          code: currentCoupon,
          status: "NOT_ELIGIBLE",
          valid: false,
          discount: 0,
          discountAmount: 0,
          reason: "Cart is empty. Add products to apply coupon."
        } : null,
        couponStatus: currentCoupon ? "NOT_ELIGIBLE" : "NONE",
        couponReason: currentCoupon ? "Cart is empty. Add products to apply coupon." : ""
      });
      return;
    }

    try {
      setLoadingTotals(true);
      const res = await db.calculateCart(currentLines, currentCoupon);
      if (res?.success && res.data) {
        setTotals(res.data);
      } else {
        throw new Error(res?.message || "Cart API returned unsuccessful response");
      }
    } catch (err) {
      console.warn("Cart calculation warning:", err.message);
      // Fallback local calculation
      try {
        const prods = db.getProducts ? db.getProducts() : [];
        const coupons = db.getCoupons ? db.getCoupons() : [];
        
        let subtotal = 0;
        let totalMrp = 0;
        const validItems = [];

        currentLines.forEach((l) => {
          const p = prods.find(x => String(x.id) === String(l.id));
          const price = p ? Number(p.price) : 0;
          const mrp = p ? Number(p.mrp || p.comparePrice || price) : price;
          subtotal += price * l.qty;
          totalMrp += mrp * l.qty;
          validItems.push({
            id: l.id,
            productId: l.id,
            name: p ? p.name : "Sacred Rudraksha Item",
            price,
            mrp,
            quantity: l.qty,
            qty: l.qty,
            img: p ? (p.img || (p.images && p.images[0])) : null
          });
        });

        const productSavings = Math.max(0, totalMrp - subtotal);
        const isFreeShipping = subtotal >= 499 || subtotal === 0;
        const shipping = isFreeShipping ? 0 : 50;
        const shippingDiscount = isFreeShipping && subtotal > 0 ? 50 : 0;

        let appliedCouponObj = null;
        let couponDiscount = 0;
        let couponStatus = "NONE";

        if (currentCoupon) {
          const c = coupons.find(x => x.code?.toUpperCase() === currentCoupon.toUpperCase());
          if (c) {
            const minOrder = Number(c.minAmount || c.minOrder || 0);
            if (minOrder > 0 && subtotal < minOrder) {
              couponStatus = "NOT_ELIGIBLE";
              appliedCouponObj = {
                code: c.code,
                status: "NOT_ELIGIBLE",
                valid: false,
                discount: Number(c.discount) || 0,
                discountAmount: 0,
                minOrder,
                shortfall: minOrder - subtotal,
                reason: `Add ₹${minOrder - subtotal} more to use this coupon.`
              };
            } else if (c.status === "Expired" || (c.expiry && new Date(c.expiry) < new Date())) {
              couponStatus = "EXPIRED";
              appliedCouponObj = {
                code: c.code,
                status: "EXPIRED",
                valid: false,
                discount: Number(c.discount) || 0,
                discountAmount: 0,
                reason: "This coupon is expired."
              };
            } else {
              couponStatus = "APPLIED";
              const val = Number(c.discount) || 0;
              couponDiscount = c.type === "fixed" ? Math.min(subtotal, val) : Math.min(subtotal, Math.round((subtotal * val) / 100));
              appliedCouponObj = {
                code: c.code,
                status: "APPLIED",
                valid: true,
                discount: val,
                discountAmount: couponDiscount,
                type: c.type || "percentage",
                description: c.type === "fixed" ? `Flat ₹${val} Off` : `${val}% Off`
              };
            }
          } else {
            couponStatus = "INVALID";
            appliedCouponObj = {
              code: currentCoupon,
              status: "INVALID",
              valid: false,
              discount: 0,
              discountAmount: 0,
              reason: "Invalid coupon code."
            };
          }
        }

        const finalTotal = Math.max(0, subtotal - couponDiscount + shipping);
        const totalSavings = productSavings + couponDiscount + shippingDiscount;

        setTotals({
          items: validItems,
          itemCount: validItems.reduce((n, it) => n + it.quantity, 0),
          subtotal,
          totalMrp,
          productSavings,
          productDiscount: productSavings,
          couponDiscount,
          shipping,
          shippingFee: shipping,
          shippingDiscount,
          isFreeShipping,
          freeShippingThreshold: 499,
          tax: 0,
          finalTotal,
          total: finalTotal,
          amount: finalTotal,
          savings: totalSavings,
          totalSavings,
          appliedCoupon: appliedCouponObj,
          couponStatus,
          couponValid: Boolean(appliedCouponObj?.valid),
          couponReason: appliedCouponObj?.reason || ""
        });
      } catch (_) {}
    } finally {
      setLoadingTotals(false);
    }
  }, []);

  // Trigger recalculation on lines or coupon change
  useEffect(() => {
    isMounted.current = true;
    fetchAuthoritativeTotals(lines, couponCode);
  }, [lines, couponCode, fetchAuthoritativeTotals]);

  // Apply Coupon method
  const applyCoupon = useCallback(async (code) => {
    const cleanCode = (code || "").trim().toUpperCase();
    if (!cleanCode) {
      return { success: false, valid: false, message: "Please enter a coupon code" };
    }

    try {
      setLoadingTotals(true);
      const res = await db.validateCartCoupon(cleanCode, lines);

      if (res?.success) {
        // Save coupon code in state and localStorage
        persistCouponCode(cleanCode);
        
        if (res.totals) {
          setTotals(res.totals);
        } else {
          // Trigger full calculation with new coupon
          await fetchAuthoritativeTotals(lines, cleanCode);
        }

        return {
          success: res.valid,
          valid: res.valid,
          status: res.status || (res.valid ? "APPLIED" : "INVALID"),
          message: res.message || (res.valid ? `Coupon '${cleanCode}' applied!` : "Coupon condition not met"),
          data: res.data
        };
      } else {
        // Even if server returns false or 400 (e.g. EXPIRED or NOT_ELIGIBLE), maintain coupon status properly
        const status = res?.status || "INVALID";
        if (status === "EXPIRED" || status === "NOT_ELIGIBLE") {
          persistCouponCode(cleanCode);
        }
        await fetchAuthoritativeTotals(lines, cleanCode);

        return {
          success: false,
          valid: false,
          status: status,
          message: res?.message || `Coupon '${cleanCode}' could not be applied.`,
          data: res?.data
        };
      }
    } catch (err) {
      persistCouponCode(cleanCode);
      await fetchAuthoritativeTotals(lines, cleanCode);
      return {
        success: false,
        valid: false,
        status: "INVALID",
        message: err.message || `Coupon '${cleanCode}' is invalid.`
      };
    } finally {
      setLoadingTotals(false);
    }
  }, [lines, persistCouponCode, fetchAuthoritativeTotals]);

  // Remove Coupon method
  const removeCoupon = useCallback(() => {
    persistCouponCode("");
    fetchAuthoritativeTotals(lines, "");
  }, [lines, persistCouponCode, fetchAuthoritativeTotals]);

  const value = useMemo(() => {
    const cart = lines.flatMap((l) => Array.from({ length: l.qty }, () => l.id));
    const count = lines.reduce((n, l) => n + l.qty, 0);

    const add = (id, qty = 1) => {
      const pid = String(id);
      const extra = Math.max(1, Number(qty) || 1);
      persistLines(
        lines.some((l) => l.id === pid)
          ? lines.map((l) => (l.id === pid ? { ...l, qty: l.qty + extra } : l))
          : [...lines, { id: pid, qty: extra }]
      );
    };

    const remove = (id) => persistLines(lines.filter((l) => l.id !== String(id)));

    const setQty = (id, qty) => {
      const n = Math.max(1, Number(qty) || 1);
      persistLines(lines.map((l) => (l.id === String(id) ? { ...l, qty: n } : l)));
    };

    const clear = () => {
      persistLines([]);
      persistCouponCode("");
    };

    const refreshTotals = () => fetchAuthoritativeTotals(lines, couponCode);

    return {
      cart,
      lines,
      count,
      add,
      remove,
      setQty,
      clear,
      couponCode,
      appliedCoupon: totals.appliedCoupon,
      couponStatus: totals.couponStatus,
      couponValid: totals.couponValid,
      couponReason: totals.couponReason,
      totals,
      subtotal: totals.subtotal,
      totalMrp: totals.totalMrp,
      productSavings: totals.productSavings,
      couponDiscount: totals.couponDiscount,
      shipping: totals.shipping,
      shippingFee: totals.shippingFee,
      shippingDiscount: totals.shippingDiscount,
      isFreeShipping: totals.isFreeShipping,
      finalTotal: totals.finalTotal,
      total: totals.finalTotal,
      totalSavings: totals.totalSavings,
      applyCoupon,
      removeCoupon,
      refreshTotals,
      loadingTotals
    };
  }, [lines, totals, couponCode, persistLines, persistCouponCode, applyCoupon, removeCoupon, fetchAuthoritativeTotals, loadingTotals]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    return {
      cart: [],
      lines: [],
      count: 0,
      add: () => {},
      remove: () => {},
      setQty: () => {},
      clear: () => {},
      couponCode: "",
      appliedCoupon: null,
      couponStatus: "NONE",
      couponValid: false,
      couponReason: "",
      totals: defaultTotals,
      subtotal: 0,
      totalMrp: 0,
      productSavings: 0,
      couponDiscount: 0,
      shipping: 0,
      shippingFee: 0,
      shippingDiscount: 0,
      isFreeShipping: false,
      finalTotal: 0,
      total: 0,
      totalSavings: 0,
      applyCoupon: async () => ({ success: false, valid: false }),
      removeCoupon: () => {},
      refreshTotals: () => {},
      loadingTotals: false
    };
  }
  return ctx;
}
