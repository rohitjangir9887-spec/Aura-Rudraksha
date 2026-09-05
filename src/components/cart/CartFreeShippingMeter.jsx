import React from "react";
import { Truck, Sparkles, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { money } from "../../data";

export function CartFreeShippingMeter({
  subtotal = 0,
  freeShippingThreshold = 999,
  isFreeShipping = false
}) {
  const diff = Math.max(0, (freeShippingThreshold || 999) - subtotal);
  const progressPercent = Math.min(100, Math.round((subtotal / (freeShippingThreshold || 1)) * 100));

  return (
    <motion.div
      id="cart-free-shipping-meter"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: isFreeShipping ? "#ecfdf5" : "#fffcf7",
        border: isFreeShipping ? "1.5px solid #a7f3d0" : "1.5px solid #ebdccb",
        borderRadius: "14px",
        padding: "12px 14px",
        marginBottom: "14px",
        boxShadow: "0 2px 8px rgba(43,23,13,0.03)",
        boxSizing: "border-box",
        width: "100%"
      }}
    >
      {isFreeShipping ? (
        <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#166534" }}>
          <div
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              background: "#dcfce7",
              color: "#166534",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0
            }}
          >
            <CheckCircle2 size={16} strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ fontSize: "13px", fontWeight: "800", letterSpacing: "0.2px", color: "#14532d" }}>
              🎉 FREE EXPRESS SHIPPING UNLOCKED!
            </div>
            <div style={{ fontSize: "11.5px", color: "#15803d", marginTop: "1px" }}>
              Your sacred order qualifies for free insured doorstep delivery.
            </div>
          </div>
        </div>
      ) : (
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "7px",
              flexWrap: "wrap",
              gap: "4px"
            }}
          >
            <div style={{ fontSize: "12.5px", fontWeight: "700", color: "#2b170d" }}>
              Add <span style={{ color: "#b85d25", fontWeight: "800" }}>{money(diff)}</span> more for{" "}
              <strong style={{ color: "#166534" }}>FREE SHIPPING</strong>
            </div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#b88a58", fontSize: "11px", fontWeight: "700" }}>
              <Truck size={14} />
              <span>Express Dispatch</span>
            </div>
          </div>

          {/* Progress bar */}
          <div
            style={{
              height: "6px",
              background: "#f0e4d7",
              borderRadius: "99px",
              overflow: "hidden",
              position: "relative"
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${progressPercent}%`,
                background: "linear-gradient(90deg, #b88a58 0%, #16a34a 100%)",
                borderRadius: "99px",
                transition: "width 0.4s ease"
              }}
            />
          </div>
        </div>
      )}
    </motion.div>
  );
}
