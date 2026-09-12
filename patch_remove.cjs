const fs = require('fs');
let content = fs.readFileSync('src/styles.css', 'utf8');

const hideCSS = `
/* Hide the duplicated product cards in Our Story on mobile */
@media (max-width: 960px) {
  .why-aura-right-column {
    display: none !important;
  }
}
`;

content += hideCSS;
fs.writeFileSync('src/styles.css', content);
