import React from "react";
import { PiggyBank } from "lucide-react";
import { money } from "../../../data";

export function OrderSummarySavings({ totalSavings, isReceipt }) {
  if (totalSavings <= 0) return null;

  return (
    <div
      id="order-summary-savings-highlight"
      style={{
        background: "#f2f8f3",
        border: "1px solid #cbe6d2",
        borderRadius: "10px",
        padding: "10px 12px",
        marginTop: "12px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "10px"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <div
          style={{
            width: "28px",
            height: "28px",
            borderRadius: "50%",
            background: "#dcf3e1",
            color: "#166534",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0
          }}
        >
          <PiggyBank size={16} strokeWidth={2} />
        </div>
        <div style={{ fontSize: "12px", color: "#166534", fontWeight: "600", lineHeight: "1.35" }}>
          {isReceipt ? "You saved" : "Great choice! You are saving"} <b>{money(totalSavings)}</b> on this order.
        </div>
      </div>

      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontSize: "9.5px", color: "#2e7d32", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: "700" }}>
          Total Savings
        </div>
        <div style={{ fontSize: "14px", fontWeight: "800", color: "#166534" }}>
          {money(totalSavings)}
        </div>
      </div>
    </div>
  );
}
