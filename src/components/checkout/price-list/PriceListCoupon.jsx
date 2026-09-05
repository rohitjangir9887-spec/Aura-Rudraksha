import React from "react";
import { Tag } from "lucide-react";
import { money } from "../../../data";

export function PriceListCoupon({
  appliedCoupon,
  couponDiscount,
  onRemoveCoupon,
  showCouponInput,
  setShowCouponInput,
  handleApply,
  couponInput,
  setCouponInput,
  availableCoupons,
  onApplyCoupon,
  couponError,
  couponSuccessMsg
}) {
  return (
    <div style={{ marginTop: "12px", paddingTop: "10px", borderTop: "1px dashed #f0e6da" }}>
      {appliedCoupon ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#f2f9f4",
            border: "1px dashed #20a95a",
            borderRadius: "8px",
            padding: "6px 10px"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Tag size={13} color="#166534" />
            <span style={{ fontSize: "12px", fontWeight: "700", color: "#166534" }}>
              '{appliedCoupon.code}' Applied (-{money(couponDiscount)})
            </span>
          </div>
          <button
            type="button"
            onClick={onRemoveCoupon}
            style={{
              background: "none",
              border: "none",
              color: "#dc2626",
              cursor: "pointer",
              fontSize: "11.5px",
              fontWeight: "700",
              padding: "2px 6px"
            }}
          >
            Remove
          </button>
        </div>
      ) : showCouponInput ? (
        <form onSubmit={handleApply} style={{ display: "flex", gap: "6px" }}>
          <input
            type="text"
            placeholder="Enter coupon code (e.g. AURA10)"
            value={couponInput}
            onChange={(e) => setCouponInput(e.target.value)}
            style={{
              flex: 1,
              padding: "7px 10px",
              borderRadius: "8px",
              border: "1px solid #d4c5b9",
              fontSize: "12.5px",
              textTransform: "uppercase"
            }}
          />
          <button
            type="submit"
            style={{
              background: "#b88a58",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              padding: "0 14px",
              fontSize: "12px",
              fontWeight: "700",
              cursor: "pointer"
            }}
          >
            Apply
          </button>
          <button
            type="button"
            onClick={() => setShowCouponInput(false)}
            style={{
              background: "#f0e6da",
              color: "#4a3528",
              border: "none",
              borderRadius: "8px",
              padding: "0 10px",
              fontSize: "12px",
              cursor: "pointer"
            }}
          >
            Cancel
          </button>
        </form>
      ) : (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button
            type="button"
            onClick={() => setShowCouponInput(true)}
            style={{
              background: "none",
              border: "none",
              color: "#b85d25",
              fontSize: "12px",
              fontWeight: "700",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              padding: 0
            }}
          >
            <Tag size={13} /> Have a Coupon Code? Apply
          </button>

          {availableCoupons && availableCoupons.length > 0 && availableCoupons[0]?.code && (
            <button
              type="button"
              onClick={() => onApplyCoupon && onApplyCoupon(availableCoupons[0].code)}
              style={{
                background: "#fcf6ed",
                border: "1px dashed #b88a58",
                color: "#99582a",
                padding: "3px 8px",
                borderRadius: "6px",
                fontSize: "11px",
                fontWeight: "700",
                cursor: "pointer"
              }}
            >
              Apply '{availableCoupons[0].code}'
            </button>
          )}
        </div>
      )}

      {couponError && (
        <div style={{ fontSize: "11px", color: "#dc2626", marginTop: "4px" }}>
          {couponError}
        </div>
      )}
      {couponSuccessMsg && (
        <div style={{ fontSize: "11px", color: "#166534", marginTop: "4px" }}>
          {couponSuccessMsg}
        </div>
      )}
    </div>
  );
}
