import React, { useState } from "react";
import { Copy } from "lucide-react";

export function OrderSummaryCard({
  orderId,
  amountPaid,
  paymentMethod,
  formattedDate
}) {
  const [copiedId, setCopiedId] = useState(false);

  const handleCopy = () => {
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <div
      style={{
        width: "100%",
        background: "#ffffff",
        border: "1.5px solid #ebd9c8",
        borderRadius: "16px",
        padding: "16px",
        boxShadow: "0 4px 14px rgba(43, 23, 13, 0.04)",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        boxSizing: "border-box"
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "10px", borderBottom: "1px solid #ede3d8" }}>
        <span style={{ fontSize: "13px", fontWeight: "700", color: "#2b170d" }}>
          Order Summary Details
        </span>
        <div
          onClick={handleCopy}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            fontSize: "11px",
            color: "#99582a",
            fontWeight: "700",
            cursor: "pointer",
            background: "#faf5f0",
            padding: "2px 8px",
            borderRadius: "6px"
          }}
        >
          <span>#{orderId}</span>
          <Copy size={11} />
          {copiedId && <span style={{ color: "#16a34a" }}>✓</span>}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", color: "#6e5d50" }}>
          <span>Amount Paid:</span>
          <span style={{ fontWeight: "800", color: "#2b170d", fontSize: "13.5px" }}>
            ₹{amountPaid.toLocaleString("en-IN")}
          </span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", color: "#6e5d50" }}>
          <span>Payment Gateway:</span>
          <span style={{ fontWeight: "700", color: "#166534" }}>
            PayU 256-Bit SSL
          </span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", color: "#6e5d50" }}>
          <span>Payment Method:</span>
          <span style={{ fontWeight: "700", color: "#2b170d" }}>
            {paymentMethod}
          </span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", color: "#6e5d50" }}>
          <span>Date & Time:</span>
          <span style={{ fontWeight: "600", color: "#2b170d" }}>
            {formattedDate}
          </span>
        </div>
      </div>

      {/* Purchased Item Snapshot */}
      <div
        style={{
          paddingTop: "10px",
          borderTop: "1px dashed #ebd9c8",
          display: "flex",
          alignItems: "center",
          gap: "10px"
        }}
      >
        <img
          src="/images/product-1mukhi.jpg"
          alt="14 Mukhi Rudraksha"
          style={{
            width: "44px",
            height: "44px",
            borderRadius: "8px",
            border: "1px solid #dfc7af",
            background: "#faf5f0",
            objectFit: "contain"
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "12px", fontWeight: "700", color: "#2b170d", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            Original 14 Mukhi Rudraksha (Nepali)
          </div>
          <div style={{ fontSize: "10px", color: "#806f62" }}>
            Qty: 1 • Lab Certificate Included
          </div>
        </div>
        <span style={{ fontSize: "12.5px", fontWeight: "800", color: "#2b170d" }}>
          ₹36,950
        </span>
      </div>
    </div>
  );
}
