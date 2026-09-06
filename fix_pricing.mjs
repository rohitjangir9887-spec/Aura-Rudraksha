import fs from "fs";
let content = fs.readFileSync("server/services/pricingService.js", "utf8");

content = content.replace(
  /const isBaseFreeShipping = subtotal === 0 \|\| storeFreeShippingThreshold === 0 \|\| subtotal >= storeFreeShippingThreshold;\n  const baseShippingFee = isBaseFreeShipping \? 0 : storeStandardShippingFee;\n\n  \/\/ Combined shipping\n  const shipping = baseShippingFee \+ productShippingFees;\n  const isFreeShipping = \(shipping === 0\);\n  const shippingDiscount = \(isBaseFreeShipping && storeStandardShippingFee > 0\) \? storeStandardShippingFee : 0;/g,
  `const isBaseFreeShipping = true; // Disabled base store shipping as per request\n  const baseShippingFee = 0;\n\n  // Combined shipping (strictly product-based now)\n  const shipping = productShippingFees;\n  const isFreeShipping = (shipping === 0);\n  const shippingDiscount = 0;`
);

fs.writeFileSync("server/services/pricingService.js", content);
