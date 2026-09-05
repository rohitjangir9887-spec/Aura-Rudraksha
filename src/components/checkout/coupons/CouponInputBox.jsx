import React from "react";
import { AlertCircle, Check } from "lucide-react";

export function CouponInputBox({
  couponInput,
  setCouponInput,
  onApplyCoupon,
  validating,
  couponError,
  couponSuccessMsg
}) {
  return (
    <>
      <div style={{ display: "flex", gap: "8px" }}>
        <div style={{ position: "relative", flex: 1 }}>
          <input
            id="input-coupon-code"
            placeholder="Enter Coupon Code (e.g. AURA10)"
            value={couponInput}
            onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (onApplyCoupon && couponInput.trim()) {
                  onApplyCoupon(couponInput.trim().toUpperCase());
                }
              }
            }}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: "8px",
              border: couponError ? "1.5px solid #dc2626" : "1px solid #d4c5b9",
              background: "#ffffff",
              fontSize: "13px",
              color: "#2b170d",
              fontWeight: "600",
              letterSpacing: "0.5px",
              textTransform: "uppercase",
              outline: "none",
              boxSizing: "border-box"
            }}
          />
        </div>
        <button
          type="button"
          id="btn-apply-coupon"
          disabled={validating || !couponInput.trim()}
          onClick={() => {
            if (onApplyCoupon && couponInput.trim()) {
              onApplyCoupon(couponInput.trim().toUpperCase());
            }
          }}
          style={{
            background: couponInput.trim() ? "#b85d25" : "#d4c5b9",
            color: "#ffffff",
            border: "none",
            borderRadius: "8px",
            padding: "0 16px",
            fontSize: "12.5px",
            fontWeight: "700",
            cursor: couponInput.trim() ? "pointer" : "not-allowed",
            transition: "all 0.2s"
          }}
        >
          {validating ? "Checking..." : "Apply"}
        </button>
      </div>

      {couponError && (
        <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "#dc2626", fontSize: "11px", marginTop: "6px" }}>
          <AlertCircle size={13} /> {couponError}
        </div>
      )}

      {couponSuccessMsg && (
        <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "#166534", fontSize: "11px", marginTop: "6px" }}>
          <Check size={13} /> {couponSuccessMsg}
        </div>
      )}
    </>
  );
}
