import React from "react";
import { Sparkles, Award } from "lucide-react";

export function SacredTrustTicker() {
  return (
    <div
      style={{
        background: "#2b170d",
        color: "#f5eee4",
        fontSize: "10.5px",
        fontWeight: "600",
        padding: "6px 12px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        letterSpacing: "0.2px"
      }}
    >
      <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
        <Sparkles size={11} color="#dfc7af" /> 100% Nepali Origin
      </span>
      <span style={{ color: "#8c7360" }}>•</span>
      <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
        <Award size={11} color="#dfc7af" /> Govt. Lab Certified
      </span>
      <span style={{ color: "#8c7360" }}>•</span>
      <span style={{ color: "#86efac", fontWeight: "700" }}>Free Shipping</span>
    </div>
  );
}
