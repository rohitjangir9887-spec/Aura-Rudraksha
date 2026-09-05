import React from "react";

export function OrderSummary({ qty, subtotal, mrpSavings, discountAmount, appliedCoupon, finalAmount }) {
  return (
    <div className="aura-ai-order-summary-box">
      <div className="aura-ai-order-summary-row">
        <span>Item Total ({qty} item{qty > 1 ? "s" : ""})</span>
        <span>₹{subtotal.toLocaleString('en-IN')}</span>
      </div>
      {mrpSavings > 0 && (
        <div className="aura-ai-order-summary-row aura-ai-green">
          <span>MRP Savings</span>
          <span>-₹{mrpSavings.toLocaleString('en-IN')}</span>
        </div>
      )}
      {discountAmount > 0 && (
        <div className="aura-ai-order-summary-row aura-ai-green">
          <span>Coupon Discount ({appliedCoupon?.code})</span>
          <span>-₹{discountAmount.toLocaleString('en-IN')}</span>
        </div>
      )}
      <div className="aura-ai-order-summary-row">
        <span>Sacred Packaging & Energization</span>
        <span className="aura-ai-green">FREE</span>
      </div>
      <div className="aura-ai-order-summary-total">
        <span>To Pay</span>
        <strong>₹{finalAmount.toLocaleString('en-IN')}</strong>
      </div>
    </div>
  );
}
