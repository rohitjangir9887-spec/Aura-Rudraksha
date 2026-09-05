import React from "react";
import { money } from "../../../data";

export function OrderSummaryTotal({
  isReceipt,
  totalSavings,
  originalTotal,
  finalTotal
}) {
  return (
    <div
      id="order-summary-total-section"
      style={{
        borderTop: "1px dashed #dfcfbc",
        marginTop: "14px",
        paddingTop: "12px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}
    >
      <div>
        <div style={{ fontSize: "15px", fontWeight: "700", color: "#2b170d", lineHeight: "1.2" }}>
          {isReceipt ? "Paid Amount" : "Total Amount"}
        </div>
        <div style={{ fontSize: "11px", color: "#8a7566", marginTop: "1px" }}>
          Inclusive of all taxes
        </div>
      </div>

      <div style={{ textAlign: "right", display: "flex", alignItems: "baseline", gap: "6px" }}>
        {totalSavings > 0 && originalTotal > finalTotal && (
          <span
            style={{
              fontSize: "13px",
              color: "#8a7566",
              textDecoration: "line-through"
            }}
          >
            {money(originalTotal)}
          </span>
        )}
        <span
          id="order-summary-final-price"
          style={{
            fontSize: "22px",
            fontWeight: "800",
            color: "#2b170d",
            letterSpacing: "-0.3px"
          }}
        >
          {money(finalTotal)}
        </span>
      </div>
    </div>
  );
}
