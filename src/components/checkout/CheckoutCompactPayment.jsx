import React from "react";
import { Lock, ArrowRight, Loader2, Banknote, CreditCard, CheckCircle2, Truck } from "lucide-react";
import { motion } from "framer-motion";
import { money } from "../../data";
import { CheckoutCompactPaymentLogos } from "./CheckoutCompactPaymentLogos";
import { CheckoutCompactPaymentTrustFooter } from "./CheckoutCompactPaymentTrustFooter";

export function CheckoutCompactPayment({
  finalTotal = 0,
  loading = false,
  onPayNow,
  disabled = false,
  totalSavings = 0,
  paymentMethod = "ONLINE",
  onSelectPaymentMethod,
  enableCod = true,
  enableOnlinePayment = true,
  codFee = 0
}) {
  const isCodSelected = paymentMethod === "COD";
  const isOnlineSelected = paymentMethod === "ONLINE";
  const numericCodFee = Number(codFee) || 0;
  const noPaymentMethodsEnabled = !enableCod && !enableOnlinePayment;

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
              Select Payment Method (भुगतान का तरीका चुनें)
            </h2>
            <div style={{ fontSize: "11px", color: "#806f62", marginTop: "1px" }}>
              Choose Online Payment or Cash on Delivery (COD)
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
          <span>100% Safe & Verified</span>
        </div>
      </div>

      {/* 2. PAYMENT METHOD SELECTOR: ONLINE PAYMENT vs CASH ON DELIVERY (COD) */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          marginBottom: "14px"
        }}
      >
        {/* Option A: Online Payment (UPI, GPay, PhonePe, Cards, NetBanking) */}
        {enableOnlinePayment && (
          <div
            role="button"
            tabIndex={0}
            onClick={() => !loading && onSelectPaymentMethod && onSelectPaymentMethod("ONLINE")}
            onKeyDown={(e) => {
              if ((e.key === "Enter" || e.key === " ") && !loading && onSelectPaymentMethod) {
                e.preventDefault();
                onSelectPaymentMethod("ONLINE");
              }
            }}
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: "12px",
              padding: "13px 14px",
              borderRadius: "12px",
              border: isOnlineSelected ? "2px solid #b88a58" : "1.5px solid #e6d7c8",
              background: isOnlineSelected
                ? "linear-gradient(135deg, #fdf8f2 0%, #f9efe4 100%)"
                : "#fcfaf8",
              cursor: loading ? "wait" : "pointer",
              transition: "all 0.2s ease",
              boxShadow: isOnlineSelected ? "0 4px 12px rgba(184, 138, 88, 0.14)" : "none"
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", flex: 1, minWidth: 0 }}>
              <div
                style={{
                  width: "20px",
                  height: "20px",
                  borderRadius: "50%",
                  border: isOnlineSelected ? "6px solid #9d5a2b" : "2px solid #bfa893",
                  background: "#ffffff",
                  marginTop: "2px",
                  flexShrink: 0,
                  boxSizing: "border-box"
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "7px", flexWrap: "wrap" }}>
                  <CreditCard size={16} color="#9d5a2b" />
                  <span style={{ fontSize: "14.5px", fontWeight: "800", color: "#2b170d" }}>
                    Pay Online (UPI / GPay / PhonePe / Cards)
                  </span>
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: "800",
                      background: "#166534",
                      color: "#ffffff",
                      padding: "2px 7px",
                      borderRadius: "99px",
                      letterSpacing: "0.3px",
                      textTransform: "uppercase"
                    }}
                  >
                    Fastest Dispatch
                  </span>
                </div>
                <div style={{ fontSize: "12px", color: "#6e5a4c", marginTop: "3px", lineHeight: "1.35" }}>
                  Instant confirmation via PayU • UPI, Credit/Debit Cards, NetBanking • Zero extra fee
                </div>
              </div>
            </div>
            {isOnlineSelected && (
              <CheckCircle2 size={18} color="#9d5a2b" style={{ flexShrink: 0, marginTop: "2px" }} />
            )}
          </div>
        )}

        {/* Option B: Cash on Delivery (COD) */}
        {enableCod && (
          <div
            role="button"
            tabIndex={0}
            onClick={() => !loading && onSelectPaymentMethod && onSelectPaymentMethod("COD")}
            onKeyDown={(e) => {
              if ((e.key === "Enter" || e.key === " ") && !loading && onSelectPaymentMethod) {
                e.preventDefault();
                onSelectPaymentMethod("COD");
              }
            }}
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: "12px",
              padding: "13px 14px",
              borderRadius: "12px",
              border: isCodSelected ? "2px solid #166534" : "1.5px solid #e6d7c8",
              background: isCodSelected
                ? "linear-gradient(135deg, #f2fbf5 0%, #e5f7ec 100%)"
                : "#fcfaf8",
              cursor: loading ? "wait" : "pointer",
              transition: "all 0.2s ease",
              boxShadow: isCodSelected ? "0 4px 12px rgba(22, 101, 52, 0.12)" : "none"
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", flex: 1, minWidth: 0 }}>
              <div
                style={{
                  width: "20px",
                  height: "20px",
                  borderRadius: "50%",
                  border: isCodSelected ? "6px solid #166534" : "2px solid #bfa893",
                  background: "#ffffff",
                  marginTop: "2px",
                  flexShrink: 0,
                  boxSizing: "border-box"
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "7px", flexWrap: "wrap" }}>
                  <Banknote size={16} color="#166534" />
                  <span style={{ fontSize: "14.5px", fontWeight: "800", color: "#2b170d" }}>
                    Cash on Delivery (COD / कैश ऑन डिलीवरी)
                  </span>
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: "800",
                      background: numericCodFee > 0 ? "#b45309" : "#15803d",
                      color: "#ffffff",
                      padding: "2px 7px",
                      borderRadius: "99px",
                      letterSpacing: "0.3px",
                      textTransform: "uppercase"
                    }}
                  >
                    {numericCodFee > 0 ? `+ ${money(numericCodFee)} COD Fee` : "FREE COD"}
                  </span>
                </div>
                <div style={{ fontSize: "12px", color: "#4d5e52", marginTop: "3px", lineHeight: "1.35" }}>
                  Pay by Cash or UPI at your doorstep when your consecrated Rudraksha arrives
                </div>
              </div>
            </div>
            {isCodSelected && (
              <CheckCircle2 size={18} color="#166534" style={{ flexShrink: 0, marginTop: "2px" }} />
            )}
          </div>
        )}

        {noPaymentMethodsEnabled && (
          <div
            style={{
              padding: "12px",
              borderRadius: "10px",
              background: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#991b1b",
              fontSize: "13px",
              fontWeight: "600",
              textAlign: "center"
            }}
          >
            Checkout is temporarily paused by store administrator. Please try again shortly.
          </div>
        )}
      </div>

      {/* 3. PAYMENT LOGOS ABOVE PAY NOW BUTTON */}
      {isOnlineSelected && <CheckoutCompactPaymentLogos />}

      {/* 4. PRIMARY ACTION BUTTON (DYNAMIC FOR ONLINE OR COD) */}
      <motion.button
        type="button"
        id="btn-checkout-pay-now-main"
        disabled={disabled || loading || noPaymentMethodsEnabled}
        onClick={onPayNow}
        whileHover={{ scale: disabled || loading || noPaymentMethodsEnabled ? 1 : 1.01 }}
        whileTap={{ scale: disabled || loading || noPaymentMethodsEnabled ? 1 : 0.99 }}
        style={{
          width: "100%",
          padding: "16px 20px",
          background: isCodSelected
            ? "linear-gradient(135deg, #166534 0%, #14532d 100%)"
            : "linear-gradient(135deg, #b88a58 0%, #8c5d2e 100%)",
          color: "#ffffff",
          border: isCodSelected ? "1px solid #22c55e" : "1px solid #d4a775",
          borderRadius: "14px",
          fontSize: "16.5px",
          fontWeight: "800",
          cursor:
            disabled || loading || noPaymentMethodsEnabled
              ? loading
                ? "wait"
                : "not-allowed"
              : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "10px",
          boxShadow: isCodSelected
            ? "0 6px 20px rgba(22, 101, 52, 0.32)"
            : "0 6px 20px rgba(184, 138, 88, 0.38)",
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          letterSpacing: "0.2px",
          boxSizing: "border-box"
        }}
      >
        {loading ? (
          <>
            <Loader2 size={20} className="spin" color="#ffffff" />
            <span>
              {isCodSelected
                ? "Placing Your COD Order..."
                : "Connecting to PayU Gateway..."}
            </span>
          </>
        ) : isCodSelected ? (
          <>
            <Truck size={19} strokeWidth={2.4} />
            <span>Place COD Order (कैश ऑन डिलीवरी) • {money(finalTotal)}</span>
            <ArrowRight size={18} strokeWidth={2.4} />
          </>
        ) : (
          <>
            <Lock size={18} strokeWidth={2.4} />
            <span>Pay Online Now • {money(finalTotal)}</span>
            <ArrowRight size={18} strokeWidth={2.4} />
          </>
        )}
      </motion.button>

      {/* 5. SECURE PAYMENT GUARANTEE & TRUST ICONS BELOW PAY NOW BUTTON */}
      <CheckoutCompactPaymentTrustFooter />
    </div>
  );
}
