const fs = require('fs');

let css = fs.readFileSync('src/styles.css', 'utf8');

// 1. Remove all old .premium-offer-badge and .badge combinations.
// We will replace them with proper isolated classes at the end.
css = css.replace(/\.premium-offer-badge\s*\{[\s\S]*?\}/g, '');
css = css.replace(/\.badge, \.premium-offer-badge\s*\{[\s\S]*?\}/g, '');
css = css.replace(/\/\* Badge Style Update - Glassmorphic, Round, Small \*\//g, '');
css = css.replace(/\.premium-top-strip\s*\{[\s\S]*?\}/g, '');
css = css.replace(/\.premium-top-strip-inner\s*\{[\s\S]*?\}/g, '');
css = css.replace(/\.strip-offer-content\s*\{[\s\S]*?\}/g, '');
css = css.replace(/\.strip-gift-icon\s*\{[\s\S]*?\}/g, '');
css = css.replace(/\.strip-discount-text\s*\{[\s\S]*?\}/g, '');
css = css.replace(/\.strip-coupon-btn\s*\{[\s\S]*?\}/g, '');
css = css.replace(/\.strip-countdown\s*\{[\s\S]*?\}/g, '');
css = css.replace(/\.strip-time-block\s*\{[\s\S]*?\}/g, '');
css = css.replace(/\.strip-time-sep\s*\{[\s\S]*?\}/g, '');
css = css.replace(/\.strip-time-block span\s*\{[\s\S]*?\}/g, '');

// The mobile overrides:
css = css.replace(/@media\s*\(max-width:\s*600px\)\s*\{\s*\.premium-top-strip\s*\{[\s\S]*?\}/g, '@media(max-width: 600px){');
// It might be nested or sequential. Let's just strip everything out and append properly.
// I'll append the definitive styles at the very end.

const newStyles = `
/* ==========================================================================
   PREMIUM PROMOTIONAL TOP STRIP
   ========================================================================== */
.premium-top-strip {
  background: linear-gradient(90deg, #3a2218, #5a2e1d);
  color: #fbf5ef;
  width: 100%;
  font-family: Inter, sans-serif;
  z-index: 100;
  position: relative;
  border-bottom: 1px solid rgba(220, 185, 145, 0.2);
}

.premium-top-strip-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 10px 16px;
  min-height: 48px;
}

.strip-offer-content {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
}

@keyframes gentlePulse {
  0% { transform: scale(1); opacity: 0.9; }
  50% { transform: scale(1.15); opacity: 1; }
  100% { transform: scale(1); opacity: 0.9; }
}

@keyframes shimmerEffect {
  0% { background-position: -100% 0; }
  100% { background-position: 200% 0; }
}

.strip-gift-icon {
  color: #e5b887;
  animation: gentlePulse 2s infinite ease-in-out;
  flex-shrink: 0;
}

.strip-discount-text {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.5px;
  color: #fdf5ef;
  white-space: nowrap;
}

.strip-coupon-btn {
  background: rgba(255, 255, 255, 0.1);
  border: 1px dashed rgba(229, 184, 135, 0.5);
  color: #e5b887;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
}
.strip-coupon-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: #e5b887;
}

.strip-countdown {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(0, 0, 0, 0.2);
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid rgba(229, 184, 135, 0.15);
}

.strip-time-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.1;
  color: #fff;
  min-width: 28px;
}

.strip-time-block span {
  font-size: 8px;
  font-weight: 600;
  color: #e5b887;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-top: 2px;
}

.strip-time-sep {
  font-size: 14px;
  font-weight: bold;
  color: rgba(255, 255, 255, 0.5);
  margin-top: -10px;
}

@media(max-width: 768px) {
  .premium-top-strip-inner {
    padding: 12px 12px;
    min-height: auto;
  }
  .strip-discount-text {
    font-size: 12px;
  }
  .strip-coupon-btn {
    font-size: 10px;
    padding: 3px 8px;
  }
  .strip-time-block {
    font-size: 13px;
    min-width: 22px;
  }
  .strip-time-block span {
    font-size: 7px;
  }
}

/* ==========================================================================
   PRODUCT OFFER BADGE (IMAGE BOTTOM-RIGHT)
   ========================================================================== */

@keyframes badgeFloat {
  0% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
  100% { transform: translateY(0); }
}

@keyframes badgeEntrance {
  0% { opacity: 0; transform: scale(0.92) translateY(5px); }
  100% { opacity: 1; transform: scale(1) translateY(0); }
}

.premium-offer-badge-container {
  position: absolute;
  bottom: 12px;
  right: 12px;
  z-index: 10;
  background: #fffdf9;
  border: 1px solid rgba(165, 77, 43, 0.2);
  border-radius: 8px;
  padding: 6px 10px;
  box-shadow: 0 4px 12px rgba(43, 23, 13, 0.12);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  animation: badgeEntrance 0.5s ease-out forwards, badgeFloat 4s ease-in-out infinite 0.5s;
  pointer-events: none; /* Let clicks pass through to product image link */
  text-align: center;
}

@media(max-width: 600px) {
  .premium-offer-badge-container {
    bottom: 8px;
    right: 8px;
    padding: 5px 8px;
    border-radius: 6px;
  }
}

.premium-offer-badge-title {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 800;
  color: #8c2b10;
  white-space: nowrap;
  letter-spacing: 0.2px;
}

@media(max-width: 600px) {
  .premium-offer-badge-title {
    font-size: 9px;
    gap: 3px;
  }
}

.premium-offer-badge-title svg {
  color: #a54d2b;
  animation: gentlePulse 2s infinite ease-in-out;
}

.premium-offer-badge-code {
  font-size: 9px;
  font-weight: 700;
  color: #6f6259;
  background: rgba(165, 77, 43, 0.06);
  padding: 2px 6px;
  border-radius: 4px;
  margin-top: 4px;
  letter-spacing: 0.5px;
  white-space: nowrap;
}

@media(max-width: 600px) {
  .premium-offer-badge-code {
    font-size: 8px;
    padding: 2px 4px;
    margin-top: 3px;
  }
}

/* Base Normal Badge */
.badge {
  position: absolute;
  background: #8c2b10;
  color: #ffffff;
  border-radius: 4px;
  padding: 6px 12px;
  font-size: 11px;
  font-weight: 600;
  top: 10px;
  left: 10px;
  z-index: 10;
}
`;

css += newStyles;
fs.writeFileSync('src/styles.css', css);
console.log('Fixed CSS');
