import React, { useState } from "react";
import { 
  ShieldCheck, 
  Lock, 
  Zap,
} from "lucide-react";
import { MobileHeader } from "./MobileHeader";
import { UpiAppMode } from "./UpiAppMode";
import { UpiIdMode } from "./UpiIdMode";
import { UpiQrMode } from "./UpiQrMode";

/**
 * Screen 4 — UPI Payment
 * 
 * Specifically designed for 390px mobile viewport:
 * - Header: ← Pay via UPI
 * - Heading: "Quick & Secure UPI Payment"
 * - Payment options: Google Pay, PhonePe, Paytm, BHIM, Other UPI Apps
 * - Selected UPI option with brown/gold border & check icon
 * - UPI ID input: "Enter UPI ID" with verify state
 * - OR "Scan & Pay" with Premium QR code card
 * - Button: "Pay ₹36,950 Securely →"
 * - Below: "Secured and processed by PayU"
 * - Security indicators: 256-bit SSL, Secure Payment, Instant Confirmation
 */
export function Screen4MobileUpiPayment({
  onBack,
  onPaymentSuccess
}) {
  const [selectedApp, setSelectedApp] = useState("gpay");
  const [paymentMode, setPaymentMode] = useState("app"); // "app" | "upi_id" | "qr"
  const [upiId, setUpiId] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const amount = 36950;

  const handlePay = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      if (onPaymentSuccess) {
        onPaymentSuccess();
      }
    }, 1200);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100%",
        background: "#fcfaf7",
        position: "relative",
        paddingBottom: "86px",
        boxSizing: "border-box"
      }}
    >
      {/* 1. Header */}
      <MobileHeader
        variant="subpage"
        title="Pay via UPI"
        onBack={onBack}
      />

      {/* 2. Content */}
      <div style={{ padding: "14px", display: "flex", flexDirection: "column", gap: "14px" }}>
        
        {/* Title & PayU Badge */}
        <div>
          <h1
            style={{
              fontFamily: '"Cormorant Garamond", Georgia, serif',
              fontSize: "22px",
              fontWeight: "700",
              color: "#2b170d",
              margin: 0,
              lineHeight: "1.2"
            }}
          >
            Quick & Secure UPI Payment
          </h1>
          <p style={{ fontSize: "11px", color: "#806f62", margin: "3px 0 0" }}>
            Choose an installed UPI app, enter your VPA, or scan QR code.
          </p>
        </div>

        {/* Tab Switcher: App | UPI ID | Scan QR */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "4px",
            background: "#ede3d8",
            padding: "4px",
            borderRadius: "10px"
          }}
        >
          <button
            type="button"
            onClick={() => setPaymentMode("app")}
            style={{
              padding: "7px 4px",
              background: paymentMode === "app" ? "#ffffff" : "transparent",
              border: "none",
              borderRadius: "8px",
              fontSize: "11px",
              fontWeight: "700",
              color: paymentMode === "app" ? "#2b170d" : "#6e5d50",
              cursor: "pointer",
              boxShadow: paymentMode === "app" ? "0 2px 4px rgba(0,0,0,0.06)" : "none"
            }}
          >
            UPI Apps
          </button>
          <button
            type="button"
            onClick={() => setPaymentMode("upi_id")}
            style={{
              padding: "7px 4px",
              background: paymentMode === "upi_id" ? "#ffffff" : "transparent",
              border: "none",
              borderRadius: "8px",
              fontSize: "11px",
              fontWeight: "700",
              color: paymentMode === "upi_id" ? "#2b170d" : "#6e5d50",
              cursor: "pointer",
              boxShadow: paymentMode === "upi_id" ? "0 2px 4px rgba(0,0,0,0.06)" : "none"
            }}
          >
            UPI ID / VPA
          </button>
          <button
            type="button"
            onClick={() => setPaymentMode("qr")}
            style={{
              padding: "7px 4px",
              background: paymentMode === "qr" ? "#ffffff" : "transparent",
              border: "none",
              borderRadius: "8px",
              fontSize: "11px",
              fontWeight: "700",
              color: paymentMode === "qr" ? "#2b170d" : "#6e5d50",
              cursor: "pointer",
              boxShadow: paymentMode === "qr" ? "0 2px 4px rgba(0,0,0,0.06)" : "none"
            }}
          >
            Scan & Pay QR
          </button>
        </div>

        {/* MODE 1: Installed UPI Apps List */}
        {paymentMode === "app" && (
          <UpiAppMode selectedApp={selectedApp} setSelectedApp={setSelectedApp} />
        )}

        {/* MODE 2: Enter UPI ID */}
        {paymentMode === "upi_id" && (
          <UpiIdMode upiId={upiId} setUpiId={setUpiId} />
        )}

        {/* MODE 3: Premium QR Code Card */}
        {paymentMode === "qr" && (
          <UpiQrMode amount={amount} />
        )}

        {/* Security Indicators Strip */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #ebd9c8",
            borderRadius: "14px",
            padding: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "10.5px",
            fontWeight: "700",
            color: "#166534"
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: "3px" }}>
            <Lock size={12} color="#16a34a" /> 256-bit SSL
          </span>
          <span style={{ color: "#d9c6b3" }}>•</span>
          <span style={{ display: "flex", alignItems: "center", gap: "3px" }}>
            <ShieldCheck size={12} color="#16a34a" /> Secure Payment
          </span>
          <span style={{ color: "#d9c6b3" }}>•</span>
          <span style={{ display: "flex", alignItems: "center", gap: "3px" }}>
            <Zap size={12} color="#16a34a" /> Instant Confirmation
          </span>
        </div>
      </div>

      {/* 3. Bottom Sticky Payment Action */}
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
          flexDirection: "column",
          gap: "6px",
          boxShadow: "0 -4px 16px rgba(43, 23, 13, 0.08)",
          zIndex: 30
        }}
      >
        <button
          type="button"
          onClick={handlePay}
          disabled={isProcessing}
          style={{
            width: "100%",
            background: isProcessing ? "#8c5d2e" : "linear-gradient(135deg, #2b170d 0%, #4a2815 100%)",
            color: "#ffffff",
            border: "1px solid #b88a58",
            borderRadius: "10px",
            padding: "13px 16px",
            fontSize: "14.5px",
            fontWeight: "700",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            cursor: isProcessing ? "wait" : "pointer",
            boxShadow: "0 4px 12px rgba(43, 23, 13, 0.3)"
          }}
        >
          <Lock size={16} color="#e5c8a8" />
          <span>{isProcessing ? "Authenticating with UPI..." : `Pay ₹${amount.toLocaleString("en-IN")} Securely →`}</span>
        </button>

        <div style={{ textAlign: "center", fontSize: "10px", color: "#806f62" }}>
          Secured and processed by <strong>PayU</strong>
        </div>
      </div>
    </div>
  );
}
