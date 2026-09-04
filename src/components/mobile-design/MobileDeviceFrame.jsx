import React from "react";
import { Sparkles, Wifi, Battery, Signal } from "lucide-react";

/**
 * MobileDeviceFrame
 * 
 * High-fidelity 390 x 844 px smartphone chassis:
 * - Dynamic status bar (9:41, Signal, Wifi, Battery)
 * - Exact 390px x 844px interior viewport with smooth scroll
 * - Floating Aura AI button positioned at bottom: 84px, right: 16px
 * - Home indicator bar
 */
export function MobileDeviceFrame({
  children,
  onOpenAuraAi,
  activeScreenTitle = "Screen 1 — Product / Cart"
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px 10px",
        boxSizing: "border-box"
      }}
    >
      {/* Screen Title Indicator (For presentation clarity) */}
      <div
        style={{
          marginBottom: "12px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          background: "#2b170d",
          color: "#f5eee4",
          padding: "6px 14px",
          borderRadius: "20px",
          fontSize: "12px",
          fontWeight: "700",
          boxShadow: "0 2px 8px rgba(43, 23, 13, 0.15)"
        }}
      >
        <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#22c55e" }} />
        <span>{activeScreenTitle} (390 × 844 px)</span>
      </div>

      {/* Realistic Smartphone Chassis */}
      <div
        id="iphone-chassis"
        style={{
          width: "390px",
          height: "844px",
          background: "#ffffff",
          borderRadius: "44px",
          border: "10px solid #1f1a17",
          boxShadow: "0 20px 60px rgba(43, 23, 13, 0.25), 0 0 0 1px #423832",
          position: "relative",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box"
        }}
      >
        {/* Top Status Bar & Dynamic Island / Notch */}
        <div
          style={{
            height: "44px",
            background: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 20px",
            position: "relative",
            zIndex: 60,
            flexShrink: 0,
            userSelect: "none"
          }}
        >
          {/* Left: Time */}
          <span style={{ fontSize: "14px", fontWeight: "700", color: "#1f1a17", letterSpacing: "-0.2px" }}>
            9:41
          </span>

          {/* Center: Dynamic Island Speaker Notch */}
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "9px",
              transform: "translateX(-50%)",
              width: "110px",
              height: "24px",
              background: "#1f1a17",
              borderRadius: "14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px"
            }}
          >
            <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#0d0a08" }} />
            <div style={{ width: "36px", height: "4px", borderRadius: "2px", background: "#332b26" }} />
          </div>

          {/* Right: Signal, Wifi, Battery */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#1f1a17" }}>
            <Signal size={13} strokeWidth={2.4} />
            <Wifi size={13} strokeWidth={2.4} />
            <div
              style={{
                width: "22px",
                height: "11px",
                border: "1.5px solid #1f1a17",
                borderRadius: "3px",
                padding: "1px",
                display: "flex",
                alignItems: "center"
              }}
            >
              <div style={{ width: "100%", height: "100%", background: "#1f1a17", borderRadius: "1px" }} />
            </div>
          </div>
        </div>

        {/* Scrollable Interior Viewport */}
        <div
          id="mobile-scrollable-viewport"
          style={{
            flex: 1,
            overflowY: "auto",
            overflowX: "hidden",
            background: "#fcfaf7",
            position: "relative",
            WebkitOverflowScrolling: "touch"
          }}
        >
          {children}
        </div>

        {/* FIXED Floating Aura AI Button (bottom: 84px, right: 16px) */}
        <button
          type="button"
          onClick={onOpenAuraAi}
          aria-label="Ask Aura AI"
          title="Consult Aura AI Vedic Guide"
          style={{
            position: "absolute",
            bottom: "84px",
            right: "16px",
            width: "48px",
            height: "48px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #2b170d 0%, #7a4a24 100%)",
            color: "#ffffff",
            border: "2px solid #dfc7af",
            boxShadow: "0 6px 18px rgba(43, 23, 13, 0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            zIndex: 70,
            transition: "transform 0.15s ease",
            padding: 0
          }}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "1px"
            }}
          >
            <Sparkles size={18} color="#f5eee4" />
            <span style={{ fontSize: "7.5px", fontWeight: "800", color: "#dfc7af", letterSpacing: "0.2px" }}>
              AI
            </span>
          </div>
        </button>

        {/* Home Indicator Bar */}
        <div
          style={{
            height: "20px",
            background: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            zIndex: 60
          }}
        >
          <div
            style={{
              width: "125px",
              height: "4px",
              borderRadius: "2px",
              background: "#1f1a17"
            }}
          />
        </div>
      </div>
    </div>
  );
}
