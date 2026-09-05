import React from "react";
import { ShieldCheck, Lock, ArrowRight, Loader2, Sparkles, CheckCircle2, Truck, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { money } from "../../data";

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
      <div
        id="payment-methods-logo-strip"
        style={{
          background: "#faf6f0",
          border: "1px solid #ebd9c8",
          borderRadius: "12px",
          padding: "10px 12px",
          marginBottom: "14px",
          boxSizing: "border-box"
        }}
      >
        <div
          style={{
            fontSize: "11.5px",
            fontWeight: "700",
            color: "#4a3224",
            marginBottom: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}
        >
          <span>Supported Payment Methods (0% Extra Fee):</span>
          <span style={{ color: "#166534", fontSize: "10.5px", fontWeight: "700" }}>Instant UPI / Cards</span>
        </div>

        {/* Brand Logos Row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(52px, 1fr))",
            gap: "6px",
            alignItems: "center"
          }}
        >
          {/* Google Pay */}
          <div
            title="Google Pay"
            style={{
              background: "#ffffff",
              border: "1px solid #e2d8cd",
              borderRadius: "8px",
              padding: "4px 6px",
              height: "30px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
            </svg>
            <span style={{ fontSize: "10.5px", fontWeight: "700", color: "#3c4043", marginLeft: "4px" }}>GPay</span>
          </div>

          {/* PhonePe */}
          <div
            title="PhonePe"
            style={{
              background: "#ffffff",
              border: "1px solid #e2d8cd",
              borderRadius: "8px",
              padding: "4px 6px",
              height: "30px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
            }}
          >
            <div
              style={{
                width: "18px",
                height: "18px",
                borderRadius: "50%",
                background: "#5f259f",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "10.5px",
                fontWeight: "900"
              }}
            >
              पे
            </div>
            <span style={{ fontSize: "10.5px", fontWeight: "700", color: "#5f259f", marginLeft: "4px" }}>PhonePe</span>
          </div>

          {/* Paytm */}
          <div
            title="Paytm"
            style={{
              background: "#ffffff",
              border: "1px solid #e2d8cd",
              borderRadius: "8px",
              padding: "4px 6px",
              height: "30px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
            }}
          >
            <span style={{ fontSize: "11px", fontWeight: "900", color: "#00baf2", letterSpacing: "-0.5px" }}>
              Pay<span style={{ color: "#002970" }}>tm</span>
            </span>
          </div>

          {/* BHIM UPI */}
          <div
            title="BHIM UPI"
            style={{
              background: "#ffffff",
              border: "1px solid #e2d8cd",
              borderRadius: "8px",
              padding: "4px 6px",
              height: "30px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
            }}
          >
            <span style={{ fontSize: "11px", fontWeight: "900", color: "#097939" }}>
              UPI
            </span>
          </div>

          {/* VISA */}
          <div
            title="Visa"
            style={{
              background: "#ffffff",
              border: "1px solid #e2d8cd",
              borderRadius: "8px",
              padding: "4px 6px",
              height: "30px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
            }}
          >
            <span style={{ fontSize: "11.5px", fontWeight: "900", fontStyle: "italic", color: "#1a1f71" }}>
              VISA
            </span>
          </div>

          {/* RuPay */}
          <div
            title="RuPay"
            style={{
              background: "#ffffff",
              border: "1px solid #e2d8cd",
              borderRadius: "8px",
              padding: "4px 6px",
              height: "30px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
            }}
          >
            <span style={{ fontSize: "10.5px", fontWeight: "900", color: "#00843D" }}>
              Ru<span style={{ color: "#F7A800" }}>Pay</span>
            </span>
          </div>

          {/* Mastercard */}
          <div
            title="Mastercard"
            style={{
              background: "#ffffff",
              border: "1px solid #e2d8cd",
              borderRadius: "8px",
              padding: "4px 6px",
              height: "30px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center" }}>
              <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#eb001b", opacity: 0.95 }} />
              <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#f79e1b", marginLeft: "-5px", opacity: 0.95 }} />
            </div>
          </div>
        </div>
      </div>

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
      <div
        id="secure-payment-trust-footer"
        style={{
          marginTop: "14px",
          paddingTop: "12px",
          borderTop: "1px dashed #e8dac9",
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "8px",
          textAlign: "center"
        }}
      >
        {/* Trust 1: 100% Secure Payment */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "3px",
            background: "#fbf8f3",
            padding: "8px 6px",
            borderRadius: "10px",
            border: "1px solid #f0e6da"
          }}
        >
          <div style={{ color: "#166534" }}>
            <ShieldCheck size={18} strokeWidth={2.2} />
          </div>
          <div style={{ fontSize: "11px", fontWeight: "700", color: "#2b170d", lineHeight: "1.2" }}>
            100% Secure
          </div>
          <div style={{ fontSize: "9.5px", color: "#7a695e" }}>
            256-Bit SSL Encrypted
          </div>
        </div>

        {/* Trust 2: Lab-Certified Rudraksha */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "3px",
            background: "#fbf8f3",
            padding: "8px 6px",
            borderRadius: "10px",
            border: "1px solid #f0e6da"
          }}
        >
          <div style={{ color: "#b85d25" }}>
            <Sparkles size={18} strokeWidth={2.2} />
          </div>
          <div style={{ fontSize: "11px", fontWeight: "700", color: "#2b170d", lineHeight: "1.2" }}>
            Lab-Certified
          </div>
          <div style={{ fontSize: "9.5px", color: "#7a695e" }}>
            Original Rudraksha
          </div>
        </div>

        {/* Trust 3: Fast Express Dispatch */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "3px",
            background: "#fbf8f3",
            padding: "8px 6px",
            borderRadius: "10px",
            border: "1px solid #f0e6da"
          }}
        >
          <div style={{ color: "#166534" }}>
            <Truck size={18} strokeWidth={2.2} />
          </div>
          <div style={{ fontSize: "11px", fontWeight: "700", color: "#2b170d", lineHeight: "1.2" }}>
            Fast Delivery
          </div>
          <div style={{ fontSize: "9.5px", color: "#7a695e" }}>
            Dispatched in 24h
          </div>
        </div>
      </div>
    </div>
  );
}
