const fs = require('fs');
let code = fs.readFileSync('src/pages/Product.jsx', 'utf8');

const oldBadge = `{offerBadge && (
                <span 
                  className="product-hero-badge" 
                  style={{ 
                    background: offerBadge.bgColor || '#c64b2e', 
                    color: offerBadge.textColor || '#fff',
                    display: 'inline-flex',
                    flexDirection: 'column',
                    lineHeight: 1.2,
                    padding: '6px 12px',
                    border: 'none',
                    fontWeight: 600
                  }}
                >
                  <span style={{ fontSize: '13px' }}>{offerBadge.badgeText}</span>
                  {offerBadge.couponCode && (
                    <span style={{ fontSize: '10px', opacity: 0.9, marginTop: '2px', letterSpacing: '0.5px' }}>
                      CODE: {offerBadge.couponCode}
                    </span>
                  )}
                </span>
              )}`;

const newBadge = `{offerBadge && (
                <div className="premium-offer-badge-container" style={{ bottom: '16px', right: '16px', transform: 'scale(1.1)' }}>
                  <div className="premium-offer-badge-title">
                    <Gift size={14} strokeWidth={2.5} /> {offerBadge.badgeText}
                  </div>
                  {offerBadge.couponCode && (
                    <div className="premium-offer-badge-code">
                      {offerBadge.couponCode}
                    </div>
                  )}
                </div>
              )}`;

if (code.includes('className="product-hero-badge"')) {
  code = code.replace(oldBadge, newBadge);
  fs.writeFileSync('src/pages/Product.jsx', code);
  console.log("Patched Product.jsx");
} else {
  console.log("Could not find old badge in Product.jsx");
}

let css = fs.readFileSync('src/styles.css', 'utf8');
if (!css.includes('.main-image-frame { position: relative')) {
  css += `\n.main-image-frame { position: relative; width: 100%; height: 100%; }\n`;
  fs.writeFileSync('src/styles.css', css);
}

