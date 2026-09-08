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
    let ids = Array.isArray(raw) ? raw.map(String).filter(id => id && id !== "undefined" && id !== "null") : [];
    return ids;
  } catch {
    return [];
  }
}

export function useWishlist() {
  const [wishlist, setWishlist] = useState(readLocalWishlist());

  const fetchWishlist = useCallback(async () => {
    if (authClient.isSignedIn()) {
      try {
        const res = await db.getWishlist();
        if (res?.success && Array.isArray(res.data)) {
          const apiWishlist = res.data.map(String);
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

    const handler = () => {
      setWishlist(readLocalWishlist());
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
    const pid = String(productId);
    const current = readLocalWishlist();
    let next;
    let added = false;

    if (current.includes(pid)) {
      next = current.filter((id) => id !== pid);
      added = false;
    } else {
      next = [...current, pid];
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

    const nameStr = productName || db.getProduct(pid)?.name || "Item";
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
        // Rollback on failure could be implemented here, but optimistic is often fine.
      }
    }
  }, []);

  const isWishlisted = useCallback((productId) => {
    return wishlist.includes(String(productId));
  }, [wishlist]);

  const [storeVersion, setStoreVersion] = useState(0);
  useEffect(() => {
    const unsub = typeof onStoreUpdate === "function" ? onStoreUpdate(() => setStoreVersion(v => v + 1)) : () => {};
    return () => unsub();
  }, []);

  const validWishlist = wishlist.filter(id => {
    const p = db.getProduct(id);
    return p && p.status !== "Draft" && p.status !== "Inactive";
  });

  return {
    wishlist: validWishlist,
    rawWishlist: wishlist,
    count: validWishlist.length,
    toggleWishlist,
    isWishlisted,
  };
}
