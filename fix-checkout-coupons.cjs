const fs = require('fs');
let content = fs.readFileSync('src/pages/Checkout.jsx', 'utf8');

// Filter available coupons in Checkout to only show unlocked ones
content = content.replace(
  '{availableCoupons.length > 0 && (',
  '{availableCoupons.filter(c => subtotal >= (Number(c.minOrder) || 0)).length > 0 && ('
);

content = content.replace(
  '{availableCoupons.map(coupon => {',
  '{availableCoupons.filter(c => subtotal >= (Number(c.minOrder) || 0)).map(coupon => {'
);

fs.writeFileSync('src/pages/Checkout.jsx', content);
