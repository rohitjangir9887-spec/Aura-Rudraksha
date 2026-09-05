import React, { useState } from "react";
import { Tag, Sparkles } from "lucide-react";
import { AppliedCouponCard, CouponInputBox, AvailableOffersList } from "./coupons";

export function CheckoutCoupons({
  couponInput,
  setCouponInput,
  appliedCoupon,
  couponError,
  couponSuccessMsg,
  availableCoupons = [],
  subtotal = 0,
  onApplyCoupon,
  onRemoveCoupon,
  validating = false
}) {
  const [showOffersList, setShowOffersList] = useState(false);

  return (
    <div 
      id="checkout-coupons-section"
      style={{
        background: "#fffdf9",
        border: "1px solid #e8dac9",
        borderRadius: "14px",
        padding: "16px",
        marginBottom: "16px",
        boxShadow: "0 2px 10px rgba(43, 23, 13, 0.03)"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div 
            style={{
              width: "24px",
              height: "24px",
              borderRadius: "6px",
              background: "#f7eee3",
              color: "#b85d25",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <Tag size={14} />
          </div>
          <h3 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: "18px", fontWeight: "700", margin: 0, color: "#2b170d" }}>
            Offers & Coupons
          </h3>
        </div>

        {availableCoupons.length > 0 && !appliedCoupon && (
          <button
            type="button"
            onClick={() => setShowOffersList(prev => !prev)}
            style={{
              background: "none",
              border: "none",
              color: "#b85d25",
              fontSize: "11.5px",
              fontWeight: "600",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px"
            }}
          >
            <Sparkles size={12} /> {showOffersList ? "Hide Offers" : `View Offers (${availableCoupons.length})`}
          </button>
        )}
      </div>

      {appliedCoupon ? (
        <AppliedCouponCard
          appliedCoupon={appliedCoupon}
          onRemoveCoupon={onRemoveCoupon}
        />
      ) : (
        <div>
          <CouponInputBox
            couponInput={couponInput}
            setCouponInput={setCouponInput}
            onApplyCoupon={onApplyCoupon}
            validating={validating}
            couponError={couponError}
            couponSuccessMsg={couponSuccessMsg}
          />

          {(showOffersList || availableCoupons.length <= 2) && availableCoupons.length > 0 && (
            <AvailableOffersList
              availableCoupons={availableCoupons}
              subtotal={subtotal}
              setCouponInput={setCouponInput}
              onApplyCoupon={onApplyCoupon}
            />
          )}
        </div>
      )}
    </div>
  );
}
