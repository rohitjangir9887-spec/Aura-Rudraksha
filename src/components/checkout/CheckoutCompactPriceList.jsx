import React, { useState } from "react";
import { Receipt, Tag, Sparkles, Check, X, PiggyBank, Truck, ShieldCheck } from "lucide-react";
import { money } from "../../data";

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
      {/* Step Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "12px",
          paddingBottom: "10px",
          borderBottom: "1px solid #f0e6da",
          flexWrap: "wrap",
          gap: "8px"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: "24px",
              height: "24px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #b88a58 0%, #8c5d2e 100%)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "12px",
              fontWeight: "800",
              flexShrink: 0
            }}
          >
            3
          </div>
          <div>
            <h2
              style={{
                fontFamily: '"Cormorant Garamond", serif',
                fontSize: "20px",
                fontWeight: "700",
                margin: 0,
                color: "#2b170d",
                lineHeight: "1.2"
              }}
            >
              Price Details
            </h2>
            <div style={{ fontSize: "11px", color: "#806f62", marginTop: "1px" }}>
              Transparent breakdown with zero hidden charges
            </div>
          </div>
        </div>

        {totalSavings > 0 && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              background: "#eef9f2",
              border: "1px solid #cce8d4",
              color: "#166534",
              padding: "3px 8px",
              borderRadius: "6px",
              fontSize: "11px",
              fontWeight: "700"
            }}
          >
            <Sparkles size={12} />
            <span>You Save {money(totalSavings)}</span>
          </span>
        )}
      </div>

      {/* Price Lines */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          fontSize: "13.5px",
          background: "#faf5ef",
          border: "1px solid #f0e2d3",
          borderRadius: "12px",
          padding: "12px 14px"
        }}
      >
        {/* Total MRP */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#5a483c" }}>
          <span style={{ fontWeight: "500" }}>Total MRP</span>
          <span style={{ fontWeight: "600", color: "#2b170d" }}>{money(effectiveTotalMrp)}</span>
        </div>

        {/* Product Discount */}
        {productSavings > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#15803d", borderTop: "1px dashed #e8dacb", paddingTop: "8px" }}>
            <span style={{ fontWeight: "500", display: "flex", alignItems: "center", gap: "5px" }}>
              <Sparkles size={13} className="text-emerald-600" /> Product Discount
            </span>
            <span style={{ fontWeight: "700" }}>- {money(productSavings)}</span>
          </div>
        )}

        {/* Coupon Discount */}
        {couponDiscount > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#15803d", borderTop: "1px dashed #e8dacb", paddingTop: "8px" }}>
            <span style={{ fontWeight: "500", display: "flex", alignItems: "center", gap: "5px" }}>
              <Tag size={13} className="text-emerald-600" /> Coupon ({appliedCoupon?.code})
            </span>
            <span style={{ fontWeight: "700" }}>- {money(couponDiscount)}</span>
          </div>
        )}

        {/* Shipping Fee */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#5a483c", borderTop: "1px dashed #e8dacb", paddingTop: "8px" }}>
          <span style={{ fontWeight: "500" }}>Delivery Charges</span>
          {isFreeShipping ? (
            <span style={{ color: "#15803d", fontWeight: "700", display: "flex", alignItems: "center", gap: "4px", background: "#eef9f2", padding: "2px 8px", borderRadius: "6px", fontSize: "12px" }}>
              <Truck size={13} /> FREE
            </span>
          ) : (
            <span style={{ fontWeight: "600", color: "#2b170d" }}>{money(shippingFee)}</span>
          )}
        </div>
      </div>

      {/* Compact Coupon Code Section */}
      <div style={{ marginTop: "12px", paddingTop: "10px", borderTop: "1px dashed #f0e6da" }}>
        {appliedCoupon ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "#f2f9f4",
              border: "1px dashed #20a95a",
              borderRadius: "8px",
              padding: "6px 10px"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Tag size={13} color="#166534" />
              <span style={{ fontSize: "12px", fontWeight: "700", color: "#166534" }}>
                '{appliedCoupon.code}' Applied (-{money(couponDiscount)})
              </span>
            </div>
            <button
              type="button"
              onClick={onRemoveCoupon}
              style={{
                background: "none",
                border: "none",
                color: "#dc2626",
                cursor: "pointer",
                fontSize: "11.5px",
                fontWeight: "700",
                padding: "2px 6px"
              }}
            >
              Remove
            </button>
          </div>
        ) : showCouponInput ? (
          <form onSubmit={handleApply} style={{ display: "flex", gap: "6px" }}>
            <input
              type="text"
              placeholder="Enter coupon code (e.g. AURA10)"
              value={couponInput}
              onChange={(e) => setCouponInput(e.target.value)}
              style={{
                flex: 1,
                padding: "7px 10px",
                borderRadius: "8px",
                border: "1px solid #d4c5b9",
                fontSize: "12.5px",
                textTransform: "uppercase"
              }}
            />
            <button
              type="submit"
              style={{
                background: "#b88a58",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                padding: "0 14px",
                fontSize: "12px",
                fontWeight: "700",
                cursor: "pointer"
              }}
            >
              Apply
            </button>
            <button
              type="button"
              onClick={() => setShowCouponInput(false)}
              style={{
                background: "#f0e6da",
                color: "#4a3528",
                border: "none",
                borderRadius: "8px",
                padding: "0 10px",
                fontSize: "12px",
                cursor: "pointer"
              }}
            >
              Cancel
            </button>
          </form>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <button
              type="button"
              onClick={() => setShowCouponInput(true)}
              style={{
                background: "none",
                border: "none",
                color: "#b85d25",
                fontSize: "12px",
                fontWeight: "700",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: 0
              }}
            >
              <Tag size={13} /> Have a Coupon Code? Apply
            </button>

            {availableCoupons && availableCoupons.length > 0 && availableCoupons[0]?.code && (
              <button
                type="button"
                onClick={() => onApplyCoupon && onApplyCoupon(availableCoupons[0].code)}
                style={{
                  background: "#fcf6ed",
                  border: "1px dashed #b88a58",
                  color: "#99582a",
                  padding: "3px 8px",
                  borderRadius: "6px",
                  fontSize: "11px",
                  fontWeight: "700",
                  cursor: "pointer"
                }}
              >
                Apply '{availableCoupons[0].code}'
              </button>
            )}
          </div>
        )}

        {couponError && (
          <div style={{ fontSize: "11px", color: "#dc2626", marginTop: "4px" }}>
            {couponError}
          </div>
        )}
        {couponSuccessMsg && (
          <div style={{ fontSize: "11px", color: "#166534", marginTop: "4px" }}>
            {couponSuccessMsg}
          </div>
        )}
      </div>

      {/* Final Total Amount Section */}
      <div
        style={{
          borderTop: "1.5px dashed #dfcfbc",
          marginTop: "12px",
          paddingTop: "12px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}
      >
        <div>
          <div style={{ fontSize: "15px", fontWeight: "800", color: "#2b170d" }}>
            Total Amount (कुल राशि)
          </div>
          <div style={{ fontSize: "11px", color: "#806f62" }}>
            Inclusive of all taxes & certification
          </div>
        </div>

        <div style={{ textAlign: "right" }}>
          {totalSavings > 0 && (
            <del style={{ fontSize: "12.5px", color: "#8a7566", marginRight: "6px" }}>
              {money(effectiveTotalMrp + (isFreeShipping ? 50 : 0))}
            </del>
          )}
          <span style={{ fontSize: "21px", fontWeight: "800", color: "#2b170d" }}>
            {money(finalTotal)}
          </span>
        </div>
      </div>
    </div>
  );
}
