import React from "react";
import { CreditCard } from "lucide-react";

export function OrderSummaryPaymentStrip({ isReceipt, order }) {
  if (!isReceipt || !order) return null;

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
        <span>Payment Mode: <b>{order.paymentMethod || "Online Payment"}</b></span>
      </div>
      <span
        style={{
          background: order.status === "Cancelled" ? "#fee2e2" : "#dcfce7",
          color: order.status === "Cancelled" ? "#991b1b" : "#166534",
          padding: "2px 8px",
          borderRadius: "999px",
          fontSize: "11px",
          fontWeight: "700"
        }}
      >
        {order.status === "Cancelled" ? "Refunded/Void" : "Paid"}
      </span>
    </div>
  );
}
