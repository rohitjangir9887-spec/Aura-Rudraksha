const fs = require('fs');
let css = fs.readFileSync('src/styles.css', 'utf8');

const badgeStyle = `
/* Badge Style Update - Glassmorphic, Round, Small */
.badge, .premium-offer-badge {
    background: rgba(255, 255, 255, 0.85) !important;
    backdrop-filter: blur(4px) !important;
    -webkit-backdrop-filter: blur(4px) !important;
    color: #8c2b10 !important;
    border: 1px solid rgba(140, 43, 16, 0.15) !important;
    border-radius: 20px !important;
    padding: 3px 8px !important;
    font-size: 9px !important;
    font-weight: 700 !important;
    top: 8px !important;
    left: 8px !important;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05) !important;
}
`;

fs.appendFileSync('src/styles.css', badgeStyle);
console.log("Updated styles.css with premium badge UI");

let jsx = fs.readFileSync('src/components/ProductCard.jsx', 'utf8');
// Remove inline styles for premium-offer-badge to allow CSS override
jsx = jsx.replace(
  /style={{\s*background: offerBadge\.bgColor \|\| '#c64b2e',\s*color: offerBadge\.textColor \|\| '#fff',\s*display: 'flex',\s*flexDirection: 'column',\s*lineHeight: 1\.1,\s*padding: '4px 8px'\s*}}/g,
  `style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}`
);

fs.writeFileSync('src/components/ProductCard.jsx', jsx);
console.log("Cleaned up inline styles in ProductCard.jsx");

