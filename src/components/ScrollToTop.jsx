import { useEffect, useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";

export function ScrollToTop() {
  const { pathname, hash } = useLocation();

  // Set browser scroll restoration to manual globally
  useEffect(() => {
    if (typeof window !== "undefined" && "scrollRestoration" in window.history) {
      try {
        window.history.scrollRestoration = "manual";
      } catch (_) {
        // Ignore if restricted
      }
    }
  }, []);

  // Instant scroll to top on route change without repeated delayed timer jumping
  useLayoutEffect(() => {
    if (hash && hash !== "#" && hash !== "#about" && hash !== "#contact") {
      try {
        const element = document.querySelector(hash);
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
          return;
        }
      } catch (_) {
        // Fallback to top
      }
    }

    // Immediate instant reset
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    if (document.documentElement) document.documentElement.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;
  }, [pathname, hash]);

  return null;
}

export default ScrollToTop;

