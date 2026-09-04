import React, { useState } from "react";
import { 
  Check, 
  QrCode, 
  Smartphone, 
  ShieldCheck, 
  Lock, 
  ArrowRight,
  Sparkles,
  Zap,
  CheckCircle2,
  Copy
} from "lucide-react";
import { MobileHeader } from "./MobileHeader";

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
  const [copiedVpa, setCopiedVpa] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const amount = 36950;

  const upiApps = [
    { id: "gpay", name: "Google Pay", note: "Instant UPI Intent", color: "#1a73e8", bg: "#f0f6ff" },
    { id: "phonepe", name: "PhonePe", note: "Fast Auto-Approval", color: "#5f259f", bg: "#f7f0fc" },
    { id: "paytm", name: "Paytm UPI", note: "Direct Bank Link", color: "#002e6e", bg: "#f0f4fa" },
    { id: "bhim", name: "BHIM UPI", note: "Govt. NPCI Protocol", color: "#008542", bg: "#f0f9f3" },
    { id: "other", name: "Other UPI Apps", note: "Cred, Amazon Pay, etc.", color: "#7a4a24", bg: "#faf5f0" }
  ];

  const handlePay = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      if (onPaymentSuccess) {
        onPaymentSuccess();
      }
    }, 1200);
  };

  const handleCopyVpa = () => {
    setCopiedVpa(true);
    setTimeout(() => setCopiedVpa(false), 2000);
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
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ fontSize: "11.5px", fontWeight: "700", color: "#6e5d50" }}>
              Select your UPI application:
            </div>

            {upiApps.map((app) => {
              const isSelected = selectedApp === app.id;

              return (
                <div
                  key={app.id}
                  onClick={() => setSelectedApp(app.id)}
                  style={{
                    background: isSelected ? "#fffdfa" : "#ffffff",
                    border: isSelected ? "2px solid #b88a58" : "1px solid #ebd9c8",
                    borderRadius: "14px",
                    padding: "12px 14px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    cursor: "pointer",
                    boxShadow: isSelected ? "0 3px 10px rgba(184, 138, 88, 0.15)" : "none",
                    transition: "all 0.15s ease"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "10px",
                        background: app.bg,
                        color: app.color,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "14px",
                        fontWeight: "800"
                      }}
                    >
                      <Smartphone size={18} color={app.color} />
                    </div>
                    <div>
                      <div style={{ fontSize: "13.5px", fontWeight: "700", color: "#2b170d" }}>
                        {app.name}
                      </div>
                      <div style={{ fontSize: "10px", color: "#806f62" }}>
                        {app.note}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    {isSelected && (
                      <span style={{ width: "20px", height: "20px", borderRadius: "50%", background: "#b88a58", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Check size={12} strokeWidth={3} />
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* MODE 2: Enter UPI ID */}
        {paymentMode === "upi_id" && (
          <div
            style={{
              background: "#ffffff",
              border: "1.5px solid #ebd9c8",
              borderRadius: "16px",
              padding: "16px 14px",
              boxShadow: "0 4px 14px rgba(43, 23, 13, 0.04)",
              display: "flex",
              flexDirection: "column",
              gap: "12px"
            }}
          >
            <div style={{ fontSize: "13px", fontWeight: "700", color: "#2b170d" }}>
              Enter UPI ID / VPA
            </div>

            <div>
              <input
                type="text"
                placeholder="example@okaxis, user@okhdfcbank"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1.5px solid #b88a58",
                  fontSize: "13px",
                  outline: "none",
                  boxSizing: "border-box",
                  background: "#fffdfa"
                }}
              />
              <div style={{ fontSize: "10.5px", color: "#806f62", marginTop: "4px" }}>
                A payment request notification will be sent to your UPI app.
              </div>
            </div>

            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {["@okaxis", "@okhdfcbank", "@okicici", "@oksbi", "@paytm", "@ybl"].map((suffix) => (
                <button
                  key={suffix}
                  type="button"
                  onClick={() => setUpiId((prev) => (prev.split("@")[0] || "user") + suffix)}
                  style={{
                    padding: "4px 8px",
                    borderRadius: "6px",
                    background: "#f7eee3",
                    border: "1px solid #ebd9c8",
                    fontSize: "10.5px",
                    fontWeight: "600",
                    color: "#7a4a24",
                    cursor: "pointer"
                  }}
                >
                  {suffix}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* MODE 3: Premium QR Code Card */}
        {paymentMode === "qr" && (
          <div
            style={{
              background: "#ffffff",
              border: "1.5px solid #ebd9c8",
              borderRadius: "16px",
              padding: "16px",
              textAlign: "center",
              boxShadow: "0 4px 14px rgba(43, 23, 13, 0.04)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "10px"
            }}
          >
            <div style={{ fontSize: "13.5px", fontWeight: "700", color: "#2b170d" }}>
              Scan with Any UPI App
            </div>

            {/* QR Code Container */}
            <div
              style={{
                width: "180px",
                height: "180px",
                padding: "10px",
                background: "#ffffff",
                border: "2px solid #2b170d",
                borderRadius: "12px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                boxShadow: "0 4px 12px rgba(43, 23, 13, 0.08)"
              }}
            >
              {/* Sacred Center Watermark */}
              <div
                style={{
                  position: "absolute",
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  background: "#2b170d",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "18px",
                  border: "2px solid #ffffff",
                  zIndex: 2
                }}
              >
                ॐ
              </div>

              {/* High-fidelity SVG QR representation */}
              <svg width="150" height="150" viewBox="0 0 100 100" style={{ shapeRendering: "crispEdges" }}>
                {/* QR Finder patterns (top-left, top-right, bottom-left) */}
                <rect x="5" y="5" width="26" height="26" fill="#2b170d" />
                <rect x="9" y="9" width="18" height="18" fill="#ffffff" />
                <rect x="13" y="13" width="10" height="10" fill="#2b170d" />

                <rect x="69" y="5" width="26" height="26" fill="#2b170d" />
                <rect x="73" y="9" width="18" height="18" fill="#ffffff" />
                <rect x="77" y="13" width="10" height="10" fill="#2b170d" />

                <rect x="5" y="69" width="26" height="26" fill="#2b170d" />
                <rect x="9" y="73" width="18" height="18" fill="#ffffff" />
                <rect x="13" y="77" width="10" height="10" fill="#2b170d" />

                {/* QR Random Databits */}
                <rect x="36" y="8" width="5" height="5" fill="#2b170d" />
                <rect x="46" y="8" width="5" height="5" fill="#2b170d" />
                <rect x="56" y="8" width="5" height="5" fill="#2b170d" />
                <rect x="36" y="18" width="5" height="5" fill="#2b170d" />
                <rect x="51" y="18" width="5" height="5" fill="#2b170d" />
                <rect x="36" y="28" width="5" height="5" fill="#2b170d" />
                <rect x="46" y="28" width="5" height="5" fill="#2b170d" />
                <rect x="56" y="28" width="5" height="5" fill="#2b170d" />

                <rect x="8" y="36" width="5" height="5" fill="#2b170d" />
                <rect x="18" y="36" width="5" height="5" fill="#2b170d" />
                <rect x="28" y="36" width="5" height="5" fill="#2b170d" />
                <rect x="69" y="36" width="5" height="5" fill="#2b170d" />
                <rect x="79" y="36" width="5" height="5" fill="#2b170d" />
                <rect x="89" y="36" width="5" height="5" fill="#2b170d" />

                <rect x="69" y="46" width="5" height="5" fill="#2b170d" />
                <rect x="79" y="56" width="5" height="5" fill="#2b170d" />
                <rect x="89" y="46" width="5" height="5" fill="#2b170d" />
                <rect x="69" y="66" width="5" height="5" fill="#2b170d" />
                <rect x="79" y="76" width="5" height="5" fill="#2b170d" />
                <rect x="89" y="86" width="5" height="5" fill="#2b170d" />

                <rect x="36" y="69" width="5" height="5" fill="#2b170d" />
                <rect x="46" y="79" width="5" height="5" fill="#2b170d" />
                <rect x="56" y="89" width="5" height="5" fill="#2b170d" />
                <rect x="46" y="69" width="5" height="5" fill="#2b170d" />
                <rect x="36" y="89" width="5" height="5" fill="#2b170d" />
              </svg>
            </div>

            <div style={{ fontSize: "14px", fontWeight: "800", color: "#2b170d" }}>
              Amount: ₹{amount.toLocaleString("en-IN")}
            </div>

            <div
              onClick={handleCopyVpa}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                background: "#f7eee3",
                padding: "6px 12px",
                borderRadius: "8px",
                fontSize: "11px",
                fontWeight: "600",
                color: "#7a4a24",
                cursor: "pointer"
              }}
            >
              <span>VPA: aurarudraksha@payu</span>
              <Copy size={12} />
              {copiedVpa && <span style={{ color: "#16a34a", fontWeight: "700" }}>✓ Copied!</span>}
            </div>
          </div>
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
