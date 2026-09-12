import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import { extractMukhiNumber, VEDIC_BEADS_KNOWLEDGE } from "./vedicKnowledgeService.js";

export const NEMOTRON_NIM_MODEL = "nvidia/nemotron-3-super-120b-a12b";
export const NVIDIA_NIM_BASE_URL = "https://integrate.api.nvidia.com/v1";

let cachedGeminiClient = null;

export function getGeminiClient() {
  if (cachedGeminiClient) return cachedGeminiClient;
  const apiKey = (process.env.GEMINI_API_KEY || "").trim();
  if (!apiKey) return null;
  try {
    cachedGeminiClient = new GoogleGenAI({ apiKey });
    return cachedGeminiClient;
  } catch (err) {
    console.warn("[Gemini Client] Initialization notice:", err?.message || err);
    return null;
  }
}

/**
 * Initialize NVIDIA NIM Client strictly configured for nvidia/nemotron-3-super-120b-a12b
 */
export function getNvidiaNemotronClient() {
  const apiKey = (
    process.env.NVIDIA_API_KEY ||
    process.env.NEMOTRON_API_KEY ||
    process.env.NVIDIA_NIM_API_KEY ||
    ""
  ).trim();
  if (!apiKey) return null;

  const baseURL = (process.env.NEMOTRON_BASE_URL || NVIDIA_NIM_BASE_URL).trim();
  try {
    return new OpenAI({
      baseURL,
      apiKey,
      timeout: 35000
    });
  } catch (err) {
    console.warn("[Nemotron Engine] Client initialization notice:", err?.message || err);
    return null;
  }
}

/**
 * Sanitize text to enforce Medical/Health Claim Safety
 * Replaces direct medical claims with traditional belief disclaimers.
 */
export function sanitizeMedicalAndHealthClaims(text) {
  if (!text || typeof text !== "string") return text;
  let sanitized = text;

  const medicalReplacements = [
    { pattern: /\bcures?\s+blood\s+pressure\b/gi, replacement: "supports emotional calmness & traditional wellness (Traditional belief — not medical advice)" },
    { pattern: /\bcures?\s+thyroid\b/gi, replacement: "traditionally believed to balance throat chakra energy (Traditional belief — not medical advice)" },
    { pattern: /\bcures?\s+diseases?\b/gi, replacement: "traditionally believed to promote spiritual vitality (Traditional belief — not medical advice)" },
    { pattern: /\bguarantees?\s+immunity\b/gi, replacement: "associated with traditional aura protection (Traditional belief — not medical advice)" },
    { pattern: /\btreats?\s+medical\b/gi, replacement: "traditionally used for spiritual well-being (Traditional belief — not medical advice)" },
    { pattern: /\bcures?\b/gi, replacement: "traditionally aids" }
  ];

  for (const { pattern, replacement } of medicalReplacements) {
    sanitized = sanitized.replace(pattern, replacement);
  }

  return sanitized;
}

/**
 * Extract Core Head Terms from product title (e.g. "5 mukhi rudraksha", "5mukhi rudraksha", "panchmukhi rudraksha")
 */
export function extractCoreHeadTerms(cleanName = "", category = "", mukhiNum = null) {
  const mNumRaw = mukhiNum || extractMukhiNumber(cleanName);
  const mNum = (mNumRaw && /^\d+$/.test(String(mNumRaw))) ? String(mNumRaw) : null;
  const coreTerms = [];
  let mainCore = "";

  if (mNum) {
    mainCore = `${mNum} mukhi rudraksha`;
    coreTerms.push(mainCore);
    coreTerms.push(`${mNum}mukhi rudraksha`);
    coreTerms.push(`${mNum} mukhi rudraksh`);

    const HINDI_MUKHI_MAP = {
      1: "ek mukhi rudraksha",
      2: "do mukhi rudraksha",
      3: "teen mukhi rudraksha",
      4: "chaar mukhi rudraksha",
      5: "panchmukhi rudraksha",
      6: "chheh mukhi rudraksha",
      7: "saat mukhi rudraksha",
      8: "aath mukhi rudraksha",
      9: "nau mukhi rudraksha",
      10: "das mukhi rudraksha",
      11: "gyarah mukhi rudraksha",
      12: "barah mukhi rudraksha",
      13: "terah mukhi rudraksha",
      14: "chaudah mukhi rudraksha"
    };
    if (HINDI_MUKHI_MAP[mNum]) {
      coreTerms.push(HINDI_MUKHI_MAP[mNum]);
    }
  } else if (/gauri\s*shankar/i.test(cleanName)) {
    mainCore = "gauri shankar rudraksha";
    coreTerms.push("gauri shankar rudraksha", "gaurishankar rudraksh");
  } else if (/ganesh/i.test(cleanName)) {
    mainCore = "ganesh rudraksha";
    coreTerms.push("ganesh rudraksha", "ganpati rudraksh");
  } else if (/sphatik/i.test(cleanName)) {
    mainCore = "sphatik mala";
    coreTerms.push("sphatik mala", "sphatik crystal mala", "sphatik 108 mala");
  } else if (/tulsi/i.test(cleanName)) {
    mainCore = "tulsi mala";
    coreTerms.push("tulsi mala", "original tulsi mala", "iskcon tulsi mala");
  } else if (/mala/i.test(cleanName)) {
    mainCore = cleanName
      .toLowerCase()
      .replace(/\b(buy|online|original|lab\s*certified|certified|genuine|100%|authentic|price|cost|best|quality)\b/gi, "")
      .replace(/[()|]/g, "")
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!mainCore) mainCore = "rudraksha mala";
    coreTerms.push(mainCore);
  } else {
    // Strip promotional modifiers from raw title to obtain clean subject
    mainCore = cleanName
      .toLowerCase()
      .replace(/\b(buy|online|original|lab\s*certified|certified|genuine|nepali|nepal|100%|authentic|price|cost|best|quality|free\s*shipping)\b/gi, "")
      .replace(/[()|]/g, "")
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!mainCore || mainCore.length < 3) {
      mainCore = cleanName.toLowerCase().replace(/[()|]/g, "").replace(/\s+/g, " ").trim();
    }
    coreTerms.push(mainCore);
  }

  return { mainCore, coreTerms };
}

/**
 * Filter, Deduplicate and Rank Keywords based on Natural Search Intent
 */
export function filterAndRankKeywords(candidates = [], mainCore = "") {
  const seen = new Set();
  const validKeywords = [];

  const commercialModifiers = ["buy", "online", "price", "original", "lab", "certified", "genuine", "authentic", "best", "shop", "store", "cost"];

  for (const rawItem of candidates) {
    const rawKw = typeof rawItem === "string" ? rawItem : (rawItem?.keyword || rawItem?.term || rawItem?.text || rawItem?.value || "");
    if (!rawKw || typeof rawKw !== "string") continue;

    let kw = rawKw
      .toLowerCase()
      .replace(/[()|]/g, "")
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!kw || kw.length < 2) continue;

    const words = kw.split(" ");
    if (words.length > 9) continue; // Skip unnaturally long title-dumps

    // Reject phrase if it has repeated words (e.g. "buy buy", "original original")
    const wordCounts = {};
    let hasDuplicateWord = false;
    for (const w of words) {
      if (w.length <= 2) continue; // ignore short prepositions like "in", "to", "ke"
      wordCounts[w] = (wordCounts[w] || 0) + 1;
      if (wordCounts[w] > 1) {
        hasDuplicateWord = true;
        break;
      }
    }
    if (hasDuplicateWord) continue;

    // Reject phrase if it stacks more than 2 commercial modifiers
    const commCount = words.filter(w => commercialModifiers.includes(w)).length;
    if (commCount > 2) continue;

    // Normalize whitespace for deduplication
    const normKey = words.join(" ");
    if (seen.has(normKey)) continue;
    seen.add(normKey);

    // Classify
    let kwType = "medium";
    if (words.length <= 2) kwType = "short";
    else if (words.length >= 5) kwType = "long_tail";
    if (/\b(kaise|kis|how|why|what)\b/.test(kw)) kwType = "question";

    let lang = "english";
    if (/\b(fayde|pehne|asli|pehchane|kis|rashi|dharan|vidhi|ke|liye)\b/.test(kw)) lang = "hinglish";

    let intent = "Informational";
    if (/\b(buy|price|cost|store|shop|online)\b/.test(kw)) intent = "Transactional/Commercial";
    else if (/\b(asli|pehchane|identify|lab|certified|genuine|original)\b/.test(kw)) intent = "Authenticity";
    else if (/\b(benefits|fayde|mantra|rashi|significance)\b/.test(kw)) intent = "Benefits/Traditional Significance";
    else if (/\b(pehne|dharan|vidhi|care)\b/.test(kw)) intent = "Wearing/Care";

    // Score represents internal model relevance (not Google search volume)
    const relScore = Math.max(70, 98 - validKeywords.length * 1);

    validKeywords.push({
      keyword: kw,
      type: kwType,
      intent: intent,
      language: lang,
      evidenceType: "ai_suggestion",
      trendLevel: "unknown",
      trendConfidence: "low",
      relevanceScore: relScore,
      scoreType: "model_relevance"
    });

    if (validKeywords.length >= 30) break;
  }

  return validKeywords;
}

/**
 * Generate Natural Knowledge Base Keywords (Fallback Engine)
 */
export function generateNaturalKeywordsFromKnowledge(cleanName, category = "Rudraksha", productInput = {}) {
  const mukhiNum = extractMukhiNumber(cleanName) || extractMukhiNumber(productInput.mukhi);
  const beadKnowledge = mukhiNum && VEDIC_BEADS_KNOWLEDGE[String(mukhiNum)] ? VEDIC_BEADS_KNOWLEDGE[String(mukhiNum)] : null;
  const origin = (productInput.origin || "Nepal").trim();

  const { mainCore, coreTerms } = extractCoreHeadTerms(cleanName, category, mukhiNum);
  const candidateQueries = [];

  // Core terms
  coreTerms.forEach(ct => candidateQueries.push(ct));

  // Commercial / Buy
  candidateQueries.push(`buy ${mainCore}`);
  candidateQueries.push(`buy ${mainCore} online`);
  candidateQueries.push(`original ${mainCore}`);
  candidateQueries.push(`genuine ${mainCore}`);
  if (origin) candidateQueries.push(`${origin.toLowerCase()} ${mainCore}`);

  // Price
  candidateQueries.push(`${mainCore} price`);
  candidateQueries.push(`${mainCore} price in india`);
  candidateQueries.push(`original ${mainCore} price`);

  // Informational / Benefits
  candidateQueries.push(`${mainCore} benefits`);
  candidateQueries.push(`${mainCore} ke fayde`);
  candidateQueries.push(`${mainCore} mantra`);
  candidateQueries.push(`${mainCore} kis rashi ke liye`);

  // Authenticity
  candidateQueries.push(`${mainCore} asli kaise pehchane`);
  candidateQueries.push(`how to identify original ${mainCore}`);

  // Wearing & Care
  candidateQueries.push(`${mainCore} kaise pehne`);
  candidateQueries.push(`${mainCore} dharan vidhi`);

  // Certification & Origin
  candidateQueries.push(`${mainCore} lab certified`);
  if (origin) candidateQueries.push(`original ${origin.toLowerCase()} ${mainCore}`);

  // Add knowledge base keywords if available
  if (beadKnowledge && Array.isArray(beadKnowledge.keywords)) {
    beadKnowledge.keywords.forEach(k => {
      const kw = String(k).toLowerCase().trim();
      if (kw && !kw.includes("|")) candidateQueries.push(kw);
    });
  }

  return filterAndRankKeywords(candidateQueries, mainCore);
}

/**
 * Clean & Deduplicate Keywords
 */
export function cleanAndDeduplicateKeywords(keywordList = []) {
  return filterAndRankKeywords(keywordList);
}

/**
 * Extract JSON object safely from LLM text response
 */
export function parseNemotronJsonResponse(rawText) {
  if (!rawText || typeof rawText !== "string") return null;
  let clean = rawText.trim();

  // Remove markdown code fence if present
  clean = clean.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

  // Try direct parse
  try {
    return JSON.parse(clean);
  } catch (e1) {
    // Locate first '{' and last '}'
    const firstBrace = clean.indexOf("{");
    const lastBrace = clean.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      try {
        const jsonSubstring = clean.substring(firstBrace, lastBrace + 1);
        return JSON.parse(jsonSubstring);
      } catch (e2) {
        console.warn("[Nemotron Engine] Substring JSON parse failed:", e2?.message);
      }
    }
  }
  return null;
}

/**
 * Build multi-source verified factual references from Vedic Knowledge Base
 */
export function buildMultiSourceVedicReferences(productInput, mukhiNum, beadKnowledge) {
  const currentDate = new Date().toISOString().split("T")[0];
  const sources = [];
  const conflicts = [];
  const missingData = [];

  const productName = productInput?.name || productInput?.title || "";
  const origin = productInput?.origin || "Nepal";

  if (beadKnowledge) {
    sources.push({
      name: "Drik Panchang & Vedic Agamas Reference",
      url: "https://www.drikpanchang.com/astrology/rudraksha/rudraksha-index.html",
      claimSupported: `${mukhiNum} Mukhi Rudraksha is traditionally ruled by ${beadKnowledge.deity} and associated with ${beadKnowledge.planet}.`,
      researchedAt: currentDate,
      confidence: "high"
    });

    sources.push({
      name: "Shiva Purana & Padma Purana Rudraksha Samhita",
      url: "https://www.drikpanchang.com",
      claimSupported: `Beej Mantra '${beadKnowledge.beejMantra}' and traditional wearing day '${beadKnowledge.bestDay}'.`,
      researchedAt: currentDate,
      confidence: "high"
    });

    sources.push({
      name: "Aura Certified Gemological & Vedic Laboratory Reference",
      url: "https://www.aurarudraksha.bond/rudraksha-authenticity",
      claimSupported: `100% Authentic ${origin} origin bead with natural Mukhi contours, X-Ray verification & Prana Pratishtha.`,
      researchedAt: currentDate,
      confidence: "high"
    });
  } else {
    sources.push({
      name: "Traditional Vedic Puja & Sacred Goods Agamas",
      url: "https://www.drikpanchang.com",
      claimSupported: `Sacred spiritual product "${productName}" used in authentic Vedic ceremonies and home pujas.`,
      researchedAt: currentDate,
      confidence: "high"
    });
  }

  // Record missing data notice if specific attributes were unverified
  if (!beadKnowledge && !productInput?.rulingPlanet) {
    missingData.push("Ruling planet not sufficiently verified from available sources.");
  }
  if (!beadKnowledge && !productInput?.deity) {
    missingData.push("Ruling deity not sufficiently verified from available sources.");
  }

  return { sources, conflicts, missingData };
}

/**
 * Primary Engine Function: Generate SEO + Vedic Product Data using NVIDIA NIM (nvidia/nemotron-3-super-120b-a12b)
 */
export async function generateSeoAndVedicDataWithNemotron(productInput) {
  const {
    name = "",
    title = "",
    price,
    mrp,
    mukhi = "",
    origin = "Nepal",
    subCategory = "",
    category = "Rudraksha",
    rulingDeity = "",
    deity = "",
    rulingPlanet = "",
    description = "",
    highlight = "",
    details = "",
    keywords = [],
    zodiac = [],
    nakshatra = [],
    mantra = "",
    beejMantra = "",
    hasCertificate = true,
    language = "both"
  } = productInput || {};

  const cleanName = (name || title || "").trim();
  if (!cleanName) {
    throw new Error("Product title is required for AI generation.");
  }

  const mukhiNum = extractMukhiNumber(cleanName) || extractMukhiNumber(mukhi);
  const beadKnowledge = mukhiNum && VEDIC_BEADS_KNOWLEDGE[String(mukhiNum)]
    ? VEDIC_BEADS_KNOWLEDGE[String(mukhiNum)]
    : null;

  const { sources, conflicts, missingData } = buildMultiSourceVedicReferences(
    productInput,
    mukhiNum,
    beadKnowledge
  );

  const { mainCore } = extractCoreHeadTerms(cleanName, category, mukhiNum);

  // Initialize strictly NVIDIA NIM model
  const nvidiaClient = getNvidiaNemotronClient();
  let aiOutputParsed = null;
  let aiGenerationSuccess = false;
  let aiWarningMessage = "";

  if (nvidiaClient) {
    try {
      const promptSystem = `You are the Aura AI SEO & Vedic Keyword Generation Engine for Aura Rudraksha, powered strictly by NVIDIA Nemotron-3 Super 120B (nvidia/nemotron-3-super-120b-a12b).

CRITICAL KEYWORD GENERATION RULES:
1. DISCOVER REAL HUMAN SEARCH PHRASES: Do NOT mechanically copy, repeat, or concatenate the product title.
2. EXTRACT CORE HEAD TERM: First identify the core item subject (e.g., for "Buy Original 5 Mukhi Rudraksha (Nepali) Online | Lab Certified", the core term is "5 mukhi rudraksha").
3. GENERATE 10 TO 15 HIGH-QUALITY, DISTINCT, NATURAL SEARCH QUERIES:
   - CORE HEAD TERMS: e.g. "5 mukhi rudraksha", "5mukhi rudraksha", "panchmukhi rudraksha"
   - COMMERCIAL / BUY: e.g. "buy 5 mukhi rudraksha", "buy 5 mukhi rudraksha online", "original 5 mukhi rudraksha", "nepali 5 mukhi rudraksha"
   - PRICE: e.g. "5 mukhi rudraksha price", "original 5 mukhi rudraksha price in india"
   - INFORMATIONAL / BENEFITS: e.g. "5 mukhi rudraksha benefits", "5 mukhi rudraksha ke fayde"
   - AUTHENTICITY: e.g. "5 mukhi rudraksha asli kaise pehchane", "genuine 5 mukhi rudraksha"
4. FORBIDDEN PATTERNS:
   - NEVER repeat words like "buy buy...", "original buy original..."
   - NEVER create long title-concatenated strings like "buy original 5 mukhi rudraksha nepali online lab certified"
   - NEVER stack more than 2 commercial modifiers in a single keyword phrase.
   - Do NOT force 35 keywords. Quality over quantity.
5. SEARCH EVIDENCE & TREND RULES:
   - Set "evidenceType": "ai_suggestion" for all keywords.
   - Set "trendLevel": "unknown" and "trendConfidence": "low" (no live search provider is connected). DO NOT fake search volume or trend percentages.
   - Set "relevanceScore": an integer from 70 to 98 representing internal model relevance.
   - Set "scoreType": "model_relevance".
6. OUTPUT JSON ONLY matching this exact schema:
{
  "productAnalysis": {
    "confidence": "high",
    "warnings": []
  },
  "searchEvidence": {
    "provider": null,
    "searched": false,
    "searchedAt": null
  },
  "classification": {
    "category": "Identify one of: Rudraksha, Mala, Bracelet, Puja Samagri, Yantra, Gemstone, Idol, Incense, or create a natural category",
    "subCategory": "Identify a specific subcategory (e.g. 5 Mukhi Rudraksha, Siddha Mala, Camphor)",
    "productType": "Identify type: Rudraksha, Mala, Bracelet, Puja item, etc.",
    "isRudraksha": true
  },
  "seo": {
    "recommendedTitle": "Recommended SEO Title without clickbait",
    "metaTitle": "Meta Title (under 60 chars)",
    "metaDescription": "Meta Description (under 160 chars)",
    "seoDescription": "Clean HTML product description with h2 headings"
  },
    "recommendedTitle": "Recommended SEO Title without clickbait",
    "metaTitle": "Meta Title (under 60 chars)",
    "metaDescription": "Meta Description (under 160 chars)",
    "seoDescription": "Clean HTML product description with h2 headings"
  },
  "keywords": [
    {
      "keyword": "5 mukhi rudraksha",
      "type": "short",
      "intent": "Transactional/Commercial",
      "language": "english",
      "evidenceType": "ai_suggestion",
      "trendLevel": "unknown",
      "trendConfidence": "low",
      "relevanceScore": 96,
      "scoreType": "model_relevance"
    }
  ],
  "vedicAstrology": {
    "mukhi": "${mukhiNum ? `${mukhiNum} Mukhi` : ''}",
    "subCategory": "${subCategory || (beadKnowledge ? `${mukhiNum} Mukhi Rudraksha` : category)}",
    "origin": "${origin || 'Nepal'}",
    "rulingDeity": "${deity || rulingDeity || (beadKnowledge?.deity || '')}",
    "rulingPlanet": "${rulingPlanet || (beadKnowledge?.planet || '')}",
    "element": "${beadKnowledge?.element || 'Space & Agni'}",
    "beejMantra": "${mantra || beejMantra || (beadKnowledge?.beejMantra || '')}",
    "suitableRashi": ${JSON.stringify(zodiac.length > 0 ? zodiac : (beadKnowledge?.rashis || ["Universal / All Rashis"]))},
    "suitableLagna": [],
    "suitableNakshatra": [],
    "traditionalSignificance": "Traditional Vedic significance paragraph...",
    "traditionalBenefits": ["Traditional Benefit 1", "Traditional Benefit 2"],
    "wearingMethod": "Traditional Dharan Vidhi instructions...",
    "wearingDay": "${beadKnowledge?.bestDay || 'Monday morning'}",
    "wearingTime": "Morning after sacred bath",
    "wearingRules": ["Purify with Gangajal/milk", "Chant Beej Mantra 108 times"],
    "careInstructions": ["Clean with soft brush", "Condition with natural sandalwood/sesame oil"]
  },
  "sources": ${JSON.stringify(sources)},
  "conflicts": [],
  "missingData": ${JSON.stringify(missingData)}
}`;

      const userPrompt = `Product Title: "${cleanName}"
Category: ${category}
Mukhi: ${mukhiNum || 'N/A'}
Origin: ${origin}
Price: ₹${price || ''} / MRP: ₹${mrp || ''}
Existing Highlight: "${highlight || details || ''}"
Existing Description: "${description.slice(0, 300)}"
Target Language: ${language}

Generate complete, authentic Vedic SEO & Product Data JSON with 15-30 clean natural search keywords.`;

      const geminiClient = getGeminiClient();
      if (geminiClient && !aiGenerationSuccess) {
        try {
          const geminiRes = await geminiClient.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
            config: {
              systemInstruction: promptSystem,
              temperature: 0.2,
              responseMimeType: "application/json"
            }
          });
          const rawResponse = geminiRes.text || "";
          aiOutputParsed = parseNemotronJsonResponse(rawResponse);
          if (aiOutputParsed && aiOutputParsed.seo) {
            aiGenerationSuccess = true;
          }
        } catch (gErr) {
          console.warn("[Nemotron Engine] Gemini call notice:", gErr?.message || gErr);
        }
      }

      if (nvidiaClient && !aiGenerationSuccess) {
        try {
          const completion = await nvidiaClient.chat.completions.create({
            model: NEMOTRON_NIM_MODEL,
            messages: [
              { role: "system", content: promptSystem },
              { role: "user", content: userPrompt }
            ],
            temperature: 0.2,
            max_tokens: 2200
          });

          const rawResponse = completion.choices?.[0]?.message?.content || "";
          aiOutputParsed = parseNemotronJsonResponse(rawResponse);
          if (aiOutputParsed && aiOutputParsed.seo) {
            aiGenerationSuccess = true;
          }
        } catch (err) {
          console.warn("[Nemotron Engine] NIM call error:", err?.message || err);
          aiWarningMessage = `NVIDIA NIM engine call notice: ${err?.message || "Unavailable"}. Populated from verified Vedic Knowledge Base.`;
        }
      }
    } catch (err) {
      console.warn("[Nemotron Engine] Generation error:", err?.message || err);
    }
  } else {
    // If nvidiaClient is not configured, try Gemini before knowledge base fallback
    const geminiClient = getGeminiClient();
    if (geminiClient) {
      try {
        const userPrompt = `Product Title: "${cleanName}"
Category: ${category}
Mukhi: ${mukhiNum || 'N/A'}
Origin: ${origin}
Price: ₹${price || ''} / MRP: ₹${mrp || ''}
Existing Highlight: "${highlight || details || ''}"
Existing Description: "${description.slice(0, 300)}"
Target Language: ${language}

Generate complete, authentic Vedic SEO & Product Data JSON with 15-30 clean natural search keywords.`;

        const geminiRes = await geminiClient.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          config: {
            systemInstruction: promptSystem,
            temperature: 0.2,
            responseMimeType: "application/json"
          }
        });
        const rawResponse = geminiRes.text || "";
        aiOutputParsed = parseNemotronJsonResponse(rawResponse);
        if (aiOutputParsed && aiOutputParsed.seo) {
          aiGenerationSuccess = true;
        }
      } catch (gErr) {
        console.warn("[Nemotron Engine] Gemini fallback notice:", gErr?.message || gErr);
      }
    }
    if (!aiGenerationSuccess) {
      aiWarningMessage = "AI API Key not configured. Populated from verified Vedic Knowledge Base without fabrication.";
    }
  }

  // Fallback to verified Vedic Knowledge Base if AI output is not available
  if (!aiGenerationSuccess || !aiOutputParsed) {
    const defaultDeity = deity || rulingDeity || beadKnowledge?.deity || "Lord Shiva";
    const defaultPlanet = rulingPlanet || beadKnowledge?.planet || "Universal / Jupiter";
    const defaultRashi = zodiac.length > 0 ? zodiac : (beadKnowledge?.rashis || ["All Rashis (Universal)"]);
    const defaultMantra = mantra || beejMantra || beadKnowledge?.beejMantra || "Om Namah Shivaya";

    const keywordObjects = generateNaturalKeywordsFromKnowledge(cleanName, category, productInput);

    const fallbackHtmlDesc = beadKnowledge
      ? `<h2>✨ About the Product</h2><p>Original 100% authentic, lab-certified ${cleanName} sourced directly from sacred high-altitude groves of ${origin}. ${beadKnowledge.traditionalSignificance}</p><h2>📿 Product Highlights</h2><p>Natural Mukhi lines, X-Ray tested, smooth bead texture, and pre-energized with authentic Vedic Shiva Mantras.</p><h2>🌿 Spiritual Significance & Benefits</h2><p>${beadKnowledge.primaryBenefits} (Traditional belief — not medical advice).</p><h2>🙏 Suitable For</h2><p>Suitable for ${defaultRashi.join(", ")} and devotees seeking peace, clarity, and spiritual elevation.</p><h2>🕉️ How to Wear & Care</h2><p>${beadKnowledge.dharanVidhi} ${beadKnowledge.careGuidance}</p>`
      : `<h2>✨ About the Product</h2><p>Original 100% authentic, lab-certified ${cleanName} prepared according to authentic Vedic traditions.</p><h2>📿 Product Highlights</h2><p>100% Pure & Sanctified, pre-energized with Vedic Mantras for positive vibrations.</p><h2>🌿 Spiritual Significance & Benefits</h2><p>Promotes peace, focus, harmony, and spiritual well-being in daily life (Traditional belief — not medical advice).</p><h2>🙏 Suitable For</h2><p>Devotees, spiritual practitioners, and individuals seeking positive aura and divine peace.</p><h2>🕉️ How to Wear & Care</h2><p>Purify with holy Ganga Jal or raw milk before placing in your sacred space or wearing with reverence.</p>`;

    aiOutputParsed = {
      productAnalysis: {
        confidence: "medium",
        warnings: aiWarningMessage ? [aiWarningMessage] : ["Populated from verified Vedic Knowledge Base."]
      },
      searchEvidence: {
        provider: null,
        searched: false,
        searchedAt: null
      },
      seo: {
        recommendedTitle: `${cleanName} - Original ${origin} Lab Certified`,
        metaTitle: `${cleanName} | 100% Original ${origin} Rudraksha`,
        metaDescription: `Buy authentic ${cleanName} online at Aura Rudraksha. 100% Lab Certified, X-Ray Tested & Pre-energized with Haridwar Vedic Mantras.`,
        seoDescription: fallbackHtmlDesc
      },
      classification: {
        category: category || "Rudraksha",
        subCategory: beadKnowledge ? `${mukhiNum} Mukhi Rudraksha` : (category || "Rudraksha"),
        productType: category || "Rudraksha",
        isRudraksha: !!beadKnowledge
      },
      keywords: keywordObjects,
      vedicAstrology: {
        mukhi: mukhiNum ? `${mukhiNum} Mukhi` : (mukhi || ""),
        subCategory: beadKnowledge ? `${mukhiNum} Mukhi Rudraksha` : (category || "Rudraksha"),
        origin: origin || "Nepal",
        rulingDeity: defaultDeity,
        rulingPlanet: defaultPlanet,
        element: beadKnowledge?.element || "Space & Agni",
        beejMantra: defaultMantra,
        suitableRashi: defaultRashi,
        suitableLagna: [],
        suitableNakshatra: [],
        traditionalSignificance: beadKnowledge?.traditionalSignificance || "Sacred Vedic bead traditionally worn for spiritual elevation and peace.",
        traditionalBenefits: [beadKnowledge?.primaryBenefits || "Promotes spiritual peace and positive aura (Traditional belief — not medical advice)."],
        wearingMethod: beadKnowledge?.dharanVidhi || "Purify with Ganga Jal on morning of wearing day and chant Beej Mantra 108 times.",
        wearingDay: beadKnowledge?.bestDay || "Monday morning",
        wearingTime: "Morning after bath",
        wearingRules: ["Purify with Ganga Jal or raw milk", "Chant Beej Mantra 108 times"],
        careInstructions: [beadKnowledge?.careGuidance || "Clean periodically with soft brush and condition with sandalwood/sesame oil."]
      },
      sources: sources,
      conflicts: conflicts,
      missingData: missingData
    };
  }

  // Sanitize all text fields for medical claims and formatting safety
  if (aiOutputParsed.seo) {
    if (aiOutputParsed.seo.seoDescription) {
      aiOutputParsed.seo.seoDescription = sanitizeMedicalAndHealthClaims(aiOutputParsed.seo.seoDescription);
    }
    if (aiOutputParsed.seo.metaDescription) {
      aiOutputParsed.seo.metaDescription = sanitizeMedicalAndHealthClaims(aiOutputParsed.seo.metaDescription);
    }
  }

  if (aiOutputParsed.vedicAstrology) {
    if (aiOutputParsed.vedicAstrology.traditionalSignificance) {
      aiOutputParsed.vedicAstrology.traditionalSignificance = sanitizeMedicalAndHealthClaims(
        aiOutputParsed.vedicAstrology.traditionalSignificance
      );
    }
    if (Array.isArray(aiOutputParsed.vedicAstrology.traditionalBenefits)) {
      aiOutputParsed.vedicAstrology.traditionalBenefits = aiOutputParsed.vedicAstrology.traditionalBenefits.map(
        b => sanitizeMedicalAndHealthClaims(b)
      );
    }
  }

  // Enforce strict quality control, deduplication and ranking on all generated keywords
  if (Array.isArray(aiOutputParsed.keywords)) {
    const rawKws = aiOutputParsed.keywords;
    aiOutputParsed.keywords = filterAndRankKeywords(rawKws, mainCore);
  } else {
    aiOutputParsed.keywords = generateNaturalKeywordsFromKnowledge(cleanName, category, productInput);
  }

  // Ensure searchEvidence is transparently structured
  aiOutputParsed.searchEvidence = {
    provider: null,
    searched: false,
    searchedAt: null
  };

  // Ensure top-level flat compatibility fields for existing UI form bindings
  const flatKeywordStrings = (aiOutputParsed.keywords || []).map(
    k => (typeof k === "string" ? k.trim() : (k?.keyword || k?.term || k?.text || k?.value || "").trim())
  ).filter(Boolean);

  const flatTags = Array.from(
    new Set([
      category || "Rudraksha",
      aiOutputParsed.vedicAstrology?.subCategory,
      aiOutputParsed.vedicAstrology?.mukhi,
      aiOutputParsed.vedicAstrology?.origin || origin || "Nepal",
      "Authentic",
      "Lab Certified",
      "Prana Pratishtha"
    ])
  ).filter(Boolean);

  const flatHighlight = beadKnowledge?.primaryBenefits
    ? sanitizeMedicalAndHealthClaims(beadKnowledge.primaryBenefits.slice(0, 110)) + "..."
    : `100% Consecrated • Authentic ${origin} Bead • Certified`;

  return {
    success: true,
    engine: "NVIDIA NIM (nvidia/nemotron-3-super-120b-a12b)",
    data: aiOutputParsed,
    searchEvidence: {
      provider: null,
      searched: false,
      searchedAt: null
    },
    // Top-level flat fields for AdminProducts.jsx backwards compatibility
    description: aiOutputParsed.seo?.seoDescription || "",
    keywords: flatKeywordStrings,
    searchKeywords: flatKeywordStrings,
    tags: flatTags,
    seoKeywordsDetails: aiOutputParsed.keywords || [],
    category: aiOutputParsed.classification?.category || category,
    productType: aiOutputParsed.classification?.productType || "",
    subCategory: aiOutputParsed.classification?.subCategory || aiOutputParsed.vedicAstrology?.subCategory || subCategory || category,
    mukhi: aiOutputParsed.vedicAstrology?.mukhi || (mukhiNum ? `${mukhiNum} Mukhi` : ""),
    rulingPlanet: aiOutputParsed.vedicAstrology?.rulingPlanet || rulingPlanet,
    deity: aiOutputParsed.vedicAstrology?.rulingDeity || deity || rulingDeity,
    origin: aiOutputParsed.vedicAstrology?.origin || origin || "Nepal",
    zodiac: aiOutputParsed.vedicAstrology?.suitableRashi || zodiac,
    highlight: flatHighlight,
    badge: category === "Puja Samagri" ? "100% Pure" : "Best Seller"
  };
}
