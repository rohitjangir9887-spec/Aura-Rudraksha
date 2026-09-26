/**
 * Normalize Aura AI API payloads so customers never see internal JSON, thinking, or raw debug data.
 */

const INTERNAL_KEYS = [
  "recommendedProductIds",
  "couponCodes",
  "requiresHuman",
  "quickReplies",
  "products",
  "coupons"
];

function looksLikeInternalJson(obj) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return false;
  return (
    "text" in obj ||
    "recommendedProductIds" in obj ||
    "couponCodes" in obj ||
    "requiresHuman" in obj ||
    "quickReplies" in obj
  );
}

export function stripThinkingAndReasoning(raw) {
  if (typeof raw !== "string") return "";
  let text = raw;

  // 1. Remove closed thinking / reasoning / analysis tags
  text = text.replace(/<think>[\s\S]*?<\/think>/gi, "");
  text = text.replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, "");
  text = text.replace(/<analysis>[\s\S]*?<\/analysis>/gi, "");

  // 2. If unclosed <think> tag is at the start (active thinking phase before response), strip it
  if (/^[\s\n]*<think>/i.test(text) && !text.includes("</think>")) {
    return "";
  }
  if (/^[\s\n]*<reasoning>/i.test(text) && !text.includes("</reasoning>")) {
    return "";
  }

  // 3. Remove internal chain-of-thought phrases & line narrations
  const reasoningRegexes = [
    /^[\s\n]*okay,?\s+the\s+user[\s\S]*?(?=\n\n|namaste|hello|hii|aap|haaye|haan|kaise|rudraksha|1000|pranam|har har|$)/i,
    /^[\s\n]*let\s+me\s+check[\s\S]*?(?=\n\n|namaste|hello|hii|aap|haaye|haan|kaise|rudraksha|1000|pranam|har har|$)/i,
    /^[\s\n]*looking\s+at\s+the\s+context[\s\S]*?(?=\n\n|namaste|hello|hii|aap|haaye|haan|kaise|rudraksha|1000|pranam|har har|$)/i,
    /^[\s\n]*first,?\s+they\s+started[\s\S]*?(?=\n\n|namaste|hello|hii|aap|haaye|haan|kaise|rudraksha|1000|pranam|har har|$)/i
  ];

  for (const reg of reasoningRegexes) {
    text = text.replace(reg, "");
  }

  // Filter individual lines that are internal narration
  const lines = text.split("\n").filter((line) => {
    const trimmed = line.trim().toLowerCase();
    if (
      trimmed.startsWith("okay, the user") ||
      trimmed.startsWith("let me check") ||
      trimmed.startsWith("looking at the context") ||
      trimmed.startsWith("looking at the history") ||
      trimmed.startsWith("first, they started") ||
      trimmed.startsWith("first, the user") ||
      trimmed.startsWith("thought process:") ||
      trimmed.startsWith("internal reasoning:") ||
      trimmed.startsWith("thinking:")
    ) {
      return false;
    }
    return true;
  });

  return lines.join("\n").trim();
}

export function cleanDevanagariAndForeignCharacters(text) {
  if (!text || typeof text !== "string") return "";
  let cleaned = text;

  // 1. Remove unintended Chinese (Hanzi / CJK), Japanese (Hiragana/Katakana), Korean (Hangul), and fullwidth artifacts
  cleaned = cleaned.replace(/[\u4e00-\u9fff\u3400-\u4dbf\u2e80-\u2fd5\uf900-\ufaff\u3040-\u30ff\uac00-\ud7af\uff01-\uffee]/g, "");

  // 2. Fix disconnected spaces before Devanagari matras, viramas (halant), nukta, anusvara, visarga
  // e.g. "क ा" -> "का", "र ु" -> "रु", "क ् ष" -> "क्ष"
  cleaned = cleaned.replace(/([\u0900-\u097F])\s+([\u093E-\u094D\u0962\u0963\u093C\u0901-\u0903])/g, "$1$2");
  cleaned = cleaned.replace(/([\u0900-\u097F]\u094D)\s+([\u0900-\u097F])/g, "$1$2");

  // 3. Repair common accidentally split Hindi / Vedic words
  cleaned = cleaned.replace(/रु\s+द्रा\s+क्ष/g, "रुद्राक्ष");
  cleaned = cleaned.replace(/रुद्र\s+ाक्ष/g, "रुद्राक्ष");
  cleaned = cleaned.replace(/ने\s+पा\s+ली/g, "नेपाली");
  cleaned = cleaned.replace(/कुं\s+ड\s+ली/g, "कुंडली");
  cleaned = cleaned.replace(/कं\s+ुडली/g, "कुंडली");
  cleaned = cleaned.replace(/कुण्ड\s+ली/g, "कुण्डली");
  cleaned = cleaned.replace(/महा\s+दशा/g, "महादशा");
  cleaned = cleaned.replace(/म\s+हा\s+द\s+शा/g, "महादशा");
  cleaned = cleaned.replace(/अं\s+तर्दशा/g, "अंतर्दशा");
  cleaned = cleaned.replace(/अंतर\s+दशा/g, "अंतर्दशा");
  cleaned = cleaned.replace(/प्र\s+त्यंतर\s+दशा/g, "प्रत्यंतर्दशा");
  cleaned = cleaned.replace(/प्र\s+णाम/g, "प्रणाम");
  cleaned = cleaned.replace(/ज्यो\s+तिष/g, "ज्योतिष");
  cleaned = cleaned.replace(/क\s+ल्याण\s+कारी/g, "कल्याणकारी");
  cleaned = cleaned.replace(/विं\s+शोत्तरी/g, "विंशोत्तरी");
  cleaned = cleaned.replace(/प्रा\s+ण\s*-\s*प्रति\s+ष्ठा/g, "प्राण-प्रतिष्ठा");
  cleaned = cleaned.replace(/धार\s+ण/g, "धारण");
  cleaned = cleaned.replace(/वि\s+धि/g, "विधि");

  // 4. Collapse accidental multiple spaces (preserve single spaces and newlines)
  cleaned = cleaned.replace(/[ \t]{2,}/g, " ");

  return cleaned;
}

export function sanitizeCustomerText(raw) {
  if (typeof raw !== "string") return "";
  let text = stripThinkingAndReasoning(raw);
  if (!text) return "";

  // 1. Remove Code fences & JSON blobs
  text = text.replace(/^```(?:json|markdown)?\s*/i, "").replace(/\s*```$/i, "").trim();

  // 1b. Replace raw HTML linebreaks with standard newlines
  text = text.replace(/<br\s*\/?>/gi, "\n");

  // 1c. Replace masked date placeholders like 2024-XX-XX or XX-XX with "date not available"
  text = text.replace(/\b\d{4}-XX-XX\b/gi, "(date not available)");
  text = text.replace(/\bXX-XX-\d{4}\b/gi, "(date not available)");
  text = text.replace(/\bXX-XX\b/gi, "(date not available)");

  // 2. Filter any accidental admin email or internal route leakages
  text = text.replace(/rohitjangir\d*@gmail\.com/gi, "aurarudrakshaofficial@gmail.com");
  text = text.replace(/MONGODB_[A-Z0-9_]+/gi, "");
  text = text.replace(/GEMINI_API_[A-Z0-9_]+/gi, "");
  text = text.replace(/NVIDIA_API_[A-Z0-9_]+/gi, "");
  text = text.replace(/admin\s*portal\s*url/gi, "Aura Rudraksha Support");

  // 3. Remove raw JSON object wrapper if entire response is a JSON envelope
  if (/^[\s\n]*\{/.test(text)) {
    const parsed = tryParseJsonObject(text);
    if (parsed && typeof parsed === "object") {
      if (parsed.text) return sanitizeCustomerText(String(parsed.text));
      if (parsed.message) return sanitizeCustomerText(String(parsed.message));
    }
  }

  // 4. Clean Chinese characters and repair Devanagari word spacing
  text = cleanDevanagariAndForeignCharacters(text);

  return text.trim();
}

function tryParseJsonObject(s) {
  if (!s || typeof s !== "string") return null;
  const cleaned = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  try {
    const v = JSON.parse(cleaned);
    return v && typeof v === "object" ? v : null;
  } catch (_) {}
  const start = cleaned.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < cleaned.length; i++) {
    if (cleaned[i] === "{") depth += 1;
    else if (cleaned[i] === "}") {
      depth -= 1;
      if (depth === 0) {
        try {
          return JSON.parse(cleaned.slice(start, i + 1));
        } catch (_) {
          return null;
        }
      }
    }
  }
  return null;
}

export function normalizeKundali(k) {
  if (!k || typeof k !== "object") return null;

  const verified = k.verifiedBirthData || {};
  const astro = k.astronomicalKundali || {};
  const lagna = astro.lagna || k.lagna || {};
  const chandra = astro.chandraRashi || k.chandraRashi || {};
  const surya = astro.suryaRashi || k.suryaRashi || {};
  const dasha = astro.vimshottariDasha || k.vimshottariDasha || {};
  const recs = astro.rudrakshaRecommendations || k.rudrakshaRecommendations || [];

  return {
    ...k,
    verifiedBirthData: verified,
    astronomicalKundali: astro,
    devoteeName: verified.name || k.devoteeName || k.name || "Devotee",
    dob: verified.dob || k.dob || "",
    birthTime: verified.birthTime || k.birthTime || "",
    birthPlace: verified.birthPlace || k.birthPlace || "",

    // Lagna (Ascendant)
    lagna: {
      rashiHindi: lagna.rashiHindi || k.lagnaRashiHindi || "",
      rashiEnglish: lagna.rashiEnglish || k.lagnaRashiEng || "",
      rashiSymbol: lagna.rashiSymbol || k.lagnaSymbol || "✨",
      degree: lagna.degree || k.lagnaDegree || "",
      nakshatra: lagna.nakshatra || k.lagnaNakshatra || "",
      pada: lagna.pada || k.lagnaPada || "",
      lord: lagna.lord || k.lagnaLord || ""
    },

    // Chandra Rashi (Moon Sign)
    chandraRashi: {
      rashiHindi: chandra.rashiHindi || k.rashiHindi || "",
      rashiEnglish: chandra.rashiEnglish || k.rashiEng || "",
      rashiSymbol: chandra.rashiSymbol || k.symbol || "✨",
      degree: chandra.degree || k.chandraDegree || "",
      nakshatra: chandra.nakshatra || k.nakshatra || "",
      pada: chandra.pada || k.pada || "",
      lord: chandra.lord || k.lord || ""
    },

    // Surya Rashi (Sun Sign)
    suryaRashi: {
      rashiHindi: surya.rashiHindi || k.suryaRashiHindi || "",
      rashiEnglish: surya.rashiEnglish || k.suryaRashiEng || "",
      degree: surya.degree || k.suryaDegree || "",
      nakshatra: surya.nakshatra || k.suryaNakshatra || ""
    },

    // Flat convenient accessors
    lagnaRashiHindi: lagna.rashiHindi || k.lagnaRashiHindi || "",
    lagnaRashiEng: lagna.rashiEnglish || k.lagnaRashiEng || "",
    lagnaDegree: lagna.degree || k.lagnaDegree || "",
    rashiHindi: chandra.rashiHindi || k.rashiHindi || "",
    rashiEng: chandra.rashiEnglish || k.rashiEng || "",
    symbol: chandra.rashiSymbol || k.symbol || "✨",
    lord: chandra.lord || k.lord || "",
    nakshatra: chandra.nakshatra || k.nakshatra || "",
    pada: chandra.pada || k.pada || "",
    suryaRashiHindi: surya.rashiHindi || k.suryaRashiHindi || "",
    suryaDegree: surya.degree || k.suryaDegree || "",
    mulank: astro.mulank || k.mulank || "",

    // Dasha
    vimshottariDasha: dasha,
    mahadashaHindi: dasha.currentMahadashaHindi || k.mahadashaHindi || "",
    antardashaHindi: dasha.currentAntardashaHindi || k.antardashaHindi || "",
    pratyantardashaHindi: dasha.currentPratyantardashaHindi || k.pratyantardashaHindi || "",
    sookshmaDashaHindi: dasha.currentSookshmaDashaHindi || k.sookshmaDashaHindi || "",
    dashaChainSummary: dasha.dashaChainSummary || k.dashaChainSummary || "",

    // Planets & Houses
    planets: astro.planets || k.planets || [],
    houses: astro.houses || k.houses || [],
    doshaSummary: astro.doshaSummary || k.doshaSummary || null,

    // Classical Calculation Engines
    avakahadaChakra: astro.avakahadaChakra || k.avakahadaChakra || null,
    shodashvarga: astro.shodashvarga || k.shodashvarga || [],
    shadbala: astro.shadbala || k.shadbala || null,
    ashtakvarga: astro.ashtakvarga || k.ashtakvarga || null,
    kpSystem: astro.kpSystem || k.kpSystem || null,
    jaimini: astro.jaimini || k.jaimini || null,
    lalKitab: astro.lalKitab || k.lalKitab || null,
    yoginiDasha: astro.yoginiDasha || k.yoginiDasha || null,
    tajikVarshphal: astro.tajikVarshphal || k.tajikVarshphal || null,
    gochar: astro.gochar || k.gochar || [],
    panchanga: astro.panchanga || k.panchanga || null,
    yogas: astro.yogas || k.yogas || [],
    jaiminiKarakas: astro.jaiminiKarakas || k.jaiminiKarakas || [],
    badhakaMarakaInfo: astro.badhakaMarakaInfo || k.badhakaMarakaInfo || null,

    // Recommendations
    rudrakshaRecommendations: recs,
    recommendedMukhi: recs[0]?.mukhi || k.recommendedMukhi || null,
    beejMantra: recs[0]?.beejMantra || k.beejMantra || "Om Namah Shivaya",
    wearingDay: k.wearingDay || "सोमवार / शिव तिथि",
    aiInterpretation: k.aiInterpretation || ""
  };
}

export function parseAuraAiPayload(raw) {
  const empty = {
    text: "",
    products: [],
    coupons: [],
    recommendedProductIds: [],
    couponCodes: [],
    requiresHuman: false,
    quickReplies: [],
    orderInfo: null,
    kundali: null
  };

  if (raw == null) return empty;

  if (typeof raw === "string") {
    const trimmed = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    if (trimmed.startsWith("{")) {
      const parsed = tryParseJsonObject(trimmed);
      if (parsed) return parseAuraAiPayload(parsed);
    }
    return { ...empty, text: sanitizeCustomerText(raw) };
  }

  if (typeof raw !== "object") {
    return { ...empty, text: sanitizeCustomerText(String(raw)) };
  }

  if (raw.data && typeof raw.data === "object" && (raw.text == null || raw.success)) {
    const inner = parseAuraAiPayload(raw.data);
    if (inner.text || inner.products?.length || inner.kundali) return inner;
  }

  const textSource =
    typeof raw.text === "string"
      ? raw.text
      : typeof raw.message === "string"
        ? raw.message
        : typeof raw.content === "string"
          ? raw.content
          : "";

  const text = sanitizeCustomerText(textSource);

  const products = Array.isArray(raw.products) ? raw.products.filter((p) => p && typeof p === "object" && (p.id || p.name)) : [];
  const coupons = Array.isArray(raw.coupons)
    ? raw.coupons.filter((c) => c && typeof c === "object" && c.code)
    : [];

  let quickReplies = [];
  if (Array.isArray(raw.quickReplies)) {
    quickReplies = raw.quickReplies
      .map((q) => (typeof q === "string" ? q : q?.label || q?.text || ""))
      .filter((q) => q && typeof q === "string")
      .slice(0, 4);
  }

  const rawKundali = raw.kundali || raw.data?.kundali || null;

  return {
    text,
    products,
    coupons,
    recommendedProductIds: Array.isArray(raw.recommendedProductIds) ? raw.recommendedProductIds : [],
    couponCodes: Array.isArray(raw.couponCodes) ? raw.couponCodes : [],
    requiresHuman: Boolean(raw.requiresHuman),
    quickReplies,
    orderInfo: raw.orderInfo || null,
    conversationId: raw.conversationId,
    kundali: rawKundali ? normalizeKundali(rawKundali) : null
  };
}

export function customerSafeAiText(value) {
  if (value == null) return "";
  if (typeof value === "object") {
    return parseAuraAiPayload(value).text;
  }
  return sanitizeCustomerText(String(value));
}

/**
 * Smartly merge continuation text into existing base text cleanly without broken newlines,
 * repeated greetings, or duplicated overlapping words or duplicate entire sentences.
 */
export function smartMergeContinuation(baseText, continuationText) {
  if (!baseText) return continuationText || "";
  if (!continuationText) return baseText || "";

  let cleanBase = String(baseText).trimEnd();
  let cleanCont = String(continuationText).trimStart();

  // Strip repeated greeting restarts or AI intro prefixes if present at start of continuation
  cleanCont = cleanCont.replace(/^(🙏\s*)?(प्रणाम(\s*भक्त)?|हर\s*हर\s*महादेव|नमस्ते|शुभ\s*आशीर्वाद|जी\s*हाँ|आगे\s*का\s*उत्तर|उत्तर\s*आगे|शेष\s*विवरण)[!।:]?\s*/i, "");

  const trimmedBase = cleanBase.trim();
  const trimmedCont = cleanCont.trim();

  // 1. Exact duplicate or continuation already completely contained inside base text
  if (!trimmedCont || trimmedBase === trimmedCont || trimmedBase.endsWith(trimmedCont) || cleanBase.includes(trimmedCont)) {
    return cleanBase;
  }

  // 2. Continuation is a complete replacement/superset of base
  if (trimmedCont.startsWith(trimmedBase)) {
    return cleanCont;
  }

  // 3. Sentence-level deduplication: If continuation repeats sentences from baseText
  const baseSentences = cleanBase.split(/(?<=[।!?.\n])\s+/).map(s => s.trim()).filter(s => s.length > 8);
  let contSentences = cleanCont.split(/(?<=[।!?.\n])\s+/).map(s => s.trim()).filter(Boolean);
  while (contSentences.length > 0) {
    const firstContSentence = contSentences[0];
    if (firstContSentence.length > 8 && baseSentences.some(bs => bs === firstContSentence || bs.includes(firstContSentence) || (bs.length > 15 && firstContSentence.includes(bs)))) {
      contSentences.shift();
    } else {
      break;
    }
  }
  cleanCont = contSentences.join(" ").trim();
  if (!cleanCont) {
    return cleanBase;
  }

  // 4. Character-level suffix/prefix overlap search (from 250 down to 6 characters)
  const maxOverlap = Math.min(250, cleanBase.length, cleanCont.length);
  for (let len = maxOverlap; len >= 6; len--) {
    const baseSuffix = cleanBase.slice(-len);
    if (cleanCont.startsWith(baseSuffix)) {
      return cleanBase + cleanCont.slice(len);
    }
  }

  // 5. If base ends with a newline or table pipe, join cleanly
  if (/[\n|]$/.test(cleanBase)) {
    return cleanBase + "\n" + cleanCont;
  }

  // 6. If base ends with sentence punctuation (danda । , period , exclamation , question mark)
  if (/[।!?.:]$/.test(cleanBase)) {
    return cleanBase + " " + cleanCont;
  }

  // 7. If base ended mid-word or mid-sentence without punctuation
  const needsSpace = !/\s$/.test(cleanBase) && !/^\s/.test(cleanCont) && !/^[।,.;:!?]/.test(cleanCont);
  return cleanBase + (needsSpace ? " " : "") + cleanCont;
}

export function isAuraResponseIncomplete(text, mode = "standard") {
  if (!text || typeof text !== "string") return false;
  const trimmed = text.trim();
  
  if (trimmed.length < 30) return false;

  // 1. Explicit terminal blessings / greetings closing or keywords = complete
  if (/(\*\*हर\s*हर\s*महादेव\*?\*?\s*$|हर\s*हर\s*महादेव\.?\s*$|जय\s*श्री\s*राम\.?\s*$|ॐ\s*नमः\s*शिवाय\.?\s*$|ॐ\s*शांति\.?\s*$|शुभम्\.?\s*$|अस्तु\.?\s*$|शुभकामनाएं\.?\s*$|\[AURA_KEYWORDS\])/i.test(trimmed)) {
    return false;
  }

  // 2. Unclosed code fences = incomplete
  const codeBlockCount = (trimmed.match(/```/g) || []).length;
  if (codeBlockCount % 2 !== 0) return true;

  // 3. Unclosed markdown table row cut off mid-cell
  if (/\|[^\n|]+$/.test(trimmed) && !trimmed.endsWith("|")) return true;

  // 3b. If in panditji mode, check if a 9-planet table was started (has Surya/Sun) but was cut off before finishing planets (missing Rahu/Ketu)
  if (mode === "panditji" && (trimmed.includes("सूर्य") || trimmed.includes("Sun")) && !(trimmed.includes("राहु") || trimmed.includes("Rahu") || trimmed.includes("केतु") || trimmed.includes("Ketu"))) {
    return true;
  }

  // 4. Check explicit continuation/truncation signals
  if (/(\.\.\.|…|\(जारी\.\.\.\)|\(to be continued\.\.\.\)|अधूरा उत्तर|आगे का उत्तर|अगला भाग)$/i.test(trimmed)) {
    return true;
  }

  // 5. Check true dangling connectors or open punctuation at end of string
  const trueDanglingConnectors = /(तथा|और|एवं|क्योंकि|अर्थात|जैसे कि|किन्तु|परन्तु|जिसमें|जिसके|जिसका|जो कि|यानी|अतः|इसलिए|तदोपरांत|and|or|but|because|with|by|to|for|1\.|2\.|3\.|4\.|5\.|6\.|7\.|8\.|9\.|10\.|•|→|:\s*|,|\.\.\.|\(-)$/i;
  if (trueDanglingConnectors.test(trimmed)) return true;

  // 6. Check last non-whitespace character. If it ends with complete sentence punctuation or closing bracket/emoji, it is complete!
  const lastChar = trimmed.slice(-1);
  const completeEndPattern = /[।\.!\?\)\}\]>\|\n🙏🕉️✨🚩💯🏷️📦📿📞👍😊🌸🍀]/;

  if (completeEndPattern.test(lastChar)) {
    return false; // Complete response -> Do NOT show "आगे पूरा करें"
  }

  // If it ends without punctuation (mid-sentence/mid-word), it is incomplete!
  return true;
}

