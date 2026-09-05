import React from "react";
import { CreditCard, ShieldCheck } from "lucide-react";

export function PaymentMethod() {
  return (
    <div className="aura-ai-order-section">
      <div className="aura-ai-order-section-title">
        <CreditCard size={13} /> Secure Payment Gateway
      </div>
      <div style={{
        padding: "10px 12px",
        borderRadius: "8px",
        border: "1.5px solid #d4a373",
        background: "#fff9f2",
        fontSize: "12px",
        color: "#4a3528"
      }}>
        <div style={{ fontWeight: "700", color: "#2b170d", display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
          <ShieldCheck size={14} color="#166534" /> PayU Hosted Checkout (UPI / Cards / NetBanking)
        </div>
        <div style={{ fontSize: "11px", color: "#7c3114" }}>
          Instant confirmation via GPay, PhonePe, Paytm, RuPay, Visa, Net Banking.
        </div>
      </div>
    </div>
  );
}
