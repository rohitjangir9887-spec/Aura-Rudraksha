import React from "react";
import { Truck, ShieldCheck, Sparkles } from "lucide-react";

export function StickySummaryReassurance() {
  return (
    <div
      style={{
        marginTop: "16px",
        paddingTop: "14px",
        borderTop: "1px solid #f0e6da",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        fontSize: "11px",
        color: "#6e5d50"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <Truck size={13} color="#99582a" />
        <span>Free Insured Express Transit Across India</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <ShieldCheck size={13} color="#16a34a" />
        <span>Govt Recognized Lab Test Certificate Included</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <Sparkles size={13} color="#b88a58" />
        <span>Vedic Mantra Puja & Ganga Jal Consecrated</span>
      </div>
    </div>
  );
}
