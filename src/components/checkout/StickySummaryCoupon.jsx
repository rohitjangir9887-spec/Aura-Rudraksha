import React from "react";
import { Tag, X } from "lucide-react";

export function StickySummaryCoupon({
  couponCode,
  setCouponCode,
  appliedCoupon,
  onApplyCoupon,
  onRemoveCoupon,
  couponError,
  availableCoupons
}) {
  return (
    <div style={{ marginBottom: "18px" }}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (onApplyCoupon) onApplyCoupon(couponCode);
        }}
        style={{ display: "flex", gap: "8px" }}
      >
        <div style={{ position: "relative", flex: 1 }}>
          <input
            type="text"
            placeholder="Enter Coupon Code"
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
            disabled={!!appliedCoupon}
            style={{
              width: "100%",
              padding: "9px 12px 9px 30px",
              borderRadius: "8px",
              border: "1px solid #d4c5b9",
              fontSize: "12.5px",
              fontWeight: "600",
              textTransform: "uppercase",
              outline: "none",
              background: appliedCoupon ? "#f5ede4" : "#ffffff"
            }}
          />
          <Tag size={13} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#8c796d" }} />
        </div>

        {appliedCoupon ? (
          <button
            type="button"
            onClick={onRemoveCoupon}
            style={{
              padding: "0 14px",
              borderRadius: "8px",
              background: "#fbebe8",
              border: "1px solid #f2c7bf",
              color: "#b91c1c",
              fontSize: "12px",
              fontWeight: "700",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px"
            }}
          >
            <X size={13} /> Remove
          </button>
        ) : (
          <button
            type="submit"
            disabled={!couponCode || !couponCode.trim()}
            style={{
              padding: "0 16px",
              borderRadius: "8px",
              background: couponCode ? "#b88a58" : "#d9c6b3",
              color: "#ffffff",
              border: "none",
              fontSize: "12px",
              fontWeight: "700",
              cursor: couponCode ? "pointer" : "default"
            }}
          >
            Apply
          </button>
        )}
      </form>

      {couponError && (
        <div style={{ fontSize: "11px", color: "#b91c1c", marginTop: "4px" }}>
          {couponError}
        </div>
      )}

      {/* Quick Suggested Coupon Tags */}
      {!appliedCoupon && (
        <div style={{ display: "flex", gap: "6px", marginTop: "8px", flexWrap: "wrap" }}>
          {availableCoupons.map((c) => (
            <button
              key={c.code}
              type="button"
              onClick={() => {
                setCouponCode(c.code);
                if (onApplyCoupon) onApplyCoupon(c.code);
              }}
              style={{
                background: "#fbf6f0",
                border: "1px dashed #b88a58",
                color: "#99582a",
                padding: "3px 8px",
                borderRadius: "6px",
                fontSize: "10.5px",
                fontWeight: "700",
                cursor: "pointer"
              }}
            >
              Use {c.code}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
