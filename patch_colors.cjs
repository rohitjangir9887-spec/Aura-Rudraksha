const fs = require('fs');
let content = fs.readFileSync('src/components/TopOfferStrip.jsx', 'utf8');

const regex = /<div className="premium-top-strip">/;
const newBlock = `<div className="premium-top-strip" style={topOffer.bgColor ? { background: topOffer.bgColor, color: topOffer.textColor || '#fbf5ef' } : {}}>`;

if (regex.test(content)) {
  content = content.replace(regex, newBlock);
  fs.writeFileSync('src/components/TopOfferStrip.jsx', content);
  console.log("Updated colors.");
} else {
  console.log("Could not find the target block.");
}
