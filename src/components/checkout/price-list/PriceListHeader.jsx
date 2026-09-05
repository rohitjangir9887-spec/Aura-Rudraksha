import React from "react";
import { Sparkles } from "lucide-react";
import { money } from "../../../data";

export function PriceListHeader({ totalSavings }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "12px",
        paddingBottom: "10px",
        borderBottom: "1px solid #f0e6da",
        flexWrap: "wrap",
        gap: "8px"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <div
          style={{
            width: "24px",
            height: "24px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #b88a58 0%, #8c5d2e 100%)",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "12px",
            fontWeight: "800",
            flexShrink: 0
          }}
        >
          3
        </div>
        <div>
          <h2
            style={{
              fontFamily: '"Cormorant Garamond", serif',
              fontSize: "20px",
              fontWeight: "700",
              margin: 0,
              color: "#2b170d",
              lineHeight: "1.2"
            }}
          >
            Price Details
          </h2>
          <div style={{ fontSize: "11px", color: "#806f62", marginTop: "1px" }}>
            Transparent breakdown with zero hidden charges
          </div>
        </div>
      </div>

      {totalSavings > 0 && (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            background: "#eef9f2",
            border: "1px solid #cce8d4",
            color: "#166534",
            padding: "3px 8px",
            borderRadius: "6px",
            fontSize: "11px",
            fontWeight: "700"
          }}
        >
          <Sparkles size={12} />
          <span>You Save {money(totalSavings)}</span>
        </span>
      )}
    </div>
  );
}
