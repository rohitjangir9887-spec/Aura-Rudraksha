import React, { useState, useEffect, useCallback } from "react";
import { emitToast } from "../context/ToastContext";
import { db } from "../lib/db";
import { authClient } from "../lib/authClient";

function readLocalWishlist() {
  try {
    const raw = JSON.parse(localStorage.getItem("aura_wishlist") || "[]");
    return Array.isArray(raw) ? raw.map(String) : [];
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
            localStorage.setItem("aura_wishlist", JSON.stringify(apiWishlist));
          } catch (_) {}
        }
      } catch (err) {
        console.error("Failed to fetch wishlist", err);
      }
    }
  }, []);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  useEffect(() => {
    const handler = () => {
      setWishlist(readLocalWishlist());
    };
    window.addEventListener("aura:wishlist-updated", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("aura:wishlist-updated", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

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
      localStorage.setItem("aura_wishlist", JSON.stringify(next));
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

  return {
    wishlist,
    count: wishlist.length,
    toggleWishlist,
    isWishlisted,
  };
}
