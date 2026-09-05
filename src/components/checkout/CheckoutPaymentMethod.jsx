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
        padding: "16px 14px",
        marginBottom: "16px",
        boxShadow: "0 4px 16px rgba(43, 23, 13, 0.04)",
        boxSizing: "border-box",
        width: "100%",
        maxWidth: "100%",
        overflow: "hidden"
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
              background: "linear-gradient(135deg, #b88a58 0%, #a07343 100%)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "12px",
              fontWeight: "800",
              flexShrink: 0
            }}
          >
            2
          </div>
          <div>
            <h2 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: "20px", fontWeight: "700", margin: 0, color: "#2b170d", lineHeight: "1.2" }}>
              Select Payment Method
            </h2>
            <div style={{ fontSize: "11px", color: "#806f62" }}>
              Encrypted 256-Bit Bank-Grade Gateway
            </div>
          </div>
        </div>

        <div 
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            background: "#eef9f2",
            color: "#166534",
            padding: "4px 8px",
            borderRadius: "20px",
            fontSize: "11px",
            fontWeight: "700"
          }}
        >
          <Lock size={11} /> Live Verified
        </div>
      </div>

      {/* PayU Online Payment Gateway (Primary Selected Option) */}
      <div 
        id="payment-option-payu"
        style={{
          padding: "12px 14px",
          borderRadius: "14px",
          border: "2px solid #b88a58",
          background: "linear-gradient(180deg, #fefcf9 0%, #fdf8f2 100%)",
          boxShadow: "0 4px 14px rgba(184, 138, 88, 0.12)",
          marginBottom: "12px",
          boxSizing: "border-box",
          width: "100%"
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px", marginBottom: "10px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
            <div 
              style={{
                width: "20px",
                height: "20px",
                borderRadius: "50%",
                background: "#b88a58",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                marginTop: "2px"
              }}
            >
              <Check size={13} strokeWidth={3} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "14.5px", fontWeight: "800", color: "#2b170d" }}>
                  Instant Online Payment (UPI, Cards, NetBanking)
                </span>
                <span 
                  style={{
                    fontSize: "9.5px",
                    fontWeight: "800",
                    letterSpacing: "0.5px",
                    color: "#ffffff",
                    background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
                    padding: "2px 6px",
                    borderRadius: "20px",
                    textTransform: "uppercase"
                  }}
                >
                  Zero Extra Fees
                </span>
              </div>
              <div style={{ fontSize: "11.5px", color: "#6b5649", marginTop: "3px" }}>
                Pay seamlessly with Google Pay, PhonePe, Paytm, BHIM, Cards, or NetBanking
              </div>
            </div>
          </div>
        </div>

        {/* 100% Secure Payment Guarantee Trust Box */}
        <SecurePaymentGuarantee style={{ margin: "8px 0 10px 0" }} />

        {/* Key Features Pill Grid */}
        <div 
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "6px",
            marginTop: "10px",
            width: "100%",
            boxSizing: "border-box"
          }}
        >
          <div style={{ background: "#ffffff", border: "1px solid #ebd9c8", borderRadius: "8px", padding: "6px 8px", display: "flex", alignItems: "center", gap: "6px", minWidth: 0, boxSizing: "border-box" }}>
            <Smartphone size={15} color="#b88a58" style={{ flexShrink: 0 }} />
            <div style={{ minWidth: 0, overflow: "hidden" }}>
              <div style={{ fontSize: "11px", fontWeight: "700", color: "#2b170d", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Instant UPI</div>
              <div style={{ fontSize: "9px", color: "#806f62", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>GPay, PhonePe, Paytm</div>
            </div>
          </div>

          <div style={{ background: "#ffffff", border: "1px solid #ebd9c8", borderRadius: "8px", padding: "6px 8px", display: "flex", alignItems: "center", gap: "6px", minWidth: 0, boxSizing: "border-box" }}>
            <CreditCard size={15} color="#b88a58" style={{ flexShrink: 0 }} />
            <div style={{ minWidth: 0, overflow: "hidden" }}>
              <div style={{ fontSize: "11px", fontWeight: "700", color: "#2b170d", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Cards & EMI</div>
              <div style={{ fontSize: "9px", color: "#806f62", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Visa, RuPay, Master</div>
            </div>
          </div>

          <div style={{ background: "#ffffff", border: "1px solid #ebd9c8", borderRadius: "8px", padding: "6px 8px", display: "flex", alignItems: "center", gap: "6px", minWidth: 0, boxSizing: "border-box" }}>
            <Building2 size={15} color="#b88a58" style={{ flexShrink: 0 }} />
            <div style={{ minWidth: 0, overflow: "hidden" }}>
              <div style={{ fontSize: "11px", fontWeight: "700", color: "#2b170d", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Net Banking</div>
              <div style={{ fontSize: "9px", color: "#806f62", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>50+ Indian Banks</div>
            </div>
          </div>

          <div style={{ background: "#ffffff", border: "1px solid #ebd9c8", borderRadius: "8px", padding: "6px 8px", display: "flex", alignItems: "center", gap: "6px", minWidth: 0, boxSizing: "border-box" }}>
            <Sparkles size={15} color="#16a34a" style={{ flexShrink: 0 }} />
            <div style={{ minWidth: 0, overflow: "hidden" }}>
              <div style={{ fontSize: "11px", fontWeight: "700", color: "#166534", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Fast Dispatch</div>
              <div style={{ fontSize: "9px", color: "#166534", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Within 24 Hours</div>
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
          gap: "6px",
          marginTop: "10px",
          fontSize: "11px",
          color: "#806f62",
          textAlign: "center",
          flexWrap: "wrap"
        }}
      >
        <ShieldCheck size={14} color="#166534" />
        <span>Secured by 256-Bit SSL Encryption • Instant Order Confirmation</span>
      </div>
    </div>
  );
}
