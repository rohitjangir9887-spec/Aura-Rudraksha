/**
 * Text Normalization and Similarity Detection Utility for Review Drafts
 * Detects exact duplicates, near-duplicates, and high-similarity text
 * All similarity scores are strictly normalized between 0% and 100%.
 */

import crypto from "crypto";

/**
 * Compute SHA256 hash of a string
 */
export function computeSha256(str) {
  if (!str || typeof str !== "string") return "";
  return crypto.createHash("sha256").update(str.trim()).digest("hex");
}

/**
 * Get hash of exact trimmed raw text
 */
export function getExactTextHash(text) {
  if (!text || typeof text !== "string") return "";
  return computeSha256(text.trim());
}

/**
 * Get hash of normalized text (lowercase, alphanumeric, collapsed spaces)
 */
export function getNormalizedTextHash(text) {
  const norm = normalizeText(text);
  if (!norm) return "";
  return computeSha256(norm);
}

// Normalize text: lowercase, remove punctuation/special characters, collapse whitespace
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

// Semantic overlap calculation based on significant keyword intersection
function computeSemanticOverlap(normA, normB) {
  const wordsA = Array.from(getWordTokens(normA));
  const wordsB = Array.from(getWordTokens(normB));
  if (!wordsA.length || !wordsB.length) return 0;
  const common = wordsA.filter(w => wordsB.includes(w));
  return common.length / Math.max(wordsA.length, wordsB.length, 1);
}

/**
 * Check a candidate review draft against a corpus of existing reviews & current batch.
 * Returns: { similarityStatus: 'Unique'|'Similar'|'Duplicate', similarityScore: number (0-100), semanticScore: number (0-100), matchedReview: string }
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
    
    if (score > maxScore || semantic > maxSemantic) {
      if (score > maxScore) maxScore = score;
      if (semantic > maxSemantic) maxSemantic = semantic;
      bestMatch = existing;
    }
    if (maxScore >= 0.95) break; // Early exit on exact match
  }

  // Strictly normalize percentage to integer [0, 100]
  const scorePct = Math.min(100, Math.max(0, Math.round(maxScore * 100)));
  const semanticPct = Math.min(100, Math.max(0, Math.round(maxSemantic * 100)));

  let status = "Unique";
  if (scorePct >= 70 || semanticPct >= 80) {
    status = "Duplicate";
  } else if (scorePct >= 35 || semanticPct >= 50) {
    status = "Similar";
  } else {
    status = "Unique";
  }

  return {
    similarityStatus: status,
    similarityScore: scorePct, // Guaranteed to be 0 to 100
    semanticScore: semanticPct, // Guaranteed to be 0 to 100
    matchedReview: bestMatch ? (bestMatch.title ? `"${bestMatch.title}"` : (bestMatch.text || bestMatch.content || "").slice(0, 70) + "...") : null
  };
}

/**
 * Check if a review candidate is a duplicate against existing review list.
 * Returns: { isDuplicate: boolean, reason: string, matchedReview: string }
 */
export function checkDuplicateReview(candidate, existingCorpus = []) {
  const candidateText = candidate?.text || candidate?.content || "";
  const candidateSourceId = candidate?.sourceReviewId ? String(candidate.sourceReviewId).trim() : "";
  const candidateId = candidate?.id ? String(candidate.id).trim() : "";

  if (!candidateText) {
    return { isDuplicate: false, reason: "", matchedReview: null };
  }

  const exactHash = candidate.exactTextHash || getExactTextHash(candidateText);
  const normalizedHash = candidate.normalizedTextHash || getNormalizedTextHash(candidateText);

  for (const ex of existingCorpus) {
    // Skip checking against itself
    if (candidateId && String(ex.id) === candidateId) continue;

    const exSourceId = ex.sourceReviewId ? String(ex.sourceReviewId).trim() : "";
    if (candidateSourceId && exSourceId && candidateSourceId === exSourceId) {
      return {
        isDuplicate: true,
        reason: "Same external review ID already imported (sourceReviewId match)",
        matchedReview: ex.title ? `"${ex.title}"` : (ex.text || "").slice(0, 70) + "..."
      };
    }

    const exText = ex.text || ex.content || "";
    const exExactHash = ex.exactTextHash || getExactTextHash(exText);
    const exNormHash = ex.normalizedTextHash || getNormalizedTextHash(exText);

    if (exactHash && exExactHash && exactHash === exExactHash) {
      return {
        isDuplicate: true,
        reason: "Exact review text match detected (exactTextHash match)",
        matchedReview: ex.title ? `"${ex.title}"` : exText.slice(0, 70) + "..."
      };
    }

    if (normalizedHash && exNormHash && normalizedHash === exNormHash) {
      return {
        isDuplicate: true,
        reason: "Normalized review text match detected (normalizedTextHash match)",
        matchedReview: ex.title ? `"${ex.title}"` : exText.slice(0, 70) + "..."
      };
    }
  }

  // Fallback to similarity evaluation
  const sim = evaluateDraftSimilarity(candidateText, existingCorpus);
  if (sim.similarityStatus === "Duplicate") {
    return {
      isDuplicate: true,
      reason: `Review content similarity threshold exceeded (${sim.similarityScore}% similarity)`,
      matchedReview: sim.matchedReview
    };
  }

  return { isDuplicate: false, reason: "", matchedReview: null };
}

