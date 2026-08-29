import React, { useState, useEffect } from "react";
import { Tag, Clock, Copy, Check } from "lucide-react";
import { emitToast } from "../../context/ToastContext";

export function CheckoutTopOffer({ activeOffer, onApplyCoupon }) {
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);

  const couponCode = activeOffer?.couponCode || "";
  const title = activeOffer?.title || "🎁 Special Festival Discount";
  const subtitle = activeOffer?.subtitle || "Save extra on your sacred spiritual order";
  const hasTimer = activeOffer?.timerEnabled && (activeOffer?.expiresAt || activeOffer?.expiry);

  if (!activeOffer?.enabled || activeOffer?.status === "Inactive" || activeOffer?.status === "Disabled") {
    return null;
  }

  useEffect(() => {
    if (!hasTimer) return;
    const expiry = new Date(activeOffer.expiresAt || activeOffer.expiry).getTime();

    const updateTimer = () => {
      const now = Date.now();
      const diff = expiry - now;
      if (diff <= 0) {
        setTimeLeft(null);
        return;
      }
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft({ hours, mins, secs });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [hasTimer, activeOffer?.expiresAt, activeOffer?.expiry]);

  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(couponCode);
    setCopied(true);
    emitToast(`Coupon code '${couponCode}' copied!`, "success");
    if (onApplyCoupon) {
      onApplyCoupon(couponCode);
    }
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div 
      id="checkout-top-promo"
      onClick={handleCopy}
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
            <span style={{ fontSize: "11px", background: "rgba(255,255,255,0.15)", padding: "1px 6px", borderRadius: "4px", color: "#fcd34d", fontWeight: "800", letterSpacing: "0.5px" }}>
              CODE: {couponCode}
            </span>
          </div>
          <div style={{ fontSize: "11px", color: "#d9c6b3", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
            {subtitle} • Tap to apply
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
        {timeLeft && (
          <div style={{ display: "flex", alignItems: "center", gap: "4px", background: "rgba(0,0,0,0.3)", padding: "4px 8px", borderRadius: "6px", fontSize: "11px", color: "#fcd34d" }}>
            <Clock size={12} />
            <span>{String(timeLeft.hours).padStart(2, "0")}:{String(timeLeft.mins).padStart(2, "0")}:{String(timeLeft.secs).padStart(2, "0")}</span>
          </div>
        )}
        <button
          type="button"
          onClick={handleCopy}
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
          <span>{copied ? "Copied" : "Apply"}</span>
        </button>
      </div>
    </div>
  );
}
