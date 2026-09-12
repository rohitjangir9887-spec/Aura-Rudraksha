import fs from "fs";
let content = fs.readFileSync("src/pages/Cart.jsx", "utf8");

content = content.replace(
  /<CartFreeShippingMeter[\s\S]*?isFreeShipping=\{isFreeShipping\}\n\s*\/>/g,
  `{freeShippingThreshold > 0 && (\n                <CartFreeShippingMeter\n                  subtotal={subtotal}\n                  freeShippingThreshold={freeShippingThreshold}\n                  isFreeShipping={isFreeShipping}\n                />\n              )}`
);

fs.writeFileSync("src/pages/Cart.jsx", content);
