import { extractKeywordString } from "./keywordUtils.js";

/**
 * Aura Rudraksha Advanced Search & Keyword Matching Engine
 * 
 * Supports:
 * - Tokenized multi-word matching
 * - Hindi Devanagari & Hinglish transliteration matching (e.g., "5 mukhi", "panch mukhi", "पंचमुखी", "rudraksh")
 * - Keywords array & Tags array searching
 * - Astrological attributes matching (Mukhi, Planet, Deity, Origin, Zodiac)
 * - Category & Subcategory matching
 * - Fuzzy / partial substring scoring
 */

// Common Hindi/Hinglish numeric and spiritual transliteration mapping
const HINDI_NUMBER_SYNONYMS = {
  "1": ["ek", "eka", "1", "one", "पहला", "एक"],
  "2": ["do", "dvi", "2", "two", "दो"],
  "3": ["teen", "tri", "3", "three", "तीन"],
  "4": ["char", "chaar", "chatur", "4", "four", "चार"],
  "5": ["panch", "pancha", "panchmukhi", "5", "five", "पांच", "पंच"],
  "6": ["cheh", "chhah", "shat", "shashth", "6", "six", "छह"],
  "7": ["saat", "sat", "sapta", "saptamukhi", "7", "seven", "सात", "सप्त"],
  "8": ["aath", "asht", "ashta", "8", "eight", "आठ", "अष्ट"],
  "9": ["nau", "nava", "nav", "9", "nine", "नौ", "नव"],
  "10": ["das", "dasa", "dash", "dasham", "10", "ten", "दस", "दश"],
  "11": ["gyarah", "ekadash", "11", "eleven", "ग्यारह", "एकादश"],
  "12": ["barah", "dwadash", "12", "twelve", "बारह", "द्वादश"],
  "13": ["terah", "trayodash", "13", "thirteen", "तेरह", "त्रयोदश"],
  "14": ["chaudah", "chaturdash", "14", "fourteen", "चौदह", "चतुर्दश"],
  "15": ["pandrah", "panchdash", "15", "fifteen", "पंद्रह"],
  "16": ["solah", "shodash", "16", "sixteen", "सोलह"],
  "17": ["satrah", "saptadash", "17", "seventeen", "सत्रह"],
  "18": ["atharah", "ashtadash", "18", "eighteen", "अठारह"],
  "19": ["unnis", "ekonavimshati", "19", "nineteen", "उन्नीस"],
  "20": ["bees", "vimshati", "20", "twenty", "बीस"],
  "21": ["ikkis", "ekavimshati", "21", "twenty-one", "इक्कीस"]
};

/**
 * Normalizes text for lenient searching (lowercases, removes accents, trims)
 */
export function normalizeSearchString(str) {
  if (!str) return "";
  return String(str)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s\u0900-\u097F-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Build searchable text bag from a product object
 */
export function buildProductSearchCorpus(product) {
  if (!product) return "";
  const parts = [];

  // Core Identity
  if (product.name) {
    parts.push(product.name);
    // Handle spacing variations like "5 Mukhi" -> "5mukhi"
    parts.push(product.name.replace(/\s+/g, ""));
  }
  if (product.slug) {
    parts.push(product.slug.replace(/-/g, " "));
    parts.push(product.slug.replace(/-/g, ""));
  }
  if (product.category) {
    parts.push(product.category);
    parts.push(product.category.replace(/\s+/g, ""));
  }
  if (product.subCategory) {
    parts.push(product.subCategory);
    parts.push(product.subCategory.replace(/\s+/g, ""));
  }

  // Search Keywords array
  if (Array.isArray(product.keywords)) {
    const kws = product.keywords.map(extractKeywordString).filter(Boolean);
    parts.push(kws.join(" "));
    parts.push(kws.map(k => k.replace(/\s+/g, "")).join(" "));
  } else if (typeof product.keywords === "string") {
    parts.push(product.keywords);
  } else if (product.keywords) {
    parts.push(extractKeywordString(product.keywords));
  }

  if (Array.isArray(product.searchKeywords)) {
    const skws = product.searchKeywords.map(extractKeywordString).filter(Boolean);
    parts.push(skws.join(" "));
    parts.push(skws.map(k => k.replace(/\s+/g, "")).join(" "));
  }

  // Tags array
  if (Array.isArray(product.tags)) {
    const tg = product.tags.map(extractKeywordString).filter(Boolean);
    parts.push(tg.join(" "));
    parts.push(tg.map(t => t.replace(/\s+/g, "")).join(" "));
  }

  // Astrological & Vedic attributes
  if (product.mukhi) parts.push(product.mukhi, `${product.mukhi.replace(/\s+/g, "")}`);
  if (product.origin) parts.push(product.origin);
  if (product.rulingPlanet) parts.push(product.rulingPlanet);
  if (product.deity) parts.push(product.deity);
  if (Array.isArray(product.zodiac)) parts.push(product.zodiac.join(" "));
  if (product.highlight) parts.push(product.highlight);
  if (product.homeBadge) parts.push(product.homeBadge);
  if (product.badge) parts.push(product.badge);

  // Description preview (clean HTML)
  if (product.description) {
    const cleanDesc = product.description.replace(/<[^>]*>/g, " ").slice(0, 500);
    parts.push(cleanDesc);
  }

  return normalizeSearchString(parts.join(" "));
}

/**
 * Check if a product matches a search query with score
 * @returns {number} Score >= 1 if match, 0 if no match
 */
export function matchProductQuery(product, rawQuery) {
  if (!product) return 0;
  if (!rawQuery || !rawQuery.trim()) return 1; // All match if empty query

  const cleanQ = normalizeSearchString(rawQuery);
  if (!cleanQ) return 1;

  const corpus = buildProductSearchCorpus(product);
  const nameClean = normalizeSearchString(product.name || "");
  const keywordsClean = Array.isArray(product.keywords) ? product.keywords.map(k => normalizeSearchString(extractKeywordString(k))).filter(Boolean) : [];
  const tagsClean = Array.isArray(product.tags) ? product.tags.map(t => normalizeSearchString(extractKeywordString(t))).filter(Boolean) : [];

  // Exact phrase match (Highest Priority)
  if (nameClean.includes(cleanQ)) return 100;
  if (keywordsClean.some(k => k === cleanQ || k.includes(cleanQ))) return 85;
  if (tagsClean.some(t => t === cleanQ || t.includes(cleanQ))) return 75;
  if (corpus.includes(cleanQ)) return 60;

  // Tokenized Search (All or majority tokens match)
  const tokens = cleanQ.split(" ").filter(t => t.length > 0);
  if (tokens.length === 0) return 1;

  let matchedTokens = 0;
  let bonusScore = 0;

  for (const token of tokens) {
    // Check direct substring
    if (corpus.includes(token)) {
      matchedTokens++;
      if (nameClean.includes(token)) bonusScore += 10;
      continue;
    }

    // Check phonetic / Hindi number synonyms (e.g. user typed "panch" and product has "5")
    let synonymMatched = false;
    for (const [num, synonyms] of Object.entries(HINDI_NUMBER_SYNONYMS)) {
      if (synonyms.includes(token)) {
        // Check if corpus contains any other synonym of this number
        if (synonyms.some(syn => corpus.includes(syn))) {
          matchedTokens++;
          bonusScore += 8;
          synonymMatched = true;
          break;
        }
      }
    }

    // Check common typo variations (e.g. "rudraksh" vs "rudraksha")
    if (!synonymMatched && (token.startsWith("rudraksh") || token.startsWith("rudrax"))) {
      if (corpus.includes("rudraksha") || corpus.includes("rudraksh")) {
        matchedTokens++;
        bonusScore += 5;
      }
    }
  }

  // If all tokens matched, high score!
  if (matchedTokens === tokens.length) {
    return 50 + bonusScore;
  }

  // If at least 70% of tokens matched for multi-word queries
  if (tokens.length >= 2 && matchedTokens >= Math.ceil(tokens.length * 0.65)) {
    return 25 + bonusScore;
  }

  return 0;
}

/**
 * Filter and Rank products by search query
 */
export function searchAndRankProducts(products, query) {
  if (!Array.isArray(products)) return [];
  
  // Always filter out drafts/inactive for public search ranking
  let validProducts = products.filter(p => {
    const s = String(p.status || "").toLowerCase();
    return s !== "draft" && s !== "inactive" && s !== "archived";
  });

  if (!query || !query.trim()) return validProducts;

  const scored = [];
  for (const p of validProducts) {
    const score = matchProductQuery(p, query);
    if (score > 0) {
      scored.push({ product: p, score });
    }
  }

  // Sort descending by match score
  scored.sort((a, b) => b.score - a.score);
  return scored.map(s => s.product);
}
