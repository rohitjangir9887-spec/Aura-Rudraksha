const fs = require('fs');
const file = 'server/controllers/reviewController.js';
let content = fs.readFileSync(file, 'utf8');

// Fix text body creation in buildDiverseFallbackDrafts
content = content.replace(
  /textBody = \`\$\{op\}\$\{bd\} \$\{cl\}\`;/g,
  'textBody = `AI DRAFT — HUMAN REVIEW REQUIRED - ${op}${bd} ${cl}`;'
);

fs.writeFileSync(file, content);
