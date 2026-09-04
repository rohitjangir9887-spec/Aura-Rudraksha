import React from "react";
import { ShieldCheck, Truck, RotateCcw, Lock } from "lucide-react";
import { useCart } from "../../hooks/useCart";

export function CheckoutTrustStrip() {
  const { totals } = useCart();
  const threshold = totals?.freeShippingThreshold ?? 0;

  const trustItems = [
    {
      id: "trust-auth",
      icon: ShieldCheck,
      title: "100% Authentic",
      subtitle: "Lab Certified Beads"
    },
    {
      id: "trust-ship",
      icon: Truck,
      title: "Free Express Delivery",
      subtitle: threshold > 0 ? `Orders Above ₹${threshold}` : "All Orders Across India"
    },
    {
      id: "trust-returns",
      icon: RotateCcw,
      title: "7-Day Easy Returns",
      subtitle: "Hassle-Free Policy"
    },
    {
      id: "trust-security",
      icon: Lock,
      title: "Secure Checkout",
      subtitle: "256-Bit SSL Protected"
    }
  ];

  return (
    <div 
      id="checkout-trust-strip"
      style={{
        background: "#fffdf9",
        border: "1px solid #e8dac9",
        borderRadius: "12px",
        padding: "12px 14px",
        marginBottom: "16px",
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: "10px",
        overflowX: "auto"
      }}
      className="checkout-trust-grid"
    >
      {trustItems.map((item) => {
        const Icon = item.icon;
        return (
          <div 
            key={item.id}
            id={item.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              minWidth: "120px"
            }}
          >
            <div 
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "7px",
                background: "#f7eee3",
                color: "#b85d25",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0
              }}
            >
              <Icon size={16} strokeWidth={2} />
            </div>
            <div style={{ lineHeight: "1.2" }}>
              <div style={{ fontSize: "11px", fontWeight: "700", color: "#2b170d", whiteSpace: "nowrap" }}>
                {item.title}
              </div>
              <div style={{ fontSize: "9.5px", color: "#806f62", whiteSpace: "nowrap" }}>
                {item.subtitle}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
