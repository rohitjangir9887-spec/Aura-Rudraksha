import React from "react";
import { ShieldCheck } from "lucide-react";

export function ConfirmationMessage() {
  return (
    <div
      style={{
        width: "100%",
        background: "#eef9f2",
        border: "1.5px solid #c9ebd4",
        borderRadius: "14px",
        padding: "12px 14px",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        boxSizing: "border-box"
      }}
    >
      <div
        style={{
          width: "28px",
          height: "28px",
          borderRadius: "50%",
          background: "#16a34a",
          color: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0
        }}
      >
        <ShieldCheck size={16} />
      </div>
      <div>
        <div style={{ fontSize: "12.5px", fontWeight: "700", color: "#166534" }}>
          Your order is confirmed and will be dispatched soon.
        </div>
        <div style={{ fontSize: "10.5px", color: "#15803d", marginTop: "2px" }}>
          Vedic energization & Ganga Jal abhishek will be performed prior to shipment.
        </div>
      </div>
    </div>
  );
}
