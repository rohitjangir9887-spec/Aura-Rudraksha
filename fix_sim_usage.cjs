const fs = require('fs');
const file = 'server/controllers/reviewController.js';
let content = fs.readFileSync(file, 'utf8');

// The evaluateDraftSimilarity function calls in reviewController.js need to use options if we want to change them, but default configurable is fine too.
// Make it explicit in the caller.

content = content.replace(
  /let finalSimResult = evaluateDraftSimilarity\(finalDraft\.text, runningBatchCorpus\);/g,
  'let finalSimResult = evaluateDraftSimilarity(finalDraft.text, runningBatchCorpus, { duplicateThreshold: 70, duplicateSemanticThreshold: 80, similarThreshold: 35, similarSemanticThreshold: 50 });'
);
content = content.replace(
  /finalSimResult = evaluateDraftSimilarity\(finalDraft\.text, runningBatchCorpus\);/g,
  'finalSimResult = evaluateDraftSimilarity(finalDraft.text, runningBatchCorpus, { duplicateThreshold: 70, duplicateSemanticThreshold: 80, similarThreshold: 35, similarSemanticThreshold: 50 });'
);
content = content.replace(
  /const sim = evaluateDraftSimilarity\(candidateText, existingCorpus\);/g,
  'const sim = evaluateDraftSimilarity(candidateText, existingCorpus, { duplicateThreshold: 70, duplicateSemanticThreshold: 80, similarThreshold: 35, similarSemanticThreshold: 50 });'
);
fs.writeFileSync(file, content);

// Add fallback to generateReviewDrafts when API fails
// The prompt said: If AI unavailable: DO NOT fabricate fake customer reviews. Return: "Unable to generate new drafts right now."
let controllerContent = fs.readFileSync(file, 'utf8');

// Find the fallback logic in generateReviewDrafts
// It looks like:
// if (!rawDrafts || rawDrafts.length < requestedCount) {
//       const existingNames = new Set(rawDrafts.map(d => d.name));
//       const fallbackList = buildDiverseFallbackDrafts({

controllerContent = controllerContent.replace(
  /if \(!rawDrafts \|\| rawDrafts\.length < requestedCount\) \{\s*const existingNames = new Set\(rawDrafts\.map\(d => d\.name\)\);\s*const fallbackList = buildDiverseFallbackDrafts\(\{[\s\S]*?\}\);\s*rawDrafts = \[\.\.\.rawDrafts, \.\.\.fallbackList\];\s*\}/,
  `if (!rawDrafts || rawDrafts.length < requestedCount) {
      // User strictly requested: DO NOT fabricate fake customer reviews. Return error if AI unavailable.
      if (rawDrafts.length === 0) {
          return res.status(503).json({ success: false, message: "Unable to generate new drafts right now." });
      }
    }`
);

fs.writeFileSync(file, controllerContent);
