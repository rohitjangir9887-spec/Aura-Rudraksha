import React from "react";
import { ShieldCheck, Lock, Zap, Check, ArrowRight, Smartphone, CreditCard, Building2, Sparkles } from "lucide-react";
import { SecurePaymentGuarantee } from "./SecurePaymentGuarantee";

export function CheckoutPaymentMethod() {
  return (
    <div 
      id="checkout-payment-section"
      style={{
        background: "#ffffff",
        border: "1.5px solid #d4a373",
        borderRadius: "16px",
        padding: "20px 18px",
        marginBottom: "20px",
        boxShadow: "0 4px 16px rgba(43, 23, 13, 0.04)"
      }}
    >
      {/* Header */}
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
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div 
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #b88a58 0%, #a07343 100%)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "13px",
              fontWeight: "800"
            }}
          >
            2
          </div>
          <div>
            <h2 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: "22px", fontWeight: "700", margin: 0, color: "#2b170d" }}>
              Select Payment Method
            </h2>
            <div style={{ fontSize: "12px", color: "#806f62" }}>
              Encrypted 256-Bit Bank-Grade Gateway
            </div>
          </div>
        </div>

        <div 
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            background: "#eef9f2",
            color: "#166534",
            padding: "5px 10px",
            borderRadius: "20px",
            fontSize: "11.5px",
            fontWeight: "700"
          }}
        >
          <Lock size={12} /> Live Verified
        </div>
      </div>

      {/* PayU Online Payment Gateway (Primary Selected Option) */}
      <div 
        id="payment-option-payu"
        style={{
          padding: "16px",
          borderRadius: "14px",
          border: "2px solid #b88a58",
          background: "linear-gradient(180deg, #fefcf9 0%, #fdf8f2 100%)",
          boxShadow: "0 4px 14px rgba(184, 138, 88, 0.12)",
          marginBottom: "14px"
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px", marginBottom: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div 
              style={{
                width: "22px",
                height: "22px",
                borderRadius: "50%",
                background: "#b88a58",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0
              }}
            >
              <Check size={14} strokeWidth={3} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "16px", fontWeight: "800", color: "#2b170d" }}>
                  Instant Online Payment (UPI, Cards, NetBanking)
                </span>
                <span 
                  style={{
                    fontSize: "10px",
                    fontWeight: "800",
                    letterSpacing: "0.5px",
                    color: "#ffffff",
                    background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
                    padding: "2px 8px",
                    borderRadius: "20px",
                    textTransform: "uppercase"
                  }}
                >
                  Zero Extra Fees
                </span>
              </div>
              <div style={{ fontSize: "12px", color: "#6b5649", marginTop: "3px" }}>
                Pay seamlessly with Google Pay, PhonePe, Paytm, BHIM, Cards, or NetBanking
              </div>
            </div>
          </div>
        </div>

        {/* 100% Secure Payment Guarantee Trust Box */}
        <SecurePaymentGuarantee style={{ margin: "10px 0 12px 0" }} />

        {/* Key Features Pill Grid */}
        <div 
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: "8px",
            marginTop: "12px"
          }}
        >
          <div style={{ background: "#ffffff", border: "1px solid #ebd9c8", borderRadius: "10px", padding: "8px 12px", display: "flex", alignItems: "center", gap: "8px" }}>
            <Smartphone size={16} color="#b88a58" />
            <div>
              <div style={{ fontSize: "11.5px", fontWeight: "700", color: "#2b170d" }}>Instant UPI</div>
              <div style={{ fontSize: "10px", color: "#806f62" }}>GPay, PhonePe, Paytm</div>
            </div>
          </div>

          <div style={{ background: "#ffffff", border: "1px solid #ebd9c8", borderRadius: "10px", padding: "8px 12px", display: "flex", alignItems: "center", gap: "8px" }}>
            <CreditCard size={16} color="#b88a58" />
            <div>
              <div style={{ fontSize: "11.5px", fontWeight: "700", color: "#2b170d" }}>Cards & EMI</div>
              <div style={{ fontSize: "10px", color: "#806f62" }}>Visa, RuPay, Master</div>
            </div>
          </div>

          <div style={{ background: "#ffffff", border: "1px solid #ebd9c8", borderRadius: "10px", padding: "8px 12px", display: "flex", alignItems: "center", gap: "8px" }}>
            <Building2 size={16} color="#b88a58" />
            <div>
              <div style={{ fontSize: "11.5px", fontWeight: "700", color: "#2b170d" }}>Net Banking</div>
              <div style={{ fontSize: "10px", color: "#806f62" }}>50+ Indian Banks</div>
            </div>
          </div>

          <div style={{ background: "#ffffff", border: "1px solid #ebd9c8", borderRadius: "10px", padding: "8px 12px", display: "flex", alignItems: "center", gap: "8px" }}>
            <Sparkles size={16} color="#16a34a" />
            <div>
              <div style={{ fontSize: "11.5px", fontWeight: "700", color: "#166534" }}>Fast Dispatch</div>
              <div style={{ fontSize: "10px", color: "#166534" }}>Within 24 Hours</div>
            </div>
          </div>
        </div>
      </div>

      {/* Security note footer */}
      <div 
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          marginTop: "14px",
          fontSize: "11.5px",
          color: "#806f62"
        }}
      >
        <ShieldCheck size={15} color="#166534" />
        <span>Secured by 256-Bit SSL Encryption • Instant Order Confirmation</span>
      </div>
    </div>
  );
}
