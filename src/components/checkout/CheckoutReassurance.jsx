import React from "react";
import { ShieldCheck, Zap, MessageCircle } from "lucide-react";

export function CheckoutReassurance({ supportPhone = "+91 9672996531" }) {
  const waClean = supportPhone.replace(/[^0-9]/g, "");

  return (
    <div 
      id="checkout-reassurance"
      style={{
        background: "linear-gradient(135deg, #fdfaf6 0%, #f7eee3 100%)",
        border: "1px solid #e8dac9",
        borderRadius: "14px",
        padding: "14px 16px",
        marginBottom: "20px"
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <ShieldCheck size={18} color="#166534" style={{ flexShrink: 0 }} />
          <div style={{ fontSize: "12px", color: "#352015" }}>
            <b>Authenticity Certificate Included:</b> Every bead is lab certified & energized.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Zap size={18} color="#b85d25" style={{ flexShrink: 0 }} />
          <div style={{ fontSize: "12px", color: "#352015" }}>
            <b>Express Dispatch in 24h:</b> Track real-time via WhatsApp notifications.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <MessageCircle size={18} color="#20a95a" style={{ flexShrink: 0 }} />
          <div style={{ fontSize: "12px", color: "#352015" }}>
            <b>Need Assistance?</b> WhatsApp us at{" "}
            <a 
              href={`https://wa.me/${waClean}?text=Hello%20Aura%20Rudraksha%20Team%2C%20I%20have%20a%20question%20regarding%20my%20checkout`} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ color: "#166534", fontWeight: "700", textDecoration: "underline" }}
            >
              {supportPhone}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
