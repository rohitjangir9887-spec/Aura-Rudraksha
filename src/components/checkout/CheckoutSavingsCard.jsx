import React from "react";
import { Sparkles, CheckCircle2, Truck } from "lucide-react";
import { money } from "../../data";

export function CheckoutSavingsCard({ 
  totalMrp, 
  subtotal, 
  totalSavings, 
  couponDiscount, 
  freeShippingThreshold = 0 
}) {
  const isFreeShipping = subtotal >= freeShippingThreshold;
  const shortfall = Math.max(0, freeShippingThreshold - subtotal);
  const progressPercent = Math.min(100, Math.round((subtotal / freeShippingThreshold) * 100));

  const totalOrderSavings = Math.max(0, totalSavings + (couponDiscount || 0));

  return (
    <div 
      id="checkout-savings-card"
      style={{
        background: "linear-gradient(135deg, #f3faef 0%, #ffffff 100%)",
        border: "1px solid #cce8d0",
        borderRadius: "12px",
        padding: "14px 16px",
        marginBottom: "16px",
        boxShadow: "0 2px 8px rgba(32, 169, 90, 0.06)"
      }}
    >
      {/* Top Banner: Total Savings */}
      {totalOrderSavings > 0 ? (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
          <div 
            style={{
              width: "26px",
              height: "26px",
              borderRadius: "50%",
              background: "#dcf4e2",
              color: "#166534",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0
            }}
          >
            <Sparkles size={14} />
          </div>
          <div>
            <div style={{ fontSize: "13px", fontWeight: "700", color: "#166534" }}>
              🎉 Great Choice! You are saving {money(totalOrderSavings)} on this order
            </div>
            {totalMrp > subtotal && (
              <div style={{ fontSize: "11px", color: "#4b6351", marginTop: "1px" }}>
                Total MRP: <del>{money(totalMrp)}</del> • Deal Price: <b style={{ color: "#2b170d" }}>{money(subtotal)}</b>
                {couponDiscount > 0 && ` • Extra Coupon Savings: ${money(couponDiscount)}`}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
          <Sparkles size={16} color="#166534" />
          <span style={{ fontSize: "13px", fontWeight: "700", color: "#166534" }}>
            Sacred Rudraksha Direct from Authentic Source
          </span>
        </div>
      )}

      {/* Free Shipping Progress Indicator */}
      <div 
        style={{
          background: "#ffffff",
          border: "1px solid #e2ece3",
          borderRadius: "8px",
          padding: "8px 12px",
          marginTop: "6px"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px", fontSize: "11.5px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "5px", color: isFreeShipping ? "#15803d" : "#5a4032", fontWeight: "600" }}>
            {isFreeShipping ? <CheckCircle2 size={14} color="#15803d" /> : <Truck size={14} color="#b85d25" />}
            <span>
              {isFreeShipping 
                ? "FREE Express Delivery Unlocked!" 
                : `Add ${money(shortfall)} more for FREE Delivery`}
            </span>
          </div>
          <span style={{ fontSize: "11px", fontWeight: "700", color: isFreeShipping ? "#15803d" : "#806f62" }}>
            {isFreeShipping ? "FREE" : `${progressPercent}%`}
          </span>
        </div>

        <div 
          style={{
            height: "6px",
            background: "#ebe4da",
            borderRadius: "99px",
            overflow: "hidden",
            position: "relative"
          }}
        >
          <div 
            style={{
              height: "100%",
              width: `${progressPercent}%`,
              background: isFreeShipping ? "linear-gradient(90deg, #20a95a, #16a34a)" : "linear-gradient(90deg, #b85d25, #c88a3d)",
              borderRadius: "99px",
              transition: "width 0.4s ease"
            }}
          />
        </div>
      </div>
    </div>
  );
}
