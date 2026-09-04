import React from "react";
import { Monitor, Smartphone, Columns, Sparkles, Check, ShieldCheck } from "lucide-react";

/**
 * CheckoutPresentationSwitcher
 * Allows viewing the checkout in Desktop Web View, Mobile Device View (in a realistic luxury smartphone frame),
 * or Side-by-Side Presentation as explicitly requested by the prompt.
 */
export function CheckoutPresentationSwitcher({ 
  viewMode = "desktop", 
  setViewMode 
}) {
  return (
    <div 
      id="checkout-presentation-bar"
      style={{
        background: "linear-gradient(90deg, #1f140e 0%, #2b170d 50%, #1f140e 100%)",
        color: "#ffffff",
        padding: "10px 16px",
        borderBottom: "1px solid rgba(212, 163, 115, 0.3)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "16px",
        flexWrap: "wrap",
        zIndex: 990
      }}
    >
      {/* Left: Branding & Quality Indicator */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <span 
          style={{
            background: "linear-gradient(135deg, #b88a58 0%, #8c5d2e 100%)",
            color: "#ffffff",
            padding: "3px 8px",
            borderRadius: "4px",
            fontSize: "10px",
            fontWeight: "800",
            letterSpacing: "0.8px",
            textTransform: "uppercase"
          }}
        >
          4K Luxury Design
        </span>
        <span style={{ fontSize: "12.5px", color: "#dfc7af", fontWeight: "600" }}>
          Aura Rudraksha Checkout & PayU Flow
        </span>
      </div>

      {/* Center: Mode Switcher Buttons */}
      <div 
        style={{
          display: "flex",
          alignItems: "center",
          background: "rgba(255, 255, 255, 0.08)",
          padding: "3px",
          borderRadius: "10px",
          border: "1px solid rgba(212, 163, 115, 0.25)"
        }}
      >
        <button
          type="button"
          id="btn-view-desktop"
          onClick={() => setViewMode("desktop")}
          style={{
            background: viewMode === "desktop" ? "linear-gradient(135deg, #b88a58 0%, #8c5d2e 100%)" : "transparent",
            color: viewMode === "desktop" ? "#ffffff" : "#dfc7af",
            border: "none",
            padding: "5px 12px",
            borderRadius: "7px",
            fontSize: "11.5px",
            fontWeight: "700",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "5px",
            transition: "all 0.15s ease"
          }}
        >
          <Monitor size={13} />
          <span>Desktop Web UI</span>
        </button>

        <button
          type="button"
          id="btn-view-side-by-side"
          onClick={() => setViewMode("dual")}
          style={{
            background: viewMode === "dual" ? "linear-gradient(135deg, #b88a58 0%, #8c5d2e 100%)" : "transparent",
            color: viewMode === "dual" ? "#ffffff" : "#dfc7af",
            border: "none",
            padding: "5px 12px",
            borderRadius: "7px",
            fontSize: "11.5px",
            fontWeight: "700",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "5px",
            transition: "all 0.15s ease"
          }}
        >
          <Columns size={13} />
          <span>Side-by-Side Presentation</span>
        </button>

        <button
          type="button"
          id="btn-view-mobile"
          onClick={() => setViewMode("mobile")}
          style={{
            background: viewMode === "mobile" ? "linear-gradient(135deg, #b88a58 0%, #8c5d2e 100%)" : "transparent",
            color: viewMode === "mobile" ? "#ffffff" : "#dfc7af",
            border: "none",
            padding: "5px 12px",
            borderRadius: "7px",
            fontSize: "11.5px",
            fontWeight: "700",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "5px",
            transition: "all 0.15s ease"
          }}
        >
          <Smartphone size={13} />
          <span>Mobile Device View</span>
        </button>
      </div>

      {/* Right: Security info */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "#dfc7af" }}>
        <ShieldCheck size={13} color="#22c55e" />
        <span>PayU Hosted & Secure</span>
      </div>
    </div>
  );
}
