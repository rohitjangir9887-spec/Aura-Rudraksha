import React, { useState, useEffect } from 'react';
import { db, onStoreUpdate } from '../lib/db';
import { emitToast } from '../context/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

export function TopOfferStrip({ isHome = false, showOnAllPages = true }) {
  const [activePromos, setActivePromos] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState({ d: 0, h: 0, m: 0, s: 0, expired: false });
  const navigate = useNavigate();

  const loadPromos = () => {
    const now = new Date().getTime();
    const promos = db.getTopPromos().filter(p => {
      if (!p.enablePromo || p.status === 'Disabled' || p.status === 'Inactive') return false;
      if (p.startDate && new Date(p.startDate).getTime() > now) return false;
      return true;
    }).sort((a, b) => (a.priority || 1) - (b.priority || 1));

    setActivePromos(promos);
  };

  useEffect(() => {
    loadPromos();
    const unsub = onStoreUpdate(() => loadPromos());
    return () => unsub();
  }, []);

  const currentPromo = activePromos[currentIndex] || activePromos[0];

  // Rotation effect if multiple promos and rotation is enabled
  useEffect(() => {
    if (activePromos.length <= 1 || !currentPromo?.rotationEnabled) return;
    const intervalSec = Number(currentPromo.rotationInterval) || 10;
    const timer = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % activePromos.length);
    }, intervalSec * 1000);
    return () => clearInterval(timer);
  }, [activePromos, currentPromo]);

  // Real-time countdown timer
  useEffect(() => {
    if (!currentPromo || !currentPromo.expiry || !currentPromo.enableCountdown) return;

    const calcTime = () => {
      const now = new Date().getTime();
      const target = new Date(currentPromo.expiry).getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft({ d: 0, h: 0, m: 0, s: 0, expired: true });
        loadPromos(); // Reload to remove expired promo
        return;
      }

      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ d, h, m, s, expired: false });
    };

    calcTime();
    const timer = setInterval(calcTime, 1000);
    return () => clearInterval(timer);
  }, [currentPromo]);

  if (!currentPromo) return null;

  const handleCopyCoupon = (e) => {
    e.stopPropagation();
    if (currentPromo.couponCode) {
      navigator.clipboard.writeText(currentPromo.couponCode);
      emitToast("Coupon code copied", "success");
    }
  };

  const handleBannerClick = () => {
    if (currentPromo.clickablePromo && currentPromo.ctaLink) {
      navigate(currentPromo.ctaLink);
    }
  };

  // Theme defaults matching Aura Rudraksha premium palette
  const bgColor = currentPromo.bgColor || '#2b170d';
  const textColor = currentPromo.textColor || '#fbf5ef';
  const offerTextColor = currentPromo.offerTextColor || '#f5c382';
  const couponBg = currentPromo.couponBg || 'rgba(255, 255, 255, 0.12)';
  const couponBorder = currentPromo.couponBorderColor || '#c88a3d';
  const countdownBg = currentPromo.countdownBg || 'rgba(0, 0, 0, 0.25)';
  const countdownNumColor = currentPromo.countdownNumColor || '#fbf5ef';
  const countdownLabelColor = currentPromo.countdownLabelColor || '#c88a3d';

  let backgroundStyle = { background: bgColor, color: textColor };
  if (currentPromo.backgroundType === 'linear-gradient') {
    backgroundStyle = {
      background: `linear-gradient(135deg, ${currentPromo.gradientColor1 || '#2b170d'}, ${currentPromo.gradientColor2 || '#4b2614'})`,
      color: textColor
    };
  } else if (currentPromo.backgroundType === 'radial-gradient') {
    backgroundStyle = {
      background: `radial-gradient(circle, ${currentPromo.gradientColor1 || '#2b170d'}, ${currentPromo.gradientColor2 || '#211109'})`,
      color: textColor
    };
  }

  // Animation variants
  const animProps = currentPromo.animationEnabled ? {
    initial: { opacity: 0, y: -10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
    transition: { duration: 0.35, ease: "easeOut" }
  } : {};

  return (
    <motion.div 
      {...animProps}
      className="top-promo-strip" 
      style={{
        ...backgroundStyle,
        borderBottom: `1px solid ${currentPromo.borderColor || '#4b2614'}`,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)'
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
        padding: '3px 4%',
        gap: '12px'
      }}>
        {/* Left Section: Icon + Offer Text + Coupon */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '15px', display: 'flex', alignItems: 'center', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))' }}>{currentPromo.icon || '🎁'}</span>
          <span style={{ fontWeight: '700', color: offerTextColor, letterSpacing: '0.2px', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', fontSize: '13.5px' }}>
            {currentPromo.offerText}
          </span>

          {currentPromo.couponCode && (
            <button 
              className="top-promo-coupon-chip" 
              onClick={handleCopyCoupon}
              title="Click to copy coupon code"
              style={{
                background: couponBg,
                color: textColor,
                border: `1px solid ${couponBorder}`,
                padding: '4px 12px',
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
              <span style={{ opacity: 0.8, fontSize: '9px', letterSpacing: '1px' }}>CODE:</span> {currentPromo.couponCode}
            </button>
          )}
        </div>

        {/* Center Section: Optional Message (Desktop only) */}
        {currentPromo.optionalMessage && (
          <div className="top-promo-center-msg" style={{ fontSize: '12px', fontWeight: '500', opacity: 0.92, display: 'flex', alignItems: 'center', letterSpacing: '0.3px', fontStyle: 'italic' }}>
            ✨ {currentPromo.optionalMessage}
          </div>
        )}

        {/* Right Section: Countdown Timer */}
        {currentPromo.enableCountdown && currentPromo.expiry && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
             {currentPromo.countdownUnits !== 'MIN_SEC' && (
              <>
                <div style={{ background: countdownBg, padding: '3px 7px', borderRadius: '6px', textAlign: 'center', minWidth: '34px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <b style={{ fontSize: '12px', color: countdownNumColor, display: 'block', lineHeight: 1.1, fontWeight: 700 }}>
                    {String(timeLeft.d).padStart(2, '0')}
                  </b>
                  <span style={{ fontSize: '6.5px', color: countdownLabelColor, letterSpacing: '0.8px', display: 'block', marginTop: '2px', fontWeight: 600 }}>DAY</span>
                </div>
                <span style={{ color: countdownLabelColor, fontWeight: '700', fontSize: '11px', opacity: 0.8 }}>:</span>
              </>
            )}

            <div style={{ background: countdownBg, padding: '3px 7px', borderRadius: '6px', textAlign: 'center', minWidth: '34px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <b style={{ fontSize: '12px', color: countdownNumColor, display: 'block', lineHeight: 1.1, fontWeight: 700 }}>
                {String(timeLeft.h).padStart(2, '0')}
              </b>
              <span style={{ fontSize: '6.5px', color: countdownLabelColor, letterSpacing: '0.8px', display: 'block', marginTop: '2px', fontWeight: 600 }}>HRS</span>
            </div>
            <span style={{ color: countdownLabelColor, fontWeight: '700', fontSize: '11px', opacity: 0.8 }}>:</span>

            <div style={{ background: countdownBg, padding: '3px 7px', borderRadius: '6px', textAlign: 'center', minWidth: '34px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <b style={{ fontSize: '12px', color: countdownNumColor, display: 'block', lineHeight: 1.1, fontWeight: 700 }}>
                {String(timeLeft.m).padStart(2, '0')}
              </b>
              <span style={{ fontSize: '6.5px', color: countdownLabelColor, letterSpacing: '0.8px', display: 'block', marginTop: '2px', fontWeight: 600 }}>MIN</span>
            </div>

            {currentPromo.countdownUnits !== 'DAYS_HRS_MIN' && (
              <>
                <span style={{ color: countdownLabelColor, fontWeight: '700', fontSize: '11px', opacity: 0.8 }}>:</span>
                <div style={{ background: countdownBg, padding: '3px 7px', borderRadius: '6px', textAlign: 'center', minWidth: '34px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <b style={{ fontSize: '12px', color: countdownNumColor, display: 'block', lineHeight: 1.1, fontWeight: 700 }}>
                    {String(timeLeft.s).padStart(2, '0')}
                  </b>
                  <span style={{ fontSize: '6.5px', color: countdownLabelColor, letterSpacing: '0.8px', display: 'block', marginTop: '2px', fontWeight: 600 }}>SEC</span>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
