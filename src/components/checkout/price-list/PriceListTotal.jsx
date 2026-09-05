import React from "react";
import { money } from "../../../data";

export function PriceListTotal({ totalSavings, effectiveTotalMrp, isFreeShipping, finalTotal }) {
  return (
    <div
      style={{
        borderTop: "1.5px dashed #dfcfbc",
        marginTop: "12px",
        paddingTop: "12px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}
    >
      <div>
        <div style={{ fontSize: "15px", fontWeight: "800", color: "#2b170d" }}>
          Total Amount (कुल राशि)
        </div>
        <div style={{ fontSize: "11px", color: "#806f62" }}>
          Inclusive of all taxes & certification
        </div>
      </div>

      <div style={{ textAlign: "right" }}>
        {totalSavings > 0 && (
          <del style={{ fontSize: "12.5px", color: "#8a7566", marginRight: "6px" }}>
            {money(effectiveTotalMrp + (isFreeShipping ? 50 : 0))}
          </del>
        )}
        <span style={{ fontSize: "21px", fontWeight: "800", color: "#2b170d" }}>
          {money(finalTotal)}
        </span>
      </div>
    </div>
  );
}
