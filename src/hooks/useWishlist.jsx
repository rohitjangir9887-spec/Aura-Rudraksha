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
    const raw = JSON.parse(localStorage.getItem(key) || "[]");
    let ids = Array.isArray(raw) 
      ? raw.map(String).map(s => s.trim()).filter(id => id && id !== "undefined" && id !== "null" && id !== "[object Object]") 
      : [];
    return ids;
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

  // Filter out only explicitly inactive/draft products, don't discard valid IDs if db is still loading
  const validWishlist = wishlist.filter(id => {
    const p = db.getProduct(id);
    if (!p) return true; // Keep in wishlist while catalog revalidates
    return p.status !== "Draft" && p.status !== "draft" && p.status !== "Inactive" && p.status !== "inactive" && p.status !== "Archived";
  });

  return {
    wishlist: validWishlist,
    rawWishlist: wishlist,
    count: validWishlist.length,
    toggleWishlist,
    isWishlisted,
  };
}
