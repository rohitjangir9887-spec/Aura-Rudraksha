import React, { useState } from "react";
import { 
  Check, 
  Sparkles, 
  ArrowRight, 
  Package, 
  ShieldCheck, 
  Download, 
  Calendar, 
  CreditCard, 
  MapPin,
  CheckCircle2,
  Copy
} from "lucide-react";
import { MobileBottomNav } from "./MobileBottomNav";

/**
 * Screen 5 — Payment Success & Order Confirmation
 * 
 * Specifically designed for 390px mobile viewport:
 * - Premium success banner with large green circular check icon
 * - Heading: "Payment Successful!"
 * - Subheading: "Your Rudraksha order has been confirmed."
 * - Order details card (Order ID #AUR-88942, Amount Paid ₹36,950, Payment Method UPI, Date & Time)
 * - Green confirmation card: "Your order is confirmed and will be dispatched soon."
 * - Action buttons: "View Order →" & "Continue Shopping"
 * - Mobile bottom navigation (Home, Shop, Orders, Wishlist, Account)
 */
export function Screen5MobilePaymentSuccess({
  onViewOrder,
  onContinueShopping,
  onTabChange
}) {
  const [copiedId, setCopiedId] = useState(false);

  const orderId = "AUR-88942";
  const amountPaid = 36950;
  const paymentMethod = "UPI (Google Pay)";
  const now = new Date();
  const formattedDate = `${now.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} • ${now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;

  const handleCopy = () => {
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100%",
        background: "#fcfaf7",
        position: "relative",
        boxSizing: "border-box"
      }}
    >
      {/* 1. Content Container */}
      <div
        style={{
          flex: 1,
          padding: "20px 14px 24px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "16px"
        }}
      >
        {/* Large Green Circular Success Icon */}
        <div
          style={{
            width: "80px",
            height: "80px",
            borderRadius: "50%",
            background: "radial-gradient(circle, #22c55e 0%, #15803d 100%)",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 8px 24px rgba(34, 197, 94, 0.35)",
            border: "4px solid #f0fdf4",
            marginTop: "10px"
          }}
        >
          <Check size={44} strokeWidth={3} color="#ffffff" />
        </div>

        {/* Headings */}
        <div style={{ textAlign: "center" }}>
          <h1
            style={{
              fontFamily: '"Cormorant Garamond", Georgia, serif',
              fontSize: "26px",
              fontWeight: "700",
              color: "#2b170d",
              margin: "0 0 4px",
              lineHeight: "1.2"
            }}
          >
            Payment Successful!
          </h1>
          <p
            style={{
              fontSize: "12.5px",
              color: "#6e5d50",
              margin: 0,
              fontWeight: "500"
            }}
          >
            Your Rudraksha order has been confirmed.
          </p>
        </div>

        {/* Green Confirmation Card */}
        <div
          style={{
            width: "100%",
            background: "#eef9f2",
            border: "1.5px solid #c9ebd4",
            borderRadius: "14px",
            padding: "12px 14px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            boxSizing: "border-box"
          }}
        >
          <div
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              background: "#16a34a",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0
            }}
          >
            <ShieldCheck size={16} />
          </div>
          <div>
            <div style={{ fontSize: "12.5px", fontWeight: "700", color: "#166534" }}>
              Your order is confirmed and will be dispatched soon.
            </div>
            <div style={{ fontSize: "10.5px", color: "#15803d", marginTop: "2px" }}>
              Vedic energization & Ganga Jal abhishek will be performed prior to shipment.
            </div>
          </div>
        </div>

        {/* Order Details Card */}
        <div
          style={{
            width: "100%",
            background: "#ffffff",
            border: "1.5px solid #ebd9c8",
            borderRadius: "16px",
            padding: "16px",
            boxShadow: "0 4px 14px rgba(43, 23, 13, 0.04)",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            boxSizing: "border-box"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "10px", borderBottom: "1px solid #ede3d8" }}>
            <span style={{ fontSize: "13px", fontWeight: "700", color: "#2b170d" }}>
              Order Summary Details
            </span>
            <div
              onClick={handleCopy}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "11px",
                color: "#99582a",
                fontWeight: "700",
                cursor: "pointer",
                background: "#faf5f0",
                padding: "2px 8px",
                borderRadius: "6px"
              }}
            >
              <span>#{orderId}</span>
              <Copy size={11} />
              {copiedId && <span style={{ color: "#16a34a" }}>✓</span>}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", color: "#6e5d50" }}>
              <span>Amount Paid:</span>
              <span style={{ fontWeight: "800", color: "#2b170d", fontSize: "13.5px" }}>
                ₹{amountPaid.toLocaleString("en-IN")}
              </span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", color: "#6e5d50" }}>
              <span>Payment Gateway:</span>
              <span style={{ fontWeight: "700", color: "#166534" }}>
                PayU 256-Bit SSL
              </span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", color: "#6e5d50" }}>
              <span>Payment Method:</span>
              <span style={{ fontWeight: "700", color: "#2b170d" }}>
                {paymentMethod}
              </span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", color: "#6e5d50" }}>
              <span>Date & Time:</span>
              <span style={{ fontWeight: "600", color: "#2b170d" }}>
                {formattedDate}
              </span>
            </div>
          </div>

          {/* Purchased Item Snapshot */}
          <div
            style={{
              paddingTop: "10px",
              borderTop: "1px dashed #ebd9c8",
              display: "flex",
              alignItems: "center",
              gap: "10px"
            }}
          >
            <img
              src="/images/product-1mukhi.jpg"
              alt="14 Mukhi Rudraksha"
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "8px",
                border: "1px solid #dfc7af",
                background: "#faf5f0",
                objectFit: "contain"
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "12px", fontWeight: "700", color: "#2b170d", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                Original 14 Mukhi Rudraksha (Nepali)
              </div>
              <div style={{ fontSize: "10px", color: "#806f62" }}>
                Qty: 1 • Lab Certificate Included
              </div>
            </div>
            <span style={{ fontSize: "12.5px", fontWeight: "800", color: "#2b170d" }}>
              ₹36,950
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "8px", marginTop: "4px" }}>
          <button
            type="button"
            onClick={onViewOrder}
            style={{
              width: "100%",
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
            <span>View Order Details</span>
            <ArrowRight size={16} strokeWidth={2.4} />
          </button>

          <button
            type="button"
            onClick={onContinueShopping}
            style={{
              width: "100%",
              background: "#ffffff",
              color: "#2b170d",
              border: "1.5px solid #ebd9c8",
              borderRadius: "10px",
              padding: "12px 16px",
              fontSize: "13.5px",
              fontWeight: "700",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              cursor: "pointer"
            }}
          >
            <span>Continue Shopping</span>
          </button>
        </div>
      </div>

      {/* 2. Bottom Navigation */}
      <MobileBottomNav activeTab="orders" onTabChange={onTabChange} />
    </div>
  );
}
