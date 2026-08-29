import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gift, X, Copy, Check, Clock, Sparkles } from "lucide-react";
import { useActiveOffer } from "../hooks/useActiveOffer";

/**
 * Premium Storewide Offer Popup
 */
export function OfferPopup() {
  const { offer, isActive, timeLeft, copyCoupon } = useActiveOffer();
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Check if offer popup is enabled and active
    if (!isActive || offer?.popupEnabled === false) {
      setIsOpen(false);
      return;
    }

    // Check session storage to ensure it only shows once per browser session
    try {
      const shown = sessionStorage.getItem("aura_offer_popup_shown");
      if (shown === "true") return;
    } catch (_) {}

    const delayMs = (Number(offer?.popupDelay) || 10) * 1000;

    const timer = setTimeout(() => {
      setIsOpen(true);
      try {
        sessionStorage.setItem("aura_offer_popup_shown", "true");
      } catch (_) {}
    }, delayMs);

    // Also trigger on scroll if user scrolled past 450px
    const handleScroll = () => {
      const scrollY = window.scrollY || window.pageYOffset;
      if (scrollY > 450) {
        try {
          const shown = sessionStorage.getItem("aura_offer_popup_shown");
          if (!shown) {
            setIsOpen(true);
            sessionStorage.setItem("aura_offer_popup_shown", "true");
          }
        } catch (_) {}
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [isActive, offer?.popupEnabled, offer?.popupDelay]);

  if (!isOpen || !isActive || offer?.popupEnabled === false) return null;

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleCopy = (e) => {
    copyCoupon(e);
    setCopied(true);
    setTimeout(() => setCopied(false), 2400);
  };

  const title = offer.title || "₹200 OFF";
  const subtitle = offer.subtitle || "Limited Time Festival Offer";
  const code = offer.couponCode || "";
  const hasTimer = offer.timerEnabled !== false && !timeLeft.isExpired;

  const bgColor = offer.backgroundColor || "#2b170d";
  const textColor = offer.textColor || "#fbf5ef";
  const accentColor = offer.accentColor || "#c89b3c";
  const buttonColor = offer.buttonColor || "#c89b3c";

  return (
    <AnimatePresence>
      <motion.div
        className="aura-offer-popup-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleClose}
      >
        <motion.div
          className="aura-offer-popup-card"
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          transition={{ duration: 0.28, ease: "easeOut" }}
          style={{
            background: `linear-gradient(145deg, ${bgColor} 0%, #150904 100%)`,
            color: textColor,
            borderColor: `${accentColor}60`
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button 
            type="button" 
            className="popup-close-btn"
            onClick={handleClose}
            aria-label="Close offer popup"
          >
            <X size={18} />
          </button>

          {/* Top Decorative Emblem */}
          <div className="popup-icon-circle" style={{ background: `${accentColor}25`, borderColor: accentColor, color: accentColor }}>
            <Gift size={32} strokeWidth={1.8} />
          </div>

          <div className="popup-label" style={{ color: accentColor }}>
            <Sparkles size={13} />
            <span>LIMITED TIME SACRED OFFER</span>
          </div>

          <h2 className="popup-title" style={{ color: textColor }}>
            {title}
          </h2>

          <p className="popup-subtitle" style={{ color: `${textColor}cc` }}>
            {subtitle}
          </p>

          {hasTimer && (
            <div className="popup-timer-pill" style={{ background: "rgba(0,0,0,0.35)", borderColor: `${accentColor}40`, color: textColor }}>
              <Clock size={14} style={{ color: accentColor }} />
              <span>
                Offer Ends: <strong>{timeLeft.days}d : {timeLeft.hours}h : {timeLeft.minutes}m : {timeLeft.seconds}s</strong>
              </span>
            </div>
          )}

          {code && (
            <div className="popup-coupon-box" style={{ background: "rgba(255,255,255,0.08)", borderColor: accentColor }}>
              <span className="popup-code-label" style={{ color: `${textColor}99` }}>PROMO CODE:</span>
              <strong className="popup-code-val" style={{ color: accentColor }}>{code}</strong>
            </div>
          )}

          {code && (
            <button 
              type="button"
              className="popup-action-btn"
              onClick={handleCopy}
              style={{
                backgroundColor: copied ? "#16a34a" : buttonColor,
                color: copied ? "#ffffff" : "#110c08"
              }}
            >
              {copied ? (
                <>
                  <Check size={16} strokeWidth={2.5} />
                  <span>Coupon Code Copied!</span>
                </>
              ) : (
                <>
                  <Copy size={16} strokeWidth={2.5} />
                  <span>Copy Code & Apply</span>
                </>
              )}
            </button>
          )}

          <span className="popup-disclaimer" style={{ color: `${textColor}80` }}>
            *Apply coupon at checkout for instant discount on authentic lab-tested Rudraksha.
          </span>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
