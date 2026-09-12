const fs = require('fs');
let content = fs.readFileSync('src/pages/Cart.jsx', 'utf8');

content = content.replace(
  '<p><span>Shipping</span><span style={{color: isFreeShipping ? \'#1d9450\' : \'inherit\', fontWeight: isFreeShipping ? \'600\' : \'normal\'}}>{isFreeShipping ? \'FREE\' : money(shippingCost)}</span></p>',
  '<p><span>Shipping</span><span style={{color: isFreeShipping ? \'#1d9450\' : \'inherit\', fontWeight: isFreeShipping ? \'600\' : \'normal\'}}>{isFreeShipping ? \'FREE\' : `${money(shippingCost)} (Flat)`}</span></p>'
);

fs.writeFileSync('src/pages/Cart.jsx', content);
console.log("Updated shipping display");
