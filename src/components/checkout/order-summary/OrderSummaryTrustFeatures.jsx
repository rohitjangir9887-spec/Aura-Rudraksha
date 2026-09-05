import React from "react";
import { ShieldCheck, RotateCcw } from "lucide-react";

export function OrderSummaryTrustFeatures() {
  return (
    <div
      id="order-summary-trust-features"
      style={{
        marginTop: "14px",
        paddingTop: "12px",
        borderTop: "1px solid #f0e6da",
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: "6px",
        textAlign: "center"
      }}
    >
      {/* Trust 1: Secure Payment */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
        <div style={{ color: "#8c2b10", marginBottom: "2px" }}>
          <ShieldCheck size={15} strokeWidth={1.8} />
        </div>
        <div style={{ fontSize: "10.5px", fontWeight: "700", color: "#2b170d", lineHeight: "1.2" }}>
          Secure Payment
        </div>
        <div style={{ fontSize: "9px", color: "#8a7566" }}>
          256-bit SSL Encrypted
        </div>
      </div>

      {/* Trust 2: Easy Returns */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
        <div style={{ color: "#8c2b10", marginBottom: "2px" }}>
          <RotateCcw size={15} strokeWidth={1.8} />
        </div>
        <div style={{ fontSize: "10.5px", fontWeight: "700", color: "#2b170d", lineHeight: "1.2" }}>
          Easy Returns
        </div>
        <div style={{ fontSize: "9px", color: "#8a7566" }}>
          Hassle-free Returns
        </div>
      </div>

      {/* Trust 3: 100% Authentic */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
        <div style={{ color: "#8c2b10", marginBottom: "2px" }}>
          <ShieldCheck size={15} strokeWidth={1.8} />
        </div>
        <div style={{ fontSize: "10.5px", fontWeight: "700", color: "#2b170d", lineHeight: "1.2" }}>
          100% Authentic
        </div>
        <div style={{ fontSize: "9px", color: "#8a7566" }}>
          Certified Products
        </div>
      </div>
    </div>
  );
}
