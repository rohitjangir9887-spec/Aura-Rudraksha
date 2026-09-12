const fs = require('fs');
let code = fs.readFileSync('src/components/ProductCard.jsx', 'utf8');

code = code.replace(/className="badge premium-offer-badge"/g, 'className="premium-offer-badge"');

fs.writeFileSync('src/components/ProductCard.jsx', code);
