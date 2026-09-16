import React from "react";

export function OrderSummary({ 
  qty = 1, 
  subtotal = 0, 
  mrpSavings = 0, 
  discountAmount = 0, 
  appliedCoupon = null, 
  finalAmount = 0 
}) {
  const safeQty = Math.max(1, Number(qty) || 1);
  const safeSubtotal = Math.max(0, Number(subtotal) || 0);
  const safeMrpSavings = Math.max(0, Number(mrpSavings) || 0);
  const safeDiscount = Math.max(0, Number(discountAmount) || 0);
  const safeFinal = Math.max(0, Number(finalAmount) || 0);

  return (
    <div className="aura-ai-order-summary-box">
      <div className="aura-ai-order-summary-row">
        <span>Item Total ({safeQty} item{safeQty > 1 ? "s" : ""})</span>
        <span>₹{safeSubtotal.toLocaleString('en-IN')}</span>
      </div>
      {safeMrpSavings > 0 && (
        <div className="aura-ai-order-summary-row aura-ai-green">
          <span>MRP Savings</span>
          <span>-₹{safeMrpSavings.toLocaleString('en-IN')}</span>
        </div>
      )}
      {safeDiscount > 0 && (
        <div className="aura-ai-order-summary-row aura-ai-green">
          <span>Coupon Discount ({appliedCoupon?.code || "PROMO"})</span>
          <span>-₹{safeDiscount.toLocaleString('en-IN')}</span>
        </div>
      )}
      <div className="aura-ai-order-summary-row">
        <span>Sacred Packaging & Energization</span>
        <span className="aura-ai-green">FREE</span>
      </div>
      <div className="aura-ai-order-summary-total">
        <span>To Pay</span>
        <strong>₹{safeFinal.toLocaleString('en-IN')}</strong>
      </div>
    </div>
  );
}
