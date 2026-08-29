import { useState, useEffect, useCallback } from "react";
import { db, onStoreUpdate } from "../lib/db";
import { emitToast } from "../context/ToastContext";

/**
 * Calculates remaining time broken down into padded strings and numerical values
 */
function calculateTimeRemaining(expiry) {
  if (!expiry) {
    return {
      days: "00",
      hours: "00",
      minutes: "00",
      seconds: "00",
      totalSeconds: 0,
      isExpired: false
    };
  }

  const now = Date.now();
  const target = new Date(expiry).getTime();
  const diff = target - now;

  if (diff <= 0 || isNaN(diff)) {
    return {
      days: "00",
      hours: "00",
      minutes: "00",
      seconds: "00",
      totalSeconds: 0,
      isExpired: true
    };
  }

  const d = Math.floor(diff / (1000 * 60 * 60 * 24));
  const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const s = Math.floor((diff % (1000 * 60)) / 1000);

  return {
    days: String(d).padStart(2, "0"),
    hours: String(h).padStart(2, "0"),
    minutes: String(m).padStart(2, "0"),
    seconds: String(s).padStart(2, "0"),
    totalSeconds: Math.floor(diff / 1000),
    isExpired: false
  };
}

function safeCopyToClipboard(text) {
  if (!text) return;
  try {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).catch(() => {
        execCommandFallback(text);
      });
    } else {
      execCommandFallback(text);
    }
  } catch (_) {
    execCommandFallback(text);
  }
}

function execCommandFallback(text) {
  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    textArea.setAttribute("readonly", "");
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    document.execCommand("copy");
    document.body.removeChild(textArea);
  } catch (err) {
    console.warn("Fallback clipboard error:", err);
  }
}

/**
 * Custom hook to get the single central active offer with live countdown,
 * product-specific override support, category/product applicability checks, auto-expiry, and live updates.
 */
export function useActiveOffer(product = null) {
  const [offer, setOffer] = useState(() => {
    if (product && product.customOffer && product.customOffer.enabled) {
      return product.customOffer;
    }
    return db.getActiveOffer();
  });

  const getExpiryDate = (off) => off?.expiryDate || off?.expiresAt || off?.expiry || null;

  const [timeLeft, setTimeLeft] = useState(() => {
    const currentOffer = (product && product.customOffer && product.customOffer.enabled)
      ? product.customOffer
      : db.getActiveOffer();
    return calculateTimeRemaining(getExpiryDate(currentOffer));
  });

  // Re-fetch offer from DB
  const refreshOffer = useCallback(() => {
    let resolvedOffer;
    if (product && product.customOffer && product.customOffer.enabled) {
      resolvedOffer = product.customOffer;
    } else if (product && (typeof product === "string" || typeof product === "number")) {
      const p = db.getProduct(product);
      if (p && p.customOffer && p.customOffer.enabled) {
        resolvedOffer = p.customOffer;
      } else {
        resolvedOffer = db.getActiveOffer();
      }
    } else {
      resolvedOffer = db.getActiveOffer();
    }

    setOffer(resolvedOffer);
    setTimeLeft(calculateTimeRemaining(getExpiryDate(resolvedOffer)));
  }, [product]);

  // Subscribe to central DB / store updates
  useEffect(() => {
    refreshOffer();
    const unsub = onStoreUpdate(() => {
      refreshOffer();
    });
    return () => unsub();
  }, [refreshOffer]);

  // Live 1000ms countdown timer
  useEffect(() => {
    if (!offer) return;
    const expiry = getExpiryDate(offer);
    if (!expiry) return;

    // Immediately calculate
    setTimeLeft(calculateTimeRemaining(expiry));

    const interval = setInterval(() => {
      const remaining = calculateTimeRemaining(expiry);
      setTimeLeft(remaining);
    }, 1000);

    return () => clearInterval(interval);
  }, [offer?.expiryDate, offer?.expiresAt, offer?.expiry]);

  // Determine active status:
  // Must be enabled, status === 'Active' (or not Disabled/Inactive), start time reached.
  const now = Date.now();
  const startTime = offer?.startDate ? new Date(offer.startDate).getTime() : 0;
  const isStarted = !startTime || now >= startTime;
  
  const isEnabled = Boolean(
    offer &&
    offer.enabled !== false &&
    offer.status === "Active"
  );

  // If explicitly Active and enabled, keep active
  const hasExpiry = Boolean(offer?.expiryDate || offer?.expiresAt || offer?.expiry);
  const isExpired = hasExpiry ? timeLeft.isExpired : false;

  // Check product applicability if product is provided
  let appliesToProduct = true;
  if (product && typeof product === "object") {
    // 1. Check applicableProducts
    if (Array.isArray(offer?.applicableProducts) && offer.applicableProducts.length > 0) {
      appliesToProduct = offer.applicableProducts.map(String).includes(String(product.id));
    }
    // 2. Check applicableCategories
    if (appliesToProduct && Array.isArray(offer?.applicableCategories) && offer.applicableCategories.length > 0) {
      const prodCat = (product.category || "").toLowerCase();
      const prodName = (product.name || "").toLowerCase();
      const prodBadge = (product.badge || "").toLowerCase();
      appliesToProduct = offer.applicableCategories.some(cat => {
        const c = String(cat).toLowerCase();
        return prodCat.includes(c) || prodName.includes(c) || prodBadge.includes(c);
      });
    }
  }

  // If admin has set status to Active, it should be active on the storefront
  const isActive = Boolean(isEnabled && isStarted && appliesToProduct);

  const copyCoupon = useCallback((e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (e && e.preventDefault) e.preventDefault();
    const codeToCopy = offer?.couponCode;
    if (!codeToCopy) return;

    safeCopyToClipboard(codeToCopy);
    emitToast(`Coupon code ${codeToCopy} copied to clipboard! ✨`, "success");
  }, [offer?.couponCode]);

  return {
    offer,
    isActive,
    isExpired,
    timeLeft,
    copyCoupon
  };
}

