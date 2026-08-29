/**
 * Text Normalization and Similarity Detection Utility for Review Drafts
 * Detects exact duplicates, near-duplicates, and high-similarity text
 */

// Normalize text: lowercase, remove special characters, collapse whitespace
export function normalizeText(str) {
  if (!str || typeof str !== "string") return "";
  return str
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ") // Unicode-aware letter/number filtering
    .replace(/\s+/g, " ")
    .trim();
}

// Tokenize text into words
export function getWordTokens(normalizedStr) {
  if (!normalizedStr) return new Set();
  return new Set(normalizedStr.split(" ").filter(w => w.length > 1));
}

// Generate character N-grams (default 3-grams) for robust sub-word similarity
export function getNGrams(normalizedStr, n = 3) {
  const ngrams = new Set();
  if (!normalizedStr || normalizedStr.length < n) {
    if (normalizedStr) ngrams.add(normalizedStr);
    return ngrams;
  }
  for (let i = 0; i <= normalizedStr.length - n; i++) {
    ngrams.add(normalizedStr.substring(i, i + n));
  }
  return ngrams;
}

// Compute Jaccard similarity coefficient between two Sets (0.0 to 1.0)
export function jaccardSimilarity(setA, setB) {
  if (!setA.size || !setB.size) return 0;
  let intersectionCount = 0;
  for (const item of setA) {
    if (setB.has(item)) {
      intersectionCount++;
    }
  }
  const unionCount = setA.size + setB.size - intersectionCount;
  return unionCount === 0 ? 0 : intersectionCount / unionCount;
}

// Compute hybrid similarity score between text A and text B (0.0 to 1.0)
export function computeTextSimilarity(textA, textB) {
  const normA = normalizeText(textA);
  const normB = normalizeText(textB);

  if (!normA || !normB) return 0;
  if (normA === normB) return 1.0;

  // Word token Jaccard
  const wordsA = getWordTokens(normA);
  const wordsB = getWordTokens(normB);
  const wordSim = jaccardSimilarity(wordsA, wordsB);

  // 3-gram character Jaccard (catches subtle rewordings, typos, suffixes)
  const ngramsA = getNGrams(normA, 3);
  const ngramsB = getNGrams(normB, 3);
  const ngramSim = jaccardSimilarity(ngramsA, ngramsB);

  // Weighted hybrid score
  return (wordSim * 0.5) + (ngramSim * 0.5);
}

// Pseudo-semantic similarity based on common semantic anchor words overlap
function computeSemanticOverlap(normA, normB) {
  // Simple heuristic: count overlapping significant nouns/adjectives
  // In a real prod environment, use embeddings
  const wordsA = Array.from(getWordTokens(normA));
  const wordsB = Array.from(getWordTokens(normB));
  const common = wordsA.filter(w => wordsB.includes(w));
  return common.length / Math.max(wordsA.length, wordsB.length, 1);
}

/**
 * Check a candidate review draft against a corpus of existing reviews & current batch
 * Returns: { similarityStatus: 'Unique'|'Similar'|'Duplicate', similarityScore: number, semanticScore: number, matchedReview: string }
 */
export function evaluateDraftSimilarity(candidateText, existingCorpus = []) {
  if (!candidateText || typeof candidateText !== "string") {
    return { similarityStatus: "Unique", similarityScore: 0, semanticScore: 0, matchedReview: null };
  }

  let maxScore = 0;
  let maxSemantic = 0;
  let bestMatch = null;
  const normA = normalizeText(candidateText);

  for (const existing of existingCorpus) {
    const exText = existing?.text || existing?.content || "";
    if (!exText) continue;

    const normB = normalizeText(exText);
    const score = computeTextSimilarity(candidateText, exText);
    const semantic = computeSemanticOverlap(normA, normB);
    
    // Weight them together or keep max
    if (score > maxScore || semantic > maxSemantic) {
      if (score > maxScore) maxScore = score;
      if (semantic > maxSemantic) maxSemantic = semantic;
      bestMatch = existing;
    }
    if (maxScore >= 0.95) break; // Early exit on exact match
  }

  const scorePct = Math.round(maxScore * 100);
  const semanticPct = Math.min(100, Math.round(maxSemantic * 100 * 1.5)); // boost a bit for realism

  let status = "Unique";
  if (maxScore >= 0.70 || semanticPct >= 0.85) {
    status = "Duplicate";
  } else if (maxScore >= 0.40 || semanticPct >= 0.60) {
    status = "Similar";
  } else {
    status = "Unique";
  }

  return {
    similarityStatus: status,
    similarityScore: scorePct,
    semanticScore: semanticPct,
    matchedReview: bestMatch ? (bestMatch.title ? `"${bestMatch.title}"` : bestMatch.text?.slice(0, 70) + "...") : null
  };
}
