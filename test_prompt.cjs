const fs = require('fs');
const file = 'server/controllers/reviewController.js';
let content = fs.readFileSync(file, 'utf8');
const match = content.match(/const systemPrompt = `([\s\S]*?)`;/);
if (match) {
  console.log("System Prompt:");
  console.log(match[1]);
}
