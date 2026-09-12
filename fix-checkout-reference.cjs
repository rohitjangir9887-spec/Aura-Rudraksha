const fs = require('fs');
let checkout = fs.readFileSync('src/pages/Checkout.jsx', 'utf8');

checkout = checkout.replace(
  '  useEffect(() => {\n    if (lines.length === 0 || subtotal === 0) {',
  '  useEffect(() => {\n    if (lines.length === 0) {'
);

checkout = checkout.replace(
  '  if (lines.length === 0) {\n    return (',
  '  if (lines.length === 0 || subtotal === 0) {\n    return ('
);

fs.writeFileSync('src/pages/Checkout.jsx', checkout);
console.log("Fixed checkout reference error");
