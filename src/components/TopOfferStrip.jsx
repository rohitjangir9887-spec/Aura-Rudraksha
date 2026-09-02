import React, { useState } from 'react';
import { emitToast } from '../context/ToastContext';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useActiveOffer } from '../hooks/useActiveOffer';

export function TopOfferStrip({ isHome = false, showOnAllPages = true }) {
  const { offer, isActive, isExpired, timeLeft, copyCoupon } = useActiveOffer();
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  if (!isActive || offer?.topStripEnabled === false || isExpired) {
    return null;
  }

  const handleCopyCoupon = (e) => {
    e.stopPropagation();
    if (offer.couponCode) {
      copyCoupon(e);
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    }
  };

  const handleBannerClick = () => {
    if (offer.ctaLink) {
      navigate(offer.ctaLink);
    } else {
      navigate('/shop');
    }
  };

  // Theme defaults matching Aura Rudraksha premium palette
  const bgColor = offer.backgroundColor || '#2b170d';
  const textColor = offer.textColor || '#fbf5ef';
  const offerTextColor = '#f5c382';
  const couponBg = 'rgba(255, 255, 255, 0.12)';
  const couponBorder = offer.accentColor || '#c88a3d';
  const countdownBg = 'rgba(0, 0, 0, 0.3)';
  const countdownNumColor = offer.textColor || '#fbf5ef';
  const countdownLabelColor = offer.accentColor || '#c88a3d';

  let backgroundStyle = { background: bgColor, color: textColor };
  if (offer.backgroundType === 'linear-gradient') {
    backgroundStyle = {
      background: `linear-gradient(135deg, ${offer.gradientColor1 || '#2b170d'}, ${offer.gradientColor2 || '#4b2614'})`,
      color: textColor
    };
  } else {
    backgroundStyle = {
      background: `linear-gradient(90deg, #2b170d 0%, #431f0f 50%, #2b170d 100%)`,
      color: textColor
    };
  }

  const hasTimer = offer.timerEnabled !== false && (offer.expiresAt || offer.expiry) && !timeLeft.isExpired;
  const showDays = Number(timeLeft.days) > 0;

  return (
    <motion.div 
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="top-promo-strip" 
      style={{
        ...backgroundStyle,
        borderBottom: `1px solid ${offer.borderColor || '#4b2614'}`,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
        cursor: 'pointer'
      }}
      onClick={handleBannerClick}
    >
      <div style={{
        maxWidth: '1280px',
        margin: '0 auto',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '4px 4%',
        gap: '12px'
      }}>
        {/* Left Section: Icon + Offer Text + Coupon */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '15px', display: 'flex', alignItems: 'center', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))' }}>
            🎁
          </span>
          <span style={{ fontWeight: '700', color: offerTextColor, letterSpacing: '0.2px', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', fontSize: '13.5px' }}>
            {offer.title || "Special Offer"}
          </span>

          {offer.couponCode && (
            <button 
              className="top-promo-coupon-chip" 
              onClick={handleCopyCoupon}
              title="Click to copy coupon code"
              style={{
                background: copied ? 'rgba(32, 169, 90, 0.25)' : couponBg,
                color: copied ? '#86efac' : textColor,
                border: `1px solid ${copied ? '#20a95a' : couponBorder}`,
                padding: '3px 10px',
                borderRadius: '99px',
                fontSize: '11px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.03)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <span style={{ opacity: 0.8, fontSize: '9px', letterSpacing: '1px' }}>CODE:</span> {offer.couponCode}
              {copied && <span style={{ fontSize: '10px' }}>✓</span>}
            </button>
          )}
        </div>

        {/* Center Section: Subtitle Message (Desktop only) */}
        {offer.subtitle && (
          <div className="top-promo-center-msg" style={{ fontSize: '12px', fontWeight: '500', opacity: 0.92, display: 'flex', alignItems: 'center', letterSpacing: '0.3px', fontStyle: 'italic' }}>
            ✨ {offer.subtitle}
          </div>
        )}

        {/* Right Section: Synchronized Countdown Timer */}
        {hasTimer && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
            {showDays && (
              <>
                <div style={{ background: countdownBg, padding: '3px 7px', borderRadius: '6px', textAlign: 'center', minWidth: '32px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <b style={{ fontSize: '12px', color: countdownNumColor, display: 'block', lineHeight: 1.1, fontWeight: 700 }}>
                    {timeLeft.days}
                  </b>
                  <span style={{ fontSize: '6.5px', color: countdownLabelColor, letterSpacing: '0.8px', display: 'block', marginTop: '2px', fontWeight: 600 }}>DAY</span>
                </div>
                <span style={{ color: countdownLabelColor, fontWeight: '700', fontSize: '11px', opacity: 0.8 }}>:</span>
              </>
            )}

            <div style={{ background: countdownBg, padding: '3px 7px', borderRadius: '6px', textAlign: 'center', minWidth: '32px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <b style={{ fontSize: '12px', color: countdownNumColor, display: 'block', lineHeight: 1.1, fontWeight: 700 }}>
                {timeLeft.hours}
              </b>
              <span style={{ fontSize: '6.5px', color: countdownLabelColor, letterSpacing: '0.8px', display: 'block', marginTop: '2px', fontWeight: 600 }}>HRS</span>
            </div>
            <span style={{ color: countdownLabelColor, fontWeight: '700', fontSize: '11px', opacity: 0.8 }}>:</span>

            <div style={{ background: countdownBg, padding: '3px 7px', borderRadius: '6px', textAlign: 'center', minWidth: '32px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <b style={{ fontSize: '12px', color: countdownNumColor, display: 'block', lineHeight: 1.1, fontWeight: 700 }}>
                {timeLeft.minutes}
              </b>
              <span style={{ fontSize: '6.5px', color: countdownLabelColor, letterSpacing: '0.8px', display: 'block', marginTop: '2px', fontWeight: 600 }}>MIN</span>
            </div>
            <span style={{ color: countdownLabelColor, fontWeight: '700', fontSize: '11px', opacity: 0.8 }}>:</span>

            <div style={{ background: countdownBg, padding: '3px 7px', borderRadius: '6px', textAlign: 'center', minWidth: '32px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <b style={{ fontSize: '12px', color: countdownNumColor, display: 'block', lineHeight: 1.1, fontWeight: 700 }}>
                {timeLeft.seconds}
              </b>
              <span style={{ fontSize: '6.5px', color: countdownLabelColor, letterSpacing: '0.8px', display: 'block', marginTop: '2px', fontWeight: 600 }}>SEC</span>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
