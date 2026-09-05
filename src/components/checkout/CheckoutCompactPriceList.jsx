import React, { useState } from "react";
import { PriceListHeader } from "./price-list/PriceListHeader";
import { PriceListLines } from "./price-list/PriceListLines";
import { PriceListCoupon } from "./price-list/PriceListCoupon";
import { PriceListTotal } from "./price-list/PriceListTotal";

export function CheckoutCompactPriceList({
  totalMrp = 0,
  subtotal = 0,
  productSavings = 0,
  appliedCoupon = null,
  couponDiscount = 0,
  shippingFee = 0,
  finalTotal = 0,
  availableCoupons = [],
  onApplyCoupon,
  onRemoveCoupon,
  couponError = "",
  couponSuccessMsg = ""
}) {
  const [couponInput, setCouponInput] = useState("");
  const [showCouponInput, setShowCouponInput] = useState(false);

  const effectiveTotalMrp = totalMrp > subtotal ? totalMrp : subtotal;
  const isFreeShipping = shippingFee === 0 && subtotal > 0;
  const totalSavings = Math.max(0, (productSavings || 0) + (couponDiscount || 0) + (isFreeShipping ? 50 : 0));

  const handleApply = (e) => {
    if (e) e.preventDefault();
    if (couponInput.trim() && onApplyCoupon) {
      onApplyCoupon(couponInput.trim().toUpperCase());
      setCouponInput("");
    }
  };

  return (
    <div
      id="checkout-compact-price-list"
      style={{
        background: "#ffffff",
        border: "1.5px solid #ebd9c8",
        borderRadius: "16px",
        padding: "18px 16px",
        marginBottom: "16px",
        boxShadow: "0 4px 16px rgba(43, 23, 13, 0.04)",
        boxSizing: "border-box",
        width: "100%",
        maxWidth: "100%"
      }}
    >
      <PriceListHeader totalSavings={totalSavings} />

      <PriceListLines
        effectiveTotalMrp={effectiveTotalMrp}
        productSavings={productSavings}
        couponDiscount={couponDiscount}
        appliedCoupon={appliedCoupon}
        isFreeShipping={isFreeShipping}
        shippingFee={shippingFee}
      />

      <PriceListCoupon
        appliedCoupon={appliedCoupon}
        couponDiscount={couponDiscount}
        onRemoveCoupon={onRemoveCoupon}
        showCouponInput={showCouponInput}
        setShowCouponInput={setShowCouponInput}
        handleApply={handleApply}
        couponInput={couponInput}
        setCouponInput={setCouponInput}
        availableCoupons={availableCoupons}
        onApplyCoupon={onApplyCoupon}
        couponError={couponError}
        couponSuccessMsg={couponSuccessMsg}
      />

      <PriceListTotal
        totalSavings={totalSavings}
        effectiveTotalMrp={effectiveTotalMrp}
        isFreeShipping={isFreeShipping}
        finalTotal={finalTotal}
      />
    </div>
  );
}
