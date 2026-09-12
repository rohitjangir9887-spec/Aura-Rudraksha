const fs = require('fs');
let code = fs.readFileSync('src/pages/Home.jsx', 'utf8');

// add import
code = code.replace(
  'import { AllProductsSection } from "../components/AllProductsSection";',
  'import { AllProductsSection } from "../components/AllProductsSection";\nimport { PaymentFailureAlert } from "../components/PaymentFailureAlert";'
);

// insert component
code = code.replace(
  '{/* COMPACT SHOP BY CATEGORY CAROUSEL */}',
  '<PaymentFailureAlert />\n    {/* COMPACT SHOP BY CATEGORY CAROUSEL */}'
);

fs.writeFileSync('src/pages/Home.jsx', code);
