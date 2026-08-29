const fs = require('fs');
let content = fs.readFileSync('src/pages/Home.jsx', 'utf8');

// 1. Revert desktop-hero class
content = content.replace(
  /\{\/\* Desktop Hero \(Hidden on Mobile\) \*\/\}\s*<section\s+className="hero premium-slider desktop-hero"/,
  '<section className="hero premium-slider"'
);

// 2. Extract mobile-editorial-hero block
const mehRegex = /\{\/\* Mobile Editorial Hero \(Hidden on Desktop\) \*\/\}\s*<section className="mobile-editorial-hero">[\s\S]*?<\/section>/;
const mehMatch = content.match(mehRegex);

if (mehMatch) {
  // Remove it from current position
  content = content.replace(mehMatch[0], '');
  
  // Insert it before WhyAuraSection
  content = content.replace(
    /\{\/\* PREMIUM WHY AURA RUDRAKSHA \/ OUR STORY STORYTELLING SECTION \*\/\}\s*<WhyAuraSection \/>/,
    `{/* PREMIUM WHY AURA RUDRAKSHA / OUR STORY STORYTELLING SECTION */}
    ${mehMatch[0]}
    <WhyAuraSection />`
  );
}

fs.writeFileSync('src/pages/Home.jsx', content);

let css = fs.readFileSync('src/styles.css', 'utf8');
css = css.replace(/\.desktop-hero\s*\{\s*display:\s*block;\s*\}/g, '');
css = css.replace(/\.desktop-hero\s*\{\s*display:\s*none\s*!important;\s*\}/g, '');
fs.writeFileSync('src/styles.css', css);

