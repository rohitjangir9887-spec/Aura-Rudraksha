const fs = require('fs');
const file = 'server/controllers/reviewController.js';
let content = fs.readFileSync(file, 'utf8');

// Fix typo in console log and generator logic
content = content.replace(/console\.log\(\\\`\[Aura AI Reviews\] Successfully generated \$\{rawDrafts\.length\} drafts via Gemini 2\.5 Flash\\\`\);/g, 'console.log(`[Aura AI Reviews] Successfully generated ${rawDrafts.length} drafts via NVIDIA NIM`);');
content = content.replace(/console\.log\(\`\[Aura AI Reviews\] Successfully generated \$\{rawDrafts\.length\} drafts via Gemini 2\.5 Flash\`\);/g, 'console.log(`[Aura AI Reviews] Successfully generated ${rawDrafts.length} drafts via NVIDIA NIM`);');

// Update buildDiverseFallbackDrafts logic (which is called if AI API fails or returns too few)
content = content.replace(
  /function buildDiverseFallbackDrafts\(\{/g,
  'function buildDiverseFallbackDrafts({\n'
);

content = content.replace(
  /const templates = \[/g,
  `const fallbackDraftMark = "AI DRAFT — HUMAN REVIEW REQUIRED - ";\n    const templates = [`
);

// We need to properly append the prefix to the text in fallback templates if it's missing, but it's easier to modify the fallback generation loop.
content = content.replace(
  /text: generatedText,/g,
  'text: generatedText.startsWith("AI DRAFT — HUMAN REVIEW REQUIRED") ? generatedText : `AI DRAFT — HUMAN REVIEW REQUIRED - ${generatedText}`,'
);

fs.writeFileSync(file, content);
