import React from "react";
import { ShieldCheck, Sparkles, Truck } from "lucide-react";

export function CheckoutCompactPaymentTrustFooter() {
  return (
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
  );
}
