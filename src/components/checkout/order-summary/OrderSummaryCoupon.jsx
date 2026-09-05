import React from "react";
import { Tag, Check, X, AlertCircle } from "lucide-react";
import { money } from "../../../data";

export function OrderSummaryCoupon({
  isReceipt,
  appliedCoupon,
  couponInput,
  setCouponInput,
  handleManualApply,
  couponError,
  couponDiscount,
  onRemoveCoupon
}) {
  if (isReceipt) {
    if (!appliedCoupon) return null;
    return (
      <div
        style={{
          background: "#f2f8f3",
          border: "1px solid #cbe6d2",
          borderRadius: "10px",
          padding: "10px 12px",
          marginTop: "14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Tag size={15} color="#166534" />
          <div style={{ fontSize: "12.5px", color: "#166534", fontWeight: "700" }}>
            Coupon '{appliedCoupon.code}' applied
          </div>
        </div>
        <div style={{ fontSize: "12.5px", color: "#166534", fontWeight: "700" }}>
          − {money(couponDiscount)}
        </div>
      </div>
    );
  }

  return (
    <div
      id="order-summary-coupon-section"
      style={{
        background: appliedCoupon ? "#f2f8f3" : "#fdfaf5",
        border: appliedCoupon ? "1px solid #cbe6d2" : "1px dashed #dfcfbc",
        borderRadius: "12px",
        padding: "12px 14px",
        marginTop: "14px",
        boxSizing: "border-box",
        transition: "all 0.25s ease"
      }}
    >
      {!appliedCoupon ? (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
            <div
              style={{
                width: "24px",
                height: "24px",
                borderRadius: "6px",
                background: "#f7eee3",
                color: "#8c2b10",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0
              }}
            >
              <Tag size={13} strokeWidth={2} />
            </div>
            <div style={{ lineHeight: "1.25" }}>
              <div style={{ fontSize: "12.5px", fontWeight: "700", color: "#2b170d" }}>
                Have a coupon code?
              </div>
              <div style={{ fontSize: "11px", color: "#8a7566" }}>
                Enter code to get extra discount
              </div>
            </div>
          </div>

          <form onSubmit={handleManualApply} style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
            <input
              id="input-summary-coupon"
              type="text"
              placeholder="Enter coupon code"
              value={couponInput}
              onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
              style={{
                flex: 1,
                background: "#ffffff",
                border: "1px solid #dfcfbc",
                borderRadius: "8px",
                padding: "8px 12px",
                fontSize: "12.5px",
                fontWeight: "600",
                letterSpacing: "0.5px",
                color: "#2b170d",
                textTransform: "uppercase",
                outline: "none",
                transition: "border-color 0.2s"
              }}
            />
            <button
              type="submit"
              id="btn-summary-apply-coupon"
              style={{
                background: "#7c3114",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                padding: "8px 16px",
                fontSize: "12.5px",
                fontWeight: "700",
                cursor: "pointer",
                transition: "background 0.2s ease",
                whiteSpace: "nowrap"
              }}
            >
              Apply
            </button>
          </form>

          {couponError && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                marginTop: "8px",
                fontSize: "11.5px",
                color: "#b91c1c",
                fontWeight: "500"
              }}
            >
              <AlertCircle size={13} />
              <span>{couponError}</span>
            </div>
          )}
        </div>
      ) : (
        (() => {
          const isApplied = appliedCoupon.status === "APPLIED" || appliedCoupon.valid;
          const isExpired = appliedCoupon.status === "EXPIRED";
          const isNotEligible = appliedCoupon.status === "NOT_ELIGIBLE";

          return (
            <div
              id="summary-applied-coupon-card"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "8px",
                background: isApplied ? "#f2f8f3" : (isExpired ? "#fef2f2" : "#fffbeb"),
                padding: "6px 8px",
                borderRadius: "8px"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    background: isApplied ? "#166534" : (isExpired ? "#dc2626" : "#d97706"),
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0
                  }}
                >
                  {isApplied ? <Check size={15} strokeWidth={2.5} /> : <AlertCircle size={15} />}
                </div>
                <div>
                  <div style={{
                    fontSize: "12.5px",
                    fontWeight: "700",
                    color: isApplied ? "#166534" : (isExpired ? "#991b1b" : "#92400e"),
                    display: "flex",
                    alignItems: "center",
                    gap: "5px"
                  }}>
                    <span>Coupon <b>'{appliedCoupon.code}'</b> {isApplied ? "Active" : (isExpired ? "Expired" : "Ineligible")}</span>
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
                  <div style={{ fontSize: "11px", color: isApplied ? "#15803d" : (isExpired ? "#b91c1c" : "#b45309"), marginTop: "1px" }}>
                    {isApplied
                      ? (couponDiscount > 0 ? `You saved ${money(couponDiscount)} with this offer` : "Offer successfully activated")
                      : (appliedCoupon.reason || (isExpired ? "This coupon is expired (Discount: ₹0)" : "Add more items to activate"))}
                  </div>
                </div>
              </div>

              <button
                type="button"
                id="btn-summary-remove-coupon"
                onClick={onRemoveCoupon}
                title="Remove Coupon to choose another"
                style={{
                  background: "#ffffff",
                  border: "1px solid #dfcfbc",
                  color: "#8a7566",
                  borderRadius: "6px",
                  padding: "5px 10px",
                  fontSize: "11.5px",
                  fontWeight: "600",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  transition: "all 0.15s ease",
                  flexShrink: 0
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "#b91c1c";
                  e.currentTarget.style.borderColor = "#fca5a5";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "#8a7566";
                  e.currentTarget.style.borderColor = "#dfcfbc";
                }}
              >
                <X size={13} />
                <span>Remove</span>
              </button>
            </div>
          );
        })()
      )}
    </div>
  );
}
