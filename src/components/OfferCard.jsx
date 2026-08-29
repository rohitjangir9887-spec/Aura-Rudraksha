import React, { useState } from "react";
import { Sparkles, Copy, Check, Clock, Tag, ArrowRight } from "lucide-react";
import { useActiveOffer } from "../hooks/useActiveOffer";

/**
 * Premium Offer Card for Product Detail page near price & purchase buttons
 */
export function OfferCard({ product = null }) {
  const { offer, isActive, timeLeft, copyCoupon } = useActiveOffer(product);
  const [copied, setCopied] = useState(false);

  if (!isActive || offer.productPageEnabled === false) return null;

  const handleCopy = (e) => {
    copyCoupon(e);
    setCopied(true);
    setTimeout(() => setCopied(false), 2400);
  };

  const title = offer.title || "₹200 OFF";
  const subtitle = offer.subtitle || "Limited Time Festival Offer";
  const code = offer.couponCode || "";
  const hasTimer = offer.timerEnabled !== false && !timeLeft.isExpired;

  // Custom colors from admin offer configuration
  const bgColor = offer.backgroundColor || "#2b170d";
  const textColor = offer.textColor || "#fbf5ef";
  const accentColor = offer.accentColor || "#c89b3c";
  const borderColor = offer.borderColor || "#4b2614";
  const buttonColor = offer.buttonColor || "#c89b3c";

  return (
    <div 
      className="aura-product-offer-card"
      style={{
        background: `linear-gradient(135deg, ${bgColor} 0%, #1a0c06 100%)`,
        borderColor: borderColor,
        color: textColor
      }}
    >
      <div className="card-top-accent-bar" style={{ background: `linear-gradient(90deg, ${accentColor}, #f5c382, ${accentColor})` }} />

      <div className="card-header-row">
        <div className="card-badge" style={{ background: "rgba(255, 255, 255, 0.1)", color: accentColor, border: `1px solid ${accentColor}40` }}>
          <Sparkles size={13} />
          <span>EXCLUSIVE STORE OFFER</span>
        </div>

        {hasTimer && (
          <div className="card-timer-badge" style={{ color: accentColor }}>
            <Clock size={13} />
            <span>Ends in <strong>{timeLeft.days}d : {timeLeft.hours}h : {timeLeft.minutes}m : {timeLeft.seconds}s</strong></span>
          </div>
        )}
      </div>

      <div className="card-main-content">
        <div className="card-copy">
          <h3 className="card-headline" style={{ color: textColor }}>
            Save Extra <span style={{ color: accentColor }}>{title}</span>
          </h3>
          <p className="card-subtext" style={{ color: `${textColor}cc` }}>
            {subtitle} {code && <>— Use code <strong className="highlight-code" style={{ color: accentColor }}>{code}</strong> at checkout</>}
          </p>
        </div>

        {code && (
          <button 
            type="button" 
            className="card-copy-btn"
            onClick={handleCopy}
            style={{
              backgroundColor: copied ? "#16a34a" : buttonColor,
              color: copied ? "#ffffff" : "#110c08"
            }}
          >
            {copied ? (
              <>
                <Check size={14} strokeWidth={2.5} />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy size={14} strokeWidth={2.5} />
                <span>Copy Code</span>
              </>
            )}
          </button>
        )}
      </div>

      <div className="card-footer-note" style={{ color: `${textColor}99` }}>
        <span>✦ 100% Genuine Lab-Certified Rudraksha • Discount applies during checkout</span>
      </div>
    </div>
  );
}
