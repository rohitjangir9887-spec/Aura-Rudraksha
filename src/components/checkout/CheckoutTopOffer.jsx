import React, { useState } from "react";
import { Tag, Clock, Copy, Check } from "lucide-react";
import { useActiveOffer } from "../../hooks/useActiveOffer";

export function CheckoutTopOffer({ activeOffer: propOffer, onApplyCoupon }) {
  const { offer: hookOffer, isActive, isExpired, timeLeft, copyCoupon } = useActiveOffer();
  const [copied, setCopied] = useState(false);

  // Fall back to hookOffer or propOffer
  const activeOffer = hookOffer || propOffer;

  if ((!isActive && !propOffer?.enabled) || isExpired || !activeOffer) {
    return null;
  }

  const couponCode = activeOffer.couponCode || "";
  const title = activeOffer.title || "🎁 Special Festival Discount";
  const subtitle = activeOffer.subtitle || "Save extra on your sacred spiritual order";
  const hasTimer = activeOffer.timerEnabled !== false && !timeLeft.isExpired && Boolean(activeOffer.expiresAt || activeOffer.expiry || activeOffer.expiryDate);

  const handleApply = (e) => {
    e.stopPropagation();
    if (couponCode) {
      copyCoupon(e);
      setCopied(true);
      if (onApplyCoupon) {
        onApplyCoupon(couponCode);
      }
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div 
      id="checkout-top-promo"
      onClick={handleApply}
      style={{
        background: "linear-gradient(90deg, #3d1b0d 0%, #5d2813 50%, #3d1b0d 100%)",
        color: "#fff4e6",
        padding: "10px 16px",
        borderRadius: "12px",
        marginBottom: "16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "10px",
        cursor: "pointer",
        border: "1px solid rgba(200, 138, 61, 0.3)",
        boxShadow: "0 2px 10px rgba(61, 27, 13, 0.08)"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
        <div 
          style={{
            background: "rgba(200, 138, 61, 0.2)",
            color: "#f5c382",
            width: "32px",
            height: "32px",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0
          }}
        >
          <Tag size={16} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: "13px", fontWeight: "700", color: "#fff4e6", display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
            <span>{title}</span>
            {couponCode && (
              <span style={{ fontSize: "11px", background: "rgba(255,255,255,0.15)", padding: "1px 6px", borderRadius: "4px", color: "#fcd34d", fontWeight: "800", letterSpacing: "0.5px" }}>
                CODE: {couponCode}
              </span>
            )}
          </div>
          <div style={{ fontSize: "11px", color: "#d9c6b3", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
            {subtitle} • Tap to apply
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
        {hasTimer && (
          <div style={{ display: "flex", alignItems: "center", gap: "5px", background: "rgba(0,0,0,0.35)", padding: "4px 8px", borderRadius: "6px", fontSize: "11.5px", color: "#fcd34d", fontWeight: "700", fontFamily: "monospace" }}>
            <Clock size={12} />
            <span>
              {Number(timeLeft.days) > 0 ? `${timeLeft.days}d : ` : ""}
              {timeLeft.hours}:{timeLeft.minutes}:{timeLeft.seconds}
            </span>
          </div>
        )}
        <button
          type="button"
          onClick={handleApply}
          style={{
            background: copied ? "#20a95a" : "#c88a3d",
            color: "#ffffff",
            border: "none",
            borderRadius: "6px",
            padding: "5px 10px",
            fontSize: "11px",
            fontWeight: "700",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "4px",
            transition: "all 0.2s"
          }}
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          <span>{copied ? "Applied" : "Apply"}</span>
        </button>
      </div>
    </div>
  );
}
