import React from "react";
import { ShieldCheck } from "lucide-react";

/**
 * SecurePaymentGuarantee
 * Replicates the exact 100% Secure Payment Guarantee trust banner
 * with high-definition payment provider badges (Google Pay, PhonePe, BHIM UPI, Paytm, VISA, RuPay, Mastercard).
 */
export function SecurePaymentGuarantee({ className = "", style = {} }) {
  return (
    <div
      id="secure-payment-guarantee-box"
      className={`secure-payment-guarantee-box ${className}`}
      style={{
        background: "#eef9f2",
        border: "1px solid #d4eedb",
        borderRadius: "16px",
        padding: "16px 14px",
        margin: "14px 0",
        boxSizing: "border-box",
        ...style
      }}
    >
      {/* Top Header Row with Green Shield & Guarantee Title */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginBottom: "14px"
        }}
      >
        <div
          style={{
            width: "24px",
            height: "24px",
            borderRadius: "6px",
            background: "#16a34a",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0
          }}
        >
          <ShieldCheck size={18} strokeWidth={2.6} />
        </div>
        <span
          style={{
            fontSize: "15px",
            fontWeight: "700",
            color: "#0f172a",
            letterSpacing: "-0.2px",
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
          }}
        >
          100% Secure Payment Guarantee
        </span>
      </div>

      {/* Payment Provider Badges Grid / Row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "8px"
        }}
      >
        {/* 1. Google Pay */}
        <div
          title="Google Pay"
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "10px",
            padding: "6px 12px",
            height: "36px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
            flex: "1 1 0",
            minWidth: "48px"
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              fill="#EA4335"
            />
          </svg>
        </div>

        {/* 2. PhonePe */}
        <div
          title="PhonePe"
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "10px",
            padding: "6px 12px",
            height: "36px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
            flex: "1 1 0",
            minWidth: "48px"
          }}
        >
          <div
            style={{
              width: "22px",
              height: "22px",
              borderRadius: "50%",
              background: "#5f259f",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: "900",
              fontSize: "13px",
              lineHeight: 1,
              fontFamily: "sans-serif"
            }}
          >
            पे
          </div>
        </div>

        {/* 3. BHIM UPI */}
        <div
          title="BHIM UPI"
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "10px",
            padding: "6px 12px",
            height: "36px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
            flex: "1 1 0",
            minWidth: "48px"
          }}
        >
          <svg width="22" height="18" viewBox="0 0 40 32" fill="none">
            <path d="M18 4L32 16L18 28L24 16L18 4Z" fill="#00833F" />
            <path d="M8 4L22 16L8 28L14 16L8 4Z" fill="#F37021" />
          </svg>
        </div>

        {/* 4. Paytm */}
        <div
          title="Paytm"
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "10px",
            padding: "6px 10px",
            height: "36px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
            flex: "1 1 0",
            minWidth: "56px"
          }}
        >
          <span
            style={{
              fontWeight: "900",
              fontSize: "13px",
              letterSpacing: "-0.5px",
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            }}
          >
            <span style={{ color: "#002e6e" }}>pay</span>
            <span style={{ color: "#00b9f5" }}>tm</span>
          </span>
        </div>

        {/* 5. VISA */}
        <div
          title="VISA"
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "10px",
            padding: "6px 10px",
            height: "36px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
            flex: "1 1 0",
            minWidth: "52px"
          }}
        >
          <span
            style={{
              fontWeight: "900",
              fontSize: "14px",
              fontStyle: "italic",
              color: "#1a1f71",
              letterSpacing: "0.5px",
              fontFamily: 'sans-serif'
            }}
          >
            VISA
          </span>
        </div>

        {/* 6. RuPay */}
        <div
          title="RuPay"
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "10px",
            padding: "6px 10px",
            height: "36px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
            flex: "1 1 0",
            minWidth: "56px"
          }}
        >
          <span
            style={{
              fontWeight: "900",
              fontSize: "13px",
              fontStyle: "italic",
              fontFamily: 'sans-serif'
            }}
          >
            <span style={{ color: "#163f73" }}>RuPay</span>
            <span style={{ color: "#e84e1b", marginLeft: "1px" }}>❯</span>
          </span>
        </div>

        {/* 7. Mastercard */}
        <div
          title="Mastercard"
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "10px",
            padding: "6px 10px",
            height: "36px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
            flex: "1 1 0",
            minWidth: "48px"
          }}
        >
          <svg width="24" height="16" viewBox="0 0 32 20" fill="none">
            <circle cx="10" cy="10" r="10" fill="#EB001B" />
            <circle cx="22" cy="10" r="10" fill="#F79E1B" fillOpacity="0.85" />
          </svg>
        </div>
      </div>
    </div>
  );
}
