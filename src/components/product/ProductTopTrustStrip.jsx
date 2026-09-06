import React from "react";
import { Sparkles, ShieldCheck, Award, Truck } from "lucide-react";

/**
 * ProductTopTrustStrip
 * Top spiritual trust bar on desktop & mobile product pages.
 */
export function ProductTopTrustStrip() {
  return (
    <div className="product-top-trust-strip" style={{
      background: "linear-gradient(90deg, #2b170d 0%, #4a2715 50%, #2b170d 100%)",
      color: "#fbf5ea",
      borderBottom: "1px solid rgba(200, 138, 61, 0.3)",
      padding: "7px 16px",
      fontSize: "11.5px",
      letterSpacing: "0.4px",
      fontWeight: "500",
      textAlign: "center"
    }}>
      <div className="container" style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "18px",
        flexWrap: "wrap"
      }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
          <Sparkles size={13} color="#eed9b8" />
          <span>100% Sacred Himalayan Beads</span>
        </div>
        <span style={{ opacity: 0.4 }}>•</span>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
          <Award size={13} color="#eed9b8" />
          <span>Govt. Recognized Lab Certified</span>
        </div>
        <span style={{ opacity: 0.4 }}>•</span>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
          <ShieldCheck size={13} color="#eed9b8" />
          <span>Vedic Consecrated &amp; Energized</span>
        </div>
        <span style={{ opacity: 0.4 }} className="desktop-only-trust-sep">•</span>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }} className="desktop-only-trust-item">
          <Truck size={13} color="#eed9b8" />
          <span>Free Insured Express Shipping</span>
        </div>
      </div>
    </div>
  );
}
