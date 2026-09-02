import React from "react";
import { Gift, ShieldCheck, Sparkles, Copy, Check, Clock } from "lucide-react";
import { useActiveOffer } from "../hooks/useActiveOffer";
import { motion, AnimatePresence } from "framer-motion";

export function ShopOfferBanner() {
  const { offer, isActive, isExpired, timeLeft, copyCoupon } = useActiveOffer();
  const [copied, setCopied] = React.useState(false);

  // If disabled in admin, don't show
  if (!isActive || !offer) {
    return null;
  }

  const offerTitle = offer.title || "Special Offer";
  const couponCode = offer.couponCode || "";
  const subtitle = offer.subtitle || "Limited time sacred festival discount on authentic Nepali rudrakshas.";

  const handleCopy = (e) => {
    copyCoupon(e);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.section 
      className="shop-top-offer-card"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      id="shop-top-offer-banner"
    >
      <div className="shop-offer-glow-accent" />

      {/* Top Tag Row */}
      <div className="shop-offer-top-row">
        <div className="shop-offer-tag">
          <Gift size={13} color="#fde8b7" />
          <span>LIMITED TIME PREMIUM OFFER</span>
        </div>

        {isActive ? (
          <div className="shop-offer-live-pill">
            <span className="shop-offer-pulse-dot" />
            <span>LIVE OFFER</span>
          </div>
        ) : isExpired ? (
          <div className="shop-offer-live-pill" style={{ color: "#f87171" }}>
            <span>EXPIRED</span>
          </div>
        ) : null}
      </div>

      {/* Main Content Area */}
      <div className="shop-offer-main-content">
        <div className="shop-offer-text-block">
          <div className="shop-offer-amount-row">
            <div className="shop-offer-amount">{offerTitle}</div>
            
            {couponCode && (
              <button 
                type="button" 
                className="shop-offer-coupon-chip"
                onClick={handleCopy}
                title="Click to copy coupon code"
                id="shop-copy-coupon-btn"
              >
                {copied ? <Check size={13} color="#4ade80" /> : <Copy size={13} />}
                <span>{couponCode}</span>
                <small>{copied ? "COPIED!" : "TAP TO COPY"}</small>
              </button>
            )}
          </div>
          
          <p className="shop-offer-subtitle">
            {subtitle}
          </p>
        </div>

        {/* Live Countdown Timer Grid */}
        <div className="shop-countdown-container" id="shop-offer-countdown">
          {isActive ? (
            <>
              <div className="shop-countdown-box">
                <span className="shop-countdown-num">{timeLeft.days}</span>
                <span className="shop-countdown-lbl">Days</span>
              </div>
              <span className="shop-countdown-colon">:</span>
              <div className="shop-countdown-box">
                <span className="shop-countdown-num">{timeLeft.hours}</span>
                <span className="shop-countdown-lbl">Hrs</span>
              </div>
              <span className="shop-countdown-colon">:</span>
              <div className="shop-countdown-box">
                <span className="shop-countdown-num">{timeLeft.minutes}</span>
                <span className="shop-countdown-lbl">Mins</span>
              </div>
              <span className="shop-countdown-colon">:</span>
              <div className="shop-countdown-box">
                <span className="shop-countdown-num">{timeLeft.seconds}</span>
                <span className="shop-countdown-lbl">Secs</span>
              </div>
            </>
          ) : (
            <div className="shop-countdown-box" style={{ minWidth: "120px", padding: "8px 12px" }}>
              <span style={{ fontSize: "11px", color: "#f87171", fontWeight: 700 }}>
                Offer Concluded
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Trust Strip */}
      <div className="shop-offer-trust-strip">
        <span className="shop-trust-item">100% AUTHENTIC</span>
        <span className="shop-trust-sep">•</span>
        <span className="shop-trust-item">LAB TESTED</span>
        <span className="shop-trust-sep">•</span>
        <span className="shop-trust-item">FREE SHIPPING</span>
        <span className="shop-trust-sep">•</span>
        <span className="shop-trust-item">SECURE PAYMENT</span>
        <span className="shop-trust-sep">•</span>
        <span className="shop-trust-item">SUPPORT</span>
      </div>
    </motion.section>
  );
}
