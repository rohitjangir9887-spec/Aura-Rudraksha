import { useEffect, useLayoutEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

export function ScrollToTop() {
  const { pathname, search, hash } = useLocation();
  const navType = useNavigationType();

  // Set browser scroll restoration to manual globally
  useEffect(() => {
    if (typeof window !== "undefined" && "scrollRestoration" in window.history) {
      try {
        window.history.scrollRestoration = "manual";
      } catch (e) {
        // Ignore if restricted
      }
    }
  }, []);

  const performScrollTop = () => {
    try {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    } catch {
      window.scrollTo(0, 0);
    }

    if (document.documentElement) {
      document.documentElement.scrollTop = 0;
    }
    if (document.body) {
      document.body.scrollTop = 0;
    }

    const rootEl = document.getElementById("root");
    if (rootEl && typeof rootEl.scrollTop === "number") {
      rootEl.scrollTop = 0;
    }

    const scrollContainers = document.querySelectorAll(
      ".app, .main-content, .page, .shop-page, .account-container, .admin-layout, .admin-main, .admin-content, main, [data-scroll-container]"
    );
    scrollContainers.forEach((el) => {
      if (el && typeof el.scrollTop === "number" && el.scrollTop > 0) {
        el.scrollTop = 0;
      }
    });
  };

  // Immediate layout effect before paint
  useLayoutEffect(() => {
    if (hash && hash !== "#" && hash !== "#about" && hash !== "#contact") {
      try {
        const element = document.querySelector(hash);
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
          return;
        }
      } catch {
        // Fallback to top if invalid selector
      }
    }

    // Scroll to top immediately
    performScrollTop();

    // Multi-phase execution to guarantee top position during React Suspense,
    // lazy-loaded component mounts, and image hydration
    const rafId = requestAnimationFrame(() => {
      performScrollTop();
    });

    const timers = [0, 25, 60, 120, 250, 450, 700].map((delay) =>
      setTimeout(performScrollTop, delay)
    );

    return () => {
      cancelAnimationFrame(rafId);
      timers.forEach(clearTimeout);
    };
  }, [pathname, search, hash, navType]);

  return null;
}

export default ScrollToTop;

