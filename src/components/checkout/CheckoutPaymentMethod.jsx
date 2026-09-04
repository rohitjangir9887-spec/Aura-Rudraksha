import React from "react";
import { ShieldCheck, Lock, Zap, Check, ArrowRight } from "lucide-react";

export function CheckoutPaymentMethod() {
  return (
    <div 
      id="checkout-payment-section"
      style={{
        background: "#fffdf9",
        border: "1.5px solid #d4a373",
        borderRadius: "14px",
        padding: "18px 16px",
        marginBottom: "16px",
        boxShadow: "0 4px 14px rgba(43, 23, 13, 0.05)"
      }}
    >
      {/* Header */}
      <div 
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "14px",
          paddingBottom: "10px",
          borderBottom: "1px solid #f0e6da"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div 
            style={{
              width: "26px",
              height: "26px",
              borderRadius: "50%",
              background: "#b85d25",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "12px",
              fontWeight: "700"
            }}
          >
            3
          </div>
          <div>
            <h2 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: "20px", fontWeight: "700", margin: 0, color: "#2b170d" }}>
              Payment Method
            </h2>
            <div style={{ fontSize: "11px", color: "#806f62" }}>
              256-Bit SSL Encrypted Payment Gateway
            </div>
          </div>
        </div>

        <div 
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            background: "#eef6f0",
            color: "#166534",
            padding: "4px 8px",
            borderRadius: "6px",
            fontSize: "11px",
            fontWeight: "700"
          }}
        >
          <Lock size={12} /> PayU Live Verified
        </div>
      </div>

      {/* PayU Hosted Checkout Option */}
      <div 
        id="payment-option-payu"
        style={{
          padding: "14px",
          borderRadius: "12px",
          border: "2px solid #b85d25",
          background: "linear-gradient(180deg, #fdf8f4 0%, #fffdfa 100%)",
          boxShadow: "0 2px 8px rgba(184, 93, 37, 0.08)"
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px", marginBottom: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div 
              style={{
                width: "20px",
                height: "20px",
                borderRadius: "50%",
                background: "#b85d25",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0
              }}
            >
              <Check size={13} strokeWidth={3} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "14.5px", fontWeight: "800", color: "#2b170d" }}>
                  PayU Hosted Checkout
                </span>
                <span 
                  style={{
                    fontSize: "10px",
                    fontWeight: "800",
                    letterSpacing: "0.5px",
                    color: "#ffffff",
                    background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    textTransform: "uppercase"
                  }}
                >
                  Instant Confirmation
                </span>
              </div>
              <div style={{ fontSize: "11.5px", color: "#6b5649", marginTop: "2px" }}>
                Pay seamlessly with UPI, Cards, Net Banking & Wallets
              </div>
            </div>
          </div>
        </div>

        {/* Supported Payment Badges Grid */}
        <div 
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
            gap: "8px",
            marginTop: "10px",
            paddingTop: "10px",
            borderTop: "1px dashed #e8dac9"
          }}
        >
          <div style={{ background: "#ffffff", border: "1px solid #ebd9c8", borderRadius: "8px", padding: "8px 10px" }}>
            <div style={{ fontSize: "11px", fontWeight: "700", color: "#2b170d", display: "flex", alignItems: "center", gap: "4px" }}>
              <span>📱</span> UPI & QR
            </div>
            <div style={{ fontSize: "10px", color: "#806f62" }}>
              GPay, PhonePe, Paytm, CRED
            </div>
          </div>

          <div style={{ background: "#ffffff", border: "1px solid #ebd9c8", borderRadius: "8px", padding: "8px 10px" }}>
            <div style={{ fontSize: "11px", fontWeight: "700", color: "#2b170d", display: "flex", alignItems: "center", gap: "4px" }}>
              <span>💳</span> Cards & EMI
            </div>
            <div style={{ fontSize: "10px", color: "#806f62" }}>
              Visa, RuPay, Mastercard, Amex
            </div>
          </div>

          <div style={{ background: "#ffffff", border: "1px solid #ebd9c8", borderRadius: "8px", padding: "8px 10px" }}>
            <div style={{ fontSize: "11px", fontWeight: "700", color: "#2b170d", display: "flex", alignItems: "center", gap: "4px" }}>
              <span>🏛️</span> Net Banking
            </div>
            <div style={{ fontSize: "10px", color: "#806f62" }}>
              All 50+ Indian Banks
            </div>
          </div>

          <div style={{ background: "#ffffff", border: "1px solid #ebd9c8", borderRadius: "8px", padding: "8px 10px" }}>
            <div style={{ fontSize: "11px", fontWeight: "700", color: "#2b170d", display: "flex", alignItems: "center", gap: "4px" }}>
              <span>⚡</span> Priority Dispatch
            </div>
            <div style={{ fontSize: "10px", color: "#166534", fontWeight: "600" }}>
              Ships within 24 Hours
            </div>
          </div>
        </div>

        {/* Benefits notice */}
        <div 
          style={{
            marginTop: "12px",
            background: "#fff9f2",
            border: "1px solid #fae1c8",
            borderRadius: "8px",
            padding: "8px 12px",
            fontSize: "11.5px",
            color: "#7c3114",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}
        >
          <Zap size={15} color="#b85d25" style={{ flexShrink: 0 }} />
          <span>
            <b>Secure Checkout:</b> Direct integration with PayU Hosted Checkout.
          </span>
        </div>
      </div>

      {/* Security note footer */}
      <div 
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          marginTop: "12px",
          fontSize: "11px",
          color: "#806f62"
        }}
      >
        <ShieldCheck size={14} color="#166534" />
        <span>Secured by PayU Payment Services (India) Ltd. • 256-Bit SSL Encrypted</span>
      </div>
    </div>
  );
}
