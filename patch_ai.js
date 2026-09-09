import fs from 'fs';
let content = fs.readFileSync('server/controllers/auraAiController.js', 'utf8');

// The new SDK uses gemini-2.5-flash as default, let's fix the invalid model string
content = content.replace(/gemini-3\.8-flash/g, 'gemini-2.5-flash');

fs.writeFileSync('server/controllers/auraAiController.js', content);

let content2 = fs.readFileSync('server/services/nemotronSeoEngine.js', 'utf8');
content2 = content2.replace(/gemini-3\.8-flash/g, 'gemini-2.5-flash');
fs.writeFileSync('server/services/nemotronSeoEngine.js', content2);

console.log("Patched model versions");
