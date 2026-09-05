const fs = require('fs');

// Fix Cart.jsx
let cart = fs.readFileSync('src/pages/Cart.jsx', 'utf8');
if (!cart.includes('const isEmpty = !cart.length || subtotal === 0;')) {
  cart = cart.replace('const isEmpty = !cart.length;', 'const isEmpty = !cart.length || subtotal === 0;');
}
fs.writeFileSync('src/pages/Cart.jsx', cart);

// Fix Checkout.jsx
let checkout = fs.readFileSync('src/pages/Checkout.jsx', 'utf8');
if (!checkout.includes('const shippingFee = subtotal === 0 ? 0 : effectiveTotals.shipping;')) {
  checkout = checkout.replace(
    'const shippingFee = effectiveTotals.shipping;',
    'const shippingFee = subtotal === 0 ? 0 : effectiveTotals.shipping;'
  );
}
if (!checkout.includes('disabled={effectiveLines.length === 0 || subtotal === 0}')) {
  checkout = checkout.replace(
    'disabled={effectiveLines.length === 0}',
    'disabled={effectiveLines.length === 0 || subtotal === 0}'
  );
}
if (!checkout.includes('if (effectiveLines.length === 0 || subtotal === 0)')) {
  checkout = checkout.replace(
    'if (loading) return;',
    'if (loading) return;\n\n    if (effectiveLines.length === 0 || subtotal === 0) {\n      emitToast("Your cart is empty.", "warning");\n      return;\n    }'
  );
}
fs.writeFileSync('src/pages/Checkout.jsx', checkout);

console.log("Fixed empty cart states for missing products!");
