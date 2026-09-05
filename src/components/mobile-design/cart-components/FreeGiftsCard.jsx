import React from "react";

export function FreeGiftsCard() {
  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #ebd9c8",
        borderRadius: "14px",
        padding: "12px 14px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ fontSize: "16px" }}>🎁</span>
        <div>
          <div style={{ fontSize: "12px", fontWeight: "700", color: "#2b170d" }}>
            Free Sacred Inclusions
          </div>
          <div style={{ fontSize: "10.5px", color: "#806f62" }}>
            Govt. Lab Certificate + Red Silk Thread + Gangajal
          </div>
        </div>
      </div>
      <span style={{ fontSize: "11px", fontWeight: "700", color: "#166534" }}>
        FREE (₹950)
      </span>
    </div>
  );
}
