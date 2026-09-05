import React from "react";
import { Tag, X, AlertCircle } from "lucide-react";

export function CouponSection({
  couponCode,
  setCouponCode,
  applyCoupon,
  appliedCoupon,
  setAppliedCoupon,
  discountAmount,
  couponError,
  availableCoupons,
}) {
  return (
    <div className="aura-ai-order-section">
      <div className="aura-ai-order-coupon-wrap">
        <div className="aura-ai-order-coupon-input">
          <Tag size={14} className="aura-ai-order-tag" />
          <input
            type="text"
            placeholder="Have a coupon code?"
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
          />
          <button
            type="button"
            onClick={() => applyCoupon(couponCode)}
            className="aura-ai-order-apply-btn"
          >
            {appliedCoupon ? "Update" : "Apply"}
          </button>
        </div>

        {appliedCoupon && (
          <div className="aura-ai-order-applied-chip">
            <span>✓ <b>{appliedCoupon.code}</b> applied (-₹{discountAmount})</span>
            <button type="button" onClick={() => { setAppliedCoupon(null); setCouponCode(""); }}>
              <X size={12} />
            </button>
          </div>
        )}
        {couponError && (
          <div className="aura-ai-order-coupon-err">
            <AlertCircle size={12} /> {couponError}
          </div>
        )}

        {/* Quick coupon suggestions if none applied */}
        {!appliedCoupon && availableCoupons.length > 0 && (
          <div className="aura-ai-order-quick-coupons">
            <span className="aura-ai-order-suggest-label">Suggestions:</span>
            {availableCoupons.slice(0, 2).map((c, ci) => (
              <button
                key={ci}
                type="button"
                onClick={() => applyCoupon(c.code)}
                className="aura-ai-order-coupon-chip"
              >
                {c.code} ({c.type === "percentage" ? `${c.discount}% OFF` : `₹${c.discount} OFF`})
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
