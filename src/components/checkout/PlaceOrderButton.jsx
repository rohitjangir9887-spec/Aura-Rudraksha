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
  variant = "main", // 'main', 'sticky', 'summary'
  id = "btn-place-order",
  style = {}
}) {
  const isSticky = variant === "sticky";
  const isSummary = variant === "summary";

  const buttonText = ctaText || (finalTotal ? `Pay with PayU • ${money(finalTotal)}` : "Pay with PayU");

  return (
    <motion.button
      type="button"
      id={id}
      disabled={disabled || loading}
      onClick={onClick}
      whileHover={{ scale: (disabled || loading) ? 1 : 1.012, y: (disabled || loading) ? 0 : -1 }}
      whileTap={{ scale: (disabled || loading) ? 1 : 0.985 }}
      style={{
        position: "relative",
        overflow: "hidden",
        width: "100%",
        padding: isSticky ? "12px 22px" : isSummary ? "14px 20px" : "16px 20px",
        fontSize: isSticky ? "14.5px" : isSummary ? "15px" : "17px",
        fontWeight: "700",
        borderRadius: isSticky ? "10px" : "12px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "10px",
        background: loading
          ? "linear-gradient(135deg, #a54d2b 0%, #8c3214 100%)"
          : "linear-gradient(135deg, #a54d2b 0%, #7c3114 100%)",
        boxShadow: loading
          ? "0 4px 15px rgba(165, 77, 43, 0.4)"
          : "0 6px 20px rgba(165, 77, 43, 0.35)",
        border: "none",
        color: "#ffffff",
        cursor: (disabled || loading) ? (loading ? "wait" : "not-allowed") : "pointer",
        opacity: disabled && !loading ? 0.6 : 1,
        transition: "background 0.3s ease, box-shadow 0.3s ease",
        ...style
      }}
    >
      {/* Subtle Glowing Animated Shimmer Overlay when Loading */}
      {loading && (
        <motion.div
          initial={{ x: "-100%" }}
          animate={{ x: "100%" }}
          transition={{
            repeat: Infinity,
            duration: 1.4,
            ease: "easeInOut"
          }}
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            width: "50%",
            background: "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.22) 50%, rgba(255,255,255,0) 100%)",
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
              transition={{ repeat: Infinity, duration: 0.9, ease: "linear" }}
              style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <Loader2 size={isSticky ? 18 : 20} color="#ffffff" />
            </motion.div>
            <motion.span
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
            >
              Connecting to PayU Gateway...
            </motion.span>
          </>
        ) : (
          <>
            {isSummary ? <Lock size={15} /> : <Zap size={isSticky ? 16 : 18} />}
            <span>{buttonText}</span>
            <ArrowRight size={isSticky ? 16 : 20} />
          </>
        )}
      </div>
    </motion.button>
  );
}
