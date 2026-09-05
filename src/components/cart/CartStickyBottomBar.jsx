import React from "react";
import { ArrowRight, Lock, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { money } from "../../data";

export function CartStickyBottomBar({
  finalTotal = 0,
  totalSavings = 0,
  onCheckout,
  itemCount = 0
}) {
  return (
    <div
      id="cart-sticky-bottom-bar"
      className="cart-mobile-sticky-bar"
      style={{
        position: "fixed",
        bottom: "calc(56px + env(safe-area-inset-bottom, 0px))",
        left: 0,
        right: 0,
        background: "#ffffff",
        borderTop: "1.5px solid #ebd9c8",
        padding: "10px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        zIndex: 10000,
        boxShadow: "0 -4px 20px rgba(43,23,13,0.09)",
        boxSizing: "border-box"
      }}
    >
      {/* Price & Savings info */}
      <div style={{ display: "flex", flexDirection: "column", minWidth: 0, paddingRight: "8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <span style={{ fontSize: "10.5px", color: "#806f62", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: "700" }}>
            Total ({itemCount} {itemCount === 1 ? 'item' : 'items'})
          </span>
          {totalSavings > 0 && (
            <span
              style={{
                fontSize: "10px",
                color: "#166534",
                background: "#eef9f2",
                padding: "1px 5px",
                borderRadius: "4px",
                fontWeight: "700"
              }}
            >
              Save {money(totalSavings)}
            </span>
          )}
        </div>
        <span style={{ fontSize: "19px", fontWeight: "900", color: "#2b170d", lineHeight: "1.2" }}>
          {money(finalTotal)}
        </span>
      </div>

      {/* Primary Checkout Button */}
      <motion.button
        type="button"
        id="btn-cart-sticky-checkout"
        onClick={onCheckout}
        whileTap={{ scale: 0.98 }}
        style={{
          background: "linear-gradient(135deg, #b88a58 0%, #8c5d2e 100%)",
          color: "#ffffff",
          border: "1px solid #d4a775",
          padding: "12px 20px",
          borderRadius: "12px",
          fontSize: "14.5px",
          fontWeight: "800",
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          boxShadow: "0 4px 14px rgba(184,138,88,0.35)",
          flexShrink: 0
        }}
      >
        <span>Proceed to Checkout</span>
        <ArrowRight size={16} strokeWidth={2.4} />
      </motion.button>
    </div>
  );
}
