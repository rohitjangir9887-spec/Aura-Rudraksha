const fs = require('fs');
let content = fs.readFileSync('src/components/Shell.jsx', 'utf8');

if (!content.includes('TopOfferStrip')) {
  content = content.replace(
    'import { Footer } from "./Footer";',
    'import { Footer } from "./Footer";\nimport { TopOfferStrip } from "./TopOfferStrip";'
  );
}

if (!content.includes('<TopOfferStrip')) {
  content = content.replace(
    '<div className="app">\n        <div className="announce">',
    '<div className="app">\n        <TopOfferStrip isHome={isHomeActive} />\n        <div className="announce">'
  );
}

fs.writeFileSync('src/components/Shell.jsx', content);
console.log('Shell patched.');
