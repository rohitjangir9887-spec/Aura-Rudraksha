import React from "react";
import { Sparkles, Tag, Truck } from "lucide-react";
import { money } from "../../../data";

export function PriceListLines({
  effectiveTotalMrp,
  productSavings,
  couponDiscount,
  appliedCoupon,
  isFreeShipping,
  shippingFee
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        fontSize: "13.5px",
        background: "#faf5ef",
        border: "1px solid #f0e2d3",
        borderRadius: "12px",
        padding: "12px 14px"
      }}
    >
      {/* Total MRP */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#5a483c" }}>
        <span style={{ fontWeight: "500" }}>Total MRP</span>
        <span style={{ fontWeight: "600", color: "#2b170d" }}>{money(effectiveTotalMrp)}</span>
      </div>

      {/* Product Discount */}
      {productSavings > 0 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#15803d", borderTop: "1px dashed #e8dacb", paddingTop: "8px" }}>
          <span style={{ fontWeight: "500", display: "flex", alignItems: "center", gap: "5px" }}>
            <Sparkles size={13} className="text-emerald-600" /> Product Discount
          </span>
          <span style={{ fontWeight: "700" }}>- {money(productSavings)}</span>
        </div>
      )}

      {/* Coupon Discount */}
      {couponDiscount > 0 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#15803d", borderTop: "1px dashed #e8dacb", paddingTop: "8px" }}>
          <span style={{ fontWeight: "500", display: "flex", alignItems: "center", gap: "5px" }}>
            <Tag size={13} className="text-emerald-600" /> Coupon ({appliedCoupon?.code})
          </span>
          <span style={{ fontWeight: "700" }}>- {money(couponDiscount)}</span>
        </div>
      )}

      {/* Shipping Fee */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#5a483c", borderTop: "1px dashed #e8dacb", paddingTop: "8px" }}>
        <span style={{ fontWeight: "500" }}>Delivery Charges</span>
        {isFreeShipping ? (
          <span style={{ color: "#15803d", fontWeight: "700", display: "flex", alignItems: "center", gap: "4px", background: "#eef9f2", padding: "2px 8px", borderRadius: "6px", fontSize: "12px" }}>
            <Truck size={13} /> FREE
          </span>
        ) : (
          <span style={{ fontWeight: "600", color: "#2b170d" }}>{money(shippingFee)}</span>
        )}
      </div>
    </div>
  );
}
