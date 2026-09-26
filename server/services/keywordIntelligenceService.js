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
    "14": ["14 mukhi rudraksha", "chaudah mukhi rudraksha", "deva mani 14 mukhi rudraksha", "14 mukhi rudraksha for intuition", "14 mukhi rudraksha price"],
    "15": ["15 mukhi rudraksha", "pandrah mukhi rudraksha", "15 mukhi rudraksha Nepal", "15 mukhi rudraksha benefits", "15 mukhi rudraksha price"],
    "16": ["16 mukhi rudraksha", "solah mukhi rudraksha", "16 mukhi rudraksha Nepal", "16 mukhi rudraksha benefits", "16 mukhi rudraksha price"],
    "17": ["17 mukhi rudraksha", "satrah mukhi rudraksha", "17 mukhi rudraksha Nepal", "17 mukhi rudraksha benefits", "17 mukhi rudraksha price"],
    "18": ["18 mukhi rudraksha", "atharah mukhi rudraksha", "18 mukhi rudraksha Nepal", "18 mukhi rudraksha benefits", "18 mukhi rudraksha price"],
    "19": ["19 mukhi rudraksha", "unnis mukhi rudraksha", "19 mukhi rudraksha Nepal", "19 mukhi rudraksha benefits", "19 mukhi rudraksha price"],
    "20": ["20 mukhi rudraksha", "bees mukhi rudraksha", "20 mukhi rudraksha Nepal", "20 mukhi rudraksha benefits", "20 mukhi rudraksha price"],
    "21": ["21 mukhi rudraksha", "ikkis mukhi rudraksha", "21 mukhi rudraksha Nepal", "21 mukhi rudraksha benefits", "21 mukhi rudraksha price"],
    "gauri-shankar": ["gauri shankar rudraksha", "original gauri shankar rudraksha price", "gauri shankar rudraksha for marriage", "gauri shankar rudraksha benefits"],
    "ganesh": ["ganesh rudraksha", "ganpati rudraksha benefits", "original ganesh rudraksha price", "ganesh rudraksha for obstacle removal"]
  }
};

/**
 * Automatically generate concise, non-stuffed SEO fields for product uploads/updates.
 */
export function generateProductSeoMetadata(product = {}) {
  const name = String(product.name || "").trim();
  const category = (product.category || "Rudraksha").trim();
  const nameLower = name.toLowerCase();
  const catLower = category.toLowerCase();

  const isPuja = catLower.includes("puja") || catLower.includes("samagri") || nameLower.includes("kapoor") || nameLower.includes("camphor") || nameLower.includes("dhoop") || nameLower.includes("agarbatti") || nameLower.includes("chandan") || nameLower.includes("ghee") || nameLower.includes("diya") || nameLower.includes("incense") || nameLower.includes("attar") || nameLower.includes("hawan");
  const isMala = catLower.includes("mala") || nameLower.includes("mala") || nameLower.includes("kantha") || nameLower.includes("japa") || nameLower.includes("108");
  const isBracelet = catLower.includes("bracelet") || nameLower.includes("bracelet") || nameLower.includes("wristlet");
  const isYantra = catLower.includes("yantra") || catLower.includes("idol") || nameLower.includes("yantra") || nameLower.includes("idol") || nameLower.includes("statue");
  const isRudraksha = !isPuja && !isYantra && (catLower.includes("rudraksha") || /mukhi/i.test(name) || /gauri/i.test(name) || /ganesh/i.test(name));

  const rawMukhi = product.mukhi || extractMukhiNumber(name);
  const mukhi = isRudraksha && rawMukhi && /^\d+$/.test(String(rawMukhi)) ? String(rawMukhi) : null;
  const origin = (product.origin || (isRudraksha ? "Nepal" : "India")).trim();

  const beadData = mukhi && VEDIC_BEADS_KNOWLEDGE[mukhi] ? VEDIC_BEADS_KNOWLEDGE[mukhi] : null;
  const deity = product.deity || beadData?.deity || (/gauri/i.test(name) ? "Shiva & Parvati" : /ganesh/i.test(name) ? "Lord Ganesha" : isPuja ? "All Deities (Universal Puja)" : "Lord Shiva");
  const planet = product.rulingPlanet || beadData?.planet || "Navagraha";

  let metaTitle = product.metaTitle || "";
  if (!metaTitle) {
    if (mukhi) {
      metaTitle = `${mukhi} Mukhi Rudraksha (${origin}) — Lab Certified | Aura Store`;
    } else if (isPuja) {
      metaTitle = `Pure ${name} — Organic & Chemical Free | Aura Puja Store`;
    } else if (isMala) {
      metaTitle = `Authentic 108 Bead ${name} | Aura Store`;
    } else if (isYantra) {
      metaTitle = `Consecrated ${name} | Auspicious Vastu & Puja`;
    } else {
      metaTitle = `${name} — Authentic Consecrated | Aura Store`;
    }
  }

  let metaDescription = product.metaDescription || "";
  if (!metaDescription) {
    if (mukhi && beadData) {
      metaDescription = `Buy authentic ${mukhi} Mukhi Rudraksha bead from ${origin}. Traditional Vedic significance, lab certificate, and insured shipping.`;
    } else if (isPuja) {
      metaDescription = `Buy pure, organic ${name} online for daily home temple, aarti, and hawan. 100% natural, chemical-free and sacred consecrated quality.`;
    } else if (isMala) {
      metaDescription = `Buy genuine ${name} online. Pre-energized 108 bead Japa & dhyana string for meditation, mantra chanting, and protective aura.`;
    } else {
      metaDescription = `Buy genuine ${name} online. Pre-energized with traditional Vedic mantras for home temple, peace, and spiritual positivity.`;
    }
  }

  const primaryAlt = isPuja 
    ? `${name} - Pure Organic Home Temple Puja Samagri`
    : isMala 
    ? `${name} - Consecrated 108 Japa & Wearing String`
    : `${name} - ${origin} Origin Consecrated Item`;

  const galleryAlts = [
    `${name} front view showing natural texture and purity`,
    `${name} authentic packaging and store verification`,
    `${name} scale measurement and natural details`
  ];

  const keywordSet = new Set();
  keywordSet.add(name.toLowerCase());

  if (isPuja) {
    keywordSet.add(`buy ${name.toLowerCase()} online`);
    keywordSet.add(`pure ${name.toLowerCase()}`);
    keywordSet.add("organic puja samagri");
    keywordSet.add("home temple aarti essential");
    keywordSet.add("chemical free dhoop agarbatti");
    keywordSet.add("Aura Store");
  } else if (isMala) {
    keywordSet.add(`buy ${name.toLowerCase()} online`);
    keywordSet.add("108 bead japa mala");
    keywordSet.add("authentic japa mala for meditation");
    keywordSet.add("consecrated chanting string");
    keywordSet.add("Aura Store");
  } else if (isYantra) {
    keywordSet.add(`buy ${name.toLowerCase()} online`);
    keywordSet.add("consecrated brass idol");
    keywordSet.add("vastu yantra for home");
    keywordSet.add("Aura Store");
  } else if (isRudraksha) {
    if (mukhi && MASTER_KEYWORD_TAXONOMY.mukhiKeywords[mukhi]) {
      MASTER_KEYWORD_TAXONOMY.mukhiKeywords[mukhi].forEach(k => keywordSet.add(k));
    } else if (/gauri\s*shankar/i.test(name)) {
      MASTER_KEYWORD_TAXONOMY.mukhiKeywords["gauri-shankar"].forEach(k => keywordSet.add(k));
    } else if (/ganesh/i.test(name)) {
      MASTER_KEYWORD_TAXONOMY.mukhiKeywords["ganesh"].forEach(k => keywordSet.add(k));
    }
    keywordSet.add(`original ${origin.toLowerCase()} rudraksha`);
    keywordSet.add("lab certified rudraksha");
    keywordSet.add("Aura Rudraksha");
  } else {
    keywordSet.add(`buy ${name.toLowerCase()} online`);
    keywordSet.add("consecrated spiritual items");
    keywordSet.add("Aura Store");
  }

  const naturalKeywords = Array.from(keywordSet).slice(0, 10);

  return {
    metaTitle: metaTitle.slice(0, 65),
    metaDescription: metaDescription.slice(0, 155),
    primaryAlt,
    galleryAlts,
    keywords: naturalKeywords,
    searchKeywords: naturalKeywords,
    tags: [
      category,
      isPuja ? "Puja Samagri" : isMala ? "Mala" : isYantra ? "Yantra & Idol" : origin,
      mukhi ? `${mukhi} Mukhi` : "Sacred Item",
      "Consecrated",
      "Aura Store"
    ],
    deity,
    rulingPlanet: planet
  };
}
