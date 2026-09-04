import React from "react";
import { ShieldCheck, Lock, CheckCircle2 } from "lucide-react";

/**
 * PaymentGuaranteeCard
 * Elegant sage-green card providing customer assurance with professional payment network logos:
 * Google Pay, PhonePe, Paytm, Visa, RuPay, Mastercard.
 */
export function PaymentGuaranteeCard() {
  return (
    <div
      id="checkout-payment-guarantee-card"
      style={{
        background: "linear-gradient(180deg, #f3faf5 0%, #eaf5ee 100%)",
        border: "1.5px solid #c3e5cf",
        borderRadius: "16px",
        padding: "18px 20px",
        marginBottom: "20px",
        boxShadow: "0 4px 14px rgba(22, 101, 52, 0.05)"
      }}
    >
      {/* Header with Shield */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
        <div 
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            background: "#16a34a",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 2px 6px rgba(22, 163, 74, 0.3)"
          }}
        >
          <ShieldCheck size={18} strokeWidth={2.5} />
        </div>
        <div>
          <div style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: "20px", fontWeight: "700", color: "#14532d", lineHeight: "1.2" }}>
            100% Secure Payment Guarantee
          </div>
          <div style={{ fontSize: "11.5px", color: "#166534" }}>
            Direct encrypted channel via PayU Payment Gateway • 256-Bit Bank Grade SSL
          </div>
        </div>
      </div>

      <p style={{ fontSize: "12px", color: "#2d5a3f", lineHeight: "1.5", margin: "6px 0 14px" }}>
        All sacred spiritual orders are processed through heavily guarded financial gateways with instantaneous fraud detection, 3D Secure 2.0 verification, and RBI-mandated zero-compromise encryption.
      </p>

      {/* Network Logos Bar */}
      <div 
        style={{
          background: "#ffffff",
          border: "1px solid #cde8d7",
          borderRadius: "12px",
          padding: "10px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "14px"
        }}
      >
        {/* Google Pay */}
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
          </svg>
          <span style={{ fontSize: "12px", fontWeight: "700", color: "#3c4043" }}>GPay</span>
        </div>

        {/* PhonePe */}
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <div style={{ width: "20px", height: "20px", borderRadius: "50%", background: "#5f259f", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "900" }}>
            पे
          </div>
          <span style={{ fontSize: "12px", fontWeight: "700", color: "#5f259f" }}>PhonePe</span>
        </div>

        {/* Paytm */}
        <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
          <span style={{ fontWeight: "900", fontSize: "13px" }}>
            <span style={{ color: "#002e6e" }}>pay</span><span style={{ color: "#00b9f5" }}>tm</span>
          </span>
        </div>

        {/* Visa */}
        <div style={{ display: "flex", alignItems: "center" }}>
          <span style={{ fontWeight: "900", fontStyle: "italic", color: "#1a1f71", fontSize: "15px", letterSpacing: "0.5px" }}>
            VISA
          </span>
        </div>

        {/* RuPay */}
        <div style={{ display: "flex", alignItems: "center" }}>
          <span style={{ fontWeight: "900", color: "#163f73", fontSize: "13px" }}>
            RuPay <span style={{ color: "#e84e1b" }}>❯</span>
          </span>
        </div>

        {/* Mastercard */}
        <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={{ width: "14px", height: "14px", borderRadius: "50%", background: "#eb001b", opacity: 0.9 }}></div>
            <div style={{ width: "14px", height: "14px", borderRadius: "50%", background: "#f79e1b", marginLeft: "-6px", opacity: 0.9 }}></div>
          </div>
          <span style={{ fontSize: "11px", fontWeight: "700", color: "#222" }}>Mastercard</span>
        </div>
      </div>
    </div>
  );
}
