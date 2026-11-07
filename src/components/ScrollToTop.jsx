import { useEffect, useLayoutEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

export function ScrollToTop() {
  const { pathname, search, hash } = useLocation();
  const navType = useNavigationType();

  // Set browser scroll restoration to manual globally & track popstate (Back/Forward) timestamps
  useEffect(() => {
    if (typeof window !== "undefined") {
      if ("scrollRestoration" in window.history) {
        try {
          window.history.scrollRestoration = "manual";
        } catch (_) {
          // Ignore if restricted
        }
      }

      const handlePopState = () => {
        window.__auraLastBackNavTime = Date.now();
        window.__auraLastRouteChangeTime = Date.now();
      };

      window.addEventListener("popstate", handlePopState, { passive: true });
      return () => window.removeEventListener("popstate", handlePopState);
    }
  }, []);

  // Save scroll position on listing pages (/ and /shop) so Back navigation returns smoothly to the same spot
  useEffect(() => {
    if (typeof window === "undefined") return;
    const isListingPage = pathname === "/" || pathname === "/shop";
    if (!isListingPage) return;

    const key = `aura_scroll_${pathname}${search || ""}`;
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(() => {
          try {
            if (window.scrollY > 0) {
              sessionStorage.setItem(key, String(Math.round(window.scrollY)));
            }
          } catch (_) {}
          ticking = false;
        });
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname, search]);

  // SPA route change tracking for Google Tag GT-NNMV4H8
  useEffect(() => {
    if (typeof window !== "undefined" && typeof window.gtag === "function") {
      try {
        window.gtag("config", "GT-NNMV4H8", {
          page_path: pathname + (window.location.search || "")
        });
      } catch (_) {}
    }
  }, [pathname]);

  // Instant scroll handling on route change
  useLayoutEffect(() => {
    if (typeof window !== "undefined") {
      window.__auraLastRouteChangeTime = Date.now();
      if (navType === "POP") {
        window.__auraLastBackNavTime = Date.now();
      }
    }

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

    // When returning via Back (POP) to Home or Shop, restore previous scroll position so cards don't jump under finger
    if (navType === "POP" && (pathname === "/" || pathname === "/shop")) {
      try {
        const key = `aura_scroll_${pathname}${search || ""}`;
        const savedY = parseInt(sessionStorage.getItem(key) || "0", 10);
        if (!isNaN(savedY) && savedY > 0) {
          window.scrollTo({ top: savedY, left: 0, behavior: "instant" });
          return;
        }
      } catch (_) {}
    }

    // Immediate instant reset to top for forward navigations
    try {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    } catch (_) {
      try { window.scrollTo(0, 0); } catch (__) {}
    }
    if (document.documentElement) document.documentElement.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;
  }, [pathname, search, hash, navType]);

  return null;
}


export default ScrollToTop;

