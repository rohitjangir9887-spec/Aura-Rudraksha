import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { CartProvider } from "./hooks/useCart";
import { ToastProvider } from "./context/ToastContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { setupGlobalTouchFeedback } from "./lib/haptics";
import "./styles.css";
import "./pages/Shop.css";

// ---------------------------------------------------------------------------
// 60-90 FPS Smooth Scrolling & Hardware Acceleration Setup
// ---------------------------------------------------------------------------
if (typeof window !== "undefined") {
  // Initialize native tactile touch feedback across buttons, chips, and links
  setupGlobalTouchFeedback();

  // One-time invalidation after review-system fixes so old localStorage review
  // counts cannot keep showing deleted/stale reviews for up to 24 hours.
  try {
    const REVIEW_CACHE_VERSION = "2026-09-14-review-v2";
    if (localStorage.getItem("aura_review_cache_version") !== REVIEW_CACHE_VERSION) {
      localStorage.removeItem("aura_reviews_cache");
      localStorage.setItem("aura_review_cache_version", REVIEW_CACHE_VERSION);
      localStorage.setItem("aura_last_fetch_time", "0");
    }

    const CATALOG_CACHE_VERSION = "2026-09-16-v3";
    if (localStorage.getItem("aura_catalog_cache_version") !== CATALOG_CACHE_VERSION) {
      localStorage.removeItem("aura_products_cache");
      localStorage.removeItem("aura_banners_cache");
      localStorage.removeItem("aura_offers_cache");
      localStorage.removeItem("aura_active_offer_cache");
      localStorage.removeItem("aura_last_fetch_time");
      localStorage.removeItem("aura_last_product_fetch_time");
      localStorage.removeItem("aura_cache_hydrated");
      localStorage.setItem("aura_catalog_cache_version", CATALOG_CACHE_VERSION);
    }
  } catch (_) {}

  // Prevent browser from restoring old scroll position across page reloads
  if ("scrollRestoration" in window.history) {
    try {
      window.history.scrollRestoration = "manual";
    } catch (e) {
      // Ignore if restricted
    }
  }


  // Handle Vite chunk load errors gracefully (e.g. after fresh deployments or flaky network)
  window.addEventListener("vite:preloadError", (event) => {
    const lastReload = sessionStorage.getItem("aura_vite_reload");
    const now = Date.now();
    if (!lastReload || now - Number(lastReload) > 10000) {
      sessionStorage.setItem("aura_vite_reload", String(now));
      window.location.reload();
    }
  });

  // Network-aware, staggered idle route prefetching so first-time visitors experience zero lag
  const scheduleStaggeredPrefetch = () => {
    try {
      const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if (conn && (conn.saveData || conn.effectiveType === "2g" || conn.effectiveType === "slow-2g")) {
        return;
      }
      const routeQueue = [
        () => import("./pages/Product"),
        () => import("./pages/Shop"),
        () => import("./pages/Cart"),
        () => import("./pages/Checkout")
      ];
      let idx = 0;
      const loadNext = () => {
        if (idx >= routeQueue.length) return;
        const loader = routeQueue[idx++];
        try {
          loader().catch(() => {});
        } catch (_) {}
        if (idx < routeQueue.length) {
          setTimeout(() => {
            if ("requestIdleCallback" in window) {
              window.requestIdleCallback(loadNext, { timeout: 3000 });
            } else {
              loadNext();
            }
          }, 1100);
        }
      };
      if ("requestIdleCallback" in window) {
        window.requestIdleCallback(loadNext, { timeout: 4000 });
      } else {
        setTimeout(loadNext, 2000);
      }
    } catch (_) {}
  };

  if (document.readyState === "complete") {
    setTimeout(scheduleStaggeredPrefetch, 2500);
  } else {
    window.addEventListener("load", () => setTimeout(scheduleStaggeredPrefetch, 2500), { once: true });
  }
}

const rootElement = document.getElementById("root");
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(
    <ErrorBoundary>
      <BrowserRouter>
        <ToastProvider>
          <CartProvider>
            <App />
          </CartProvider>
        </ToastProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
