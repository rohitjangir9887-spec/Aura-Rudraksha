import React from "react";
import { Link } from "react-router-dom";
import { Layers, RotateCcw } from "lucide-react";

export function MobileFlowControlBar({ currentScreen, setCurrentScreen, viewMode, setViewMode }) {
  return (
      <div
        style={{
          width: "100%",
          background: "#2b170d",
          borderBottom: "1.5px solid #dfc7af",
          padding: "10px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "10px",
          position: "sticky",
          top: 0,
          zIndex: 100,
          boxShadow: "0 4px 14px rgba(0,0,0,0.18)"
        }}
      >
        {/* Left: Brand & Title */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "30px",
              height: "30px",
              borderRadius: "50%",
              background: "radial-gradient(circle, #b88a58 0%, #7a4a24 100%)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "15px",
              fontWeight: "700"
            }}
          >
            ॐ
          </div>
          <div>
            <div style={{ color: "#ffffff", fontFamily: '"Cormorant Garamond", serif', fontSize: "17px", fontWeight: "700" }}>
              AURA RUDRAKSHA — MOBILE UI/UX SYSTEM
            </div>
            <div style={{ color: "#dfc7af", fontSize: "10px", fontWeight: "600" }}>
              High-Fidelity 390 × 844 px Smartphone Viewport
            </div>
          </div>
        </div>

        {/* Center: 5 Screen Switcher Tabs */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            background: "rgba(255,255,255,0.08)",
            padding: "4px",
            borderRadius: "10px",
            border: "1px solid rgba(223, 199, 175, 0.2)"
          }}
        >
          {[1, 2, 3, 4, 5].map((num) => {
            const isCurrent = currentScreen === num && viewMode === "single";
            return (
              <button
                key={num}
                type="button"
                onClick={() => {
                  setViewMode("single");
                  setCurrentScreen(num);
                }}
                style={{
                  padding: "5px 10px",
                  borderRadius: "6px",
                  border: isCurrent ? "1px solid #b88a58" : "none",
                  background: isCurrent ? "#b88a58" : "transparent",
                  color: isCurrent ? "#ffffff" : "#dfc7af",
                  fontSize: "11px",
                  fontWeight: "700",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px"
                }}
              >
                <span>Screen {num}</span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setViewMode("all_screens")}
            style={{
              padding: "5px 12px",
              borderRadius: "6px",
              border: viewMode === "all_screens" ? "1px solid #22c55e" : "1px solid rgba(255,255,255,0.15)",
              background: viewMode === "all_screens" ? "#166534" : "rgba(255,255,255,0.05)",
              color: "#ffffff",
              fontSize: "11px",
              fontWeight: "700",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              marginLeft: "4px"
            }}
          >
            <Layers size={12} />
            <span>All 5 Screens Walkthrough</span>
          </button>
        </div>

        {/* Right: Return to Store or Reset */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            type="button"
            onClick={() => {
              setCurrentScreen(1);
              setViewMode("single");
            }}
            style={{
              padding: "5px 10px",
              borderRadius: "6px",
              background: "transparent",
              border: "1px solid #dfc7af",
              color: "#dfc7af",
              fontSize: "11px",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              cursor: "pointer"
            }}
          >
            <RotateCcw size={11} />
            <span>Reset Flow</span>
          </button>

          <Link
            to="/"
            style={{
              padding: "5px 12px",
              borderRadius: "6px",
              background: "#b88a58",
              color: "#ffffff",
              textDecoration: "none",
              fontSize: "11px",
              fontWeight: "700"
            }}
          >
            Store Home
          </Link>
        </div>
      </div>

  );
}
