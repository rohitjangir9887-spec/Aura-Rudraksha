import React from "react";
import { ArrowRight } from "lucide-react";

export function SuccessActionButtons({
  onViewOrder,
  onContinueShopping
}) {
  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "8px", marginTop: "4px" }}>
      <button
        type="button"
        onClick={onViewOrder}
        style={{
          width: "100%",
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
        <span>View Order Details</span>
        <ArrowRight size={16} strokeWidth={2.4} />
      </button>

      <button
        type="button"
        onClick={onContinueShopping}
        style={{
          width: "100%",
          background: "#ffffff",
          color: "#2b170d",
          border: "1.5px solid #ebd9c8",
          borderRadius: "10px",
          padding: "12px 16px",
          fontSize: "13.5px",
          fontWeight: "700",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "6px",
          cursor: "pointer"
        }}
      >
        <span>Continue Shopping</span>
      </button>
    </div>
  );
}
