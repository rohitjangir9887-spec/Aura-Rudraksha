import React from "react";
import { CreditCard } from "lucide-react";

export function OrderSummaryPaymentStrip({ isReceipt, order }) {
  if (!isReceipt || !order) return null;

  const paymentStatus = order.paymentStatus || (order.status === "Cancelled" ? "Cancelled" : "Pending");
  let bgStr = "#fef3c7";
  let textStr = "#92400e";

  if (paymentStatus === "Paid" || paymentStatus === "Success") {
    bgStr = "#dcfce7";
    textStr = "#166534";
  } else if (paymentStatus === "Failed" || paymentStatus === "Bounced" || paymentStatus === "Dropped") {
    bgStr = "#fee2e2";
    textStr = "#991b1b";
  } else if (paymentStatus === "Cancelled" || paymentStatus === "Refunded") {
    bgStr = "#fee2e2";
    textStr = "#991b1b";
  }

  return (
    <div
      style={{
        marginTop: "14px",
        paddingTop: "12px",
        borderTop: "1px solid #f0e6da",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        fontSize: "12.5px"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#4a3528" }}>
        <CreditCard size={15} color="#8c2b10" />
        <span>Payment Mode: <b>{order.paymentMode || order.paymentMethod || "Online Payment"}</b></span>
      </div>
      <span
        style={{
          background: bgStr,
          color: textStr,
          padding: "2px 8px",
          borderRadius: "999px",
          fontSize: "11px",
          fontWeight: "700"
        }}
      >
        {paymentStatus}
      </span>
    </div>
  );
}
