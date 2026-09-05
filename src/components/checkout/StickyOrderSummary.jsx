import React, { useState } from "react";
import { StickySummaryHeader } from "./StickySummaryHeader";
import { StickySummaryItem } from "./StickySummaryItem";
import { StickySummaryPricing } from "./StickySummaryPricing";
import { StickySummaryCoupon } from "./StickySummaryCoupon";
import { StickySummaryCTA } from "./StickySummaryCTA";
import { StickySummaryReassurance } from "./StickySummaryReassurance";

/**
 * StickyOrderSummary
 * 
 * Sticky desktop order summary card adhering to exact pricing presentation:
 * Subtotal: ₹59,000
 * Product Discount: -₹22,050
 * Shipping: FREE
 * Total Savings: ₹22,050 (in green)
 * Total Amount: ₹36,950
 * 
 * Includes coupon code input with active coupon recommendations,
 * high-res product thumbnail, and the large PayU payment CTA.
 */
export function StickyOrderSummary({
  lines = [],
  products = [],
  totals = {},
  couponCode = "",
  setCouponCode,
  appliedCoupon = null,
  couponDiscount = 0,
  onApplyCoupon,
  onRemoveCoupon,
  couponError = "",
  loading = false,
  onPay
}) {
  // Reference flagship item
  const referenceProduct = {
    name: "Original 14 Mukhi Rudraksha (Nepali) — Lab Certified Chaudah Mukhi Rudraksha",
    img: "/images/product-1mukhi.jpg",
    qty: 1,
    subtotal: 59000,
    discount: 22050,
    total: 36950
  };

  const hasLines = lines && lines.length > 0;
  const firstItem = hasLines ? (products.find(p => String(p.id) === String(lines[0]?.id)) || referenceProduct) : referenceProduct;
  const firstItemImg = firstItem.img || (firstItem.images && firstItem.images[0]) || "/images/product-1mukhi.jpg";
  const firstItemName = firstItem.name || referenceProduct.name;
  const itemCount = hasLines ? lines.reduce((sum, l) => sum + (l.qty || 1), 0) : 1;

  // Calculate pricing numbers
  const subtotal = totals.subtotal ?? 59000;
  const productDiscount = totals.productSavings ?? 22050;
  const shipping = totals.shipping ?? 0;
  const totalSavings = (productDiscount + (couponDiscount || 0));
  const finalTotal = totals.finalTotal ?? Math.max(0, subtotal - productDiscount - (couponDiscount || 0) + shipping);

  const availableCoupons = [
    { code: "AURA10", desc: "10% Extra Off on Sacred Orders" },
    { code: "SHRAWAN200", desc: "Flat ₹200 Sacred Consecration Gift" }
  ];

  return (
    <div
      id="checkout-sticky-summary"
      style={{
        background: "#ffffff",
        border: "1.5px solid #ebd9c8",
        borderRadius: "16px",
        padding: "22px 20px",
        boxShadow: "0 6px 20px rgba(43, 23, 13, 0.05)",
        position: "sticky",
        top: "85px"
      }}
    >
      <StickySummaryHeader itemCount={itemCount} />

      <StickySummaryItem
        firstItemImg={firstItemImg}
        firstItemName={firstItemName}
        itemCount={itemCount}
      />

      <StickySummaryPricing
        subtotal={subtotal}
        productDiscount={productDiscount}
        couponDiscount={couponDiscount}
        appliedCoupon={appliedCoupon}
        totalSavings={totalSavings}
        finalTotal={finalTotal}
      />

      <StickySummaryCoupon
        couponCode={couponCode}
        setCouponCode={setCouponCode}
        appliedCoupon={appliedCoupon}
        onApplyCoupon={onApplyCoupon}
        onRemoveCoupon={onRemoveCoupon}
        couponError={couponError}
        availableCoupons={availableCoupons}
      />

      <StickySummaryCTA
        onPay={onPay}
        loading={loading}
        finalTotal={finalTotal}
      />

      <StickySummaryReassurance />
    </div>
  );
}
