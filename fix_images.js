const fs = require('fs');
let content = fs.readFileSync('src/styles.css', 'utf8');

// The block to replace
const oldBlock = `.popular-collection-section .product-image {
  aspect-ratio: 1 / 1 !important;
  height: auto !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  background: #fbf7f2 !important;
  position: relative !important;
  overflow: hidden !important;
  padding: 16px !important;
}

.popular-collection-section .product-image img {
  width: 100% !important;
  height: 100% !important;
  object-fit: contain !important;
  object-position: center !important;
  transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1) !important;
}`;

const newBlock = `.popular-collection-section .product-image {
  aspect-ratio: 1 / 1 !important;
  height: auto !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  background: #fbf7f2 !important;
  position: relative !important;
  overflow: hidden !important;
  padding: 0 !important;
}

.popular-collection-section .product-image img {
  width: 100% !important;
  height: 100% !important;
  object-fit: contain !important;
  object-position: center !important;
  transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1) !important;
  background: transparent !important;
}`;

if (content.includes(".popular-collection-section .product-image {")) {
  content = content.replace(oldBlock, newBlock);
  fs.writeFileSync('src/styles.css', content);
  console.log("Updated styles.css");
} else {
  console.log("Could not find the target block.");
}
