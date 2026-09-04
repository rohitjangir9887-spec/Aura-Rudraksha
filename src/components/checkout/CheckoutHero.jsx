import React from "react";
import { ShieldCheck, Award, Truck, RotateCcw, Lock } from "lucide-react";

/**
 * CheckoutHero
 * Premium headline and trust cards for the sacred checkout experience.
 */
export function CheckoutHero() {
  const trustCards = [
    {
      id: "trust-100-auth",
      icon: ShieldCheck,
      title: "100% Authentic",
      subtitle: "Himalayan Origin"
    },
    {
      id: "trust-lab-test",
      icon: Award,
      title: "Lab Tested",
      subtitle: "Govt Certified Card"
    },
    {
      id: "trust-free-ship",
      icon: Truck,
      title: "Free Express Delivery",
      subtitle: "Insured Transit"
    },
    {
      id: "trust-easy-return",
      icon: RotateCcw,
      title: "7-Day Easy Returns",
      subtitle: "Devotee Guarantee"
    },
    {
      id: "trust-secure-pay",
      icon: Lock,
      title: "Secure Checkout",
      subtitle: "PayU 256-Bit SSL"
    }
  ];

  return (
    <div id="checkout-hero-section" style={{ marginBottom: "22px" }}>
      {/* Sacred Headline */}
      <div style={{ textAlign: "left", marginBottom: "18px" }}>
        <div 
          style={{ 
            display: "inline-flex", 
            alignItems: "center", 
            gap: "6px", 
            fontSize: "11px", 
            fontWeight: "700", 
            textTransform: "uppercase", 
            letterSpacing: "1.2px", 
            color: "#99582a",
            marginBottom: "4px"
          }}
        >
          <span style={{ color: "#d4a373" }}>✦</span> Sacred Order Consecration & Dispatch
        </div>
        <h1 
          style={{ 
            fontFamily: '"Cormorant Garamond", serif', 
            fontSize: "36px", 
            fontWeight: "700", 
            color: "#2b170d", 
            margin: "0 0 4px",
            lineHeight: "1.15"
          }}
        >
          Secure Checkout
        </h1>
        <p style={{ fontSize: "14px", color: "#6e5d50", margin: 0 }}>
          Fast & Sacred Rudraksha Order Dispatch
        </p>
      </div>

      {/* 5 High-Trust Cards Row */}
      <div 
        id="checkout-trust-cards-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
          gap: "10px"
        }}
      >
        {trustCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.id}
              style={{
                background: "#ffffff",
                border: "1px solid #ebd9c8",
                borderRadius: "12px",
                padding: "12px 10px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                boxShadow: "0 2px 8px rgba(43, 23, 13, 0.03)",
                transition: "transform 0.2s ease, border-color 0.2s ease"
              }}
            >
              <div 
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  background: "#fbf3eb",
                  color: "#99582a",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "8px",
                  border: "1px solid #ebd9c8"
                }}
              >
                <Icon size={16} strokeWidth={2.2} />
              </div>
              <div style={{ fontSize: "12px", fontWeight: "700", color: "#2b170d", lineHeight: "1.25" }}>
                {card.title}
              </div>
              <div style={{ fontSize: "10.5px", color: "#806f62", marginTop: "2px" }}>
                {card.subtitle}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
