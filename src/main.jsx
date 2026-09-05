import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { CartProvider } from "./hooks/useCart";
import { ToastProvider } from "./context/ToastContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { initStaticRevealObserver } from "./lib/MotionObserver";
import "./styles.css";
import "./pages/Shop.css";

// Initialize global motion observer for statically rendered bits
if (typeof window !== "undefined") {
  initStaticRevealObserver();
}

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
