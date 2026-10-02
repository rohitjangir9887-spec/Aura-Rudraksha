import { extractKeywordString } from "./keywordUtils.js";

/**
 * Aura Rudraksha Advanced Search & Keyword Matching Engine
 * 
 * Supports:
 * - Precise Mukhi number targeting (e.g. "5 mukhi" returns ONLY 5 Mukhi products)
 * - Tokenized multi-word matching
 * - Hindi Devanagari & Hinglish transliteration matching (e.g., "5 mukhi", "panch mukhi", "पंचमुखी", "rudraksh")
 * - Keywords array & Tags array searching
 * - Astrological attributes matching (Mukhi, Planet, Deity, Origin, Zodiac)
 * - Category & Subcategory matching
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
 * Extract Mukhi number string (e.g. "5", "7", "1", "14") from text if present
 */
export function extractMukhiNumber(text) {
  if (!text) return null;
  const s = normalizeSearchString(text);

  if (/gauri\s*shankar/i.test(s)) return "gauri-shankar";
  if (/garbh\s*gauri/i.test(s)) return "garbh-gauri";
  if (/ganesh|ganesha/i.test(s)) return "ganesh";
  if (/trijuti/i.test(s)) return "trijuti";

  // Explicit digit with mukhi/mukha/face e.g. "5 mukhi", "5mukhi", "5-mukhi"
  const mukhiRegex = /\b([1-9]|1[0-9]|2[0-1])\s*(mukhi|mukha|face|muki)\b/i;
  const mMatch = s.match(mukhiRegex);
  if (mMatch && mMatch[1]) {
    return String(parseInt(mMatch[1], 10));
  }

  // Standalone digits 1 to 21 when user searches e.g. "5" or "7"
  const digitRegex = /\b([1-9]|1[0-9]|2[0-1])\b/;
  const dMatch = s.match(digitRegex);
  if (dMatch && dMatch[1]) {
    return String(parseInt(dMatch[1], 10));
  }

  // Hindi/Hinglish words
  if (/\b(panch|pancha|five|पांच|पंच)\b/i.test(s)) return "5";
  if (/\b(saat|sat|sapta|seven|सात|सप्त)\b/i.test(s)) return "7";
  if (/\b(eka?|one|पहला|एक)\b/i.test(s) && !/siddha|sek/i.test(s)) return "1";
  if (/\b(do|dvi|two|दो)\b/i.test(s)) return "2";
  if (/\b(teen|tri|three|तीन)\b/i.test(s)) return "3";
  if (/\b(chaar|chatur|four|चार)\b/i.test(s)) return "4";
  if (/\b(cheh|shat|six|छह)\b/i.test(s)) return "6";
  if (/\b(aath|asht|eight|आठ|अष्ट)\b/i.test(s)) return "8";
  if (/\b(nau|nava|nine|नौ|नव)\b/i.test(s)) return "9";
  if (/\b(das|dash|ten|दस|दश)\b/i.test(s)) return "10";
  if (/\b(gyarah|ekadash|eleven|ग्यारह)\b/i.test(s)) return "11";
  if (/\b(barah|dwadash|twelve|बारह)\b/i.test(s)) return "12";
  if (/\b(terah|trayodash|thirteen|तेरह)\b/i.test(s)) return "13";
  if (/\b(chaudah|chaturdash|fourteen|चौदह)\b/i.test(s)) return "14";

  return null;
}

/**
 * Build searchable text bag from a product object
 */
export function buildProductSearchCorpus(product) {
  if (!product) return "";
  const parts = [];

  if (product.name) parts.push(product.name, product.name.replace(/\s+/g, ""));
  if (product.slug) parts.push(product.slug.replace(/-/g, " "));
  if (product.category) parts.push(product.category);
  if (product.subCategory) parts.push(product.subCategory);

  if (Array.isArray(product.keywords)) {
    parts.push(product.keywords.map(extractKeywordString).filter(Boolean).join(" "));
  } else if (product.keywords) {
    parts.push(extractKeywordString(product.keywords));
  }

  if (Array.isArray(product.searchKeywords)) {
    parts.push(product.searchKeywords.map(extractKeywordString).filter(Boolean).join(" "));
  }

  if (Array.isArray(product.tags)) {
    parts.push(product.tags.map(extractKeywordString).filter(Boolean).join(" "));
  }

  if (product.mukhi) parts.push(product.mukhi);
  if (product.origin) parts.push(product.origin);
  if (product.rulingPlanet) parts.push(product.rulingPlanet);
  if (product.deity) parts.push(product.deity);
  if (Array.isArray(product.zodiac)) parts.push(product.zodiac.join(" "));
  if (product.highlight) parts.push(product.highlight);
  if (product.homeBadge) parts.push(product.homeBadge);
  if (product.badge) parts.push(product.badge);

  return normalizeSearchString(parts.join(" "));
}

/**
 * Check if a product matches a search query with score
 * @returns {number} Score >= 1 if match, 0 if no match
 */
export function matchProductQuery(product, rawQuery) {
  if (!product) return 0;
  if (!rawQuery || !rawQuery.trim()) return 100; // All match if empty query

  const cleanQ = normalizeSearchString(rawQuery);
  if (!cleanQ) return 100;

  const nameClean = normalizeSearchString(product.name || "");
  const categoryClean = normalizeSearchString(product.category || "");
  const subCategoryClean = normalizeSearchString(product.subCategory || "");
  const mukhiClean = normalizeSearchString(product.mukhi || "");
  const slugClean = normalizeSearchString((product.slug || "").replace(/-/g, " "));

  const keywordsClean = Array.isArray(product.keywords) 
    ? product.keywords.map(k => normalizeSearchString(extractKeywordString(k))).filter(Boolean) 
    : [];
  const searchKeywordsClean = Array.isArray(product.searchKeywords) 
    ? product.searchKeywords.map(k => normalizeSearchString(extractKeywordString(k))).filter(Boolean) 
    : [];
  const tagsClean = Array.isArray(product.tags) 
    ? product.tags.map(t => normalizeSearchString(extractKeywordString(t))).filter(Boolean) 
    : [];

  const originClean = normalizeSearchString(product.origin || "");
  const planetClean = normalizeSearchString(product.rulingPlanet || "");
  const deityClean = normalizeSearchString(product.deity || "");
  const zodiacClean = normalizeSearchString(Array.isArray(product.zodiac) ? product.zodiac.join(" ") : product.zodiac || "");

  // Extract explicit Mukhi intentions
  const queryMukhi = extractMukhiNumber(cleanQ);
  const prodMukhi = extractMukhiNumber(mukhiClean) || extractMukhiNumber(nameClean);

  // If query explicitly asks for a specific Mukhi (e.g. "5 mukhi" or "5")
  // and product is explicitly a DIFFERENT Mukhi (e.g. "7 mukhi"), then fail match!
  if (queryMukhi && prodMukhi && queryMukhi !== prodMukhi) {
    return 0;
  }

  // Check special cases like "gauri shankar"
  if (/gauri\s*shankar/i.test(cleanQ)) {
    if (/gauri\s*shankar/i.test(nameClean) || /gauri\s*shankar/i.test(mukhiClean) || /gauri\s*shankar/i.test(categoryClean)) {
      return 100;
    }
    return 0;
  }

  // Exact phrase match (Highest Priority)
  if (nameClean.includes(cleanQ)) return 100;
  if (slugClean.includes(cleanQ)) return 95;
  if (mukhiClean && mukhiClean.includes(cleanQ)) return 90;
  if (keywordsClean.some(k => k === cleanQ || k.includes(cleanQ))) return 85;
  if (searchKeywordsClean.some(sk => sk === cleanQ || sk.includes(cleanQ))) return 85;
  if (tagsClean.some(t => t === cleanQ || t.includes(cleanQ))) return 80;
  if (categoryClean.includes(cleanQ) || subCategoryClean.includes(cleanQ)) return 75;
  if (deityClean.includes(cleanQ) || planetClean.includes(cleanQ) || zodiacClean.includes(cleanQ) || originClean.includes(cleanQ)) return 70;

  // Build key attributes corpus (EXCLUDING long generic descriptions and price numbers)
  const coreCorpusParts = [
    nameClean,
    slugClean,
    categoryClean,
    subCategoryClean,
    mukhiClean,
    keywordsClean.join(" "),
    searchKeywordsClean.join(" "),
    tagsClean.join(" "),
    deityClean,
    planetClean,
    zodiacClean,
    originClean,
    product.highlight || "",
    product.homeBadge || "",
    product.badge || ""
  ];
  const coreCorpus = normalizeSearchString(coreCorpusParts.join(" "));

  if (coreCorpus.includes(cleanQ)) return 60;

  // Tokenized Search (All or majority tokens match)
  const tokens = cleanQ.split(" ").filter(t => t.length > 0);
  if (tokens.length === 0) return 100;

  let matchedTokens = 0;
  let bonusScore = 0;

  for (const token of tokens) {
    // Ignore extremely common 1-2 letter noise unless numeric
    if (token.length < 2 && !/^\d+$/.test(token)) {
      matchedTokens++;
      continue;
    }

    if (coreCorpus.includes(token)) {
      matchedTokens++;
      if (nameClean.includes(token)) bonusScore += 10;
      continue;
    }

    // Synonym check (e.g. panch -> 5)
    let synonymMatched = false;
    for (const [num, synonyms] of Object.entries(HINDI_NUMBER_SYNONYMS)) {
      if (synonyms.includes(token)) {
        if (synonyms.some(syn => coreCorpus.includes(syn))) {
          matchedTokens++;
          bonusScore += 8;
          synonymMatched = true;
          break;
        }
      }
    }

    // Typo variation (e.g. rudraksh -> rudraksha)
    if (!synonymMatched && (token.startsWith("rudraksh") || token.startsWith("rudrax"))) {
      if (coreCorpus.includes("rudraksha") || coreCorpus.includes("rudraksh")) {
        matchedTokens++;
        bonusScore += 5;
      }
    }
  }

  // All tokens matched core identity
  if (matchedTokens === tokens.length) {
    return 50 + bonusScore;
  }

  // Majority token match for multi-word search (>= 75%)
  if (tokens.length >= 2 && matchedTokens >= Math.ceil(tokens.length * 0.75)) {
    return 25 + bonusScore;
  }

  // Last resort: check clean description ONLY if query is at least 3 chars and no Mukhi mismatch
  if (product.description && cleanQ.length >= 3) {
    const cleanDesc = normalizeSearchString(product.description.replace(/<[^>]*>/g, " ").slice(0, 300));
    if (cleanDesc.includes(cleanQ)) {
      return 20;
    }
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
