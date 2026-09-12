const fs = require("fs");
let content = fs.readFileSync("src/pages/Cart.jsx", "utf8");

content = content.replace(
  /<div\s+id="cart-main-responsive-grid"/,
  `<motion.div\n            initial={{ opacity: 0, y: 15 }}\n            animate={{ opacity: 1, y: 0 }}\n            transition={{ duration: 0.4, staggerChildren: 0.1 }}\n            id="cart-main-responsive-grid"`
);

content = content.replace(
  /<div\s+className="cart-left-column"/,
  `<motion.div\n              initial={{ opacity: 0, x: -10 }}\n              animate={{ opacity: 1, x: 0 }}\n              transition={{ duration: 0.4 }}\n              className="cart-left-column"`
);

content = content.replace(
  /<div\s+className="cart-right-column"/,
  `<motion.div\n              initial={{ opacity: 0, x: 10 }}\n              animate={{ opacity: 1, x: 0 }}\n              transition={{ duration: 0.4 }}\n              className="cart-right-column"`
);

content = content.replace(
  /return \(\n\s*<CartItemCard/g,
  `return (\n                    <motion.div\n                      key={id}\n                      initial={{ opacity: 0, y: 10 }}\n                      animate={{ opacity: 1, y: 0 }}\n                      transition={{ delay: index * 0.05 }}\n                    >\n                    <CartItemCard`
);

content = content.replace(
  /isWishlisted=\{isWishlisted\(p\.id \|\| p\._id\)\}\n\s*\/>\n\s*\);/g,
  `isWishlisted={isWishlisted(p.id || p._id)}\n                    />\n                    </motion.div>\n                  );`
);

content = content.replace(
  /              <OrderSummaryCard([\s\S]*?)isCheckoutPage=\{false\}\n\s*\/>\n\s*<\/div>\n\s*<\/div>\n\s*\)}/g,
  `              <OrderSummaryCard$1isCheckoutPage={false}\n              />\n            </motion.div>\n          </motion.div>\n        )}`
);

content = content.replace(
  /              \)\}\n\s*<\/div>\n\s*\{\/\* Right Column: Order Summary/g,
  `              )}\n            </motion.div>\n\n            {/* Right Column: Order Summary`
);

fs.writeFileSync("src/pages/Cart.jsx", content);
