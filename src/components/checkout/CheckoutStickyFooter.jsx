import React from "react";
import { Lock } from "lucide-react";
import { money } from "../../data";
import { PlaceOrderButton } from "./PlaceOrderButton";

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
            Payable via PayU
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
        <div style={{ flexShrink: 0, minWidth: "160px" }}>
          <PlaceOrderButton
            id="btn-sticky-place-order"
            loading={loading}
            onClick={onPlaceOrder}
            variant="sticky"
            ctaText="Pay with PayU"
          />
        </div>
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
          <Lock size={10} color="#166534" /> 256-Bit SSL PayU Live Encrypted
        </span>
        <span>•</span>
        <span>🚚 Priority Nepal Dispatch</span>
        <span>•</span>
        <span>↩ 7-Day Returns</span>
      </div>
    </div>
  );
}
