import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gift, X, Copy, Check, Clock } from "lucide-react";
import { useActiveOffer } from "../hooks/useActiveOffer";

/**
 * Scroll-based Floating Offer UI for Product Detail page
 */
export function FloatingOffer({ product = null, hasStickyBar = false }) {
  const { offer, isActive, timeLeft, copyCoupon } = useActiveOffer(product);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [copied, setCopied] = useState(false);

  const scrollThreshold = Number(offer?.scrollTrigger) || 380;

  // Check session dismissal state
  useEffect(() => {
    try {
      const isDismissed = sessionStorage.getItem("aura_floating_offer_dismissed");
      if (isDismissed === "true") {
        setDismissed(true);
      }
    } catch (_) {}
  }, []);

  // Monitor scroll position
  useEffect(() => {
    if (!isActive || dismissed || offer?.floatingEnabled === false) {
      setVisible(false);
      return;
    }

    const handleScroll = () => {
      const scrollY = window.scrollY || window.pageYOffset;
      if (scrollY >= scrollThreshold && !dismissed) {
        setVisible(true);
      } else if (scrollY < scrollThreshold - 100) {
        setVisible(false);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // Initial check

    return () => window.removeEventListener("scroll", handleScroll);
  }, [isActive, dismissed, scrollThreshold, offer?.floatingEnabled]);

  if (!isActive || dismissed || offer.floatingEnabled === false) return null;

  const handleDismiss = (e) => {
    e.stopPropagation();
    setDismissed(true);
    setVisible(false);
    try {
      sessionStorage.setItem("aura_floating_offer_dismissed", "true");
    } catch (_) {}
  };

  const handleCopy = (e) => {
    copyCoupon(e);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const title = offer.title || "₹200 OFF";
  const subtitle = offer.subtitle || "Limited Time Offer";
  const code = offer.couponCode || "";
  const hasTimer = offer.timerEnabled !== false && !timeLeft.isExpired;

  const bgColor = offer.backgroundColor || "#2b170d";
  const textColor = offer.textColor || "#fbf5ef";
  const accentColor = offer.accentColor || "#c89b3c";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className={`aura-floating-offer ${hasStickyBar ? "has-sticky-bar" : ""}`}
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.28, ease: "easeOut" }}
          style={{
            backgroundColor: bgColor,
            color: textColor,
            borderColor: `${accentColor}50`
          }}
          onClick={handleCopy}
        >
          <button 
            type="button" 
            className="floating-offer-close"
            onClick={handleDismiss}
            aria-label="Dismiss Offer"
          >
            <X size={14} />
          </button>

          <div className="floating-offer-body">
            <div className="floating-gift-icon" style={{ background: `${accentColor}25`, color: accentColor }}>
              <Gift size={18} />
            </div>

            <div className="floating-content">
              <div className="floating-header">
                <span className="floating-title" style={{ color: accentColor }}>
                  {title}
                </span>
                <span className="floating-sub">{subtitle}</span>
              </div>

              {code && (
                <div className="floating-code-row">
                  <span className="floating-code-chip" style={{ background: "rgba(255,255,255,0.12)", color: textColor, borderColor: accentColor }}>
                    Code: <strong>{code}</strong>
                  </span>
                  <span className="floating-copy-action" style={{ color: copied ? "#16a34a" : accentColor }}>
                    {copied ? <><Check size={12}/> Copied</> : <><Copy size={12}/> Click to copy</>}
                  </span>
                </div>
              )}

              {hasTimer && (
                <div className="floating-countdown" style={{ color: `${textColor}aa` }}>
                  <Clock size={11} />
                  <span>Ends: <strong>{timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s</strong></span>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
