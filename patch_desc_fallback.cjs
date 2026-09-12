const fs = require('fs');
let content = fs.readFileSync('server/controllers/auraAiController.js', 'utf-8');

// Replace the complex HTML mock with a generic one
content = content.replace(
  /const generateAuthenticFallbackHtml = \(prodName, prodCat, lang\) => \{[\s\S]*?\/\/ 3\. Fallback/m,
  `const generateAuthenticFallbackHtml = (prodName, prodCat, lang) => {
      return \`<h2>✨ About \${prodName}</h2><p>Authentic and consecrated \${prodCat}. Currently experiencing a temporary delay in AI description generation.</p>\`;
    };

    // 3. Fallback`
);

fs.writeFileSync('server/controllers/auraAiController.js', content);
