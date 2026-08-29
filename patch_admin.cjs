const fs = require('fs');
let code = fs.readFileSync('src/pages/admin/AdminProducts.jsx', 'utf8');

code = code.replace(
  /body: JSON.stringify\(\{ name: editing.name, category: editing.category \}\)/,
  'body: JSON.stringify({ name: editing.name, category: editing.category, price: editing.price, mrp: editing.mrp, stock: editing.stock })'
);

fs.writeFileSync('src/pages/admin/AdminProducts.jsx', code);
console.log("Patched AdminProducts payload");
