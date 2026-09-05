import React, { useState, useEffect, useMemo, useRef } from "react";
import confetti from "canvas-confetti";
import { PlaceOrderButton } from "./PlaceOrderButton";
import { SecurePaymentGuarantee } from "./SecurePaymentGuarantee";

// Extracted Sub-Components
import { OrderSummaryHeader } from "./order-summary/OrderSummaryHeader";
import { OrderSummaryCelebration } from "./order-summary/OrderSummaryCelebration";
import { OrderSummaryCoupon } from "./order-summary/OrderSummaryCoupon";
import { OrderSummaryOffers } from "./order-summary/OrderSummaryOffers";
import { OrderSummaryPriceDetails } from "./order-summary/OrderSummaryPriceDetails";
import { OrderSummarySavings } from "./order-summary/OrderSummarySavings";
import { OrderSummaryTotal } from "./order-summary/OrderSummaryTotal";
import { OrderSummaryShipping } from "./order-summary/OrderSummaryShipping";
import { OrderSummaryPaymentStrip } from "./order-summary/OrderSummaryPaymentStrip";
import { OrderSummaryTrustFeatures } from "./order-summary/OrderSummaryTrustFeatures";

/**
 * OrderSummaryCard - Premium Luxury Spiritual E-Commerce Order Summary Component
 * Redesigned specifically for Aura Rudraksha with celebratory coupon interactions & receipt view.
 */
export function OrderSummaryCard({
  lines = [],
  products = [],
  cartItemCount = 0,
  subtotal = 0,
  totalMrp = 0,
  productSavings = 0,
  appliedCoupon = null,
  couponDiscount = 0,
  availableCoupons = [],
  onApplyCoupon,
  onRemoveCoupon,
  couponError = "",
  couponSuccessMsg = "",
  shippingFee = 0,
  finalTotal = 0,
  onCheckout,
  ctaText = "Proceed to Checkout",
  isCheckoutPage = false,
  isReceipt = false,
  order = null,
  loading = false,
  className = ""
}) {
  const [couponInput, setCouponInput] = useState("");
  const [showCelebration, setShowCelebration] = useState(false);
  const prevCouponRef = useRef(null);

  // Trigger celebration effect whenever a new coupon is successfully applied
  useEffect(() => {
    if (appliedCoupon && appliedCoupon.code && (!prevCouponRef.current || prevCouponRef.current.code !== appliedCoupon.code)) {
      setShowCelebration(true);
      
      // Fire celebratory confetti bursts
      try {
        confetti({
          particleCount: 60,
          spread: 60,
          origin: { y: 0.65 },
          colors: ['#8c2b10', '#166534', '#eab308', '#d97706', '#f59e0b']
        });
      } catch (err) {
        // Fallback gracefully if canvas-confetti fails
      }

      const timer = setTimeout(() => {
        setShowCelebration(false);
      }, 6000);
      prevCouponRef.current = appliedCoupon;
      return () => clearTimeout(timer);
    } else if (!appliedCoupon) {
      prevCouponRef.current = null;
      setShowCelebration(false);
    }
  }, [appliedCoupon]);

  // Build featured offers from real availableCoupons (server-provided), falling back gracefully
  const featuredOffers = useMemo(() => {
    if (Array.isArray(availableCoupons) && availableCoupons.length > 0) {
      return availableCoupons
        .filter(c => c && c.code && c.status !== "Expired" && c.status !== "Inactive" && c.status !== "Disabled")
        .slice(0, 3)
        .map(c => ({
          code: c.code,
          type: c.type || "fixed",
          discount: Number(c.discount) || 0,
          description: c.description
            || (c.type === "percentage" ? `${c.discount}% OFF on your order` : `Flat ₹${c.discount} OFF`),
          calcSavings: (sub) => c.type === "percentage"
            ? Math.round(sub * (Number(c.discount) / 100))
            : Math.min(Number(c.discount) || 0, sub)
        }));
    }
    return [];
  }, [availableCoupons]);

  const count = cartItemCount || lines.reduce((acc, l) => acc + (l.qty || 1), 0);
  
  // Shipping calculations
  const standardShippingCost = 50;
  const isFreeShipping = shippingFee === 0 && subtotal > 0;
  const shippingSavings = isFreeShipping ? standardShippingCost : 0;

  // Dynamic Total Savings: Product MRP savings + Coupon discount + Shipping discount
  const totalSavings = Math.max(0, (productSavings || 0) + (couponDiscount || 0) + shippingSavings);

  // Original theoretical total before any savings
  const effectiveTotalMrp = totalMrp > subtotal ? totalMrp : subtotal;
  const originalTotal = effectiveTotalMrp + standardShippingCost;

  const handleManualApply = (e) => {
    if (e) e.preventDefault();
    if (onApplyCoupon && couponInput.trim()) {
      onApplyCoupon(couponInput.trim().toUpperCase());
      setCouponInput("");
    }
  };

  const handleSelectOffer = (offerCode) => {
    if (appliedCoupon && appliedCoupon.code === offerCode) {
      return;
    }
    if (onApplyCoupon) {
      onApplyCoupon(offerCode);
    }
  };

  return (
    <div 
      id="aura-order-summary-card"
      className={`aura-order-summary-container ${className}`}
      style={{
        background: "#fffdf9",
        border: "1px solid #ebdccb",
        borderRadius: "16px",
        padding: "20px 18px",
        boxShadow: "0 4px 20px rgba(43, 23, 13, 0.04)",
        color: "#2b170d",
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        width: "100%",
        boxSizing: "border-box",
        position: "relative"
      }}
    >
      <OrderSummaryHeader isReceipt={isReceipt} />

      <OrderSummaryCelebration
        showCelebration={showCelebration}
        appliedCoupon={appliedCoupon}
        couponDiscount={couponDiscount}
        setShowCelebration={setShowCelebration}
      />

      <OrderSummaryCoupon
        isReceipt={isReceipt}
        appliedCoupon={appliedCoupon}
        couponInput={couponInput}
        setCouponInput={setCouponInput}
        handleManualApply={handleManualApply}
        couponError={couponError}
        couponDiscount={couponDiscount}
        onRemoveCoupon={onRemoveCoupon}
      />

      <OrderSummaryOffers
        isReceipt={isReceipt}
        appliedCoupon={appliedCoupon}
        featuredOffers={featuredOffers}
        handleSelectOffer={handleSelectOffer}
        subtotal={subtotal}
      />

      <OrderSummaryPriceDetails
        count={count}
        totalMrp={totalMrp}
        subtotal={subtotal}
        productSavings={productSavings}
        isFreeShipping={isFreeShipping}
        shippingFee={shippingFee}
        appliedCoupon={appliedCoupon}
        couponDiscount={couponDiscount}
      />

      <OrderSummarySavings
        totalSavings={totalSavings}
        isReceipt={isReceipt}
      />

      <OrderSummaryTotal
        isReceipt={isReceipt}
        totalSavings={totalSavings}
        originalTotal={originalTotal}
        finalTotal={finalTotal}
      />

      <OrderSummaryShipping isFreeShipping={isFreeShipping} />

      {!isReceipt && (
        <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
          <PlaceOrderButton
            id="btn-summary-checkout-cta"
            loading={loading}
            disabled={count === 0}
            onClick={onCheckout}
            variant="gold"
            ctaText={ctaText}
            finalTotal={finalTotal}
          />
        </div>
      )}

      {!isReceipt && (
        <SecurePaymentGuarantee style={{ margin: "14px 0 6px 0" }} />
      )}

      <OrderSummaryPaymentStrip isReceipt={isReceipt} order={order} />

      <OrderSummaryTrustFeatures />
    </div>
  );
}
