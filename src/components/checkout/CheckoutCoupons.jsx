import React, { useState } from "react";
import { Tag, Check, X, AlertCircle, AlertTriangle, Sparkles } from "lucide-react";
import { money } from "../../data";

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

  const isExpired = appliedCoupon?.status === "EXPIRED";
  const isNotEligible = appliedCoupon?.status === "NOT_ELIGIBLE";
  const isInvalid = appliedCoupon?.status === "INVALID";
  const isApplied = appliedCoupon && (appliedCoupon.status === "APPLIED" || appliedCoupon.valid);

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

      {/* Applied / Expired / Ineligible Coupon Card */}
      {appliedCoupon ? (
        <div 
          id="applied-coupon-card"
          style={{
            background: isApplied ? "#eef6f0" : (isExpired ? "#fef2f2" : "#fffbeb"),
            border: isApplied ? "1.5px solid #20a95a" : (isExpired ? "1.5px solid #ef4444" : "1.5px solid #f59e0b"),
            borderRadius: "10px",
            padding: "12px 14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "10px"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div 
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                background: isApplied ? "#20a95a" : (isExpired ? "#ef4444" : "#f59e0b"),
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0
              }}
            >
              {isApplied ? <Check size={16} /> : (isExpired ? <AlertTriangle size={15} /> : <AlertCircle size={15} />)}
            </div>
            <div>
              <div style={{ 
                fontSize: "13px", 
                fontWeight: "700", 
                color: isApplied ? "#166534" : (isExpired ? "#991b1b" : "#92400e"),
                display: "flex",
                alignItems: "center",
                gap: "6px"
              }}>
                <span>Coupon <b>'{appliedCoupon.code}'</b> {isApplied ? "Applied" : (isExpired ? "Expired" : "Not Eligible")}</span>
                <span style={{ 
                  fontSize: "10px", 
                  background: isApplied ? "#dcfce7" : (isExpired ? "#fee2e2" : "#fef3c7"), 
                  color: isApplied ? "#166534" : (isExpired ? "#991b1b" : "#92400e"), 
                  padding: "1px 6px", 
                  borderRadius: "4px", 
                  fontWeight: "700" 
                }}>
                  {isApplied ? "APPLIED" : (isExpired ? "EXPIRED" : "INELIGIBLE")}
                </span>
              </div>
              <div style={{ fontSize: "11.5px", color: isApplied ? "#15803d" : (isExpired ? "#b91c1c" : "#b45309"), marginTop: "2px" }}>
                {isApplied 
                  ? (appliedCoupon.description || (appliedCoupon.type === "percentage" ? `${appliedCoupon.discount}% Discount` : `Flat ₹${appliedCoupon.discount} Off`)) + (appliedCoupon.discountAmount ? ` • You saved ${money(appliedCoupon.discountAmount)}` : "")
                  : (appliedCoupon.reason || (isExpired ? "This coupon has expired. (Discount: ₹0)" : "Cart does not meet minimum order requirements."))}
              </div>
            </div>
          </div>

          <button
            type="button"
            id="btn-remove-coupon"
            onClick={onRemoveCoupon}
            style={{
              background: "#ffffff",
              border: "1px solid #d4c5b9",
              color: "#dc2626",
              padding: "5px 10px",
              borderRadius: "6px",
              fontSize: "11px",
              fontWeight: "700",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "3px",
              whiteSpace: "nowrap"
            }}
          >
            <X size={12} /> Remove
          </button>
        </div>
      ) : (
        /* Coupon Input Box */
        <div>
          <div style={{ display: "flex", gap: "8px" }}>
            <div style={{ position: "relative", flex: 1 }}>
              <input 
                id="input-coupon-code"
                placeholder="Enter Coupon Code (e.g. AURA10)"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (onApplyCoupon && couponInput.trim()) {
                      onApplyCoupon(couponInput.trim().toUpperCase());
                    }
                  }
                }}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: couponError ? "1.5px solid #dc2626" : "1px solid #d4c5b9",
                  background: "#ffffff",
                  fontSize: "13px",
                  color: "#2b170d",
                  fontWeight: "600",
                  letterSpacing: "0.5px",
                  textTransform: "uppercase",
                  outline: "none",
                  boxSizing: "border-box"
                }}
              />
            </div>
            <button
              type="button"
              id="btn-apply-coupon"
              disabled={validating || !couponInput.trim()}
              onClick={() => {
                if (onApplyCoupon && couponInput.trim()) {
                  onApplyCoupon(couponInput.trim().toUpperCase());
                }
              }}
              style={{
                background: couponInput.trim() ? "#b85d25" : "#d4c5b9",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                padding: "0 16px",
                fontSize: "12.5px",
                fontWeight: "700",
                cursor: couponInput.trim() ? "pointer" : "not-allowed",
                transition: "all 0.2s"
              }}
            >
              {validating ? "Checking..." : "Apply"}
            </button>
          </div>

          {couponError && (
            <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "#dc2626", fontSize: "11px", marginTop: "6px" }}>
              <AlertCircle size={13} /> {couponError}
            </div>
          )}

          {couponSuccessMsg && (
            <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "#166534", fontSize: "11px", marginTop: "6px" }}>
              <Check size={13} /> {couponSuccessMsg}
            </div>
          )}

          {/* Available Offers List */}
          {(showOffersList || availableCoupons.length <= 2) && availableCoupons.length > 0 && (
            <div style={{ marginTop: "12px", paddingTop: "10px", borderTop: "1px dashed #e8dac9" }}>
              <div style={{ fontSize: "11.5px", fontWeight: "700", color: "#4a3528", marginBottom: "8px" }}>
                Available Store Coupons:
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {availableCoupons.map((c) => {
                  const minOrder = Number(c.minAmount || c.minOrder || 0);
                  const isApplicable = subtotal >= minOrder;
                  const shortfall = minOrder - subtotal;

                  return (
                    <div 
                      key={c.id || c.code}
                      id={`offer-card-${c.code}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "8px 10px",
                        background: "#fdfbf7",
                        borderRadius: "8px",
                        border: "1px solid #f0e6da"
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ fontSize: "12px", fontWeight: "800", color: "#b85d25", letterSpacing: "0.5px" }}>
                            {c.code}
                          </span>
                          <span style={{ fontSize: "11px", color: "#166534", fontWeight: "600" }}>
                            {c.type === "percentage" ? `${c.discount}% OFF` : `Flat ₹${c.discount} OFF`}
                          </span>
                        </div>
                        {minOrder > 0 && (
                          <div style={{ fontSize: "10px", color: isApplicable ? "#806f62" : "#b85d25", marginTop: "1px" }}>
                            {isApplicable 
                              ? `On orders above ${money(minOrder)}` 
                              : `Add ${money(shortfall)} more to use this code`}
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        id={`btn-apply-list-${c.code}`}
                        onClick={() => {
                          setCouponInput(c.code);
                          if (onApplyCoupon) onApplyCoupon(c.code);
                        }}
                        style={{
                          background: isApplicable ? "#f7eee3" : "#f0e6da",
                          border: isApplicable ? "1px solid #b85d25" : "1px solid #d4c5b9",
                          color: isApplicable ? "#b85d25" : "#806f62",
                          padding: "4px 10px",
                          borderRadius: "6px",
                          fontSize: "11px",
                          fontWeight: "700",
                          cursor: "pointer"
                        }}
                      >
                        Apply
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
