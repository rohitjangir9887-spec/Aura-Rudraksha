import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Gift, Copy, Check, Clock, Sparkles, ArrowRight, ShieldCheck, Flame } from "lucide-react";
import { useActiveOffer } from "../hooks/useActiveOffer";

/**
 * Home Hero / Promotional Offer Banner with live synchronized countdown timer
 * Side-by-side layout: Text, Coupon & CTA on the Left, Compact Photo directly opposite on the Right,
 * and the synchronized Countdown Timer elegantly placed below.
 */
export function HomeHeroOffer() {
  const { offer, isActive, timeLeft, copyCoupon } = useActiveOffer();
  const [copied, setCopied] = useState(false);

  if (!isActive || offer?.heroEnabled === false) return null;

  const handleCopy = (e) => {
    copyCoupon(e);
    setCopied(true);
    setTimeout(() => setCopied(false), 2400);
  };

  const title = offer.title || "Special Offer";
  const subtitle = offer.subtitle || "Limited Time Offer On Certified Rudraksha";
  const code = offer.couponCode || "";
  const hasTimer = offer.timerEnabled !== false && !timeLeft.isExpired;

  const bgColor = offer.backgroundColor || "#261309";
  const textColor = offer.textColor || "#FFFDF9";
  const accentColor = offer.accentColor || "#C89B3C";
  const borderColor = offer.borderColor || "#4D2612";
  const buttonColor = offer.buttonColor || "#C89B3C";

  return (
    <section className="aura-home-hero-offer-section container" aria-label="Special Consecration Offer">
      <div 
        className="aura-home-hero-offer-card"
        style={{
          background: `linear-gradient(135deg, ${bgColor} 0%, #1A0B05 50%, #0F0603 100%)`,
          color: textColor,
          borderColor: borderColor
        }}
      >
        {/* Ambient Decorative Background Accents */}
        <div className="hero-offer-bg-ornament" />
        <div className="hero-offer-glow-radial" />

        {/* Top Main Row: Text & Coupon on Left, Photo directly in front on Right */}
        <div className="hero-offer-main-row">
          
          {/* Left Content Side */}
          <div className="hero-offer-content">
            <div 
              className="hero-offer-badge" 
              style={{ 
                background: `linear-gradient(135deg, rgba(200, 155, 60, 0.22) 0%, rgba(165, 77, 43, 0.22) 100%)`, 
                borderColor: `${accentColor}70`, 
                color: accentColor 
              }}
            >
              <Sparkles size={12} className="animate-pulse" />
              <span>FESTIVAL BLESSINGS &amp; SAVINGS</span>
            </div>

            <div className="hero-offer-title-group">
              <h2 className="hero-offer-heading" style={{ color: textColor }}>
                <span className="gift-emoji">🎁</span> {title}
              </h2>
              <p className="hero-offer-sub" style={{ color: `${textColor}dd` }}>
                {subtitle}
              </p>
            </div>

            {/* Coupon Code Pill & Shop Now Button */}
            {code && (
              <div className="hero-coupon-action-row">
                <div 
                  className="hero-coupon-pill"
                  onClick={handleCopy}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleCopy(e); }}
                  title="Click to copy coupon code"
                  aria-label={`Coupon code ${code}. Click to copy`}
                  style={{
                    background: "rgba(255, 255, 255, 0.08)",
                    borderColor: accentColor,
                    color: textColor
                  }}
                >
                  <div className="coupon-tag-badge">
                    <Flame size={11} fill="#C89B3C" color="#C89B3C" />
                    <span>COUPON</span>
                  </div>
                  <strong className="coupon-code-text" style={{ color: "#FFE8A3" }}>
                    {code}
                  </strong>
                  <button 
                    type="button" 
                    className="hero-copy-btn" 
                    style={{ 
                      backgroundColor: copied ? "#16a34a" : "rgba(200, 155, 60, 0.25)",
                      color: copied ? "#ffffff" : accentColor 
                    }}
                    aria-label="Copy Code Button"
                  >
                    {copied ? (
                      <>
                        <Check size={12} strokeWidth={3} />
                        <span className="copy-state-label">COPIED!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={12} strokeWidth={2.5} />
                        <span className="copy-state-label">COPY</span>
                      </>
                    )}
                  </button>
                </div>

                <Link 
                  to="/shop" 
                  className="hero-shop-now-btn"
                  style={{
                    backgroundColor: buttonColor,
                    color: "#1A0D06"
                  }}
                >
                  <span>Shop Now</span>
                  <ArrowRight size={14} className="hero-btn-arrow" />
                </Link>
              </div>
            )}
          </div>

          {/* Right Compact Photo Side (Directly Opposite / In Front of the Text) */}
          <div className="hero-offer-image-pane">
            <div className="hero-offer-img-halo" />
            <div className="hero-offer-img-box">
              <img 
                src={offer.image || offer.bannerImage || "https://i.ibb.co/xKN0T46x/file-00000000b33082088625dc1f759658a4.png"} 
                alt={title || "Sacred Himalayan Rudraksha Festival Offer"}
                className="hero-offer-img"
                loading="lazy"
                onError={(e) => { 
                  e.currentTarget.src = "/images/product-5mukhi.jpg"; 
                }}
              />
            </div>
            <div className="hero-offer-floating-tag">
              <ShieldCheck size={12} className="hero-floating-icon" />
              <span>Certified Origin</span>
            </div>
          </div>

        </div>

        {/* Bottom Row: Live Synchronized Countdown Timer */}
        {hasTimer && (
          <div className="hero-countdown-block">
            <div className="countdown-header-label" style={{ color: accentColor }}>
              <Clock size={13} />
              <span>OFFER ENDS IN</span>
            </div>
            <div className="hero-countdown-digits">
              <div className="digit-box" style={{ background: "rgba(18, 8, 4, 0.75)", borderColor: `${accentColor}50` }}>
                <span className="digit-val" style={{ color: textColor }}>{timeLeft.days}</span>
                <span className="digit-unit" style={{ color: accentColor }}>DAYS</span>
              </div>
              <span className="digit-colon" style={{ color: accentColor }}>:</span>

              <div className="digit-box" style={{ background: "rgba(18, 8, 4, 0.75)", borderColor: `${accentColor}50` }}>
                <span className="digit-val" style={{ color: textColor }}>{timeLeft.hours}</span>
                <span className="digit-unit" style={{ color: accentColor }}>HRS</span>
              </div>
              <span className="digit-colon" style={{ color: accentColor }}>:</span>

              <div className="digit-box" style={{ background: "rgba(18, 8, 4, 0.75)", borderColor: `${accentColor}50` }}>
                <span className="digit-val" style={{ color: textColor }}>{timeLeft.minutes}</span>
                <span className="digit-unit" style={{ color: accentColor }}>MIN</span>
              </div>
              <span className="digit-colon" style={{ color: accentColor }}>:</span>

              <div className="digit-box" style={{ background: "rgba(18, 8, 4, 0.75)", borderColor: `${accentColor}50` }}>
                <span className="digit-val" style={{ color: textColor }}>{timeLeft.seconds}</span>
                <span className="digit-unit" style={{ color: accentColor }}>SEC</span>
              </div>
            </div>
          </div>
        )}

      </div>
    </section>
  );
}
