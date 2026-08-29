const fs = require('fs');

// 1. Update JSX Defaults
let jsx = fs.readFileSync('src/components/TopOfferStrip.jsx', 'utf8');
jsx = jsx.replace(
  /const bgColor = topOffer\.bgColor && topOffer\.bgColor !== '#5a2e1d' \? topOffer\.bgColor : '#fde047';/,
  "const bgColor = topOffer.bgColor || '#2b170d';"
);
jsx = jsx.replace(
  /const textColor = topOffer\.textColor && topOffer\.textColor !== '#fbf5ef' \? topOffer\.textColor : '#111111';/,
  "const textColor = topOffer.textColor || '#fbf5ef';"
);

// We should also replace the style injection to use the gradient if they didn't specify a custom color, 
// but since the inline style overrides CSS, let's just use CSS for the default and only apply inline if customized.
jsx = jsx.replace(
  /style=\{\{ background: bgColor, color: textColor \}\}/,
  "style={topOffer.bgColor ? { background: bgColor, color: textColor } : {}}"
);

fs.writeFileSync('src/components/TopOfferStrip.jsx', jsx);
console.log("Updated TopOfferStrip.jsx defaults");

// 2. Update CSS
let css = fs.readFileSync('src/styles.css', 'utf8');

// Replace the strip CSS section
const oldRegex = /\/\*\s*==========================================================================\s*PREMIUM PROMOTIONAL TOP STRIP[\s\S]*?@media\(max-width: 600px\) \{[\s\S]*?\}\s*\}/;

const newCss = `/* ==========================================================================
   PREMIUM PROMOTIONAL TOP STRIP
   ========================================================================== */
.premium-top-strip {
  width: 100%;
  font-family: 'Inter', sans-serif;
  z-index: 100;
  position: relative;
  background: linear-gradient(90deg, #3a2218, #5a2e1d);
  color: #fbf5ef;
  border-bottom: 1px solid rgba(220, 185, 145, 0.2);
}

.premium-top-strip-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 18px 16px 14px 16px;
  min-height: 56px;
}

.strip-offer-content {
  display: flex;
  align-items: center;
  flex: 1;
}

.strip-coupon-wrapper {
  position: relative;
  margin-top: 4px;
}

.strip-discount-badge {
  position: absolute;
  top: -16px;
  left: 8px;
  background: #a54d2b; /* Premium Copper instead of green */
  color: #fff;
  padding: 3px 10px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.strip-coupon-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(229, 184, 135, 0.6); /* Antique gold */
  color: #fbf5ef;
  padding: 10px 14px 4px 14px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  font-family: 'Cormorant Garamond', serif;
  letter-spacing: 0.5px;
  transition: all 0.2s ease;
}

.strip-coupon-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: #e5b887;
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
  background: rgba(229, 184, 135, 0.15); /* Soft translucent gold */
  border: 1px solid rgba(229, 184, 135, 0.1);
  border-radius: 6px;
  padding: 5px 10px;
  min-width: 44px;
  color: #fff;
}

.strip-time-block b {
  font-size: 15px;
  font-weight: 700;
  line-height: 1.1;
  color: #fdf5ef;
}

.strip-time-block span {
  font-size: 8px;
  font-weight: 600;
  color: #e5b887; /* Gold accent */
  text-transform: uppercase;
  margin-top: 2px;
  letter-spacing: 0.5px;
}

.strip-time-sep {
  font-size: 16px;
  font-weight: bold;
  color: rgba(229, 184, 135, 0.5);
  margin-bottom: 2px;
}

@media(max-width: 600px) {
  .premium-top-strip-inner {
    padding: 16px 12px 12px 12px;
  }
  .strip-discount-badge {
    top: -14px;
    left: 8px;
    padding: 2px 8px;
    font-size: 9px;
  }
  .strip-coupon-btn {
    font-size: 12px;
    padding: 8px 10px 3px 10px;
  }
  .strip-time-block {
    padding: 4px 6px;
    min-width: 32px;
  }
  .strip-time-block b {
    font-size: 13px;
  }
  .strip-time-block span {
    font-size: 7px;
  }
  .strip-time-sep {
    font-size: 14px;
  }
}`;

if (oldRegex.test(css)) {
  css = css.replace(oldRegex, newCss);
  fs.writeFileSync('src/styles.css', css);
  console.log("Updated styles.css with Premium Aura Rudraksha layout");
} else {
  console.log("Could not find the target CSS block to replace.");
}
