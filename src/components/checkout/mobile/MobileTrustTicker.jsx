import React from "react";

export function MobileTrustTicker() {
  return (
    <div
      style={{
        background: "#2b170d",
        color: "#f5eee6",
        fontSize: "11px",
        padding: "6px 12px",
        textAlign: "center",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: "10px"
      }}
    >
      <span>✓ 100% Authentic</span>
      <span style={{ opacity: 0.4 }}>•</span>
      <span>✓ Lab Tested</span>
      <span style={{ opacity: 0.4 }}>•</span>
      <span>✓ Free Express Delivery</span>
    </div>
  );
}
