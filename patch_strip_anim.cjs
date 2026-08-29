const fs = require('fs');
let content = fs.readFileSync('src/components/TopOfferStrip.jsx', 'utf8');

// Ensure framer-motion is imported
if (!content.includes('import { motion }')) {
  content = content.replace(
    'import { Gift } from \'lucide-react\';',
    'import { Gift } from \'lucide-react\';\nimport { motion } from \'framer-motion\';'
  );
}

// Wrap with motion.div
if (!content.includes('<motion.div')) {
  content = content.replace(
    '<div className="premium-top-strip"',
    '<motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.4, ease: "easeOut" }} className="premium-top-strip"'
  );
  content = content.replace(
    '</div>\n  );\n}',
    '</motion.div>\n  );\n}'
  );
}

fs.writeFileSync('src/components/TopOfferStrip.jsx', content);
console.log("Patched TopOfferStrip.jsx with framer-motion.");

let css = fs.readFileSync('src/styles.css', 'utf8');
const animCss = `
@keyframes gentlePulse {
  0% { transform: scale(1); opacity: 0.9; }
  50% { transform: scale(1.15); opacity: 1; }
  100% { transform: scale(1); opacity: 0.9; }
}

.strip-gift-icon {
  color: #e5b887;
  animation: gentlePulse 2s infinite ease-in-out;
}
`;

if (!css.includes('gentlePulse')) {
  css = css.replace('.strip-gift-icon {\n  color: #e5b887;\n}', animCss);
  fs.writeFileSync('src/styles.css', css);
  console.log("Added pulse animation to CSS.");
}
