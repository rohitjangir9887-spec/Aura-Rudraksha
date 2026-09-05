import React from "react";
import { ShieldCheck, Award, Sparkles, RefreshCw } from "lucide-react";

export function CartTrustBanner() {
  return (
    <div
      id="cart-trust-banner"
      style={{
        marginTop: "16px",
        background: "linear-gradient(135deg, #fffcf7 0%, #faf4ed 100%)",
        border: "1.5px solid #ebdccb",
        borderRadius: "14px",
        padding: "14px",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "10px",
        boxSizing: "border-box",
        width: "100%"
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
        <div
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "8px",
            background: "#f4e6d6",
            color: "#b85d25",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            fontSize: "15px"
          }}
        >
          📿
        </div>
        <div>
          <div style={{ fontSize: "12.5px", fontWeight: "700", color: "#2b170d" }}>
            Vedic Prana Pratishtha
          </div>
          <div style={{ fontSize: "11px", color: "#7a675a", lineHeight: "1.3" }}>
            Purified with Ganga Jal & energized with Vedic mantras.
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
        <div
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "8px",
            background: "#eef9f2",
            color: "#166534",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0
          }}
        >
          <ShieldCheck size={18} strokeWidth={2.2} />
        </div>
        <div>
          <div style={{ fontSize: "12.5px", fontWeight: "700", color: "#2b170d" }}>
            100% Lab Tested & Certified
          </div>
          <div style={{ fontSize: "11px", color: "#7a675a", lineHeight: "1.3" }}>
            Government accredited lab certificate with QR verification.
          </div>
        </div>
      </div>
    </div>
  );
}
