import React from "react";
import { Check, X, AlertCircle, AlertTriangle } from "lucide-react";
import { money } from "../../../data";

export function AppliedCouponCard({ appliedCoupon, onRemoveCoupon }) {
  const isExpired = appliedCoupon?.status === "EXPIRED";
  const isApplied = appliedCoupon && (appliedCoupon.status === "APPLIED" || appliedCoupon.valid);

  return (
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
  );
}
