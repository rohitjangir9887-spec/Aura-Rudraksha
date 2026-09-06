import fs from "fs";
let content = fs.readFileSync("src/pages/Home.jsx", "utf8");

if (!content.includes("framer-motion")) {
  content = content.replace(
    /import React, \{ useState, useEffect \} from "react";/,
    `import React, { useState, useEffect } from "react";\nimport { motion } from "framer-motion";`
  );
}

// Wrap sections in Home.jsx
// We can find <ShopByCategory /> etc. and wrap them
content = content.replace(
  /<div className="feature-bar fade-in-up">/g,
  `<motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.5 }} className="feature-bar fade-in-up">`
);
content = content.replace(
  /<\/div>\n\s*\{\/\* COMPACT SHOP BY CATEGORY CAROUSEL \*\/\}/g,
  `</motion.div>\n    {/* COMPACT SHOP BY CATEGORY CAROUSEL */}`
);

content = content.replace(
  /<ShopByCategory \/>/g,
  `<motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.5 }}><ShopByCategory /></motion.div>`
);

content = content.replace(
  /<HomeProductShowcase products=\{products\} isLoading=\{isLoading\} \/>/g,
  `<motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.5 }}><HomeProductShowcase products={products} isLoading={isLoading} /></motion.div>`
);

content = content.replace(
  /<WhyAuraSection \/>/g,
  `<motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.5 }}><WhyAuraSection /></motion.div>`
);

content = content.replace(
  /<AllProductsSection products=\{products\} isLoading=\{isLoading\} \/>/g,
  `<motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.5 }}><AllProductsSection products={products} isLoading={isLoading} /></motion.div>`
);

content = content.replace(
  /<ZodiacRudrakshaSection \/>/g,
  `<motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.5 }}><ZodiacRudrakshaSection /></motion.div>`
);

fs.writeFileSync("src/pages/Home.jsx", content);
