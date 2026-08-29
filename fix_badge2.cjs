const fs = require('fs');
let css = fs.readFileSync('src/styles.css', 'utf8');

const regex = /\.badge, \.premium-offer-badge \{[\s\S]*?\}/;
const newBadge = `.badge, .premium-offer-badge {
    background: transparent !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
    color: #8c2b10 !important;
    border: 1px solid #8c2b10 !important;
    border-radius: 100px !important; /* fully round */
    padding: 2px 8px !important;
    font-size: 8px !important; /* smaller size */
    font-weight: 700 !important;
    top: 8px !important;
    left: 8px !important;
    box-shadow: none !important;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}`;

if (regex.test(css)) {
  css = css.replace(regex, newBadge);
  fs.writeFileSync('src/styles.css', css);
  console.log("Updated badge.");
} else {
  console.log("Could not find the target block.");
}
