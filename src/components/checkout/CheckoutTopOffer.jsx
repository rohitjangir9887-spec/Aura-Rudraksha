import React, { useState } from "react";
import { Tag, Clock, Copy, Check, Sparkles } from "lucide-react";
import { emitToast } from "../../context/ToastContext";
import { useActiveOffer } from "../../hooks/useActiveOffer";

export function CheckoutTopOffer({ activeOffer: propOffer, onApplyCoupon }) {
  const { offer: hookOffer, isActive, isExpired, timeLeft, copyCoupon } = useActiveOffer();
  const [copied, setCopied] = useState(false);

  // Use hook's live offer or fallback to prop
  const offer = hookOffer || propOffer;

  if (!isActive || !offer || offer.enabled === false || offer.status !== "Active" || isExpired) {
    return null;
  }

  const couponCode = offer?.couponCode || "";
  const title = offer?.title || "🎁 Special Festival Discount";
  const subtitle = offer?.subtitle || "Save extra on your sacred spiritual order";
  const hasTimer = offer?.timerEnabled !== false && (offer?.expiresAt || offer?.expiry) && !timeLeft.isExpired;
  const showDays = Number(timeLeft.days) > 0;

  const accentColor = offer?.accentColor || "#c88a3d";
  const textColor = offer?.textColor || "#fff4e6";
  const bgColor = offer?.backgroundColor || "#2b170d";

  const handleApply = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (!couponCode) return;

    copyCoupon(e);
    setCopied(true);

    if (onApplyCoupon) {
      onApplyCoupon(couponCode);
    } else {
      emitToast(`Coupon '${couponCode}' applied!`, "success");
    }

    setTimeout(() => setCopied(false), 2400);
  };

  return (
    <div 
      id="checkout-top-promo"
      onClick={handleApply}
      style={{
        background: `linear-gradient(90deg, #2b170d 0%, #4a2211 50%, #2b170d 100%)`,
        color: textColor,
        padding: "10px 14px",
        borderRadius: "12px",
        marginBottom: "16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "10px",
        cursor: "pointer",
        border: `1px solid ${offer.borderColor || "rgba(200, 138, 61, 0.35)"}`,
        boxShadow: "0 2px 10px rgba(43, 23, 13, 0.12)",
        transition: "transform 0.15s ease"
      }}
      title="Click to apply coupon code"
    >
      {/* Left side: Tag icon + Title + Subtitle + Code */}
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

      {/* Right side: Synchronized Timer + Apply Button */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
        {hasTimer && (
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            {showDays && (
              <>
                <div style={{ background: "rgba(0,0,0,0.35)", padding: "2px 5px", borderRadius: "5px", textAlign: "center", border: "1px solid rgba(255,255,255,0.08)", minWidth: "26px" }}>
                  <b style={{ fontSize: "11px", color: "#fcd34d", display: "block", lineHeight: 1.1, fontWeight: 700 }}>{timeLeft.days}</b>
                  <span style={{ fontSize: "6px", color: accentColor, letterSpacing: "0.5px", display: "block", fontWeight: 600 }}>DAY</span>
                </div>
                <span style={{ color: accentColor, fontWeight: "700", fontSize: "10px" }}>:</span>
              </>
            )}
            <div style={{ background: "rgba(0,0,0,0.35)", padding: "2px 5px", borderRadius: "5px", textAlign: "center", border: "1px solid rgba(255,255,255,0.08)", minWidth: "26px" }}>
              <b style={{ fontSize: "11px", color: "#fcd34d", display: "block", lineHeight: 1.1, fontWeight: 700 }}>{timeLeft.hours}</b>
              <span style={{ fontSize: "6px", color: accentColor, letterSpacing: "0.5px", display: "block", fontWeight: 600 }}>HRS</span>
            </div>
            <span style={{ color: accentColor, fontWeight: "700", fontSize: "10px" }}>:</span>
            <div style={{ background: "rgba(0,0,0,0.35)", padding: "2px 5px", borderRadius: "5px", textAlign: "center", border: "1px solid rgba(255,255,255,0.08)", minWidth: "26px" }}>
              <b style={{ fontSize: "11px", color: "#fcd34d", display: "block", lineHeight: 1.1, fontWeight: 700 }}>{timeLeft.minutes}</b>
              <span style={{ fontSize: "6px", color: accentColor, letterSpacing: "0.5px", display: "block", fontWeight: 600 }}>MIN</span>
            </div>
            <span style={{ color: accentColor, fontWeight: "700", fontSize: "10px" }}>:</span>
            <div style={{ background: "rgba(0,0,0,0.35)", padding: "2px 5px", borderRadius: "5px", textAlign: "center", border: "1px solid rgba(255,255,255,0.08)", minWidth: "26px" }}>
              <b style={{ fontSize: "11px", color: "#fcd34d", display: "block", lineHeight: 1.1, fontWeight: 700 }}>{timeLeft.seconds}</b>
              <span style={{ fontSize: "6px", color: accentColor, letterSpacing: "0.5px", display: "block", fontWeight: 600 }}>SEC</span>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={handleApply}
          style={{
            background: copied ? "#20a95a" : (offer.buttonColor || "#c88a3d"),
            color: "#ffffff",
            border: "none",
            borderRadius: "6px",
            padding: "6px 12px",
            fontSize: "11.5px",
            fontWeight: "700",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "4px",
            transition: "all 0.2s",
            boxShadow: "0 2px 6px rgba(0,0,0,0.2)"
          }}
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          <span>{copied ? "Applied!" : "Apply"}</span>
        </button>
      </div>
    </div>
  );
}
