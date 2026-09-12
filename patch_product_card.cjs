const fs = require('fs');
let code = fs.readFileSync('src/components/ProductCard.jsx', 'utf8');

if (!code.includes('Gift')) {
  code = code.replace(/import \{ Heart, Star, ShoppingCart \} from "lucide-react";/, 'import { Heart, Star, ShoppingCart, Gift } from "lucide-react";');
}

const oldBadge = `{offerBadge && (
          <span 
            className="premium-offer-badge" 
            style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}
          >
            {offerBadge.badgeText}
            {offerBadge.couponCode && (
              <span style={{ fontSize: '7px', opacity: 0.9, marginTop: '2px', letterSpacing: '0.5px' }}>
                CODE: {offerBadge.couponCode}
              </span>
            )}
          </span>
        )}`;

const newBadge = `{offerBadge && (
          <div className="premium-offer-badge-container">
            <div className="premium-offer-badge-title">
              <Gift size={12} strokeWidth={2.5} /> {offerBadge.badgeText}
            </div>
            {offerBadge.couponCode && (
              <div className="premium-offer-badge-code">
                {offerBadge.couponCode}
              </div>
            )}
          </div>
        )}`;

if (code.includes('className="premium-offer-badge"')) {
  code = code.replace(oldBadge, newBadge);
  fs.writeFileSync('src/components/ProductCard.jsx', code);
  console.log("Patched ProductCard.jsx");
} else {
  console.log("Could not find the target block in ProductCard.jsx");
}
