const fs = require('fs');
const file = 'server/utils/similarity.js';
let content = fs.readFileSync(file, 'utf8');

// Configurable Duplicate Detection
content = content.replace(
  /export function evaluateDraftSimilarity\(candidateText, existingCorpus = \[\]\) \{/g,
  `export function evaluateDraftSimilarity(candidateText, existingCorpus = [], options = {}) {
  const { duplicateThreshold = 70, duplicateSemanticThreshold = 80, similarThreshold = 35, similarSemanticThreshold = 50 } = options;`
);

content = content.replace(
  /if \(scorePct >= 70 \|\| semanticPct >= 80\) \{/g,
  'if (scorePct >= duplicateThreshold || semanticPct >= duplicateSemanticThreshold) {'
);

content = content.replace(
  /\} else if \(scorePct >= 35 \|\| semanticPct >= 50\) \{/g,
  '} else if (scorePct >= similarThreshold || semanticPct >= similarSemanticThreshold) {'
);

fs.writeFileSync(file, content);
