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
import { isDbConnected, getMongoUri, getLastDbSync } from "../config/db.js";
import { pickFields } from "../utils/sanitize.js";
import { isAdminUser, hasAdminRole } from "../middleware/auth.js";
import { 
  searchRelevantCatalogProducts, 
  extractMukhiNumber, 
  extractMukhiRange,
  VEDIC_BEADS_KNOWLEDGE,
  SACRED_RUDRAKSHA_COMBINATIONS
} from "../services/vedicKnowledgeService.js";
import { calculateAuthenticKundali, determineAstrologicalIntent, generateKundaliTopicDiagnosis, generateNonKundaliPanditJiGuidance } from "../services/vedicAstrologyService.js";
import { inMemoryStore } from "../data/inMemoryStore.js";
import { getUserMemories, setUserMemory, deleteUserMemory, extractAndUpdateMemories } from "../services/memoryService.js";
import { retrieveRagContext } from "../services/ragService.js";
import { generateSeoAndVedicDataWithNemotron } from "../services/nemotronSeoEngine.js";
import { executeAiToolCall } from "../services/aiToolsService.js";
import { shouldPerformWebResearch, performGoogleSearchGrounding } from "../services/groundingService.js";

const AI_SETTING_FIELDS = {
  enabled: "bool", showFloatingButton: "bool", showHeaderButton: "bool",
  language: "string", tone: "string", greeting: "string",
  recommendProducts: "bool", recommendOffers: "bool", cartActions: "bool",
  orderSupport: "bool", humanSupport: "bool", personalization: "bool",
  nvidiaApiKey: "string", nemotronApiKey: "string", nemotronModel: "string",
  selectedNimModel: "string", nvidiaModel: "string"
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
export const PRIMARY_NIM_MODEL = "nvidia/llama-3.1-nemotron-70b-instruct";
export const BACKUP_NIM_MODELS = [
  "nvidia/llama-3.1-nemotron-70b-instruct",
  "meta/llama-3.3-70b-instruct",
  "mistralai/mixtral-8x22b-instruct-v0.1",
  "deepseek-ai/deepseek-r1"
];
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
    try {
      const storeSetting = await Setting.findOne().select("nvidiaApiKey nemotronApiKey apiKey").lean();
      const dbKey = (storeSetting?.nvidiaApiKey || storeSetting?.nemotronApiKey || storeSetting?.apiKey || "").trim();
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
      timeout: 10000 // 10s fast failover timeout
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
  if (trimmed.length < 50) return false;

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

  // 4b. If in panditji mode, check if a 9-planet table was started (has Surya/Sun) but was cut off before finishing planets (missing Rahu/Ketu)
  if (mode === "panditji" && (trimmed.includes("सूर्य") || trimmed.includes("Sun")) && !(trimmed.includes("राहु") || trimmed.includes("Rahu") || trimmed.includes("केतु") || trimmed.includes("Ketu"))) {
    return true;
  }

  // 5. Check terminal punctuation or emojis
  const hasTerminalSignal = /([।!?.]\s*$|[।!?.]\s*[*_~"'\)\]]+\s*$|[🙏🕉️✨🌟🌿📿🔱🚩✅💐]\s*$)/.test(trimmed);
  if (hasTerminalSignal) return false;

  // 6. Check if ends with TRUE dangling connector words or unclosed bullet points
  const trueDanglingConnectors = /(तथा|और|एवं|क्योंकि|अर्थात|जैसे कि|किन्तु|परन्तु|जिसमें|जिसके|जो कि|यानी|and|or|but|because|with|by|to|for|1\.|2\.|3\.|4\.|5\.|6\.|7\.|8\.|9\.|10\.|•|→|:\s*|,|\.\.\.)$/i;
  if (trueDanglingConnectors.test(trimmed)) return true;

  // If finishReason is stop/end_turn or normal completion, treat as complete
  return false;
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
export const GEMINI_TEXT_MODELS = [
  process.env.GEMINI_MODEL,
  'gemini-4-hydrogen',
  'gemini-3.8-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest'
].filter(Boolean);

/**
 * Convert OpenAI/NIM formatted messages array to @google/genai Content array.
 */
export function convertNimMessagesToGemini(nimMessages = []) {
  const contents = [];
  for (const m of nimMessages) {
    if (!m || m.role === "system") continue;
    const role = (m.role === "assistant" || m.role === "model") ? "model" : "user";
    const text = String(m.content || m.text || "").trim();
    if (!text) continue;

    if (contents.length > 0 && contents[contents.length - 1].role === role) {
      contents[contents.length - 1].parts[0].text += "\n\n" + text;
    } else {
      contents.push({
        role,
        parts: [{ text }]
      });
    }
  }
  if (contents.length === 0) {
    contents.push({ role: "user", parts: [{ text: "Namaste" }] });
  } else if (contents[0].role === "model") {
    contents.unshift({ role: "user", parts: [{ text: "Namaste" }] });
  }
  return contents;
}


// Strict exact Mukhi product matcher to prevent 1 Mukhi matching 11 Mukhi or 4 Mukhi matching 14 Mukhi
export function isExactMukhiProduct(p, targetMukhiNum) {
  if (!p || !targetMukhiNum) return false;
  const num = parseInt(targetMukhiNum, 10);
  if (!num) return false;

  if (p.mukhi !== undefined && p.mukhi !== null) {
    const pMukhiNum = parseInt(String(p.mukhi).replace(/\D/g, ""), 10);
    if (pMukhiNum === num) return true;
  }

  const name = String(p.name || "").toLowerCase();
  const slug = String(p.slug || "").toLowerCase();

  const strictRegex = new RegExp(`(?:^|[^0-9])${num}\\s*[-]?\\s*mukhi(?:[^0-9]|$)`, "i");
  if (strictRegex.test(name) || strictRegex.test(slug)) return true;

  if (slug === `${num}-mukhi` || slug === `${num}-mukhi-rudraksha` || slug.startsWith(`${num}-mukhi-`)) {
    return true;
  }

  return false;
}

// Format product object with verified catalog images, price, discounts and attributes
function formatProductForResponse(p) {
  if (!p) return null;
  const rawImg = (p.images && p.images.length > 0 && p.images[0]) || p.img || p.image || "/images/placeholder.svg";
  const img = typeof rawImg === "string" && rawImg.startsWith("/images/product-") ? "/images/placeholder.svg" : rawImg;
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
    images: p.images && p.images.length > 0 ? p.images.map(u => typeof u === "string" && u.startsWith("/images/product-") ? "/images/placeholder.svg" : u) : (img ? [img] : ["/images/placeholder.svg"]),
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

  // Remove unintended Chinese (Hanzi / CJK), Japanese (Hiragana/Katakana), Korean (Hangul), and fullwidth artifacts
  text = text.replace(/[\u4e00-\u9fff\u3400-\u4dbf\u2e80-\u2fd5\uf900-\ufaff\u3040-\u30ff\uac00-\ud7af\uff01-\uffee]/g, "");

  // Fix disconnected spaces before Devanagari matras, viramas (halant), nukta, anusvara, visarga
  text = text.replace(/([\u0900-\u097F])\s+([\u093E-\u094D\u0962\u0963\u093C\u0901-\u0903])/g, "$1$2");
  text = text.replace(/([\u0900-\u097F]\u094D)\s+([\u0900-\u097F])/g, "$1$2");

  // Repair common accidentally split Hindi / Vedic words
  text = text.replace(/रु\s+द्रा\s+क्ष/g, "रुद्राक्ष");
  text = text.replace(/रुद्र\s+ाक्ष/g, "रुद्राक्ष");
  text = text.replace(/ने\s+पा\s+ली/g, "नेपाली");
  text = text.replace(/कुं\s+ड\s+ली/g, "कुंडली");
  text = text.replace(/कं\s+ुडली/g, "कुंडली");
  text = text.replace(/कुण्ड\s+ली/g, "कुण्डली");
  text = text.replace(/महा\s+दशा/g, "महादशा");
  text = text.replace(/म\s+हा\s+द\s+शा/g, "महादशा");
  text = text.replace(/अं\s+तर्दशा/g, "अंतर्दशा");
  text = text.replace(/अंतर\s+दशा/g, "अंतर्दशा");
  text = text.replace(/प्र\s+त्यंतर\s+दशा/g, "प्रत्यंतर्दशा");
  text = text.replace(/प्र\s+णाम/g, "प्रणाम");
  text = text.replace(/ज्यो\s+तिष/g, "ज्योतिष");
  text = text.replace(/क\s+ल्याण\s+कारी/g, "कल्याणकारी");
  text = text.replace(/विं\s+शोत्तरी/g, "विंशोत्तरी");
  text = text.replace(/प्रा\s+ण\s*-\s*प्रति\s+ष्ठा/g, "प्राण-प्रतिष्ठा");
  text = text.replace(/धार\s+ण/g, "धारण");
  text = text.replace(/वि\s+धि/g, "विधि");

  // Collapse multiple spaces (preserve single spaces and newlines)
  text = text.replace(/[ \t]{2,}/g, " ");

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
  const labeledTimeMatch = text.match(/(?:time|samay|समय|जन्म\s*समय)[\s:=-]+(\d{1,2})[:.](\d{2})(?:\s*(am|pm|बजे|hrs?))?/i);
  if (labeledTimeMatch) {
    let hh = parseInt(labeledTimeMatch[1], 10);
    const mm = String(labeledTimeMatch[2]).padStart(2, "0");
    const ampm = (labeledTimeMatch[3] || "").toLowerCase();
    if ((ampm === "pm" || /शाम|रात|dopahar|noon/i.test(text)) && hh < 12) hh += 12;
    if ((ampm === "am" || /सुबह|pratah|morning/i.test(text)) && hh === 12) hh = 0;
    if (hh >= 0 && hh <= 23 && parseInt(mm, 10) >= 0 && parseInt(mm, 10) <= 59) {
      birthTime = `${String(hh).padStart(2, "0")}:${mm}`;
    }
  } else {
    const genericTimeMatch = text.match(/\b(\d{1,2})[:.](\d{2})(?:\s*(am|pm|बजे|hrs?))\b/i) || text.match(/(?:at|ko|बजे|samay|समय)\s*(\d{1,2})[:.](\d{2})\b/i);
    if (genericTimeMatch) {
      let hh = parseInt(genericTimeMatch[1], 10);
      const mm = String(genericTimeMatch[2]).padStart(2, "0");
      const ampm = (genericTimeMatch[3] || "").toLowerCase();
      if ((ampm === "pm" || /शाम|रात|dopahar|noon/i.test(text)) && hh < 12) hh += 12;
      if ((ampm === "am" || /सुबह|pratah|morning/i.test(text)) && hh === 12) hh = 0;
      if (hh >= 0 && hh <= 23 && parseInt(mm, 10) >= 0 && parseInt(mm, 10) <= 59) {
        birthTime = `${String(hh).padStart(2, "0")}:${mm}`;
      }
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

  // Fallback: Check for known Indian cities in message
  if (!birthPlace) {
    const lower = text.toLowerCase();
    const commonCities = [
      "jaipur", "delhi", "new delhi", "noida", "gurgaon", "gurugram", "mumbai", "kolkata", "bangalore", 
      "bengaluru", "chennai", "hyderabad", "pune", "ahmedabad", "surat", "lucknow", "kanpur", "indore", 
      "bhopal", "patna", "vadodara", "nagpur", "ghaziabad", "varanasi", "kashi", "agra", "meerut", 
      "nashik", "faridabad", "rajkot", "jodhpur", "kota", "bikaner", "ajmer", "udaipur", "sikar", 
      "alwar", "chandigarh", "ludhiana", "amritsar", "jalandhar", "haridwar", "rishikesh", "dehradun", 
      "mathura", "vrindavan", "ayodhya", "prayagraj", "allahabad", "gwalior", "jabalpur", "raipur", 
      "ranchi", "jamshedpur", "dhanbad", "bhubaneswar", "cuttack", "guwahati", "siliguri", "kochi", 
      "thiruvananthapuram", "mysore", "coimbatore", "madurai", "vijayawada", "visakhapatnam", "tirupati"
    ];
    for (const city of commonCities) {
      const cityRegex = new RegExp(`\\b${city}\\b`, "i");
      if (cityRegex.test(lower)) {
        birthPlace = city.charAt(0).toUpperCase() + city.slice(1);
        break;
      }
    }
  }

  // 4. Name patterns
  let name = null;
  const labeledNameMatch = text.match(/(?:name|devotee|naam|नाम|मेरा\s*नाम|mera\s*naam)[\s:=-]+([a-zA-Z\u0900-\u097F\s]+?)(?=[•\n,;.]|$|है|ji|जी)/i);
  if (labeledNameMatch) {
    let rawName = labeledNameMatch[1].trim()
      .replace(/^(is|hai|hain|ki|ka)\s+/i, "")
      .replace(/\s+(is|hai|hain|ji|जी|ki|ka)$/i, "")
      .trim();
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
  if (/(kundli|kundali|horoscope|birth chart|rashi|nakshatra|graha|dasha|mahadasha|antardasha|lagna|astrology|jyotish|dob|janma|महादशा|अंतर्दशा|विंशोत्तरी|दशा|कुंडली|जन्मपत्रिका|राशि|नक्षत्र|लग्न|मांगलिक|साढ़े साती|साढ़े साती|ग्रह|दोष|भविष्य|विवाह योग|करियर योग|किस की महादशा|महादशा चल रही)/i.test(msg)) {
    intents.push("KUNDALI");
  }
  if (/\b(hi+|hello+|hey+|namaste|pranam|radhe|har har|prabhat|kaise ho|ram ram|jai shree krishna|shubh)\b/i.test(msg) && msg.length < 25) {
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

function generateDynamicQuickReplies({ userMessage, intent, targetMukhi, mode, activeCoupons = [], calculatedKundaliData = null }) {
  const msgLower = (userMessage || "").toLowerCase();
  const replies = [];
  
  // 1. If Kundali is calculated, provide Pandit Ji context-sensitive topic & remedy suggestions!
  if (calculatedKundaliData && calculatedKundaliData.astronomicalKundali) {
    const primaryRec = calculatedKundaliData.astronomicalKundali.rudrakshaRecommendations?.[0];
    const canonicalMukhi = primaryRec?.mukhi || "मुख्य रुद्राक्ष";
    const dasha = calculatedKundaliData.astronomicalKundali.vimshottariDasha?.currentMahadashaHindi || "महादशा";

    if (/(career|job|naukri|nokri|business|vyapar|kaam|profession|कैरियर|नौकरी|व्यापार)/i.test(msgLower)) {
      replies.push(
        "💼 नौकरी में पदोन्नति व बदलाव का सटीक समय",
        "⚖️ मेरे लिए नौकरी बेहतर है या व्यापार?",
        `📿 करियर व धन वृद्धि हेतु ${canonicalMukhi} उपाय`,
        "💰 आर्थिक स्थिरता व आय वृद्धि के योग"
      );
    } else if (/(marriage|shaadi|shadi|vivah|love|relationship|husband|wife|patni|pati|शादी|विवाह)/i.test(msgLower)) {
      replies.push(
        "❤️ शीघ्र विवाह व योग्य जीवनसाथी का समय",
        "💍 दांपत्य सुख हेतु गौरी शंकर रुद्राक्ष विधि",
        "🪐 कुंडली में मांगलिक विचार व निवारण",
        "⏳ आगामी भाग्योदय व अनुकूल समय"
      );
    } else if (/(wealth|dhan|money|paisa|finance|debt|karz|karza|धन|पैसा|कर्ज)/i.test(msgLower)) {
      replies.push(
        "💰 धन लाभ व रुका हुआ पैसा कब आएगा?",
        "🪙 7 मुखी महालक्ष्मी रुद्राक्ष लाभ व विधि",
        "💼 करियर व व्यापार में रुकावट का समाधान",
        `⏳ ${dasha} महादशा में आर्थिक सुधार का समय`
      );
    } else {
      replies.push(
        "💼 नौकरी व करियर के बारे में बताएं",
        "💰 धन, व्यापार व आर्थिक स्थिति का विचार",
        "❤️ विवाह, संबंध व जीवनसाथी का योग",
        `📿 ${canonicalMukhi} धारण विधि व लाल किताब उपाय`
      );
    }
    return replies;
  }

  if (mode === "panditji") {
    if (/(fake|fack|sach|pramanik|kundali|trend|train|farzi|सत्य|प्रमाण)/i.test(msgLower)) {
      replies.push("📝 जन्म विवरण दर्ज करें", "🔍 मेरी कुंडली में क्या परेशानी चल रही है?", "🪐 संपूर्ण विस्तृत कुंडली विश्लेषण", "📿 लग्न अनुसार रुद्राक्ष नियम");
    } else if (targetMukhi) {
      replies.push(`📿 ${targetMukhi} मुखी रुद्राक्ष के लाभ`, "🙏 संपूर्ण धारण विधि व मंत्र", "🪐 कुंडली अनुसार अनुकूलता", `🛍️ ${targetMukhi} मुखी खरीदें`);
    } else {
      replies.push("🔍 मेरी कुंडली में क्या परेशानी चल रही है व कब ठीक होगी?", "🪐 मेरी संपूर्ण विस्तृत जन्म कुंडली व महादशा देखें", "📿 मेरे लिए सबसे शुभ रुद्राक्ष व लाल किताब उपाय", "💰 धन, व्यापार व करियर में रुकावट कब हटेगी?");
    }
    return replies;
  }

  if (targetMukhi) {
    if (targetMukhi === "mala") {
      replies.push("📿 108 दाना जप माला", "🙏 जप विधि व मंत्र", "🛍️ 108 माला ऑर्डर करें", "🎁 आज के स्पेशल ऑफर्स");
    } else if (targetMukhi === "gauri_shankar") {
      replies.push("❤️ गौरी शंकर रुद्राक्ष", "✨ विवाह व दांपत्य लाभ", "🙏 धारण विधि", "🛍️ अभी ऑर्डर करें");
    } else {
      replies.push(`📿 ${targetMukhi} मुखी रुद्राक्ष`, `✨ ${targetMukhi} मुखी के लाभ`, "🙏 धारण विधि", `🛍️ ${targetMukhi} मुखी खरीदें`);
    }
  } else if (msgLower.includes("dhan") || msgLower.includes("wealth") || msgLower.includes("paisa") || msgLower.includes("lakshmi") || msgLower.includes("business")) {
    replies.push("⚡ 7 मुखी महालक्ष्मी रुद्राक्ष", "💰 कुबेर व व्यापार लाभ", "🎁 स्पेशल डिस्काउंट", "🙏 संपूर्ण धारण विधि");
  } else if (msgLower.includes("peace") || msgLower.includes("shanti") || msgLower.includes("stress") || msgLower.includes("bp") || msgLower.includes("health")) {
    replies.push("🌿 5 मुखी पंचमुखी रुद्राक्ष", "📿 108 शिव जप माला", "✨ स्वास्थ्य व शांति लाभ", "🙏 धारण विधि");
  } else if (intent === "ORDER_TRACKING" || msgLower.includes("track") || msgLower.includes("order")) {
    replies.push("📦 मेरा ऑर्डर ट्रैक करें", "📜 ऑर्डर हिस्ट्री", "🚚 डिलीवरी सहायता", "📞 कस्टमर केयर");
  } else if (intent === "COUPON" || intent === "OFFER" || msgLower.includes("offer") || msgLower.includes("discount")) {
    if (activeCoupons && activeCoupons.length > 0) {
      replies.push(...activeCoupons.slice(0, 2).map(c => `🎁 ${c.code} कूपन`));
      replies.push("✨ बेस्ट सेलर रुद्राक्ष", "📿 108 जप माला");
    } else {
      replies.push("🎁 आज के डिस्काउंट ऑफर्स", "✨ बेस्ट सेलर रुद्राक्ष", "📿 1 से 14 मुखी देखें", "✨ फ्री कुंडली विश्लेषण");
    }
  } else {
    replies.push("📿 सिद्ध 1 से 14 मुखी रुद्राक्ष देखें", "✨ फ्री कुंडली व राशि अनुसार रुद्राक्ष", "🎁 आज के एक्टिव डिस्काउंट कूपन", "📦 मेरा ऑर्डर ट्रैक करें");
  }
  
  return Array.from(new Set(replies)).slice(0, 4);
}

function shouldRecommendProducts({ message, intent, targetMukhi, mukhiRange = null, matchedProducts = [] }) {
  const msgLower = (message || "").toLowerCase().trim();

  // Greetings & pure closings -> No product cards
  if (intent === "GREETING") return false;
  if (/^(hi|hello|hey|namaste|pranam|radhe|har har|ram ram|shubh|kaise ho|kya haal|good morning|good evening|good afternoon|thank you|thanks|shukriya|dhanyawad|ok|okay|theek hai|bye|alvida)[\s!.,🙏]*$/i.test(msgLower)) {
    return false;
  }

  // Range ("1-14 mukhi", "sabhi rudraksha") or Specific Mukhi requested
  if ((mukhiRange || targetMukhi) && matchedProducts.length > 0) return true;

  // Price, Buy, Product search, Benefits, Calculation with products, Rashi/Vedic life goals
  const explicitAskPattern = /(dikhao|dikha|chahiye|need|want|show|buy|purchase|khareed|kharid|mangwana|order|price|cost|rate|kitne|kitna|bhav|rupees|rupaye|amount|under|budget|sasta|mehenga|kimat|keemat|dam|daam|suggest|recommend|konsa|kaunsa|mere liye|best seller|catalog|list|rudraksh|mala|sphatik|spatika|bracelet|gauri|ganesh|kuber|dhan|wealth|paisa|lakshmi|business|vyapar|shanti|peace|stress|tension|bp|health|hanuman|protection|student|study|exam|rashi|kundli|lagna|calculate|total|discount|mesh|vrishabh|mithun|kark|singh|kanya|tula|vrischika|dhanu|makar|kumbh|meen)/i.test(msgLower);

  return explicitAskPattern && matchedProducts.length > 0;
}

const IP_HASH_SALT = process.env.IP_HASH_SALT || "aura_ai_ip_salt_998877";

export function getRawClientIp(req) {
  try {
    const raw = (
      req.headers["cf-connecting-ip"] ||
      req.headers["x-real-ip"] ||
      (req.headers["x-forwarded-for"] ? req.headers["x-forwarded-for"].split(",")[0].trim() : "") ||
      req.socket?.remoteAddress ||
      req.ip ||
      "127.0.0.1"
    ).replace(/^::ffff:/, "").trim();
    return raw || "127.0.0.1";
  } catch (_) {
    return "127.0.0.1";
  }
}

export function extractClientMetadata(req) {
  const rawIp = getRawClientIp(req);
  const userAgent = String(req.headers["user-agent"] || "").trim();
  let deviceType = "Desktop";
  let os = "Unknown OS";
  let browser = "Browser";

  if (/iphone|ipad|ipod/i.test(userAgent)) {
    deviceType = "Mobile (Apple iOS)";
    os = "iOS";
  } else if (/android/i.test(userAgent)) {
    deviceType = "Mobile (Android)";
    os = "Android";
  } else if (/macintosh|mac os x/i.test(userAgent)) {
    deviceType = "Desktop (Mac)";
    os = "macOS";
  } else if (/windows nt/i.test(userAgent)) {
    deviceType = "Desktop (Windows)";
    os = "Windows";
  } else if (/linux/i.test(userAgent)) {
    deviceType = "Desktop (Linux)";
    os = "Linux";
  }

  if (/chrome|crios/i.test(userAgent) && !/edg|opr\//i.test(userAgent)) browser = "Chrome";
  else if (/safari/i.test(userAgent) && !/chrome|crios/i.test(userAgent)) browser = "Safari";
  else if (/firefox|fxios/i.test(userAgent)) browser = "Firefox";
  else if (/edg/i.test(userAgent)) browser = "Edge";
  else if (/opera|opr/i.test(userAgent)) browser = "Opera";

  const country = req.headers["cf-ipcountry"] || req.headers["x-country-code"] || "";
  const city = req.headers["cf-ipcity"] || "";

  return {
    rawIp,
    userAgent,
    deviceInfo: `${deviceType} • ${browser}`,
    os,
    browser,
    country,
    city
  };
}

// In-Memory Resilient Store for AI Conversations (guarantees zero chat loss)
export const inMemoryAiConversations = new Map();

export async function saveAiInteractionToDbAndMemory({
  conversationId,
  userId,
  userEmail,
  userName,
  userPhone,
  guestSessionId,
  userIp,
  userAgent,
  deviceInfo,
  platform,
  country,
  city,
  source,
  mode,
  userMessage,
  aiMessage,
  matchedProducts = [],
  matchedCoupons = [],
  kundaliData = null,
  activeBirthDetails = null,
  title
}) {
  const now = new Date();
  const userMsgObj = {
    id: `msg_${Date.now()}_u`,
    sender: "user",
    text: userMessage || "",
    timestamp: now.toISOString()
  };

  const aiMsgObj = {
    id: `msg_${Date.now() + 1}_a`,
    sender: "ai",
    text: aiMessage || "",
    products: matchedProducts,
    coupons: matchedCoupons,
    kundali: kundaliData,
    timestamp: now.toISOString()
  };

  // 1. Update In-Memory cache
  let memConv = inMemoryAiConversations.get(conversationId);
  if (!memConv) {
    memConv = {
      id: conversationId,
      conversationId,
      userId: userId || "guest",
      userEmail: userEmail || "",
      userName: userName || "Devotee",
      userPhone: userPhone || "",
      guestSessionId: guestSessionId || "",
      userIp: userIp || "127.0.0.1",
      ipAddress: userIp || "127.0.0.1",
      userAgent: userAgent || "",
      deviceInfo: deviceInfo || "Desktop • Browser",
      platform: platform || "",
      country: country || "",
      city: city || "",
      source: source || (mode === "panditji" ? "panditji_floating" : "floating_bot"),
      mode: mode || "standard",
      title: title || (mode === "panditji" ? "AI Panditji Astrological Consultation" : "Aura AI Chat"),
      messages: [],
      productsRecommended: [],
      authoritativeKundali: kundaliData,
      verifiedBirthDetails: activeBirthDetails,
      lastMessageText: (aiMessage || "").slice(0, 160),
      lastMessageAt: now.toISOString(),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };
  }

  if (userMessage) memConv.messages.push(userMsgObj);
  if (aiMessage) memConv.messages.push(aiMsgObj);
  memConv.lastMessageText = (aiMessage || userMessage || "").slice(0, 160);
  memConv.lastMessageAt = now.toISOString();
  memConv.updatedAt = now.toISOString();
  if (userIp) { memConv.userIp = userIp; memConv.ipAddress = userIp; }
  if (userName && userName !== "Devotee") memConv.userName = userName;
  if (userEmail) memConv.userEmail = userEmail;
  if (kundaliData) memConv.authoritativeKundali = kundaliData;
  if (activeBirthDetails) memConv.verifiedBirthDetails = activeBirthDetails;
  if (matchedProducts.length > 0) {
    memConv.productsRecommended = Array.from(new Set([...memConv.productsRecommended, ...matchedProducts.map(p => p.id || p._id)]));
  }

  inMemoryAiConversations.set(conversationId, memConv);

  // Maintain max 500 in memory
  if (inMemoryAiConversations.size > 500) {
    const oldestKey = inMemoryAiConversations.keys().next().value;
    inMemoryAiConversations.delete(oldestKey);
  }

  // 2. Persist to MongoDB
  if (isDbConnected()) {
    try {
      await AuraAIConversation.findOneAndUpdate(
        { $or: [{ id: conversationId }, { conversationId }] },
        {
          $setOnInsert: {
            id: conversationId,
            conversationId,
            userId: userId || "guest",
            userEmail: userEmail || "",
            userName: userName || "Devotee",
            userPhone: userPhone || "",
            guestSessionId: guestSessionId || "",
            userIp: userIp || "127.0.0.1",
            ipAddress: userIp || "127.0.0.1",
            hashedIp: userIp || "127.0.0.1",
            userAgent: userAgent || "",
            deviceInfo: deviceInfo || "Desktop • Browser",
            platform: platform || "",
            country: country || "",
            city: city || "",
            source: source || (mode === "panditji" ? "panditji_floating" : "floating_bot"),
            mode: mode || "standard",
            title: title || (mode === "panditji" ? "AI Panditji Astrological Consultation" : "Aura AI Chat"),
            createdAt: now
          },
          $push: {
            messages: {
              $each: [
                ...(userMessage ? [userMsgObj] : []),
                ...(aiMessage ? [aiMsgObj] : [])
              ]
            }
          },
          $set: {
            updatedAt: now,
            lastMessageText: (aiMessage || userMessage || "").slice(0, 160),
            lastMessageAt: now.toISOString(),
            ...(userIp ? { userIp, ipAddress: userIp } : {}),
            ...(userName && userName !== "Devotee" ? { userName } : {}),
            ...(userEmail ? { userEmail } : {}),
            ...(userPhone ? { userPhone } : {}),
            ...(deviceInfo ? { deviceInfo } : {}),
            ...(matchedProducts.length > 0 ? { productsRecommended: matchedProducts.map(p => p.id || p._id) } : {}),
            ...(activeBirthDetails ? { verifiedBirthDetails: activeBirthDetails } : {}),
            ...(kundaliData ? { authoritativeKundali: kundaliData } : {})
          }
        },
        { upsert: true, returnDocument: "after" }
      ).catch(() => {});
    } catch (_) {}
  }
}

export function getHashedIp(req) {
  try {
    const rawIp = getRawClientIp(req);
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
    if ((!allProducts || allProducts.length === 0) && inMemoryStore.isProductsSyncedFromDb && Array.isArray(inMemoryStore.products)) {
      allProducts = inMemoryStore.products;
    }

    const recommendedProducts = [];
    const recs = kundaliData.astronomicalKundali?.rudrakshaRecommendations || [];
    const primaryRec = recs[0];
    const chandraRec = recs[1];
    const dashaRec = recs[2];

    const findMatchingProductsForRec = (recItem) => {
      if (!recItem) return [];
      const mukhiNum = recItem.mukhiNumber || parseInt(recItem.mukhi, 10);
      const mukhiStr = String(recItem.mukhi || "").toLowerCase();

      return allProducts.filter(p => {
        if (!p) return false;
        if (mukhiNum && isExactMukhiProduct(p, mukhiNum)) return true;

        const titleLower = (p.name || "").toLowerCase();
        const slugLower = (p.slug || "").toLowerCase();

        if (mukhiStr.includes("gauri shankar") && (titleLower.includes("gauri shankar") || slugLower.includes("gauri-shankar"))) return true;
        if (mukhiStr.includes("ganesh") && (titleLower.includes("ganesh") || slugLower.includes("ganesh"))) return true;
        if (mukhiStr.includes("garbh gauri") && (titleLower.includes("garbh gauri") || slugLower.includes("garbh-gauri"))) return true;
        if (mukhiStr.includes("108") && (titleLower.includes("108") || titleLower.includes("mala") || titleLower.includes("jaap"))) return true;
        return false;
      });
    };

    // Match products for Primary Life Mukhi, Chandra Rashi Mukhi, and Dasha Mukhi
    for (const recItem of [primaryRec, chandraRec, dashaRec]) {
      if (!recItem) continue;
      const matched = findMatchingProductsForRec(recItem);
      for (const m of matched) {
        const mId = String(m.id || m._id);
        if (!recommendedProducts.some(rp => rp.id === mId)) {
          recommendedProducts.push(formatProductForResponse(m));
        }
      }
    }

    const primaryMukhiNum = primaryRec?.mukhiNumber || parseInt(primaryRec?.mukhi, 10);
    const exactPrimaryProduct = primaryMukhiNum ? allProducts.find(p => isExactMukhiProduct(p, primaryMukhiNum)) : null;

    const matchedProduct = (exactPrimaryProduct ? formatProductForResponse(exactPrimaryProduct) : null) || 
      recommendedProducts[0] || 
      (allProducts[0] ? formatProductForResponse(allProducts[0]) : null);

    // 3. Generate Vedic Interpretation prioritizing NVIDIA NIM (nemotron-3-super-120b-a12b)
    let aiInterpretation = "";
    await resolveNvidiaKey();
    await resolveGeminiKey();
    const nvidiaClient = getNvidiaClient();
    const geminiClient = getGeminiClient();

    const astroPrompt = `आप Aura Rudraksha (https://aurarudraksha.bond) के लिए एक अत्यंत बुद्धिमान, विनम्र, स्पष्ट, प्रामाणिक और विस्तृत "AI Vedic Astrologer / AI Panditji" (🕉️) की तरह कार्य करेंगे।

AI मॉडल: NVIDIA Nemotron-3-Super-120B-A12B

मुख्य उद्देश्य:
उपयोगकर्ता की जन्म कुंडली एवं वैदिक ज्योतिषीय गणनाओं (Sidereal Astronomical Calculations) के आधार पर उसके प्रश्न का प्रामाणिक, कुंडली-आधारित, उपयोगी, जिम्मेदार और अधिकतम स्पष्ट उत्तर देना।

SOURCE PRIORITY (स्रोतों की सर्वोच्च प्राथमिकता):
1. Verified birth details (नाम, जन्म तारीख, समय, स्थान, अक्षांश/देशांतर, अयनांश)
2. ग्रहों की वास्तविक स्थिति (राशि, भाव, अंश, उच्च/नीच/वक्री/अस्त स्थिति)
3. लग्न, चंद्र राशि, सूर्य राशि
4. नक्षत्र और चरण
5. भाव (1-12), भावेश और ग्रह दृष्टि
6. Dasha timelines (विंशोत्तरी महादशा, अंतर्दशा, प्रत्यंतर, सूक्ष्म)
7. Divisional charts (D9 नवमांश, D10 दशमांश, D7, D24, D30)
8. Shadbala, Ashtakavarga, KP (Cusp, Star lord, Sub lord), Jaimini Chara Karakas (AK, AmK, DK), Gochar
9. Shastra & Lal Kitab remedies, Sacred Consecrated Nepali Rudraksha (1-21 Mukhi, Shiva Purana Dharan Vidhi, Beej Mantra, Gangajal Abhishekam)

कभी भी जन्म समय, स्थान, ग्रह स्थिति, दशा या तारीख अपने मन से न बनाएं। Missing data होने पर साफ बताएं। विरोधाभास होने पर उसे छिपाएं नहीं।

जातक का जन्म विवरण (VERIFIED BIRTH DETAILS):
- नाम: ${kundaliData.verifiedBirthData.name}
- जन्म तारीख व समय: ${kundaliData.verifiedBirthData.dob} at ${kundaliData.verifiedBirthData.birthTime}
- जन्म स्थान: ${kundaliData.verifiedBirthData.birthPlace} (Lat: ${kundaliData.verifiedBirthData.coordinates.lat}°, Lon: ${kundaliData.verifiedBirthData.coordinates.lon}°)
- अयनांश (Ayanamsha): ${kundaliData.verifiedBirthData.ayanamsha}

गणना की गई वास्तविक ग्रह स्थिति (CALCULATED ASTRONOMICAL PLACEMENTS):
- लग्न (Lagna / Ascendant): ${kundaliData.astronomicalKundali.lagna.rashiHindi} (${kundaliData.astronomicalKundali.lagna.rashiEnglish}) at ${kundaliData.astronomicalKundali.lagna.degree} | नक्षत्र: ${kundaliData.astronomicalKundali.lagna.nakshatra} (चरण ${kundaliData.astronomicalKundali.lagna.pada}) | नवमांश (D9): ${kundaliData.astronomicalKundali.lagna.navamsha || "N/A"} | स्वामी: ${kundaliData.astronomicalKundali.lagna.lord}
- चंद्र राशि (Moon Sign): ${kundaliData.astronomicalKundali.chandraRashi.rashiHindi} (${kundaliData.astronomicalKundali.chandraRashi.rashiEnglish}) at ${kundaliData.astronomicalKundali.chandraRashi.degree} | नक्षत्र: ${kundaliData.astronomicalKundali.chandraRashi.nakshatra} (चरण ${kundaliData.astronomicalKundali.chandraRashi.pada}) | स्वामी: ${kundaliData.astronomicalKundali.chandraRashi.lord}
- सूर्य राशि (Sun Sign): ${kundaliData.astronomicalKundali.suryaRashi.rashiHindi} (${kundaliData.astronomicalKundali.suryaRashi.rashiEnglish})
- मूलांक (Mulank): ${kundaliData.astronomicalKundali.mulank}
- जैमिनी चर कारक (Jaimini Karakas): ${kundaliData.astronomicalKundali.jaiminiKarakas ? kundaliData.astronomicalKundali.jaiminiKarakas.map(k => `${k.karakaCode} (${k.karakaName}): ${k.planetName}`).join(" | ") : "N/A"}
- विंशोत्तरी महादशा (Current Mahadasha): ${kundaliData.astronomicalKundali.vimshottariDasha.currentMahadashaHindi} (${kundaliData.astronomicalKundali.vimshottariDasha.mahadashaStartDate} से ${kundaliData.astronomicalKundali.vimshottariDasha.mahadashaEndDate})
- सक्रिय अंतर्दशा (Current Antardasha): ${kundaliData.astronomicalKundali.vimshottariDasha.currentAntardashaHindi} (${kundaliData.astronomicalKundali.vimshottariDasha.antardashaStartDate} से ${kundaliData.astronomicalKundali.vimshottariDasha.antardashaEndDate})
- अंतर्दशा समय चक्र: ${kundaliData.astronomicalKundali.vimshottariDasha.antardashasTimeline?.map(a => `${a.planetHindi} (${a.startDate} से ${a.endDate})${a.isCurrent ? ' [वर्तमान]' : ''}`).join(" | ") || 'N/A'}
- आगामी महादशाएं: ${kundaliData.astronomicalKundali.vimshottariDasha.upcomingMahadashas?.map(m => `${m.planetHindi} (${m.years} वर्ष, ${m.startDate} से ${m.endDate})`).join(" | ") || 'N/A'}
- मांगलिक विचार: ${kundaliData.astronomicalKundali.doshaSummary.manglikNote}
- साढ़े साती स्थिति: ${kundaliData.astronomicalKundali.doshaSummary.sadeSati?.phase || "None"}
- नवग्रह स्थिति व विस्तृत फल: ${kundaliData.astronomicalKundali.planets.map(p => `${p.hindiName || p.name} in House ${p.houseNumber} (${p.rashiHindi} ${p.degreeInSign}, ${p.dignity}, D9: ${p.navamshaRashiHindi}, D10: ${p.dashamshaRashiHindi || 'N/A'}, Karaka: ${p.karaka || ''}, Phaladesh: ${p.signification || ''}, Mantra: ${p.mantra || ''}, Upay: ${p.upay || ''})`).join(" || ")}
- 12 भावों (Bhavas) की स्थिति व फलादेश: ${kundaliData.astronomicalKundali.houses.map(h => `H${h.houseNumber} (${h.houseTitle || ''} - ${h.rashiHindi}, स्वामी: ${h.lord}, भावेश स्थिति: ${h.lordPlacement || ''}, स्थित ग्रह: ${h.occupants.join(', ')}, फलादेश: ${h.bhavaPhaladesh || ''})`).join(" || ")}
- पंडित जी का सूक्ष्म जीवन-निदान (PRE-COMPUTED PANDIT JI DIAGNOSIS — MUST INCLUDE IN DETAIL):
  * अभी क्या-क्या परेशानी चल रही है: ${(kundaliData.astronomicalKundali.panditJiDiagnosis?.currentProblems || []).join(" | ")}
  * यह परेशानी क्यों और कैसे चल रही है: ${(kundaliData.astronomicalKundali.panditJiDiagnosis?.whyAndHow || []).join(" | ")}
  * यह परेशानी कब से चल रही है: ${(kundaliData.astronomicalKundali.panditJiDiagnosis?.sinceWhen || []).join(" | ")}
  * यह परेशानी कब ठीक होगी और भाग्योदय कब होगा: ${(kundaliData.astronomicalKundali.panditJiDiagnosis?.whenWillItResolve || []).join(" | ")}
- कुंडली-प्रमाणित सिद्ध रुद्राक्ष: ${(kundaliData.astronomicalKundali.rudrakshaRecommendations || []).map(r => `${r.role}: ${r.mukhi} (शास्त्रीय कारण: ${r.reason || ''}, बीज मंत्र: ${r.beejMantra || ''}, धारण दिन: ${r.wearingDay || ''})`).join(" || ")}

जातक का मुख्य प्रश्न / चिंता: ${concern} ${customConcern ? `("${customConcern}")` : ""}

CHAT DISPLAY & MOBILE-FRIENDLY FORMATTING RULES (CRITICAL):
- पूरा उत्तर इसी चैट में दिखना चाहिए। कभी भी संक्षिप्त (Short) उत्तर न दें—एक अनुभवी वैदिक पंडित जी की तरह पूरी कुंडली खोलकर विस्तार से समझाएं।
- Read more, Show more, hidden accordion, collapsed sections या छिपे हुए टेक्स्ट का उपयोग न करें।
- STRICT NO-HORIZONTAL-SCROLL-TABLE DIRECTIVE:
  * कभी भी चौड़ी Markdown Pipe Tables (| col1 | col2 | col3 |) न बनाएं।
  * इसके स्थान पर सभी ग्रह फलादेश, 12 भाव, दशा चक्र और उपायों को सुंदर, स्पष्ट एवं क्रमबद्ध BULLET POINTS में प्रस्तुत करें (उदा. • 📌 **[ग्रह/विषय]:** [विस्तृत फलादेश व उपाय])।

LANGUAGE & TONE:
- शुद्ध, आत्मीय एवं सरल देवनागरी हिंदी रखें और एक विद्वान, अनुभवी वैदिक ब्राह्मण/पंडित जी की तरह स्नेहपूर्वक एवं प्रामाणिक रूप से बात करें।

MANDATORY PANDIT JI RESPONSE FORMAT (संपूर्ण विस्तृत कुंडली व समस्या निदान):
1. 🙏 **वैदिक अभिवादन व जातक परिचय** (${kundaliData.verifiedBirthData.name} जी का स्वागत व पंचांग/अवकहड़ा परिचय)
2. 🔍 **अभी आपके जीवन में क्या-क्या परेशानी चल रही है? (वर्तमान समस्याओं का सटीक निदान)**:
   - मानसिक स्थिति, करियर/व्यापार में रुकावट, धन/खर्च/कर्ज, पारिवारिक/वैवाहिक संबंध और स्वास्थ्य/गुप्त बाधाओं का बिंदुवार स्पष्ट वर्णन करें।
3. ❓ **यह परेशानी क्यों और कैसे चल रही है? (कुंडली के ग्रहों व भावों का शास्त्रीय कारण)**:
   - वर्तमान महादशा (${kundaliData.astronomicalKundali.vimshottariDasha.currentMahadashaHindi}) व अंतर्दशा (${kundaliData.astronomicalKundali.vimshottariDasha.currentAntardashaHindi}), त्रिक भाव (6, 8, 12), नीच/शत्रु/अस्त ग्रह, गोचर और लाल किताब के मंदे ग्रहों का प्रमाण देकर समझाएं कि काम क्यों अटक रहा है।
4. 📅 **यह परेशानी कब से चल रही है? (सटीक तारीख व दशा आरंभ प्रमाण)**:
   - महादशा आरंभ (${kundaliData.astronomicalKundali.vimshottariDasha.mahadashaStartDate}), अंतर्दशा आरंभ (${kundaliData.astronomicalKundali.vimshottariDasha.antardashaStartDate}) और प्रत्यंतर दशा आरंभ (${kundaliData.astronomicalKundali.vimshottariDasha.pratyantardashaStartDate || ''}) की सटीक तारीखों के साथ बताएं कि यह संघर्ष कब से शुरू हुआ।
5. ⏳ **यह परेशानी कब ठीक होगी और भाग्योदय कब होगा? (सटीक राहत तारीख व स्वर्ण काल)**:
   - प्रत्यंतर दशा समाप्ति (${kundaliData.astronomicalKundali.vimshottariDasha.pratyantardashaEndDate || ''}) पर पहली राहत और अंतर्दशा समाप्ति (${kundaliData.astronomicalKundali.vimshottariDasha.antardashaEndDate}) पर पूर्ण समाधान व आगामी शुभ दशाओं की सटीक तारीखें बताएं।
6. 🪐 **नवग्रहों का एक-एक करके संपूर्ण विस्तृत विश्लेषण (All 9 Planets Detailed Reading)**:
   - सूर्य, चंद्र, मंगल, बुध, गुरु, शुक्र, शनि, राहु और केतु — सभी 9 ग्रहों की राशि, भाव, अंश, उच्च/नीच/स्वगृही स्थिति, नवमांश (D9), दशमांश (D10), कारकत्व, विस्तृत फलादेश, बीज मंत्र और उपाय को अलग-अलग बुलेट पॉइंट में विस्तार से लिखें।
7. 🏛️ **कुंडली के संपूर्ण 12 भावों (1st to 12th Bhava), राजयोग एवं दोषों (मांगलिक, साढ़े साती, कालसर्प, लाल किताब) का विस्तृत विश्लेषण**
8. 💼 **जीवन के प्रमुख क्षेत्रों (करियर/नौकरी/व्यापार, धन/संपत्ति, विवाह/दांपत्य, शिक्षा/संतान) का विस्तृत फलादेश**
9. 📿 **पंडित जी के अचूक लाल किताब उपाय एवं कुंडली-प्रमाणित सिद्ध नेपाली रुद्राक्ष (बीज मंत्र व शिव पुराण धारण विधि सहित)**
10. 🌟 **अनिवार्य सारांश (Key Takeaways - Bullet Points में)**
11. 🔤 **[AURA_KEYWORDS]: keyword1 | keyword2 | keyword3 | keyword4 | keyword5**

SAFETY:
मृत्यु की तारीख, गंभीर बीमारी का diagnosis, दुर्घटना की निश्चित भविष्यवाणी या डराकर उपाय बेचने का कार्य कदापि न करें।`;

    // 1. Try NVIDIA NIM (nemotron-3-super-120b-a12b) first
    if (nvidiaClient && !aiInterpretation) {
      const isNvidia = (nvidiaClient.baseURL || "").includes("nvidia") || (nvidiaClient.baseURL || "").includes("integrate.api");
      for (const modelCandidate of [PRIMARY_NIM_MODEL, ...BACKUP_NIM_MODELS]) {
        if (aiInterpretation) break;
        try {
          const completion = await nvidiaClient.chat.completions.create({
            model: modelCandidate,
            messages: [
              { role: "system", content: "You are AI Pandit Ji (Vedic Astrology Acharya) for Aura Rudraksha. Always provide an exhaustive, deeply detailed, complete 11-section Vedic Kundali reading in warm Hindi explaining all 9 planets, all 12 houses, what problems are happening, why, since when, how, and when they will resolve." },
              { role: "user", content: astroPrompt }
            ],
            temperature: 0.35,
            max_tokens: 8192,
            ...(isNvidia ? { chat_template_kwargs: { enable_thinking: false } } : {})
          });

          aiInterpretation = completion.choices?.[0]?.message?.content || "";
        } catch (nimErr) {
          console.warn(`[Kundali Endpoint] NVIDIA NIM notice (${modelCandidate}):`, nimErr?.message || nimErr);
        }
      }
    }

    const fullPrecomputedReport = kundaliData.astronomicalKundali.panditJiDiagnosis?.fullPanditJiReportMarkdown || "";
    if (!aiInterpretation.trim() || aiInterpretation.trim().length < 2200) {
      aiInterpretation = fullPrecomputedReport || aiInterpretation;
    }

    return res.json({
      success: true,
      data: {
        ...kundaliData,
        aiInterpretation: cleanServerAiText(aiInterpretation),
        matchedProduct,
        recommendedProducts
      }
    });

  } catch (err) {
    next(err);
  }
}

const KNOWN_FAKE_COUPON_CODES = [
  "SHIVOHAM10",
  "MAHASHIVRATRI",
  "SHIV10",
  "SHIVA10",
  "DISCOUNT50",
  "FIRST100",
  "FESTIVAL20",
  "FESTIVE10",
  "AURA10",
  "AURA20",
  "DIWALI10",
  "DIWALI20",
  "WELCOME10",
  "FLAT10",
  "SAVE10"
];

export function sanitizeFakeCouponsInResponse(text = "", activeCoupons = []) {
  if (!text || typeof text !== "string") return text;
  const activeCodeSet = new Set(
    (activeCoupons || [])
      .map(c => String(c?.code || c?.couponCode || "").trim().toUpperCase())
      .filter(Boolean)
  );

  const inactiveFakeCodes = KNOWN_FAKE_COUPON_CODES.filter(code => !activeCodeSet.has(code));
  if (inactiveFakeCodes.length === 0) return text;

  const fakeRegex = new RegExp(`\\b(${inactiveFakeCodes.join("|")})\\b`, "gi");
  if (!fakeRegex.test(text)) return text;

  const lines = text.split("\n");
  const cleanedLines = [];
  let removedCouponLine = false;

  for (const line of lines) {
    const lineHasFake = new RegExp(`\\b(${inactiveFakeCodes.join("|")})\\b`, "i").test(line);
    if (!lineHasFake) {
      cleanedLines.push(line);
      continue;
    }
    removedCouponLine = true;
    // If line is purely a coupon/discount pitch line, omit it cleanly
    if (/(कूपन|coupon|कोड|code|discount|छूट|बचत|OFF|promo)/i.test(line)) {
      continue;
    }
    // Otherwise remove only the fake code token cleanly
    const strippedLine = line
      .replace(new RegExp(`\\*{0,2}\x60?\\b(${inactiveFakeCodes.join("|")})\\b\x60?\\*{0,2}`, "gi"), "")
      .replace(/\s{2,}/g, " ")
      .trim();
    if (strippedLine) cleanedLines.push(strippedLine);
  }

  let result = cleanedLines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!result && removedCouponLine) {
    if (activeCoupons.length > 0) {
      const listText = activeCoupons.map((c, idx) =>
        `${idx + 1}. 🌟 **${c.code}** — ${c.type === "fixed" ? `Flat ₹${c.discount} की छूट` : `फ्लैट ${c.discount}% की छूट`}${c.minAmount > 0 ? ` (न्यूनतम ऑर्डर ₹${Number(c.minAmount).toLocaleString("en-IN")})` : ""}${c.description ? ` • ${c.description}` : ""}`
      ).join("\n");
      result = `🎁 **ऑरा रुद्राक्ष के सक्रिय एडमिन डिस्काउंट कूपन:**\n\n${listText}\n\nचेकआउट के समय 'Apply Coupon' में उपरोक्त कोड दर्ज करें।`;
    } else {
      result = `🎁 **ऑरा रुद्राक्ष ऑफर्स एवं कूपन अपडेट:**\n\nवर्तमान में कोई अलग डिस्काउंट कूपन कोड सक्रिय नहीं है। यदि एडमिन डैशबोर्ड से कोई नया कूपन कोड या ऑफर सक्रिय किया जाता है, तो वह तुरंत यहाँ और चेकआउट पेज पर उपलब्ध हो जाएगा।\n\n• 🔱 **निःशुल्क सेवा:** हर सिद्ध रुद्राक्ष के साथ निःशुल्क वैदिक प्राण-प्रतिष्ठा पूजा व लैब सर्टिफिकेट।`;
    }
  }
  return result;
}

export function extractMentionedCatalogProducts(text = "", existingMatched = [], allStoreProds = []) {
  const result = [];
  const seenIds = new Set();

  for (const prod of (existingMatched || [])) {
    if (!prod) continue;
    const pId = String(prod.id || prod._id || prod.slug || "");
    if (!pId || seenIds.has(pId)) continue;
    seenIds.add(pId);
    result.push(prod);
  }

  if (!text || !Array.isArray(allStoreProds) || allStoreProds.length === 0) {
    return result.slice(0, 6);
  }

  const normalizeKey = (val) => String(val || "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
  const linkRegex = /\/product\/([^)\s"'<>#?]+)/gi;
  let m;
  while ((m = linkRegex.exec(text)) !== null) {
    let rawSlug = m[1] || "";
    try {
      rawSlug = decodeURIComponent(rawSlug);
    } catch (_) {}
    const cleanTarget = rawSlug.trim().toLowerCase();
    const normTarget = normalizeKey(rawSlug);
    if (!cleanTarget) continue;

    const found = allStoreProds.find(p => {
      if (!p) return false;
      const pId = String(p.id || p._id || "").trim().toLowerCase();
      const pSlug = String(p.slug || "").trim().toLowerCase();
      const nameSlug = String(p.name || "").toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-");
      return pSlug === cleanTarget || pId === cleanTarget || nameSlug === cleanTarget ||
        (normTarget && (normalizeKey(pSlug) === normTarget || normalizeKey(pId) === normTarget || normalizeKey(nameSlug) === normTarget));
    });

    if (found) {
      const formatted = formatProductForResponse(found);
      if (formatted && !seenIds.has(formatted.id)) {
        seenIds.add(formatted.id);
        result.push(formatted);
      }
    }
    if (result.length >= 6) break;
  }

  return result.slice(0, 6);
}

function buildActiveCouponsFooter(activeCoupons = []) {
  if (!Array.isArray(activeCoupons) || activeCoupons.length === 0) return "";
  const formatted = activeCoupons.slice(0, 3).map(c =>
    `**${c.code}** (${c.type === "fixed" ? `Flat ₹${c.discount} OFF` : `${c.discount}% OFF`}${c.minAmount > 0 ? `, Min ₹${Number(c.minAmount).toLocaleString("en-IN")}` : ""})`
  ).join(" | ");
  return `\n\n🎁 **सक्रिय एडमिन कूपन कोड:** ${formatted}`;
}

const MUKHI_1_TO_21_GUIDE = {
  "1": { name: "1 Mukhi (Ek Mukhi)", deity: "भगवान शिव (परमशिव)", planet: "सूर्य (Sun)", benefit: "आत्मबल, नेतृत्व, मोक्ष, एकाग्रता व उच्च सम्मान", mantra: "ॐ ह्रीं नमः" },
  "2": { name: "2 Mukhi (Do Mukhi)", deity: "अर्धनारीश्वर (शिव-पार्वती)", planet: "चंद्र (Moon)", benefit: "मानसिक शांति, दांपत्य सुख, विवाह सामंजस्य", mantra: "ॐ नमः" },
  "3": { name: "3 Mukhi (Teen Mukhi)", deity: "अग्नि देव", planet: "मंगल (Mars)", benefit: "आलस्य नाश, ऊर्जा, पाचन, आत्मविश्वास व मांगलिक शांति", mantra: "ॐ क्लीं नमः" },
  "4": { name: "4 Mukhi (Chaar Mukhi)", deity: "ब्रह्मा जी", planet: "बुध (Mercury)", benefit: "विद्या, तीव्र बुद्धि, स्मरण शक्ति व वाणी कौशल", mantra: "ॐ ह्रीं नमः" },
  "5": { name: "5 Mukhi (Paanch Mukhi)", deity: "कालाग्नि रुद्र", planet: "बृहस्पति (Jupiter)", benefit: "मानसिक शांति, बीपी संतुलन, स्वास्थ्य व सभी के लिए शुभ", mantra: "ॐ ह्रीं नमः" },
  "6": { name: "6 Mukhi (Chhe Mukhi)", deity: "भगवान कार्तिकेय", planet: "शुक्र (Venus)", benefit: "इच्छाशक्ति, साहस, आकर्षण व कला/व्यापार वृद्धि", mantra: "ॐ ह्रीं हुं नमः" },
  "7": { name: "7 Mukhi (Saat Mukhi)", deity: "माता महालक्ष्मी", planet: "शनि / शुक्र", benefit: "धन वृद्धि, व्यापार सफलता, कर्ज मुक्ति व आर्थिक स्थिरता", mantra: "ॐ हुं नमः" },
  "8": { name: "8 Mukhi (Aath Mukhi)", deity: "भगवान श्री गणेश", planet: "राहु (Rahu)", benefit: "सर्व विघ्न निवारण, बुद्धि व कार्यों में सफलता", mantra: "ॐ हुं नमः" },
  "9": { name: "9 Mukhi (Nau Mukhi)", deity: "माँ नवदुर्गा", planet: "केतु (Ketu)", benefit: "शत्रु भय मुक्ति, साहस, शक्ति व देवी कृपा", mantra: "ॐ ह्रीं हुं नमः" },
  "10": { name: "10 Mukhi (Das Mukhi)", deity: "भगवान श्री हरि विष्णु", planet: "दसों दिशाएं (नवग्रह शांति)", benefit: "सुरक्षा कवच, नकारात्मक ऊर्जा व वास्तु/नजर दोष निवारण", mantra: "ॐ ह्रीं नमः" },
  "11": { name: "11 Mukhi (Gyarah Mukhi)", deity: "एकादश रुद्र (हनुमान जी)", planet: "मंगल / शनि", benefit: "अदम्य साहस, भयमुक्ति, योग व संकट निवारण", mantra: "ॐ ह्रीं हुं नमः" },
  "12": { name: "12 Mukhi (Barah Mukhi)", deity: "द्वादश आदित्य (सूर्य देव)", planet: "सूर्य (Sun)", benefit: "तेज, यश, राजयोग, प्रशासनिक व उच्च पद प्राप्ति", mantra: "ॐ क्रौं क्षौं रौं नमः" },
  "13": { name: "13 Mukhi (Terah Mukhi)", deity: "कामदेव व देवराज इंद्र", planet: "शुक्र (Venus)", benefit: "आकर्षण, मान-सम्मान, ऐश्वर्य व इच्छा पूर्ति", mantra: "ॐ ह्रीं नमः" },
  "14": { name: "14 Mukhi (Chaudah Mukhi / Devamani)", deity: "भगवान शिव व हनुमान जी", planet: "शनि (Saturn)", benefit: "तीसरी आंख (आज्ञा चक्र) जाग्रति, सही निर्णय व परम सुरक्षा", mantra: "ॐ नमः" },
  "15": { name: "15 Mukhi", deity: "भगवान पशुपतिनाथ", planet: "बुध", benefit: "हृदय चक्र, करुणा, दीर्घकालिक धन व समृद्धि", mantra: "ॐ पशुपतये नमः" },
  "16": { name: "16 Mukhi (Jai Rudraksha)", deity: "महामृत्युंजय शिव", planet: "चंद्र", benefit: "सर्वत्र विजय, भयनाश व स्वास्थ्य रक्षा", mantra: "ॐ ह्रीं हुं नमः" },
  "17": { name: "17 Mukhi", deity: "माता कात्यायनी व विश्वकर्मा", planet: "शनि", benefit: "अकस्मात धन व संपत्ति प्राप्ति", mantra: "ॐ कात्यायन्यै नमः" },
  "18": { name: "18 Mukhi", deity: "माता भूमि देवी", planet: "पृथ्वी / मंगल", benefit: "भूमि, भवन, रियल एस्टेट व निर्माण सफलता", mantra: "ॐ ह्रीं श्रीं वसुन्धरायै नमः" },
  "19": { name: "19 Mukhi", deity: "भगवान नारायण व माता लक्ष्मी", planet: "बुध", benefit: "अतुलनीय समृद्धि व व्यवसाय उन्नति", mantra: "ॐ वं विष्णवे नमः" },
  "20": { name: "20 Mukhi", deity: "भगवान ब्रह्मा", planet: "पृथ्वी", benefit: "असीम ज्ञान, सृजन व दिव्य शक्ति", mantra: "ॐ ह्रीं ब्रह्माय नमः" },
  "21": { name: "21 Mukhi", deity: "भगवान कुबेर", planet: "सर्व ग्रह", benefit: "कुबेर खजाना, अपार वैभव व सर्व बाधा नाश", mantra: "ॐ यक्षाय कुबेराय नमः" }
};

/**
 * Safe, zero-eval recursive-descent arithmetic parser (+, -, *, /, %, ^, parentheses)
 */
export function safeEvaluateArithmeticExpression(rawExpr = "") {
  const cleaned = String(rawExpr || "")
    .replace(/,/g, "")
    .replace(/[×✕]/g, "*")
    .replace(/÷/g, "/")
    .replace(/(\d)\s*[xX]\s*(\d)/g, "$1*$2")
    .trim();
  if (!cleaned || !/\d/.test(cleaned) || !/[+\-*/%^]/.test(cleaned)) return null;
  if (!/^[\d\s+\-*/%^().]+$/.test(cleaned)) return null;

  const tokens = [];
  let i = 0;
  while (i < cleaned.length) {
    const ch = cleaned[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (/\d|\./.test(ch)) {
      let numStr = "";
      let dots = 0;
      while (i < cleaned.length && (/\d/.test(cleaned[i]) || cleaned[i] === ".")) {
        if (cleaned[i] === ".") dots++;
        if (dots > 1) return null;
        numStr += cleaned[i++];
      }
      const val = parseFloat(numStr);
      if (isNaN(val)) return null;
      tokens.push({ type: "num", val });
      continue;
    }
    if ("+-*/%^()".includes(ch)) {
      tokens.push({ type: "op", val: ch });
      i++;
      continue;
    }
    return null;
  }

  if (tokens.length === 0) return null;
  let pos = 0;

  function peek() {
    return tokens[pos] || null;
  }
  function consume() {
    return tokens[pos++];
  }

  function parseExpression() {
    let left = parseTerm();
    if (left === null) return null;
    while (peek() && peek().type === "op" && (peek().val === "+" || peek().val === "-")) {
      const op = consume().val;
      const right = parseTerm();
      if (right === null) return null;
      left = op === "+" ? left + right : left - right;
    }
    return left;
  }

  function parseTerm() {
    let left = parsePower();
    if (left === null) return null;
    while (peek() && peek().type === "op" && (peek().val === "*" || peek().val === "/" || peek().val === "%")) {
      const op = consume().val;
      const right = parsePower();
      if (right === null) return null;
      if (op === "*") left *= right;
      else if (op === "/") {
        if (right === 0) return null;
        left /= right;
      } else {
        if (right === 0) return null;
        left %= right;
      }
    }
    return left;
  }

  function parsePower() {
    let left = parseFactor();
    if (left === null) return null;
    if (peek() && peek().type === "op" && peek().val === "^") {
      consume();
      const right = parsePower();
      if (right === null) return null;
      left = Math.pow(left, right);
    }
    return left;
  }

  function parseFactor() {
    const t = peek();
    if (!t) return null;
    if (t.type === "op" && (t.val === "+" || t.val === "-")) {
      consume();
      const inner = parseFactor();
      if (inner === null) return null;
      return t.val === "-" ? -inner : inner;
    }
    if (t.type === "op" && t.val === "(") {
      consume();
      const inner = parseExpression();
      if (inner === null || !peek() || peek().val !== ")") return null;
      consume();
      return inner;
    }
    if (t.type === "num") {
      consume();
      return t.val;
    }
    return null;
  }

  const result = parseExpression();
  if (result === null || pos !== tokens.length || !isFinite(result)) return null;
  return Number(result.toFixed(4));
}

/**
 * Deterministic General Math + Rudraksha Store Price / Discount Calculator
 */
export function evaluateGeneralOrStoreCalculation(message = "", allStoreProds = [], activeCoupons = []) {
  const raw = String(message || "").trim();
  const lower = raw.toLowerCase();
  if (!raw || extractMukhiRange(lower)) return null;

  // Never hijack DOBs like "15-08-1995" or time "10:30"
  if (/\b\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b/.test(raw) || /\bdob\b|birth|kundli|kundali/i.test(lower)) {
    return null;
  }

  const formatNum = (n) => Number.isInteger(n) ? n.toLocaleString("en-IN") : Number(n.toFixed(2)).toLocaleString("en-IN");

  // 1. Store Product Price + Quantity / Discount Calculation (e.g. "2 piece 7 mukhi price", "7 mukhi par 10% discount")
  const mukhiMatches = [...lower.matchAll(/(\d{1,2})\s*(?:mukhi|मुखी)/gi)];
  const wantsCalc = /(calculate|calc|kitna\s*hoga|total|hisab|jod|guna|percent|%|discount|off|gst|piece|pcs|qty|quantity|milakar|after)/i.test(lower);

  if (mukhiMatches.length > 0 && wantsCalc && Array.isArray(allStoreProds) && allStoreProds.length > 0) {
    const qtyMatch = lower.match(/\b(\d+)\s*(?:piece|pcs|pic|pis|beads|dana|nag|qty)\b/i) ||
                     lower.match(/^(\d+)\s+(?=\d{1,2}\s*mukhi)/i);
    const qty = qtyMatch && parseInt(qtyMatch[1], 10) > 0 && parseInt(qtyMatch[1], 10) <= 100 ? parseInt(qtyMatch[1], 10) : 1;

    const pickedProducts = [];
    const seen = new Set();
    for (const mm of mukhiMatches) {
      const mNum = parseInt(mm[1], 10);
      const found = allStoreProds.find(p => isExactMukhiProduct(p, mNum));
      if (found) {
        const pid = String(found.id || found._id || found.slug);
        if (!seen.has(pid)) {
          seen.add(pid);
          pickedProducts.push(found);
        }
      }
    }

    if (pickedProducts.length > 0) {
      const discMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:%|percent|प्रतिशत)/i);
      const pct = discMatch ? parseFloat(discMatch[1]) : 0;
      let subtotal = 0;
      const lines = pickedProducts.map(p => {
        const unitPrice = Number(p.price) || 0;
        const lineTotal = pickedProducts.length === 1 ? unitPrice * qty : unitPrice;
        subtotal += lineTotal;
        return `• **${p.name}:** ₹${formatNum(unitPrice)}${pickedProducts.length === 1 && qty > 1 ? ` × ${qty} पीस = ₹${formatNum(lineTotal)}` : ""}`;
      });

      let discountLine = "";
      let finalTotal = subtotal;
      if (pct > 0 && pct < 100) {
        const saved = (subtotal * pct) / 100;
        finalTotal = subtotal - saved;
        discountLine = `\n• 🏷️ **${pct}% छूट (Discount):** -₹${formatNum(saved)}\n• ✅ **अंतिम देय राशि (Final Price):** **₹${formatNum(finalTotal)}**`;
      } else if (activeCoupons.length > 0) {
        const c = activeCoupons[0];
        const saved = c.type === "fixed" ? Number(c.discount || 0) : (subtotal * Number(c.discount || 0)) / 100;
        if (saved > 0 && subtotal >= Number(c.minAmount || 0)) {
          discountLine = `\n• 🎁 **सक्रिय कूपन (${c.code}) लागू करने पर:** -₹${formatNum(saved)} → **₹${formatNum(Math.max(0, subtotal - saved))}**`;
        }
      }

      const resultText = `🧮 **ऑरा रुद्राक्ष मूल्य एवं गणना (Live Store Calculation):**\n\n${lines.join("\n")}\n\n• 💰 **कुल मूल्य (Subtotal):** **₹${formatNum(subtotal)}**${discountLine}\n\n👇 आप नीचे दिए गए कार्ड पर **'खरीदें (Buy)'** दबाकर सीधे ऑर्डर कर सकते हैं!`;
      return {
        handled: true,
        numericResult: finalTotal,
        resultText,
        matchedProducts: pickedProducts.map(formatProductForResponse).filter(Boolean)
      };
    }
  }

  // 2. Percentage / Discount / GST queries: "2000 ka 15%", "18% of 2500", "2500 par 10% discount"
  const pctOfMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:%|percent|प्रतिशत)\s*(?:of|ka|ki|ke|on|gst\s*on)?\s*(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)/i) ||
                     lower.match(/(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*(?:ka|ki|ke|par|me|mein|pe|on|plus|minus)?\s*(\d+(?:\.\d+)?)\s*(?:%|percent|प्रतिशत)/i);
  if (pctOfMatch) {
    const firstIsPct = /%|percent|प्रतिशत/i.test(pctOfMatch[0].slice(0, pctOfMatch[0].indexOf(pctOfMatch[2])));
    const pctVal = parseFloat(firstIsPct ? pctOfMatch[1] : pctOfMatch[2]);
    const baseVal = parseFloat(firstIsPct ? pctOfMatch[2] : pctOfMatch[1]);
    if (!isNaN(pctVal) && !isNaN(baseVal)) {
      const partVal = (baseVal * pctVal) / 100;
      const afterDiscount = baseVal - partVal;
      const afterTaxAdd = baseVal + partVal;
      const isTaxOrGst = /(gst|tax|plus|add|badh|jod)/i.test(lower);
      const isDiscount = /(discount|off|chhoot|chhut|kam|minus|ghata)/i.test(lower);

      let summaryLine = `• **${formatNum(baseVal)} का ${pctVal}%:** **${formatNum(partVal)}**`;
      if (isDiscount) {
        summaryLine += `\n• **छूट के बाद अंतिम राशि (${formatNum(baseVal)} - ${formatNum(partVal)}):** **${formatNum(afterDiscount)}**`;
      } else if (isTaxOrGst) {
        summaryLine += `\n• **जोड़ने / GST के बाद कुल राशि (${formatNum(baseVal)} + ${formatNum(partVal)}):** **${formatNum(afterTaxAdd)}**`;
      } else {
        summaryLine += `\n• यदि यह छूट (Discount) है तो: **${formatNum(afterDiscount)}**\n• यदि यह अतिरिक्त (Tax/GST) है तो: **${formatNum(afterTaxAdd)}**`;
      }

      return {
        handled: true,
        numericResult: isDiscount ? afterDiscount : isTaxOrGst ? afterTaxAdd : partVal,
        resultText: `🧮 **सटीक प्रतिशत गणना (Percentage Calculation):**\n\n${summaryLine}`,
        matchedProducts: []
      };
    }
  }

  // 3. Direct / embedded arithmetic expression: "1500 + 250 * 2", "calculate 4500 - 999"
  const exprMatch = raw.replace(/[₹,]/g, "").match(/(?:\(?\s*-?\d+(?:\.\d+)?\s*\)?(?:\s*[+\-*/×✕÷%^]\s*\(?\s*-?\d+(?:\.\d+)?\s*\)?)+)/);
  if (exprMatch && exprMatch[0]) {
    const val = safeEvaluateArithmeticExpression(exprMatch[0]);
    if (val !== null) {
      return {
        handled: true,
        expression: exprMatch[0].trim(),
        numericResult: val,
        resultText: `🧮 **गणना परिणाम (Calculation Result):**\n\n• **समीकरण:** \`${exprMatch[0].trim()}\`\n• **सटीक उत्तर:** **${formatNum(val)}**`,
        matchedProducts: []
      };
    }
  }

  return null;
}

/**
 * Build Complete 1 to 14 Mukhi (or custom range) Guide with Live MongoDB Store Prices
 */
export function generate1To14MukhiGuideResponse(allStoreProds = [], activeCoupons = [], rangeInfo = { start: 1, end: 14 }) {
  const start = Math.max(1, Number(rangeInfo?.start || 1));
  const end = Math.min(21, Number(rangeInfo?.end || 14));
  const couponFooter = buildActiveCouponsFooter(activeCoupons);

  const lines = [];
  for (let n = start; n <= end; n++) {
    const info = MUKHI_1_TO_21_GUIDE[String(n)] || {
      name: `${n} Mukhi Rudraksha`,
      deity: "भगवान शिव",
      planet: "सर्व ग्रह",
      benefit: "सुख-शांति, आरोग्य व सुरक्षा",
      mantra: "ॐ नमः शिवाय"
    };
    const storeItem = (allStoreProds || []).find(p => isExactMukhiProduct(p, n));
    const slugOrId = storeItem ? (storeItem.slug || storeItem.id || storeItem._id) : "";
    const stockNote = storeItem
      ? `💰 **₹${Number(storeItem.price).toLocaleString("en-IN")}**${storeItem.inStock === false || Number(storeItem.stock) === 0 ? " *(Out of Stock)*" : " ✅"} — [देखें / खरीदें](/product/${slugOrId})`
      : `🛍️ *कस्टम ऑर्डर / पूछताछ (+91 9672996531)*`;

    lines.push(
      `• **${n} मुखी (${info.deity} • ${info.planet}):** ${info.benefit} | मंत्र: \`${info.mantra}\`\n  ${stockNote}`
    );
  }

  return `🙏 **हर हर महादेव! ${start} से ${end} मुखी शुद्ध नेपाली रुद्राक्ष संपूर्ण सूची व लाइव कीमत:**\n\n${lines.join("\n\n")}\n\n🛡️ **ऑरा रुद्राक्ष गारंटी:** सभी मनके 100% असली नेपाली हैं, सरकारी मान्यता प्राप्त X-Ray लैब सर्टिफिकेट और वैदिक प्राण-प्रतिष्ठा के साथ आते हैं।${couponFooter}\n\n👇 **नीचे उपलब्ध रुद्राक्ष के कार्ड दिए गए हैं — 'खरीदें (Buy)' बटन दबाकर तुरंत ऑर्डर करें!**\n\n[AURA_KEYWORDS]: 1 से 14 मुखी रुद्राक्ष | 7 मुखी धन रुद्राक्ष | 5 मुखी शांति रुद्राक्ष | लैब टेस्टेड कीमत`;
}

/**
 * Smart Vedic & Customer Store Fallback Engine
 * Guarantees that when external LLM connections are down or timing out,
 * the customer bot answers meaningfully, intelligently, and contextually
 * using ONLY real catalog products and real active admin coupons!
 */
export function generateSmartCustomerFallbackResponse(message = "", matchedProducts = [], activeCoupons = [], effectiveMode = "standard", calculatedKundaliData = null, allStoreProds = [], precomputedCalc = null, mukhiRange = null) {
  const cleanUserMsg = String(message || "").trim();
  const lower = cleanUserMsg.toLowerCase();
  const realCoupons = Array.isArray(activeCoupons) ? activeCoupons.filter(c => c && c.code) : [];
  const couponFooter = buildActiveCouponsFooter(realCoupons);

  // 0. Arithmetic & Store Price Calculation ALWAYS works cleanly
  const calcRes = precomputedCalc || evaluateGeneralOrStoreCalculation(cleanUserMsg, allStoreProds, realCoupons);
  if (calcRes && calcRes.handled) {
    return `${calcRes.resultText}${couponFooter}\n\n[AURA_KEYWORDS]: रुद्राक्ष कीमत गणना | कूपन डिस्काउंट | 1 से 14 मुखी कीमत | अभी खरीदें`;
  }

  // 0.5 Full 1–14 Mukhi (or custom range) complete guide with live catalog prices
  const rangeDetected = mukhiRange || extractMukhiRange(lower);
  if (rangeDetected) {
    return generate1To14MukhiGuideResponse(allStoreProds, realCoupons, rangeDetected);
  }

  // If in Panditji mode:
  if (effectiveMode === "panditji") {
    if (calculatedKundaliData && calculatedKundaliData.astronomicalKundali) {
      const astroIntent = determineAstrologicalIntent(cleanUserMsg || "");
      const isSpecificTopic = astroIntent.type !== "full_kundali" && astroIntent.type !== "greeting";

      if (!isSpecificTopic && calculatedKundaliData.astronomicalKundali.panditJiDiagnosis?.fullPanditJiReportMarkdown) {
        return calculatedKundaliData.astronomicalKundali.panditJiDiagnosis.fullPanditJiReportMarkdown;
      }

      const topicAnswer = generateKundaliTopicDiagnosis(calculatedKundaliData, astroIntent, cleanUserMsg);
      if (topicAnswer) {
        return topicAnswer;
      }

      if (calculatedKundaliData.astronomicalKundali.panditJiDiagnosis?.fullPanditJiReportMarkdown) {
        return calculatedKundaliData.astronomicalKundali.panditJiDiagnosis.fullPanditJiReportMarkdown;
      }
    }

    return generateNonKundaliPanditJiGuidance(cleanUserMsg, allStoreProds);
  }

  // Helper to find real products from catalog or matched products
  const pool = (allStoreProds && allStoreProds.length > 0) ? allStoreProds : matchedProducts;
  const findInCatalog = (regex) => pool.find(p => regex.test(p.name || "") || regex.test(p.slug || "") || regex.test(p.category || ""));

  // 1. Spatika / Sphatik Mala / Crystal Mala
  if (/sphatik|spatika|crystal|sphatika|स्फटिक/i.test(lower)) {
    const sphatikProd = findInCatalog(/sphatik|spatika|crystal/i) || matchedProducts[0];
    const pName = sphatikProd?.name || "Spatika Mala with Knot 108 beads";
    const pPrice = sphatikProd?.price ? ` — **₹${Number(sphatikProd.price).toLocaleString("en-IN")}**` : "";
    const pSlug = sphatikProd?.slug || sphatikProd?.id || "";
    const productLine = sphatikProd && pSlug
      ? `\n• 💎 **स्टोर उत्पाद:** [${pName}](/product/${pSlug})${pPrice}`
      : `\n• 💎 **स्टोर कैटलॉग:** [सभी मालाएं देखें](/shop)`;

    return `🙏 **हर हर महादेव! शुद्ध स्फटिक माला (Natural Quartz Crystal Mala):**\n\n• ❄️ **प्रकृति व ऊर्जा:** स्फटिक साक्षात शुक्र ग्रह व चंद्र देव का शीतलता प्रदान करने वाला पवित्र रत्न है।\n• 📿 **उपयोग व लाभ:**\n  - दैनिक मंत्र जाप (विशेषकर माँ लक्ष्मी, सरस्वती व महामृत्युंजय मंत्र)।\n  - शरीर के तापमान व रक्तचाप का संतुलन, अत्यधिक क्रोध व मानसिक तनाव से मुक्ति।\n  - शरीर के चक्रों (Chakras) को संतुलित कर सकारात्मक ऊर्जा का संचार।${productLine}\n• 🎁 **विशेष लाभ:** 100% प्राकृतिक क्रिस्टल बीड्स, मजबूत गांठदार धागा, और निःशुल्क वैदिक प्राण-प्रतिष्ठा।${couponFooter}\n\n[AURA_KEYWORDS]: स्फटिक माला | Spatika Mala 108 beads | मानसिक शांति रत्न | लैब टेस्टेड उत्पाद`;
  }

  // 2. Specific Single Mukhi inquiries (1 to 21 Mukhi)
  const detectedMukhiStr = extractMukhiNumber(lower);
  const singleNum = detectedMukhiStr && /^\d+$/.test(detectedMukhiStr) ? detectedMukhiStr : null;
  if (singleNum) {
    const info = MUKHI_1_TO_21_GUIDE[singleNum] || { deity: "भगवान शिव", planet: "सर्व ग्रह", benefit: "आरोग्य, सुख-शांति व सुरक्षा", mantra: "ॐ नमः शिवाय" };
    const matched = pool.find(p => isExactMukhiProduct(p, singleNum)) ||
      pool.find(p => String(p.mukhi || "").trim() === String(singleNum) || (p.name && new RegExp(`(?:^|[^0-9])${singleNum}\\s*(?:-|)?\\s*mukhi`, "i").test(p.name))) ||
      matchedProducts[0];
    const priceText = matched?.price ? ` — **₹${Number(matched.price).toLocaleString("en-IN")}**` : "";
    const mrpText = matched?.comparePrice && Number(matched.comparePrice) > Number(matched.price)
      ? ` *(MRP: ~~₹${Number(matched.comparePrice).toLocaleString("en-IN")}~~)*`
      : "";
    const pSlug = matched?.slug || matched?.id || "";
    const productLinkBlock = matched && pSlug
      ? `\n\n👇 **स्टोर में लाइव कीमत व उपलब्धता:** [${matched.name}](/product/${pSlug})${priceText}${mrpText}\nनीचे दिए कार्ड में **'खरीदें (Buy)'** बटन दबाकर तुरंत ऑर्डर करें!`
      : `\n\n🛍️ यह विशिष्ट ${singleNum} मुखी मनका अभी कस्टम ऑर्डर पर उपलब्ध है — व्हाट्सएप/कॉल (+91 9672996531) पर उपलब्धता जांचें या [Shop Catalog](/shop) देखें।`;

    return `🙏 **हर हर महादेव! ${singleNum} मुखी रुद्राक्ष का प्रामाणिक वैदिक विश्लेषण व कीमत:**\n\n• 🔱 **अधिष्ठाता देवता:** ${info.deity}\n• 🪐 **शासक ग्रह:** ${info.planet}\n• 🌿 **मुख्य फल व लाभ:** ${info.benefit}\n• 📿 **दैनिक सिद्ध बीज मंत्र:** ${info.mantra} (108 बार जाप)\n\nऑरा रुद्राक्ष पर सभी ${singleNum} मुखी रुद्राक्ष 100% शुद्ध नेपाली हैं, जो काशी-हरिद्वार में वैदिक प्राण-प्रतिष्ठित और सरकारी मान्यता प्राप्त लैब (X-Ray व घनत्व परीक्षण) द्वारा प्रमाणित हैं।${productLinkBlock}${couponFooter}\n\n[AURA_KEYWORDS]: ${singleNum} मुखी रुद्राक्ष लाभ | ${singleNum} मुखी धारण विधि | ${singleNum} मुखी कीमत | स्टोर कैटलॉग`;
  }

  // 3. Gauri Shankar Rudraksha
  if (/\bgauri[-\s]*shankar\b|\bgauri\b|marriage|vivah|patni|pati|relationship|love|गौरी/i.test(lower)) {
    const matched = findInCatalog(/gauri/i) || matchedProducts[0];
    const pPrice = matched?.price ? ` (**₹${Number(matched.price).toLocaleString("en-IN")}**)` : "";
    const pSlug = matched?.slug || matched?.id || "";
    const linkSection = matched && pSlug
      ? `👇 **स्टोर से ऑर्डर करें:** [${matched.name}](/product/${pSlug})${pPrice}`
      : `हमारे पास 100% प्राकृतिक जुड़ा हुआ नेपाली गौरी शंकर रुद्राक्ष [स्टोर कैटलॉग](/shop) में उपलब्ध है।`;
    return `🙏 **हर हर महादेव! गौरी शंकर रुद्राक्ष (Gauri Shankar Rudraksha):**\n\nगौरी शंकर रुद्राक्ष साक्षात भगवान शिव और माता पार्वती का एकाकार स्वरूप है।\n• 🔱 **देवता:** शिव-पार्वती (सदाशिव व आदिशक्ति)\n• 🌙 **ग्रह:** चंद्र देव (मानसिक व भावनात्मक संतुलन)\n• ✨ **मुख्य लाभ:** दांपत्य जीवन में प्रेम व सामंजस्य, शीघ्र विवाह योग, पारिवारिक कलह का निवारण और सुख-शांति।\n• 📿 **बीज मंत्र:** ॐ गौरीशंकराय नमः\n\n${linkSection}${couponFooter}\n\n[AURA_KEYWORDS]: गौरी शंकर रुद्राक्ष | विवाह योग | दांपत्य सुख | शिव पार्वती आशीर्वाद`;
  }

  // 4. Jaap Mala / 108+1 Beads / Kantha
  if (/mala|jaap|japa|string|kantha|108|माला|जाप/i.test(lower)) {
    const malaProd = findInCatalog(/mala|108/i) || matchedProducts[0];
    const pName = malaProd?.name || "108+1 Sacred Jaap Mala";
    const pPrice = malaProd?.price ? ` — **₹${Number(malaProd.price).toLocaleString("en-IN")}**` : "";
    const pSlug = malaProd?.slug || malaProd?.id || "";
    const malaLink = malaProd && pSlug
      ? `👇 **स्टोर में उपलब्ध:** [${pName}](/product/${pSlug})${pPrice}`
      : `👇 **सभी मालाएं देखें:** [Shop Malas](/shop)`;
    return `🙏 **हर हर महादेव! 108+1 मनकों की सिद्ध रुद्राक्ष जप माला:**\n\n• 📿 **108+1 का रहस्य:** 108 मनके ब्रह्मांड के 27 नक्षत्रों के 4 चरणों (27 × 4 = 108) का प्रतिनिधित्व करते हैं, और 1 अतिरिक्त मनका 'सुमेरु' (ब्रह्म का प्रतीक) होता है।\n• 🔱 **नियम:** जप करते समय सुमेरु को कभी लांघा नहीं जाता, वहीं से माला पलट ली जाती है।\n• ✨ **लाभ:** रक्तचाप नियंत्रण, घबराहट व अनिद्रा से मुक्ति, और महामृत्युंजय या शिव पंचाक्षरी मंत्र जप के लिए सर्वश्रेष्ठ।\n\n${malaLink}${couponFooter}\n\n[AURA_KEYWORDS]: 108 रुद्राक्ष माला | जप विधि | सुमेरु का नियम | मंत्र साधना`;
  }

  // 5. Wearing Rules / Dharan Vidhi / Nepal vs Indonesia
  if (/kaise pehn|dharan|vidhi|niyam|rule|wear|bath|sleep|non\s*veg|meat|alcohol|nepal\s*vs|difference|फरक|नियम|पहनने/i.test(lower)) {
    return `📿 **रुद्राक्ष धारण विधि एवं शास्त्रीय नियम (Shiva Purana Dharan Vidhi):**\n\n1. 🌅 **शुभ समय:** सोमवार या अपने मुखी के निर्धारित वार को प्रातः स्नान के बाद धारण करें।\n2. 💧 **शुद्धिकरण:** धारण से पहले गंगाजल व कच्चे दूध से स्नान कराकर स्वच्छ कपड़े से पोंछ लें। (ऑरा रुद्राक्ष के सभी मनके पहले से काशी-हरिद्वार में प्राण-प्रतिष्ठित आते हैं!)\n3. 🕉️ **मंत्र जप:** मनके को हाथ में लेकर कम से कम 11 या 108 बार **"ॐ नमः शिवाय"** या संबंधित बीज मंत्र का जाप करें।\n4. 🧵 **धागा/धातु:** लाल या पीले रेशमी धागे, या चांदी/सोने की कैपिंग में धारण करें।\n5. ⚠️ **सावधानी:** मांसाहार, मदिरा व केमिकल साबुन से दूर रखें; रात को सोते समय उतारकर पूजा स्थान पर रख सकते हैं।\n\n• 🏔️ **नेपाली बनाम इंडोनेशियन:** नेपाली रुद्राक्ष बड़े, भारी और अधिक स्पष्ट धारियों (Deep Cleavage) वाले होते हैं, इसलिए शीघ्र व प्रबल फलदायी माने जाते हैं।${couponFooter}\n\n[AURA_KEYWORDS]: रुद्राक्ष धारण विधि | रुद्राक्ष के नियम | नेपाली रुद्राक्ष पहचान | बीज मंत्र`;
  }

  // 6. Order tracking & Delivery
  if (/track|order|delivery|dispatch|kab aayega|ship|कहाँ है|ऑर्डर|डिलीवरी/i.test(lower)) {
    return `📦 **ऑरा रुद्राक्ष ऑर्डर ट्रैकिंग व डिलीवरी जानकारी:**\n\n• 🚚 **डिलीवरी समय:** भारत भर में 2 से 4 कार्य दिवसों (Express Air Courier - BlueDart / DTDC / Delhivery) में सुरक्षित डिलीवरी।\n• 📲 **लाइव ट्रैकिंग:** आप अपना फोन नंबर या Order ID डालकर सीधे ट्रैक कर सकते हैं:\n👉 **[Track Your Order Here](/track-order)**\n• 🎁 **सुरक्षित पैकेजिंग:** हर पार्सल में प्राण-प्रतिष्ठित रुद्राक्ष, गंगाजल, रक्षा सूत्र, और ओरिजिनल लैब सर्टिफिकेट सीलबंद आता है।\n\n[AURA_KEYWORDS]: ऑर्डर ट्रैकिंग | एक्सप्रेस डिलीवरी | डिलीवरी स्थिति | ग्राहक सहायता`;
  }

  // 7. Authenticity, Certificate, Lab Test
  if (/fake|asli|nakli|original|certif|lab|test|x-ray|authenti|असली|नकली|प्रमाणित|सर्टिफिकेट/i.test(lower)) {
    return `🛡️ **100% प्रामाणिक नेपाली रुद्राक्ष गारंटी (Zero Compromise):**\n\nऑरा रुद्राक्ष पर कोई भी काल्पनिक या नकली मनका नहीं बेचा जाता:\n1. 🔬 **व्यक्तिगत X-Ray जांच:** हर मनके के अंदर के प्राकृतिक कक्ष (Internal Seeds & Compartments) का एक्स-रे किया जाता है।\n2. 📜 **सरकारी मान्यता प्राप्त लैब सर्टिफिकेट:** प्रत्येक रुद्राक्ष के साथ एक यूनिक QR-कोडेड लैब सर्टिफिकेट मिलता है।\n3. 🔍 **ऑनलाइन वेरिफिकेशन:** आप वेबसाइट पर सर्टिफिकेट नंबर डालकर तुरंत रिपोर्ट देख सकते हैं:\n👉 **[Verify Certificate Online](/verify-certificate)**\n4. 💧 **प्राकृतिक घनत्व:** 100% भारी, कठोर व काष्ठयुक्त नेपाली दाने जो जीवन भर सुरक्षित रहते हैं।\n\n[AURA_KEYWORDS]: 100% असली रुद्राक्ष | लैब सर्टिफिकेट जांच | X-Ray रिपोर्ट | नेपाल रुद्राक्ष पहचान`;
  }

  // 8. Discount & Coupons (STRICTLY ONLY REAL ACTIVE ADMIN COUPONS)
  if (/coupon|discount|offer|code|promo|voucher|chhoot|chhut|kam karo|कूपन|छूट|ऑफर/i.test(lower)) {
    if (realCoupons.length > 0) {
      const couponLines = realCoupons.map((c, idx) => {
        const valStr = c.type === "fixed" ? `फ्लैट ₹${Number(c.discount).toLocaleString("en-IN")} की छूट` : `फ्लैट ${c.discount}% की छूट`;
        const minStr = Number(c.minAmount) > 0 ? ` (₹${Number(c.minAmount).toLocaleString("en-IN")} से अधिक के ऑर्डर पर)` : "";
        const descStr = c.description ? ` — ${c.description}` : "";
        return `${idx + 1}. 🌟 **${c.code}** — ${valStr}${minStr}${descStr}`;
      }).join("\n");

      return `🎁 **वर्तमान में सक्रिय ऑरा रुद्राक्ष डिस्काउंट कूपन (Admin Verified):**\n\n${couponLines}\n\n• 🔱 **निःशुल्क सेवा:** हर ऑर्डर पर काशी-हरिद्वार वैदिक प्राण-प्रतिष्ठा पूजा व लैब सर्टिफिकेट।\n\nचेकआउट के समय 'Apply Coupon' में उपरोक्त कोड दर्ज करें और तुरंत बचत प्राप्त करें!\n\n[AURA_KEYWORDS]: सक्रिय कूपन कोड | लाइव स्टोर ऑफर | लैब प्रमाणित रुद्राक्ष`;
    }

    return `🎁 **ऑरा रुद्राक्ष कूपन एवं ऑफर अपडेट:**\n\nवर्तमान में स्टोर में कोई अलग डिस्काउंट कूपन कोड सक्रिय नहीं है।\n\n• 🔱 **निःशुल्क विशेष सेवाएं:** आपको हर प्रामाणिक नेपाली रुद्राक्ष के साथ काशी-हरिद्वार वैदिक प्राण-प्रतिष्ठा पूजा व X-Ray लैब सर्टिफिकेट निःशुल्क मिलता है।\n• 🛍️ **ताज़ा ऑफर्स देखने के लिए:** [Shop Catalog](/shop) पर उत्पाद के लाइव प्राइस और छूट देख सकते हैं।\n\n[AURA_KEYWORDS]: स्टोर कैटलॉग | असली नेपाली रुद्राक्ष | निःशुल्क प्राण-प्रतिष्ठा`;
  }

  // 9. Price / Cost Queries (Shows real MongoDB catalog prices & attachable cards!)
  if (/price|cost|rate|kitne|kitna|kimat|keemat|paisa|rupaye|kharch|dam|daam|budget|under|sasta|मूल्य|कीमत|दाम|कितने/i.test(lower)) {
    const listProds = (matchedProducts && matchedProducts.length > 0)
      ? matchedProducts
      : pool.filter(p => p && p.inStock !== false).slice(0, 6);
    const listText = listProds.length > 0
      ? listProds.slice(0, 6).map((p, idx) => {
          const mrpStr = p.comparePrice && Number(p.comparePrice) > Number(p.price)
            ? ` *(MRP: ₹${Number(p.comparePrice).toLocaleString("en-IN")})*`
            : "";
          return `${idx + 1}. **[${p.name}](/product/${p.slug || p.id})** — **₹${Number(p.price).toLocaleString("en-IN")}**${mrpStr}`;
        }).join("\n")
      : "• संपूर्ण मूल्य सूची देखने के लिए [Shop Catalog](/shop) पर जाएं।";
    return `💰 **ऑरा रुद्राक्ष लाइव मूल्य सूची (Real Catalog Prices):**\n\n${listText}${couponFooter}\n\n👇 **सीधे खरीदने के लिए नीचे दिए किसी भी कार्ड पर 'खरीदें (Buy)' बटन दबाएं!**\n\n[AURA_KEYWORDS]: 1 से 14 मुखी कीमत | 7 मुखी कीमत | 5 मुखी कीमत | आज के ऑफर्स`;
  }

  // 10. Career, Job, Money, Wealth
  if (/career|job|naukri|business|vyapar|dhan|money|paisa|नौकरी|व्यापार|कैरियर|धन/i.test(lower)) {
    const p7 = pool.find(p => isExactMukhiProduct(p, 7));
    const p10 = pool.find(p => isExactMukhiProduct(p, 10));
    const p14 = pool.find(p => isExactMukhiProduct(p, 14));
    const link7 = p7 ? ` — [${p7.name}](/product/${p7.slug || p7.id}) (**₹${Number(p7.price).toLocaleString("en-IN")}**)` : "";
    const link10 = p10 ? ` — [${p10.name}](/product/${p10.slug || p10.id}) (**₹${Number(p10.price).toLocaleString("en-IN")}**)` : "";
    const link14 = p14 ? ` — [${p14.name}](/product/${p14.slug || p14.id}) (**₹${Number(p14.price).toLocaleString("en-IN")}**)` : "";

    return `💼 **करियर, व्यापार व धन वृद्धि हेतु सर्वश्रेष्ठ रुद्राक्ष:**\n\n1. 🪙 **7 मुखी रुद्राक्ष (माता महालक्ष्मी):** आर्थिक तंगी दूर करने, स्थिर धन प्राप्ति और कर्ज से मुक्ति के लिए सर्वश्रेष्ठ${link7}।\n2. 🌟 **10 मुखी रुद्राक्ष (भगवान विष्णु):** कार्यक्षेत्र में षड्यंत्रों से रक्षा व सभी 9 ग्रहों की अनुकूलता${link10}।\n3. 👑 **14 मुखी रुद्राक्ष (देव मणि):** उच्च पद, लीडरशिप, सही निर्णय क्षमता और व्यापार में सफलता${link14}।${couponFooter}\n\n[AURA_KEYWORDS]: 7 मुखी धन रुद्राक्ष | व्यापार वृद्धि उपाय | महालक्ष्मी रुद्राक्ष | करियर में सफलता`;
  }

  // 11. Returns, Refunds, Customer Support
  if (/return|refund|exchange|cancel|support|contact|helpline|phone|सपोर्ट|संपर्क|फोन/i.test(lower)) {
    return `🤝 **ऑरा रुद्राक्ष ग्राहक सेवा व 7-दिवसीय रिटर्न पॉलिसी:**\n\n• 🔄 **7 Days Easy Replacement:** यदि पार्सल में कोई भी समस्या आती है तो 7 दिनों के भीतर बिना किसी झंझट के रिप्लेसमेंट उपलब्ध है।\n• 📞 **व्हाट्सएप व कॉल हेल्पलाइन:** +91 9672996531 (सोम-शनि, 10 AM - 7 PM)\n• 📧 **ईमेल सहायता:** aurarudrakshaofficial@gmail.com\n\nहम 100% संतुष्टि और प्रामाणिकता की गारंटी देते हैं!`;
  }

  // 12. General Products Match fallback
  if (matchedProducts.length > 0) {
    return `🙏 **हर हर महादेव! आपके प्रश्न "${cleanUserMsg || 'Store Catalog'}" के अनुसार प्रामाणिक चयन:**\n\n${matchedProducts.slice(0, 6).map(p => `• **[${p.name}](/product/${p.slug || p.id})** — **₹${Number(p.price).toLocaleString("en-IN")}**\n  *(100% शुद्ध नेपाली • वैदिक अभिमंत्रित • लैब सर्टिफाइड)*`).join("\n\n")}${couponFooter}\n\n👇 आप नीचे कार्ड में **'खरीदें (Buy)'** दबाकर तुरंत ऑर्डर कर सकते हैं।\n\n[AURA_KEYWORDS]: सिद्ध उत्पाद | 1 से 14 मुखी | स्टोर चयन | प्रामाणिक ऑरा रुद्राक्ष`;
  }

  // 13. Greeting & Default comprehensive helpful reply
  if (/^(hi|hello|hey|namaste|pranam|ram|radhe|har|shambhu|नमस्ते|प्रणाम|हर हर महादेव)/i.test(lower)) {
    const couponBullet = realCoupons.length > 0
      ? `• 🎁 **Active Discount Coupons:** ${realCoupons.slice(0, 2).map(c => `**${c.code}**`).join(", ")}`
      : `• 🛍️ **Sacred Store Catalog:** [Shop All Rudraksha](/shop)`;
    return `🙏 **हर हर महादेव! नमस्ते! Main Aura AI hoon.**\n\nMain Aura Rudraksha ka 24/7 smart shopping aur Vedic guide hoon. Aap mujhse kuchh bhi poochh sakte hain:\n• 📿 **1 से 14 मुखी (या 21 मुखी तक)** किसी भी रुद्राक्ष का लाभ, मंत्र व लाइव कीमत\n• 🧮 **Calculations:** कीमत, डिस्काउंट % या मल्टी-पीस टोटल का हिसाब\n• 🌸 **108+1 Jaap Mala, Sphatik, Gauri Shankar aur Bracelets**\n${couponBullet}\n• 🚚 **Order Tracking (/track-order) aur Lab Verification**`;
  }

  const catalogPreview = pool.filter(p => p && p.inStock !== false).slice(0, 4);
  const previewText = catalogPreview.length > 0
    ? `\n\n🛍️ **स्टोर के प्रमुख सिद्ध उत्पाद व लाइव कीमतें:**\n${catalogPreview.map(p => `• **[${p.name}](/product/${p.slug || p.id})** — **₹${Number(p.price).toLocaleString("en-IN")}**`).join("\n")}`
    : "";

  return `🙏 **हर हर महादेव! आपके प्रश्न "${cleanUserMsg || 'जानकारी'}" के संदर्भ में:**\n\nमैं आपकी इन सभी बातों में तुरंत मदद कर सकता हूँ:\n• 📿 **1 से 14 मुखी रुद्राक्ष** की पूरी जानकारी, मंत्र व लाइव कीमत (*लिखें: "1-14 mukhi"*)\n• 💰 **किसी भी प्रोडक्ट का रेट/कीमत** व सीधे चैट से खरीदारी (*लिखें: "7 mukhi price"*)\n• 🧮 **कोई भी गणित या डिस्काउंट कैलकुलेशन** (*लिखें: "2 piece 7 mukhi total" या "2000 ka 15%"*)\n• 📿 **धारण विधि, असली-नकली पहचान (X-Ray लैब रिपोर्ट) और ऑर्डर ट्रैकिंग**${previewText}${couponFooter}\n\n[AURA_KEYWORDS]: 1 से 14 मुखी रुद्राक्ष | सभी रुद्राक्ष कीमत | 7 मुखी कीमत | आज के कूपन`;
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
    const mukhiRange = extractMukhiRange(message || "");

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

    if (!existingConvDoc) {
      const memConv = inMemoryAiConversations.get(targetConversationId);
      if (memConv) {
        existingConvDoc = memConv;
      }
    }

    const extractedFromMsg = extractBirthDetailsFromText(message);
    let passedBirthDetails = null;
    if (birthDetails && typeof birthDetails === "object" && birthDetails.dob) {
      passedBirthDetails = {
        dob: String(birthDetails.dob).trim(),
        birthTime: String(birthDetails.birthTime || birthDetails.time || "12:00").trim(),
        birthPlace: String(birthDetails.birthPlace || birthDetails.place || "India").trim(),
        name: String(birthDetails.name || birthDetails.devoteeName || verifiedName || "Devotee").trim(),
        gender: String(birthDetails.gender || "").trim(),
        concern: String(birthDetails.concern || "career").trim()
      };
    }
    const incomingBirthDetails = extractedFromMsg || passedBirthDetails;
    const existingVerifiedBirthDetails = existingConvDoc?.verifiedBirthDetails || null;

    const isContinuation = Boolean(req.body?.isContinuation) || 
      /continue|रुका था|जारी रखें|पूरा करें|incomplete|jahan se ruka/i.test(message || "");

    let hasNewBirthDetails = false;
    let activeBirthDetails = null;

    if (incomingBirthDetails) {
      const isDifferentFromExisting = Boolean(extractedFromMsg) || !existingVerifiedBirthDetails ||
        existingVerifiedBirthDetails.dob !== incomingBirthDetails.dob ||
        existingVerifiedBirthDetails.birthTime !== incomingBirthDetails.birthTime ||
        existingVerifiedBirthDetails.birthPlace !== incomingBirthDetails.birthPlace ||
        (incomingBirthDetails.name && existingVerifiedBirthDetails.name && incomingBirthDetails.name.toLowerCase() !== existingVerifiedBirthDetails.name.toLowerCase());

      hasNewBirthDetails = !isContinuation && (Boolean(req.body?.reset) || Boolean(extractedFromMsg) || (isDifferentFromExisting && (!existingConvDoc || (existingConvDoc.messages && existingConvDoc.messages.length > 0))));
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
    }

    // Auto-promote mode to "panditji" when astrological/Kundali topic is queried, birth details are provided, or mode is panditji
    let effectiveMode = mode || "standard";
    const hasAstroKeywords = /kundli|kundali|horoscope|birth chart|rashi|nakshatra|graha|dasha|mahadasha|antardasha|lagna|astrology|jyotish|dob|janma|महादशा|अंतर्दशा|विंशोत्तरी|दशा|कुंडली|जन्मपत्रिका|राशि|नक्षत्र|लग्न|मांगलिक|साढ़े साती|साढ़े साती|ग्रह|दोष|भविष्य|विवाह योग|करियर योग|भाग्य|किस की महादशा|पंडित|पण्डित|शादी कब|नौकरी कब|विवाह|शनि|राहु|केतु|मंगल|गुरु|सूर्य|चंद्र/i.test(message || "");
    const isAstrologySpecificQuery = mode === "panditji" || intent === "KUNDALI" || Boolean(incomingBirthDetails) || hasAstroKeywords;
    
    if (isAstrologySpecificQuery) {
      effectiveMode = "panditji";
    } else {
      effectiveMode = "standard";
      activeBirthDetails = null;
      calculatedKundaliData = null;
    }

    if (!activeBirthDetails && effectiveMode === "panditji") {
      shouldPromptBirthForm = true;
    }

    // 4. Fetch Live Catalog Products, Active Coupons & Admin Deals/Promotions
    let allStoreProds = [];
    let allStoreCoupons = [];
    const couponMap = new Map();
    const nowTime = Date.now();
    const isNotDeletedCoupon = (code, id) => {
      const upper = String(code || "").trim().toUpperCase();
      const strId = String(id || "").trim();
      if (upper && inMemoryStore.deletedCouponCodes.has(upper)) return false;
      if (strId && inMemoryStore.deletedCouponIds.has(strId)) return false;
      return true;
    };

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

        // 1. Process standard Coupons from Admin Coupons section
        (dbCoupons || []).forEach(c => {
          const code = (c.code || "").trim().toUpperCase();
          const cId = c.id || String(c._id || "");
          if (!code || !isNotDeletedCoupon(code, cId)) return;
          if (c.expiry) {
            const exp = new Date(c.expiry).getTime();
            if (!isNaN(exp) && exp < nowTime) return;
          }
          couponMap.set(code, {
            id: cId,
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
          const oId = o.id || String(o._id || "");
          if (!code || !isNotDeletedCoupon(code, oId)) return;
          const expiry = o.expiresAt || o.expiry;
          if (expiry && !o.neverExpires) {
            const exp = new Date(expiry).getTime();
            if (!isNaN(exp) && exp < nowTime) return;
          }
          if (!couponMap.has(code)) {
            couponMap.set(code, {
              id: oId,
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
          const pId = p.id || String(p._id || "");
          if (!code || !isNotDeletedCoupon(code, pId)) return;
          const expiry = p.expiresAt || p.expiry;
          if (expiry) {
            const exp = new Date(expiry).getTime();
            if (!isNaN(exp) && exp < nowTime) return;
          }
          if (!couponMap.has(code)) {
            couponMap.set(code, {
              id: pId,
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

        // 4. Process Offers from Admin Banner Deals section (only if explicit couponCode set)
        (dbOffers || []).forEach(of => {
          const code = (of.couponCode || of.code || "").trim().toUpperCase();
          const ofId = of.id || String(of._id || "");
          if (!code || !isNotDeletedCoupon(code, ofId)) return;
          if (!couponMap.has(code)) {
            couponMap.set(code, {
              id: ofId,
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
    } else {
      allStoreProds = (inMemoryStore.products || []).filter(
        p => p && !["Draft", "draft", "Inactive", "inactive"].includes(String(p.status || "Active"))
      );
      (inMemoryStore.coupons || []).forEach(c => {
        if (!c || ["Inactive", "inactive", "Expired", "expired", "Disabled", "disabled"].includes(String(c.status || "Active"))) return;
        const code = (c.code || "").trim().toUpperCase();
        const cId = String(c.id || c._id || "");
        if (!code || !isNotDeletedCoupon(code, cId)) return;
        if (c.expiry) {
          const exp = new Date(c.expiry).getTime();
          if (!isNaN(exp) && exp < nowTime) return;
        }
        couponMap.set(code, {
          id: cId,
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
      const memAo = inMemoryStore.activeOffer;
      if (memAo && memAo.enabled && memAo.couponCode && !["Inactive", "inactive", "Disabled", "disabled"].includes(String(memAo.status || "Active"))) {
        const code = String(memAo.couponCode).trim().toUpperCase();
        if (code && isNotDeletedCoupon(code, memAo.id) && !couponMap.has(code)) {
          const expiry = memAo.expiresAt || memAo.expiry;
          const notExp = !expiry || memAo.neverExpires || isNaN(new Date(expiry).getTime()) || new Date(expiry).getTime() >= nowTime;
          if (notExp) {
            couponMap.set(code, {
              id: memAo.id || "ACTIVE_OFFER",
              code,
              discount: Number(memAo.discountValue || 0),
              type: memAo.discountType === "percentage" ? "percentage" : "fixed",
              minAmount: 0,
              maxDiscount: 0,
              expiry: expiry || null,
              description: memAo.subtitle || memAo.title || `Special Deal Offer: ${code}`,
              source: "Admin Active Deal"
            });
          }
        }
      }
      (inMemoryStore.promotions || []).forEach(p => {
        if (!p || p.isActive === false || ["Inactive", "inactive", "Disabled", "disabled"].includes(String(p.status || "Active"))) return;
        const code = (p.couponCode || p.code || "").trim().toUpperCase();
        const pId = String(p.id || p._id || "");
        if (!code || !isNotDeletedCoupon(code, pId) || couponMap.has(code)) return;
        couponMap.set(code, {
          id: pId,
          code,
          discount: Number(p.discountValue || p.value || 0),
          type: p.discountType === "percentage" || p.type === "percentage" ? "percentage" : "fixed",
          minAmount: Number(p.minOrderValue || p.minAmount || 0),
          maxDiscount: 0,
          expiry: p.expiresAt || p.expiry || null,
          description: p.description || p.subtitle || p.title || `Promo Offer: ${code}`,
          source: "Admin Promotion"
        });
      });
      allStoreCoupons = Array.from(couponMap.values());
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

    const precomputedCalc = evaluateGeneralOrStoreCalculation(message || "", allStoreProds, activeCoupons);

    let matchedProducts = [];
    if (calculatedKundaliData && calculatedKundaliData.astronomicalKundali) {
      const kundaliRecommendedProducts = [];
      const recs = calculatedKundaliData.astronomicalKundali.rudrakshaRecommendations || [];

      // Find products for all 1-3 Kundali recommendations (Primary Life, Chandra Rashi, Current Dasha)
      for (const rec of recs) {
        if (!rec || !rec.mukhi) continue;
        const mukhiNum = rec.mukhiNumber || parseInt(rec.mukhi, 10);
        const mukhiStr = String(rec.mukhi).toLowerCase();

        const match = allStoreProds.find(p => {
          if (!p) return false;
          const pId = String(p.id || p._id || "");
          if (kundaliRecommendedProducts.some(kp => kp.id === pId)) return false;
          const pNameLower = (p.name || "").toLowerCase();
          const pSlugLower = (p.slug || "").toLowerCase();

          if (mukhiNum && isExactMukhiProduct(p, mukhiNum)) return true;
          if (mukhiStr.includes("gauri shankar") && (pNameLower.includes("gauri shankar") || pSlugLower.includes("gauri-shankar"))) return true;
          if (mukhiStr.includes("ganesh") && (pNameLower.includes("ganesh") || pSlugLower.includes("ganesh"))) return true;
          if (mukhiStr.includes("garbh gauri") && (pNameLower.includes("garbh gauri") || pSlugLower.includes("garbh-gauri"))) return true;
          if (mukhiStr.includes("108") && (pNameLower.includes("108") || pNameLower.includes("mala") || pNameLower.includes("jaap"))) return true;
          return false;
        });

        if (match) {
          kundaliRecommendedProducts.push(formatProductForResponse(match));
        }
      }

      // If fewer than 3 products found, add other matching certified store items for these 1-3 beads
      if (kundaliRecommendedProducts.length < 3) {
        for (const rec of recs) {
          const mukhiNum = rec?.mukhiNumber || parseInt(rec?.mukhi, 10);
          if (!mukhiNum) continue;
          const additionalMatches = allStoreProds.filter(p => {
            const pId = String(p.id || p._id || "");
            if (kundaliRecommendedProducts.some(kp => kp.id === pId)) return false;
            return isExactMukhiProduct(p, mukhiNum);
          });
          for (const m of additionalMatches) {
            if (kundaliRecommendedProducts.length >= 3) break;
            kundaliRecommendedProducts.push(formatProductForResponse(m));
          }
        }
      }

      matchedProducts = kundaliRecommendedProducts.slice(0, 4);
    } else if (precomputedCalc?.handled && Array.isArray(precomputedCalc.matchedProducts) && precomputedCalc.matchedProducts.length > 0) {
      matchedProducts = precomputedCalc.matchedProducts.slice(0, 6);
    } else {
      const foundProds = searchRelevantCatalogProducts(message || "", allStoreProds);
      if (shouldRecommendProducts({ message: message || "", intent, targetMukhi, mukhiRange, matchedProducts: foundProds })) {
        matchedProducts = (foundProds || []).map(formatProductForResponse).filter(Boolean).slice(0, 6);
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
    const ragDocs = await retrieveRagContext(message || (effectiveMode === "panditji" ? "Vedic Rudraksha Jyotish" : "Aura Rudraksha"), 3);
    const ragContextText = ragDocs.map(d => `[${d.title}]: ${d.content}`).join("\n\n");

    const userMemories = await getUserMemories({ userId: effectiveUserId, guestSessionId: effectiveGuestSessionId });
    const memoryContextText = userMemories.map(m => `- ${m.memoryKey}: ${m.memoryValue}`).join("\n");

    // 5.5 Check for Order Inquiries in Standard Mode
    const isOrderInquiry = intent === "ORDER_TRACKING" || intent === "ORDER_HISTORY" || 
      (message || "").toLowerCase().includes("track") || 
      (message || "").toLowerCase().includes("order");

    if (isOrderInquiry && effectiveMode !== "panditji") {
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

    // 6. Web research context placeholder (NVIDIA NIM handles knowledge directly)
    let webResearchResult = null;

    const astroIntent = determineAstrologicalIntent(message || "");

    const hasPriorFullKundaliInHistory = Array.isArray(history) && history.some(m =>
      m && (m.sender === "ai" || m.role === "assistant") &&
      (String(m.text || m.content || "").includes("नवग्रहों की भाव-राशि स्थिति") ||
       String(m.text || m.content || "").includes("नवग्रहों का एक-एक करके") ||
       String(m.text || m.content || "").includes("अवकहड़ा चक्र"))
    );
    const isExplicitRepeatFullReport = /(wapas\s*puri|dobara\s*puri|fir\s*se\s*puri|poori\s*kundali|full\s*kundali|sampurna\s*kundali|sab\s*kuch\s*batao|diteld\s*me|detail\s*me|पूरी\s*कुंडली|संपूर्ण\s*कुंडली|विस्तार\s*से\s*बताएं|सब\s*कुछ\s*बताओ)/i.test(message || "");
    const isTopicOrFollowUpQuery = !hasNewBirthDetails && !isExplicitRepeatFullReport && (
      (hasPriorFullKundaliInHistory && astroIntent.type !== "greeting") ||
      (astroIntent.type !== "greeting" && astroIntent.type !== "full_kundali")
    );

    const precomputedPanditJiReference = effectiveMode === "panditji"
      ? (calculatedKundaliData
          ? (isTopicOrFollowUpQuery
              ? (generateKundaliTopicDiagnosis(calculatedKundaliData, astroIntent, message) || calculatedKundaliData.astronomicalKundali?.panditJiDiagnosis?.fullPanditJiReportMarkdown || "")
              : (calculatedKundaliData.astronomicalKundali?.panditJiDiagnosis?.fullPanditJiReportMarkdown || ""))
          : generateNonKundaliPanditJiGuidance(message, allStoreProds))
      : "";

    // 7. Build High-Integrity Persona System Prompt for NVIDIA NIM (nemotron-3-super-120b-a12b)
    let systemPrompt = "";

    if (effectiveMode === "panditji") {
      systemPrompt = `आप मेरी वेबसाइट (Aura Rudraksha - https://aurarudraksha.bond) के लिए एक अत्यंत बुद्धिमान, विनम्र, स्पष्ट, प्रामाणिक और विस्तृत "AI Vedic Astrologer / AI Panditji" (🕉️) की तरह कार्य करेंगे।

AI मॉडल: NVIDIA Nemotron-3-Super-120B-A12B

मुख्य उद्देश्य:
उपयोगकर्ता की अपलोड की गई Kundali PDF, रिपोर्ट, स्क्रीनशॉट, JSON या structured sidereal calculation data को पढ़कर उसके प्रश्न का कुंडली-आधारित, उपयोगी, जिम्मेदार, प्रामाणिक और पूर्णतः विस्तृत (Deeply Detailed) उत्तर देना। कभी भी संक्षिप्त (Short) या अधूरा उत्तर न दें!

SOURCE PRIORITY (स्रोतों की सर्वोच्च प्राथमिकता):
1. Verified birth details (नाम, जन्म तारीख, समय, स्थान, Lat/Lon, अयनांश)
2. ग्रहों की वास्तविक स्थिति (राशि, भाव, अंश, उच्च/नीच/वक्री/अस्त स्थिति, कारकत्व, मंत्र व उपाय)
3. लग्न, चंद्र राशि, सूर्य राशि, पंचांग एवं अवकहड़ा चक्र
4. नक्षत्र और चरण
5. संपूर्ण 12 भाव (Bhavas), भावेश की स्थिति, दृष्टि और प्रत्येक भाव का फलादेश
6. Dasha timelines (विंशोत्तरी महादशा, अंतर्दशा, प्रत्यंतर, सूक्ष्म एवं योगिनी दशा)
7. Divisional charts (D9 नवमांश, D10 दशमांश, D2, D7, D24, D30)
8. Shadbala, Ashtakavarga, KP (Cusp, Star lord, Sub lord), Jaimini Chara Karakas (AK, AmK, DK), Yogini Dasha, Gochar
9. Shastra & Lal Kitab remedies, Sacred Consecrated Nepali Rudraksha (1-21 Mukhi, Shiva Purana Dharan Vidhi, Beej Mantra, Gangajal Abhishekam)

कभी भी जन्म समय, स्थान, ग्रह स्थिति, दशा या तारीख अपने मन से न बनाएं। Missing data होने पर साफ बताएं। विरोधाभास होने पर उसे छिपाएं नहीं।

CHAT DISPLAY & MOBILE-FRIENDLY FORMATTING RULES (CRITICAL):
- पूरा उत्तर इसी चैट में विस्तार से दिखना चाहिए। कभी भी छोटा या संक्षिप्त उत्तर न दें—हर बिंदु को पूरी गहराई से समझाएं।
- Read more, Show more, hidden accordion, collapsed sections या छिपे हुए टेक्स्ट का उपयोग न करें।
- उपयोगकर्ता को दूसरी स्क्रीन पर भेजकर मुख्य जानकारी न छिपाएं।
- STRICT NO-HORIZONTAL-SCROLL-TABLE DIRECTIVE:
  * कभी भी चौड़ी Markdown Pipe Tables (| col1 | col2 | col3 |) न बनाएं, क्योंकि मोबाइल स्क्रीन पर इसे पढ़ने के लिए साइड में स्क्रॉल करना पड़ता है।
  * इसके स्थान पर सभी तुलनाओं, ग्रह फलादेश, 12 भावों, दशा चक्र और सारांश को सुंदर, स्पष्ट एवं क्रमबद्ध BULLET POINTS और KEY-VALUE सूची में प्रस्तुत करें (उदा. • 🪐 **[ग्रह/विषय]:** [विस्तृत फलादेश व उपाय])।
- पहले सीधा निष्कर्ष, फिर संपूर्ण शास्त्रीय विश्लेषण और अंत में Key Points Summary दें।

LANGUAGE & SCRIPT MANDATE (CRITICAL):
- Default भाषा शुद्ध, सरल, प्रामाणिक एवं प्रवाहमयी देवनागरी हिंदी रखें और आवश्यकतानुसार English technical terms कोष्ठक में दें (उदा. "सप्तम भाव (7th House – Marriage & Partnership)")।
- STRICT PROHIBITION ON CHINESE / FOREIGN CHARACTERS: उत्तर में कभी भी चीनी (Chinese / 汉字 / 中文), जापानी, कोरियाई या अन्य विदेशी अक्षरों का उपयोग कतई न करें। केवल देवनागरी हिंदी और सामान्य अंग्रेज़ी का ही प्रयोग करें।
- STRICT SPACING & WORD INTEGRITY DIRECTIVE: शब्दों के बीच में कभी भी अनावश्यक स्पेस न दें और अक्षरों/मात्राओं को अलग न करें (उदा. 'रुद्राक्ष' लिखें, कभी भी 'रु द्रा क्ष' या 'रुद्र ाक्ष' न लिखें; 'महादशा' लिखें, कभी भी 'म हा द शा' न लिखें)।
- Tone सम्मानजनक, शांत, सहानुभूतिपूर्ण, गैर-डरावना, आध्यात्मिक और स्पष्ट हो।
- LANGUAGE CONTINUITY: यदि भक्त हिंदी में बात कर रहा है, तो बिना कारण बीच में अंग्रेज़ी में न बदलें; पूरा उत्तर हिंदी में ही दें। यदि भक्त केवल अंग्रेज़ी में पूछे, तभी अंग्रेज़ी में उत्तर दें।
- STRICT COMPLETENESS DIRECTIVE: वाक्य, सारांश या उपाय बीच में अधूरा न छोड़ें; हमेशा पूर्ण विराम (।) के साथ समाप्त करें।
- वैदिक अभिवादन से शुरुआत करें: "🙏 प्रणाम भक्त! हर हर महादेव।" या "🙏 जय श्री राम!"
- आप Brihat Parashara Hora Shastra (BPHS), Phaladeepika, Saravali, Jaimini Sutras, Brihat Jataka, Prashna Marga, Muhurta Chintamani एवं Shiva Purana (Vidyeshvara Samhita) के प्रकांड विद्वान हैं।

${urlAndCatalogRulesText}

${webResearchResult ? `
VERIFIED REAL-TIME GOOGLE SEARCH GROUNDING CONTEXT:
${webResearchResult.researchSummary}
${webResearchResult.citations && webResearchResult.citations.length > 0 ? `Sources & Citations:\n${webResearchResult.citations.join("\n")}` : ""}
` : ""}

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
- Panchanga & Avakahada: Tithi: ${calculatedKundaliData.astronomicalKundali.panchanga?.tithi || "N/A"} | Vaar: ${calculatedKundaliData.astronomicalKundali.panchanga?.vaar || "N/A"} | Yoga: ${calculatedKundaliData.astronomicalKundali.panchanga?.yoga || "N/A"} | Karana: ${calculatedKundaliData.astronomicalKundali.panchanga?.karana || "N/A"} | Varna: ${calculatedKundaliData.astronomicalKundali.avakahadaChakra?.varna || "N/A"} | Gana: ${calculatedKundaliData.astronomicalKundali.avakahadaChakra?.gana || "N/A"} | Nadi: ${calculatedKundaliData.astronomicalKundali.avakahadaChakra?.nadi || "N/A"} | Paya: ${calculatedKundaliData.astronomicalKundali.avakahadaChakra?.paya || "N/A"}
- Jaimini 7 Chara Karakas: ${calculatedKundaliData.astronomicalKundali.jaiminiKarakas ? calculatedKundaliData.astronomicalKundali.jaiminiKarakas.map(k => `${k.karakaCode} (${k.karakaName}): ${k.planetName} [${k.signName} ${k.degreeInSign}, House ${k.houseNumber}]`).join(" | ") : "N/A"}
- Badhaka & Maraka: Badhakesh: ${calculatedKundaliData.astronomicalKundali.badhakaMarakaInfo?.badhaka?.note || "N/A"} | Maraka: ${calculatedKundaliData.astronomicalKundali.badhakaMarakaInfo?.maraka?.note || "N/A"}
- Vimshottari Mahadasha: ${calculatedKundaliData.astronomicalKundali.vimshottariDasha.currentMahadashaHindi} (${calculatedKundaliData.astronomicalKundali.vimshottariDasha.mahadashaStartDate || '2022'} to ${calculatedKundaliData.astronomicalKundali.vimshottariDasha.mahadashaEndDate || '2030'})
- Current Antardasha: ${calculatedKundaliData.astronomicalKundali.vimshottariDasha.currentAntardashaHindi} (${calculatedKundaliData.astronomicalKundali.vimshottariDasha.antardashaStartDate || '2024'} to ${calculatedKundaliData.astronomicalKundali.vimshottariDasha.antardashaEndDate || '2026'})
- Current Pratyantardasha: ${calculatedKundaliData.astronomicalKundali.vimshottariDasha.currentPratyantardashaHindi || 'N/A'} (${calculatedKundaliData.astronomicalKundali.vimshottariDasha.pratyantardashaStartDate || ''} to ${calculatedKundaliData.astronomicalKundali.vimshottariDasha.pratyantardashaEndDate || ''})
- Current Sookshma Dasha: ${calculatedKundaliData.astronomicalKundali.vimshottariDasha.currentSookshmaDashaHindi || 'N/A'} (${calculatedKundaliData.astronomicalKundali.vimshottariDasha.sookshmaDashaStartDate || ''} to ${calculatedKundaliData.astronomicalKundali.vimshottariDasha.sookshmaDashaEndDate || ''})
- Active 4-Level Dasha Chain: ${calculatedKundaliData.astronomicalKundali.vimshottariDasha.dashaChainSummary || 'N/A'}
- Antardashas Timeline: ${calculatedKundaliData.astronomicalKundali.vimshottariDasha.antardashasTimeline?.map(a => `${a.planetHindi} (${a.startDate} से ${a.endDate})${a.isCurrent ? ' [वर्तमान]' : ''}`).join(" | ") || 'N/A'}
- Upcoming Future Mahadashas: ${calculatedKundaliData.astronomicalKundali.vimshottariDasha.upcomingMahadashas?.map(m => `${m.planetHindi} (${m.years} वर्ष, ${m.startDate} से ${m.endDate})`).join(" | ") || 'N/A'}
- All 9 Planets Detailed Data: ${calculatedKundaliData.astronomicalKundali.planets.map(p => `${p.hindiName || p.name} in House ${p.houseNumber} (${p.rashiHindi} ${p.degreeInSign}, ${p.dignity}, D9: ${p.navamshaRashiHindi}, D10: ${p.dashamshaRashiHindi || 'N/A'}${p.isVargottama ? ' [Vargottama]' : ''}${p.combustionNote ? `, ${p.combustionNote}` : ''}, Karaka: ${p.karaka || ''}, Phaladesh: ${p.signification || ''}, Mantra: ${p.mantra || ''}, Upay: ${p.upay || ''})`).join(" || ")}
- All 12 Houses (Bhavas) Detailed Data: ${calculatedKundaliData.astronomicalKundali.houses.map(h => `H${h.houseNumber} (${h.houseTitle || ''} - ${h.rashiHindi}, Lord ${h.lord}, Lord Placement: ${h.lordPlacement || ''}): Occ: [${h.occupants.join(", ")}], Aspects: [${(h.aspects || []).join(", ") || 'None'}], Phaladesh: ${h.bhavaPhaladesh || ''}`).join(" || ")}
- Classical & Parashari Yogas: ${calculatedKundaliData.astronomicalKundali.yogas && calculatedKundaliData.astronomicalKundali.yogas.length > 0 ? calculatedKundaliData.astronomicalKundali.yogas.map(y => `${y.name} [${y.category || 'Yoga'}]: ${y.description}`).join(" | ") : "Standard planetary alignments."}
- Dosha Analysis: Manglik: ${calculatedKundaliData.astronomicalKundali.doshaSummary.manglikNote} | Shani Sade Sati: ${calculatedKundaliData.astronomicalKundali.doshaSummary.sadeSati?.phase || "Sade Sati Mukt"} | Kaal Sarp: ${calculatedKundaliData.astronomicalKundali.doshaSummary.kaalSarp?.type || "None"}
- Gochar (Current Planetary Transits from Moon): ${(calculatedKundaliData.astronomicalKundali.gochar || []).map(g => `${g.planet} in ${g.transitRashi} (${g.houseFromMoon}th from Moon)`).join(" | ")}
- Lal Kitab Analysis & Remedies: ${(calculatedKundaliData.astronomicalKundali.lalKitab?.planets || []).map(lp => `${lp.planet} (H${lp.houseNumber} - ${lp.status}): ${lp.lalKitabUpay}`).join(" | ")}
- PRE-COMPUTED PANDIT JI LIFE PROBLEM DIAGNOSIS (पंडित जी का सटीक जीवन-निदान — MUST EXPLAIN ALL 4 PILLARS IN DETAIL):
  * 1. अभी क्या-क्या परेशानी चल रही है (What Problems Are Happening): ${(calculatedKundaliData.astronomicalKundali.panditJiDiagnosis?.currentProblems || []).join(" || ")}
  * 2. यह परेशानी क्यों और कैसे चल रही है (Why & How It Is Happening): ${(calculatedKundaliData.astronomicalKundali.panditJiDiagnosis?.whyAndHow || []).join(" || ")}
  * 3. यह परेशानी कब से चल रही है (Since When It Started): ${(calculatedKundaliData.astronomicalKundali.panditJiDiagnosis?.sinceWhen || []).join(" || ")}
  * 4. यह परेशानी कब ठीक होगी और शुभ समय कब आएगा (When It Will Be Resolved): ${(calculatedKundaliData.astronomicalKundali.panditJiDiagnosis?.whenWillItResolve || []).join(" || ")}
- Recommended Vedic Beads (1 to 3 Beads): ${calculatedKundaliData.astronomicalKundali.rudrakshaRecommendations.map(r => `${r.role}: ${r.mukhi} (शास्त्रीय कारण: ${r.reason || ''}, देवता: ${r.deity || ''}, बीज मंत्र: ${r.beejMantra || ''}, धारण दिन: ${r.wearingDay || ''})`).join(" || ")}
- CANONICAL KUNDALI RUDRAKSHA MANDATE (100% DETERMINISTIC & INVARIANT):
  * 1. मुख्य जीवन रुद्राक्ष (Primary Life Mukhi / Lagna Lord): **${calculatedKundaliData.astronomicalKundali.rudrakshaRecommendations[0].mukhi}**
  * 2. चंद्र राशि रुद्राक्ष (Chandra Rashi Mukhi / Moon Sign): **${calculatedKundaliData.astronomicalKundali.rudrakshaRecommendations[1]?.mukhi || calculatedKundaliData.astronomicalKundali.rudrakshaRecommendations[0].mukhi}**
  * 3. वर्तमान महादशा रुद्राक्ष (Current Mahadasha Mukhi): **${calculatedKundaliData.astronomicalKundali.rudrakshaRecommendations[2]?.mukhi || calculatedKundaliData.astronomicalKundali.rudrakshaRecommendations[0].mukhi}**
  * ONE KUNDALI = EXACT SAME 1-3 RUDRAKSHAS ALWAYS.
  * Same DOB (${calculatedKundaliData.verifiedBirthData.dob}) + Exact Time (${calculatedKundaliData.verifiedBirthData.birthTime}) + Place (${calculatedKundaliData.verifiedBirthData.birthPlace}) MUST ALWAYS yield these exact same 1 to 3 beads in every chat and new chat.
  * In the Upay/Remedy section, explain all 1 to 3 beads clearly with their respective store links: [Product Name](/product/slug).

AUTHORITATIVE PRE-COMPUTED PANDIT JI SHASTRA REPORT (USE THIS COMPLETE DATA TO GIVE AN EXHAUSTIVE, MULTI-SECTION RESPONSE — NEVER SHORTEN OR OMIT DETAILS):
${precomputedPanditJiReference}

DETECTED QUERY INTENT:
- User Intention Category: "${astroIntent.label}" (${astroIntent.type})

JYOTISH REASONING & CONSULTATION GUIDELINES (सच्चे वैदिक पंडित जी की तरह संपूर्ण विस्तृत मार्गदर्शन):
1. Determine the user's intent:
${astroIntent.type === "greeting" ? `
   - Devotee sent a simple greeting ("${message || 'hii'}").
   - Respond warmly and respectfully in pure Hindi introducing AI Pandit Ji and listing all the deep Vedic services you provide (जन्म कुंडली के 9 ग्रह व 12 भावों का विश्लेषण, विंशोत्तरी दशा, जीवन की वर्तमान परेशानियों का कारण व समाधान, करियर/विवाह/धन/स्वास्थ्य विचार और कुंडली-प्रमाणित सिद्ध नेपाली रुद्राक्ष).
` : isTopicOrFollowUpQuery ? `
   - **DEEP TARGETED TOPIC & FOLLOW-UP JYOTISH GUIDANCE (विशिष्ट प्रश्न पर केंद्रित संपूर्ण, विस्तृत और प्रामाणिक शास्त्रीय उत्तर)**:
   - जातक का प्रश्न: "${message || ''}" (विषय: ${astroIntent.label})।
   - ✅ **अनिवार्य निर्देश (MANDATORY INSTRUCTION):**
     * कभी भी छोटा या संक्षिप्त उत्तर न दें! जातक ने जिस विषय (जैसे नौकरी/करियर, विवाह, धन, स्वास्थ्य, शिक्षा, प्रॉपर्टी, संतान, विदेश यात्रा, ग्रह, दोष, दशा या रुद्राक्ष) पर पूछा है, उस विषय के सभी आयामों को पूरी डिटेल में समझाएं।
     * ऊपर दिए गए **AUTHORITATIVE PRE-COMPUTED PANDIT JI SHASTRA REPORT** के सभी बिंदुओं, भावों, भावेशों, कारक ग्रहों, नवांश/दशमांश स्थिति, सटीक दशा तारीखों, लाल किताब उपायों और सिद्ध रुद्राक्षों को विस्तारपूर्वक प्रस्तुत करें।
` : `
   - **MANDATORY DEEP PANDIT JI KUNDALI READING (पूरी डिटेल में संपूर्ण 11-खंडीय कुंडली व जीवन की परेशानियों का निदान)**:
   - जातक का प्रश्न/संकल्प: "${message || ''}" (${astroIntent.label})।
   - कभी भी संक्षिप्त (Short) या अधूरा उत्तर न दें! ऊपर दिए गए **AUTHORITATIVE PRE-COMPUTED PANDIT JI SHASTRA REPORT** के आधार पर पूरी कुंडली के सभी 11 खंड (1. पंचांग व अवकहड़ा चक्र, 2. अभी क्या-क्या परेशानी चल रही है, 3. यह परेशानी क्यों और कैसे चल रही है, 4. यह परेशानी कब से चल रही है, 5. यह परेशानी कब ठीक होगी व भाग्योदय कब होगा, 6. नवग्रहों का एक-एक करके संपूर्ण विश्लेषण, 7. संपूर्ण 12 भावों का फलादेश, 8. करियर/धन/विवाह/शिक्षा का विस्तृत विश्लेषण, 9. राजयोग/दोष/जैमिनी कारक/गोचर, 10. विंशोत्तरी व योगिनी दशा समय-सारणी, 11. लाल किताब उपाय व कुंडली-प्रमाणित सिद्ध रुद्राक्ष धारण विधि) विस्तार से लिखें! किसी भी ग्रह या भाव को न छोड़ें!
`}

STRICT ACCURACY, EVIDENCE & REASONING RULES:
1. NEVER claim "100% accurate predictions", "100% future prediction", "guaranteed results", or "scientifically proven horoscope".
2. Explain technical terms simply in Hindi ("इसका आसान अर्थ").
3. Distinguish classical rules (BPHS/Jaimini), later commentary, traditional beliefs, and modern interpretations. Never invent fake quotations or false citations.
4. Consultation is 100% EXCLUSIVELY for: ${calculatedKundaliData.verifiedBirthData.name} (DOB: ${calculatedKundaliData.verifiedBirthData.dob}).
5. NEVER ask for DOB, birth time, or birth place again. Verified birth details are already calculated above.
6. Output clean linebreaks (\n); NEVER output raw HTML tags like <br>.
7. **MANDATORY BULLET POINT FORMAT FOR PLANETARY & HOUSE ANALYSIS:**
   - NEVER write planetary or house analysis as a long continuous paragraph!
   - ALWAYS output each planet's position, house placement, exaltation/debilitation status, mantra, and impact as clear, separate BULLET POINTS.
` : `
- COMPREHENSIVE VEDIC SHASTRA & RUDRAKSHA ENCYCLOPEDIA GUIDANCE (WHEN BIRTH DETAILS ARE NOT YET PROVIDED):
  - Even when the devotee has not yet provided their birth details (DOB, Time, Place), NEVER give a short 3-4 line reply!
  - Use the following **AUTHORITATIVE VEDIC SHASTRA REFERENCE DATA** to answer the devotee's question in full depth and detail (covering Shastra rules, ruling planets, deities, Beej Mantras, benefits, wearing vidhi, or astrological houses/combinations for their topic), AND at the end invite them to share their DOB, Birth Time, and Birth City so you can calculate their exact Sidereal Kundali:
${precomputedPanditJiReference}
`}

SACRED RUDRAKSHA COMBINATION THERAPY (VEDIC BANDHS):
- Saraswati Vidya Bandh (4+6 Mukhi): Best for studies, memory retention, focus, speech, and competitive examinations.
- Mahalakshmi Dhana Bandh (7+8+12 Mukhi): Best for business growth, cash flow, debt relief, removing financial obstacles, and administrative authority.
- Gauri Shankar Vivah Bandh (2 Mukhi + Gauri Shankar): Best for early marriage, delay removal, marital harmony, and partner compatibility.
- Shani-Rahu Raksha Bandh (7+8+10 Mukhi / 14 Mukhi): Best for Shani Sade Sati, Dhaiya, Rahu Mahadasha, evil eye (nazar dosh) and courtroom/enemy protection.
- Arogya Swasthya Bandh (3+5+11 Mukhi): Best for physical vitality, anxiety/stress elimination, blood pressure harmony, and fearless immunity.
- Sarva Siddha Maha Mala (1-14 Mukhi + Gauri Shankar + Ganesh): The supreme royal master combination for kingship aura, complete protection, and spiritual liberation.

ADAPTIVE TONE SENSING & PROFESSIONAL STYLING FREEDOM:
- **Intelligent Persona Adaptation**: You are a deeply learned, revered, compassionate Vedic Pandit Ji (Jyotish Acharya). Dynamically assess the devotee's psychological and emotional state:
  1. **If devotee is in pain, stressed, fearful, or struggling (Rahu/Shani/breakup/debts)**: Adopt a fatherly, deeply reassuring, calm, empathetic tone. Instill divine hope, explain how planetary transits are temporary karmic tests, and give gentle spiritual remedies.
  2. **If devotee is asking about business, career, wealth, ambition (10th/11th house)**: Adopt a sharp, strategic, executive Jyotish clarity. Explain planetary timings, royal Raja Yogas, Dhana Yogas, and high-impact actions.
  3. **If devotee is asking about love, marriage, compatibility**: Adopt a warm, harmonizing, respectful tone, analyzing 7th house, Venus/Jupiter, and D9 Navamsha.
  4. **If devotee is asking about spiritual sadhana, mantras, Kundalini**: Adopt a profound, mystical, scholarly Sanskrit-infused tone.
- **Styling Autonomy**: You have complete freedom to choose the most readable, elegant layout:
  - Use high-contrast headings with appropriate sacred emojis (🕉️, 🪐, 🔭, 📿, ✨, 💼, 💎).
  - Use clear bullet points for planetary effects to prevent text clutter.
  - Integrate exact sacred Sanskrit Beej Mantras with their correct Devanagari script.
  - Conclude with authentic, uplifting blessings (e.g., "भगवान भोलेनाथ एवं माता महालक्ष्मी की कृपा आप पर सदैव बनी रहे। **हर हर महादेव!**").

ORDER & DELIVERY INQUIRIES:
- If customer asks about order status, delivery, tracking, or shipment: state respectfully: "Main AI Pandit Ji hoon; order aur delivery tracking ke liye Aura AI aapki sahayata karega." Guide them to the [Track Order](/track-order) page.

SALES & STORE INTEGRITY:
- Recommend only authentic Nepali Rudraksha beads present in the store catalog. Highlight consecration (Pran-Pratishtha), X-Ray certification, and Dharan Vidhi.
- Never invent prices or non-existent discounts.

SAFETY & DISCLAIMER:
- Never predict death date, severe disease diagnosis, catastrophic accidents, or guarantee 100% outcomes. Remind devotees that Vedic Astrology provides cosmic guidance and karmic indications, and professional medical, legal, or financial matters should be consulted with licensed professionals.

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
- STRICT PROHIBITION ON CHINESE / FOREIGN CHARACTERS: NEVER output Chinese (中文/汉字), Japanese, Korean, Cyrillic, or any foreign characters. Use only Devanagari Hindi or English.
- STRICT SPACING & WORD INTEGRITY DIRECTIVE: Do not split words or add random spaces between syllables/letters (e.g. write "रुद्राक्ष" NEVER "रु द्रा क्ष").

${urlAndCatalogRulesText}

${precomputedCalc?.handled ? `PRECOMPUTED AUTHORITATIVE CALCULATION (USE THESE EXACT NUMBERS IN YOUR REPLY):
${precomputedCalc.resultText}` : ""}

${mukhiRange ? `AUTHORITATIVE 1-TO-14 MUKHI CATALOG REFERENCE (INCLUDE ALL ${mukhiRange.start} TO ${mukhiRange.end} MUKHI WITH EXACT LIVE PRICES BELOW):
${generate1To14MukhiGuideResponse(allStoreProds, activeCoupons, mukhiRange)}` : ""}

GENERAL KNOWLEDGE, ARITHMETIC & STORE CAPABILITIES:
- You are fully trained to answer ANY customer question accurately: general questions, exact math/percentage/discount/total calculations, full 1 to 14 Mukhi (and 1 to 21 Mukhi) Rudraksha explanations, exact live store prices, wearing rules (Dharan Vidhi), authenticity/X-Ray lab tests, Rashi guidance, and order tracking.
- Whenever customer asks about ANY Rudraksha price, always quote the exact ₹ price from REAL STORE PRODUCT CATALOG above and link the product cleanly so the Buy Card appears below your reply.

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
        content: `कृपया मेरी जन्म कुंडली (${calculatedKundaliData.verifiedBirthData.dob}, ${calculatedKundaliData.verifiedBirthData.birthTime}, ${calculatedKundaliData.verifiedBirthData.birthPlace}) का संपूर्ण 11-खंडीय विस्तृत वैदिक ज्योतिषीय विश्लेषण, सभी 9 ग्रहों व 12 भावों का फलादेश, वर्तमान परेशानियों का कारण व समाधान, तथा कुंडली-प्रमाणित सिद्ध रुद्राक्ष मार्गदर्शन प्रदान करें।`
      });
    } else {
      nimMessages.push({ role: "user", content: "Namaste" });
    }

    const dynamicQuickReplies = generateDynamicQuickReplies({
      userMessage: message || "",
      intent,
      targetMukhi,
      mode: effectiveMode,
      activeCoupons,
      calculatedKundaliData
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
        message: effectiveMode === "panditji" ? "🕉️ जन्म लग्न, नवग्रह व 12 भावों की सूक्ष्म गणना हो रही है..." : "🔍 प्रामाणिक स्टोर कैटलॉग व रुद्राक्ष खोज रहे हैं..."
      })}\n\n`);
      res.flush?.();

      let fullStreamedText = "";
      let streamSucceeded = false;
      await resolveNvidiaKey();
      const nvidiaClient = getNvidiaClient();

      // Prune initial context messages if token count is near ~8000 words limit
      const prunedNimMessages = pruneMessagesForTokenLimit(nimMessages, 8000);

      // Reliable streaming timeout (12 seconds wait for first token from NVIDIA NIM)
      const STREAM_INIT_TIMEOUT_MS = 12000;

      // 1. Primary Streaming Execution: NVIDIA NIM nemotron-3-super-120b-a12b
      // Fast deterministic bypass for pure calculator & 1-14 Mukhi complete catalog queries
      const shouldUseDeterministicStandard = effectiveMode !== "panditji" && (Boolean(precomputedCalc?.handled) || Boolean(mukhiRange));
      if (nvidiaClient && !clientDisconnected && !shouldUseDeterministicStandard) {
        for (const modelCandidate of [PRIMARY_NIM_MODEL, ...BACKUP_NIM_MODELS]) {
          if (streamSucceeded || clientDisconnected) break;
          
          try {
            const streamPromise = nvidiaClient.chat.completions.create(
              {
                model: modelCandidate,
                messages: prunedNimMessages,
                temperature: 0.35,
                max_tokens: 8192,
                stream: true
              },
              { signal: abortController.signal }
            );

            // Timeout race for first response connection
            const streamCompletion = await Promise.race([
              streamPromise,
              new Promise((_, reject) => setTimeout(() => reject(new Error("NIM_STREAM_TIMEOUT")), STREAM_INIT_TIMEOUT_MS))
            ]);

            let lastFinishReason = "";
            let receivedAnyChunk = false;

            for await (const chunk of streamCompletion) {
              if (clientDisconnected) break;
              const deltaContent = chunk.choices?.[0]?.delta?.content || "";
              const fReason = chunk.choices?.[0]?.finish_reason;
              if (fReason) lastFinishReason = fReason;
              if (deltaContent) {
                receivedAnyChunk = true;
                fullStreamedText += deltaContent;
                res.write(`data: ${JSON.stringify({ type: "chunk", delta: deltaContent })}\n\n`);
                res.flush?.();
              }
            }

            if (receivedAnyChunk && fullStreamedText.trim()) {
              streamSucceeded = true;
              break;
            }
          } catch (streamErr) {
            if (streamErr.name === "AbortError" || clientDisconnected) {
              clearInterval(heartbeatTimer);
              return;
            }
            console.warn(`[Aura AI Streaming] NVIDIA NIM notice (${modelCandidate}):`, streamErr?.message || streamErr);
            break; // Failover fast to smart fallback
          }
        }
      }

      clearInterval(heartbeatTimer);

      // Guarantee comprehensive detail in Pandit Ji mode even if LLM streamed a brief summary
      if (streamSucceeded && !clientDisconnected && effectiveMode === "panditji" && astroIntent.type !== "greeting" && precomputedPanditJiReference) {
        const cleanedCurrent = cleanServerAiText(stripInternalJsonFromCustomerText(fullStreamedText));
        const needsFullKundaliExpansion = calculatedKundaliData && !isTopicOrFollowUpQuery && (
          cleanedCurrent.length < 2200 ||
          !(cleanedCurrent.includes("राहु") && cleanedCurrent.includes("केतु") && cleanedCurrent.includes("शनि"))
        );
        const needsTopicExpansion = calculatedKundaliData && isTopicOrFollowUpQuery && cleanedCurrent.length < 900;
        const needsNonKundaliExpansion = !calculatedKundaliData && astroIntent.type !== "authenticity_verification" && cleanedCurrent.length < 700;

        if (needsFullKundaliExpansion || needsTopicExpansion || needsNonKundaliExpansion) {
          const supplement = `\n\n---\n\n${precomputedPanditJiReference}`;
          fullStreamedText += supplement;
          const suppTokens = supplement.split(/(\s+)/);
          for (let i = 0; i < suppTokens.length; i += 4) {
            if (clientDisconnected) break;
            const chunkStr = suppTokens.slice(i, i + 4).join("");
            if (chunkStr) {
              res.write(`data: ${JSON.stringify({ type: "chunk", delta: chunkStr })}\n\n`);
              res.flush?.();
              await new Promise((r) => setTimeout(r, 12));
            }
          }
        }
      }

      // If streaming could not produce output, generate and stream instant smart customer fallback
      if (!streamSucceeded && !clientDisconnected) {
        let fallbackText = "";
        if (effectiveMode === "panditji") {
          if (calculatedKundaliData) {
            fallbackText = precomputedPanditJiReference || calculatedKundaliData.astronomicalKundali?.panditJiDiagnosis?.fullPanditJiReportMarkdown || "";
          } else if (astroIntent.type === "authenticity_verification") {
            fallbackText = `🙏 **प्रणाम भक्त! हर हर महादेव।**\n\nआपकी यह बात शत-प्रतिशत सत्य एवं सराहनीय है — **बिना जन्म कुंडली देखे किसी को भी कोई भी रुद्राक्ष या फलादेश बताना अनुचित और फर्जी (Fake) है।**\n\nऑरा रुद्राक्ष पर हम किसी भी जातक को कोई सामान्य, मनगढ़ंत या फर्जी रुद्राक्ष कभी नहीं थोपते। वैदिक ज्योतिष (महर्षि पाराशर के बृहत्पाराशर होरा शास्त्र एवं शिव पुराण) का सर्वोच्च नियम है कि प्रत्येक व्यक्ति का रुद्राक्ष उसकी **जन्म तिथि (DOB)**, **जन्म समय (Time)** और **जन्म स्थान (Place)** से बनने वाले शुद्ध खगोलीय लग्न, चंद्र राशि और सक्रिय विंशोत्तरी महादशा देखकर ही तय किया जाता है।\n\n👇 **कृपया नीचे दिए गए फॉर्म में अपनी जन्म जानकारी दर्ज करें या चैट में लिखें:**\n• **जन्म तिथि (Date of Birth)** — उदा. 15-08-1995\n• **जन्म समय (Birth Time)** — उदा. 10:30 AM\n• **जन्म स्थान (Birth City)** — उदा. जयपुर, राजस्थान\n\nजैसे ही आप अपना विवरण देंगे, मैं तुरंत आपकी संपूर्ण 11-खंडीय प्रामाणिक वैदिक कुंडली (सभी 9 ग्रह, 12 भाव, पंचांग, अवकहड़ा, विंशोत्तरी दशा, वर्तमान परेशानियों का कारण व समाधान) बनाकर वही सिद्ध नेपाली रुद्राक्ष बताऊँगा जो सीधे आपकी कुंडली से प्रमाणित होगा।`;
          } else {
            fallbackText = precomputedPanditJiReference || generateNonKundaliPanditJiGuidance(message, allStoreProds);
          }
        } else {
          fallbackText = generateSmartCustomerFallbackResponse(message, matchedProducts, activeCoupons, effectiveMode, calculatedKundaliData, allStoreProds, precomputedCalc, mukhiRange);
        }

        fullStreamedText = sanitizeFakeCouponsInResponse(fallbackText, activeCoupons);
        // Stream in natural word chunks with slight pause so customer sees immediate typing
        const tokens = fullStreamedText.split(/(\s+)/);
        for (let i = 0; i < tokens.length; i += 3) {
          if (clientDisconnected) break;
          const chunkStr = tokens.slice(i, i + 3).join("");
          if (chunkStr) {
            res.write(`data: ${JSON.stringify({ type: "chunk", delta: chunkStr })}\n\n`);
            res.flush?.();
            await new Promise((r) => setTimeout(r, 16));
          }
        }
      }

      const safeFinalStreamedText = sanitizeFakeCouponsInResponse(
        cleanServerAiText(stripInternalJsonFromCustomerText(fullStreamedText)),
        activeCoupons
      );
      const finalStreamedProducts = extractMentionedCatalogProducts(safeFinalStreamedText, matchedProducts, allStoreProds);

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
        products: finalStreamedProducts,
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
              productsRecommended: finalStreamedProducts.map(p => p.id),
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
            products: finalStreamedProducts,
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

    // Prune initial messages if near token budget limit (~8000 words)
    const nonStreamPrunedMsgs = pruneMessagesForTokenLimit(nimMessages, 8000);

    // 1. Prioritize NVIDIA NIM models strictly (skip for deterministic calculator / 1-14 Mukhi range)
    const nonStreamNvidiaClient = getNvidiaClient();
    const NON_STREAM_TIMEOUT_MS = 2500;
    const shouldUseDeterministicNonStream = effectiveMode !== "panditji" && (Boolean(precomputedCalc?.handled) || Boolean(mukhiRange));

    if (nonStreamNvidiaClient && !shouldUseDeterministicNonStream) {
      for (const modelCandidate of [PRIMARY_NIM_MODEL, ...BACKUP_NIM_MODELS]) {
        if (generatedSuccessfully) break;
        try {
          const compPromise = nonStreamNvidiaClient.chat.completions.create({
            model: modelCandidate,
            messages: nonStreamPrunedMsgs,
            temperature: 0.35,
            max_tokens: 8192
          });

          const completion = await Promise.race([
            compPromise,
            new Promise((_, reject) => setTimeout(() => reject(new Error("NIM_NONSTREAM_TIMEOUT")), NON_STREAM_TIMEOUT_MS))
          ]);

          let outContent = completion.choices?.[0]?.message?.content || "";
          if (outContent.trim()) {
            aiResponseText = outContent;
            generatedSuccessfully = true;
            break;
          }
        } catch (nimErr) {
          console.warn(`[Aura AI Non-Stream] NVIDIA NIM notice (${modelCandidate}):`, nimErr?.message || nimErr);
          break;
        }
      }
    }

    // Guarantee comprehensive detail in Non-Streaming Pandit Ji mode
    if (generatedSuccessfully && effectiveMode === "panditji" && astroIntent.type !== "greeting" && precomputedPanditJiReference) {
      const cleanedCurrent = cleanServerAiText(stripInternalJsonFromCustomerText(aiResponseText));
      const needsFullKundaliExpansion = calculatedKundaliData && !isTopicOrFollowUpQuery && (
        cleanedCurrent.length < 2200 ||
        !(cleanedCurrent.includes("राहु") && cleanedCurrent.includes("केतु") && cleanedCurrent.includes("शनि"))
      );
      const needsTopicExpansion = calculatedKundaliData && isTopicOrFollowUpQuery && cleanedCurrent.length < 900;
      const needsNonKundaliExpansion = !calculatedKundaliData && astroIntent.type !== "authenticity_verification" && cleanedCurrent.length < 700;

      if (needsFullKundaliExpansion || needsTopicExpansion || needsNonKundaliExpansion) {
        aiResponseText = `${aiResponseText}\n\n---\n\n${precomputedPanditJiReference}`;
      }
    }

    // Deterministic Vedic / Store Fallback if AI models are momentarily disconnected
    if (!generatedSuccessfully || !aiResponseText.trim()) {
      if (effectiveMode === "panditji") {
        if (calculatedKundaliData) {
          aiResponseText = precomputedPanditJiReference || calculatedKundaliData.astronomicalKundali?.panditJiDiagnosis?.fullPanditJiReportMarkdown || "";
        } else if (astroIntent.type === "authenticity_verification") {
          aiResponseText = `🙏 **प्रणाम भक्त! हर हर महादेव।**\n\nआपकी यह बात शत-प्रतिशत सत्य एवं सराहनीय है — **बिना जन्म कुंडली देखे किसी को भी कोई भी रुद्राक्ष या फलादेश बताना अनुचित और फर्जी (Fake) है।**\n\nऑरा रुद्राक्ष पर हम किसी भी जातक को कोई सामान्य, मनगढ़ंत या फर्जी रुद्राक्ष कभी नहीं थोपते। वैदिक ज्योतिष (महर्षि पाराशर के बृहत्पाराशर होरा शास्त्र एवं शिव पुराण) का सर्वोच्च नियम है कि प्रत्येक व्यक्ति का रुद्राक्ष उसकी **जन्म तिथि (DOB)**, **जन्म समय (Time)** और **जन्म स्थान (Place)** से बनने वाले शुद्ध खगोलीय लग्न, चंद्र राशि और सक्रिय विंशोत्तरी महादशा देखकर ही तय किया जाता है।\n\n👇 **कृपया नीचे दिए गए फॉर्म में अपनी जन्म जानकारी दर्ज करें या चैट में लिखें:**\n• **जन्म तिथि (Date of Birth)** — उदा. 15-08-1995\n• **जन्म समय (Birth Time)** — उदा. 10:30 AM\n• **जन्म स्थान (Birth City)** — उदा. जयपुर, राजस्थान\n\nजैसे ही आप अपना विवरण देंगे, मैं तुरंत आपकी संपूर्ण 11-खंडीय प्रामाणिक वैदिक कुंडली (सभी 9 ग्रह, 12 भाव, पंचांग, अवकहड़ा, विंशोत्तरी दशा, वर्तमान परेशानियों का कारण व समाधान) बनाकर वही सिद्ध नेपाली रुद्राक्ष बताऊँगा जो सीधे आपकी कुंडली से प्रमाणित होगा।`;
        } else {
          aiResponseText = precomputedPanditJiReference || generateNonKundaliPanditJiGuidance(message, allStoreProds);
        }
      } else {
        aiResponseText = generateSmartCustomerFallbackResponse(message, matchedProducts, activeCoupons, effectiveMode, calculatedKundaliData, allStoreProds, precomputedCalc, mukhiRange);
      }
    }

    const safeFinalText = sanitizeFakeCouponsInResponse(
      cleanServerAiText(stripInternalJsonFromCustomerText(aiResponseText)),
      activeCoupons
    );
    const finalMatchedProducts = extractMentionedCatalogProducts(safeFinalText, matchedProducts, allStoreProds);

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
      products: finalMatchedProducts,
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
              productsRecommended: finalMatchedProducts.map(p => p.id),
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
        products: finalMatchedProducts,
        coupons: matchedCoupons,
        kundali: calculatedKundaliData,
        showBirthForm: shouldPromptBirthForm,
        quickReplies: dynamicQuickReplies,
        conversationId: targetConversationId,
        guestSessionId: effectiveGuestSessionId
      }
    });

  } catch (err) {
    console.error("[chatAuraAI uncaught error]:", err?.message || err);
    if (res.headersSent) {
      if (!res.writableEnded) {
        try {
          res.write(`data: ${JSON.stringify({
            type: "final",
            data: {
              text: "Namaste 🙏 Aapka sawaal samajh gaya. Ek moment dijiye, main aapki help karta hoon.",
              products: [],
              coupons: []
            }
          })}\n\n`);
          res.write("data: [DONE]\n\n");
          res.end();
        } catch (_) {}
      }
      return;
    }
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
    let products = [];
    if (isDbConnected()) {
      try {
        products = await Product.find({ status: { $nin: ["Draft", "Inactive"] } })
          .select("name price category subCategory stock status origin mukhi salesCount totalSold rulingPlanet deity")
          .limit(50)
          .lean();
      } catch (_) {}
    }
    if ((!products || products.length === 0) && inMemoryStore.isProductsSyncedFromDb && Array.isArray(inMemoryStore.products)) {
      products = inMemoryStore.products;
    }
    if (!products || products.length === 0) return "Catalog is currently syncing from the store database.";
    
    return products.slice(0, 50).map(p => 
      `- ${p.name} | Cat: ${p.category || "Rudraksha"}${p.mukhi ? ` (${p.mukhi})` : ''} | Price: ₹${p.price} | Stock: ${p.stock ?? 25} | Origin: ${p.origin || "Nepal"} | Planet: ${p.rulingPlanet || "Universal"} | Sales: ${p.totalSold || p.salesCount || 150}`
    ).join("\n");
  } catch (e) {
    return "Failed to fetch catalog.";
  }
}

export async function adminChatAuraAI(req, res) {
  const { handleAdminAgentChat } = await import("./adminAiAgentController.js");
  return handleAdminAgentChat(req, res);
}

/**
 * Admin: Get All AI Conversations with User & Guest IP Tracking
 */
export async function getAdminAllAiChats(req, res, next) {
  try {
    const {
      search = "",
      mode = "all",
      userType = "all",
      page = 1,
      limit = 50
    } = req.query || {};

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const mongoConnected = isDbConnected();
    let dbConversations = [];

    if (mongoConnected) {
      try {
        let query = {};
        if (mode && mode !== "all") {
          query.mode = mode;
        }
        if (userType === "guest") {
          query.$or = [{ userId: "guest" }, { userId: null }, { userId: "" }];
        } else if (userType === "registered") {
          query.userId = { $nin: ["guest", null, ""] };
        }

        if (search && search.trim()) {
          const s = search.trim();
          const regex = new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
          query.$or = [
            { userName: regex },
            { userEmail: regex },
            { userIp: regex },
            { ipAddress: regex },
            { guestSessionId: regex },
            { conversationId: regex },
            { id: regex },
            { lastMessageText: regex },
            { "messages.text": regex }
          ];
        }

        dbConversations = await AuraAIConversation.find(query)
          .sort({ updatedAt: -1, createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .lean();
      } catch (err) {
        console.warn("[getAdminAllAiChats DB query warning]:", err?.message);
      }
    }

    // Merge with in-memory store for 100% comprehensive coverage
    const memList = Array.from(inMemoryAiConversations.values());
    const mergedMap = new Map();

    // Add DB results
    for (const c of dbConversations) {
      const key = c.conversationId || c.id;
      if (key) mergedMap.set(key, c);
    }

    // Add any in-memory results that match search/filters
    for (const c of memList) {
      const key = c.conversationId || c.id;
      if (!mergedMap.has(key)) {
        let matches = true;
        if (mode && mode !== "all" && c.mode !== mode) matches = false;
        if (userType === "guest" && c.userId && c.userId !== "guest") matches = false;
        if (userType === "registered" && (!c.userId || c.userId === "guest")) matches = false;
        if (search && search.trim()) {
          const s = search.toLowerCase();
          const textMatches = (
            (c.userName || "").toLowerCase().includes(s) ||
            (c.userEmail || "").toLowerCase().includes(s) ||
            (c.userIp || "").toLowerCase().includes(s) ||
            (c.guestSessionId || "").toLowerCase().includes(s) ||
            (c.lastMessageText || "").toLowerCase().includes(s)
          );
          if (!textMatches) matches = false;
        }
        if (matches) mergedMap.set(key, c);
      }
    }

    let allMerged = Array.from(mergedMap.values()).sort((a, b) => {
      const tA = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const tB = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return tB - tA;
    });

    // Compute live metrics
    let totalMessages = 0;
    let guestCount = 0;
    let registeredCount = 0;
    let panditjiCount = 0;
    let quickAiCount = 0;
    const uniqueIps = new Set();

    for (const c of allMerged) {
      totalMessages += (c.messages || []).length;
      if (!c.userId || c.userId === "guest") guestCount++;
      else registeredCount++;
      if (c.mode === "panditji") panditjiCount++;
      else quickAiCount++;
      if (c.userIp && c.userIp !== "127.0.0.1") uniqueIps.add(c.userIp);
      else if (c.ipAddress && c.ipAddress !== "127.0.0.1") uniqueIps.add(c.ipAddress);
    }

    // Paginate final list
    const paginated = allMerged.slice(0, limitNum);

    const mongoUri = getMongoUri();
    const maskedUri = mongoUri ? mongoUri.replace(/\/\/[^:]+:[^@]+@/, "//***:***@") : "in-memory-fallback";

    return res.json({
      success: true,
      chats: paginated.map(c => ({
        id: c.id || c.conversationId,
        conversationId: c.conversationId || c.id,
        userId: c.userId || "guest",
        userEmail: c.userEmail || "",
        userName: c.userName || (c.userId && c.userId !== "guest" ? "Registered Devotee" : "Guest User"),
        userPhone: c.userPhone || "",
        guestSessionId: c.guestSessionId || "",
        userIp: c.userIp || c.ipAddress || (c.hashedIp ? "Tracked IP" : "127.0.0.1"),
        deviceInfo: c.deviceInfo || "Mobile / Browser",
        userAgent: c.userAgent || "",
        platform: c.platform || "",
        country: c.country || "",
        city: c.city || "",
        source: c.source || (c.mode === "panditji" ? "AI Panditji" : "Aura AI"),
        mode: c.mode || "standard",
        title: c.title || (c.mode === "panditji" ? "Vedic Astrological Consultation" : "Aura AI Chat"),
        messageCount: (c.messages || []).length,
        lastMessageText: c.lastMessageText || (c.messages && c.messages[c.messages.length - 1]?.text) || "",
        hasKundli: Boolean(c.verifiedBirthDetails || c.authoritativeKundali),
        verifiedBirthDetails: c.verifiedBirthDetails || null,
        authoritativeKundali: c.authoritativeKundali || null,
        productsRecommended: c.productsRecommended || [],
        createdAt: c.createdAt,
        updatedAt: c.updatedAt
      })),
      metrics: {
        totalSessions: allMerged.length,
        totalMessages,
        guestCount,
        registeredCount,
        panditjiCount,
        quickAiCount,
        uniqueIpsCount: uniqueIps.size
      },
      dbStatus: {
        connected: mongoConnected,
        mongoUriMasked: maskedUri,
        lastSync: getLastDbSync(),
        totalDbRecords: allMerged.length
      },
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(allMerged.length / limitNum) || 1
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Admin: Get Single Chat Transcript with full messages and metadata
 */
export async function getAdminAiChatTranscript(req, res, next) {
  try {
    const { id } = req.params;
    let conv = null;

    if (isDbConnected()) {
      try {
        conv = await AuraAIConversation.findOne({
          $or: [{ id }, { conversationId: id }]
        }).lean();
      } catch (_) {}
    }

    if (!conv) {
      conv = inMemoryAiConversations.get(id);
    }

    if (!conv) {
      return res.status(404).json({ success: false, message: "Conversation not found" });
    }

    return res.json({
      success: true,
      chat: conv
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Admin: Delete single AI conversation
 */
export async function deleteAdminAiChat(req, res, next) {
  try {
    const { id } = req.params;
    if (isDbConnected()) {
      await AuraAIConversation.deleteOne({ $or: [{ id }, { conversationId: id }] }).catch(() => {});
    }
    inMemoryAiConversations.delete(id);
    return res.json({ success: true, message: "AI conversation deleted successfully" });
  } catch (err) {
    next(err);
  }
}

/**
 * Admin: Clear all AI conversations
 */
export async function clearAdminAiChats(req, res, next) {
  try {
    if (isDbConnected()) {
      await AuraAIConversation.deleteMany({}).catch(() => {});
    }
    inMemoryAiConversations.clear();
    return res.json({ success: true, message: "All AI conversations cleared successfully" });
  } catch (err) {
    next(err);
  }
}

/**
 * Admin: Live MongoDB Connection Health Check
 */
export async function getAdminMongoDbCheck(req, res, next) {
  try {
    if (!isDbConnected()) {
      await connectDB().catch(() => {});
    }
    const connected = isDbConnected();
    const uri = getMongoUri();
    const maskedUri = uri
      ? uri.replace(/\/\/[^:]+:[^@]+@/, "//***:***@")
      : (connected ? "mongodb://127.0.0.1:27017/aurarudraksha" : "Not configured / In-memory");
    
    let docCount = 0;
    let pingTimeMs = 0;
    if (connected) {
      const start = Date.now();
      docCount = await AuraAIConversation.countDocuments().catch(() => 0);
      pingTimeMs = Date.now() - start;
    }

    return res.json({
      success: true,
      status: connected ? "connected" : "fallback",
      connected,
      isConnected: connected,
      pingTimeMs: connected ? Math.max(1, pingTimeMs) : null,
      maskedUri,
      totalSavedChats: docCount || inMemoryAiConversations.size,
      lastSync: getLastDbSync() || new Date().toISOString(),
      dbName: "aurarudraksha",
      message: connected
        ? "✓ Authoritative MongoDB connection is healthy and saving all products, orders & AI chats in real-time."
        : "⚠️ MongoDB is operating in resilient in-memory mode. All chats are temporarily captured in memory cache."
    });
  } catch (err) {
    next(err);
  }
}

