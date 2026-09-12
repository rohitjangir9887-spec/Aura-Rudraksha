const fs = require('fs');
let content = fs.readFileSync('src/components/Shell.jsx', 'utf8');

// 1. Add import for TopOfferStrip
if (!content.includes('TopOfferStrip')) {
  content = content.replace(
    'import { Footer } from "./Footer";',
    'import { Footer } from "./Footer";\nimport { TopOfferStrip } from "./TopOfferStrip";'
  );
}

// 2. Add <TopOfferStrip isHome={isHomeActive} /> above <div className="announce">
if (!content.includes('<TopOfferStrip')) {
  content = content.replace(
    '<div className="app">\n        <div className="announce">',
    '<div className="app">\n        <TopOfferStrip isHome={isHomeActive} />\n        <div className="announce">'
  );
}

fs.writeFileSync('src/components/Shell.jsx', content);
console.log('Shell patched.');
