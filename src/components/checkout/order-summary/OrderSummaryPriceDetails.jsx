import React from "react";
import { ShoppingBag, Truck, Tag } from "lucide-react";
import { money } from "../../../data";

export function OrderSummaryPriceDetails({
  count,
  totalMrp,
  subtotal,
  productSavings,
  isFreeShipping,
  shippingFee,
  appliedCoupon,
  couponDiscount
}) {
  return (
    <div id="order-summary-price-details" style={{ marginTop: "16px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          fontSize: "13px",
          fontWeight: "700",
          color: "#2b170d",
          marginBottom: "10px",
          paddingBottom: "6px",
          borderBottom: "1px solid #f0e6da"
        }}
      >
        <ShoppingBag size={14} color="#8c2b10" strokeWidth={2} />
        <span>Price Details</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "12.5px" }}>
        {/* Subtotal Row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "#4a3528" }}>
            Subtotal {count > 0 ? `(${count} item${count !== 1 ? "s" : ""})` : ""}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            {totalMrp > subtotal && (
              <span
                style={{
                  fontSize: "11.5px",
                  color: "#8a7566",
                  textDecoration: "line-through"
                }}
              >
                {money(totalMrp)}
              </span>
            )}
            <span style={{ fontSize: "13.5px", fontWeight: "700", color: "#2b170d" }}>
              {money(subtotal)}
            </span>
          </div>
        </div>

        {/* Product Savings / Discount (if any) */}
        {productSavings > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "#166534", display: "inline-flex", alignItems: "center", gap: "5px" }}>
              <span>Product MRP Discount</span>
            </span>
            <span style={{ color: "#166534", fontWeight: "700", fontSize: "12.5px" }}>
              − {money(productSavings)}
            </span>
          </div>
        )}

        {/* Shipping Charges Row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "#4a3528", display: "inline-flex", alignItems: "center", gap: "5px" }}>
            <Truck size={13} color="#8c2b10" />
            <span>Shipping Charges</span>
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            {isFreeShipping ? (
              <>
                <span
                  style={{
                    fontSize: "11.5px",
                    color: "#8a7566",
                    textDecoration: "line-through"
                  }}
                >
                  ₹50
                </span>
                <span style={{ color: "#166534", fontWeight: "700", fontSize: "12.5px" }}>
                  FREE
                </span>
              </>
            ) : (
              <span style={{ color: "#4a3528", fontWeight: "600" }}>
                {money(shippingFee || 50)}
              </span>
            )}
          </div>
        </div>

        {/* Discount (Coupon) Row */}
        {appliedCoupon && couponDiscount > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "#166534", display: "inline-flex", alignItems: "center", gap: "5px", fontWeight: "600" }}>
              <Tag size={13} color="#166534" />
              <span>Coupon Discount ({appliedCoupon.code})</span>
            </span>
            <span style={{ color: "#166534", fontWeight: "700", fontSize: "13px" }}>
              − {money(couponDiscount)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
