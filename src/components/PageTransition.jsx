import React from "react";
import { useLocation } from "react-router-dom";
import { motion } from "framer-motion";

export function PageTransition({ children }) {
  const location = useLocation();

  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      {/* High-Performance Instant Page Entrance with zero layout stall */}
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0.9 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.12, ease: "easeOut" }}
        style={{ width: "100%", willChange: "opacity" }}
      >
        {children}
      </motion.div>
    </div>
  );
}

