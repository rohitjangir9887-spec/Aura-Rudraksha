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
      className="checkout-trust-grid"
      style={{
        background: "#fffdf9",
        border: "1px solid #e8dac9",
        borderRadius: "12px",
        padding: "10px 12px",
        marginBottom: "16px",
        display: "grid",
        gap: "10px",
        boxSizing: "border-box",
        width: "100%"
      }}
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
              minWidth: 0,
              boxSizing: "border-box"
            }}
          >
            <div 
              style={{
                width: "26px",
                height: "26px",
                borderRadius: "6px",
                background: "#f7eee3",
                color: "#b85d25",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0
              }}
            >
              <Icon size={15} strokeWidth={2} />
            </div>
            <div style={{ lineHeight: "1.2", minWidth: 0, overflow: "hidden" }}>
              <div style={{ fontSize: "11px", fontWeight: "700", color: "#2b170d", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {item.title}
              </div>
              <div style={{ fontSize: "9.5px", color: "#806f62", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {item.subtitle}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
