import React from "react";
import { money } from "../../../data";

export function AvailableOffersList({
  availableCoupons,
  subtotal,
  setCouponInput,
  onApplyCoupon
}) {
  return (
    <div style={{ marginTop: "12px", paddingTop: "10px", borderTop: "1px dashed #e8dac9" }}>
      <div style={{ fontSize: "11.5px", fontWeight: "700", color: "#4a3528", marginBottom: "8px" }}>
        Available Store Coupons:
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {availableCoupons.map((c) => {
          const minOrder = Number(c.minAmount || c.minOrder || 0);
          const isApplicable = subtotal >= minOrder;
          const shortfall = minOrder - subtotal;

          return (
            <div
              key={c.id || c.code}
              id={`offer-card-${c.code}`}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 10px",
                background: "#fdfbf7",
                borderRadius: "8px",
                border: "1px solid #f0e6da"
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontSize: "12px", fontWeight: "800", color: "#b85d25", letterSpacing: "0.5px" }}>
                    {c.code}
                  </span>
                  <span style={{ fontSize: "11px", color: "#166534", fontWeight: "600" }}>
                    {c.type === "percentage" ? `${c.discount}% OFF` : `Flat ₹${c.discount} OFF`}
                  </span>
                </div>
                {minOrder > 0 && (
                  <div style={{ fontSize: "10px", color: isApplicable ? "#806f62" : "#b85d25", marginTop: "1px" }}>
                    {isApplicable
                      ? `On orders above ${money(minOrder)}`
                      : `Add ${money(shortfall)} more to use this code`}
                  </div>
                )}
              </div>

              <button
                type="button"
                id={`btn-apply-list-${c.code}`}
                onClick={() => {
                  setCouponInput(c.code);
                  if (onApplyCoupon) onApplyCoupon(c.code);
                }}
                style={{
                  background: isApplicable ? "#f7eee3" : "#f0e6da",
                  border: isApplicable ? "1px solid #b85d25" : "1px solid #d4c5b9",
                  color: isApplicable ? "#b85d25" : "#806f62",
                  padding: "4px 10px",
                  borderRadius: "6px",
                  fontSize: "11px",
                  fontWeight: "700",
                  cursor: "pointer"
                }}
              >
                Apply
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
