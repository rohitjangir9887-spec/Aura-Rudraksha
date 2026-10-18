import { getProductPrimaryImage, getProductGalleryImages } from "../lib/imageUtils";
import { getProductRoute } from "../lib/routes";
import { resolveCartProduct } from "../lib/productResolver";
import React, { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from "react";
import { db } from "../lib/db";
import { authClient } from "../lib/authClient";
import { triggerHaptic } from "../lib/haptics";

const CartContext = createContext(null);

function getUserCartStorageKey(user) {
  if (!user) return "aura-cart-guest";
  const uid = user.authUserId || user.uid || (user.email ? `email_${user.email}` : "guest");
  return `aura-cart-${uid}`;
}

function getUserCouponStorageKey(user) {
  if (!user) return "aura-applied-coupon-code-guest";
  const uid = user.authUserId || user.uid || (user.email ? `email_${user.email}` : "guest");
  return `aura-applied-coupon-code-${uid}`;
}

function sanitizeLines(rawLines) {
  if (!Array.isArray(rawLines)) return [];
  const map = new Map();
  for (const item of rawLines) {
    if (!item) continue;
    let id = null;
    let qty = 1;
    if (typeof item === "string" || typeof item === "number") {
      id = String(item).trim();
    } else if (typeof item === "object") {
      const rawId = item.id || item.productId || item._id;
      if (rawId && typeof rawId !== "object") {
        id = String(rawId).trim();
      }
      qty = Math.max(1, Math.floor(Number(item.qty || item.quantity) || 1));
    }
    if (!id || id === "[object Object]" || id === "undefined" || id === "null") continue;
    map.set(id, (map.get(id) || 0) + qty);
  }
  return Array.from(map.entries()).map(([id, qty]) => ({ id, qty }));
}

function readStoredCart(user) {
  try {
    const key = getUserCartStorageKey(user);
    const raw = JSON.parse(localStorage.getItem(key) || "[]");
    return sanitizeLines(raw);
  } catch {
    return [];
  }
}

function readStoredCoupon(user) {
  // Do not auto-apply coupons on load; coupons should only be applied when user explicitly applies them
  return "";
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
  isFreeShipping: true,
  freeShippingThreshold: 0,
  standardShippingFee: 0,
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
  const [user, setUser] = useState(() => authClient.getUser());
  const userRef = useRef(user);
  userRef.current = user;

  const [lines, setLines] = useState(() => readStoredCart(user));
  const [couponCode, setCouponCode] = useState(() => readStoredCoupon(user));
  const [totals, setTotals] = useState(() => {
    try {
      const initLines = readStoredCart(user);
      if (initLines && initLines.length > 0 && db && typeof db.calculateCartSync === "function") {
        const calc = db.calculateCartSync(initLines, "");
        return calc?.data || defaultTotals;
      }
    } catch (_) {}
    return defaultTotals;
  });
  const [loadingTotals, setLoadingTotals] = useState(false);
  const isMounted = useRef(false);

  // Sync cart state when auth identity changes (login, logout, switch account)
  useEffect(() => {
    const unsub = authClient.onAuthStateChanged((currUser) => {
      const prevUid = userRef.current ? (userRef.current.authUserId || userRef.current.uid || (userRef.current.email ? `email_${userRef.current.email}` : "guest")) : "guest";
      const nextUid = currUser ? (currUser.authUserId || currUser.uid || (currUser.email ? `email_${currUser.email}` : "guest")) : "guest";

      setUser(currUser);
      userRef.current = currUser;

      if (prevUid !== nextUid) {
        if (prevUid === "guest" && currUser && !currUser.isAnonymous) {
          // Guest just logged in! Merge guest cart with user cart to prevent item loss
          const guestLines = readStoredCart(null);
          const userLines = readStoredCart(currUser);

          if (guestLines.length > 0) {
            const mergedMap = new Map();
            for (const item of userLines) {
              mergedMap.set(item.id, item.qty);
            }
            for (const item of guestLines) {
              if (mergedMap.has(item.id)) {
                mergedMap.set(item.id, Math.max(mergedMap.get(item.id), item.qty));
              } else {
                mergedMap.set(item.id, item.qty);
              }
            }
            const mergedLines = Array.from(mergedMap.entries()).map(([id, qty]) => ({ id, qty }));
            const userKey = getUserCartStorageKey(currUser);

            try {
              localStorage.setItem(userKey, JSON.stringify(mergedLines));
              localStorage.removeItem("aura-cart-guest");
            } catch (_) {}

            setLines(mergedLines);
            db.mergeUserCart(guestLines).then((serverLines) => {
              if (Array.isArray(serverLines) && serverLines.length > 0) {
                setLines(serverLines);
                try {
                  localStorage.setItem(userKey, JSON.stringify(serverLines));
                } catch (_) {}
              }
            }).catch(() => {});

            const nextCoupon = readStoredCoupon(currUser);
            setCouponCode(nextCoupon);
            return;
          }
        }

        const nextLines = readStoredCart(currUser);
        const nextCoupon = readStoredCoupon(currUser);
        setLines(nextLines);
        setCouponCode(nextCoupon);
      }
    });
    return () => unsub();
  }, []);

  // Synchronize localStorage and server for lines
  const persistLines = useCallback((nextLines) => {
    const sanitized = sanitizeLines(nextLines);
    setLines(sanitized);
    try {
      const key = getUserCartStorageKey(userRef.current);
      localStorage.setItem(key, JSON.stringify(sanitized));
      if (userRef.current && !userRef.current.isAnonymous) {
        db.saveUserCart(sanitized).catch(() => {});
      }
    } catch (_) {}
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("aura:cart-updated", { detail: { lines: sanitized } }));
    }
  }, []);

  // Listen for cross-component / cross-tab cart updates
  useEffect(() => {
    const handleCartSync = (e) => {
      if (e?.detail?.lines) {
        setLines(sanitizeLines(e.detail.lines));
      } else {
        const latest = readStoredCart(userRef.current);
        setLines(latest);
      }
    };
    window.addEventListener("aura:cart-updated", handleCartSync);
    window.addEventListener("storage", handleCartSync);
    return () => {
      window.removeEventListener("aura:cart-updated", handleCartSync);
      window.removeEventListener("storage", handleCartSync);
    };
  }, []);

  // Synchronize localStorage for coupon
  const persistCouponCode = useCallback((code) => {
    const clean = code ? String(code).trim().toUpperCase() : "";
    setCouponCode(clean);
    try {
      const key = getUserCouponStorageKey(userRef.current);
      if (clean) {
        localStorage.setItem(key, clean);
      } else {
        localStorage.removeItem(key);
      }
    } catch (_) {}
  }, []);

  const autoOfferDismissedRef = useRef(false);

  // Fetch authoritative pricing from server
  const fetchAuthoritativeTotals = useCallback(async (currentLines, currentCoupon) => {
    if (!currentLines || currentLines.length === 0) {
      setTotals({
        ...defaultTotals,
        appliedCoupon: null,
        couponStatus: currentCoupon ? "NOT_ELIGIBLE" : "NONE",
        couponReason: currentCoupon ? "Cart is empty. Add products to apply coupon." : ""
      });
      return;
    }

    try {
      setLoadingTotals(true);
      const res = await db.calculateCart(currentLines, currentCoupon);
      if (res?.success && res.data) {
        const data = res.data;
        const isAutoOffer = Boolean(data.appliedCoupon?.isAutomatic && !autoOfferDismissedRef.current);
        const isValidApplied = Boolean(
          data.appliedCoupon &&
          (data.appliedCoupon.valid || data.appliedCoupon.status === "APPLIED") &&
          (currentCoupon || isAutoOffer)
        );
        setTotals((prev) => {
          const syncFallback = (data.subtotal === 0 && currentLines.length > 0 && db && typeof db.calculateCartSync === "function")
            ? db.calculateCartSync(currentLines, false)?.data
            : null;
          const resolvedSubtotal = (data.subtotal === 0 && currentLines.length > 0)
            ? Number(syncFallback?.subtotal || prev?.subtotal || 0)
            : Number(data.subtotal || 0);
          const resolvedTotalMrp = (Number(data.totalMrp || 0) === 0 && currentLines.length > 0)
            ? Number(syncFallback?.totalMrp || prev?.totalMrp || resolvedSubtotal)
            : Number(data.totalMrp || resolvedSubtotal);
          const resolvedProductSavings = Math.max(0, resolvedTotalMrp - resolvedSubtotal);
          const resolvedShipping = Number(data.shipping ?? syncFallback?.shipping ?? prev?.shipping ?? 0);
          const resolvedCouponDiscount = isValidApplied ? Math.min(resolvedSubtotal, Number(data.couponDiscount || 0)) : 0;
          const resolvedFinal = Math.max(0, resolvedSubtotal - resolvedCouponDiscount + resolvedShipping);
          const resolvedShippingDiscount = Number(data.shippingDiscount || 0);
          const resolvedTotalSavings = resolvedProductSavings + resolvedCouponDiscount + resolvedShippingDiscount;

          return {
            ...data,
            subtotal: resolvedSubtotal,
            totalMrp: resolvedTotalMrp,
            productSavings: resolvedProductSavings,
            productDiscount: resolvedProductSavings,
            shipping: resolvedShipping,
            shippingFee: resolvedShipping,
            finalTotal: resolvedFinal,
            total: resolvedFinal,
            amount: resolvedFinal,
            savings: resolvedTotalSavings,
            totalSavings: resolvedTotalSavings,
            appliedCoupon: isValidApplied ? data.appliedCoupon : null,
            couponRejection: (!isValidApplied && currentCoupon) ? (data.couponRejection || data.appliedCoupon) : null,
            couponDiscount: resolvedCouponDiscount,
            couponStatus: isValidApplied ? "APPLIED" : (currentCoupon ? (data.couponStatus || "INVALID") : "NONE"),
            couponValid: isValidApplied
          };
        });
      } else {
        throw new Error(res?.message || "Cart API returned unsuccessful response");
      }
    } catch (err) {
      console.warn("Cart calculation warning:", err.message);
      // Fallback local calculation via calculateCartSync
      try {
        if (db && typeof db.calculateCartSync === "function") {
          const syncCalc = db.calculateCartSync(currentLines, currentCoupon || (autoOfferDismissedRef.current ? false : ""));
          if (syncCalc?.data) {
            setTotals(syncCalc.data);
            return;
          }
        }
      } catch (_) {}
    } finally {
      setLoadingTotals(false);
    }
  }, []);

  // Trigger recalculation on lines or coupon change, and when store active offer / products sync
  useEffect(() => {
    isMounted.current = true;
    fetchAuthoritativeTotals(lines, couponCode);
  }, [lines, couponCode, fetchAuthoritativeTotals]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleStoreSync = (e) => {
      const type = e?.detail?.type || "";
      if (type === "active-offer:saved") {
        autoOfferDismissedRef.current = false;
        fetchAuthoritativeTotals(lines, couponCode);
      } else if (type === "products:synced" || type === "coupons:synced" || type === "coupon:saved" || type === "coupon:deleted") {
        fetchAuthoritativeTotals(lines, couponCode);
      }
    };
    window.addEventListener("aura:store-updated", handleStoreSync);
    return () => window.removeEventListener("aura:store-updated", handleStoreSync);
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
        
        if (res.totals && (res.totals.subtotal > 0 || lines.length === 0)) {
          setTotals(res.totals);
        } else {
          // Trigger full calculation with new coupon
          await fetchAuthoritativeTotals(lines, cleanCode);
        }

        if (res.valid) {
          triggerHaptic("success");
        } else {
          triggerHaptic("warning");
        }

        return {
          success: res.valid,
          valid: res.valid,
          status: res.status || (res.valid ? "APPLIED" : "INVALID"),
          message: res.message || (res.valid ? `Coupon '${cleanCode}' applied!` : "Coupon condition not met"),
          data: res.data
        };
      } else {
        triggerHaptic("warning");
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
    autoOfferDismissedRef.current = true;
    persistCouponCode("");
    setTotals((prev) => {
      const syncCalc = (lines && lines.length > 0 && db && typeof db.calculateCartSync === "function")
        ? db.calculateCartSync(lines, false)?.data
        : null;
      const cleanSubtotal = Number(syncCalc?.subtotal || prev?.subtotal || 0);
      const cleanTotalMrp = Number(syncCalc?.totalMrp || prev?.totalMrp || cleanSubtotal);
      const cleanProductSavings = Math.max(0, cleanTotalMrp - cleanSubtotal);
      const cleanShipping = Number(syncCalc?.shipping ?? prev?.shipping ?? 0);
      const cleanFinalTotal = Math.max(0, cleanSubtotal + cleanShipping);
      return {
        ...(prev || defaultTotals),
        ...(syncCalc || {}),
        subtotal: cleanSubtotal,
        totalMrp: cleanTotalMrp,
        productSavings: cleanProductSavings,
        productDiscount: cleanProductSavings,
        appliedCoupon: null,
        couponRejection: null,
        couponDiscount: 0,
        couponStatus: "NONE",
        couponValid: false,
        couponReason: "",
        finalTotal: cleanFinalTotal,
        total: cleanFinalTotal,
        amount: cleanFinalTotal,
        totalSavings: cleanProductSavings,
        savings: cleanProductSavings
      };
    });
    fetchAuthoritativeTotals(lines, "");
  }, [lines, persistCouponCode, fetchAuthoritativeTotals]);

  const value = useMemo(() => {
    const cart = lines.flatMap((l) => Array.from({ length: l.qty }, () => l.id));
    const count = lines.reduce((n, l) => n + l.qty, 0);

    const addBatch = (itemsArray) => {
      if (!Array.isArray(itemsArray) || itemsArray.length === 0) return;
      const currentStored = readStoredCart(userRef.current);
      
      const map = new Map();
      for (const l of currentStored) {
        if (l && l.id) {
          map.set(String(l.id), Number(l.qty) || 1);
        }
      }
      
      for (const item of itemsArray) {
        if (!item) continue;
        let pid = null;
        let qty = 1;
        if (typeof item === "object") {
          let rawId = item.id || item.productId || item._id;
          if (rawId && typeof rawId === "object") {
            rawId = rawId.id || rawId.productId || rawId._id;
          }
          if (rawId && typeof rawId !== "object") {
            pid = String(rawId).trim();
          }
          qty = Math.max(1, Number(item.qty || item.quantity) || 1);
        } else if (item !== undefined && item !== null) {
          pid = String(item).trim();
        }
        if (pid && pid !== "[object Object]" && pid !== "undefined" && pid !== "null") {
          map.set(pid, (map.get(pid) || 0) + qty);
        }
      }
      
      const next = Array.from(map.entries()).map(([id, qty]) => ({ id, qty }));
      persistLines(next);
      return next;
    };

    const add = (idOrObjOrArr, qty = 1) => {
      if (!idOrObjOrArr) return;
      triggerHaptic("medium");
      if (Array.isArray(idOrObjOrArr)) {
        return addBatch(idOrObjOrArr);
      }
      if (typeof idOrObjOrArr === "object") {
        let rawId = idOrObjOrArr.id || idOrObjOrArr.productId || idOrObjOrArr._id;
        if (rawId && typeof rawId === "object") {
          rawId = rawId.id || rawId.productId || rawId._id;
        }
        const itemQty = Math.max(1, Number(qty || idOrObjOrArr.qty || idOrObjOrArr.quantity) || 1);
        const itemId = rawId ? String(rawId).trim() : "";
        if (itemId && itemId !== "[object Object]" && itemId !== "undefined" && itemId !== "null") {
          return addBatch([{ id: itemId, qty: itemQty }]);
        }
      }
      const cleanId = String(idOrObjOrArr).trim();
      if (cleanId && cleanId !== "[object Object]" && cleanId !== "undefined" && cleanId !== "null") {
        return addBatch([{ id: cleanId, qty: Math.max(1, Number(qty) || 1) }]);
      }
    };

    const buyNow = (idOrObj, qty = 1) => {
      triggerHaptic("medium");
      let pid = null;
      let count = Math.max(1, Number(qty) || 1);
      if (idOrObj && typeof idOrObj === "object") {
        let rawId = idOrObj.id || idOrObj.productId || idOrObj._id;
        if (rawId && typeof rawId === "object") {
          rawId = rawId.id || rawId.productId || rawId._id;
        }
        if (rawId && typeof rawId !== "object") {
          pid = String(rawId).trim();
        }
        if (idOrObj.qty || idOrObj.quantity) {
          count = Math.max(1, Number(qty || idOrObj.qty || idOrObj.quantity) || 1);
        }
      } else if (idOrObj !== undefined && idOrObj !== null) {
        pid = String(idOrObj).trim();
      }
      if (!pid || pid === "[object Object]" || pid === "undefined" || pid === "null") return;

      const buyNowIntent = [{ id: pid, qty: count }];
      
      // 1. Add item to persistent cart state so cart badge & cart page stay in sync
      addBatch(buyNowIntent);

      // 2. Set buy now intent for direct checkout focus
      try {
        sessionStorage.setItem("aura_buy_now_intent", JSON.stringify(buyNowIntent));
      } catch (_) {}
    };

    const remove = (id) => {
      triggerHaptic("light");
      persistLines(lines.filter((l) => l.id !== String(id)));
    };

    const setQty = (id, qty) => {
      triggerHaptic("selection");
      const n = Math.max(1, Number(qty) || 1);
      persistLines(lines.map((l) => (l.id === String(id) ? { ...l, qty: n } : l)));
    };

    const clear = () => {
      persistLines([]);
      persistCouponCode("");
      try {
        sessionStorage.removeItem("aura_buy_now_intent");
        sessionStorage.removeItem("aura_cart_lines");
        localStorage.removeItem("aura-cart-guest");
        localStorage.removeItem("aura_cart_lines");
        localStorage.removeItem("aura_cart_coupon");
        Object.keys(localStorage).forEach((k) => {
          if (k.startsWith("aura-cart-") || k.startsWith("aura-applied-coupon-code-")) {
            localStorage.removeItem(k);
          }
        });
      } catch (_) {}
    };

    const refreshTotals = () => fetchAuthoritativeTotals(lines, couponCode);

    return {
      cart,
      lines,
      count,
      add,
      addBatch,
      buyNow,
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
      freeShippingThreshold: totals.freeShippingThreshold,
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
      freeShippingThreshold: 0,
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
