import React from "react";
import { Lock, ArrowRight, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { money } from "../../data";
import { CheckoutCompactPaymentLogos } from "./CheckoutCompactPaymentLogos";
import { CheckoutCompactPaymentTrustFooter } from "./CheckoutCompactPaymentTrustFooter";

export function CheckoutCompactPayment({
  finalTotal = 0,
  loading = false,
  onPayNow,
  disabled = false,
  totalSavings = 0
}) {
  return (
    <div
      id="checkout-compact-payment-section"
      style={{
        background: "#ffffff",
        border: "1.5px solid #ebd9c8",
        borderRadius: "16px",
        padding: "18px 16px",
        marginBottom: "16px",
        boxShadow: "0 4px 16px rgba(43, 23, 13, 0.04)",
        boxSizing: "border-box",
        width: "100%",
        maxWidth: "100%"
      }}
    >
      {/* 1. Header with Step 4 indicator */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "12px",
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
              background: "linear-gradient(135deg, #b88a58 0%, #8c5d2e 100%)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "12px",
              fontWeight: "800",
              flexShrink: 0
            }}
          >
            4
          </div>
          <div>
            <h2
              style={{
                fontFamily: '"Cormorant Garamond", serif',
                fontSize: "20px",
                fontWeight: "700",
                margin: 0,
                color: "#2b170d",
                lineHeight: "1.2"
              }}
            >
              Payment & Instant Checkout
            </h2>
            <div style={{ fontSize: "11px", color: "#806f62", marginTop: "1px" }}>
              100% Safe, Instant & Encrypted Payment
            </div>
          </div>
        </div>

        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            background: "#eef9f2",
            border: "1px solid #cce8d4",
            color: "#166534",
            padding: "3px 8px",
            borderRadius: "6px",
            fontSize: "11px",
            fontWeight: "700"
          }}
        >
          <Lock size={12} />
          <span>PayU 256-Bit SSL</span>
        </div>
      </div>

      {/* 2. PAYMENT LOGOS ABOVE PAY NOW BUTTON */}
      <CheckoutCompactPaymentLogos />

      {/* 3. PRIMARY "PAY NOW" BUTTON */}
      <motion.button
        type="button"
        id="btn-checkout-pay-now-main"
        disabled={disabled || loading}
        onClick={onPayNow}
        whileHover={{ scale: disabled || loading ? 1 : 1.01 }}
        whileTap={{ scale: disabled || loading ? 1 : 0.99 }}
        style={{
          width: "100%",
          padding: "16px 20px",
          background: "linear-gradient(135deg, #b88a58 0%, #8c5d2e 100%)",
          color: "#ffffff",
          border: "1px solid #d4a775",
          borderRadius: "14px",
          fontSize: "16.5px",
          fontWeight: "800",
          cursor: disabled || loading ? (loading ? "wait" : "not-allowed") : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "10px",
          boxShadow: "0 6px 20px rgba(184, 138, 88, 0.38)",
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          letterSpacing: "0.2px",
          boxSizing: "border-box"
        }}
      >
        {loading ? (
          <>
            <Loader2 size={20} className="spin" color="#ffffff" />
            <span>Connecting to PayU Gateway...</span>
          </>
        ) : (
          <>
            <Lock size={18} strokeWidth={2.4} />
            <span>Pay Now • {money(finalTotal)}</span>
            <ArrowRight size={18} strokeWidth={2.4} />
          </>
        )}
      </motion.button>

      {/* 4. SECURE PAYMENT GUARANTEE & TRUST ICONS BELOW PAY NOW BUTTON */}
      <CheckoutCompactPaymentTrustFooter />
    </div>
  );
}
