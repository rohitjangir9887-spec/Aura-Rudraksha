const fs = require('fs');

let jsx = fs.readFileSync('src/components/TopOfferStrip.jsx', 'utf8');
const newJsx = `import React, { useState, useEffect } from 'react';
import { db, onStoreUpdate } from '../lib/db';
import { emitToast } from '../context/ToastContext';
import { motion } from 'framer-motion';

export function TopOfferStrip({ isHome }) {
  const [topOffer, setTopOffer] = useState(null);
  const [timeLeft, setTimeLeft] = useState({ d: 0, h: 0, m: 0, s: 0, expired: false });

  const loadOffer = () => {
    if (!isHome) {
      setTopOffer(null);
      return;
    }
    const allOffers = db.getOffers().filter(o => {
      if (o.offerType === 'badge') return false;
      if (o.status !== 'Active') return false;
      if (o.shownOn && o.shownOn !== 'Home Banner') return false;
      if (o.startDate && new Date(o.startDate) > new Date()) return false;
      return true;
    });
    const activeBanner = allOffers.sort((a,b) => (a.order || 0) - (b.order || 0))[0];
    
    if (activeBanner) {
      if (activeBanner.expiry && new Date(activeBanner.expiry) < new Date()) {
        setTopOffer(null);
      } else {
        setTopOffer(activeBanner);
      }
    } else {
      setTopOffer(null);
    }
  };

  useEffect(() => {
    loadOffer();
    const unsub = onStoreUpdate(() => {
      loadOffer();
    });
    return () => unsub();
  }, [isHome]);

  useEffect(() => {
    if (!topOffer || !topOffer.expiry) return;
    const calculateTime = () => {
      const now = new Date().getTime();
      const target = new Date(topOffer.expiry).getTime();
      const diff = target - now;
      if (diff <= 0) {
        setTimeLeft({ d: 0, h: 0, m: 0, s: 0, expired: true });
        setTopOffer(null);
        return;
      }
      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft({ d, h, m, s, expired: false });
    };
    calculateTime();
    const timer = setInterval(calculateTime, 1000);
    return () => clearInterval(timer);
  }, [topOffer]);

  if (!topOffer || !isHome) return null;

  const handleCopy = () => {
    if (topOffer.couponCode) {
      navigator.clipboard.writeText(topOffer.couponCode);
      emitToast("Coupon copied", "success");
    }
  };

  // If user hasn't explicitly customized, we default to the bright yellow theme
  const bgColor = topOffer.bgColor && topOffer.bgColor !== '#5a2e1d' ? topOffer.bgColor : '#fde047';
  const textColor = topOffer.textColor && topOffer.textColor !== '#fbf5ef' ? topOffer.textColor : '#111111';

  return (
    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.4, ease: "easeOut" }} className="premium-top-strip" style={{ background: bgColor, color: textColor }}>
      <div className="premium-top-strip-inner">
        <div className="strip-offer-content">
          <div className="strip-coupon-wrapper">
             {topOffer.discountText && <span className="strip-discount-badge">{topOffer.discountText}</span>}
             {topOffer.couponCode && (
               <button className="strip-coupon-btn" onClick={handleCopy} aria-label="Copy Coupon Code" style={{ color: textColor, borderColor: textColor }}>
                 Code : {topOffer.couponCode}
               </button>
             )}
          </div>
        </div>
        
        {topOffer.expiry && !timeLeft.expired && (
          <div className="strip-countdown">
            <div className="strip-time-block"><b>{String(timeLeft.d).padStart(2, '0')}</b><span>DAY</span></div>
            <div className="strip-time-sep" style={{ color: textColor }}>:</div>
            <div className="strip-time-block"><b>{String(timeLeft.h).padStart(2, '0')}</b><span>HRS</span></div>
            <div className="strip-time-sep" style={{ color: textColor }}>:</div>
            <div className="strip-time-block"><b>{String(timeLeft.m).padStart(2, '0')}</b><span>MIN</span></div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
`;
fs.writeFileSync('src/components/TopOfferStrip.jsx', newJsx);

let css = fs.readFileSync('src/styles.css', 'utf8');

// replace the old top strip css
const oldCssStart = css.indexOf('/* ==========================================================================');
// We need to specifically replace the PREMIUM PROMOTIONAL TOP STRIP section.
const oldRegex = /\/\*\s*==========================================================================\s*PREMIUM PROMOTIONAL TOP STRIP[\s\S]*?@media\(max-width: 768px\) \{[\s\S]*?\}\s*\}/;

const newCss = `/* ==========================================================================
   PREMIUM PROMOTIONAL TOP STRIP
   ========================================================================== */
.premium-top-strip {
  width: 100%;
  font-family: Inter, sans-serif;
  z-index: 100;
  position: relative;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.premium-top-strip-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 14px 16px;
  min-height: 56px;
}

.strip-offer-content {
  display: flex;
  align-items: center;
  flex: 1;
}

.strip-coupon-wrapper {
  position: relative;
  margin-top: 8px; /* Room for badge */
}

.strip-discount-badge {
  position: absolute;
  top: -14px;
  left: 12px;
  background: #15803d; /* Green matching screenshot */
  color: #fff;
  padding: 3px 12px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  letter-spacing: 0.3px;
}

.strip-coupon-btn {
  background: transparent;
  border: 1px solid #111;
  padding: 10px 16px 4px 16px;
  border-radius: 6px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  font-family: 'Cormorant Garamond', serif; /* Serif font like image */
}

.strip-countdown {
  display: flex;
  align-items: center;
  gap: 6px;
}

.strip-time-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.12); /* Darker translucent yellow */
  border-radius: 6px;
  padding: 6px 10px;
  min-width: 44px;
  color: #111;
}

.strip-time-block b {
  font-size: 16px;
  font-weight: 700;
  line-height: 1.1;
}

.strip-time-block span {
  font-size: 9px;
  font-weight: 500;
  color: #222;
  text-transform: uppercase;
  margin-top: 2px;
}

.strip-time-sep {
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 4px;
}

@media(max-width: 600px) {
  .premium-top-strip-inner {
    padding: 12px 10px;
  }
  .strip-discount-badge {
    top: -12px;
    left: 8px;
    padding: 2px 8px;
    font-size: 11px;
  }
  .strip-coupon-btn {
    font-size: 13px;
    padding: 8px 12px 3px 12px;
  }
  .strip-time-block {
    padding: 5px 8px;
    min-width: 36px;
  }
  .strip-time-block b {
    font-size: 14px;
  }
  .strip-time-block span {
    font-size: 8px;
  }
  .strip-time-sep {
    font-size: 14px;
  }
}`;

if (oldRegex.test(css)) {
  css = css.replace(oldRegex, newCss);
  fs.writeFileSync('src/styles.css', css);
  console.log("Updated styles.css with new layout");
} else {
  console.log("Could not find the target CSS block to replace.");
}

