import React, { useState } from "react";
import { PaymentGuaranteeCard } from "./PaymentGuaranteeCard";
import { CheckoutAddressCard } from "./CheckoutAddressCard";
import { MobileHeader } from "./mobile/MobileHeader";
import { MobileTrustTicker } from "./mobile/MobileTrustTicker";
import { MobileStepper } from "./mobile/MobileStepper";
import { MobileOrderSummary } from "./mobile/MobileOrderSummary";
import { MobileProductReview } from "./mobile/MobileProductReview";
import { MobilePaymentMethods } from "./mobile/MobilePaymentMethods";
import { MobileStickyPaymentBar } from "./mobile/MobileStickyPaymentBar";

/**
 * MobileCheckoutView
 * 
 * True mobile-first checkout UI designed for iPhone/Android screens:
 * - Compact Header with Rudraksha emblem & Cart icon
 * - Mobile progress steps
 * - Shipping address card
 * - Product review card
 * - Collapsible Order Summary accordion
 * - Payment method accordion (UPI first & expanded, Cards, Net Banking, Wallets)
 * - PayU security information & Payment Guarantee card
 * - Sticky bottom payment bar
 */
export function MobileCheckoutView({
  lines = [],
  products = [],
  formData,
  onInputChange,
  savedAddress,
  usingSavedAddress,
  onUseSavedAddress,
  onUseDifferentAddress,
  onEditAddress,
  saveAddressCheck,
  onToggleSaveAddressCheck,
  totals = {},
  couponCode = "",
  setCouponCode,
  appliedCoupon = null,
  couponDiscount = 0,
  onApplyCoupon,
  onRemoveCoupon,
  couponError = "",
  loading = false,
  onPay,
  onUpdateQty
}) {
  // Accordion state
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [activePaymentAccordion, setActivePaymentAccordion] = useState("upi");
  const [selectedUpiApp, setSelectedUpiApp] = useState("gpay");

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

  // Calculate pricing
  const subtotal = totals.subtotal ?? 59000;
  const productDiscount = totals.productSavings ?? 22050;
  const shipping = totals.shipping ?? 0;
  const totalSavings = (productDiscount + (couponDiscount || 0));
  const finalTotal = totals.finalTotal ?? Math.max(0, subtotal - productDiscount - (couponDiscount || 0) + shipping);

  return (
    <div 
      id="mobile-checkout-root"
      style={{
        width: "100%",
        maxWidth: "480px",
        margin: "0 auto",
        background: "#fcfaf7",
        minHeight: "100vh",
        paddingBottom: "110px",
        position: "relative",
        boxSizing: "border-box"
      }}
    >
      {/* 1. Mobile Compact Header */}
      <MobileHeader itemCount={itemCount} />

      {/* 2. Top Trust Ticker */}
      <MobileTrustTicker />

      <div style={{ padding: "14px 14px 0" }}>
        {/* 3. Mobile Stepper */}
        <MobileStepper />

        {/* 4. Order Summary Accordion */}
        <MobileOrderSummary
          itemCount={itemCount}
          finalTotal={finalTotal}
          summaryOpen={summaryOpen}
          setSummaryOpen={setSummaryOpen}
          subtotal={subtotal}
          productDiscount={productDiscount}
          couponDiscount={couponDiscount}
          appliedCoupon={appliedCoupon}
          totalSavings={totalSavings}
          couponCode={couponCode}
          setCouponCode={setCouponCode}
          onApplyCoupon={onApplyCoupon}
          onRemoveCoupon={onRemoveCoupon}
        />

        {/* 5. Shipping Address Card (Mobile Edition) */}
        <CheckoutAddressCard
          formData={formData}
          onInputChange={onInputChange}
          savedAddress={savedAddress}
          usingSavedAddress={usingSavedAddress}
          onUseSavedAddress={onUseSavedAddress}
          onUseDifferentAddress={onUseDifferentAddress}
          onEditAddress={onEditAddress}
          saveAddressCheck={saveAddressCheck}
          onToggleSaveAddressCheck={onToggleSaveAddressCheck}
        />

        {/* 6. Product Review Card (Mobile Edition) */}
        <MobileProductReview
          firstItemImg={firstItemImg}
          firstItemName={firstItemName}
        />

        {/* 7. Payment Method Accordion (UPI first, Cards, Net Banking, Wallets) */}
        <MobilePaymentMethods
          activePaymentAccordion={activePaymentAccordion}
          setActivePaymentAccordion={setActivePaymentAccordion}
          selectedUpiApp={selectedUpiApp}
          setSelectedUpiApp={setSelectedUpiApp}
        />

        {/* 8. PayU Payment Guarantee Card */}
        <PaymentGuaranteeCard />
      </div>

      {/* 9. Sticky Bottom Payment Bar (Mobile Only) */}
      <MobileStickyPaymentBar
        finalTotal={finalTotal}
        onPay={onPay}
        loading={loading}
      />
    </div>
  );
}
