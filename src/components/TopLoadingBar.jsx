import React, { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";

// Global navigation progress helpers
let navTimer = null;
let finishTimer = null;

export function triggerNavProgress() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("aura:nav-progress-start"));
  }
}

export function completeNavProgress() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("aura:nav-progress-complete"));
  }
}

/**
 * TopLoadingBar
 * Sleek luxury golden progress indicator providing instant (<10ms) visual response
 * when clicking any link, icon, product card, or performing any route navigation.
 */
export function TopLoadingBar() {
  const location = useLocation();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const prevPathRef = useRef(location.pathname + location.search);

  // Trigger progress whenever location changes
  useEffect(() => {
    const currentPath = location.pathname + location.search;
    if (currentPath !== prevPathRef.current) {
      prevPathRef.current = currentPath;
      // Route changed - complete the bar smoothly
      setProgress(100);
      finishTimer = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 250);
    }
  }, [location.pathname, location.search]);

  // Intercept global link taps & custom navigation events
  useEffect(() => {
    const handleStart = () => {
      clearTimeout(finishTimer);
      clearInterval(navTimer);
      setVisible(true);
      setProgress(25);

      navTimer = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 85) {
            clearInterval(navTimer);
            return 85;
          }
          const jump = Math.max(2, (85 - prev) * 0.15);
          return Math.min(85, prev + jump);
        });
      }, 120);
    };

    const handleComplete = () => {
      clearInterval(navTimer);
      setProgress(100);
      finishTimer = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 250);
    };

    // Global listener for click on any interactive navigation element
    const handleDocumentClick = (e) => {
      const anchor = e.target.closest("a, button, [role='button'], .aura-shop-card, .aura-cat-card");
      if (!anchor) return;

      // Only trigger if it's a link to an internal route
      if (anchor.tagName === "A" && anchor.getAttribute("href")) {
        const href = anchor.getAttribute("href");
        if (href.startsWith("/") && !href.startsWith("//") && !href.startsWith("/api") && !anchor.target) {
          handleStart();
        }
      } else if (anchor.classList.contains("aura-shop-card") || anchor.classList.contains("aura-cat-card")) {
        handleStart();
      }
    };

    window.addEventListener("aura:nav-progress-start", handleStart);
    window.addEventListener("aura:nav-progress-complete", handleComplete);
    document.addEventListener("click", handleDocumentClick, { capture: true });

    return () => {
      clearInterval(navTimer);
      clearTimeout(finishTimer);
      window.removeEventListener("aura:nav-progress-start", handleStart);
      window.removeEventListener("aura:nav-progress-complete", handleComplete);
      document.removeEventListener("click", handleDocumentClick, { capture: true });
    };
  }, []);

  if (!visible && progress === 0) return null;

  return (
    <div
      id="aura-top-loading-bar"
      role="progressbar"
      aria-hidden="true"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: "3px",
        zIndex: 9999999,
        pointerEvents: "none",
        opacity: visible || progress > 0 ? 1 : 0,
        transition: "opacity 0.25s ease-out",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${progress}%`,
          background: "linear-gradient(90deg, #b85d25 0%, #d4af37 50%, #f5c382 100%)",
          boxShadow: "0 0 10px rgba(212, 175, 55, 0.7), 0 0 4px rgba(184, 93, 37, 0.5)",
          transition: progress === 100 ? "width 0.15s ease-out" : "width 0.25s cubic-bezier(0.1, 0.5, 0.1, 1)",
        }}
      />
    </div>
  );
}
