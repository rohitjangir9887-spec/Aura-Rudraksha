import React from "react";

export function CheckoutHeaderTrustStrip() {
  return (
    <div
      style={{
        background: "linear-gradient(90deg, #2b170d 0%, #3e2213 50%, #2b170d 100%)",
        color: "#fbf6ef",
        fontSize: "12px",
        letterSpacing: "0.4px",
        padding: "7px 16px",
        textAlign: "center",
        borderBottom: "1px solid rgba(212, 163, 115, 0.25)"
      }}
    >
      <div
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "24px",
          flexWrap: "wrap"
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
          <span style={{ color: "#22c55e", fontWeight: "800" }}>✓</span> Authentic Products
        </span>
        <span style={{ opacity: 0.4 }}>•</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
          <span style={{ color: "#22c55e", fontWeight: "800" }}>✓</span> Lab Tested
        </span>
        <span style={{ opacity: 0.4 }}>•</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
          <span style={{ color: "#22c55e", fontWeight: "800" }}>✓</span> Free Shipping
        </span>
        <span style={{ opacity: 0.4 }}>•</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
          <span style={{ color: "#22c55e", fontWeight: "800" }}>✓</span> Secure Payments
        </span>
      </div>
    </div>
  );
}
