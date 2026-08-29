const fs = require('fs');

// Fix Cart.jsx
let cart = fs.readFileSync('src/pages/Cart.jsx', 'utf8');
cart = cart.replace('{cart.length === 0 ? (', '{(!cart.length || subtotal === 0) ? (');
cart = cart.replace('const shippingCost = isFreeShipping ? 0 : 50;', 'const shippingCost = (subtotal === 0 || isFreeShipping) ? 0 : 50;');
fs.writeFileSync('src/pages/Cart.jsx', cart);

// Fix Checkout.jsx
let checkout = fs.readFileSync('src/pages/Checkout.jsx', 'utf8');
checkout = checkout.replace('if (lines.length === 0) {', 'if (lines.length === 0 || subtotal === 0) {');
checkout = checkout.replace('const shippingFee = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : 50;', 'const shippingFee = (subtotal === 0 || subtotal >= FREE_SHIPPING_THRESHOLD) ? 0 : 50;');
fs.writeFileSync('src/pages/Checkout.jsx', checkout);

console.log("Fixed empty cart states for missing products!");
