const fs = require('fs');
let content = fs.readFileSync('src/pages/Checkout.jsx', 'utf8');
content = content.replace('const shippingFee = 0; // Free Shipping', 'const FREE_SHIPPING_THRESHOLD = 1000;\n  const shippingFee = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : 50;');
content = content.replace('<span style={{ color: \'#1d9450\', fontWeight: \'600\' }}>FREE</span>', '{shippingFee === 0 ? <span style={{ color: "#1d9450", fontWeight: "600" }}>FREE</span> : <span>₹{shippingFee}</span>}');
fs.writeFileSync('src/pages/Checkout.jsx', content);
