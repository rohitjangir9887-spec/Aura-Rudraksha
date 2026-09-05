import React from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { money } from "../../../data";

export function MobileOrderSummary({
  itemCount,
  finalTotal,
  summaryOpen,
  setSummaryOpen,
  subtotal,
  productDiscount,
  couponDiscount,
  appliedCoupon,
  totalSavings,
  couponCode,
  setCouponCode,
  onApplyCoupon,
  onRemoveCoupon
}) {
  return (
    <div
      style={{
        background: "#ffffff",
        border: "1.5px solid #ebd9c8",
        borderRadius: "14px",
        marginBottom: "14px",
        overflow: "hidden",
        boxShadow: "0 2px 8px rgba(43, 23, 13, 0.03)"
      }}
    >
      <div
        onClick={() => setSummaryOpen(!summaryOpen)}
        style={{
          padding: "12px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "#fcf9f5",
          cursor: "pointer"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "13px", fontWeight: "700", color: "#2b170d" }}>
            Order Summary ({itemCount} {itemCount === 1 ? "Item" : "Items"})
          </span>
          <span style={{ fontSize: "13.5px", fontWeight: "800", color: "#99582a" }}>
            {money(finalTotal)}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "#806f62" }}>
          <span>{summaryOpen ? "Hide" : "View"}</span>
          {summaryOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </div>

      {summaryOpen && (
        <div style={{ padding: "14px", borderTop: "1px solid #ebd9c8" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12.5px", color: "#4a3528", marginBottom: "8px" }}>
            <span>Subtotal</span>
            <span>{money(subtotal)}</span>
          </div>
          {productDiscount > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12.5px", color: "#166534", marginBottom: "8px" }}>
              <span>Product Discount</span>
              <span>-{money(productDiscount)}</span>
            </div>
          )}
          {couponDiscount > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12.5px", color: "#166534", marginBottom: "8px" }}>
              <span>Coupon Discount ({appliedCoupon})</span>
              <span>-{money(couponDiscount)}</span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12.5px", color: "#4a3528", marginBottom: "8px" }}>
            <span>Shipping</span>
            <span style={{ color: "#166534", fontWeight: "700" }}>FREE</span>
          </div>
          {totalSavings > 0 && (
            <div style={{ background: "#eef9f2", color: "#166534", padding: "6px 10px", borderRadius: "6px", fontSize: "11.5px", fontWeight: "700", display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <span>Total Savings</span>
              <span>{money(totalSavings)}</span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "15px", fontWeight: "800", color: "#2b170d", paddingTop: "8px", borderTop: "1px solid #ebd9c8" }}>
            <span>Total Payable</span>
            <span>{money(finalTotal)}</span>
          </div>

          {/* Coupon Form in Accordion */}
          <div style={{ marginTop: "12px", paddingTop: "10px", borderTop: "1px dashed #ebd9c8" }}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (onApplyCoupon) onApplyCoupon(couponCode);
              }}
              style={{ display: "flex", gap: "6px" }}
            >
              <input
                type="text"
                placeholder="Coupon Code"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                disabled={!!appliedCoupon}
                style={{ flex: 1, padding: "8px 10px", borderRadius: "6px", border: "1px solid #d4c5b9", fontSize: "12px", textTransform: "uppercase" }}
              />
              {appliedCoupon ? (
                <button type="button" onClick={onRemoveCoupon} style={{ padding: "0 10px", background: "#fbebe8", border: "1px solid #f2c7bf", color: "#b91c1c", borderRadius: "6px", fontSize: "11px", fontWeight: "700" }}>
                  Remove
                </button>
              ) : (
                <button type="submit" disabled={!couponCode} style={{ padding: "0 14px", background: "#b88a58", color: "#fff", border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: "700" }}>
                  Apply
                </button>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
