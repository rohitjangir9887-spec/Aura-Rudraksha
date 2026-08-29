const fs = require('fs');
let code = fs.readFileSync('src/pages/Product.jsx', 'utf8');

const target = 'const highlightText = p.highlight || p.shortDesc || (p.description ? p.description.split(\'.\')[0] + \'.\' : "Sacred soil (मिट्टी) & Holy Ganga Jal consecration from Mount Kailash region with certified Vedic energization.");';

const replacement = `const rawHighlight = p.highlight || p.shortDesc || (p.description ? p.description.split('.')[0] + '.' : "Sacred soil (मिट्टी) & Holy Ganga Jal consecration from Mount Kailash region with certified Vedic energization.");
  const highlightText = rawHighlight.replace(/\\*\\*/g, '');`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync('src/pages/Product.jsx', code);
  console.log("Patched highlightText successfully");
} else {
  console.log("Could not find the target string.");
}
