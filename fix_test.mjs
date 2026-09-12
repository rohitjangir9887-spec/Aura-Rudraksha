import fs from "fs";
let content = fs.readFileSync("scripts/phase3-test.mjs", "utf8");

content = content.replace(
  /check\("Non-free shipping applied \(₹50, subtotal 200 < 499\)", oLow\.json\?\.data\?\.shipping === 50 && oLow\.json\?\.data\?\.finalAmount === 250, \`shipping=\$\{oLow\.json\?\.data\?\.shipping\} final=\$\{oLow\.json\?\.data\?\.finalAmount\}\`\);/g,
  `check("Product-based shipping applied (₹0 by default on normal items)", oLow.json?.data?.shipping === 0 && oLow.json?.data?.finalAmount === 200, \`shipping=\$\{oLow.json?.data?.shipping\} final=\$\{oLow.json?.data?.finalAmount\}\`);`
);

fs.writeFileSync("scripts/phase3-test.mjs", content);
