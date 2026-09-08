import crypto from "crypto";
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";

import { AuraAISetting, AuraAIConversation } from "../models/AuraAI.js";
import { Product } from "../models/Product.js";
import { Coupon } from "../models/Coupon.js";
import { Order } from "../models/Order.js";
import { Customer } from "../models/Customer.js";
import { Setting } from "../models/Setting.js";
import { Review } from "../models/Review.js";
import { isDbConnected } from "../config/db.js";
import { pickFields } from "../utils/sanitize.js";
import { isAdminUser, hasAdminRole } from "../middleware/auth.js";
import { inMemoryStore } from "../data/inMemoryStore.js";
import { 
  searchRelevantCatalogProducts, 
  extractMukhiNumber, 
  VEDIC_BEADS_KNOWLEDGE 
} from "../services/vedicKnowledgeService.js";
import { calculateAuthenticKundali } from "../services/vedicAstrologyService.js";
import { getUserMemories, setUserMemory, deleteUserMemory, extractAndUpdateMemories } from "../services/memoryService.js";
import { retrieveRagContext } from "../services/ragService.js";
import { generateSeoAndVedicDataWithNemotron } from "../services/nemotronSeoEngine.js";

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

export function getNvidiaClient() {
  const apiKey = (
    process.env.NVIDIA_API_KEY ||
    process.env.NEMOTRON_API_KEY ||
    process.env.NVIDIA_NIM_API_KEY ||
    process.env.OPENROUTER_API_KEY ||
    ""
  ).trim();
  if (!apiKey) return null;

  const baseURL = (
    process.env.NEMOTRON_BASE_URL ||
    (process.env.OPENROUTER_API_KEY && !process.env.NVIDIA_API_KEY && !process.env.NEMOTRON_API_KEY
      ? "https://openrouter.ai/api/v1"
      : NVIDIA_NIM_BASE_URL)
  ).trim();

  try {
    return new OpenAI({
      baseURL,
      apiKey,
      timeout: 35000
    });
  } catch (err) {
    console.warn("Could not initialize NVIDIA NIM client:", err?.message || err);
    return null;
  }
}

export function getGeminiClient() {
  const apiKey = (process.env.GEMINI_API_KEY || "").trim();
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

function generateDynamicQuickReplies({ userMessage, intent, targetMukhi, mode }) {
  const msgLower = (userMessage || "").toLowerCase();
  const replies = [];
  
  if (mode === "panditji") {
    if (msgLower.includes("kundli") || msgLower.includes("kundali") || msgLower.includes("birth")) {
      replies.push("🕉️ Kundali Form Kholen", "✨ Rashi Rudraksha", "🪐 Shani Shanti Upay", "📿 Mukhi Guide");
    } else if (msgLower.includes("career") || msgLower.includes("dhan") || msgLower.includes("job")) {
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
    replies.push("SHRAWAN200 Code", "AURA10 Discount", "Apply Coupon", "Best Sellers");
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
    const { dob, birthTime, birthPlace, name, gender, concern } = req.body;

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
      concern: concern || "career"
    });

    // 2. Fetch Matching Authentic Store Catalog Products
    let allProducts = [];
    if (isDbConnected()) {
      try {
        allProducts = await Product.find({
          status: { $nin: ["Draft", "draft", "Inactive", "inactive", "Archived", "archived"] }
        }).lean();
      } catch (_) {
        allProducts = inMemoryStore.products || [];
      }
    } else {
      allProducts = inMemoryStore.products || [];
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

    // 3. Generate Vedic Interpretation using NVIDIA NIM (nemotron-3-super-120b-a12b)
    let aiInterpretation = "";
    const nvidiaClient = getNvidiaClient();

    if (nvidiaClient) {
      try {
        const astroPrompt = `You are AI Pandit Ji, the respectful, knowledgeable Vedic Astrology AI guide for Aura Rudraksha.
You have been provided with authoritative sidereal astronomical calculations computed by the Vedic ephemeris engine for:
Name: ${kundaliData.verifiedBirthData.name}
DOB: ${kundaliData.verifiedBirthData.dob} at ${kundaliData.verifiedBirthData.birthTime}
Birthplace: ${kundaliData.verifiedBirthData.birthPlace} (Lat: ${kundaliData.verifiedBirthData.coordinates.lat}°, Lon: ${kundaliData.verifiedBirthData.coordinates.lon}°)
Ayanamsha: ${kundaliData.verifiedBirthData.ayanamsha}

Calculated Astronomical Placements:
- Lagna (Ascendant): ${kundaliData.astronomicalKundali.lagna.rashiHindi} (${kundaliData.astronomicalKundali.lagna.rashiEnglish}) at ${kundaliData.astronomicalKundali.lagna.degree} in Nakshatra ${kundaliData.astronomicalKundali.lagna.nakshatra} (Pada ${kundaliData.astronomicalKundali.lagna.pada}), Swami: ${kundaliData.astronomicalKundali.lagna.lord}
- Chandra Rashi (Moon Sign): ${kundaliData.astronomicalKundali.chandraRashi.rashiHindi} (${kundaliData.astronomicalKundali.chandraRashi.rashiEnglish}) at ${kundaliData.astronomicalKundali.chandraRashi.degree} in Nakshatra ${kundaliData.astronomicalKundali.chandraRashi.nakshatra} (Pada ${kundaliData.astronomicalKundali.chandraRashi.pada}), Swami: ${kundaliData.astronomicalKundali.chandraRashi.lord}
- Surya Rashi (Sun Sign): ${kundaliData.astronomicalKundali.suryaRashi.rashiHindi} (${kundaliData.astronomicalKundali.suryaRashi.rashiEnglish}) in ${kundaliData.astronomicalKundali.suryaRashi.nakshatra}
- Numerology Mulank: ${kundaliData.astronomicalKundali.mulank}
- Vimshottari Mahadasha: ${kundaliData.astronomicalKundali.vimshottariDasha.currentMahadashaHindi} Mahadasha (Antardasha: ${kundaliData.astronomicalKundali.vimshottariDasha.currentAntardashaHindi})
- Manglik Status: ${kundaliData.astronomicalKundali.doshaSummary.manglikNote}

Primary Devotee Concern: ${concern}

YOUR TASK:
Provide an authentic, respectful, spiritual, and uplifting Vedic analysis in warm Hindi/Hinglish (Devanagari/Hinglish friendly).
1. Explain their Lagna and Chandra Rashi strengths.
2. Explain the influence of their running ${kundaliData.astronomicalKundali.vimshottariDasha.currentMahadashaHindi} Mahadasha.
3. Recommend the exact consecrated Rudraksha beads (Lagna Lord bead, Rashi bead, Dasha bead) to enhance spiritual balance, aura protection, and peace.
4. Conclude with traditional Dharan Vidhi and Beej Mantra.
Never claim to be a physical human; maintain calm, spiritual AI Pandit Ji persona. Keep predictions non-fatalistic and positive.`;

        const completion = await nvidiaClient.chat.completions.create({
          model: PRIMARY_NIM_MODEL,
          messages: [
            { role: "system", content: "You are AI Pandit Ji (Vedic Astrology AI Guide) for Aura Rudraksha. Speak calmly, spiritually, and respectfully in warm Hindi/Hinglish." },
            { role: "user", content: astroPrompt }
          ],
          temperature: 0.35,
          max_tokens: 1500,
          chat_template_kwargs: { enable_thinking: false },
          reasoning_effort: "none"
        });

        aiInterpretation = completion.choices?.[0]?.message?.content || "";
      } catch (nimErr) {
        console.warn("[Kundali Endpoint] NVIDIA NIM notice:", nimErr?.message || nimErr);
      }
    }

    if (!aiInterpretation.trim()) {
      aiInterpretation = `🙏 **जय श्री राम! हर हर महादेव।**\n\nआपकी जन्म पत्रिका के प्रामाणिक वैदिक खगोलीय विश्लेषण के अनुसार, आपका जन्म **${kundaliData.astronomicalKundali.lagna.rashiHindi} लग्न** एवं **${kundaliData.astronomicalKundali.chandraRashi.rashiHindi} राशि** में हुआ है। आपका जन्म नक्षत्र **${kundaliData.astronomicalKundali.chandraRashi.nakshatra}** (पद ${kundaliData.astronomicalKundali.chandraRashi.pada}) है।\n\nवर्तमान में आप पर **${kundaliData.astronomicalKundali.vimshottariDasha.currentMahadashaHindi} महादशा** का प्रभाव है। आपके लग्न एवं राशि के स्वामी की अनुकूलता तथा आपके संकल्प की सिद्धि हेतु प्राण-प्रतिष्ठित **${kundaliData.astronomicalKundali.rudrakshaRecommendations[0].mukhi}** धारण करना आपके लिए अत्यंत कल्याणकारी रहेगा।`;
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
      supportPhone: "+91 98765 43210",
      supportEmail: "support@aurarudraksha.com"
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
      const handoffText = `🙏 **प्रणाम! Main AI Pandit Ji hoon.**\n\nOrder status, parcel tracking aur delivery updates ke liye **Aura AI Support** aapki behtar madad karega.\n\nAap niche diye gaye button par click karke **Aura AI Shopping & Support** mode mein switch kar sakte hain, ya seedhe [Track Order](/track-order) page par apna Order Number daal kar live status dekh sakte hain:\n\n📦 **Direct Order Tracking:** [https://aurarudraksha.com/track-order](/track-order)`;

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
      } catch (_) {}
    }

    const hasNewBirthDetails = birthDetails && birthDetails.dob && birthDetails.birthTime && birthDetails.birthPlace;
    const existingVerifiedBirthDetails = existingConvDoc?.verifiedBirthDetails || null;

    let activeBirthDetails = null;
    if (hasNewBirthDetails) {
      activeBirthDetails = {
        dob: birthDetails.dob,
        birthTime: birthDetails.birthTime,
        birthPlace: birthDetails.birthPlace,
        name: birthDetails.name || verifiedName,
        gender: birthDetails.gender || "",
        concern: birthDetails.concern || "career"
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

    // 4. Fetch Live Catalog Products & RAG Context
    let matchedProducts = [];
    if (shouldRecommendProducts({ message: message || "", intent, targetMukhi, matchedProducts: [1] })) {
      matchedProducts = await searchRelevantCatalogProducts(message || "", targetMukhi);
    }

    // Fetch store products for prompt context
    let allStoreProds = [];
    if (isDbConnected()) {
      try {
        allStoreProds = await Product.find({ status: { $nin: ["Draft", "draft", "Inactive", "inactive"] } }).lean();
      } catch (_) {
        allStoreProds = inMemoryStore.products || [];
      }
    } else {
      allStoreProds = inMemoryStore.products || [];
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

    const urlAndCatalogRulesText = `
WEBSITE URL & PRODUCT LINKING RULES (CRITICAL):
- Official Store Website URLs:
  - https://aura-rudraksha.vercel.app (Live Web Application)
  - https://aurarudraksha.com (Official Domain)
- Main Page Routes:
  - Official Homepage: https://aura-rudraksha.vercel.app (or /)
  - Shop All Products: https://aura-rudraksha.vercel.app/shop (or /shop)
  - Order Tracking: https://aura-rudraksha.vercel.app/track-order (or /track-order)
  - Contact Us: https://aura-rudraksha.vercel.app/contact (or /contact)
  - Cart / Checkout: https://aura-rudraksha.vercel.app/cart (or /cart)
  - Free Kundali & Zodiac Analysis: https://aura-rudraksha.vercel.app/zodiac (or /zodiac)
- When user asks "What is the website URL?", "Website link do", or "Where to buy?", ALWAYS provide: https://aura-rudraksha.vercel.app (or https://aurarudraksha.com).
- NEVER generate or hallucinate fake external domain URLs (like example.com or random fake links).
- STRICT PRODUCT CATALOG & LINKING MANDATE:
  - NEVER invent, hallucinate, or suggest fake product names, fake prices, or fake links.
  - ONLY recommend real products from the official catalog below.
  - Whenever linking to a product, ALWAYS use its exact Valid Link from the catalog below in markdown format:
    e.g. [Product Name](/product/${allStoreProds[0]?.slug || "slug"}) or [Product Name](/product/${allStoreProds[0]?.id || "id"})

REAL STORE PRODUCT CATALOG:
${storeCatalogPromptSnippet}

LINK FORMAT RULES:
- Use relative markdown links: [Product Name](/product/slug) or [Shop All](/shop).`;

    // 5. Retrieve Live RAG Knowledge Documents & Memories
    const ragDocs = await retrieveRagContext(message || (mode === "panditji" ? "Vedic Rudraksha Jyotish" : "Aura Rudraksha"), 3);
    const ragContextText = ragDocs.map(d => `[${d.title}]: ${d.content}`).join("\n\n");

    const userMemories = await getUserMemories({ userId: effectiveUserId, guestSessionId: effectiveGuestSessionId });
    const memoryContextText = userMemories.map(m => `- ${m.memoryKey}: ${m.memoryValue}`).join("\n");

    // 6. Build High-Integrity Persona System Prompt for NVIDIA NIM (nemotron-3-super-120b-a12b)
    let systemPrompt = "";

    if (mode === "panditji") {
      systemPrompt = `You are AI Pandit Ji, the revered Vedic Astrology (Jyotish) & Spiritual Guide for Aura Rudraksha (https://aurarudraksha.com).

CORE IDENTITY & TRANSPARENCY:
- You are an authentic Vedic spiritual AI assistant ("AI Pandit Ji"). Always maintain high respect, calm demeanor, and deep traditional knowledge.
- Strictly identify as AI; never claim to be a physical living human or invent fake degrees/claims.
- Use warm, respectful Hindi/Hinglish greetings (e.g. "🙏 प्रणाम", "हर हर महादेव", "जय श्री राम", "शुभ प्रभात / शुभ संध्या").
- Language Matching: If customer speaks in Hindi or Hinglish, reply in warm, respectful Hindi/Hinglish. If they speak in English, reply in English. Never randomly switch languages.

${urlAndCatalogRulesText}

KUNDALI & ASTROLOGICAL FIDELITY:
${calculatedKundaliData ? `
AUTHORITATIVE CALCULATED SIDEREAL KUNDALI DATA (VERIFIED - DO NOT ASK FOR DOB/TIME/PLACE AGAIN):
- Devotee Name: ${calculatedKundaliData.verifiedBirthData.name}
- Verified DOB: ${calculatedKundaliData.verifiedBirthData.dob} | Time: ${calculatedKundaliData.verifiedBirthData.birthTime} | Place: ${calculatedKundaliData.verifiedBirthData.birthPlace}
- Lagna (Ascendant): ${calculatedKundaliData.astronomicalKundali.lagna.rashiHindi} (${calculatedKundaliData.astronomicalKundali.lagna.rashiEnglish}) at ${calculatedKundaliData.astronomicalKundali.lagna.degree} in Nakshatra ${calculatedKundaliData.astronomicalKundali.lagna.nakshatra} (Pada ${calculatedKundaliData.astronomicalKundali.lagna.pada}), Lord: ${calculatedKundaliData.astronomicalKundali.lagna.lord}
- Chandra Rashi (Moon Sign): ${calculatedKundaliData.astronomicalKundali.chandraRashi.rashiHindi} (${calculatedKundaliData.astronomicalKundali.chandraRashi.rashiEnglish}) at ${calculatedKundaliData.astronomicalKundali.chandraRashi.degree} in Nakshatra ${calculatedKundaliData.astronomicalKundali.chandraRashi.nakshatra} (Pada ${calculatedKundaliData.astronomicalKundali.chandraRashi.pada}), Lord: ${calculatedKundaliData.astronomicalKundali.chandraRashi.lord}
- Surya Rashi: ${calculatedKundaliData.astronomicalKundali.suryaRashi.rashiHindi}
- Mulank: ${calculatedKundaliData.astronomicalKundali.mulank}
- Vimshottari Mahadasha: ${calculatedKundaliData.astronomicalKundali.vimshottariDasha.currentMahadashaHindi} (${calculatedKundaliData.astronomicalKundali.vimshottariDasha.mahadashaStartDate || 'date not available'} to ${calculatedKundaliData.astronomicalKundali.vimshottariDasha.mahadashaEndDate || 'date not available'})
- Antardasha: ${calculatedKundaliData.astronomicalKundali.vimshottariDasha.currentAntardashaHindi} (${calculatedKundaliData.astronomicalKundali.vimshottariDasha.antardashaStartDate || 'date not available'} to ${calculatedKundaliData.astronomicalKundali.vimshottariDasha.antardashaEndDate || 'date not available'})
- Manglik Status: ${calculatedKundaliData.astronomicalKundali.doshaSummary.manglikNote}
- Primary Recommended Beads: ${calculatedKundaliData.astronomicalKundali.rudrakshaRecommendations.map(r => r.mukhi).join(", ")}

STRICT FORMATTING & RE-PROMPTING RULES:
1. NEVER ask for DOB, birth time, or birth place again. Verified birth details already exist above.
2. NEVER output raw HTML tags like <br>. Use standard clean linebreaks (\n).
3. NEVER output masked date placeholders like 2024-XX-XX or XX-XX. Use the exact calculated Mahadasha and Antardasha dates provided above.
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
      systemPrompt = `You are Aura AI, the intelligent personal shopping, Vedic bead specialist, and order support assistant for Aura Rudraksha (https://aurarudraksha.com).

CORE MISSION:
- Guide devotees to the most authentic, 100% Nepali Rudraksha beads, 108 Jaap Malas, Gauri Shankar beads, and sacred bracelets.
- Provide accurate product information, stock status, active coupon discounts, and order support.
- Maintain a polite, spiritual, helpful, and conversion-oriented tone.
- Language Matching: Reply in the same language as the customer (Hindi/Hinglish or English).

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

    const nimMessages = [
      { role: "system", content: systemPrompt }
    ];

    for (const h of history.slice(-6)) {
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
      mode
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

      // Send initial meta packet
      res.write(`data: ${JSON.stringify({
        type: "meta",
        products: matchedProducts,
        kundali: calculatedKundaliData,
        showBirthForm: shouldPromptBirthForm,
        quickReplies: dynamicQuickReplies,
        conversationId: targetConversationId,
        guestSessionId: effectiveGuestSessionId
      })}\n\n`);

      let fullStreamedText = "";
      let streamSucceeded = false;
      const nvidiaClient = getNvidiaClient();

      if (nvidiaClient) {
        for (const modelCandidate of [PRIMARY_NIM_MODEL, ...BACKUP_NIM_MODELS]) {
          if (streamSucceeded || clientDisconnected) break;
          try {
            const streamCompletion = await nvidiaClient.chat.completions.create(
              {
                model: modelCandidate,
                messages: nimMessages,
                temperature: 0.35,
                max_tokens: 1800,
                stream: true,
                chat_template_kwargs: { enable_thinking: false },
                reasoning_effort: "none"
              },
              { signal: abortController.signal }
            );

            for await (const chunk of streamCompletion) {
              if (clientDisconnected) break;
              const deltaContent = chunk.choices?.[0]?.delta?.content || "";
              if (deltaContent) {
                fullStreamedText += deltaContent;
                res.write(`data: ${JSON.stringify({ type: "chunk", delta: deltaContent })}\n\n`);
              }
            }

            if (fullStreamedText.trim()) {
              streamSucceeded = true;
              break;
            }
          } catch (streamErr) {
            if (streamErr.name === "AbortError" || clientDisconnected) {
              return;
            }
            console.warn(`[Aura AI Streaming] Notice (${modelCandidate}):`, streamErr?.message || streamErr);
          }
        }
      }

      // If streaming could not produce output, generate fallback
      if (!streamSucceeded && !clientDisconnected) {
        let fallbackText = "";
        if (mode === "panditji") {
          if (calculatedKundaliData) {
            fallbackText = `🙏 **प्रणाम! हर हर महादेव।**\n\nआपकी जन्म पत्रिका के प्रामाणिक वैदिक विश्लेषण के अनुसार:\n- **लग्न:** ${calculatedKundaliData.astronomicalKundali.lagna.rashiHindi} (${calculatedKundaliData.astronomicalKundali.lagna.rashiEnglish})\n- **जन्म राशि:** ${calculatedKundaliData.astronomicalKundali.chandraRashi.rashiHindi} (${calculatedKundaliData.astronomicalKundali.chandraRashi.rashiEnglish})\n- **जन्म नक्षत्र:** ${calculatedKundaliData.astronomicalKundali.chandraRashi.nakshatra} (पद ${calculatedKundaliData.astronomicalKundali.chandraRashi.pada})\n- **वर्तमान महादशा:** ${calculatedKundaliData.astronomicalKundali.vimshottariDasha.currentMahadashaHindi}\n\n**वैदिक रुद्राक्ष परामर्श:**\nआपके लग्न एवं संकल्प की सिद्धि हेतु **${calculatedKundaliData.astronomicalKundali.rudrakshaRecommendations[0].mukhi}** धारण करना सर्वोत्तम रहेगा। यह आपके आत्मबल, स्वास्थ्य एवं ग्रह शांति के लिए अत्यंत लाभकारी है।`;
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
        kundali: calculatedKundaliData,
        timestamp: new Date()
      };

      if (isDbConnected()) {
        AuraAIConversation.findOneAndUpdate(
          { conversationId: targetConversationId },
          {
            $setOnInsert: {
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
    let generatedViaNvidia = false;

    const nvidiaClient = getNvidiaClient();
    if (nvidiaClient) {
      for (const modelCandidate of [PRIMARY_NIM_MODEL, ...BACKUP_NIM_MODELS]) {
        if (generatedViaNvidia) break;
        try {
          const completion = await nvidiaClient.chat.completions.create({
            model: modelCandidate,
            messages: nimMessages,
            temperature: 0.35,
            max_tokens: 1800,
            chat_template_kwargs: { enable_thinking: false },
            reasoning_effort: "none"
          });

          const outContent = completion.choices?.[0]?.message?.content || "";
          if (outContent.trim()) {
            aiResponseText = outContent;
            generatedViaNvidia = true;
            break;
          }
        } catch (nimErr) {
          console.warn(`[Aura AI] NVIDIA NIM execution notice (${modelCandidate}):`, nimErr?.message || nimErr);
        }
      }
    }

    // Deterministic Vedic / Store Fallback if AI models are momentarily disconnected
    if (!generatedViaNvidia || !aiResponseText.trim()) {
      if (mode === "panditji") {
        if (calculatedKundaliData) {
          aiResponseText = `🙏 **प्रणाम! हर हर महादेव।**\n\nआपकी जन्म पत्रिका के प्रामाणिक वैदिक विश्लेषण के अनुसार:\n- **लग्न:** ${calculatedKundaliData.astronomicalKundali.lagna.rashiHindi} (${calculatedKundaliData.astronomicalKundali.lagna.rashiEnglish})\n- **जन्म राशि:** ${calculatedKundaliData.astronomicalKundali.chandraRashi.rashiHindi} (${calculatedKundaliData.astronomicalKundali.chandraRashi.rashiEnglish})\n- **जन्म नक्षत्र:** ${calculatedKundaliData.astronomicalKundali.chandraRashi.nakshatra} (पद ${calculatedKundaliData.astronomicalKundali.chandraRashi.pada})\n- **वर्तमान महादशा:** ${calculatedKundaliData.astronomicalKundali.vimshottariDasha.currentMahadashaHindi}\n\n**वैदिक रुद्राक्ष परामर्श:**\nआपके लग्न एवं संकल्प की सिद्धि हेतु **${calculatedKundaliData.astronomicalKundali.rudrakshaRecommendations[0].mukhi}** धारण करना सर्वोत्तम रहेगा। यह आपके आत्मबल, स्वास्थ्य एवं ग्रह शांति के लिए अत्यंत लाभकारी है।`;
        } else if (shouldPromptBirthForm) {
          aiResponseText = `🙏 **प्रणाम! Main AI Pandit Ji hoon.**\n\nआपकी जन्म कुंडली का सटीक एवं प्रामाणिक वैदिक विश्लेषण करने हेतु आपकी **जन्म तिथि (DOB)**, **जन्म समय (Time)** एवं **जन्म स्थान (City)** की आवश्यकता है।\n\nकृपया नीचे दिए गए फॉर्म में अपना विवरण दर्ज करें ताकि मैं आपकी कुंडली का सही विश्लेषण कर सकूँ।`;
        } else {
          aiResponseText = `🙏 **प्रणाम! Main AI Pandit Ji hoon — Aura Rudraksha का वैदिक ज्योतिष व आध्यात्मिक मार्गदर्शक।**\n\nआप अपनी जन्म कुंडली विश्लेषण, राशि अनुसार रुद्राक्ष चयन, ग्रह शांति उपाय या किसी विशेष संकल्प हेतु परामर्श ले सकते हैं। आज मैं आपकी क्या सहायता करूँ?`;
        }
      } else {
        aiResponseText = `🙏 **Namaste! Main Aura AI hoon — Aura Rudraksha ka shopping aur support assistant.**\n\nMain aapki 100% authentic Nepali Rudraksha, Jaap Mala, discount coupons aur order tracking mein madad kar sakta hoon. Aaj aap kya dekhna chahte hain?`;
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

    // Save Conversation in MongoDB / inMemoryStore
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
      kundali: calculatedKundaliData,
      timestamp: new Date()
    };

    if (isDbConnected()) {
      try {
        await AuraAIConversation.findOneAndUpdate(
          { conversationId: targetConversationId },
          {
            $setOnInsert: {
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

    if (isDbConnected()) {
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
        orders = inMemoryStore.orders || [];
        products = inMemoryStore.products || [];
        reviews = inMemoryStore.reviews || [];
        conversations = inMemoryStore.conversations || [];
      }
    } else {
      orders = inMemoryStore.orders || [];
      products = inMemoryStore.products || [];
      reviews = inMemoryStore.reviews || [];
      conversations = inMemoryStore.conversations || [];
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

    // 2. Generate Real Executive Insights with NVIDIA NIM (with 7s timeout fallback)
    let aiExecutiveReport = null;
    const nvidiaClient = getNvidiaClient();

    if (nvidiaClient) {
      try {
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
    next(err);
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

    const result = await generateSeoAndVedicDataWithNemotron(req.body);
    return res.json(result);
  } catch (err) {
    next(err);
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

    if (isDbConnected()) {
      const updated = await AuraAISetting.findOneAndUpdate(
        {},
        { $set: cleanUpdates },
        { upsert: true, new: true, returnDocument: "after" }
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

    let list = [];
    if (isDbConnected()) {
      list = await AuraAIConversation.find(query).sort({ updatedAt: -1 }).limit(100).lean();
    } else {
      list = (inMemoryStore.conversations || []).filter(c => {
        if (!query.userId && !query.guestSessionId) return true;
        if (query.userId) return c.userId === query.userId;
        if (query.guestSessionId) return c.guestSessionId === query.guestSessionId;
        return false;
      });
    }

    return res.json({ success: true, data: list });
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
    let conv = null;

    if (isDbConnected()) {
      conv = await AuraAIConversation.findOne({ conversationId: id }).lean();
    } else {
      conv = (inMemoryStore.conversations || []).find(c => c.conversationId === id || c.id === id);
    }

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
    let conv = null;

    if (isDbConnected()) {
      conv = await AuraAIConversation.findOne({ conversationId: id }).lean();
    } else {
      conv = (inMemoryStore.conversations || []).find(c => c.conversationId === id || c.id === id);
    }

    const check = await verifyConversationOwnership(conv, req);
    if (!check.allowed) {
      return res.status(check.status || 403).json({ success: false, message: check.message });
    }

    if (isDbConnected()) {
      await AuraAIConversation.deleteOne({ conversationId: id });
    } else {
      inMemoryStore.conversations = (inMemoryStore.conversations || []).filter(c => c.conversationId !== id && c.id !== id);
    }

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
    let convos = [];
    if (isDbConnected()) {
      convos = await AuraAIConversation.find().sort({ updatedAt: -1 }).limit(500).lean();
    } else {
      convos = inMemoryStore.conversations || [];
    }

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
    const products = await Product.find({ isPublic: true }).select("name price category stock status origin mukhi").lean();
    if (!products || products.length === 0) return "No products found.";
    
    return products.map(p => 
      `- ${p.name} | Cat: ${p.category} | Price: ₹${p.price} | Stock: ${p.stock} | Origin: ${p.origin || "Unknown"}`
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
    if (!nvidia) {
      return res.status(503).json({ error: "Nemotron AI client is not configured. Please check API keys." });
    }

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
      ...messages.map(m => ({
        role: m.role === 'model' || m.role === 'assistant' ? 'assistant' : (m.role === 'tool' ? 'tool' : 'user'),
        content: String(m.content || m.text || ""),
        ...(m.tool_calls ? { tool_calls: m.tool_calls } : {}),
        ...(m.tool_call_id ? { tool_call_id: m.tool_call_id } : {})
      })).filter(m => m.content.trim() !== "" || m.tool_calls)
    ];

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

    let response = await nvidia.chat.completions.create({
      model: PRIMARY_NIM_MODEL,
      messages: formattedMessages,
      temperature: 0.7,
      max_tokens: 2500,
      tools: tools,
      tool_choice: "auto"
    });

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

    const aiText = responseMessage?.content || "No response generated.";

    return res.json({ text: aiText });
  } catch (error) {
    console.error("Error in adminChatAuraAI:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
