/**
 * Aura Rudraksha — Server-Side Keyword Intelligence & Product SEO Pipeline
 * 
 * Provides deterministic mapping of search terms, auto-generates metaTitle,
 * metaDescription, image alt texts, structured tags, and natural keyword arrays
 * without stuffing or medical claim hallucinations.
 */

import { VEDIC_BEADS_KNOWLEDGE, extractMukhiNumber } from "./vedicKnowledgeService.js";

export const MASTER_KEYWORD_TAXONOMY = {
  brand: [
    "Aura Rudraksha",
    "Aura Rudraksha official store",
    "aurarudraksha bond",
    "buy authentic rudraksha aura",
    "Aura Rudraksha lab certified"
  ],
  commercial: [
    "buy rudraksha online",
    "original rudraksha price in india",
    "lab certified nepali rudraksha",
    "authentic himalayan rudraksha",
    "genuine rudraksha store online",
    "consecrated rudraksha beads",
    "asli rudraksha online kharide"
  ],
  mukhiKeywords: {
    "1": ["1 mukhi rudraksha", "ek mukhi rudraksha", "original 1 mukhi rudraksha price", "1 mukhi rudraksha benefits", "1 mukhi rudraksha ke fayde", "1 mukhi rudraksha beej mantra"],
    "2": ["2 mukhi rudraksha", "do mukhi rudraksha", "2 mukhi rudraksha benefits", "ardhanarishvara 2 mukhi rudraksha", "2 mukhi rudraksha for harmony"],
    "3": ["3 mukhi rudraksha", "teen mukhi rudraksha", "3 mukhi rudraksha benefits", "3 mukhi rudraksha for mangal dosha", "agni devta 3 mukhi"],
    "4": ["4 mukhi rudraksha", "chaar mukhi rudraksha", "4 mukhi rudraksha for students", "brahma 4 mukhi rudraksha benefits", "4 mukhi rudraksh ke fayde"],
    "5": ["5 mukhi rudraksha", "panchmukhi rudraksha", "5 mukhi rudraksha price in india", "5 mukhi rudraksha benefits", "panchmukhi rudraksha ke fayde", "how to wear 5 mukhi rudraksha"],
    "6": ["6 mukhi rudraksha", "chhe mukhi rudraksha", "6 mukhi rudraksha benefits for willpower", "kartikeya 6 mukhi rudraksha", "6 mukhi rudraksha for venus"],
    "7": ["7 mukhi rudraksha", "saat mukhi rudraksha", "7 mukhi rudraksha for shani sade sati", "mahalakshmi 7 mukhi rudraksha", "7 mukhi rudraksha price"],
    "8": ["8 mukhi rudraksha", "aath mukhi rudraksha", "8 mukhi rudraksha for rahu dosha", "ganesha 8 mukhi rudraksha benefits", "8 mukhi rudraksh ke fayde"],
    "9": ["9 mukhi rudraksha", "nau mukhi rudraksha", "9 mukhi rudraksha durga shakti", "9 mukhi rudraksha for ketu", "9 mukhi rudraksha benefits"],
    "10": ["10 mukhi rudraksha", "das mukhi rudraksha", "vishnu 10 mukhi rudraksha kavach", "10 mukhi rudraksha for navagraha", "10 mukhi rudraksha benefits"],
    "11": ["11 mukhi rudraksha", "gyarah mukhi rudraksha", "hanuman 11 mukhi rudraksha", "11 mukhi rudraksha benefits for courage", "11 mukhi rudraksh dharan mantra"],
    "12": ["12 mukhi rudraksha", "barah mukhi rudraksha", "surya 12 mukhi rudraksha for leadership", "12 mukhi rudraksha benefits", "barah mukhi rudraksha ke fayde"],
    "13": ["13 mukhi rudraksha", "terah mukhi rudraksha", "kamadeva 13 mukhi rudraksha", "13 mukhi rudraksha benefits", "original 13 mukhi nepali rudraksha"],
    "14": ["14 mukhi rudraksha", "chaudah mukhi rudraksha", "deva mani 14 mukhi rudraksha", "14 mukhi rudraksha for third eye intuition", "14 mukhi rudraksha price"],
    "gauri-shankar": ["gauri shankar rudraksha", "original gauri shankar rudraksha price", "gauri shankar rudraksha for marriage", "gauri shankar rudraksha benefits"],
    "ganesh": ["ganesh rudraksha", "ganpati rudraksha benefits", "original ganesh rudraksha price", "ganesh rudraksha for obstacle removal"]
  }
};

/**
 * Automatically generate comprehensive, non-stuffed SEO fields for product uploads/updates
 */
export function generateProductSeoMetadata(product = {}) {
  const name = String(product.name || "").trim();
  const rawMukhi = product.mukhi || extractMukhiNumber(name);
  const mukhi = rawMukhi && /^\d+$/.test(String(rawMukhi)) ? String(rawMukhi) : null;
  const origin = (product.origin || "Nepal").trim();
  const category = (product.category || "Rudraksha").trim();
  const price = product.price ? Number(product.price) : null;

  const beadData = mukhi && VEDIC_BEADS_KNOWLEDGE[mukhi] ? VEDIC_BEADS_KNOWLEDGE[mukhi] : null;
  const deity = product.deity || beadData?.deity || (/gauri/i.test(name) ? "Shiva & Parvati" : /ganesh/i.test(name) ? "Lord Ganesha" : "Lord Shiva");
  const planet = product.rulingPlanet || beadData?.planet || "Navagraha";

  // 1. Meta Title (Max ~60-65 chars for Google SERP)
  let metaTitle = product.metaTitle || "";
  if (!metaTitle) {
    if (mukhi) {
      metaTitle = `${mukhi} Mukhi Rudraksha (${origin}) — Lab Certified | Aura Rudraksha`;
    } else if (/gauri\s*shankar/i.test(name)) {
      metaTitle = `Original Gauri Shankar Rudraksha (${origin}) | Aura Rudraksha`;
    } else if (/ganesh/i.test(name)) {
      metaTitle = `Authentic Ganesh Rudraksha (${origin}) | Aura Rudraksha`;
    } else if (category.toLowerCase().includes("mala")) {
      metaTitle = `${name} (108+1 Beads) | Aura Rudraksha`;
    } else {
      metaTitle = `${name} — 100% Authentic Lab Certified | Aura Rudraksha`;
    }
  }

  // 2. Meta Description (Max ~155-160 chars for Google SERP)
  let metaDescription = product.metaDescription || "";
  if (!metaDescription) {
    if (mukhi && beadData) {
      metaDescription = `Buy authentic ${mukhi} Mukhi Rudraksha bead from ${origin}. Blessed by ${deity}, ruled by planet ${planet}. Includes lab certificate & free insured shipping.`;
    } else {
      metaDescription = `Buy genuine ${name} with laboratory authenticity certificate. Consecrated with traditional Vedic rituals. Free nationwide shipping at Aura Rudraksha.`;
    }
  }

  // 3. Image Alt Text
  const primaryAlt = `${name} - 100% Authentic ${origin} Origin Lab Certified Bead`;
  const galleryAlts = [
    `${name} front view showing natural mukhi lines and organic texture`,
    `${name} authenticity certificate and laboratory verification report`,
    `${name} scale measurement and natural Himalayan bead contours`
  ];

  // 4. Natural Keywords (No keyword stuffing - max 6 to 8 highly targeted phrases)
  const keywordSet = new Set();
  
  if (mukhi && MASTER_KEYWORD_TAXONOMY.mukhiKeywords[mukhi]) {
    MASTER_KEYWORD_TAXONOMY.mukhiKeywords[mukhi].forEach(k => keywordSet.add(k));
  } else if (/gauri\s*shankar/i.test(name)) {
    MASTER_KEYWORD_TAXONOMY.mukhiKeywords["gauri-shankar"].forEach(k => keywordSet.add(k));
  } else if (/ganesh/i.test(name)) {
    MASTER_KEYWORD_TAXONOMY.mukhiKeywords["ganesh"].forEach(k => keywordSet.add(k));
  }

  if (category.toLowerCase().includes("mala")) {
    keywordSet.add("108 rudraksha japa mala");
    keywordSet.add("original 5 mukhi rudraksha mala");
  }

  keywordSet.add(`original ${origin.toLowerCase()} rudraksha`);
  keywordSet.add("lab certified rudraksha");
  keywordSet.add("Aura Rudraksha");

  const naturalKeywords = Array.from(keywordSet).slice(0, 8);

  return {
    metaTitle: metaTitle.slice(0, 70),
    metaDescription: metaDescription.slice(0, 160),
    primaryAlt,
    galleryAlts,
    keywords: naturalKeywords,
    searchKeywords: naturalKeywords,
    tags: [
      category,
      origin,
      mukhi ? `${mukhi} Mukhi` : "Sacred Bead",
      "Lab Certified",
      "Vedic Consecrated"
    ],
    deity,
    rulingPlanet: planet
  };
}
