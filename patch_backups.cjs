const fs = require('fs');
let content = fs.readFileSync('server/controllers/auraAiController.js', 'utf-8');

content = content.replace(
  /const BACKUP_NIM_MODELS = \[\s*[^\]]+\s*\];/m,
  'const BACKUP_NIM_MODELS = ["nemotron-3-super-120b-a12b"];'
);

fs.writeFileSync('server/controllers/auraAiController.js', content);
