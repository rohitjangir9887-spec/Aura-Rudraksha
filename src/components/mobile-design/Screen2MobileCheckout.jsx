import React, { useState } from "react";
import { 
  ChevronDown, 
  ChevronUp, 
  Edit3, 
  MapPin, 
  Check, 
  Sparkles, 
  ShieldCheck, 
  Tag, 
  ArrowRight,
  Truck,
  Plus
} from "lucide-react";
import { MobileHeader } from "./MobileHeader";

/**
 * Screen 2 — Mobile Checkout
 * 
 * Specifically designed for 390px mobile viewport:
 * - Header: ← Secure Checkout
 * - Progress indicator: 1 Address → 2 Review → 3 Payment
 * - Trust strip: ✓ Authentic • ✓ Lab Tested • ✓ Free Delivery • ✓ Secure Checkout
 * - Shipping Address card with Default Address badge, Details, Edit & "Deliver to a Different Address"
 * - "Review Your Items" compact product card with savings badge
 * - Order Summary accordion (Subtotal, Product Discount, Shipping FREE, Green savings box, Total)
 * - Coupon code application
 * - Large "Continue to Payment →" button
 */
export function Screen2MobileCheckout({
  onBack,
  onContinueToPayment
}) {
  const [summaryOpen, setSummaryOpen] = useState(true);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [showDifferentAddress, setShowDifferentAddress] = useState(false);

  const subtotal = 59000;
  const productDiscount = 22050;
  const effectiveCouponDiscount = appliedCoupon ? couponDiscount : 0;
  const shipping = 0;
  const finalTotal = Math.max(0, subtotal - productDiscount - effectiveCouponDiscount + shipping);
  const totalSavings = productDiscount + effectiveCouponDiscount;

  const handleApplyCoupon = (e) => {
    e.preventDefault();
    if (!couponCode.trim()) return;
    const code = couponCode.trim().toUpperCase();
    if (code === "AURA10" || code === "SHIV10") {
      setAppliedCoupon(code);
      setCouponDiscount(1500);
    } else if (code === "SHRAWAN200" || code === "WELCOME") {
      setAppliedCoupon(code);
      setCouponDiscount(500);
    } else {
      setAppliedCoupon(code);
      setCouponDiscount(750);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponDiscount(0);
    setCouponCode("");
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100%",
        background: "#fcfaf7",
        position: "relative",
        paddingBottom: "82px",
        boxSizing: "border-box"
      }}
    >
      {/* 1. Header */}
      <MobileHeader
        variant="subpage"
        title="Secure Checkout"
        onBack={onBack}
      />

      {/* 2. Stepper Progress Indicator */}
      <div
        style={{
          background: "#ffffff",
          borderBottom: "1px solid #ebd9c8",
          padding: "10px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: "11px"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "#b88a58", fontWeight: "800" }}>
          <span style={{ width: "16px", height: "16px", borderRadius: "50%", background: "#b88a58", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "9px" }}>1</span>
          <span>Address</span>
        </div>
        <span style={{ color: "#d9c6b3" }}>→</span>
        <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "#2b170d", fontWeight: "700" }}>
          <span style={{ width: "16px", height: "16px", borderRadius: "50%", background: "#2b170d", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "9px" }}>2</span>
          <span>Review</span>
        </div>
        <span style={{ color: "#d9c6b3" }}>→</span>
        <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "#8c796d", fontWeight: "600" }}>
          <span style={{ width: "16px", height: "16px", borderRadius: "50%", background: "#e8dfd8", color: "#6e5d50", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "9px" }}>3</span>
          <span>Payment</span>
        </div>
      </div>

      {/* 3. Trust Strip */}
      <div
        style={{
          background: "#2b170d",
          color: "#f5eee4",
          fontSize: "10px",
          fontWeight: "600",
          padding: "6px 12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          letterSpacing: "0.2px"
        }}
      >
        <span>✓ Authentic</span>
        <span style={{ color: "#8c7360" }}>•</span>
        <span>✓ Lab Tested</span>
        <span style={{ color: "#8c7360" }}>•</span>
        <span>✓ Free Delivery</span>
        <span style={{ color: "#8c7360" }}>•</span>
        <span style={{ color: "#86efac" }}>✓ Secure Checkout</span>
      </div>

      {/* 4. Main Body */}
      <div style={{ padding: "14px", display: "flex", flexDirection: "column", gap: "14px" }}>
        
        {/* SECTION A: Shipping Address Card */}
        <div
          style={{
            background: "#ffffff",
            border: "1.5px solid #ebd9c8",
            borderRadius: "16px",
            padding: "14px",
            boxShadow: "0 4px 14px rgba(43, 23, 13, 0.04)"
          }}
        >
          {/* Top Label & Edit */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <MapPin size={16} color="#99582a" />
              <span style={{ fontSize: "14.5px", fontWeight: "700", color: "#2b170d" }}>
                Shipping Address
              </span>
            </div>
            <span
              style={{
                fontSize: "9.5px",
                fontWeight: "700",
                color: "#166534",
                background: "#eef9f2",
                border: "1px solid #c9ebd4",
                padding: "2px 8px",
                borderRadius: "10px"
              }}
            >
              Default Address
            </span>
          </div>

          {/* Customer Address Details */}
          <div
            style={{
              background: "#faf6f0",
              border: "1px solid #ebd9c8",
              borderRadius: "12px",
              padding: "12px",
              marginBottom: "10px"
            }}
          >
            <div style={{ fontSize: "13.5px", fontWeight: "700", color: "#2b170d", marginBottom: "3px" }}>
              Aarav Sharma
            </div>
            <div style={{ fontSize: "11.5px", color: "#5c483a", lineHeight: "1.4", marginBottom: "6px" }}>
              Flat 402, Nilgiri Heights, 12th Main Road, Indiranagar, Bengaluru, Karnataka — 560038
            </div>
            <div style={{ fontSize: "11px", color: "#7a5c48", display: "flex", flexDirection: "column", gap: "2px" }}>
              <span>📞 +91 98765 43210</span>
              <span>✉️ aarav.sharma@example.com</span>
            </div>
          </div>

          {/* Action Buttons: Edit & Deliver to different address */}
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              onClick={() => alert("Edit address form modal")}
              style={{
                flex: 1,
                padding: "8px 10px",
                background: "#ffffff",
                border: "1px solid #d9c6b3",
                borderRadius: "8px",
                color: "#6e5d50",
                fontSize: "11.5px",
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "4px",
                cursor: "pointer"
              }}
            >
              <Edit3 size={13} color="#99582a" />
              <span>Edit Address</span>
            </button>

            <button
              type="button"
              onClick={() => setShowDifferentAddress(!showDifferentAddress)}
              style={{
                flex: 1.3,
                padding: "8px 10px",
                background: "#fcf8f3",
                border: "1px dashed #b88a58",
                borderRadius: "8px",
                color: "#7a4a24",
                fontSize: "11px",
                fontWeight: "700",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "4px",
                cursor: "pointer"
              }}
            >
              <Plus size={13} color="#99582a" />
              <span>Deliver to Different Address</span>
            </button>
          </div>
        </div>

        {/* SECTION B: Review Your Items */}
        <div
          style={{
            background: "#ffffff",
            border: "1.5px solid #ebd9c8",
            borderRadius: "16px",
            padding: "14px",
            boxShadow: "0 4px 14px rgba(43, 23, 13, 0.04)"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <span style={{ fontSize: "14.5px", fontWeight: "700", color: "#2b170d" }}>
              Review Your Items (1)
            </span>
            <span style={{ fontSize: "10.5px", fontWeight: "700", color: "#166534", background: "#eef9f2", padding: "2px 6px", borderRadius: "4px" }}>
              Ready for Puja
            </span>
          </div>

          {/* Compact Product Card */}
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <div
              style={{
                width: "68px",
                height: "68px",
                borderRadius: "10px",
                border: "1px solid #dfc7af",
                background: "#fdf8f3",
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0
              }}
            >
              <img
                src="/images/product-1mukhi.jpg"
                alt="14 Mukhi Rudraksha"
                style={{ width: "90%", height: "90%", objectFit: "contain" }}
              />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "12.5px", fontWeight: "700", color: "#2b170d", lineHeight: "1.25", marginBottom: "2px" }}>
                Original 14 Mukhi Rudraksha (Nepali)
              </div>
              <div style={{ fontSize: "10px", color: "#8c6b54", marginBottom: "4px" }}>
                Qty: 1 • Lab Certificate Included
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
                <span style={{ fontSize: "14.5px", fontWeight: "800", color: "#2b170d" }}>
                  ₹36,950
                </span>
                <del style={{ fontSize: "11px", color: "#8c796d" }}>₹59,000</del>
                <span style={{ fontSize: "9.5px", fontWeight: "700", color: "#166534", background: "#eef9f2", padding: "1px 5px", borderRadius: "4px" }}>
                  37% OFF
                </span>
              </div>
            </div>
          </div>

          {/* Green Savings Pill */}
          <div
            style={{
              marginTop: "10px",
              background: "#eef9f2",
              border: "1px solid #c9ebd4",
              borderRadius: "8px",
              padding: "6px 10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: "11px",
              fontWeight: "700",
              color: "#166534"
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <Sparkles size={12} color="#16a34a" /> You save ₹22,050 on this bead
            </span>
            <span>37% Savings</span>
          </div>
        </div>

        {/* SECTION C: Order Summary Accordion */}
        <div
          style={{
            background: "#ffffff",
            border: "1.5px solid #ebd9c8",
            borderRadius: "16px",
            overflow: "hidden",
            boxShadow: "0 4px 14px rgba(43, 23, 13, 0.04)"
          }}
        >
          {/* Header Toggle */}
          <div
            onClick={() => setSummaryOpen(!summaryOpen)}
            style={{
              padding: "12px 14px",
              background: "#fcf8f3",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              cursor: "pointer",
              borderBottom: summaryOpen ? "1px solid #ede3d8" : "none"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "13.5px", fontWeight: "700", color: "#2b170d" }}>
                Order Summary
              </span>
              <span style={{ fontSize: "13.5px", fontWeight: "800", color: "#99582a" }}>
                ₹{finalTotal.toLocaleString("en-IN")}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "#806f62" }}>
              <span>{summaryOpen ? "Hide Details" : "Show Details"}</span>
              {summaryOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </div>
          </div>

          {/* Accordion Content */}
          {summaryOpen && (
            <div style={{ padding: "14px", display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12.5px", color: "#5c483a" }}>
                <span>Subtotal (1 Item)</span>
                <span>₹{subtotal.toLocaleString("en-IN")}</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12.5px", color: "#166534" }}>
                <span>Product Discount</span>
                <span>-₹{productDiscount.toLocaleString("en-IN")}</span>
              </div>

              {appliedCoupon && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12.5px", color: "#166534" }}>
                  <span>Coupon Discount ({appliedCoupon})</span>
                  <span>-₹{couponDiscount.toLocaleString("en-IN")}</span>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12.5px", color: "#5c483a" }}>
                <span>Insured Express Shipping</span>
                <span style={{ color: "#166534", fontWeight: "700" }}>FREE</span>
              </div>

              {/* Green Savings Box */}
              <div
                style={{
                  background: "#eef9f2",
                  border: "1px solid #c9ebd4",
                  color: "#166534",
                  padding: "8px 10px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontWeight: "700",
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: "4px"
                }}
              >
                <span>Total Savings:</span>
                <span>You save ₹{totalSavings.toLocaleString("en-IN")}</span>
              </div>

              {/* Grand Total */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "16px",
                  fontWeight: "800",
                  color: "#2b170d",
                  paddingTop: "10px",
                  borderTop: "1px solid #ede3d8",
                  marginTop: "4px"
                }}
              >
                <span>Total Payable</span>
                <span>₹{finalTotal.toLocaleString("en-IN")}</span>
              </div>

              {/* Coupon Code Input */}
              <div style={{ marginTop: "8px", paddingTop: "10px", borderTop: "1px dashed #ede3d8" }}>
                <div style={{ fontSize: "11px", fontWeight: "600", color: "#6e5d50", marginBottom: "6px" }}>
                  Have a coupon code?
                </div>
                <form onSubmit={handleApplyCoupon} style={{ display: "flex", gap: "6px" }}>
                  <input
                    type="text"
                    placeholder="Enter coupon code (e.g. AURA10)"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    disabled={!!appliedCoupon}
                    style={{
                      flex: 1,
                      padding: "8px 10px",
                      borderRadius: "8px",
                      border: "1px solid #d9c6b3",
                      fontSize: "12px",
                      textTransform: "uppercase",
                      background: appliedCoupon ? "#f7f7f7" : "#ffffff",
                      outline: "none"
                    }}
                  />
                  {appliedCoupon ? (
                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      style={{
                        padding: "0 12px",
                        background: "#fef2f2",
                        border: "1px solid #fca5a5",
                        color: "#dc2626",
                        borderRadius: "8px",
                        fontSize: "11.5px",
                        fontWeight: "700",
                        cursor: "pointer"
                      }}
                    >
                      Remove
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={!couponCode}
                      style={{
                        padding: "0 16px",
                        background: couponCode ? "#b88a58" : "#d9c6b3",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "8px",
                        fontSize: "12px",
                        fontWeight: "700",
                        cursor: couponCode ? "pointer" : "default"
                      }}
                    >
                      Apply
                    </button>
                  )}
                </form>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 5. Sticky Bottom Payment Button */}
      <div
        style={{
          position: "sticky",
          bottom: 0,
          left: 0,
          right: 0,
          background: "#ffffff",
          borderTop: "1.5px solid #ebd9c8",
          padding: "10px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          boxShadow: "0 -4px 16px rgba(43, 23, 13, 0.08)",
          zIndex: 30
        }}
      >
        <div>
          <div style={{ fontSize: "10.5px", color: "#806f62" }}>Total Payable</div>
          <div style={{ fontSize: "19px", fontWeight: "800", color: "#2b170d", lineHeight: "1.1" }}>
            ₹{finalTotal.toLocaleString("en-IN")}
          </div>
          <div style={{ fontSize: "9.5px", color: "#166534", fontWeight: "700" }}>
            ✓ Step 2 of 3 Completed
          </div>
        </div>

        <button
          type="button"
          onClick={onContinueToPayment}
          style={{
            flex: 1,
            maxWidth: "230px",
            background: "linear-gradient(135deg, #b88a58 0%, #8c5d2e 100%)",
            color: "#ffffff",
            border: "none",
            borderRadius: "10px",
            padding: "13px 16px",
            fontSize: "14px",
            fontWeight: "700",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            cursor: "pointer",
            boxShadow: "0 3px 10px rgba(184, 138, 88, 0.35)"
          }}
        >
          <span>Continue to Payment</span>
          <ArrowRight size={16} strokeWidth={2.4} />
        </button>
      </div>
    </div>
  );
}
