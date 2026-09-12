const fs = require('fs');
let content = fs.readFileSync('src/components/WhyAuraSection.jsx', 'utf8');

// Remove the entire why-aura-right-column
content = content.replace(/<div className="why-aura-right-column"[\s\S]*?<\/div>\s*<\/div>\s*\{\/\* 3\. THREE TRUST HIGHLIGHTS STRIP \*\/\}/, `</div>
      {/* 3. THREE TRUST HIGHLIGHTS STRIP */}`);

fs.writeFileSync('src/components/WhyAuraSection.jsx', content);

let cssContent = fs.readFileSync('src/styles.css', 'utf8');
cssContent = cssContent.replace(/grid-template-columns:\s*1\.15fr 0\.85fr;/g, 'grid-template-columns: 1fr;');

fs.writeFileSync('src/styles.css', cssContent);
