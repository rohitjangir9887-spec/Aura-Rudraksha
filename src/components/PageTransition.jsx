import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { motion } from "framer-motion";

export function PageTransition({ children }) {
  const location = useLocation();
  const [loadingBar, setLoadingBar] = useState(false);

  useEffect(() => {
    // Trigger top loading bar animation on route change
    setLoadingBar(true);
    const timer = setTimeout(() => {
      setLoadingBar(false);
    }, 350);

    return () => clearTimeout(timer);
  }, [location.pathname]);

  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      {/* Top Page Loading Bar for Route Navigation & Refresh */}
      {loadingBar && (
        <div
          aria-hidden="true"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            height: "3px",
            background: "linear-gradient(90deg, #b85d25 0%, #e09f67 50%, #d97706 100%)",
            boxShadow: "0 0 10px rgba(184, 93, 37, 0.6), 0 0 5px rgba(217, 119, 6, 0.4)",
            zIndex: 99999,
            animation: "aura-top-progress 0.4s ease-out forwards",
            pointerEvents: "none"
          }}
        />
      )}

      {/* Smooth Page Entrance Motion keyed strictly to pathname to prevent unmounting on filter changes */}
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        style={{ width: "100%" }}
      >
        {children}
      </motion.div>
    </div>
  );
}

