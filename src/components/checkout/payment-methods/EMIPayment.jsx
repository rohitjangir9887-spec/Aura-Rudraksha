import React from "react";
import { money } from "../../../data";

export function EMIPayment({
  finalTotal,
  selectedEmiPlan,
  setSelectedEmiPlan
}) {
  return (
    <div>
      <div style={{ fontSize: "15px", fontWeight: "700", color: "#2b170d", marginBottom: "6px" }}>
        Easy Monthly Installments (EMI)
      </div>
      <div style={{ fontSize: "12px", color: "#6e5d50", marginBottom: "14px" }}>
        Available on eligible Credit and Debit cards via PayU:
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" }}>
        {/* 3 Months Plan */}
        <div
          onClick={() => setSelectedEmiPlan("3m")}
          style={{
            padding: "12px",
            border: selectedEmiPlan === "3m" ? "2px solid #b88a58" : "1px solid #ebd9c8",
            borderRadius: "10px",
            background: selectedEmiPlan === "3m" ? "#fbf6f0" : "#ffffff",
            cursor: "pointer"
          }}
        >
          <div style={{ fontSize: "12px", fontWeight: "700", color: "#99582a" }}>3 Months Plan</div>
          <div style={{ fontSize: "16px", fontWeight: "800", color: "#2b170d", margin: "4px 0" }}>
            {money(Math.round(finalTotal / 3))}/mo
          </div>
          <div style={{ fontSize: "10.5px", color: "#166534", fontWeight: "700" }}>Low Interest</div>
        </div>

        {/* 6 Months Plan */}
        <div
          onClick={() => setSelectedEmiPlan("6m")}
          style={{
            padding: "12px",
            border: selectedEmiPlan === "6m" ? "2px solid #b88a58" : "1px solid #ebd9c8",
            borderRadius: "10px",
            background: selectedEmiPlan === "6m" ? "#fbf6f0" : "#ffffff",
            cursor: "pointer"
          }}
        >
          <div style={{ fontSize: "12px", fontWeight: "700", color: "#99582a" }}>6 Months Plan</div>
          <div style={{ fontSize: "16px", fontWeight: "800", color: "#2b170d", margin: "4px 0" }}>
            {money(Math.round(finalTotal / 6))}/mo
          </div>
          <div style={{ fontSize: "10.5px", color: "#166534", fontWeight: "700" }}>Affordable Plan</div>
        </div>
      </div>

      <div style={{ fontSize: "11px", color: "#806f62", background: "#fcf9f5", padding: "8px 12px", borderRadius: "8px", border: "1px solid #ebd9c8" }}>
        ℹ️ Bank interest rates are automatically configured on the PayU secure hosted screen upon card verification.
      </div>
    </div>
  );
}
