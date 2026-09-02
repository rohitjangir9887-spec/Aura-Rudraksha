import React from "react";
import { Lock, ArrowRight, Loader2, Sparkles } from "lucide-react";
import { money } from "../../data";

export function CheckoutStickyFooter({
  finalTotal,
  totalSavings,
  loading,
  onPlaceOrder
}) {
  return (
    <div 
      id="checkout-sticky-footer"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        background: "#ffffff",
        borderTop: "1px solid #e8dac9",
        boxShadow: "0 -4px 20px rgba(43, 23, 13, 0.1)",
        zIndex: 1000,
        padding: "10px 16px",
        paddingBottom: "calc(10px + env(safe-area-inset-bottom, 0px))"
      }}
      className="checkout-sticky-bar"
    >
      <div 
        style={{
          maxWidth: "760px",
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px"
        }}
      >
        {/* Left Side: Price & Savings */}
        <div>
          <div style={{ fontSize: "11px", color: "#806f62", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Total to Pay
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
            <span style={{ fontSize: "20px", fontWeight: "800", color: "#2b170d" }}>
              {money(finalTotal)}
            </span>
            {totalSavings > 0 && (
              <span 
                style={{
                  fontSize: "10.5px",
                  fontWeight: "700",
                  color: "#166534",
                  background: "#eef6f0",
                  padding: "1px 6px",
                  borderRadius: "4px"
                }}
              >
                Saved {money(totalSavings)}
              </span>
            )}
          </div>
        </div>

        {/* Right Side: Place Order Button */}
        <button
          type="button"
          id="btn-sticky-place-order"
          disabled={loading}
          onClick={onPlaceOrder}
          style={{
            background: loading ? "#a05b38" : "linear-gradient(135deg, #a54d2b 0%, #7c3114 100%)",
            color: "#ffffff",
            border: "none",
            borderRadius: "10px",
            padding: "12px 22px",
            fontSize: "14.5px",
            fontWeight: "700",
            cursor: loading ? "wait" : "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            boxShadow: "0 4px 12px rgba(165, 77, 43, 0.3)",
            transition: "all 0.2s",
            flexShrink: 0
          }}
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Launching Gateway...</span>
            </>
          ) : (
            <>
              <span>Pay Now</span>
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </div>

      <div 
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: "12px",
          marginTop: "6px",
          fontSize: "10px",
          color: "#806f62"
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "3px" }}>
          <Lock size={10} color="#166534" /> 256-Bit SSL Encrypted
        </span>
        <span>•</span>
        <span>🚚 Fast Dispatch</span>
        <span>•</span>
        <span>↩ 7-Day Returns</span>
      </div>
    </div>
  );
}
