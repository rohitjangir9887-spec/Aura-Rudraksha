import React from "react";

export function PanditjiStats() {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
      gap: "12px",
      marginBottom: "24px"
    }}>
      <div style={{
        background: "#faf4ec",
        border: "1px solid #ebd8c5",
        borderRadius: "12px",
        padding: "12px",
        textAlign: "center"
      }}>
        <div style={{ fontSize: "22px", fontWeight: 800, color: "#a54d2b", fontFamily: "Cormorant Garamond, serif" }}>
          35+ Years
        </div>
        <div style={{ fontSize: "11px", color: "#6b584c", fontWeight: 600 }}>
          Vedic Experience
        </div>
      </div>

      <div style={{
        background: "#faf4ec",
        border: "1px solid #ebd8c5",
        borderRadius: "12px",
        padding: "12px",
        textAlign: "center"
      }}>
        <div style={{ fontSize: "22px", fontWeight: 800, color: "#a54d2b", fontFamily: "Cormorant Garamond, serif" }}>
          50,000+
        </div>
        <div style={{ fontSize: "11px", color: "#6b584c", fontWeight: 600 }}>
          Kundalis Analyzed
        </div>
      </div>

      <div style={{
        background: "#faf4ec",
        border: "1px solid #ebd8c5",
        borderRadius: "12px",
        padding: "12px",
        textAlign: "center"
      }}>
        <div style={{ fontSize: "22px", fontWeight: 800, color: "#a54d2b", fontFamily: "Cormorant Garamond, serif" }}>
          100%
        </div>
        <div style={{ fontSize: "11px", color: "#6b584c", fontWeight: 600 }}>
          Shastric Consecration
        </div>
      </div>
    </div>
  );
}
