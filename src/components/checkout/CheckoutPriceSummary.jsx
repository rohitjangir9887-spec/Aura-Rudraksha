import React from "react";
import { OrderSummaryCard } from "./OrderSummaryCard";

export function CheckoutPriceSummary({
  totalMrp = 0,
  subtotal = 0,
  productSavings = 0,
  appliedCoupon = null,
  couponDiscount = 0,
  shippingFee = 0,
  finalTotal = 0,
  lines = [],
  products = [],
  cartItemCount = 0,
  availableCoupons = [],
  onApplyCoupon,
  onRemoveCoupon,
  couponError = "",
  couponSuccessMsg = "",
  onCheckout,
  ctaText = "Proceed to Checkout",
  isCheckoutPage = true,
  loading = false
}) {
  return (
    <OrderSummaryCard
      totalMrp={totalMrp}
      subtotal={subtotal}
      productSavings={productSavings}
      appliedCoupon={appliedCoupon}
      couponDiscount={couponDiscount}
      shippingFee={shippingFee}
      finalTotal={finalTotal}
      lines={lines}
      products={products}
      cartItemCount={cartItemCount}
      availableCoupons={availableCoupons}
      onApplyCoupon={onApplyCoupon}
      onRemoveCoupon={onRemoveCoupon}
      couponError={couponError}
      couponSuccessMsg={couponSuccessMsg}
      onCheckout={onCheckout}
      ctaText={ctaText}
      isCheckoutPage={isCheckoutPage}
      loading={loading}
    />
  );
}

