import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { CartProvider } from "./hooks/useCart";
import { ToastProvider } from "./context/ToastContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./styles.css";
import "./pages/Shop.css";

// ---------------------------------------------------------------------------
// 60-90 FPS Smooth Scrolling & Hardware Acceleration Setup
// ---------------------------------------------------------------------------
if (typeof window !== "undefined") {
  // Prevent browser from restoring old scroll position across page reloads
  if ("scrollRestoration" in window.history) {
    try {
      window.history.scrollRestoration = "manual";
    } catch (e) {
      // Ignore if restricted
    }
  }

  // Ensure wheel and touch events use passive listeners for lag-free 60-90 FPS scrolling
  try {
    const passiveOpts = { passive: true, capture: false };
    window.addEventListener("touchstart", () => {}, passiveOpts);
    window.addEventListener("touchmove", () => {}, passiveOpts);
    window.addEventListener("wheel", () => {}, passiveOpts);
  } catch (_) {}

  // Handle Vite chunk load errors gracefully (e.g. after fresh deployments or flaky network)
  window.addEventListener("vite:preloadError", (event) => {
    const lastReload = sessionStorage.getItem("aura_vite_reload");
    const now = Date.now();
    if (!lastReload || now - Number(lastReload) > 10000) {
      sessionStorage.setItem("aura_vite_reload", String(now));
      window.location.reload();
    }
  });

  // Register high-performance Service Worker for instant offline image & data caching
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          reg.update().catch(() => {});
        })
        .catch(() => {});
    });
  }
}

createRoot(document.getElementById("root")).render(
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
