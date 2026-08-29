const fs = require('fs');
let content = fs.readFileSync('src/pages/Cart.jsx', 'utf8');

content = content.replace(
  '<motion.div \n                className="smart-offer-banner"',
  '{subtotal > 0 && (\n              <motion.div \n                className="smart-offer-banner"'
);

content = content.replace(
  '</div>\n                )}\n              </motion.div>',
  '</div>\n                )}\n              </motion.div>\n              )}'
);

fs.writeFileSync('src/pages/Cart.jsx', content);
