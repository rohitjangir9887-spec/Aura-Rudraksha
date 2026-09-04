import React from "react";
import { motion } from "framer-motion";
import { Lock, ArrowRight, Loader2, Zap, ShieldCheck } from "lucide-react";
import { money } from "../../data";

export function PlaceOrderButton({
  loading = false,
  onClick,
  disabled = false,
  finalTotal,
  ctaText,
  variant = "gold", // 'gold', 'dark', 'sticky', 'summary'
  id = "btn-place-order",
  style = {}
}) {
  const isSticky = variant === "sticky";
  const isDark = variant === "dark";
  const isSummary = variant === "summary";

  const buttonText = ctaText || (finalTotal ? `Pay Securely • ${money(finalTotal)}` : "Pay Securely");

  // Background colors matching user's requested palette:
  // Golden Sand: #b88a58 -> #a57845
  // Dark Chocolate: #2c1e18 -> #201510
  let bgGradient = "linear-gradient(135deg, #b88a58 0%, #a07343 100%)";
  let boxShadow = "0 4px 16px rgba(184, 138, 88, 0.35)";

  if (isDark) {
    bgGradient = "linear-gradient(135deg, #2f1e16 0%, #20130d 100%)";
    boxShadow = "0 4px 16px rgba(47, 30, 22, 0.4)";
  } else if (isSticky) {
    bgGradient = "linear-gradient(135deg, #b88a58 0%, #a07343 100%)";
    boxShadow = "0 4px 14px rgba(184, 138, 88, 0.3)";
  }

  return (
    <motion.button
      type="button"
      id={id}
      disabled={disabled || loading}
      onClick={onClick}
      whileHover={{ scale: disabled || loading ? 1 : 1.015, y: disabled || loading ? 0 : -1 }}
      whileTap={{ scale: disabled || loading ? 1 : 0.985 }}
      style={{
        position: "relative",
        overflow: "hidden",
        width: "100%",
        padding: isSticky ? "12px 20px" : "15px 24px",
        fontSize: isSticky ? "14.5px" : "16.5px",
        fontWeight: "700",
        borderRadius: "14px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "10px",
        background: loading ? "linear-gradient(135deg, #8c633a 0%, #6f4c28 100%)" : bgGradient,
        boxShadow: loading ? "0 4px 12px rgba(140, 99, 58, 0.3)" : boxShadow,
        border: isDark ? "1px solid #4a3224" : "1px solid #c99a67",
        color: "#ffffff",
        cursor: disabled || loading ? (loading ? "wait" : "not-allowed") : "pointer",
        opacity: disabled && !loading ? 0.6 : 1,
        transition: "all 0.25s ease",
        letterSpacing: "0.2px",
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        ...style
      }}
    >
      {/* Animated Shimmer Overlay when Loading */}
      {loading && (
        <motion.div
          initial={{ x: "-100%" }}
          animate={{ x: "100%" }}
          transition={{
            repeat: Infinity,
            duration: 1.2,
            ease: "easeInOut"
          }}
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            width: "50%",
            background: "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.25) 50%, rgba(255,255,255,0) 100%)",
            pointerEvents: "none",
            zIndex: 1
          }}
        />
      )}

      {/* Button Content */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "9px", zIndex: 2 }}>
        {loading ? (
          <>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 0.85, ease: "linear" }}
              style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <Loader2 size={isSticky ? 18 : 20} color="#ffffff" />
            </motion.div>
            <motion.span
              animate={{ opacity: [0.75, 1, 0.75] }}
              transition={{ repeat: Infinity, duration: 1.1, ease: "easeInOut" }}
            >
              Connecting to Secure Gateway...
            </motion.span>
          </>
        ) : (
          <>
            {isDark ? <Zap size={isSticky ? 16 : 18} fill="#ffffff" /> : <Lock size={isSticky ? 15 : 17} />}
            <span>{buttonText}</span>
            <ArrowRight size={isSticky ? 16 : 19} strokeWidth={2.4} />
          </>
        )}
      </div>
    </motion.button>
  );
}
