import React from "react";
import { ShieldCheck, Clock } from "lucide-react";

export function VedicConsecrationCard() {
  return (
    <div
      style={{
        background: "linear-gradient(135deg, #fbf7f0 0%, #f7eee3 100%)",
        border: "1px solid #dfc7af",
        borderRadius: "14px",
        padding: "12px 14px",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        boxShadow: "0 2px 8px rgba(184, 138, 88, 0.08)"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <div
          style={{
            width: "24px",
            height: "24px",
            borderRadius: "50%",
            background: "#b88a58",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "12px"
          }}
        >
          🕉
        </div>
        <div>
          <div style={{ fontSize: "12.5px", fontWeight: "700", color: "#2b170d" }}>
            Vedic Consecration Included
          </div>
          <div style={{ fontSize: "10px", color: "#8c6b54" }}>
            Prana Pratishtha by Kashi Vishwanath Priests
          </div>
        </div>
      </div>

      <p
        style={{
          fontSize: "11px",
          color: "#5c483a",
          lineHeight: "1.45",
          margin: 0
        }}
      >
        Every Rudraksha bead is energized through holy Ganga Jal abhishek, bilva patra offerings, and sacred Shiva Beej Mantra chanting with the buyer's Gotra before shipment.
      </p>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          paddingTop: "6px",
          borderTop: "1px dashed #d9c6b3",
          fontSize: "10.5px",
          color: "#7a4a24",
          fontWeight: "600"
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <ShieldCheck size={12} color="#16a34a" /> 100% Authentic Guarantee
        </span>
        <span>•</span>
        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <Clock size={12} color="#99582a" /> Dispatches in 24h
        </span>
      </div>
    </div>
  );
}
