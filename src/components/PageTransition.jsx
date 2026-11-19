import React, { useLayoutEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

export function PageTransition({ children }) {
  const { pathname } = useLocation();
  const container = useRef(null);
  const lastPath = useRef(pathname);

  useLayoutEffect(() => {
    const changed = lastPath.current !== pathname;
    lastPath.current = pathname;
    if (!changed || window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) return;

    const content = container.current?.querySelector(".main-content");
    const animation = content?.animate?.([{ opacity: 0.8 }, { opacity: 1 }], {
      duration: 180,
      easing: "ease-out"
    });
    return () => animation?.cancel();
  }, [pathname]);

  return (
    <div ref={container} style={{ position: "relative", minHeight: "100vh", width: "100%" }}>
      {children}
    </div>
  );
}
