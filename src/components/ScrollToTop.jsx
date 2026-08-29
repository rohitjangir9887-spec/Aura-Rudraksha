import { useEffect, useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";

export function ScrollToTop() {
  const { pathname, search, hash } = useLocation();

  // Ensure scroll restoration is manual so browser doesn't force previous scroll position
  useEffect(() => {
    if (typeof window !== "undefined" && "scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  // Use layout effect to reset scroll before paint
  useLayoutEffect(() => {
    if (hash) {
      // If navigating to an anchor like #about or #contact, scroll smoothly to target
      const element = document.querySelector(hash);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
        return;
      }
    }

    // Immediately scroll to the top of the window and document
    window.scrollTo(0, 0);
    if (document.documentElement) {
      document.documentElement.scrollTop = 0;
    }
    if (document.body) {
      document.body.scrollTop = 0;
    }

    // Also reset scroll on main content containers if any exist
    const mainContainers = document.querySelectorAll(".main-content, .app, #root");
    mainContainers.forEach((el) => {
      if (el && el.scrollTop) {
        el.scrollTop = 0;
      }
    });
  }, [pathname, search, hash]);

  return null;
}
export default ScrollToTop;
