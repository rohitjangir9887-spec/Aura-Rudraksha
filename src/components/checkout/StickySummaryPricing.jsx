import React from "react";
import { CheckCircle2 } from "lucide-react";
import { money } from "../../data";

export function StickySummaryPricing({
  subtotal,
  productDiscount,
  couponDiscount,
  appliedCoupon,
  totalSavings,
  finalTotal
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px" }}>
      {/* Subtotal */}
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13.5px", color: "#4a3528" }}>
        <span>Subtotal</span>
        <span style={{ fontWeight: "600" }}>{money(subtotal)}</span>
      </div>

      {/* Product Discount */}
      {productDiscount > 0 && (
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13.5px", color: "#166534" }}>
          <span>Product Discount</span>
          <span style={{ fontWeight: "700" }}>-{money(productDiscount)}</span>
        </div>
      )}

      {/* Coupon Discount if applied */}
      {couponDiscount > 0 && (
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13.5px", color: "#166534" }}>
          <span>Coupon Discount ({appliedCoupon})</span>
          <span style={{ fontWeight: "700" }}>-{money(couponDiscount)}</span>
        </div>
      )}

      {/* Shipping */}
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13.5px", color: "#4a3528" }}>
        <span>Shipping</span>
        <span style={{ fontWeight: "700", color: "#166534" }}>FREE</span>
      </div>

      {/* Total Savings Badge Row */}
      {totalSavings > 0 && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "#eef9f2",
            border: "1px solid #cce8d4",
            borderRadius: "8px",
            padding: "8px 12px",
            fontSize: "12.5px",
            color: "#166534",
            fontWeight: "700"
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <CheckCircle2 size={14} /> Total Savings
          </span>
          <span>{money(totalSavings)}</span>
        </div>
      )}

      {/* Final Amount Total Divider */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          paddingTop: "12px",
          marginTop: "4px",
          borderTop: "1.5px solid #ebd9c8"
        }}
      >
        <span style={{ fontSize: "16px", fontWeight: "700", color: "#2b170d" }}>
          Total Amount
        </span>
        <span style={{ fontSize: "24px", fontWeight: "800", color: "#2b170d" }}>
          {money(finalTotal)}
        </span>
      </div>
    </div>
  );
}
