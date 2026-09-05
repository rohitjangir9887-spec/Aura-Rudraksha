import React from "react";
import { ArrowRight } from "lucide-react";

export function StickyCheckoutBar({ totalPrice, onProceed }) {
  return (
    <div
      style={{
        position: "sticky",
        bottom: 0,
        left: 0,
        right: 0,
        background: "#ffffff",
        borderTop: "1.5px solid #ebd9c8",
        padding: "10px 14px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
        boxShadow: "0 -4px 16px rgba(43, 23, 13, 0.08)",
        zIndex: 30
      }}
    >
      <div>
        <div style={{ fontSize: "10.5px", color: "#806f62", textTransform: "uppercase", letterSpacing: "0.5px" }}>
          Total Amount
        </div>
        <div style={{ fontSize: "19px", fontWeight: "800", color: "#2b170d", lineHeight: "1.1" }}>
          ₹{totalPrice.toLocaleString("en-IN")}
        </div>
        <div style={{ fontSize: "9.5px", color: "#166534", fontWeight: "700" }}>
          ✓ Free Insured Delivery
        </div>
      </div>

      <button
        type="button"
        onClick={onProceed}
        style={{
          flex: 1,
          maxWidth: "220px",
          background: "linear-gradient(135deg, #b88a58 0%, #8c5d2e 100%)",
          color: "#ffffff",
          border: "none",
          borderRadius: "10px",
          padding: "13px 16px",
          fontSize: "14px",
          fontWeight: "700",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "6px",
          cursor: "pointer",
          boxShadow: "0 3px 10px rgba(184, 138, 88, 0.35)"
        }}
      >
        <span>Proceed to Checkout</span>
        <ArrowRight size={16} strokeWidth={2.4} />
      </button>
    </div>
  );
}
