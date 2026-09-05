import React from "react";
import { Receipt, ShieldCheck } from "lucide-react";

export function OrderSummaryHeader({ isReceipt }) {
  return (
    <div
      id="order-summary-header"
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: "10px",
        paddingBottom: "14px",
        borderBottom: "1px solid #f0e6da"
      }}
    >
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
          <Receipt size={18} color="#8c2b10" strokeWidth={1.8} />
          <h2
            style={{
              fontFamily: '"Cormorant Garamond", serif',
              fontSize: "23px",
              fontWeight: "700",
              color: "#2b170d",
              margin: 0,
              lineHeight: "1.15",
              letterSpacing: "-0.2px"
            }}
          >
            {isReceipt ? "Order & Payment Summary" : "Order Summary"}
          </h2>
        </div>
        <p
          style={{
            fontSize: "12px",
            color: "#7c685b",
            margin: "3px 0 0 0",
            fontWeight: "400"
          }}
        >
          {isReceipt ? "Complete breakdown of your placed order" : "Review your order & savings"}
        </p>
      </div>

      {/* Top Right Trust Badge */}
      <div
        id="order-summary-safe-badge"
        style={{
          background: "#fbf5eb",
          border: "1px solid #eedcc6",
          borderRadius: "999px",
          padding: "4px 10px",
          display: "inline-flex",
          alignItems: "center",
          gap: "5px",
          color: "#4a2810",
          fontSize: "11px",
          fontWeight: "600",
          whiteSpace: "nowrap",
          flexShrink: 0
        }}
      >
        <ShieldCheck size={13} color="#8c2b10" strokeWidth={2} />
        <span>{isReceipt ? "Verified Purchase" : "100% Safe & Protected"}</span>
      </div>
    </div>
  );
}
