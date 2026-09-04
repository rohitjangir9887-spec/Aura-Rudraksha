import React, { useState } from "react";
import { Lock, ChevronUp, ChevronDown, Loader2, ShieldCheck } from "lucide-react";
import { money } from "../../data";

/**
 * MobileStickyFooter
 * 
 * True mobile-first sticky bottom checkout payment bar:
 * - Total Amount display (e.g. ₹36,950) with "View Details ▴"
 * - High-contrast "Pay Securely →" CTA
 * - Guaranteed visibility with safe-area-inset padding
 * - Smooth collapsible drawer to view subtotal & savings on tap
 */
export function MobileStickyFooter({
  finalTotal = 36950,
  subtotal = 59000,
  savings = 22050,
  itemCount = 1,
  loading = false,
  onPay
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);

  return (
    <>
      {/* Tap-to-expand details drawer for mobile */}
      {detailsOpen && (
        <div 
          className="mobile-sticky-drawer"
          style={{
            position: "fixed",
            bottom: "75px",
            left: 0,
            right: 0,
            background: "#ffffff",
            borderTop: "1.5px solid #ebd9c8",
            padding: "16px 20px",
            boxShadow: "0 -6px 20px rgba(0,0,0,0.12)",
            zIndex: 998,
            animation: "slideUp 0.2s ease"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", paddingBottom: "8px", borderBottom: "1px solid #f0e6da" }}>
            <span style={{ fontSize: "13px", fontWeight: "700", color: "#2b170d" }}>
              Order Breakdown ({itemCount} {itemCount === 1 ? "Item" : "Items"})
            </span>
            <button
              type="button"
              onClick={() => setDetailsOpen(false)}
              style={{ background: "none", border: "none", fontSize: "11px", color: "#99582a", fontWeight: "700", cursor: "pointer" }}
            >
              Close ✕
            </button>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#4a3528", marginBottom: "6px" }}>
            <span>Subtotal</span>
            <span>{money(subtotal)}</span>
          </div>

          {savings > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#166534", marginBottom: "6px" }}>
              <span>Total Savings</span>
              <span>-{money(savings)}</span>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#4a3528", marginBottom: "6px" }}>
            <span>Shipping</span>
            <span style={{ color: "#166534", fontWeight: "700" }}>FREE</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "10.5px", color: "#6e5d50", marginTop: "8px", paddingTop: "6px", borderTop: "1px dashed #ebd9c8" }}>
            <ShieldCheck size={12} color="#16a34a" />
            <span>Securely processed through PayU (256-Bit SSL)</span>
          </div>
        </div>
      )}

      {/* Main Bottom Sticky Bar */}
      <div
        id="checkout-mobile-sticky-bar"
        className="mobile-sticky-checkout-bar"
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: "linear-gradient(180deg, #ffffff 0%, #fdfbf7 100%)",
          borderTop: "1.5px solid #ebd9c8",
          padding: "10px 16px max(12px, env(safe-area-inset-bottom))",
          boxShadow: "0 -4px 16px rgba(43, 23, 13, 0.08)",
          zIndex: 999,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px"
        }}
      >
        {/* Left: Price and Details button */}
        <div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
            <span style={{ fontSize: "11px", color: "#806f62" }}>Total:</span>
            <span style={{ fontSize: "19px", fontWeight: "800", color: "#2b170d" }}>
              {money(finalTotal)}
            </span>
          </div>
          
          <button
            type="button"
            onClick={() => setDetailsOpen(!detailsOpen)}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              fontSize: "10.5px",
              fontWeight: "700",
              color: "#99582a",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "2px"
            }}
          >
            <span>{detailsOpen ? "Hide Details" : "View Details"}</span>
            {detailsOpen ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
          </button>
        </div>

        {/* Right: Payment CTA */}
        <button
          type="button"
          id="btn-mobile-sticky-pay"
          onClick={onPay}
          disabled={loading}
          style={{
            flex: 1,
            maxWidth: "230px",
            background: loading 
              ? "#a07343" 
              : "linear-gradient(135deg, #b88a58 0%, #8c5d2e 100%)",
            color: "#ffffff",
            border: "none",
            borderRadius: "10px",
            padding: "12px 16px",
            fontSize: "14px",
            fontWeight: "700",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            cursor: loading ? "wait" : "pointer",
            boxShadow: "0 3px 10px rgba(184, 138, 88, 0.35)"
          }}
        >
          {loading ? (
            <>
              <Loader2 size={16} className="spin" />
              <span>Processing...</span>
            </>
          ) : (
            <>
              <Lock size={15} />
              <span>Pay Securely →</span>
            </>
          )}
        </button>
      </div>
    </>
  );
}
