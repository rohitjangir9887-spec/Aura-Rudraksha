const fs = require('fs');
let content = fs.readFileSync('server/controllers/auraAiController.js', 'utf-8');

// Remove import
content = content.replace(/buildAuthenticVedicResponse,\s*/, '');

// Replace the fallback call
content = content.replace(
  /fullRawContent = buildAuthenticVedicResponse\(\{[\s\S]*?\}\);/,
  'fullRawContent = `🙏 **Namaste! Main Aura AI hoon.**\\n\\nKshama karein, is samay main temporary connection issue face kar raha hoon (AI API disconnected). Kripya thodi der baad prayas karein, ya directly hamare products browse karein.`;'
);

fs.writeFileSync('server/controllers/auraAiController.js', content);
