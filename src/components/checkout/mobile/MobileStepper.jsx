import React from "react";

export function MobileStepper() {
  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #ebd9c8",
        borderRadius: "12px",
        padding: "10px 14px",
        marginBottom: "14px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        fontSize: "11px"
      }}
    >
      <span style={{ color: "#166534", fontWeight: "700" }}>✓ 1. Address</span>
      <span style={{ color: "#d9c6b3" }}>›</span>
      <span style={{ color: "#166534", fontWeight: "700" }}>✓ 2. Review</span>
      <span style={{ color: "#d9c6b3" }}>›</span>
      <span style={{ color: "#b88a58", fontWeight: "800" }}>● 3. Payment</span>
    </div>
  );
}
