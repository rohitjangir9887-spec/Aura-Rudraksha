import React, { useState, useEffect, useCallback } from "react";
import { emitToast } from "../context/ToastContext";
import { db, onStoreUpdate } from "../lib/db";
import { authClient } from "../lib/authClient";

function getWishlistStorageKey() {
  const u = authClient.getUser();
  if (!u) return "aura_wishlist_guest";
  const uid = u.authUserId || u.uid || (u.email ? `email_${u.email}` : "guest");
  return `aura_wishlist_${uid}`;
}

function readLocalWishlist() {
  try {
    const key = getWishlistStorageKey();
    const rawStr = localStorage.getItem(key);
    if (!rawStr) return [];
    const raw = JSON.parse(rawStr);
    if (!Array.isArray(raw)) return [];
    
    let ids = raw
      .map(item => {
        if (!item) return "";
        if (typeof item === "object") {
          return String(item.id || item.productId || item._id || item.slug || "").trim();
        }
        return String(item).trim();
      })
      .filter(id => id && id !== "undefined" && id !== "null" && id !== "[object Object]" && id !== "{}" && id !== "[]");
    
    // Deduplicate
    return Array.from(new Set(ids));
  } catch {
    return [];
  }
}

export function useWishlist() {
  const [wishlist, setWishlist] = useState(readLocalWishlist);

  const fetchWishlist = useCallback(async () => {
    if (authClient.isSignedIn()) {
      try {
        const res = await db.getWishlist();
        if (res?.success && Array.isArray(res.data)) {
          const apiWishlist = res.data.map(String).map(s => s.trim()).filter(id => id && id !== "undefined" && id !== "null" && id !== "[object Object]");
          setWishlist(apiWishlist);
          try {
            const key = getWishlistStorageKey();
            localStorage.setItem(key, JSON.stringify(apiWishlist));
          } catch (_) {}
        }
      } catch (err) {
        console.error("Failed to fetch wishlist", err);
      }
    } else {
      setWishlist(readLocalWishlist());
    }
  }, []);

  useEffect(() => {
    let isInitial = true;
    fetchWishlist();

    const handler = (e) => {
      if (e?.detail?.wishlist && Array.isArray(e.detail.wishlist)) {
        setWishlist(e.detail.wishlist);
      } else {
        setWishlist(readLocalWishlist());
      }
    };

    const unsubAuth = authClient.onAuthStateChanged(() => {
      setWishlist(readLocalWishlist());
      if (!isInitial) {
        fetchWishlist();
      }
      isInitial = false;
    });

    window.addEventListener("aura:wishlist-updated", handler);
    window.addEventListener("storage", handler);

    return () => {
      unsubAuth();
      window.removeEventListener("aura:wishlist-updated", handler);
      window.removeEventListener("storage", handler);
    };
  }, [fetchWishlist]);

  const toggleWishlist = useCallback(async (productId, productName) => {
    if (!productId) return;
    let pid = "";
    if (typeof productId === "object") {
      let rawId = productId.id || productId.productId || productId._id || productId.slug;
      if (rawId && typeof rawId === "object") {
        rawId = rawId.id || rawId.productId || rawId._id;
      }
      if (rawId && typeof rawId !== "object") {
        pid = String(rawId).trim();
      }
    } else {
      pid = String(productId).trim();
    }
    if (!pid || pid === "[object Object]" || pid === "undefined" || pid === "null") return;

    const current = readLocalWishlist();
    
    // Check if item or any of its matching aliases is already in wishlist
    const p = db.getProduct(pid);
    const pId = p ? String(p.id || "") : pid;
    const pMongoId = p ? String(p._id || "") : "";
    const pSlug = p ? String(p.slug || "") : "";

    const isAlreadyIn = current.some(id => id === pid || (pId && id === pId) || (pMongoId && id === pMongoId) || (pSlug && id === pSlug));

    let next;
    let added = false;

    if (isAlreadyIn) {
      next = current.filter(id => id !== pid && id !== pId && id !== pMongoId && id !== pSlug);
      added = false;
    } else {
      const storeId = pId || pid;
      next = [...current.filter(id => id !== storeId), storeId];
      added = true;
    }

    // Optimistic UI update
    try {
      const key = getWishlistStorageKey();
      localStorage.setItem(key, JSON.stringify(next));
    } catch (_) {}
    setWishlist(next);

    window.dispatchEvent(
      new CustomEvent("aura:wishlist-updated", {
        detail: { wishlist: next, productId: pid, added }
      })
    );

    const nameStr = productName || p?.name || "Item";
    if (added) {
      emitToast(`${nameStr} added to wishlist ❤️`, "success");
    } else {
      emitToast(`${nameStr} removed from wishlist`, "info");
    }

    // Sync with backend if authenticated
    if (authClient.isSignedIn()) {
      try {
        if (added) {
          await db.addToWishlist(pid);
        } else {
          await db.removeFromWishlist(pid);
        }
      } catch (err) {
        console.error("Failed to sync wishlist to backend", err);
      }
    }
  }, []);

  const isWishlisted = useCallback((productId) => {
    if (!productId) return false;
    let target = "";
    if (typeof productId === "object") {
      let rawId = productId.id || productId.productId || productId._id || productId.slug;
      if (rawId && typeof rawId === "object") {
        rawId = rawId.id || rawId.productId || rawId._id;
      }
      if (rawId && typeof rawId !== "object") {
        target = String(rawId).trim();
      }
    } else {
      target = String(productId).trim();
    }
    if (!target || target === "[object Object]") return false;

    if (wishlist.includes(target)) return true;

    // Check alias matching against product catalog
    const p = db.getProduct(target);
    if (p) {
      const pId = String(p.id || "");
      const pMongoId = String(p._id || "");
      const pSlug = String(p.slug || "");
      return wishlist.some(id => id === pId || (pMongoId && id === pMongoId) || (pSlug && id === pSlug));
    }
    return false;
  }, [wishlist]);

  const [storeVersion, setStoreVersion] = useState(0);
  useEffect(() => {
    const unsub = typeof onStoreUpdate === "function" ? onStoreUpdate(() => setStoreVersion(v => v + 1)) : () => {};
    return () => unsub();
  }, []);

  // Filter out draft/inactive products and ghost IDs that do not exist in product catalog
  const allProducts = typeof db.getProducts === "function" ? db.getProducts() : [];
  const validWishlist = wishlist.filter(id => {
    if (!id || typeof id !== "string") return false;
    const cleanId = id.trim();
    if (!cleanId || cleanId === "null" || cleanId === "undefined" || cleanId === "[object Object]") return false;

    const p = db.getProduct(cleanId);
    if (p) {
      const s = String(p.status || "").toLowerCase();
      return s !== "draft" && s !== "inactive" && s !== "archived";
    }

    // If product catalog is loaded, check if ID matches any product id, _id, or slug
    if (Array.isArray(allProducts) && allProducts.length > 0) {
      const exists = allProducts.some(prod => 
        String(prod.id || "") === cleanId || 
        String(prod._id || "") === cleanId || 
        String(prod.slug || "") === cleanId
      );
      return exists;
    }

    return true; // Keep temporarily while initial products list is still fetching
  });

  return {
    wishlist: validWishlist,
    rawWishlist: wishlist,
    count: validWishlist.length,
    toggleWishlist,
    isWishlisted,
  };
}
