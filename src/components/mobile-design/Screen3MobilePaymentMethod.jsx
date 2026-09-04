import React, { useState } from "react";
import { 
  Smartphone, 
  CreditCard, 
  Building2, 
  Wallet, 
  CalendarClock, 
  ChevronRight, 
  Check, 
  ShieldCheck, 
  Lock, 
  CheckCircle2,
  ArrowRight
} from "lucide-react";
import { MobileHeader } from "./MobileHeader";

/**
 * Screen 3 — Mobile Payment Method Selection
 * 
 * Specifically designed for 390px mobile viewport:
 * - Header: ← Select Payment
 * - Progress: 1 Address  2 Review  3 Payment (Payment active)
 * - Heading: "Select Payment Method" & Subtitle: "Secure payment powered by PayU"
 * - Dominant Rudraksha branding with PayU security assurances
 * - Method Cards: UPI (Most Popular), Cards, Net Banking, Wallets, EMI
 * - Selected state with premium brown border & green secure indicator
 * - Security card with payment network badges (GPay, PhonePe, Paytm, Visa, RuPay, Mastercard)
 * - Sticky bottom payment bar with "[ 🔒 Pay ₹36,950 Securely → ]"
 */
export function Screen3MobilePaymentMethod({
  onBack,
  onProceedToUpi,
  onDirectPay
}) {
  const [selectedMethod, setSelectedMethod] = useState("upi");

  const finalAmount = 36950;

  const paymentMethods = [
    {
      id: "upi",
      title: "UPI (Instant Payment)",
      desc: "Google Pay • PhonePe • Paytm • BHIM",
      icon: Smartphone,
      popular: true,
      badge: "Fastest & Zero Fee",
      targetScreen: "upi"
    },
    {
      id: "cards",
      title: "Credit / Debit Card",
      desc: "Visa • Mastercard • RuPay • Maestro",
      icon: CreditCard,
      popular: false,
      badge: "3D Secure OTP",
      targetScreen: "cards"
    },
    {
      id: "netbanking",
      title: "Net Banking",
      desc: "SBI • HDFC • ICICI • Axis + 50 Banks",
      icon: Building2,
      popular: false,
      badge: "All Indian Banks",
      targetScreen: "netbanking"
    },
    {
      id: "wallets",
      title: "Digital Wallets",
      desc: "Paytm • PhonePe + available wallets",
      icon: Wallet,
      popular: false,
      badge: "Instant Balance",
      targetScreen: "wallets"
    },
    {
      id: "emi",
      title: "Easy EMI Options",
      desc: "Credit Card EMI & Cardless Plans",
      icon: CalendarClock,
      popular: false,
      badge: "Starts at ₹3,250/mo",
      targetScreen: "emi"
    }
  ];

  const handlePayClick = () => {
    if (selectedMethod === "upi" && onProceedToUpi) {
      onProceedToUpi();
    } else if (onDirectPay) {
      onDirectPay();
    }
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
        title="Select Payment"
        onBack={onBack}
      />

      {/* 2. Progress Stepper */}
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
        <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "#166534", fontWeight: "700" }}>
          <span style={{ width: "16px", height: "16px", borderRadius: "50%", background: "#166534", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "9px" }}>✓</span>
          <span>Address</span>
        </div>
        <span style={{ color: "#d9c6b3" }}>→</span>
        <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "#166534", fontWeight: "700" }}>
          <span style={{ width: "16px", height: "16px", borderRadius: "50%", background: "#166534", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "9px" }}>✓</span>
          <span>Review</span>
        </div>
        <span style={{ color: "#d9c6b3" }}>→</span>
        <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "#b88a58", fontWeight: "800" }}>
          <span style={{ width: "16px", height: "16px", borderRadius: "50%", background: "#b88a58", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "9px" }}>3</span>
          <span>Payment</span>
        </div>
      </div>

      {/* 3. Main Content */}
      <div style={{ padding: "14px", display: "flex", flexDirection: "column", gap: "14px" }}>
        
        {/* Page Heading & PayU Subtitle */}
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
            Select Payment Method
          </h1>
          <p
            style={{
              fontSize: "11.5px",
              color: "#806f62",
              margin: "3px 0 0",
              display: "flex",
              alignItems: "center",
              gap: "4px"
            }}
          >
            <ShieldCheck size={13} color="#16a34a" />
            <span>Secure payment powered by <strong>PayU</strong></span>
          </p>
        </div>

        {/* 4. Payment Method Cards List */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {paymentMethods.map((method) => {
            const Icon = method.icon;
            const isSelected = selectedMethod === method.id;

            return (
              <div
                key={method.id}
                onClick={() => setSelectedMethod(method.id)}
                style={{
                  background: isSelected ? "#fffdfa" : "#ffffff",
                  border: isSelected ? "2px solid #2b170d" : "1.5px solid #ebd9c8",
                  borderRadius: "16px",
                  padding: "14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  boxShadow: isSelected 
                    ? "0 4px 14px rgba(43, 23, 13, 0.08)" 
                    : "0 2px 6px rgba(43, 23, 13, 0.02)",
                  transition: "all 0.15s ease",
                  position: "relative"
                }}
              >
                {/* Left: Icon & Details */}
                <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      width: "42px",
                      height: "42px",
                      borderRadius: "12px",
                      background: isSelected ? "#2b170d" : "#f7eee3",
                      color: isSelected ? "#ffffff" : "#99582a",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0
                    }}
                  >
                    <Icon size={20} color={isSelected ? "#ffffff" : "#99582a"} strokeWidth={2} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                      <span
                        style={{
                          fontSize: "14px",
                          fontWeight: "700",
                          color: "#2b170d"
                        }}
                      >
                        {method.title}
                      </span>
                      {method.popular && (
                        <span
                          style={{
                            fontSize: "9px",
                            fontWeight: "800",
                            color: "#ffffff",
                            background: "#b85d25",
                            padding: "1.5px 6px",
                            borderRadius: "10px",
                            textTransform: "uppercase",
                            letterSpacing: "0.3px"
                          }}
                        >
                          Most Popular
                        </span>
                      )}
                    </div>

                    <div
                      style={{
                        fontSize: "11px",
                        color: "#806f62",
                        marginTop: "2px",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis"
                      }}
                    >
                      {method.desc}
                    </div>

                    {/* Green Secure / Feature Badge */}
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "4px" }}>
                      <span
                        style={{
                          fontSize: "9.5px",
                          fontWeight: "700",
                          color: "#166534",
                          background: "#eef9f2",
                          padding: "1px 6px",
                          borderRadius: "4px"
                        }}
                      >
                        ✓ {method.badge}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Radio Selection / Chevron */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "8px" }}>
                  <div
                    style={{
                      width: "22px",
                      height: "22px",
                      borderRadius: "50%",
                      border: isSelected ? "6px solid #2b170d" : "2px solid #d9c6b3",
                      background: "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxSizing: "border-box"
                    }}
                  />
                  <ChevronRight size={16} color={isSelected ? "#2b170d" : "#b0a094"} />
                </div>
              </div>
            );
          })}
        </div>

        {/* 5. Security Card */}
        <div
          style={{
            background: "#ffffff",
            border: "1.5px solid #ebd9c8",
            borderRadius: "16px",
            padding: "14px",
            boxShadow: "0 2px 8px rgba(43, 23, 13, 0.03)",
            display: "flex",
            flexDirection: "column",
            gap: "10px"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                background: "#eef9f2",
                border: "1px solid #c9ebd4",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#166534"
              }}
            >
              <ShieldCheck size={16} color="#16a34a" />
            </div>
            <div>
              <div style={{ fontSize: "13px", fontWeight: "700", color: "#2b170d" }}>
                100% Secure Payment
              </div>
              <div style={{ fontSize: "10.5px", color: "#6e5d50" }}>
                Your payment is securely processed through PayU.
              </div>
            </div>
          </div>

          {/* Payment Logos Strip */}
          <div
            style={{
              paddingTop: "10px",
              borderTop: "1px dashed #ebd9c8",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "6px"
            }}
          >
            {/* Google Pay Pill */}
            <span style={{ fontSize: "10px", fontWeight: "700", color: "#333", background: "#f5f5f5", padding: "4px 8px", borderRadius: "6px", border: "1px solid #e0e0e0" }}>
              Google Pay
            </span>
            {/* PhonePe Pill */}
            <span style={{ fontSize: "10px", fontWeight: "700", color: "#5f259f", background: "#f6f0fa", padding: "4px 8px", borderRadius: "6px", border: "1px solid #e9d5f7" }}>
              PhonePe
            </span>
            {/* Paytm Pill */}
            <span style={{ fontSize: "10px", fontWeight: "700", color: "#002e6e", background: "#f0f4f9", padding: "4px 8px", borderRadius: "6px", border: "1px solid #d0deee" }}>
              Paytm
            </span>
            {/* Visa Pill */}
            <span style={{ fontSize: "10px", fontWeight: "800", color: "#1a1f71", background: "#f2f3f9", padding: "4px 8px", borderRadius: "6px", border: "1px solid #d5d8ec" }}>
              VISA
            </span>
            {/* RuPay Pill */}
            <span style={{ fontSize: "10px", fontWeight: "800", color: "#097939", background: "#f0f7f2", padding: "4px 8px", borderRadius: "6px", border: "1px solid #cce5d4" }}>
              RuPay
            </span>
            {/* Mastercard Pill */}
            <span style={{ fontSize: "10px", fontWeight: "800", color: "#eb001b", background: "#fcf2f2", padding: "4px 8px", borderRadius: "6px", border: "1px solid #f9d5d5" }}>
              Mastercard
            </span>
          </div>
        </div>
      </div>

      {/* 6. Sticky Bottom Payment Bar */}
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
            ₹{finalAmount.toLocaleString("en-IN")}
          </div>
          <div style={{ fontSize: "9px", color: "#806f62", marginTop: "1px" }}>
            Securely processed by PayU
          </div>
        </div>

        <button
          type="button"
          onClick={handlePayClick}
          style={{
            flex: 1,
            maxWidth: "230px",
            background: "linear-gradient(135deg, #2b170d 0%, #4a2815 100%)",
            color: "#ffffff",
            border: "1px solid #b88a58",
            borderRadius: "10px",
            padding: "13px 16px",
            fontSize: "14px",
            fontWeight: "700",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(43, 23, 13, 0.3)"
          }}
        >
          <Lock size={15} color="#e5c8a8" />
          <span>Pay ₹{finalAmount.toLocaleString("en-IN")} Securely →</span>
        </button>
      </div>
    </div>
  );
}
