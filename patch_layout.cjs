const fs = require('fs');
let content = fs.readFileSync('src/styles.css', 'utf8');

// 1. Change width to 50%
content = content.replace(
  /flex: 0 0 58%;/g,
  'flex: 0 0 calc(50% - 5px);'
);

// 2. Adjust left content padding and font
content = content.replace(
  /\.meh-left-content \{\s*position: relative;\s*z-index: 3;\s*padding: 16px;\s*color: #fff;\s*\}/,
  `.meh-left-content {
    position: relative;
    z-index: 3;
    padding: 12px;
    color: #fff;
  }`
);
content = content.replace(
  /\.meh-title \{\s*font-family: 'Playfair Display', serif;\s*font-size: 24px;/g,
  `.meh-title {
    font-family: 'Playfair Display', serif;
    font-size: 22px;`
);

content = content.replace(
  /\.meh-subtitle \{\s*font-size: 13px;/g,
  `.meh-subtitle {
    font-size: 12px;`
);

content = content.replace(
  /\.meh-explore-btn \{\s*display: inline-block;\s*padding: 8px 16px;/g,
  `.meh-explore-btn {
    display: inline-block;
    padding: 6px 10px;`
);
content = content.replace(
  /font-size: 12px;\s*letter-spacing: 0\.5px;/g,
  `font-size: 11px;
    letter-spacing: 0;`
);

// 3. Right side font adjustments
content = content.replace(
  /\.meh-details h3 \{\s*font-size: 12px;/g,
  `.meh-details h3 {
    font-size: 11px;`
);

content = content.replace(
  /\.meh-price \{\s*font-weight: 700;\s*font-size: 13px;/g,
  `.meh-price {
    font-weight: 700;
    font-size: 12px;`
);
content = content.replace(
  /\.meh-mrp \{\s*font-size: 11px;/g,
  `.meh-mrp {
    font-size: 10px;`
);
content = content.replace(
  /\.meh-view-link \{\s*margin-top: auto;\s*font-size: 11px;/g,
  `.meh-view-link {
    margin-top: auto;
    font-size: 10px;`
);
content = content.replace(
  /\.meh-product-img \{\s*width: 100%;\s*height: 100px;/g,
  `.meh-product-img {
    width: 100%;
    height: 90px;`
);

fs.writeFileSync('src/styles.css', content);
