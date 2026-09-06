const fs = require('fs');
const file = 'server/controllers/reviewController.js';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(
  '// Ensure author name is unique in the batch',
  `// Check draft against both existing corpus and same batch. runningBatchCorpus contains both.\n      // Ensure author name is unique in the batch`
);
fs.writeFileSync(file, content);
