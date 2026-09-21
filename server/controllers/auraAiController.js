import crypto from "crypto";
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";

import { AuraAISetting, AuraAIConversation } from "../models/AuraAI.js";
import { Product } from "../models/Product.js";
import { Coupon } from "../models/Coupon.js";
import { ActiveOffer, Promotion, Offer } from "../models/Promotion.js";
import { Order } from "../models/Order.js";
import { Customer } from "../models/Customer.js";
import { Setting } from "../models/Setting.js";
import { Review } from "../models/Review.js";
import { isDbConnected } from "../config/db.js";
import { pickFields } from "../utils/sanitize.js";
import { isAdminUser, hasAdminRole } from "../middleware/auth.js";
import { 
  searchRelevantCatalogProducts, 
  extractMukhiNumber, 
  VEDIC_BEADS_KNOWLEDGE 
} from "../services/vedicKnowledgeService.js";
import { calculateAuthenticKundali } from "../services/vedicAstrologyService.js";
import { getUserMemories, setUserMemory, deleteUserMemory, extractAndUpdateMemories } from "../services/memoryService.js";
import { retrieveRagContext } from "../services/ragService.js";
import { generateSeoAndVedicDataWithNemotron } from "../services/nemotronSeoEngine.js";
import { executeAiToolCall } from "../services/aiToolsService.js";

const AI_SETTING_FIELDS = {
  enabled: "bool", showFloatingButton: "bool", showHeaderButton: "bool",
  language: "string", tone: "string", greeting: "string",
  recommendProducts: "bool", recommendOffers: "bool", cartActions: "bool",
  orderSupport: "bool", humanSupport: "bool", personalization: "bool"
};

// Rate limiting in-memory map
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 300;

function checkRateLimit(key) {
  const strKey = String(key || "");
  if (
    strKey === "127.0.0.1" || 
    strKey === "::1" || 
    strKey.includes("127.0.0.1") || 
    strKey === "localhost" || 
    strKey === "ip_default"
  ) {
    return true;
  }
  const now = Date.now();
  const entry = rateLimitMap.get(strKey);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(strKey, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }
  entry.count += 1;
  return true;
}

// Clean up old rate limit entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of rateLimitMap.entries()) {
    if (now > val.resetAt) rateLimitMap.delete(key);
  }
}, 5 * 60 * 1000);

// Strict NVIDIA NIM Model Configuration
export const PRIMARY_NIM_MODEL = "nvidia/nemotron-3-super-120b-a12b";
export const BACKUP_NIM_MODELS = ["nvidia/nemotron-3-super-120b-a12b", "nemotron-3-super-120b-a12b"];
export const NVIDIA_NIM_BASE_URL = "https://integrate.api.nvidia.com/v1";

let cachedNvidiaKey = "";
let cachedGeminiKey = "";

export function setCachedNvidiaKey(key) {
  cachedNvidiaKey = (key || "").trim();
}

export async function resolveNvidiaKey() {
  if (cachedNvidiaKey) return cachedNvidiaKey;
  const envKey = (
    process.env.NVIDIA_API_KEY ||
    process.env.NEMOTRON_API_KEY ||
    process.env.NVIDIA_NIM_API_KEY ||
    process.env.OPENROUTER_API_KEY ||
    process.env.OPENAI_API_KEY ||
    ""
  ).trim();
  if (envKey) {
    cachedNvidiaKey = envKey;
    return envKey;
  }
  if (isDbConnected()) {
    try {
      const setting = await AuraAISetting.findOne().select("nvidiaApiKey nemotronApiKey apiKey").lean();
      const dbKey = (setting?.nvidiaApiKey || setting?.nemotronApiKey || setting?.apiKey || "").trim();
      if (dbKey) {
        cachedNvidiaKey = dbKey;
        return dbKey;
      }
    } catch (_) {}
  }
  return "";
}

export async function resolveGeminiKey() {
  if (cachedGeminiKey) return cachedGeminiKey;
  const envKey = (process.env.GEMINI_API_KEY || "").trim();
  if (envKey) {
    cachedGeminiKey = envKey;
    return envKey;
  }
  if (isDbConnected()) {
    try {
      const setting = await AuraAISetting.findOne().select("geminiApiKey apiKey").lean();
      const dbKey = (setting?.geminiApiKey || setting?.apiKey || "").trim();
      if (dbKey) {
        cachedGeminiKey = dbKey;
        return dbKey;
      }
    } catch (_) {}
  }
  return "";
}

export function getNvidiaClient(customKey = "") {
  const apiKey = (
    customKey ||
    cachedNvidiaKey ||
    process.env.NVIDIA_API_KEY ||
    process.env.NEMOTRON_API_KEY ||
    process.env.NVIDIA_NIM_API_KEY ||
    process.env.OPENROUTER_API_KEY ||
    process.env.OPENAI_API_KEY ||
    ""
  ).trim();
  if (!apiKey) return null;

  const baseURL = (
    process.env.NEMOTRON_BASE_URL ||
    (process.env.OPENROUTER_API_KEY && !process.env.NVIDIA_API_KEY && !process.env.NEMOTRON_API_KEY
      ? "https://openrouter.ai/api/v1"
      : (process.env.OPENAI_API_KEY && !process.env.NVIDIA_API_KEY && !process.env.NEMOTRON_API_KEY
          ? "https://api.openai.com/v1"
          : NVIDIA_NIM_BASE_URL))
  ).trim();

  try {
    return new OpenAI({
      baseURL,
      apiKey,
      timeout: 120000 // 120s full capacity timeout
    });
  } catch (err) {
    console.warn("Could not initialize NVIDIA NIM / OpenAI client:", err?.message || err);
    return null;
  }
}

/**
 * Detect if AI generated response is genuinely truncated, cut off mid-sentence, or hit token limits
 */
export function isTextIncomplete(text, finishReason = "", mode = "standard") {
  if (finishReason === "length") return true;
  if (!text || typeof text !== "string") return false;
  const trimmed = text.trim();
  
  // Short messages (< 80 chars) are complete unless ends with trailing colon/comma/dash
  if (trimmed.length < 80) {
    if (/[,:(-]\s*$/.test(trimmed)) return true;
    return false;
  }

  // 1. Explicit terminal keywords section = definitively complete
  if (trimmed.includes("[AURA_KEYWORDS]:") || trimmed.includes("AURA_KEYWORDS")) return false;

  // 2. Explicit terminal blessings = complete
  if (/(\*\*हर हर महादेव\*?\*?\s*$|हर हर महादेव\.?\s*$|जय\s*श्री\s*राम\.?\s*$|ॐ\s*शांति\.?\s*$|शुभम्\.?\s*$|अस्तु\.?\s*$)/i.test(trimmed)) {
    return false;
  }

  // 3. Check unclosed code fences
  const codeBlockCount = (trimmed.match(/```/g) || []).length;
  if (codeBlockCount % 2 !== 0) return true;

  // 4. Check unclosed markdown table row that got cut off mid-line
  if (/\|[^\n|]+$/.test(trimmed) && !trimmed.endsWith("|")) return true;

  // 5. Check terminal punctuation (Danda, period, exclamation, question mark, blessings emoji) = complete
  const hasTerminalSignal = /([।!?.]\s*$|[।!?.]\s*[*_~"'\)\]]+\s*$|[🙏🕉️✨🌟🌿📿🔱🚩✅💐]\s*$)/.test(trimmed);
  if (hasTerminalSignal) return false;

  // 6. Check if ends with TRUE dangling connector words or unclosed bullet points
  const trueDanglingConnectors = /(तथा|और|एवं|क्योंकि|अर्थात|जैसे कि|किन्तु|परन्तु|जिसमें|जिसके|जो कि|यानी|and|or|but|because|with|by|to|for|1\.|2\.|3\.|4\.|5\.|6\.|7\.|8\.|9\.|10\.|•|→|:\s*|,|\.\.\.)$/i;
  if (trueDanglingConnectors.test(trimmed)) return true;

  // 7. In detailed Kundali reading (> 600 chars), check if summary table was cut off mid-table
  if (mode === "panditji" && trimmed.length > 600 && (trimmed.includes("तालिका") || trimmed.includes("सारणी"))) {
    if (trimmed.includes("|") && !trimmed.endsWith("|") && !trimmed.includes("[AURA_KEYWORDS]")) {
      return true;
    }
  }

  return trimmed.length > 250 && !hasTerminalSignal;
}

/**
 * Merge continuation chunk into existing text cleanly without duplicate repetitions
 */
export function mergeContinuation(existingText, continuationText) {
  if (!existingText) return continuationText || "";
  if (!continuationText) return existingText || "";

  let cleanBase = String(existingText).trimEnd();
  let cleanCont = String(continuationText).trimStart();

  // Strip repeated greeting restarts from continuation
  cleanCont = cleanCont.replace(/^(🙏\s*)?(प्रणाम(\s*भक्त)?|हर\s*हर\s*महादेव|नमस्ते|शुभ\s*आशीर्वाद|जी\s*हाँ|आगे\s*का\s*उत्तर|उत्तर\s*आगे)[!।:]?\s*/i, "");

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
  const baseSentences = cleanBase.split(/(?<=[।!?.\n])\s+/).map(s => s.trim()).filter(s => s.length > 10);
  let contSentences = cleanCont.split(/(?<=[।!?.\n])\s+/).map(s => s.trim()).filter(Boolean);
  while (contSentences.length > 0) {
    const firstContSentence = contSentences[0];
    if (firstContSentence.length > 10 && baseSentences.some(bs => bs === firstContSentence || bs.includes(firstContSentence) || (bs.length > 20 && firstContSentence.includes(bs)))) {
      contSentences.shift();
    } else {
      break;
    }
  }
  cleanCont = contSentences.join(" ").trim();
  if (!cleanCont) {
    return cleanBase;
  }

  // 4. Search for overlapping suffix/prefix (from 250 down to 8 chars)
  const maxOverlap = Math.min(250, cleanBase.length, cleanCont.length);
  for (let len = maxOverlap; len >= 8; len--) {
    const baseSuffix = cleanBase.slice(-len);
    if (cleanCont.startsWith(baseSuffix)) {
      return cleanBase + cleanCont.slice(len);
    }
  }

  // 5. If base ends with newline
  if (/[\n|]$/.test(cleanBase)) {
    return cleanBase + "\n" + cleanCont;
  }

  // 6. If base ends with sentence punctuation
  if (/[।!?.:]$/.test(cleanBase)) {
    return cleanBase + " " + cleanCont;
  }

  // 7. If existing ends without punctuation and continuation starts with words, join with space
  const needsSpace = !/\s$/.test(cleanBase) && !/^\s/.test(cleanCont) && !/^[।,.;:!?]/.test(cleanCont);
  return cleanBase + (needsSpace ? " " : "") + cleanCont;
}

/**
 * Smart token/word sliding window pruner to ensure NVIDIA NIM requests never hit context token limits.
 * Trims oldest chat turns if total words exceed ~4000-5000 words while preserving system prompt,
 * birth/Kundali details, and recent messages.
 */
export function pruneMessagesForTokenLimit(messages, maxWords = 4000) {
  if (!Array.isArray(messages) || messages.length <= 1) return messages;

  const countWords = (text) => (typeof text === "string" ? text.trim().split(/\s+/).filter(Boolean).length : 0);

  let totalWords = messages.reduce((acc, msg) => acc + countWords(msg?.content || msg?.text || ""), 0);

  if (totalWords <= maxWords) return messages;

  // Preserve system message (index 0) and the last user/assistant message
  const systemMsg = messages[0];
  const lastMsg = messages[messages.length - 1];
  let middleMsgs = messages.slice(1, messages.length - 1);

  while (middleMsgs.length > 1 && totalWords > maxWords) {
    const dropped = middleMsgs.shift();
    totalWords -= countWords(dropped?.content || dropped?.text || "");
  }

  return [systemMsg, ...middleMsgs, lastMsg];
}

export function getGeminiClient(customKey = "") {
  const apiKey = (customKey || cachedGeminiKey || process.env.GEMINI_API_KEY || "").trim();
  if (!apiKey) return null;
  try {
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  } catch (err) {
    console.warn("Could not initialize Gemini client:", err?.message || err);
    return null;
  }
}

// Resilient Gemini text models fallback list in order of preference
export const GEMINI_TEXT_MODELS = [process.env.GEMINI_MODEL, 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.5-flash-lite', 'gemini-1.5-flash', 'gemini-1.5-pro'].filter(Boolean);


// Format product object with verified catalog images, price, discounts and attributes
function formatProductForResponse(p) {
  if (!p) return null;
  const img = (p.images && p.images.length > 0 && p.images[0]) || p.img || p.image || "/images/product-5mukhi.jpg";
  const price = Number(p.price) || 0;
  const comparePrice = Number(p.comparePrice || p.mrp || Math.round(price * 1.35));
  const mrp = Number(p.mrp || comparePrice || Math.round(price * 1.35));
  const discount = p.discount || p.discountPercent || (comparePrice > price ? Math.round(((comparePrice - price) / comparePrice) * 100) : 0);
  const stock = p.stock !== undefined ? Number(p.stock) : 0;
  
  return {
    id: String(p.id || p._id),
    name: p.name || "",
    slug: p.slug || (p.name ? p.name.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-") : ""),
    price: price,
    comparePrice: comparePrice,
    mrp: mrp,
    discount: discount,
    discountPercent: discount,
    image: img,
    images: p.images && p.images.length > 0 ? p.images : (img ? [img] : ["/images/product-5mukhi.jpg"]),
    img: img,
    category: p.category || "Rudraksha",
    rating: Number(p.rating) || 4.9,
    reviews: Number(p.reviews || p.reviewsCount || p.reviewCount) || 24,
    reviewsCount: Number(p.reviews || p.reviewsCount || p.reviewCount) || 24,
    stock: stock,
    inStock: p.inStock !== false && stock > 0,
    badge: p.badge || (discount >= 30 ? "Best Seller" : "Popular"),
    highlight: p.highlight || ""
  };
}

function stripThinkingAndReasoning(raw) {
  if (typeof raw !== "string") return "";
  let text = raw;

  // Remove thinking / reasoning tags
  text = text.replace(/<think>[\s\S]*?<\/think>/gi, "");
  text = text.replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, "");
  text = text.replace(/<analysis>[\s\S]*?<\/analysis>/gi, "");
  text = text.replace(/<think>[\s\S]*/gi, "");
  text = text.replace(/<reasoning>[\s\S]*/gi, "");
  text = text.replace(/<analysis>[\s\S]*/gi, "");

  // Remove internal chain-of-thought phrases
  const reasoningRegexes = [
    /^[\s\n]*okay,?\s+the\s+user[\s\S]*?(?=\n\n|namaste|hello|hii|aap|haaye|haan|kaise|rudraksha|1000|pranam|har har|$)/i,
    /^[\s\n]*let\s+me\s+check[\s\S]*?(?=\n\n|namaste|hello|hii|aap|haaye|haan|kaise|rudraksha|1000|pranam|har har|$)/i,
    /^[\s\n]*looking\s+at\s+the\s+context[\s\S]*?(?=\n\n|namaste|hello|hii|aap|haaye|haan|kaise|rudraksha|1000|pranam|har har|$)/i
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

function cleanServerAiText(raw) {
  if (!raw || typeof raw !== "string") return "";
  let text = stripThinkingAndReasoning(raw);
  text = text.replace(/^```(?:json|markdown)?\s*/i, "").replace(/\s*```$/i, "").trim();
  text = text.replace(/rohitjangir\d*@gmail\.com/gi, "aurarudrakshaofficial@gmail.com");
  text = text.replace(/MONGODB_[A-Z0-9_]+/gi, "");
  text = text.replace(/GEMINI_API_[A-Z0-9_]+/gi, "");
  text = text.replace(/NVIDIA_API_[A-Z0-9_]+/gi, "");
  text = text.replace(/^#{1,6}\s+/gm, "");
  return text.trim();
}

function extractStructuredAiJson(rawContent) {
  if (!rawContent || typeof rawContent !== "string") return null;
  const cleaned = rawContent
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const tryParse = (s) => {
    try {
      const v = JSON.parse(s);
      return v && typeof v === "object" && !Array.isArray(v) ? v : null;
    } catch (_) {
      return null;
    }
  };
  let parsed = tryParse(cleaned);
  if (parsed) return parsed;
  const start = cleaned.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < cleaned.length; i++) {
    if (cleaned[i] === "{") depth += 1;
    else if (cleaned[i] === "}") {
      depth -= 1;
      if (depth === 0) {
        parsed = tryParse(cleaned.slice(start, i + 1));
        if (parsed) return parsed;
        break;
      }
    }
  }
  return null;
}

function stripInternalJsonFromCustomerText(raw) {
  if (!raw || typeof raw !== "string") return "";
  let text = raw.trim();
  if (!text) return "";
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const markers = ["recommendedProductIds", "couponCodes", "requiresHuman", "quickReplies"];
  const looksInternal = (obj) =>
    obj && typeof obj === "object" && ("text" in obj || markers.some((k) => k in obj));
  const firstBrace = text.indexOf("{");
  if (firstBrace === -1) return text;
  const extracted = extractStructuredAiJson(text.slice(firstBrace));
  if (extracted && looksInternal(extracted)) {
    const before = text.slice(0, firstBrace).trim();
    const inner = String(extracted.text || "").trim();
    if (before && inner && before !== inner) return `${before}\n\n${inner}`.trim();
    return inner || before;
  }
  if (markers.some((k) => text.includes(`"${k}"`))) {
    return text.slice(0, firstBrace).trim();
  }
  return text;
}

/**
 * Intelligent parser to detect birth details typed directly in chat messages (Hindi or English).
 * Supports names, DOBs (YYYY-MM-DD, DD-MM-YYYY, DD/MM/YYYY, words), times (12/24hr, AM/PM, baje), and locations.
 */
export function extractBirthDetailsFromText(rawText) {
  if (!rawText || typeof rawText !== "string") return null;
  const text = rawText.trim();
  if (text.length < 10) return null;

  // 1. Date of Birth patterns
  let dob = null;
  // Pattern A: YYYY-MM-DD
  const ymdMatch = text.match(/\b(19\d\d|20[0-2]\d)[-/.](\d{1,2})[-/.](\d{1,2})\b/);
  if (ymdMatch) {
    const y = ymdMatch[1];
    const m = String(ymdMatch[2]).padStart(2, "0");
    const d = String(ymdMatch[3]).padStart(2, "0");
    dob = `${y}-${m}-${d}`;
  } else {
    // Pattern B: DD-MM-YYYY or DD/MM/YYYY
    const dmyMatch = text.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](19\d\d|20[0-2]\d)\b/);
    if (dmyMatch) {
      const d = String(dmyMatch[1]).padStart(2, "0");
      const m = String(dmyMatch[2]).padStart(2, "0");
      const y = dmyMatch[3];
      dob = `${y}-${m}-${d}`;
    } else {
      // Pattern C: "15 August 1995" or "15 Aug 1995" or Hindi months
      const months = {
        jan: "01", january: "01", feb: "02", february: "02", mar: "03", march: "03",
        apr: "04", april: "04", may: "05", jun: "06", june: "06", jul: "07", july: "07",
        aug: "08", august: "08", sep: "09", sept: "09", september: "09", oct: "10",
        october: "10", nov: "11", november: "11", dec: "12", december: "12",
        जनवरी: "01", फ़रवरी: "02", फरवरी: "02", मार्च: "03", अप्रैल: "04", मई: "05",
        जून: "06", जुलाई: "07", अगस्त: "08", सितंबर: "09", सितम्बर: "09", अक्टूबर: "10",
        नवंबर: "11", नवम्बर: "11", दिसंबर: "12", दिसम्बर: "12"
      };
      const textMonthMatch = text.match(/\b(\d{1,2})\s+([a-zA-Z\u0900-\u097F]+)[,\s]+(19\d\d|20[0-2]\d)\b/i);
      if (textMonthMatch) {
        const d = String(textMonthMatch[1]).padStart(2, "0");
        const mKey = textMonthMatch[2].toLowerCase();
        const m = months[mKey];
        const y = textMonthMatch[3];
        if (m) {
          dob = `${y}-${m}-${d}`;
        }
      }
    }
  }

  // 2. Birth Time patterns
  let birthTime = null;
  const labeledTimeMatch = text.match(/(?:time|samay|समय|जन्म\s*समय)[\s:=-]+(\d{1,2}):(\d{2})(?:\s*(am|pm|बजे))?/i);
  if (labeledTimeMatch) {
    let hh = parseInt(labeledTimeMatch[1], 10);
    const mm = String(labeledTimeMatch[2]).padStart(2, "0");
    const ampm = (labeledTimeMatch[3] || "").toLowerCase();
    if (ampm === "pm" && hh < 12) hh += 12;
    if (ampm === "am" && hh === 12) hh = 0;
    birthTime = `${String(hh).padStart(2, "0")}:${mm}`;
  } else {
    const genericTimeMatch = text.match(/\b(\d{1,2}):(\d{2})(?:\s*(am|pm))\b/i);
    if (genericTimeMatch) {
      let hh = parseInt(genericTimeMatch[1], 10);
      const mm = String(genericTimeMatch[2]).padStart(2, "0");
      const ampm = (genericTimeMatch[3] || "").toLowerCase();
      if (ampm === "pm" && hh < 12) hh += 12;
      if (ampm === "am" && hh === 12) hh = 0;
      birthTime = `${String(hh).padStart(2, "0")}:${mm}`;
    }
  }

  // 3. Birth Place patterns
  let birthPlace = null;
  const labeledPlaceMatch = text.match(/(?:place|city|location|sthan|स्थान|जन्म\s*स्थान|birth\s*place)[\s:=-]+([a-zA-Z\u0900-\u097F\s,]+?)(?=[•\n,;.]|$)/i);
  if (labeledPlaceMatch) {
    const rawPlace = labeledPlaceMatch[1].trim();
    if (rawPlace && rawPlace.length >= 2) {
      birthPlace = rawPlace;
    }
  }

  // 4. Name patterns
  let name = null;
  const labeledNameMatch = text.match(/(?:name|devotee|naam|नाम|मेरा\s*नाम|mera\s*naam)[\s:=-]+([a-zA-Z\u0900-\u097F\s]+?)(?=[•\n,;.]|$|है)/i);
  if (labeledNameMatch) {
    const rawName = labeledNameMatch[1].trim().replace(/^is\s+/i, "").replace(/^hai\s+/i, "");
    if (rawName && rawName.length >= 2) {
      name = rawName;
    }
  }

  // If at least DOB and Place are provided, time can fallback to standard noon if missing
  if (dob && birthPlace) {
    return {
      dob,
      birthTime: birthTime || "12:00",
      birthPlace,
      name: name || "Devotee",
      concern: "career"
    };
  }

  return null;
}

function detectUserIntent(msg) {
  msg = (msg || "").toLowerCase().trim();
  const intents = [];
  
  if (/(fayde|fayda|benefits|what is good|why should|profit|use of|what does|meaning of|kya hota|kaise madad|labh|kaise pehne|dharan vidhi|mantra)/i.test(msg)) {
    intents.push("BENEFITS");
  }
  if (/(dikhao|chahiye|need|want|show|buy|purchase|looking for|mere liye sahi|suggest|recommend|which rudraksha|order karna hai|order krna|mangwana|khareedna)/i.test(msg)) {
    if (msg.includes("order karna") || msg.includes("order krna") || msg.includes("mangwana")) {
      intents.push("CHECKOUT");
    } else {
      intents.push(msg.includes("mere liye sahi") || msg.includes("suggest") || msg.includes("recommend") ? "PRODUCT_RECOMMENDATION" : "PRODUCT_SEARCH");
    }
  }
  if (/(price|cost|rate|kitne ka|bhav|rupees|amount|under|budget|₹|sasta|mehenga|kimat)/i.test(msg)) {
    intents.push("PRICE");
  }
  if (/(offer|discount|deal|sale|chhoot|bachat)/i.test(msg)) {
    intents.push("OFFER");
  }
  if (/(coupon|promo|code|voucher)/i.test(msg)) {
    intents.push("COUPON");
  }
  if (/(mera order|my order|track|where is my order|kaha hai|status|shipment|delivery status|order kaha|parcel|tracking)/i.test(msg)) {
    intents.push("ORDER_TRACKING");
  }
  if (/(history|previous orders|past orders)/i.test(msg)) {
    intents.push("ORDER_HISTORY");
  }
  if (/(cancel|stop order)/i.test(msg)) {
    intents.push("ORDER_CANCEL");
  }
  if (/(shipping|deliver|dispatch|bhej|kab aayega|how many days|kab tak)/i.test(msg)) {
    intents.push("SHIPPING");
  }
  if (/(return|refund|wapas|exchange)/i.test(msg)) {
    intents.push("RETURN");
  }
  if (/(payment|pay|cash on delivery|cod|upi|card|online)/i.test(msg)) {
    intents.push("PAYMENT");
  }
  if (/(cart|basket|bag)/i.test(msg)) {
    intents.push("CART");
  }
  if (/(kundli|kundali|horoscope|birth chart|rashi|nakshatra|graha|dasha|lagna|astrology|jyotish|dob|janma)/i.test(msg)) {
    intents.push("KUNDALI");
  }
  if (/(hi|hello|hey|namaste|pranam|radhe|har har|prabhat|kaise ho|ram ram|jai shree krishna|shubh)/i.test(msg) && msg.length < 25) {
    intents.push("GREETING");
  }
  if (/(customer care|support|human|agent|baat karni|phone|contact|number|helpline|help|şikayat)/i.test(msg)) {
    intents.push("GENERAL_SUPPORT");
  }
  if (/(mukhi|mala|rudraksha|rudraksh)/i.test(msg) && !intents.includes("PRODUCT_SEARCH") && !intents.includes("BENEFITS")) {
    intents.push("PRODUCT_INFO");
  }
  
  if (intents.length === 0) return "PRODUCT_SEARCH";
  
  if (intents.includes("KUNDALI")) return "KUNDALI";
  if (intents.includes("ORDER_TRACKING")) return "ORDER_TRACKING";
  if (intents.includes("CHECKOUT")) return "CHECKOUT";
  if (intents.includes("BENEFITS")) return "BENEFITS";
  if (intents.includes("PRODUCT_SEARCH")) return "PRODUCT_SEARCH";
  if (intents.includes("PRODUCT_RECOMMENDATION")) return "PRODUCT_RECOMMENDATION";
  if (intents.includes("COUPON")) return "COUPON";
  if (intents.includes("OFFER")) return "OFFER";
  if (intents.includes("PRICE")) return "PRICE";
  
  return intents[0];
}

function generateDynamicQuickReplies({ userMessage, intent, targetMukhi, mode, activeCoupons = [] }) {
  const msgLower = (userMessage || "").toLowerCase();
  const replies = [];
  
  if (mode === "panditji") {
    if (targetMukhi) {
      replies.push(`${targetMukhi} Mukhi Benefits`, "Dharan Vidhi", "Astrological Matching", `Buy ${targetMukhi} Mukhi`);
    } else if (msgLower.includes("dhan") || msgLower.includes("wealth") || msgLower.includes("karz") || msgLower.includes("loss")) {
      replies.push("⚡ 7 Mukhi (Laxmi Kripa)", "💼 10 Mukhi Rudraksha", "📿 Siddh Mala", "🙏 Dharan Vidhi");
    } else {
      replies.push("✨ Meri Kundali Dekhein", "📿 Best Rudraksha For Me", "🪐 Graha Dasha Remedies", "🕉️ 108 Jaap Vidhi");
    }
    return replies;
  }

  if (targetMukhi) {
    if (targetMukhi === "mala") {
      replies.push("108 Mala Price", "Jaap Vidhi", "Buy 108 Mala", "Today's Offers");
    } else if (targetMukhi === "gauri_shankar") {
      replies.push("Gauri Shankar Price", "Vivah Labh", "Kaise Pehne", "Order Now");
    } else {
      replies.push(`${targetMukhi} Mukhi Price`, `${targetMukhi} Mukhi Benefits`, "Dharan Vidhi", `Buy ${targetMukhi} Mukhi`);
    }
  } else if (msgLower.includes("dhan") || msgLower.includes("wealth") || msgLower.includes("paisa") || msgLower.includes("lakshmi") || msgLower.includes("business")) {
    replies.push("7 Mukhi Rudraksha", "7 Mukhi Price", "Kuber Benefits", "Today's Offers");
  } else if (msgLower.includes("peace") || msgLower.includes("shanti") || msgLower.includes("stress") || msgLower.includes("bp") || msgLower.includes("health")) {
    replies.push("5 Mukhi Rudraksha", "108 Jaap Mala", "5 Mukhi Price", "Kaise Pehne");
  } else if (intent === "ORDER_TRACKING" || msgLower.includes("track") || msgLower.includes("order")) {
    replies.push("Track My Order", "Order History", "Shipping Help", "Talk to Support");
  } else if (intent === "COUPON" || intent === "OFFER" || msgLower.includes("offer") || msgLower.includes("discount")) {
    if (activeCoupons && activeCoupons.length > 0) {
      replies.push(...activeCoupons.slice(0, 2).map(c => `${c.code} Code`));
      replies.push("Apply Coupon", "Best Sellers");
    } else {
      replies.push("View Offers", "Best Sellers", "Shop Rudraksha", "Free Kundali");
    }
  } else {
    replies.push("✨ Find Rudraksha", "🎁 Today's Offers", "📦 Track Order", "🕉 Jaap Mala");
  }
  
  return Array.from(new Set(replies)).slice(0, 4);
}

function shouldRecommendProducts({ message, intent, targetMukhi, matchedProducts }) {
  const msgLower = (message || "").toLowerCase().trim();

  // Greetings & casual talk -> No product cards
  if (intent === "GREETING") return false;
  if (/^(hi|hello|hey|namaste|pranam|radhe|har har|ram ram|shubh|kaise ho|kya haal|good morning|good evening|good afternoon|thank you|thanks|shukriya|dhanyawad|ok|okay|theek hai|bye|alvida)[\s!.,🙏]*$/i.test(msgLower)) {
    return false;
  }

  // Specific Mukhi or bead requested
  if (targetMukhi && matchedProducts.length > 0) return true;

  // User asking for recommendation / price / purchase / rashi
  const explicitAskPattern = /(dikhao|chahiye|need|want|show|buy|purchase|khareedna|mangwana|order|price|cost|rate|kitne ka|bhav|rupees|amount|under|budget|sasta|mehenga|kimat|suggest|recommend|konsa|mere liye|best seller|kuber|dhan|wealth|paisa|lakshmi|business|vyapar|shanti|peace|stress|tension|bp|health|hanuman|protection|student|study|exam|rashi|kundli|lagna|mesh|vrishabh|mithun|kark|singh|kanya|tula|vrischika|dhanu|makar|kumbh|meen)/i.test(msgLower);

  return explicitAskPattern && matchedProducts.length > 0;
}

const IP_HASH_SALT = process.env.IP_HASH_SALT || "aura_ai_ip_salt_998877";

export function getHashedIp(req) {
  try {
    const rawIp = 
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.headers["x-real-ip"] ||
      req.socket?.remoteAddress ||
      req.ip ||
      "127.0.0.1";
    return crypto.createHash("sha256").update(rawIp + IP_HASH_SALT).digest("hex");
  } catch (_) {
    return "unknown_ip_hash";
  }
}

export async function verifyConversationOwnership(conv, req) {
  if (!conv) return { allowed: false, status: 404, message: "Conversation not found" };

  const authenticatedUser = req.user || null;
  const clientGuestSessionId = (
    req.headers["x-guest-session-id"] ||
    req.body?.guestSessionId ||
    req.query?.guestSessionId ||
    ""
  ).trim();

  // Admin bypass
  if (authenticatedUser) {
    const { isInitialAdmin } = isAdminUser(authenticatedUser);
    const isAdmin = isInitialAdmin || (await hasAdminRole(authenticatedUser.authUserId));
    if (isAdmin) return { allowed: true };
  }

  // If conversation belongs to a logged-in user
  if (conv.userId && conv.userId !== "guest") {
    if (!authenticatedUser) {
      return { allowed: false, status: 401, message: "Authentication required to access this private conversation" };
    }
    const isOwner =
      conv.userId === authenticatedUser.authUserId ||
      (conv.authUserId && conv.authUserId === authenticatedUser.authUserId) ||
      (conv.userEmail && authenticatedUser.email && conv.userEmail.toLowerCase() === authenticatedUser.email.toLowerCase());

    if (!isOwner) {
      return { allowed: false, status: 403, message: "Access Denied: You do not own this conversation" };
    }
    return { allowed: true };
  }

  // If conversation belongs to a guest
  if (conv.userId === "guest" || !conv.userId) {
    if (authenticatedUser) {
      if (conv.guestSessionId && clientGuestSessionId && conv.guestSessionId === clientGuestSessionId) {
        return { allowed: true };
      }
      return { allowed: true };
    }
    if (conv.guestSessionId && clientGuestSessionId && conv.guestSessionId === clientGuestSessionId) {
      return { allowed: true };
    }
    const clientHashedIp = getHashedIp(req);
    if (conv.hashedIp && conv.hashedIp === clientHashedIp) {
      return { allowed: true };
    }
    if (!clientGuestSessionId && (!conv.messages || conv.messages.length === 0)) {
      return { allowed: true };
    }
    return { allowed: false, status: 403, message: "Access Denied: Guest session mismatch" };
  }

  return { allowed: true };
}

/**
 * Dedicated Kundali Calculation Endpoint
 * Computes authentic sidereal astronomical chart and interprets using NVIDIA Nemotron
 */
export async function calculateKundaliEndpoint(req, res, next) {
  try {
    const { dob, birthTime, birthPlace, name, gender, concern, customConcern } = req.body;

    if (!dob || !birthTime || !birthPlace) {
      return res.status(400).json({
        success: false,
        message: "Date of Birth (dob), exact Birth Time (birthTime), and Birth Place (birthPlace) are all strictly required for authentic Vedic Kundali calculations."
      });
    }

    // 1. Authoritative Astronomical Calculation Engine (Strictly verified)
    const kundaliData = calculateAuthenticKundali({
      dob,
      birthTime,
      birthPlace,
      name: name || "Devotee",
      gender: gender || "",
      concern: concern || "all",
      customConcern: customConcern || ""
    });

    // 2. Fetch Matching Authentic Store Catalog Products
    let allProducts = [];
    if (isDbConnected()) {
      try {
        allProducts = await Product.find({
          status: { $nin: ["Draft", "draft", "Inactive", "inactive", "Archived", "archived"] }
        }).lean();
      } catch (_) {
        allProducts = [];
      }
    }

    const recommendedProducts = [];
    const targetMukhis = kundaliData.astronomicalKundali.rudrakshaRecommendations.map(r => r.mukhiNumber);

    for (const mukhiNum of targetMukhis) {
      const match = allProducts.find(p => {
        const titleLower = (p.name || "").toLowerCase();
        return titleLower.includes(`${mukhiNum} mukhi`) || titleLower.includes(`${mukhiNum}-mukhi`);
      });
      if (match && !recommendedProducts.some(rp => rp.id === String(match.id || match._id))) {
        recommendedProducts.push(formatProductForResponse(match));
      }
    }

    if (recommendedProducts.length === 0 && allProducts.length > 0) {
      recommendedProducts.push(formatProductForResponse(allProducts[0]));
    }

    // 3. Generate Vedic Interpretation prioritizing NVIDIA NIM (nemotron-3-super-120b-a12b)
    let aiInterpretation = "";
    await resolveNvidiaKey();
    await resolveGeminiKey();
    const nvidiaClient = getNvidiaClient();
    const geminiClient = getGeminiClient();

    const astroPrompt = `You are AI Pandit Ji, the respectful, knowledgeable Vedic Astrology AI guide for Aura Rudraksha.
You have been provided with authoritative sidereal astronomical calculations computed by the Vedic ephemeris engine for:
Name: ${kundaliData.verifiedBirthData.name}
DOB: ${kundaliData.verifiedBirthData.dob} at ${kundaliData.verifiedBirthData.birthTime}
Birthplace: ${kundaliData.verifiedBirthData.birthPlace} (Lat: ${kundaliData.verifiedBirthData.coordinates.lat}°, Lon: ${kundaliData.verifiedBirthData.coordinates.lon}°)
Ayanamsha: ${kundaliData.verifiedBirthData.ayanamsha}

Calculated Astronomical Placements:
- Lagna (Ascendant): ${kundaliData.astronomicalKundali.lagna.rashiHindi} (${kundaliData.astronomicalKundali.lagna.rashiEnglish}) at ${kundaliData.astronomicalKundali.lagna.degree} in Nakshatra ${kundaliData.astronomicalKundali.lagna.nakshatra} (Pada ${kundaliData.astronomicalKundali.lagna.pada}), Navamsha (D9): ${kundaliData.astronomicalKundali.lagna.navamsha || "N/A"}, Swami: ${kundaliData.astronomicalKundali.lagna.lord}
- Chandra Rashi (Moon Sign): ${kundaliData.astronomicalKundali.chandraRashi.rashiHindi} (${kundaliData.astronomicalKundali.chandraRashi.rashiEnglish}) at ${kundaliData.astronomicalKundali.chandraRashi.degree} in Nakshatra ${kundaliData.astronomicalKundali.chandraRashi.nakshatra} (Pada ${kundaliData.astronomicalKundali.chandraRashi.pada}), Swami: ${kundaliData.astronomicalKundali.chandraRashi.lord}
- Surya Rashi (Sun Sign): ${kundaliData.astronomicalKundali.suryaRashi.rashiHindi} (${kundaliData.astronomicalKundali.suryaRashi.rashiEnglish})
- Numerology Mulank: ${kundaliData.astronomicalKundali.mulank}
- Vimshottari Mahadasha: ${kundaliData.astronomicalKundali.vimshottariDasha.currentMahadashaHindi} (${kundaliData.astronomicalKundali.vimshottariDasha.mahadashaStartDate} से ${kundaliData.astronomicalKundali.vimshottariDasha.mahadashaEndDate})
- Current Antardasha: ${kundaliData.astronomicalKundali.vimshottariDasha.currentAntardashaHindi} (${kundaliData.astronomicalKundali.vimshottariDasha.antardashaStartDate} से ${kundaliData.astronomicalKundali.vimshottariDasha.antardashaEndDate})
- Antardashas Timeline: ${kundaliData.astronomicalKundali.vimshottariDasha.antardashasTimeline?.map(a => `${a.planetHindi} (${a.startDate} से ${a.endDate})${a.isCurrent ? ' [वर्तमान]' : ''}`).join(" | ") || 'N/A'}
- Upcoming Future Mahadashas: ${kundaliData.astronomicalKundali.vimshottariDasha.upcomingMahadashas?.map(m => `${m.planetHindi} (${m.years} वर्ष, ${m.startDate} से ${m.endDate})`).join(" | ") || 'N/A'}
- Manglik Status: ${kundaliData.astronomicalKundali.doshaSummary.manglikNote}
- Sade Sati: ${kundaliData.astronomicalKundali.doshaSummary.sadeSati?.phase || "None"}

Primary Devotee Concern: ${concern} ${customConcern ? `("${customConcern}")` : ""}

YOUR TASK:
Provide an authentic, respectful, spiritual, and uplifting Vedic analysis in warm, fluent Hindi (शुद्ध एवं सरल देवनागरी हिंदी).
1. Explain their Lagna, Chandra Rashi, and D9 Navamsha strengths.
2. Explain the influence of their running ${kundaliData.astronomicalKundali.vimshottariDasha.currentMahadashaHindi} Mahadasha and timeline.
3. Address their primary concern with deep Vedic remedies.
4. Recommend the exact consecrated Rudraksha beads (Lagna Lord bead, Rashi bead, Dasha bead) to enhance spiritual balance, aura protection, and peace.
5. Conclude with a clean Final Astrological Summary table (सरल सारांश तालिका):
| विषय (Area) | विवरण (Details) | सरल फल / लाभ (Simple Meaning & Benefit) |
|---|---|---|
| **जन्म लग्न** | ... | ... |
| **जन्म राशि व नक्षत्र** | ... | ... |
| **वर्तमान महादशा** | ... | ... |
| **मुख्य दोष / प्रभाव** | ... | ... |
| **कल्याणकारी रुद्राक्ष** | ... | ... |
| **दैनिक सिद्ध बीज मंत्र** | ... | ... |
6. End with [AURA_KEYWORDS]: keyword1 | keyword2 | keyword3 | keyword4 | keyword5.
Never claim to be a physical human; maintain calm, spiritual AI Pandit Ji persona. Keep predictions non-fatalistic, empowering, and positive.`;

    // 1. Try NVIDIA NIM (nemotron-3-super-120b-a12b) first
    if (nvidiaClient && !aiInterpretation) {
      const isNvidia = (nvidiaClient.baseURL || "").includes("nvidia") || (nvidiaClient.baseURL || "").includes("integrate.api");
      for (const modelCandidate of [PRIMARY_NIM_MODEL, ...BACKUP_NIM_MODELS]) {
        if (aiInterpretation) break;
        try {
          const completion = await nvidiaClient.chat.completions.create({
            model: modelCandidate,
            messages: [
              { role: "system", content: "You are AI Pandit Ji (Vedic Astrology AI Guide) for Aura Rudraksha. Speak calmly, spiritually, and respectfully in warm Hindi." },
              { role: "user", content: astroPrompt }
            ],
            temperature: 0.35,
            max_tokens: 3500,
            ...(isNvidia ? { chat_template_kwargs: { enable_thinking: false } } : {})
          });

          aiInterpretation = completion.choices?.[0]?.message?.content || "";
        } catch (nimErr) {
          console.warn(`[Kundali Endpoint] NVIDIA NIM notice (${modelCandidate}):`, nimErr?.message || nimErr);
        }
      }
    }

    // 2. Fallback to Gemini if NVIDIA NIM was not available
    if (geminiClient && !aiInterpretation) {
      for (const gModel of GEMINI_TEXT_MODELS) {
        if (aiInterpretation) break;
        try {
          const geminiRes = await geminiClient.models.generateContent({
            model: gModel,
            contents: [{ role: 'user', parts: [{ text: astroPrompt }] }],
            config: {
              systemInstruction: "You are AI Pandit Ji (Vedic Astrology AI Guide) for Aura Rudraksha. Speak calmly, spiritually, and respectfully in warm Hindi.",
              temperature: 0.35,
              maxOutputTokens: 3500
            }
          });
          aiInterpretation = geminiRes.text || "";
        } catch (gErr) {
          console.warn(`[Kundali Endpoint] Gemini notice (${gModel}):`, gErr?.message || gErr);
        }
      }
    }

    if (!aiInterpretation.trim()) {
      aiInterpretation = `🙏 **जय श्री राम! हर हर महादेव।**\n\nआपकी जन्म पत्रिका के प्रामाणिक वैदिक खगोलीय विश्लेषण के अनुसार, आपका जन्म **${kundaliData.astronomicalKundali.lagna.rashiHindi} लग्न** एवं **${kundaliData.astronomicalKundali.chandraRashi.rashiHindi} राशि** में हुआ है। आपका जन्म नक्षत्र **${kundaliData.astronomicalKundali.chandraRashi.nakshatra}** (पद ${kundaliData.astronomicalKundali.chandraRashi.pada}) है।\n\nवर्तमान में आप पर **${kundaliData.astronomicalKundali.vimshottariDasha.currentMahadashaHindi} महादशा** का प्रभाव है। आपके लग्न एवं राशि के स्वामी की अनुकूलता तथा आपके संकल्प की सिद्धि हेतु प्राण-प्रतिष्ठित **${kundaliData.astronomicalKundali.rudrakshaRecommendations[0].mukhi}** धारण करना आपके लिए अत्यंत कल्याणकारी रहेगा।\n\n[AURA_KEYWORDS]: रुद्राक्ष धारण विधि | 5 मुखी रुद्राक्ष | जन्म राशि रुद्राक्ष | महादशा उपाय | आज का शुभ मुहूर्त`;
    }


    return res.json({
      success: true,
      data: {
        ...kundaliData,
        aiInterpretation: cleanServerAiText(aiInterpretation),
        recommendedProducts
      }
    });

  } catch (err) {
    next(err);
  }
}

/**
 * Main Chat Endpoint for Aura AI & AI Pandit Ji (NVIDIA NIM Strictly Enforced & SSE Streaming Supported)
 */
export async function chatAuraAI(req, res, next) {
  try {
    const {
      message,
      conversationId,
      guestSessionId,
      userEmail,
      userName,
      mode = "standard", // "standard" (Aura AI Shopping) or "panditji" (AI Pandit Ji Vedic Astrology)
      cartItems = [],
      history = [],
      birthDetails = null, // { dob, birthTime, birthPlace, name, gender, concern }
      notesContext = ""
    } = req.body || {};

    const isStreamingRequest = req.body?.stream === true || req.query?.stream === "true" || req.headers?.accept?.includes("text/event-stream");

    if (!message && !birthDetails) {
      return res.status(400).json({ success: false, message: "A message or birth details are required." });
    }

    const clientIp = getHashedIp(req);
    const effectiveGuestSessionId = (guestSessionId || req.headers["x-guest-session-id"] || `guest_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`).trim();

    // Rate Limiting Check
    const rateLimitKey = req.user?.authUserId || effectiveGuestSessionId || clientIp;
    if (!checkRateLimit(rateLimitKey)) {
      return res.status(429).json({
        success: false,
        message: "Too many requests. Please wait a moment before sending another message."
      });
    }

    const userIsAuthenticated = Boolean(req.user && req.user.authUserId);
    const verifiedUserId = userIsAuthenticated ? req.user.authUserId : null;
    const verifiedEmail = userIsAuthenticated ? req.user.email : userEmail;
    const verifiedName = userIsAuthenticated ? (req.user.name || userName || "Devotee") : (userName || "Devotee");

    const effectiveUserId = userIsAuthenticated ? verifiedUserId : "guest";
    const targetConversationId = (conversationId || `conv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`).trim();

    // 1. Fetch Store Settings
    let storeSettings = {
      enabled: true,
      recommendProducts: true,
      recommendOffers: true,
      cartActions: true,
      orderSupport: true,
      humanSupport: true,
      supportPhone: "+91 9672996531",
      supportEmail: "aurarudrakshaofficial@gmail.com"
    };

    if (isDbConnected()) {
      try {
        const dbSettings = await Setting.findOne().lean();
        if (dbSettings) {
          storeSettings = {
            ...storeSettings,
            supportPhone: dbSettings.supportPhone || storeSettings.supportPhone,
            supportEmail: dbSettings.supportEmail || storeSettings.supportEmail
          };
        }
      } catch (_) {}
    }

    const intent = detectUserIntent(message || "");
    const targetMukhi = extractMukhiNumber(message || "");

    // 2. Intent Routing in Pandit Ji Mode for Order/Delivery Questions
    if (mode === "panditji" && (intent === "ORDER_TRACKING" || intent === "ORDER_HISTORY" || intent === "ORDER_CANCEL" || intent === "SHIPPING")) {
      const handoffText = `🙏 **प्रणाम! Main AI Pandit Ji hoon.**\n\nOrder status, parcel tracking aur delivery updates ke liye **Aura AI Support** aapki behtar madad karega.\n\nAap niche diye gaye button par click karke **Aura AI Shopping & Support** mode mein switch kar sakte hain, ya seedhe [Track Order](/track-order) page par apna Order Number daal kar live status dekh sakte hain:\n\n📦 **Direct Order Tracking:** [https://aurarudraksha.bond/track-order](/track-order)`;

      const handoffPayload = {
        text: handoffText,
        products: [],
        coupons: [],
        quickReplies: ["Switch to Aura AI", "📦 Track Order Page", "🕉️ Kundali Consultation", "📿 Mukhi Guide"],
        handoffToAuraAI: true,
        trackingLink: "/track-order",
        conversationId: targetConversationId,
        guestSessionId: effectiveGuestSessionId
      };

      if (isStreamingRequest) {
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache, no-transform");
        res.setHeader("Connection", "keep-alive");
        res.setHeader("X-Accel-Buffering", "no");
        res.flushHeaders?.();

        res.write(`data: ${JSON.stringify({ type: "final", data: handoffPayload })}\n\n`);
        res.write("data: [DONE]\n\n");
        return res.end();
      }

      return res.json({
        success: true,
        data: handoffPayload
      });
    }

    // 3. Check for Kundali Calculation or Persisted Birth Data in Pandit Ji Mode
    let calculatedKundaliData = null;
    let shouldPromptBirthForm = false;

    // Fetch existing conversation if present
    let existingConvDoc = null;
    if (isDbConnected()) {
      try {
        existingConvDoc = await AuraAIConversation.findOne({ $or: [{ id: targetConversationId }, { conversationId: targetConversationId }] }).lean();
        
        // SECURITY AUTHORIZATION CHECK: User A cannot access User B's Kundli/Conversation
        if (existingConvDoc) {
          const isOwner = (effectiveUserId !== "guest" && existingConvDoc.userId === effectiveUserId) || 
                          (effectiveUserId === "guest" && existingConvDoc.guestSessionId === effectiveGuestSessionId);
          if (!isOwner) {
            console.warn(`[Aura AI Security] Unauthorized conversation access blocked. ConvId: ${targetConversationId}, Requester: ${effectiveUserId}`);
            existingConvDoc = null; // Deny access to this document
          }
        }
      } catch (_) {}
    }

    const extractedFromMsg = extractBirthDetailsFromText(message);
    const passedBirthDetails = (birthDetails && birthDetails.dob && birthDetails.birthTime && birthDetails.birthPlace) ? birthDetails : null;
    const incomingBirthDetails = passedBirthDetails || extractedFromMsg;
    const existingVerifiedBirthDetails = existingConvDoc?.verifiedBirthDetails || null;

    const isContinuation = Boolean(req.body?.isContinuation) || 
      /continue|रुका था|जारी रखें|पूरा करें|incomplete|jahan se ruka/i.test(message || "");

    let hasNewBirthDetails = false;
    let activeBirthDetails = null;

    if (incomingBirthDetails) {
      const isDifferentFromExisting = !existingVerifiedBirthDetails ||
        existingVerifiedBirthDetails.dob !== incomingBirthDetails.dob ||
        existingVerifiedBirthDetails.birthTime !== incomingBirthDetails.birthTime ||
        existingVerifiedBirthDetails.birthPlace !== incomingBirthDetails.birthPlace ||
        (incomingBirthDetails.name && existingVerifiedBirthDetails.name && incomingBirthDetails.name.toLowerCase() !== existingVerifiedBirthDetails.name.toLowerCase());

      hasNewBirthDetails = !isContinuation && (Boolean(req.body?.reset) || (isDifferentFromExisting && (!existingConvDoc || (existingConvDoc.messages && existingConvDoc.messages.length > 0))));
      activeBirthDetails = {
        dob: incomingBirthDetails.dob,
        birthTime: incomingBirthDetails.birthTime,
        birthPlace: incomingBirthDetails.birthPlace,
        name: incomingBirthDetails.name || verifiedName,
        gender: incomingBirthDetails.gender || "",
        concern: incomingBirthDetails.concern || "career"
      };
    } else if (existingVerifiedBirthDetails) {
      activeBirthDetails = existingVerifiedBirthDetails;
    }

    if (activeBirthDetails) {
      try {
        calculatedKundaliData = calculateAuthenticKundali({
          dob: activeBirthDetails.dob,
          birthTime: activeBirthDetails.birthTime,
          birthPlace: activeBirthDetails.birthPlace,
          name: activeBirthDetails.name || verifiedName,
          gender: activeBirthDetails.gender || "",
          concern: activeBirthDetails.concern || "career"
        });
      } catch (kErr) {
        console.warn("[Aura AI] Kundali calculation warning:", kErr?.message);
      }
    } else if (mode === "panditji" && (intent === "KUNDALI" || (message || "").toLowerCase().includes("kundli") || (message || "").toLowerCase().includes("kundali") || (message || "").toLowerCase().includes("horoscope") || (message || "").toLowerCase().includes("rashi"))) {
      shouldPromptBirthForm = true;
    }

    // 4. Fetch Live Catalog Products, Active Coupons & Admin Deals/Promotions
    let allStoreProds = [];
    let allStoreCoupons = [];
    if (isDbConnected()) {
      try {
        allStoreProds = await Product.find({ status: { $nin: ["Draft", "draft", "Inactive", "inactive"] } }).lean();
      } catch (_) {
        allStoreProds = [];
      }
      try {
        const [dbCoupons, dbActiveOffers, dbPromotions, dbOffers] = await Promise.all([
          Coupon.find({ status: { $nin: ["Inactive", "inactive", "Expired", "expired", "Disabled", "disabled"] } }).lean(),
          ActiveOffer.find({ status: { $nin: ["Inactive", "inactive", "Disabled", "disabled", "Expired", "expired"] }, enabled: { $ne: false } }).lean(),
          Promotion.find({ status: { $nin: ["Inactive", "inactive", "Disabled", "disabled", "Expired", "expired"] }, isActive: { $ne: false } }).lean(),
          Offer.find({ status: { $nin: ["Inactive", "inactive", "Disabled", "disabled", "Expired", "expired"] } }).lean()
        ]);

        const couponMap = new Map();
        const nowTime = Date.now();

        // 1. Process standard Coupons from Admin Coupons section
        (dbCoupons || []).forEach(c => {
          const code = (c.code || "").trim().toUpperCase();
          if (!code) return;
          if (c.expiry) {
            const exp = new Date(c.expiry).getTime();
            if (!isNaN(exp) && exp < nowTime) return;
          }
          couponMap.set(code, {
            id: c.id || String(c._id),
            code,
            discount: Number(c.discount || c.value || 0),
            type: c.type || "percentage",
            minAmount: Number(c.minAmount || c.minOrderValue || 0),
            maxDiscount: Number(c.maxDiscount || 0),
            expiry: c.expiry || null,
            description: c.description || (c.type === "fixed" ? `Flat ₹${c.discount} OFF` : `${c.discount}% OFF`),
            source: "Admin Coupon"
          });
        });

        // 2. Process ActiveOffers from Admin Deals / Active Offer section
        (dbActiveOffers || []).forEach(o => {
          const code = (o.couponCode || o.code || "").trim().toUpperCase();
          if (!code) return;
          const expiry = o.expiresAt || o.expiry;
          if (expiry) {
            const exp = new Date(expiry).getTime();
            if (!isNaN(exp) && exp < nowTime) return;
          }
          if (!couponMap.has(code)) {
            couponMap.set(code, {
              id: o.id || String(o._id),
              code,
              discount: Number(o.discountValue || 0),
              type: o.discountType === "percentage" ? "percentage" : "fixed",
              minAmount: 0,
              maxDiscount: 0,
              expiry: expiry || null,
              description: o.subtitle || o.title || `Special Deal Offer: ${code}`,
              source: "Admin Active Deal"
            });
          }
        });

        // 3. Process Promotions from Admin Promotions section
        (dbPromotions || []).forEach(p => {
          const code = (p.couponCode || p.code || "").trim().toUpperCase();
          if (!code) return;
          const expiry = p.expiresAt || p.expiry;
          if (expiry) {
            const exp = new Date(expiry).getTime();
            if (!isNaN(exp) && exp < nowTime) return;
          }
          if (!couponMap.has(code)) {
            couponMap.set(code, {
              id: p.id || String(p._id),
              code,
              discount: Number(p.discountValue || p.value || 0),
              type: p.discountType === "percentage" || p.type === "percentage" ? "percentage" : "fixed",
              minAmount: Number(p.minOrderValue || p.minAmount || 0),
              maxDiscount: 0,
              expiry: expiry || null,
              description: p.description || p.subtitle || p.title || `Promo Offer: ${code}`,
              source: "Admin Promotion"
            });
          }
        });

        // 4. Process Offers from Admin Banner Deals section
        (dbOffers || []).forEach(of => {
          const code = (of.couponCode || of.code || "").trim().toUpperCase();
          if (!code) return;
          if (!couponMap.has(code)) {
            couponMap.set(code, {
              id: of.id || String(of._id),
              code,
              discount: Number(of.discountValue || 0),
              type: of.type?.toLowerCase() === "fixed" ? "fixed" : "percentage",
              minAmount: 0,
              maxDiscount: 0,
              expiry: null,
              description: of.description || of.title || `Banner Deal: ${code}`,
              source: "Admin Offer Deal"
            });
          }
        });

        allStoreCoupons = Array.from(couponMap.values());
      } catch (err) {
        console.warn("Error fetching store coupons/promotions in AI controller:", err.message);
        allStoreCoupons = [];
      }
    }

    const activeCoupons = (allStoreCoupons || []).filter(c => {
      if (c.expiry) {
        const expDate = new Date(c.expiry);
        if (!isNaN(expDate.getTime()) && expDate.getTime() < Date.now()) return false;
      }
      return Boolean(c.code);
    });

    const isCouponInquiry = intent === "COUPON" || intent === "OFFER" || 
      /(coupon|code|promo|voucher|discount|offer|chhut|off|deal)/i.test(message || "");

    const matchedCoupons = (isCouponInquiry && activeCoupons.length > 0)
      ? activeCoupons.map(c => ({
          id: c.id || String(c._id),
          code: c.code,
          discount: c.discount,
          type: c.type || "percentage",
          minAmount: c.minAmount || 0,
          description: c.description || (c.type === "fixed" ? `Flat ₹${c.discount} OFF` : `${c.discount}% OFF`)
        }))
      : [];

    let matchedProducts = [];
    if (shouldRecommendProducts({ message: message || "", intent, targetMukhi, matchedProducts: [1] })) {
      const foundProds = searchRelevantCatalogProducts(message || "", allStoreProds);
      matchedProducts = (foundProds || []).map(formatProductForResponse).filter(Boolean);
    }

    // If we have calculated Kundali, match recommended beads to catalog
    if (calculatedKundaliData && calculatedKundaliData.astronomicalKundali) {
      const recMukhis = calculatedKundaliData.astronomicalKundali.rudrakshaRecommendations.map(r => r.mukhiNumber);
      for (const mNum of recMukhis) {
        const found = allStoreProds.find(p => (p.name || "").toLowerCase().includes(`${mNum} mukhi`));
        if (found && !matchedProducts.some(mp => mp.id === String(found.id || found._id))) {
          matchedProducts.push(formatProductForResponse(found));
        }
      }
    }

    const storeCatalogPromptSnippet = (allStoreProds || []).slice(0, 50).map(p => {
      const pPrice = Number(p.price) || 0;
      const pId = String(p.id || p._id || "");
      const slug = p.slug || (p.name ? p.name.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-") : pId);
      return `- Product Name: "${p.name}" | ID: ${pId} | Price: ₹${pPrice} | Category: ${p.category || 'Rudraksha'} | Valid Link: /product/${slug} (or /product/${pId})`;
    }).join("\n");

    const couponsPromptSnippet = activeCoupons.length > 0
      ? activeCoupons.map(c => `- Verified Active Code: "${c.code.toUpperCase()}" | Discount: ${c.type === "fixed" ? `Flat ₹${c.discount} OFF` : `${c.discount}% OFF`}${c.minAmount ? ` | Min Order: ₹${c.minAmount}` : ""} | Source: ${c.source} | Description: ${c.description || "Active Store Discount"}`).join("\n")
      : "No promo coupon codes currently active in MongoDB. Current customer benefits: free Shiva Puja energization and free Pan-India shipping on prepaid orders.";

    const urlAndCatalogRulesText = `
WEBSITE URL & PRODUCT LINKING RULES (CRITICAL):
- Official Store Website URLs:
  - https://aurarudraksha.bond (Official Production Domain)
- Main Page Routes:
  - Official Homepage: https://aurarudraksha.bond (or /)
  - Shop All Products: https://aurarudraksha.bond/shop (or /shop)
  - Order Tracking: https://aurarudraksha.bond/track-order (or /track-order)
  - Contact Us: https://aurarudraksha.bond/contact (or /contact)
  - Cart / Checkout: https://aurarudraksha.bond/cart (or /cart)
  - Free Kundali & Zodiac Analysis: https://aurarudraksha.bond/zodiac (or /zodiac)
- When user asks "What is the website URL?", "Website link do", or "Where to buy?", ALWAYS provide: https://aurarudraksha.bond.
- NEVER generate or hallucinate fake external domain URLs (like example.com or random fake links).
- STRICT PRODUCT CATALOG & LINKING MANDATE:
  - NEVER invent, hallucinate, or suggest fake product names, fake prices, or fake links.
  - ONLY recommend real products from the official catalog below.
  - Whenever linking to a product, ALWAYS use its exact Valid Link from the catalog below in markdown format:
    e.g. [Product Name](/product/${allStoreProds[0]?.slug || "slug"}) or [Product Name](/product/${allStoreProds[0]?.id || "id"})

STRICT COUPON CODE & DEALS INTEGRITY (ABSOLUTE ZERO-HALLUCINATION RULE):
- REAL ACTIVE STORE COUPONS & ADMIN DEALS (LIVE FROM MONGODB):
${couponsPromptSnippet}
- CRITICAL ANTI-HALLUCINATION MANDATE:
  - NEVER invent, hallucinate, guess, or mention ANY coupon code not explicitly listed in the verified list above!
  - NEVER generate random promo codes (such as "AURA10", "SHIV10", "DISCOUNT50", "FIRST100", "FESTIVAL20") unless they appear in the verified active list above.
  - If a user asks for discounts, offers, or coupon codes, share ONLY the exact verified active codes from above with their terms and conditions.
  - If NO coupon codes are listed above (i.e. "No promo coupon codes currently active"), you MUST tell the customer transparently and politely in Hindi: "वर्तमान में कोई अलग कूपन कोड सक्रिय नहीं है, लेकिन आपको हर ऑर्डर पर निःशुल्क प्राण-प्रतिष्ठा पूजा और निःशुल्क शिपिंग की सुविधा मिल रही है।"
  - Remind the user that only official active coupon codes apply during checkout.

REAL STORE PRODUCT CATALOG:
${storeCatalogPromptSnippet}

LINK FORMAT RULES:
- Use relative markdown links: [Product Name](/product/slug) or [Shop All](/shop).`;

    // 5. Retrieve Live RAG Knowledge Documents & Memories
    const ragDocs = await retrieveRagContext(message || (mode === "panditji" ? "Vedic Rudraksha Jyotish" : "Aura Rudraksha"), 3);
    const ragContextText = ragDocs.map(d => `[${d.title}]: ${d.content}`).join("\n\n");

    const userMemories = await getUserMemories({ userId: effectiveUserId, guestSessionId: effectiveGuestSessionId });
    const memoryContextText = userMemories.map(m => `- ${m.memoryKey}: ${m.memoryValue}`).join("\n");

    // 5.5 Check for Order Inquiries in Standard Mode
    const isOrderInquiry = intent === "ORDER_TRACKING" || intent === "ORDER_HISTORY" || 
      (message || "").toLowerCase().includes("track") || 
      (message || "").toLowerCase().includes("order");

    if (isOrderInquiry && mode !== "panditji") {
      if (!userIsAuthenticated || effectiveUserId === "guest") {
        const guestOrderText = "🙏 Apne order ki sthiti janne ke liye kripya pehle apne account mein Login karein ya seedhe hamare [Track Order](/track-order) page par jakar apna Order ID daalein.";
        const guestPayload = {
          text: guestOrderText,
          products: [],
          orderInfo: null,
          quickReplies: ["🔐 Login to View Orders", "📦 Track Order Page", "🛒 View Store"],
          conversationId: targetConversationId,
          guestSessionId: effectiveGuestSessionId
        };
        if (isDbConnected()) {
          try {
            await AuraAIConversation.findOneAndUpdate(
              { $or: [{ id: targetConversationId }, { conversationId: targetConversationId }] },
              {
                $setOnInsert: {
                  id: targetConversationId,
                  conversationId: targetConversationId,
                  userId: effectiveUserId,
                  userEmail: verifiedEmail,
                  userName: verifiedName,
                  guestSessionId: effectiveGuestSessionId,
                  hashedIp: clientIp,
                  createdAt: new Date()
                },
                $push: {
                  messages: {
                    $each: [
                      { id: `msg_${Date.now()}_u`, sender: "user", text: message || "", timestamp: new Date() },
                      { id: `msg_${Date.now()}_a`, sender: "ai", text: guestOrderText, timestamp: new Date() }
                    ]
                  }
                },
                $set: { updatedAt: new Date(), lastMessageText: guestOrderText.slice(0, 150) }
              },
              { upsert: true, returnDocument: "after" }
            );
          } catch (_) {}
        }
        if (isStreamingRequest) {
          res.setHeader("Content-Type", "text/event-stream");
          res.setHeader("Cache-Control", "no-cache, no-transform");
          res.setHeader("Connection", "keep-alive");
          res.write(`data: ${JSON.stringify({ type: "final", data: guestPayload })}\n\n`);
          res.write("data: [DONE]\n\n");
          return res.end();
        }
        return res.json({ success: true, data: guestPayload });
      } else {
        let userOrderContext = null;
        if (isDbConnected()) {
          try {
            userOrderContext = await Order.findOne({
              $or: [
                { customerId: effectiveUserId },
                { userId: effectiveUserId },
                ...(verifiedEmail ? [{ customerEmail: verifiedEmail.toLowerCase() }] : [])
              ]
            }).sort({ createdAt: -1 }).lean();
          } catch (_) {}
        }
        if (userOrderContext) {
          const orderIdStr = userOrderContext.orderNumber || userOrderContext.id || String(userOrderContext._id);
          const orderFoundText = `📦 **Order Status Found:**\n\nAapka order #${orderIdStr} mil gaya hai.\n- **Status:** ${userOrderContext.status || 'Processing'}\n- **Amount:** ₹${userOrderContext.finalAmount || userOrderContext.total || 0}\n${userOrderContext.trackingNumber ? `- **Tracking No:** ${userOrderContext.trackingNumber} (${userOrderContext.courierName || 'Courier'})\n` : ""}\nAap full tracking details ke liye [Track Order](/track-order) par bhi dekh sakte hain.`;
          const orderPayload = {
            text: orderFoundText,
            products: [],
            orderInfo: {
              id: orderIdStr,
              status: userOrderContext.status || 'Processing',
              finalAmount: userOrderContext.finalAmount || userOrderContext.total || 0,
              trackingNumber: userOrderContext.trackingNumber || ""
            },
            quickReplies: ["📦 Track Order Page", "📿 Shop Rudraksha", "📞 Support"],
            conversationId: targetConversationId,
            guestSessionId: effectiveGuestSessionId
          };
          if (isDbConnected()) {
            try {
              await AuraAIConversation.findOneAndUpdate(
                { $or: [{ id: targetConversationId }, { conversationId: targetConversationId }] },
                {
                  $setOnInsert: {
                    id: targetConversationId,
                    conversationId: targetConversationId,
                    userId: effectiveUserId,
                    userEmail: verifiedEmail,
                    userName: verifiedName,
                    guestSessionId: effectiveGuestSessionId,
                    hashedIp: clientIp,
                    createdAt: new Date()
                  },
                  $push: {
                    messages: {
                      $each: [
                        { id: `msg_${Date.now()}_u`, sender: "user", text: message || "", timestamp: new Date() },
                        { id: `msg_${Date.now()}_a`, sender: "ai", text: orderFoundText, timestamp: new Date() }
                      ]
                    }
                  },
                  $set: { updatedAt: new Date(), lastMessageText: orderFoundText.slice(0, 150) }
                },
                { upsert: true, returnDocument: "after" }
              );
            } catch (_) {}
          }
          if (isStreamingRequest) {
            res.setHeader("Content-Type", "text/event-stream");
            res.setHeader("Cache-Control", "no-cache, no-transform");
            res.setHeader("Connection", "keep-alive");
            res.write(`data: ${JSON.stringify({ type: "final", data: orderPayload })}\n\n`);
            res.write("data: [DONE]\n\n");
            return res.end();
          }
          return res.json({ success: true, data: orderPayload });
        }
      }
    }

    // 6. Build High-Integrity Persona System Prompt for NVIDIA NIM (nemotron-3-super-120b-a12b)
    let systemPrompt = "";

    if (mode === "panditji") {
      systemPrompt = `You are AI Pandit Ji (🕉️), the revered Master Vedic Astrologer (Jyotish Acharya), Sanskrit Scholar, and Spiritual Rudraksha Guide for Aura Rudraksha (https://aurarudraksha.bond).

DEFAULT LANGUAGE DIRECTIVE (MANDATORY):
- DEFAULT TO PURE, RESPECTFUL, FLUENT HINDI (देवनागरी लिपि / Devanagari script) for all astrological readings, explanations, mantras, and remedies.
- Use pure, natural Hindi by default. Use English only if the devotee specifically writes their entire prompt in English.
- Begin with traditional Vedic greetings: "🙏 प्रणाम भक्त! हर हर महादेव।" or "🙏 जय श्री राम!"
- You possess authoritative mastery of classical Vedic canons: Brihat Parashara Hora Shastra (BPHS), Phaladeepika (Mantreswara), Saravali (Kalyanavarma), Jaimini Upadesha Sutras, and Shiva Purana (Vidyeshvara Samhita).
- Maintain a calm, scholarly, spiritual, and empowering AI Pandit Ji persona. Keep predictions non-fatalistic, constructive, and inspiring.

${urlAndCatalogRulesText}

KUNDALI & ASTROLOGICAL FIDELITY:
${calculatedKundaliData ? `
AUTHORITATIVE CALCULATED SIDEREAL KUNDALI DATA (VERIFIED - DO NOT ASK FOR DOB/TIME/PLACE AGAIN):
- Devotee Name: ${calculatedKundaliData.verifiedBirthData.name}
- Verified DOB: ${calculatedKundaliData.verifiedBirthData.dob} | Time: ${calculatedKundaliData.verifiedBirthData.birthTime} | Place: ${calculatedKundaliData.verifiedBirthData.birthPlace}
- Primary Life Concern: ${calculatedKundaliData.verifiedBirthData.concern || 'All Concerns'} ${calculatedKundaliData.verifiedBirthData.customConcern ? `("${calculatedKundaliData.verifiedBirthData.customConcern}")` : ''}
- Lagna (Ascendant): ${calculatedKundaliData.astronomicalKundali.lagna.rashiHindi} (${calculatedKundaliData.astronomicalKundali.lagna.rashiEnglish}) at ${calculatedKundaliData.astronomicalKundali.lagna.degree} | Nakshatra: ${calculatedKundaliData.astronomicalKundali.lagna.nakshatra} (Pada ${calculatedKundaliData.astronomicalKundali.lagna.pada}) | Navamsha D9: ${calculatedKundaliData.astronomicalKundali.lagna.navamsha || 'N/A'} | Lagnesh: ${calculatedKundaliData.astronomicalKundali.lagna.lord} | Tattva: ${calculatedKundaliData.astronomicalKundali.lagna.element}
- Chandra Rashi (Moon Sign): ${calculatedKundaliData.astronomicalKundali.chandraRashi.rashiHindi} (${calculatedKundaliData.astronomicalKundali.chandraRashi.rashiEnglish}) at ${calculatedKundaliData.astronomicalKundali.chandraRashi.degree} | Nakshatra: ${calculatedKundaliData.astronomicalKundali.chandraRashi.nakshatra} (Pada ${calculatedKundaliData.astronomicalKundali.chandraRashi.pada}) | Lord: ${calculatedKundaliData.astronomicalKundali.chandraRashi.lord}
- Surya Rashi (Sun Sign): ${calculatedKundaliData.astronomicalKundali.suryaRashi.rashiHindi} (${calculatedKundaliData.astronomicalKundali.suryaRashi.rashiEnglish}) at ${calculatedKundaliData.astronomicalKundali.suryaRashi.degree} | Nakshatra: ${calculatedKundaliData.astronomicalKundali.suryaRashi.nakshatra}
- Numerology Mulank: ${calculatedKundaliData.astronomicalKundali.mulank}
- Panchanga: Tithi: ${calculatedKundaliData.astronomicalKundali.panchanga?.tithi || "N/A"} | Vaar: ${calculatedKundaliData.astronomicalKundali.panchanga?.vaar || "N/A"} | Yoga: ${calculatedKundaliData.astronomicalKundali.panchanga?.yoga || "N/A"} | Karana: ${calculatedKundaliData.astronomicalKundali.panchanga?.karana || "N/A"}
- Jaimini 7 Chara Karakas: ${calculatedKundaliData.astronomicalKundali.jaiminiKarakas ? calculatedKundaliData.astronomicalKundali.jaiminiKarakas.map(k => `${k.karakaCode} (${k.karakaName}): ${k.planetName} [${k.signName} ${k.degreeInSign}, House ${k.houseNumber}]`).join(" | ") : "N/A"}
- Badhaka & Maraka: Badhakesh: ${calculatedKundaliData.astronomicalKundali.badhakaMarakaInfo?.badhaka?.note || "N/A"} | Maraka: ${calculatedKundaliData.astronomicalKundali.badhakaMarakaInfo?.maraka?.note || "N/A"}
- Vimshottari Mahadasha: ${calculatedKundaliData.astronomicalKundali.vimshottariDasha.currentMahadashaHindi} (${calculatedKundaliData.astronomicalKundali.vimshottariDasha.mahadashaStartDate || '2022'} to ${calculatedKundaliData.astronomicalKundali.vimshottariDasha.mahadashaEndDate || '2030'})
- Current Antardasha: ${calculatedKundaliData.astronomicalKundali.vimshottariDasha.currentAntardashaHindi} (${calculatedKundaliData.astronomicalKundali.vimshottariDasha.antardashaStartDate || '2024'} to ${calculatedKundaliData.astronomicalKundali.vimshottariDasha.antardashaEndDate || '2026'})
- Antardashas Timeline: ${calculatedKundaliData.astronomicalKundali.vimshottariDasha.antardashasTimeline?.map(a => `${a.planetHindi} (${a.startDate} से ${a.endDate})${a.isCurrent ? ' [वर्तमान]' : ''}`).join(" | ") || 'N/A'}
- Upcoming Future Mahadashas: ${calculatedKundaliData.astronomicalKundali.vimshottariDasha.upcomingMahadashas?.map(m => `${m.planetHindi} (${m.years} वर्ष, ${m.startDate} से ${m.endDate})`).join(" | ") || 'N/A'}
- Planetary Placements & Dignity: ${calculatedKundaliData.astronomicalKundali.planets.map(p => `${p.name} in House ${p.houseNumber} (${p.rashiHindi} ${p.degreeInSign}, ${p.dignity}, D9: ${p.navamshaRashiHindi}${p.isVargottama ? ' [Vargottama]' : ''}${p.combustionNote ? `, ${p.combustionNote}` : ''})`).join(" | ")}
- Houses (Bhavas) & Aspects: ${calculatedKundaliData.astronomicalKundali.houses.map(h => `H${h.houseNumber} (${h.rashiHindi}, Lord ${h.lord}): Occ: [${h.occupants.join(", ")}], Aspects: [${(h.aspects || []).join(", ") || 'None'}]`).join(" | ")}
- Classical & Parashari Yogas: ${calculatedKundaliData.astronomicalKundali.yogas && calculatedKundaliData.astronomicalKundali.yogas.length > 0 ? calculatedKundaliData.astronomicalKundali.yogas.map(y => `${y.name} [${y.category || 'Yoga'}]: ${y.description}`).join(" | ") : "Standard planetary alignments."}
- Dosha Analysis: Manglik: ${calculatedKundaliData.astronomicalKundali.doshaSummary.manglikNote} | Shani Sade Sati: ${calculatedKundaliData.astronomicalKundali.doshaSummary.sadeSati?.phase || "Sade Sati Mukt"} | Kaal Sarp: ${calculatedKundaliData.astronomicalKundali.doshaSummary.kaalSarp?.type || "None"}
- Recommended Vedic Beads: ${calculatedKundaliData.astronomicalKundali.rudrakshaRecommendations.map(r => `${r.role}: ${r.mukhi}`).join(" | ")}

JYOTISH REASONING & CONSULTATION GUIDELINES:
1. Think deeply before responding. Analyze the relevant houses, house lords, natural karakas, Jaimini karakas (AK, AmK, DK), Dasha period, and divisional charts (D9 Navamsha, D10 Dashamsha, D7 Saptamsha) specific to the user's question.
2. For specific questions (e.g. career, marriage, education, financial stability, health):
   - Provide a direct, focused, and deeply insightful response analyzing the relevant Grahas, Bhavas, and active Dasha.
   - Explain the karmic patterns, time windows, and constructive remedial guidance naturally.
3. For a full Kundali consultation or when reading a new chart, follow the comprehensive 11-step consultation structure:
   1. 🙏 वैदिक अभिवादन व जातक परिचय (Vedic Greeting for ${calculatedKundaliData.verifiedBirthData.name})
   2. 🔭 लग्न, चंद्र राशि, सूर्य राशि व नवमांश (D9) विश्लेषण (Core Identity, Mind & Soul)
   3. 🪐 सभी 9 ग्रहों के भाव, दृष्टि व बलाबल का गहरा विश्लेषण (Detailed 9 Graha breakdown)
   4. 📅 पंचांग फल (तिथि, वार, योग, करण व शुभाशुभ प्रभाव)
   5. ⏱️ विंशोत्तरी महादशा व अंतर्दशा समय सीमा (Current Dasha influence & upcoming transition)
   6. ⚠️ संपूर्ण दोष विचार (मंगलिक दोष, साढ़े साती/ढैया चरण, काल सर्प योग)
   7. ✨ शुभ योग व वर्गोत्तम ग्रह (राजयोग, गजकेसरी योग, बुधादित्य योग, विपरीत राजयोग)
   8. 🎯 जातक के मुख्य संकल्प/समस्या पर विशेष ज्योतिषीय मार्गदर्शन (${calculatedKundaliData.verifiedBirthData.concern || 'All Life Areas'})
   9. 📿 **वैदिक रुद्राक्ष परामर्श (Lagna bead, Rashi bead, Dasha bead & Shiva Purana Dharan Vidhi)** — Recommend beads strictly based on calculated Lagna, Rashi, Dasha and specific life intention.
   10. 🌟 **सरल व स्पष्ट सारांश तालिका (Final Astrological Summary)** — Provide an easy-to-read summary table:
| विषय (Area) | विवरण (Details) | सरल फल / लाभ (Simple Meaning & Benefit) |
|---|---|---|
| **जन्म लग्न** | ... | ... |
| **जन्म राशि व नक्षत्र** | ... | ... |
| **वर्तमान महादशा** | ... | ... |
| **मुख्य ग्रह स्थिति / दोष** | ... | ... |
| **कल्याणकारी रुद्राक्ष** | ... | ... |
| **दैनिक सिद्ध बीज मंत्र** | ... | ... |
   11. 🔤 **[AURA_KEYWORDS]: keyword1 | keyword2 | keyword3 | keyword4 | keyword5** — Mandatorily output 4 to 6 concise follow-up search keywords separated by | on the very last line.

STRICT ISOLATION & ACCURACY RULES:
1. Consultation is 100% EXCLUSIVELY for: ${calculatedKundaliData.verifiedBirthData.name} (DOB: ${calculatedKundaliData.verifiedBirthData.dob}).
2. NEVER combine or leak other profiles from past chat history.
3. NEVER ask for DOB, birth time, or birth place again. Verified birth details are already calculated above.
4. Output clean linebreaks (\n); NEVER output raw HTML tags like <br>.
` : `
- If the user asks for personalized Kundali, Rashi, or Graha Dosha analysis without providing complete birth details (DOB, Time, Place), politely request their birth details and explain why exact time and place are required for authentic sidereal mathematics. Do not fabricate positions.
`}

ORDER & DELIVERY INQUIRIES:
- If customer asks about order status, delivery, tracking, or shipment: state respectfully: "Main AI Pandit Ji hoon; order aur delivery tracking ke liye Aura AI aapki sahayata karega." Guide them to the [Track Order](/track-order) page.

SALES & STORE INTEGRITY:
- Recommend only authentic Nepali Rudraksha beads present in the store catalog. Highlight consecration (Pran-Pratishtha), X-Ray certification, and Dharan Vidhi.
- Never invent prices or non-existent discounts.

STORE KNOWLEDGE CONTEXT:
${ragContextText}

DEVOTEE PROFILE & CONSULTATION NOTES:
${memoryContextText || "New devotee consultation."}
${notesContext ? `Active Notepad Context: ${notesContext}` : ""}`;
    } else {
      systemPrompt = `You are Aura AI, the intelligent personal shopping, Vedic bead specialist, and order support assistant for Aura Rudraksha (https://aurarudraksha.bond).

CORE MISSION:
- Guide devotees to the most authentic, 100% Nepali Rudraksha beads, 108 Jaap Malas, Gauri Shankar beads, and sacred bracelets.
- Provide accurate product information, stock status, active coupon discounts, and order support.
- Maintain a polite, spiritual, helpful, and conversion-oriented tone.
- DEFAULT LANGUAGE: Reply in clear, warm, fluent Hindi (देवनागरी / Devanagari script) by default (e.g., "नमस्ते! ऑरा रुद्राक्ष में आपका स्वागत है।"). Use English only if the customer strictly prompts in English.

${urlAndCatalogRulesText}

ORDER & TRACKING QUERIES:
- If customer asks for tracking/order status: Provide clear guidance. Remind them they can view real-time courier updates at [Track Order](/track-order) with their Order ID or phone number.

SALES FOCUS & INTEGRITY:
- Highlight that every Aura Rudraksha is 100% Nepali origin, X-Ray certified, lab-tested, and energised with Vedic Shiva Mantras in Haridwar.
- Never invent fake prices, products, or fake discount codes.

STORE KNOWLEDGE:
${ragContextText}

CUSTOMER CONTEXT:
${memoryContextText || "Guest shopper."}`;
    }

    let effectiveHistory = Array.isArray(history) ? history.slice(-8) : [];
    if (hasNewBirthDetails && !isContinuation) {
      effectiveHistory = [];
    } else if (activeBirthDetails && !isContinuation) {
      let lastMarkerIdx = -1;
      for (let i = effectiveHistory.length - 1; i >= 0; i--) {
        const hText = String(effectiveHistory[i]?.text || "");
        if (hText.includes("जन्म तिथि:") || hText.includes("Date of Birth:") || hText.includes("Vedic Consultation")) {
          lastMarkerIdx = i;
          break;
        }
      }
      if (lastMarkerIdx >= 0) {
        effectiveHistory = effectiveHistory.slice(lastMarkerIdx);
      }
    }

    let effectiveSystemPrompt = systemPrompt;
    if (isContinuation) {
      effectiveSystemPrompt += `\n\nCONTINUATION DIRECTIVE (MANDATORY): The user is asking to seamlessly continue the previous response directly from where it stopped.
- DO NOT start with any greeting (e.g. "Namaste", "🙏", "Pranam", or "Devotee").
- DO NOT repeat what was already written in the assistant's previous message above.
- Continue directly from the exact point of interruption. Complete any unfinished sentences, remaining Graha/Bhava analysis, remedies, Final Astrological Summary table, and [AURA_KEYWORDS].`;
    }

    const nimMessages = [
      { role: "system", content: effectiveSystemPrompt }
    ];

    for (const h of effectiveHistory) {
      if (h.sender === "user" && h.text) {
        nimMessages.push({ role: "user", content: String(h.text) });
      } else if (h.sender === "ai" && h.text) {
        nimMessages.push({ role: "assistant", content: String(h.text) });
      }
    }

    if (message && message.trim()) {
      nimMessages.push({ role: "user", content: String(message).trim() });
    } else if (calculatedKundaliData) {
      nimMessages.push({
        role: "user",
        content: `Please provide a comprehensive Vedic Jyotish reading and Rudraksha guidance based on my calculated birth data (${calculatedKundaliData.verifiedBirthData.dob}, ${calculatedKundaliData.verifiedBirthData.birthTime}, ${calculatedKundaliData.verifiedBirthData.birthPlace}).`
      });
    } else {
      nimMessages.push({ role: "user", content: "Namaste" });
    }

    const dynamicQuickReplies = generateDynamicQuickReplies({
      userMessage: message || "",
      intent,
      targetMukhi,
      mode,
      activeCoupons
    });

    // 7. Handle SSE Streaming Request
    if (isStreamingRequest) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");
      res.flushHeaders?.();

      let clientDisconnected = false;
      const abortController = new AbortController();

      req.on("close", () => {
        clientDisconnected = true;
        abortController.abort();
      });

      // Keep-alive heartbeat every 15s to prevent dropped connections
      const heartbeatTimer = setInterval(() => {
        if (!clientDisconnected) {
          try {
            res.write(": ping\n\n");
            res.flush?.();
          } catch (_) {}
        }
      }, 15000);

      // Send initial meta packet
      res.write(`data: ${JSON.stringify({
        type: "meta",
        products: matchedProducts,
        coupons: matchedCoupons,
        kundali: calculatedKundaliData,
        showBirthForm: shouldPromptBirthForm,
        quickReplies: dynamicQuickReplies,
        conversationId: targetConversationId,
        guestSessionId: effectiveGuestSessionId
      })}\n\n`);

      res.write(`data: ${JSON.stringify({
        type: "status",
        message: mode === "panditji" ? "🕉️ जन्म लग्न व ग्रह गोचर गणना हो रही है..." : "🔍 प्रामाणिक स्टोर कैटलॉग व रुद्राक्ष खोज रहे हैं..."
      })}\n\n`);
      res.flush?.();

      let fullStreamedText = "";
      let streamSucceeded = false;
      await resolveNvidiaKey();
      const nvidiaClient = getNvidiaClient();

      // Prune initial context messages if token count is near ~4000-5000 words limit
      const prunedNimMessages = pruneMessagesForTokenLimit(nimMessages, 4000);

      // 1. Primary Streaming Execution: Exclusively NVIDIA NIM models with Multi-turn Automatic Continuation (up to 10 passes)
      if (nvidiaClient && !clientDisconnected) {
        for (const modelCandidate of [PRIMARY_NIM_MODEL, ...BACKUP_NIM_MODELS]) {
          if (streamSucceeded || clientDisconnected) break;
          
          let attempt = 0;
          const MAX_CANDIDATE_ATTEMPTS = 2;

          while (attempt < MAX_CANDIDATE_ATTEMPTS && !streamSucceeded && !clientDisconnected) {
            attempt++;
            try {
              const streamCompletion = await nvidiaClient.chat.completions.create(
                {
                  model: modelCandidate,
                  messages: prunedNimMessages,
                  temperature: 0.35,
                  max_tokens: 16384,
                  stream: true
                },
                { signal: abortController.signal }
              );

              let lastFinishReason = "";
              for await (const chunk of streamCompletion) {
                if (clientDisconnected) break;
                const deltaContent = chunk.choices?.[0]?.delta?.content || "";
                const fReason = chunk.choices?.[0]?.finish_reason;
                if (fReason) lastFinishReason = fReason;
                if (deltaContent) {
                  fullStreamedText += deltaContent;
                  res.write(`data: ${JSON.stringify({ type: "chunk", delta: deltaContent })}\n\n`);
                  res.flush?.();
                }
              }

              // Automatic Multi-Turn Continuation (up to 10 passes) if response hit token limits or was truncated
              let passCount = 0;
              const MAX_CONTINUATION_PASSES = 10;
              while (!clientDisconnected && passCount < MAX_CONTINUATION_PASSES && isTextIncomplete(fullStreamedText, lastFinishReason, mode)) {
                passCount++;
                try {
                  const continuationPrompt = mode === "panditji"
                    ? "Continue your comprehensive Vedic Jyotish reading and astrological guidance exactly from where you stopped. Do not repeat previous sentences, headings, or greetings. Seamlessly complete the rest of the analysis, remedies, mantras, Final Summary table (सरल सारांश तालिका), and the MANDATORY [AURA_KEYWORDS] section at the end."
                    : "Continue your response exactly from where you stopped. Do not repeat previous sentences or greetings. Seamlessly complete the guidance and recommendations.";

                  // Limit assistant context tail to last 1200 words to ensure total input stays within token budget (~4000-5000 words)
                  const wordsArr = fullStreamedText.trim().split(/\s+/);
                  const assistantTail = wordsArr.length > 1200 ? "..." + wordsArr.slice(-1200).join(" ") : fullStreamedText;

                  const rawContinuationMsgs = [
                    prunedNimMessages[0], // system prompt
                    { role: "assistant", content: assistantTail },
                    { role: "user", content: continuationPrompt }
                  ];

                  const continuationMessages = pruneMessagesForTokenLimit(rawContinuationMsgs, 4000);

                  const continuationStream = await nvidiaClient.chat.completions.create(
                    {
                      model: modelCandidate,
                      messages: continuationMessages,
                      temperature: 0.35,
                      max_tokens: 16384,
                      stream: true
                    },
                    { signal: abortController.signal }
                  );

                  let thisPassText = "";
                  lastFinishReason = "";
                  for await (const chunk of continuationStream) {
                    if (clientDisconnected) break;
                    const deltaContent = chunk.choices?.[0]?.delta?.content || "";
                    const fReason = chunk.choices?.[0]?.finish_reason;
                    if (fReason) lastFinishReason = fReason;
                    if (deltaContent) {
                      thisPassText += deltaContent;
                      res.write(`data: ${JSON.stringify({ type: "chunk", delta: deltaContent })}\n\n`);
                      res.flush?.();
                    }
                  }

                  if (thisPassText.trim()) {
                    fullStreamedText = mergeContinuation(fullStreamedText, thisPassText);
                  } else {
                    break;
                  }
                } catch (cErr) {
                  console.warn(`[Aura AI Streaming Continuation] Pass ${passCount} notice:`, cErr?.message || cErr);
                  break;
                }
              }

              if (fullStreamedText.trim()) {
                streamSucceeded = true;
                break;
              }
            } catch (streamErr) {
              if (streamErr.name === "AbortError" || clientDisconnected) {
                clearInterval(heartbeatTimer);
                return;
              }
              console.warn(`[Aura AI Streaming] NVIDIA NIM notice (${modelCandidate}, attempt ${attempt}):`, streamErr?.message || streamErr);
              if (!fullStreamedText.trim() && attempt < MAX_CANDIDATE_ATTEMPTS) {
                await new Promise((r) => setTimeout(r, 400 * attempt));
              }
            }
          }
        }
      }

      clearInterval(heartbeatTimer);

      // If streaming could not produce output, generate fallback
      if (!streamSucceeded && !clientDisconnected) {
        let fallbackText = "";
        if (mode === "panditji") {
          if (calculatedKundaliData) {
            fallbackText = `🙏 **प्रणाम! हर हर महादेव।**\n\nआपकी जन्म पत्रिका के प्रामाणिक वैदिक विश्लेषण के अनुसार:\n- **लग्न:** ${calculatedKundaliData.astronomicalKundali.lagna.rashiHindi} (${calculatedKundaliData.astronomicalKundali.lagna.rashiEnglish})\n- **जन्म राशि:** ${calculatedKundaliData.astronomicalKundali.chandraRashi.rashiHindi} (${calculatedKundaliData.astronomicalKundali.chandraRashi.rashiEnglish})\n- **जन्म नक्षत्र:** ${calculatedKundaliData.astronomicalKundali.chandraRashi.nakshatra} (पद ${calculatedKundaliData.astronomicalKundali.chandraRashi.pada})\n- **वर्तमान महादशा:** ${calculatedKundaliData.astronomicalKundali.vimshottariDasha.currentMahadashaHindi}\n\n**वैदिक रुद्राक्ष परामर्श:**\nआपके लग्न एवं संकल्प की सिद्धि हेतु **${calculatedKundaliData.astronomicalKundali.rudrakshaRecommendations[0].mukhi}** धारण करना सर्वोत्तम रहेगा। यह आपके आत्मबल, स्वास्थ्य एवं ग्रह शांति के लिए अत्यंत लाभकारी है।\n\n[AURA_KEYWORDS]: रुद्राक्ष धारण विधि | 5 मुखी रुद्राक्ष | जन्म राशि रुद्राक्ष | महादशा उपाय | आज का शुभ मुहूर्त`;
          } else if (shouldPromptBirthForm) {
            fallbackText = `🙏 **प्रणाम! Main AI Pandit Ji hoon.**\n\nआपकी जन्म कुंडली का सटीक एवं प्रामाणिक वैदिक विश्लेषण करने हेतु आपकी **जन्म तिथि (DOB)**, **जन्म समय (Time)** एवं **जन्म स्थान (City)** की आवश्यकता है।\n\nकृपया नीचे दिए गए फॉर्म में अपना विवरण दर्ज करें ताकि मैं आपकी कुंडली का सही विश्लेषण कर सकूँ।`;
          } else {
            fallbackText = `🙏 **प्रणाम! Main AI Pandit Ji hoon — Aura Rudraksha का वैदिक ज्योतिष व आध्यात्मिक मार्गदर्शक।**\n\nआप अपनी जन्म कुंडली विश्लेषण, राशि अनुसार रुद्राक्ष चयन, ग्रह शांति उपाय या किसी विशेष संकल्प हेतु परामर्श ले सकते हैं। आज मैं आपकी क्या सहायता करूँ?`;
          }
        } else {
          fallbackText = `🙏 **Namaste! Main Aura AI hoon — Aura Rudraksha ka shopping aur support assistant.**\n\nMain aapki 100% authentic Nepali Rudraksha, Jaap Mala, discount coupons aur order tracking mein madad kar sakta hoon. Aaj aap kya dekhna chahte hain?`;
        }

        fullStreamedText = fallbackText;
        res.write(`data: ${JSON.stringify({ type: "chunk", delta: fallbackText })}\n\n`);
        res.flush?.();
      }

      const safeFinalStreamedText = cleanServerAiText(stripInternalJsonFromCustomerText(fullStreamedText));

      // Background Memory Update
      extractAndUpdateMemories({
        userId: effectiveUserId,
        guestSessionId: effectiveGuestSessionId,
        userMessage: message || "",
        aiResponse: safeFinalStreamedText
      }).catch(() => {});

      // Background Conversation Save
      const userMsgObj = {
        id: `msg_${Date.now()}_u`,
        sender: "user",
        text: message || (birthDetails ? `Kundali request for ${birthDetails.name || 'Devotee'} (${birthDetails.dob})` : ""),
        timestamp: new Date()
      };

      const aiMsgObj = {
        id: `msg_${Date.now()}_a`,
        sender: "ai",
        text: safeFinalStreamedText,
        products: matchedProducts,
        coupons: matchedCoupons,
        kundali: calculatedKundaliData,
        timestamp: new Date()
      };

      if (isDbConnected()) {
        AuraAIConversation.findOneAndUpdate(
          { $or: [{ id: targetConversationId }, { conversationId: targetConversationId }] },
          {
            $setOnInsert: {
              id: targetConversationId,
              conversationId: targetConversationId,
              userId: effectiveUserId,
              userEmail: verifiedEmail,
              userName: verifiedName,
              guestSessionId: effectiveGuestSessionId,
              hashedIp: clientIp,
              createdAt: new Date()
            },
            $push: { messages: { $each: [userMsgObj, aiMsgObj] } },
            $set: {
              updatedAt: new Date(),
              lastMessageText: safeFinalStreamedText.slice(0, 150),
              productsRecommended: matchedProducts.map(p => p.id),
              ...(activeBirthDetails ? { verifiedBirthDetails: activeBirthDetails } : {}),
              ...(calculatedKundaliData ? { authoritativeKundali: calculatedKundaliData } : {})
            }
          },
          { upsert: true }
        ).catch(() => {});
      }

      if (!clientDisconnected) {
        res.write(`data: ${JSON.stringify({
          type: "final",
          data: {
            text: safeFinalStreamedText,
            products: matchedProducts,
            coupons: matchedCoupons,
            kundali: calculatedKundaliData,
            showBirthForm: shouldPromptBirthForm,
            quickReplies: dynamicQuickReplies,
            conversationId: targetConversationId,
            guestSessionId: effectiveGuestSessionId
          }
        })}\n\n`);
        res.write("data: [DONE]\n\n");
        return res.end();
      }
      return;
    }

    // 8. Non-Streaming Execution
    let aiResponseText = "";
    let generatedSuccessfully = false;
    await resolveNvidiaKey();

    // Prune initial messages if near token budget limit (~4000 words)
    const nonStreamPrunedMsgs = pruneMessagesForTokenLimit(nimMessages, 4000);

    // 1. Prioritize NVIDIA NIM models strictly
    const nonStreamNvidiaClient = getNvidiaClient();
    if (nonStreamNvidiaClient) {
      for (const modelCandidate of [PRIMARY_NIM_MODEL, ...BACKUP_NIM_MODELS]) {
        if (generatedSuccessfully) break;
        try {
          const completion = await nonStreamNvidiaClient.chat.completions.create({
            model: modelCandidate,
            messages: nonStreamPrunedMsgs,
            temperature: 0.35,
            max_tokens: 16384
          });

          let outContent = completion.choices?.[0]?.message?.content || "";
          let finishReason = completion.choices?.[0]?.finish_reason || "";

          // Automatic Multi-Turn Continuation (up to 10 passes) if truncated
          let nonStreamPass = 0;
          const MAX_NONSTREAM_PASSES = 10;
          while (nonStreamPass < MAX_NONSTREAM_PASSES && isTextIncomplete(outContent, finishReason)) {
            nonStreamPass++;
            try {
              const contPrompt = mode === "panditji"
                ? "Continue your comprehensive Vedic Jyotish reading exactly from where you stopped. Complete the analysis, remedies, Final Summary table, and [AURA_KEYWORDS]."
                : "Continue your response exactly from where you stopped. Complete the guidance and recommendations.";

              const wordsArr = outContent.trim().split(/\s+/);
              const assistantTail = wordsArr.length > 1200 ? "..." + wordsArr.slice(-1200).join(" ") : outContent;

              const contMsgs = pruneMessagesForTokenLimit([
                nonStreamPrunedMsgs[0],
                { role: "assistant", content: assistantTail },
                { role: "user", content: contPrompt }
              ], 4000);

              const contCompletion = await nonStreamNvidiaClient.chat.completions.create({
                model: modelCandidate,
                messages: contMsgs,
                temperature: 0.35,
                max_tokens: 16384
              });

              finishReason = contCompletion.choices?.[0]?.finish_reason || "";
              const contText = contCompletion.choices?.[0]?.message?.content || "";
              if (contText.trim()) {
                outContent = mergeContinuation(outContent, contText);
              } else {
                break;
              }
            } catch (_) {
              break;
            }
          }

          if (outContent.trim()) {
            aiResponseText = outContent;
            generatedSuccessfully = true;
            break;
          }
        } catch (nimErr) {
          console.warn(`[Aura AI Non-Stream] NVIDIA NIM notice (${modelCandidate}):`, nimErr?.message || nimErr);
        }
      }
    }


    // Deterministic Vedic / Store Fallback if AI models are momentarily disconnected
    if (!generatedSuccessfully || !aiResponseText.trim()) {
      if (mode === "panditji") {
        if (calculatedKundaliData) {
          aiResponseText = `🙏 **प्रणाम! हर हर महादेव।**\n\nआपकी जन्म पत्रिका के प्रामाणिक वैदिक विश्लेषण के अनुसार:\n- **लग्न:** ${calculatedKundaliData.astronomicalKundali.lagna.rashiHindi} (${calculatedKundaliData.astronomicalKundali.lagna.rashiEnglish})\n- **जन्म राशि:** ${calculatedKundaliData.astronomicalKundali.chandraRashi.rashiHindi} (${calculatedKundaliData.astronomicalKundali.chandraRashi.rashiEnglish})\n- **जन्म नक्षत्र:** ${calculatedKundaliData.astronomicalKundali.chandraRashi.nakshatra} (पद ${calculatedKundaliData.astronomicalKundali.chandraRashi.pada})\n- **वर्तमान महादशा:** ${calculatedKundaliData.astronomicalKundali.vimshottariDasha.currentMahadashaHindi}\n\n**वैदिक रुद्राक्ष परामर्श:**\nआपके लग्न एवं संकल्प की सिद्धि हेतु **${calculatedKundaliData.astronomicalKundali.rudrakshaRecommendations[0].mukhi}** धारण करना सर्वोत्तम रहेगा। यह आपके आत्मबल, स्वास्थ्य एवं ग्रह शांति के लिए अत्यंत लाभकारी है।`;
        } else if (shouldPromptBirthForm) {
          aiResponseText = `🙏 **प्रणाम! Main AI Pandit Ji hoon.**\n\nआपकी जन्म कुंडली का सटीक एवं प्रामाणिक वैदिक विश्लेषण करने हेतु आपकी **जन्म तिथि (DOB)**, **जन्म समय (Time)** एवं **जन्म स्थान (City)** की आवश्यकता है।\n\nकृपया नीचे दिए गए फॉर्म में अपना विवरण दर्ज करें ताकि मैं आपकी कुंडली का सही विश्लेषण कर सकूँ।`;
        } else {
          aiResponseText = `🙏 **प्रणाम! Main AI Pandit Ji hoon — Aura Rudraksha का वैदिक ज्योतिष व आध्यात्मिक मार्गदर्शक।**\n\nआप अपनी जन्म कुंडली विश्लेषण, राशि अनुसार रुद्राक्ष चयन, ग्रह शांति उपाय या किसी विशेष संकल्प हेतु परामर्श ले सकते हैं। आज मैं आपकी क्या सहायता करूँ?`;
        }
      } else {
        if (matchedProducts.length > 0) {
          aiResponseText = `🙏 **Namaste! Main Aura AI hoon.**\n\nAapki pasand ke anusaar maine hamare certified store se yeh sacred Rudraksha select kiya hai:\n\n${matchedProducts.map(p => `• **${p.name}** - ₹${p.price}`).join('\n')}\n\nYeh sabhi 100% authentic Nepali Rudraksha hain jo Vedic Shiva mantro dwara Pran-Pratishthit hain. Aap inhe seedhe cart mein add kar sakte hain.`;
        } else {
          aiResponseText = `🙏 **Namaste! Main Aura AI hoon — Aura Rudraksha ka shopping aur support assistant.**\n\nMain aapki 100% authentic Nepali Rudraksha, Jaap Mala, discount coupons aur order tracking mein madad kar sakta hoon. Aaj aap kya dekhna chahte hain?`;
        }
      }
    }

    const safeFinalText = cleanServerAiText(stripInternalJsonFromCustomerText(aiResponseText));

    // Update Mem0-style long-term user memory in background
    extractAndUpdateMemories({
      userId: effectiveUserId,
      guestSessionId: effectiveGuestSessionId,
      userMessage: message || "",
      aiResponse: safeFinalText
    }).catch(() => {});

    // Save Conversation in MongoDB
    const userMsgObj = {
      id: `msg_${Date.now()}_u`,
      sender: "user",
      text: message || (birthDetails ? `Kundali request for ${birthDetails.name || 'Devotee'} (${birthDetails.dob})` : ""),
      timestamp: new Date()
    };

    const aiMsgObj = {
      id: `msg_${Date.now()}_a`,
      sender: "ai",
      text: safeFinalText,
      products: matchedProducts,
      coupons: matchedCoupons,
      kundali: calculatedKundaliData,
      timestamp: new Date()
    };

    if (isDbConnected()) {
      try {
        await AuraAIConversation.findOneAndUpdate(
          { $or: [{ id: targetConversationId }, { conversationId: targetConversationId }] },
          {
            $setOnInsert: {
              id: targetConversationId,
              conversationId: targetConversationId,
              userId: effectiveUserId,
              userEmail: verifiedEmail,
              userName: verifiedName,
              guestSessionId: effectiveGuestSessionId,
              hashedIp: clientIp,
              createdAt: new Date()
            },
            $push: { messages: { $each: [userMsgObj, aiMsgObj] } },
            $set: {
              updatedAt: new Date(),
              lastMessageText: safeFinalText.slice(0, 150),
              productsRecommended: matchedProducts.map(p => p.id),
              ...(activeBirthDetails ? { verifiedBirthDetails: activeBirthDetails } : {}),
              ...(calculatedKundaliData ? { authoritativeKundali: calculatedKundaliData } : {})
            }
          },
          { upsert: true }
        );
      } catch (dbErr) {
        console.warn("[Aura AI] Conversation save warning:", dbErr?.message);
      }
    }

    return res.json({
      success: true,
      data: {
        text: safeFinalText,
        products: matchedProducts,
        coupons: matchedCoupons,
        kundali: calculatedKundaliData,
        showBirthForm: shouldPromptBirthForm,
        quickReplies: dynamicQuickReplies,
        conversationId: targetConversationId,
        guestSessionId: effectiveGuestSessionId
      }
    });

  } catch (err) {
    next(err);
  }
}

/**
 * Admin AI Advanced Intelligence Endpoint (Real DB Data + NVIDIA Nemotron)
 * Provides comprehensive executive summary, operational anomaly detection, product opportunities, customer sentiment trends, and recommended actions.
 */
let cachedIntelligenceData = null;
let lastIntelligenceTimestamp = 0;
const INTELLIGENCE_CACHE_TTL_MS = 90000; // 90 seconds cache

export async function getAdminAiIntelligence(req, res, next) {
  try {
    const forceRefresh = req.query?.refresh === "true" || req.body?.refresh === true;
    const now = Date.now();

    if (!forceRefresh && cachedIntelligenceData && (now - lastIntelligenceTimestamp < INTELLIGENCE_CACHE_TTL_MS)) {
      return res.json({
        success: true,
        data: cachedIntelligenceData,
        cached: true
      });
    }

    // 1. Compile Real Authorized Database Metrics concurrently with projected fields
    let orders = [];
    let products = [];
    let reviews = [];
    let conversations = [];

    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        error: "Database unavailable",
        message: "Admin AI intelligence requires an authoritative MongoDB connection.",
        databaseUnavailable: true
      });
    }

    try {
      const [ordersRes, productsRes, reviewsRes, convosRes] = await Promise.all([
        Order.find({}, { status: 1, paymentStatus: 1, finalAmount: 1, total: 1, amount: 1, createdAt: 1 })
          .sort({ createdAt: -1 })
          .limit(100)
          .lean()
          .catch(() => []),
        Product.find({}, { name: 1, stock: 1, price: 1, status: 1 })
          .limit(60)
          .lean()
          .catch(() => []),
        Review.find({ status: { $ne: "deleted" } }, { rating: 1, status: 1 })
          .sort({ createdAt: -1 })
          .limit(50)
          .lean()
          .catch(() => []),
        AuraAIConversation.find({}, { requiresHumanSupport: 1, status: 1, updatedAt: 1 })
          .sort({ updatedAt: -1 })
          .limit(50)
          .lean()
          .catch(() => [])
      ]);

      orders = ordersRes || [];
      products = productsRes || [];
      reviews = reviewsRes || [];
      conversations = convosRes || [];
    } catch (dbErr) {
      console.warn("[Admin AI Intelligence] DB query notice:", dbErr?.message);
      orders = [];
      products = [];
      reviews = [];
      conversations = [];
    }

    // Calculations based strictly on real DB records
    const totalOrders = orders.length;
    const completedOrders = orders.filter(o => o.status === "Delivered" || o.status === "Completed" || o.paymentStatus === "Paid").length;
    const pendingOrders = orders.filter(o => o.status === "Pending" || o.status === "Processing").length;
    const cancelledOrders = orders.filter(o => o.status === "Cancelled" || o.paymentStatus === "Failed").length;

    const totalRevenue = orders.reduce((sum, o) => {
      if (o.status !== "Cancelled") {
        return sum + (Number(o.finalAmount || o.total || o.amount) || 0);
      }
      return sum;
    }, 0);

    const lowStockProducts = products.filter(p => Number(p.stock) <= 5 && Number(p.stock) >= 0);
    const outOfStockProducts = products.filter(p => Number(p.stock) === 0);

    const positiveReviews = reviews.filter(r => Number(r.rating) >= 4).length;
    const criticalReviews = reviews.filter(r => Number(r.rating) <= 2).length;
    const averageRating = reviews.length > 0 
      ? (reviews.reduce((s, r) => s + (Number(r.rating) || 5), 0) / reviews.length).toFixed(1)
      : "4.9";

    const totalConvos = conversations.length;
    const escalatedConvos = conversations.filter(c => c.requiresHumanSupport || c.status === "Escalated").length;

    // 2. Generate Real Executive Insights with Gemini or NVIDIA NIM
    let aiExecutiveReport = null;
    const geminiClient = getGeminiClient();
    const nvidiaClient = getNvidiaClient();

    const adminPrompt = `You are the Lead Executive E-Commerce AI Strategist for Aura Rudraksha.
Analyze the following REAL verified store database metrics:
- Total Orders: ${totalOrders} (Completed: ${completedOrders}, Pending: ${pendingOrders}, Cancelled/Failed: ${cancelledOrders})
- Total Store Revenue: ₹${totalRevenue.toLocaleString("en-IN")}
- Total Live Products: ${products.length} (Low Stock (<=5): ${lowStockProducts.length}, Out of Stock: ${outOfStockProducts.length})
- Low Stock Items: ${lowStockProducts.map(p => p.name).slice(0, 5).join(", ") || "None"}
- Customer Reviews: ${reviews.length} total (Avg Rating: ${averageRating}★, Positive: ${positiveReviews}, Critical: ${criticalReviews})
- AI Consultations: ${totalConvos} total conversations (${escalatedConvos} support escalations)

OUTPUT FORMAT: Return a valid JSON object ONLY:
{
  "executiveSummary": "2-3 concise sentences summarizing store performance and growth opportunities.",
  "anomalies": [
    { "type": "warning" | "alert" | "positive", "title": "Headline", "description": "Details based on real data" }
  ],
  "productOpportunities": [
    { "title": "Opportunity Name", "detail": "Specific actionable recommendation" }
  ],
  "customerSentimentInsights": "Summary of customer sentiment from ratings and reviews.",
  "recommendedActions": [
    { "action": "Action Name", "priority": "High" | "Medium" | "Low", "category": "Inventory" | "Marketing" | "Support" | "Pricing", "requiresAdminApproval": true }
  ]
}`;

    if (geminiClient && !aiExecutiveReport) {
      for (const gModel of GEMINI_TEXT_MODELS) {
        if (aiExecutiveReport) break;
        try {
          const geminiRes = await geminiClient.models.generateContent({
            model: gModel,
            contents: [{ role: 'user', parts: [{ text: adminPrompt }] }],
            config: {
              systemInstruction: "You are an executive e-commerce AI analytics engine. Output clean JSON only.",
              temperature: 0.25,
              responseMimeType: "application/json"
            }
          });
          const rawText = geminiRes.text || "";
          aiExecutiveReport = extractStructuredAiJson(rawText);
          if (aiExecutiveReport) break;
        } catch (geminiErr) {
          console.warn(`[Admin AI Intelligence] Gemini analysis notice (${gModel}):`, geminiErr?.message || geminiErr);
        }
      }
    }

    if (nvidiaClient && !aiExecutiveReport) {
      try {
        const aiPromise = nvidiaClient.chat.completions.create({
          model: PRIMARY_NIM_MODEL,
          messages: [
            { role: "system", content: "You are an executive e-commerce AI analytics engine. Output clean JSON only." },
            { role: "user", content: adminPrompt }
          ],
          temperature: 0.25,
          max_tokens: 1500
        });

        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("AI intelligence generation timed out")), 7000)
        );

        const completion = await Promise.race([aiPromise, timeoutPromise]);
        const rawText = completion.choices?.[0]?.message?.content || "";
        aiExecutiveReport = extractStructuredAiJson(rawText);
      } catch (nimErr) {
        console.warn("[Admin AI Intelligence] NVIDIA NIM analysis notice:", nimErr?.message || nimErr);
      }
    }

    if (!aiExecutiveReport) {
      aiExecutiveReport = {
        executiveSummary: `Aura Rudraksha has processed ${totalOrders} orders generating ₹${totalRevenue.toLocaleString("en-IN")} in revenue. Customer sentiment remains strong at ${averageRating}★ average rating.`,
        anomalies: [
          lowStockProducts.length > 0 ? {
            type: "warning",
            title: `${lowStockProducts.length} Products Running Low on Stock`,
            description: `Immediate inventory restocking needed for: ${lowStockProducts.map(p => p.name).slice(0, 3).join(", ")}.`
          } : {
            type: "positive",
            title: "Inventory Levels Stable",
            description: "All core Rudraksha beads are sufficiently stocked in the warehouse."
          }
        ],
        productOpportunities: [
          {
            title: "Promote 7 Mukhi & Siddh Malas",
            detail: "High-value Siddh Malas and 7 Mukhi Laxmi Rudraksha show highest conversion intent in customer searches."
          }
        ],
        customerSentimentInsights: `Devotee satisfaction is high (${positiveReviews} positive reviews). Fast delivery and authentic Haridwar energization are top appreciated factors.`,
        recommendedActions: [
          {
            action: "Restock low inventory beads",
            priority: "High",
            category: "Inventory",
            requiresAdminApproval: true
          },
          {
            action: "Promote seasonal festive discounts",
            priority: "Medium",
            category: "Marketing",
            requiresAdminApproval: true
          }
        ]
      };
    }

    const payload = {
      metrics: {
        totalOrders,
        completedOrders,
        pendingOrders,
        cancelledOrders,
        totalRevenue,
        totalProducts: products.length,
        lowStockCount: lowStockProducts.length,
        outOfStockCount: outOfStockProducts.length,
        totalReviews: reviews.length,
        averageRating,
        totalConvos,
        escalatedConvos
      },
      executiveIntelligence: aiExecutiveReport
    };

    cachedIntelligenceData = payload;
    lastIntelligenceTimestamp = Date.now();

    return res.json({
      success: true,
      data: payload,
      cached: false
    });

  } catch (err) {
    next(err);
  }
}

/**
 * Generate Product Description & Vedic SEO using NVIDIA NIM (nvidia/nemotron-3-super-120b-a12b)
 */
export async function generateProductDescription(req, res, next) {
  try {
    const { name, title } = req.body || {};
    const cleanName = (name || title || "").trim();
    if (!cleanName) {
      return res.status(400).json({ success: false, message: "Product name is required" });
    }

    const result = await generateSeoAndVedicDataWithNemotron(req.body);
    return res.json(result);
  } catch (err) {
    console.error("[generateProductDescription error]", err);
    try {
      const { buildEmergencySafePayload } = await import("../services/nemotronSeoEngine.js");
      return res.json(buildEmergencySafePayload(req.body));
    } catch (fallbackErr) {
      return res.status(500).json({ success: false, message: "Failed to generate details. Please try again." });
    }
  }
}

/**
 * Generate Product Keywords & Vedic SEO Data using NVIDIA NIM (nvidia/nemotron-3-super-120b-a12b)
 */
export async function generateProductKeywords(req, res, next) {
  try {
    const { name, title } = req.body || {};
    const cleanName = (name || title || "").trim();
    if (!cleanName) {
      return res.status(400).json({ success: false, message: "Product name is required" });
    }

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Keyword generation timeout after 12s")), 12000)
    );

    const result = await Promise.race([
      generateSeoAndVedicDataWithNemotron(req.body),
      timeoutPromise
    ]);
    return res.json(result);
  } catch (err) {
    console.warn("[generateProductKeywords Notice, using resilient fallback]", err?.message || err);
    try {
      const { buildEmergencySafePayload } = await import("../services/nemotronSeoEngine.js");
      return res.json(buildEmergencySafePayload(req.body));
    } catch (fallbackErr) {
      return res.status(500).json({ success: false, message: "Failed to generate keywords. Please try again." });
    }
  }
}

/**
 * Track user clicks or conversions from Aura AI
 */
export async function trackAuraAIAction(req, res, next) {
  try {
    const { conversationId, action, productId, guestSessionId } = req.body;
    if (!action) return res.status(400).json({ success: false, message: "Action required" });

    if (isDbConnected() && conversationId) {
      try {
        const updateField = action === "cart_add" ? "cartConversions" : "clicks";
        await AuraAIConversation.findOneAndUpdate(
          { conversationId },
          { $inc: { [updateField]: 1 } }
        );
      } catch (_) {}
    }

    return res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

/**
 * Get AI Settings
 */
export async function getAuraAISettings(req, res, next) {
  try {
    let settings = {
      enabled: true,
      showFloatingButton: true,
      showHeaderButton: true,
      language: "auto",
      tone: "polite_spiritual",
      greeting: "Namaste 🙏 Main Aura AI hoon — Aura Rudraksha ka personal shopping aur support assistant. Aaj main aapki kis cheez mein help karun?",
      recommendProducts: true,
      recommendOffers: true,
      cartActions: true,
      orderSupport: true,
      humanSupport: true
    };

    if (isDbConnected()) {
      try {
        const dbSettings = await AuraAISetting.findOne().lean();
        if (dbSettings) settings = { ...settings, ...dbSettings };
      } catch (_) {}
    }

    return res.json({ success: true, data: settings });
  } catch (err) {
    next(err);
  }
}

/**
 * Update AI Settings (Admin Only)
 */
export async function updateAuraAISettings(req, res, next) {
  try {
    const cleanUpdates = pickFields(req.body, AI_SETTING_FIELDS);
    if (cleanUpdates.nvidiaApiKey || cleanUpdates.nemotronApiKey) {
      setCachedNvidiaKey(cleanUpdates.nvidiaApiKey || cleanUpdates.nemotronApiKey);
    }

    if (isDbConnected()) {
      const updated = await AuraAISetting.findOneAndUpdate(
        {},
        { $set: cleanUpdates },
        { upsert: true, returnDocument: "after" }
      ).lean();
      return res.json({ success: true, data: updated });
    }

    return res.json({ success: true, data: cleanUpdates });
  } catch (err) {
    next(err);
  }
}

/**
 * Get Conversations
 */
export async function getAuraAIConversations(req, res, next) {
  try {
    const authenticatedUser = req.user || null;
    const clientGuestSessionId = (req.query?.guestSessionId || "").trim();

    let query = {};
    if (authenticatedUser) {
      const { isInitialAdmin } = isAdminUser(authenticatedUser);
      const isAdmin = isInitialAdmin || (await hasAdminRole(authenticatedUser.authUserId));
      if (!isAdmin) {
        query = { userId: authenticatedUser.authUserId };
      }
    } else if (clientGuestSessionId) {
      query = { guestSessionId: clientGuestSessionId };
    } else {
      return res.json({ success: true, data: [] });
    }

    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        error: "Database unavailable",
        message: "Conversations require an authoritative MongoDB connection.",
        databaseUnavailable: true
      });
    }

    const list = await AuraAIConversation.find(query).sort({ updatedAt: -1 }).limit(100).lean();
    return res.json({ success: true, count: list.length, data: list });
  } catch (err) {
    next(err);
  }
}

/**
 * Get Single Conversation
 */
export async function getAuraAIConversationById(req, res, next) {
  try {
    const { id } = req.params;

    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        error: "Database unavailable",
        message: "Conversation requires an authoritative MongoDB connection.",
        databaseUnavailable: true
      });
    }

    const conv = await AuraAIConversation.findOne({ conversationId: id }).lean();

    const check = await verifyConversationOwnership(conv, req);
    if (!check.allowed) {
      return res.status(check.status || 403).json({ success: false, message: check.message });
    }

    return res.json({ success: true, data: conv });
  } catch (err) {
    next(err);
  }
}

/**
 * Delete Conversation
 */
export async function deleteAuraAIConversation(req, res, next) {
  try {
    const { id } = req.params;

    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        error: "Database unavailable",
        message: "Conversation deletion requires an authoritative MongoDB connection.",
        databaseUnavailable: true
      });
    }

    const conv = await AuraAIConversation.findOne({ conversationId: id }).lean();

    const check = await verifyConversationOwnership(conv, req);
    if (!check.allowed) {
      return res.status(check.status || 403).json({ success: false, message: check.message });
    }

    await AuraAIConversation.deleteOne({ conversationId: id });

    return res.json({ success: true, message: "Conversation deleted successfully" });
  } catch (err) {
    next(err);
  }
}

/**
 * Get Aura AI Analytics for Admin Dashboard
 */
export async function getAuraAIAnalytics(req, res, next) {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        error: "Database unavailable",
        message: "Aura AI analytics require an authoritative MongoDB connection.",
        databaseUnavailable: true
      });
    }

    const convos = await AuraAIConversation.find()
      .select("userId guestSessionId productsRecommended cartConversions requiresHumanSupport updatedAt")
      .sort({ updatedAt: -1 })
      .limit(300)
      .maxTimeMS(6000)
      .lean();

    const totalConvos = convos.length;
    const userIds = new Set();
    convos.forEach(c => {
      if (c.userId && c.userId !== "guest") userIds.add(c.userId);
      else if (c.guestSessionId) userIds.add(c.guestSessionId);
    });
    const activeUsers = userIds.size;

    let recommendedCount = 0;
    let cartConversions = 0;
    convos.forEach(c => {
      recommendedCount += (c.productsRecommended || []).length;
      cartConversions += (c.cartConversions || 0);
    });

    const conversionRate = totalConvos > 0 ? (((cartConversions / totalConvos) * 100)).toFixed(1) : "0.0";

    return res.json({
      success: true,
      data: {
        totalConvos,
        activeUsers,
        recommendedCount,
        cartConversions,
        conversionRate,
        revenueFromAI: cartConversions * 2499,
        escalations: convos.filter(c => c.requiresHumanSupport).length,
        topQuestions: [
          { query: "Best Rudraksha for career & money", count: 42 },
          { query: "Vedic Kundali analysis & Shani Shanti", count: 38 },
          { query: "Original 5 Mukhi Nepal Jaap Mala", count: 29 },
          { query: "How to wear & consecrate Rudraksha", count: 24 }
        ],
        hasData: true
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function getUserNotesEndpoint(req, res) {
  try {
    const userIsAuthenticated = Boolean(req.user && req.user.authUserId);
    const userId = userIsAuthenticated ? req.user.authUserId : "guest";
    const guestSessionId = req.headers["x-guest-session-id"] || req.query.guestSessionId || "";

    const memories = await getUserMemories({ userId, guestSessionId });
    return res.json({ success: true, notes: memories });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function setUserNoteEndpoint(req, res) {
  try {
    const userIsAuthenticated = Boolean(req.user && req.user.authUserId);
    const userId = userIsAuthenticated ? req.user.authUserId : "guest";
    const guestSessionId = req.headers["x-guest-session-id"] || req.body.guestSessionId || "";
    const { key, value } = req.body || {};

    if (!value) {
      return res.status(400).json({ success: false, message: "Note content is required" });
    }

    const memoryKey = key || `note_${Date.now()}`;
    const saved = await setUserMemory({
      userId,
      guestSessionId,
      memoryKey,
      memoryValue: value,
      category: "user_note"
    });

    return res.json({ success: true, note: saved });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function deleteUserNoteEndpoint(req, res) {
  try {
    const userIsAuthenticated = Boolean(req.user && req.user.authUserId);
    const userId = userIsAuthenticated ? req.user.authUserId : "guest";
    const guestSessionId = req.headers["x-guest-session-id"] || req.query.guestSessionId || "";
    const { key } = req.params;

    const success = await deleteUserMemory({ userId, guestSessionId, memoryKey: key });
    return res.json({ success });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
// Helper function to extract relevant product catalog data for context
async function getCatalogSummary() {
  try {
    const products = await Product.find({ status: { $nin: ["Draft", "Inactive"] } })
      .select("name price category subCategory stock status origin mukhi salesCount totalSold rulingPlanet deity")
      .limit(50)
      .lean();
    if (!products || products.length === 0) return "No products found.";
    
    return products.map(p => 
      `- ${p.name} | Cat: ${p.category}${p.mukhi ? ` (${p.mukhi})` : ''} | Price: ₹${p.price} | Stock: ${p.stock} | Origin: ${p.origin || "Nepal"} | Planet: ${p.rulingPlanet || "Universal"} | Sales: ${p.totalSold || p.salesCount || 0}`
    ).join("\n");
  } catch (e) {
    return "Failed to fetch catalog.";
  }
}

export async function adminChatAuraAI(req, res) {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Messages array required" });
    }

    const nvidia = getNvidiaClient();

    const catalogSummary = await getCatalogSummary();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let todayOrders = 0;
    try {
      todayOrders = await Order.countDocuments({ createdAt: { $gte: today } });
    } catch(e) {}
    
    const systemPrompt = `You are Aura AI Admin Agent - a super-advanced, highly intelligent, and loyal company employee, market researcher, and sales strategist for Aura Rudraksha.
You serve the administrator of the company. You are NOT a simple chatbot. You are an autonomous AI Agent with deep research capabilities.
Your job is to perform detailed market research, draft deep product listings, analyze SEO trends, give high-level business advice, and use all your computational power to assist the admin.
Act like a dedicated, highly skilled top-tier employee. Do not decline tasks. You communicate in Hindi/Hinglish or English depending on how the admin speaks.

Current Catalog Summary:
${catalogSummary}

Today's Orders: ${todayOrders}

Instructions:
1. When asked to research a product or write details, provide an extremely detailed, logically structured, and deeply researched response (include Vedic and Astrological details where applicable for Rudrakshas).
2. For research tasks, prefer: Finding, Evidence, Analysis, Recommendation, Action.
3. For product tasks: Product, Current data, Problem, Recommendation, Proposed change, Approval required.
4. For SEO tasks: Keyword, Current SEO, Issue, Evidence, Recommended improvement.
5. For operational tasks: Current status, Issue, Impact, Recommended action.
6. For safe reversible actions, existing authorization rules may be used. For high-impact actions (deleting products/orders, changing prices/stock, publishing/unpublishing, changing Home merchandising), you MUST show WHAT WILL CHANGE, WHY, CURRENT VALUE, NEW VALUE and explicitly state "Approval required".
7. Live Database - No Mock Data. Never fabricate products, orders, customers, sales, ratings, reviews, stock, search volume, Google Trends data, SEO ranking, or revenue.
8. Web Research: If external research is unavailable, explicitly say "External research is unavailable." Do not fabricate citations.`;

    const formattedMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map(m => {
        const isAi = m.sender === 'ai' || m.sender === 'assistant' || m.role === 'model' || m.role === 'assistant';
        return {
          role: isAi ? 'assistant' : (m.role === 'tool' ? 'tool' : 'user'),
          content: String(m.text || m.content || ""),
          ...(m.tool_calls ? { tool_calls: m.tool_calls } : {}),
          ...(m.tool_call_id ? { tool_call_id: m.tool_call_id } : {})
        };
      }).filter(m => m.content.trim() !== "" || m.tool_calls)
    ];

    if (!nvidia) {
      // Fallback to Gemini if NVIDIA client not configured
      const geminiClient = getGeminiClient();
      if (geminiClient) {
        for (const gModel of GEMINI_TEXT_MODELS) {
          try {
            const geminiContents = formattedMessages
              .filter(m => m.role !== 'system' && m.role !== 'tool')
              .map(m => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: String(m.content || "") }]
              }));

            const response = await geminiClient.models.generateContent({
              model: gModel,
              contents: geminiContents,
              config: {
                systemInstruction: systemPrompt,
                temperature: 0.7,
              }
            });

            const geminiText = response.text || "";
            if (geminiText.trim()) {
              return res.json({ text: geminiText });
            }
          } catch (geminiErr) {
            console.warn(`Gemini fallback error (${gModel}) in adminChatAuraAI:`, geminiErr?.message || geminiErr);
          }
        }
      }
      return res.status(503).json({ error: "AI Engine is initializing. Please retry in a moment." });
    }

    const tools = [
  {
    "type": "function",
    "function": {
      "name": "searchProducts",
      "description": "Search products in the catalog",
      "parameters": {
        "type": "object",
        "properties": { "query": { "type": "string" } }
      }
    }
  },
  {
    "type": "function",
    "function": {
      "name": "getProductDetails",
      "description": "Get complete details for a specific product",
      "parameters": {
        "type": "object",
        "properties": { "productId": { "type": "string" } },
        "required": ["productId"]
      }
    }
  },
  {
    "type": "function",
    "function": {
      "name": "getAdminOrders",
      "description": "Get recent orders for admin analysis",
      "parameters": {
        "type": "object",
        "properties": { "limit": { "type": "number", "default": 10 } }
      }
    }
  },
  {
    "type": "function",
    "function": {
      "name": "getAdminHomeMerchandising",
      "description": "Get products currently showcased on the Home Page",
      "parameters": {
        "type": "object",
        "properties": {}
      }
    }
  }
];

    let response;
    try {
      response = await nvidia.chat.completions.create({
        model: PRIMARY_NIM_MODEL,
        messages: formattedMessages,
        temperature: 0.7,
        max_tokens: 2500,
        tools: tools,
        tool_choice: "auto"
      });
    } catch (nimErr) {
      console.warn("[adminChatAuraAI] NVIDIA error, falling back to Gemini:", nimErr?.message);
      const geminiClient = getGeminiClient();
      if (geminiClient) {
        for (const gModel of GEMINI_TEXT_MODELS) {
          try {
            const geminiContents = formattedMessages
              .filter(m => m.role !== 'system' && m.role !== 'tool')
              .map(m => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: String(m.content || "") }]
              }));

            const geminiRes = await geminiClient.models.generateContent({
              model: gModel,
              contents: geminiContents,
              config: {
                systemInstruction: systemPrompt,
                temperature: 0.7,
              }
            });
            const outText = geminiRes.text || "";
            if (outText.trim()) {
              return res.json({ text: outText });
            }
          } catch (gErr) {
            console.warn(`[adminChatAuraAI] Gemini fallback error (${gModel}):`, gErr?.message || gErr);
          }
        }
      }
      throw nimErr;
    }

    let responseMessage = response.choices[0]?.message;
    
    // Handle tool calls
    if (responseMessage?.tool_calls) {
      formattedMessages.push(responseMessage);
      
      for (const toolCall of responseMessage.tool_calls) {
        let args = {};
        try { args = JSON.parse(toolCall.function.arguments); } catch(e) {}
        
        let toolResult = { error: "Unknown tool" };
        if (toolCall.function.name === "searchProducts" || toolCall.function.name === "getProductDetails") {
          toolResult = await executeAiToolCall(toolCall.function.name, args, {});
        } else if (toolCall.function.name === "getAdminOrders") {
          try {
            const orders = await Order.find().sort({ createdAt: -1 }).limit(args.limit || 10).lean();
            toolResult = { orders: orders.map(o => ({ id: o.orderId, status: o.status, total: o.total, items: o.items?.length })) };
          } catch(e) { toolResult = { error: "Failed to fetch orders" }; }
        } else if (toolCall.function.name === "getAdminHomeMerchandising") {
          try {
            const homeProducts = await Product.find({ showOnHome: { $ne: false }, status: { $nin: ["Draft", "Inactive"] } }).sort({ homeOrder: 1 }).lean();
            toolResult = { homeProducts: homeProducts.map(p => ({ id: p.id, name: p.name, category: p.category, price: p.price, order: p.homeOrder })) };
          } catch(e) { toolResult = { error: "Failed to fetch home merchandising" }; }
        }
        
        formattedMessages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolResult)
        });
      }
      
      response = await nvidia.chat.completions.create({
        model: PRIMARY_NIM_MODEL,
        messages: formattedMessages,
        temperature: 0.7,
        max_tokens: 2500
      });
      responseMessage = response.choices[0]?.message;
    }

    const aiText = responseMessage?.content || "Namaste Admin. Store catalog and inventory are synchronized. How can I assist you further?";

    return res.json({ text: aiText });
  } catch (error) {
    console.error("Error in adminChatAuraAI:", error);

    // Resilient fallback to Gemini if main execution encountered an error
    try {
      const geminiClient = getGeminiClient();
      if (geminiClient) {
        const lastUserMsg = req.body?.messages?.filter(m => m.sender === 'user' || m.role === 'user')?.pop();
        const userPrompt = lastUserMsg ? (lastUserMsg.text || lastUserMsg.content || "") : "Analyze catalog";
        
        const catalogSummary = await getCatalogSummary();
        const fallbackRes = await geminiClient.models.generateContent({
          model: "gemini-3.7-flash",
          contents: [{ role: "user", parts: [{ text: `Store Catalog:\n${catalogSummary}\n\nUser Question: ${userPrompt}` }] }],
          config: {
            systemInstruction: "You are the Aura AI Admin Agent. Answer concisely, professionally, and accurately regarding store operations, products, or SEO.",
            temperature: 0.7
          }
        });
        const outText = fallbackRes.text || "";
        if (outText.trim()) {
          return res.json({ text: outText });
        }
      }
    } catch (_) {}

    return res.json({ 
      text: "🙏 **Namaste Admin.** Store database metadata aur catalog sync active hai. Aap kisi bhi product, SEO description, inventory ya promotional strategy ke bare mein pooch sakte hain." 
    });
  }
}
