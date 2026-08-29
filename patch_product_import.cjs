const fs = require('fs');
let code = fs.readFileSync('src/pages/Product.jsx', 'utf8');

if (!code.includes('Gift,')) {
  code = code.replace(/Star, Minus, Plus,/, 'Star, Minus, Plus, Gift,');
  fs.writeFileSync('src/pages/Product.jsx', code);
  console.log("Added Gift to Product.jsx");
}
