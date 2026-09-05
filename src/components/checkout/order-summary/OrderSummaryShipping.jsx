import React from "react";
import { Truck } from "lucide-react";

export function OrderSummaryShipping({ isFreeShipping }) {
  if (!isFreeShipping) return null;

  return (
    <div
      id="order-summary-shipping-unlocked"
      style={{
        background: "#fff9f0",
        border: "1px solid #fae6cb",
        borderRadius: "8px",
        padding: "8px 12px",
        marginTop: "10px",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        fontSize: "11.5px",
        color: "#166534",
        fontWeight: "600"
      }}
    >
      <Truck size={14} color="#166534" strokeWidth={2} />
      <span>
        <b>Free Shipping Unlocked!</b> You saved ₹50 on express delivery.
      </span>
    </div>
  );
}
