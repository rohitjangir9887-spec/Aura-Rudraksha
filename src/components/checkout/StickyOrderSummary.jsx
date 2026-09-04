import React, { useState } from "react";
import { 
  ShieldCheck, 
  Lock, 
  Tag, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  Truck, 
  Loader2,
  X
} from "lucide-react";
import { money } from "../../data";

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
      {/* Summary Header */}
      <div 
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "16px",
          paddingBottom: "12px",
          borderBottom: "1px solid #f0e6da"
        }}
      >
        <h3 
          style={{ 
            fontFamily: '"Cormorant Garamond", serif', 
            fontSize: "22px", 
            fontWeight: "700", 
            margin: 0, 
            color: "#2b170d" 
          }}
        >
          Order Summary
        </h3>
        <span 
          style={{
            fontSize: "11.5px",
            fontWeight: "700",
            color: "#99582a",
            background: "#fbf3eb",
            padding: "2px 8px",
            borderRadius: "4px",
            border: "1px solid #ebd9c8"
          }}
        >
          {itemCount} {itemCount === 1 ? "Sacred Item" : "Sacred Items"}
        </span>
      </div>

      {/* Featured Item Thumbnail & Brief Name */}
      <div 
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "10px",
          background: "#fdfaf6",
          borderRadius: "10px",
          border: "1px solid #ebd9c8",
          marginBottom: "18px"
        }}
      >
        <img 
          src={firstItemImg}
          alt={firstItemName}
          style={{
            width: "52px",
            height: "52px",
            objectFit: "cover",
            borderRadius: "8px",
            border: "1px solid #dfc7af",
            background: "#fff"
          }}
          onError={(e) => { e.target.src = "/images/product-1mukhi.jpg"; }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div 
            style={{
              fontSize: "12.5px",
              fontWeight: "700",
              color: "#2b170d",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis"
            }}
          >
            {firstItemName}
          </div>
          <div style={{ fontSize: "11px", color: "#806f62", marginTop: "2px" }}>
            Quantity: <b>{itemCount}</b> • Govt Lab Certified
          </div>
        </div>
      </div>

      {/* Pricing Breakdown */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px" }}>
        {/* Subtotal */}
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13.5px", color: "#4a3528" }}>
          <span>Subtotal</span>
          <span style={{ fontWeight: "600" }}>{money(subtotal)}</span>
        </div>

        {/* Product Discount */}
        {productDiscount > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13.5px", color: "#166534" }}>
            <span>Product Discount</span>
            <span style={{ fontWeight: "700" }}>-{money(productDiscount)}</span>
          </div>
        )}

        {/* Coupon Discount if applied */}
        {couponDiscount > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13.5px", color: "#166534" }}>
            <span>Coupon Discount ({appliedCoupon})</span>
            <span style={{ fontWeight: "700" }}>-{money(couponDiscount)}</span>
          </div>
        )}

        {/* Shipping */}
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13.5px", color: "#4a3528" }}>
          <span>Shipping</span>
          <span style={{ fontWeight: "700", color: "#166534" }}>FREE</span>
        </div>

        {/* Total Savings Badge Row */}
        {totalSavings > 0 && (
          <div 
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "#eef9f2",
              border: "1px solid #cce8d4",
              borderRadius: "8px",
              padding: "8px 12px",
              fontSize: "12.5px",
              color: "#166534",
              fontWeight: "700"
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <CheckCircle2 size={14} /> Total Savings
            </span>
            <span>{money(totalSavings)}</span>
          </div>
        )}

        {/* Final Amount Total Divider */}
        <div 
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            paddingTop: "12px",
            marginTop: "4px",
            borderTop: "1.5px solid #ebd9c8"
          }}
        >
          <span style={{ fontSize: "16px", fontWeight: "700", color: "#2b170d" }}>
            Total Amount
          </span>
          <span style={{ fontSize: "24px", fontWeight: "800", color: "#2b170d" }}>
            {money(finalTotal)}
          </span>
        </div>
      </div>

      {/* Coupon Code Section */}
      <div style={{ marginBottom: "18px" }}>
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            if (onApplyCoupon) onApplyCoupon(couponCode);
          }}
          style={{ display: "flex", gap: "8px" }}
        >
          <div style={{ position: "relative", flex: 1 }}>
            <input 
              type="text"
              placeholder="Enter Coupon Code"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              disabled={!!appliedCoupon}
              style={{
                width: "100%",
                padding: "9px 12px 9px 30px",
                borderRadius: "8px",
                border: "1px solid #d4c5b9",
                fontSize: "12.5px",
                fontWeight: "600",
                textTransform: "uppercase",
                outline: "none",
                background: appliedCoupon ? "#f5ede4" : "#ffffff"
              }}
            />
            <Tag size={13} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#8c796d" }} />
          </div>

          {appliedCoupon ? (
            <button
              type="button"
              onClick={onRemoveCoupon}
              style={{
                padding: "0 14px",
                borderRadius: "8px",
                background: "#fbebe8",
                border: "1px solid #f2c7bf",
                color: "#b91c1c",
                fontSize: "12px",
                fontWeight: "700",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px"
              }}
            >
              <X size={13} /> Remove
            </button>
          ) : (
            <button
              type="submit"
              disabled={!couponCode || !couponCode.trim()}
              style={{
                padding: "0 16px",
                borderRadius: "8px",
                background: couponCode ? "#b88a58" : "#d9c6b3",
                color: "#ffffff",
                border: "none",
                fontSize: "12px",
                fontWeight: "700",
                cursor: couponCode ? "pointer" : "default"
              }}
            >
              Apply
            </button>
          )}
        </form>

        {couponError && (
          <div style={{ fontSize: "11px", color: "#b91c1c", marginTop: "4px" }}>
            {couponError}
          </div>
        )}

        {/* Quick Suggested Coupon Tags */}
        {!appliedCoupon && (
          <div style={{ display: "flex", gap: "6px", marginTop: "8px", flexWrap: "wrap" }}>
            {availableCoupons.map((c) => (
              <button
                key={c.code}
                type="button"
                onClick={() => {
                  setCouponCode(c.code);
                  if (onApplyCoupon) onApplyCoupon(c.code);
                }}
                style={{
                  background: "#fbf6f0",
                  border: "1px dashed #b88a58",
                  color: "#99582a",
                  padding: "3px 8px",
                  borderRadius: "6px",
                  fontSize: "10.5px",
                  fontWeight: "700",
                  cursor: "pointer"
                }}
              >
                Use {c.code}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Large Premium Payment CTA */}
      <button
        type="button"
        id="btn-sticky-pay-securely"
        onClick={onPay}
        disabled={loading}
        style={{
          width: "100%",
          background: loading 
            ? "#a07343" 
            : "linear-gradient(135deg, #b88a58 0%, #8c5d2e 100%)",
          color: "#ffffff",
          border: "none",
          borderRadius: "12px",
          padding: "15px 20px",
          fontSize: "16px",
          fontWeight: "700",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          cursor: loading ? "wait" : "pointer",
          boxShadow: "0 4px 16px rgba(184, 138, 88, 0.4)",
          transition: "transform 0.15s ease, box-shadow 0.15s ease"
        }}
      >
        {loading ? (
          <>
            <Loader2 size={18} className="spin" />
            <span>Connecting to PayU...</span>
          </>
        ) : (
          <>
            <Lock size={17} />
            <span>Pay {money(finalTotal)} Securely →</span>
          </>
        )}
      </button>

      {/* Subtext: Securely processed through PayU */}
      <div 
        style={{
          textAlign: "center",
          marginTop: "8px",
          fontSize: "11.5px",
          color: "#6e5d50"
        }}
      >
        Securely processed through <b>PayU</b>
      </div>

      {/* Reassurance Micro-list */}
      <div 
        style={{
          marginTop: "16px",
          paddingTop: "14px",
          borderTop: "1px solid #f0e6da",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          fontSize: "11px",
          color: "#6e5d50"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <Truck size={13} color="#99582a" />
          <span>Free Insured Express Transit Across India</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <ShieldCheck size={13} color="#16a34a" />
          <span>Govt Recognized Lab Test Certificate Included</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <Sparkles size={13} color="#b88a58" />
          <span>Vedic Mantra Puja & Ganga Jal Consecrated</span>
        </div>
      </div>
    </div>
  );
}
