import React from "react";
import { CreditCard, Smartphone, Wallet, Landmark } from "lucide-react";

export function CheckoutCompactPaymentLogos() {
  return (
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

      {/* Generic Badges Row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(65px, 1fr))",
          gap: "8px",
          alignItems: "center"
        }}
      >
        {/* UPI */}
        <div
          title="UPI Apps"
          style={{
            background: "#ffffff",
            border: "1px solid #e2d8cd",
            borderRadius: "8px",
            padding: "4px 8px",
            height: "30px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
          }}
        >
          <Smartphone size={14} color="#097939" />
          <span style={{ fontSize: "11px", fontWeight: "700", color: "#3c4043" }}>UPI</span>
        </div>

        {/* Cards */}
        <div
          title="Credit / Debit Cards"
          style={{
            background: "#ffffff",
            border: "1px solid #e2d8cd",
            borderRadius: "8px",
            padding: "4px 8px",
            height: "30px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
          }}
        >
          <CreditCard size={14} color="#1a1f71" />
          <span style={{ fontSize: "11px", fontWeight: "700", color: "#3c4043" }}>Cards</span>
        </div>

        {/* Net Banking */}
        <div
          title="Net Banking"
          style={{
            background: "#ffffff",
            border: "1px solid #e2d8cd",
            borderRadius: "8px",
            padding: "4px 8px",
            height: "30px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
          }}
        >
          <Landmark size={14} color="#b88a58" />
          <span style={{ fontSize: "11px", fontWeight: "700", color: "#3c4043" }}>Banking</span>
        </div>

        {/* Wallets */}
        <div
          title="Digital Wallets"
          style={{
            background: "#ffffff",
            border: "1px solid #e2d8cd",
            borderRadius: "8px",
            padding: "4px 8px",
            height: "30px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
          }}
        >
          <Wallet size={14} color="#5f259f" />
          <span style={{ fontSize: "11px", fontWeight: "700", color: "#3c4043" }}>Wallets</span>
        </div>
      </div>
    </div>
  );
}
