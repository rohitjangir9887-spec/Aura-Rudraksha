import crypto from "crypto";
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";

import { AuraAISetting, AuraAIConversation } from "../models/AuraAI.js";
import { Product } from "../models/Product.js";
import { Coupon } from "../models/Coupon.js";
import { Order } from "../models/Order.js";
import { Customer } from "../models/Customer.js";
import { Setting } from "../models/Setting.js";
import { isDbConnected } from "../config/db.js";
import { pickFields } from "../utils/sanitize.js";
import { isAdminUser, hasAdminRole } from "../middleware/auth.js";
import { inMemoryStore } from "../data/inMemoryStore.js";
import { 
  searchRelevantCatalogProducts, 
  extractMukhiNumber, 
  VEDIC_BEADS_KNOWLEDGE 
} from "../services/vedicKnowledgeService.js";
import { getUserMemories, extractAndUpdateMemories } from "../services/memoryService.js";
import { retrieveRagContext } from "../services/ragService.js";
import { GEMINI_TOOL_DECLARATIONS, executeAiToolCall } from "../services/aiToolsService.js";

const requestCounts = new Map();

const AI_SETTING_FIELDS = {
  enabled: "bool", showFloatingButton: "bool", showHeaderButton: "bool",
  language: "string", tone: "string", greeting: "string",
  recommendProducts: "bool", recommendOffers: "bool", cartActions: "bool",
  orderSupport: "bool", humanSupport: "bool", personalization: "bool"
};

// Rate limiting in-memory map: IP/UID -> { count, resetAt }
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
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

// Production AI provider configuration: NVIDIA NIM
const PRIMARY_NIM_MODEL = "nemotron-3-super-120b-a12b";
const BACKUP_NIM_MODELS = ["nemotron-3-super-120b-a12b"];

function getNvidiaClient() {
  const apiKey = process.env.NVIDIA_API_KEY ? process.env.NVIDIA_API_KEY.trim() : "";
  if (!apiKey) return null;
  try {
    return new OpenAI({
      baseURL: "https://integrate.api.nvidia.com/v1",
      apiKey,
      timeout: 20000
    });
  } catch (err) {
    console.warn("Could not initialize NVIDIA NIM Client:", err?.message || err);
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

  // 1. Remove closed thinking / reasoning / analysis tags
  text = text.replace(/<think>[\s\S]*?<\/think>/gi, "");
  text = text.replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, "");
  text = text.replace(/<analysis>[\s\S]*?<\/analysis>/gi, "");

  // 2. Remove unclosed thinking / reasoning / analysis tags
  text = text.replace(/<think>[\s\S]*/gi, "");
  text = text.replace(/<reasoning>[\s\S]*/gi, "");
  text = text.replace(/<analysis>[\s\S]*/gi, "");

  // 3. Remove internal chain-of-thought phrases & line narrations
  const reasoningRegexes = [
    /^[\s\n]*okay,?\s+the\s+user[\s\S]*?(?=\n\n|namaste|hello|hii|aap|haaye|haan|kaise|rudraksha|1000|$)/i,
    /^[\s\n]*let\s+me\s+check[\s\S]*?(?=\n\n|namaste|hello|hii|aap|haaye|haan|kaise|rudraksha|1000|$)/i,
    /^[\s\n]*looking\s+at\s+the\s+context[\s\S]*?(?=\n\n|namaste|hello|hii|aap|haaye|haan|kaise|rudraksha|1000|$)/i,
    /^[\s\n]*first,?\s+they\s+started[\s\S]*?(?=\n\n|namaste|hello|hii|aap|haaye|haan|kaise|rudraksha|1000|$)/i
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

// Helper to sanitize customer-facing text on the server
function cleanServerAiText(raw) {
  if (!raw || typeof raw !== "string") return "";
  let text = stripThinkingAndReasoning(raw);
  // Strip code fences
  text = text.replace(/^```(?:json|markdown)?\s*/i, "").replace(/\s*```$/i, "").trim();
  // Protect admin details
  text = text.replace(/rohitjangir\d*@gmail\.com/gi, "aurarudrakshaofficial@gmail.com");
  text = text.replace(/MONGODB_[A-Z0-9_]+/gi, "");
  text = text.replace(/GEMINI_API_[A-Z0-9_]+/gi, "");
  text = text.replace(/NVIDIA_API_[A-Z0-9_]+/gi, "");
  // Clean raw markdown heading markers
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
  if (/(mera order|my order|track|where is my order|kaha hai|status|shipment|delivery status|order kaha)/i.test(msg)) {
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

function generateDynamicQuickReplies({ userMessage, intent, targetMukhi }) {
  const msgLower = (userMessage || "").toLowerCase();
  const replies = [];
  
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
  } else if (msgLower.includes("hanuman") || msgLower.includes("dar") || msgLower.includes("protection") || msgLower.includes("himmat") || msgLower.includes("courage")) {
    replies.push("11 Mukhi Rudraksha", "11 Mukhi Price", "Hanuman Beej Mantra", "Order Now");
  } else if (intent === "ORDER_TRACKING" || msgLower.includes("track") || msgLower.includes("order")) {
    replies.push("Track My Order", "Order History", "Shipping Help", "Talk to Support");
  } else if (intent === "COUPON" || intent === "OFFER" || msgLower.includes("offer") || msgLower.includes("discount")) {
    replies.push("SHRAWAN200 Code", "AURA10 Discount", "Apply Coupon", "Best Sellers");
  } else if (intent === "BENEFITS") {
    replies.push("5 Mukhi Benefits", "7 Mukhi Benefits", "11 Mukhi Benefits", "Dharan Vidhi");
  } else {
    replies.push("5 Mukhi Rudraksha", "7 Mukhi (Wealth)", "108 Jaap Mala", "Today's Offers");
  }
  
  return Array.from(new Set(replies)).slice(0, 4);
}

// Helper to check if Aura AI should attach product recommendation cards
function shouldRecommendProducts({ message, intent, targetMukhi, matchedProducts }) {
  const msgLower = (message || "").toLowerCase().trim();

  // 1. GREETINGS & CASUAL TALK -> Never show product cards
  if (intent === "GREETING") return false;
  if (/^(hi|hello|hey|namaste|pranam|radhe|har har|ram ram|shubh|kaise ho|kya haal|good morning|good evening|good afternoon|thank you|thanks|shukriya|dhanyawad|ok|okay|theek hai|bye|alvida)[\s!.,🙏]*$/i.test(msgLower)) {
    return false;
  }

  // 2. ORDER / SHIPPING / RETURN / PAYMENT / SUPPORT -> Only if explicitly asking for products in same query
  if ([
    "ORDER_TRACKING",
    "ORDER_HISTORY",
    "ORDER_CANCEL",
    "SHIPPING",
    "RETURN",
    "PAYMENT",
    "GENERAL_SUPPORT"
  ].includes(intent)) {
    const hasProductAsk = /(rudraksha|rudraksh|mukhi|mala|dikhao|chahiye|buy|khareedna|price|kitne ka)/i.test(msgLower);
    return hasProductAsk && matchedProducts.length > 0;
  }

  // 3. Specific Mukhi or bead requested (e.g. "5 mukhi", "7 mukhi", "108 mala", "gauri shankar") -> YES
  if (targetMukhi && matchedProducts.length > 0) {
    return true;
  }

  // 4. User explicitly asking for suggestions / recommendations / price / purchase / rashi / life benefits
  const explicitAskPattern = /(dikhao|chahiye|need|want|show|buy|purchase|khareedna|mangwana|order|price|cost|rate|kitne ka|bhav|rupees|amount|under|budget|sasta|mehenga|kimat|suggest|recommend|konsa|mere liye|best seller|kuber|dhan|wealth|paisa|lakshmi|business|vyapar|shanti|peace|stress|tension|bp|health|hanuman|protection|student|study|exam|rashi|kundli|lagna|mesh|vrishabh|mithun|kark|singh|kanya|tula|vrischika|dhanu|makar|kumbh|meen)/i.test(msgLower);

  if (explicitAskPattern && matchedProducts.length > 0) {
    return true;
  }

  // 5. If pure spiritual general question without product inquiry (e.g. "dharan vidhi batao", "kya non veg kha sakte hain", "kya niyam hain") -> NO products
  return false;
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
    if (isAdmin) {
      return { allowed: true };
    }
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
      // Logged in user accessing guest conversation - allow if matching guestSessionId
      if (conv.guestSessionId && clientGuestSessionId && conv.guestSessionId === clientGuestSessionId) {
        return { allowed: true };
      }
      return { allowed: false, status: 403, message: "Access Denied: Conversation belongs to a guest session" };
    }

    if (!clientGuestSessionId || !conv.guestSessionId || conv.guestSessionId !== clientGuestSessionId) {
      return { allowed: false, status: 403, message: "Access Denied: Guest session token does not match" };
    }

    return { allowed: true };
  }

  return { allowed: false, status: 403, message: "Access Denied" };
}

export async function chatAuraAI(req, res, next) {
  try {
    const { message, conversationId = "guest", userEmail, userName, mode = "standard", history = [] } = req.body;

    if (conversationId && typeof conversationId !== "string") {
      return res.status(400).json({ success: false, message: "Invalid conversationId" });
    }
    
    if (!message) {
      return res.status(400).json({ success: false, message: "Message is required" });
    }

    let userIsAuthenticated = false;
    let verifiedUserId = null;
    let verifiedEmail = "";
    let verifiedName = "Devotee";

    if (req.user) {
      userIsAuthenticated = true;
      verifiedUserId = req.user.authUserId;
      verifiedEmail = (req.user.email || "").toLowerCase().trim();
      verifiedName = req.user.name || "Devotee";
    }

    const clientGuestSessionId = (
      req.headers["x-guest-session-id"] ||
      req.body?.guestSessionId ||
      ""
    ).trim();

    let targetConversationId = conversationId;
    if (!targetConversationId || targetConversationId === "guest") {
      targetConversationId = "conv_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
    }

    let effectiveUserId = "guest";
    let effectiveEmail = "";
    let effectiveName = "Devotee";
    let effectiveGuestSessionId = clientGuestSessionId || ("guest_" + crypto.randomBytes(16).toString("hex"));


    let settings = inMemoryStore.aiSettings || { enabled: true };
    if (isDbConnected()) {
      const existing = await AuraAISetting.findOne({ id: "AURA_AI_SETTINGS" }).lean();
      if (existing) settings = existing;
    }

    
    let storeSettings = { supportPhone: "+91 9672996531", supportEmail: "aurarudrakshaofficial@gmail.com" };
    if (isDbConnected()) {
      try {
        const mongoose = (await import("mongoose")).default;
        const SettingModel = mongoose.model("Setting");
        const ss = await SettingModel.findOne({ id: "STORE_SETTINGS" }).lean();
        if (ss) {
          if (ss.supportPhone) storeSettings.supportPhone = ss.supportPhone;
          if (ss.supportEmail) storeSettings.supportEmail = ss.supportEmail;
        }
      } catch(e) {}
    }

    if (settings.enabled === false) {
      const restingMessage = `🙏 **Namaste! Main Aura AI hoon — Aura Rudraksha ka Vedic shopping aur spiritual guide.**\nMain aapki sacred rudraksha choose karne mein help karne ke liye abhi rest kar rahi hoon. Kripya hamare support se sampark karein:\n\n📞 **Phone/WhatsApp:** ${storeSettings.supportPhone}\n✉️ **Email:** ${storeSettings.supportEmail}\n\nHum jald hi wapas aayenge. Om Namah Shivaya! 🕉️`;
      return res.json({
        success: true,
        data: {
          text: restingMessage,
          products: [],
          coupons: [],
          quickReplies: [],
          requiresHuman: false,
          conversationId: targetConversationId,
          guestSessionId: effectiveGuestSessionId
        }
      });
    }

    const isHumanEscalation = /(human support|customer care|talk to human|call someone|contact details|phone number)/i.test(message);

    if (userIsAuthenticated) {
      effectiveUserId = verifiedUserId;
      effectiveEmail = verifiedEmail;
      effectiveName = verifiedName;
      effectiveGuestSessionId = "";
    }

    
    let existingConv = null;
    if (isDbConnected()) {
      try {
        existingConv = await AuraAIConversation.findOne({ id: targetConversationId });
        if (existingConv) {
          const check = await verifyConversationOwnership(existingConv, req);
          if (!check.allowed) {
            return res.status(check.status || 403).json({
              success: false,
              message: check.message
            });
          }
        }
      } catch (e) {
        console.warn("DB conversation lookup notice:", e?.message);
      }
    }

    // Fetch Mem0-style long-term user memories
    const userMemories = await getUserMemories({ userId: effectiveUserId, guestSessionId: effectiveGuestSessionId });
    const memoryContextText = userMemories.length > 0 
      ? userMemories.map(m => `${m.memoryKey}: ${m.memoryValue}`).join(" | ")
      : "No previous preference memories recorded yet.";

    // Fetch live RAG context documents from MongoDB / store index
    const ragDocs = await retrieveRagContext(message, 4);
    const ragContextText = ragDocs.length > 0
      ? ragDocs.map(d => `[${d.docType.toUpperCase()}] ${d.title}: ${d.content}`).join("\n\n")
      : "Standard store catalog policy and authentic Nepal Rudraksha guarantee applies.";

    const intent = detectUserIntent(message);
    const targetMukhi = extractMukhiNumber(message);

    const products = await Product.find({ isActive: { $ne: false } }).lean();

    // Multi-attribute Vedic catalog search
    let matchedProducts = searchRelevantCatalogProducts(message, products);
    
    if (matchedProducts.length === 0 && history.length > 0) {
      const lastUserMsgs = history.filter(h => h.sender === "user").slice(-2).map(h => h.text).join(" ");
      if (lastUserMsgs) {
        matchedProducts = searchRelevantCatalogProducts(lastUserMsgs + " " + message, products);
      }
    }

    const isProductRecommendationAppropriate = shouldRecommendProducts({
      message,
      intent,
      targetMukhi,
      matchedProducts
    });

    let finalProducts = [];
    if (isProductRecommendationAppropriate && matchedProducts && matchedProducts.length > 0) {
      finalProducts = matchedProducts.slice(0, 2).map(formatProductForResponse).filter(Boolean);
    }

    const isCouponAppropriate = (
      intent === "COUPON" ||
      intent === "OFFER" ||
      intent === "CHECKOUT" ||
      /(offer|discount|coupon|code|deal|chhoot|bachat|promo)/i.test(message)
    );
    let coupons = [];
    if (isDbConnected()) {
      try { coupons = await Coupon.find({ status: "Active" }).lean(); } catch(e) {}
    }
    const finalCoupons = isCouponAppropriate ? coupons.slice(0, 1) : [];

    const quickReplies = generateDynamicQuickReplies({ userMessage: message, intent, targetMukhi });

    const isPanditji = mode === "panditji";
    const assistantIdentity = isPanditji
      ? `You are "AI Panditji" (🕉️ AI Panditji), a revered 35+ years experienced Vedic Astrologer, Rudraksha Specialist, and Spiritual Guide for Aura Rudraksha.`
      : `You are "Aura AI", the production-grade intelligent Vedic Rudraksha shopping and guidance assistant for Aura Rudraksha.`;

    const systemPrompt = `${assistantIdentity}

${isPanditji ? `TONE & PERSONA (AI PANDITJI MODE):
- Speak with deep respect, spiritual warmth, wisdom, Vedic authority, and humility like a true Acharya.
- Address the user as "Devotee", "Priya Bhaktjan", or "Ji". Start greetings respectfully: "Hari Om 🙏 Pranam Devotee!", "Har Har Mahadev 🕉️", "Jai Shree Krishna 🕉️", or "Radhe Radhe 🚩".
- Provide authentic traditional Jyotish (astrology), Rashi, Nakshatra, Mulank, and Rudraksha Mukhi guidance based on ancient scriptures (Shiva Purana, Padma Purana).
- Whenever a user shares their birth details (Name, Date of Birth, Birth Time, Birth Place, Concern), perform a thorough, respectful Vedic analysis explaining their Rashi, ruling planet, element, recommended Mukhi Rudraksha, Beej Mantra, and Dharan Vidhi.
- Always include traditional Dharan Vidhi (wearing day, auspicious muhurat, Beej Mantra, Gangajal & raw milk purification, and daily Nitya Niyama).` : `TONE & PERSONA (STANDARD MODE):
- Warm, polite, knowledgeable, concise, and helpful. Answer customer queries directly.`}

SALES & CONVERSION FOCUS (INDEPENDENT THINKING):
- You are an expert sales representative and spiritual guide combined. Think independently and creatively to guide the user towards making a purchase (सेल्स बढ़ाने मे योगदान दें).
- Proactively suggest related products, explain the profound spiritual and material benefits of the items, and highlight active discounts/coupons to create urgency.
- Subtly encourage the user to add items to their cart and proceed to checkout, framing the purchase as a positive spiritual investment.
- If a user asks a general question, answer it beautifully but always tie it back to how our authentic Rudraksha beads can help them achieve their goals.

HONESTY & SOURCE OF TRUTH:
- NEVER invent prices, stock availability, discount coupons, customer orders, or delivery dates.
- For product catalog details, stock, shipping, coupons, and customer orders, rely strictly on live function tool data or RAG context.
- For external general questions outside the website (e.g., general world news, astrology transits, history articles), use external search grounding or model knowledge.

PRIVACY & USER ISOLATION:
- Never reveal another customer's data or orders. Only access authenticated customer's own details.

MEM0 LONG-TERM USER MEMORY (RESERVED CONTEXT):
${memoryContextText}

RELEVANT LIVE RAG KNOWLEDGE SNIPPETS:
${ragContextText}

Current Devotee State:
Mode: ${mode}
Authenticated: ${userIsAuthenticated ? verifiedName : "Guest"}
Intent: ${intent}
Target Mukhi/Bead: ${targetMukhi || "General"}`;

    
    if (isHumanEscalation) {
      const restingMessage = `🙏 **Namaste! Main Aura AI hoon — Aura Rudraksha ka Vedic shopping aur spiritual guide.**\nMain aapki sacred rudraksha choose karne mein help kar sakta hoon. Yadi aapko kisi vishesh sahayata ya manushya (human) support ki aavashyakta hai, to kripya hamare support se sampark karein:\n\n📞 **Phone/WhatsApp:** ${storeSettings.supportPhone}\n✉️ **Email:** ${storeSettings.supportEmail}\n\nHum jald hi wapas aayenge. Om Namah Shivaya! 🕉️`;
      return res.json({
        success: true,
        data: {
          text: restingMessage,
          products: [],
          coupons: [],
          quickReplies: [],
          requiresHuman: true,
          conversationId: targetConversationId,
          guestSessionId: effectiveGuestSessionId
        }
      });
    }

    let fullRawContent = "";

    let generatedViaLLM = false;
    let triggeredAction = null;

    // Primary AI Generation using Gemini API (@google/genai)
    const geminiApiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : "";
    if (geminiApiKey) {
      try {
        const ai = new GoogleGenAI({
          apiKey: geminiApiKey,
          httpOptions: { headers: { "User-Agent": "aistudio-build" } }
        });

        // Format multi-turn message history for Gemini
        const contents = [];
        for (const h of history.slice(-6)) {
          if (h.sender === "user" && h.text) {
            contents.push({ role: "user", parts: [{ text: String(h.text) }] });
          } else if (h.sender === "ai" && h.text) {
            contents.push({ role: "model", parts: [{ text: String(h.text) }] });
          }
        }
        contents.push({ role: "user", parts: [{ text: message }] });

        // Gemini Tools Configuration: Live Store Functions & Search Grounding
        const isExternalQuery = /(news|article|history|research|today|weather|external|scientific|planet transit|astrology today)/i.test(message);
        
        const toolsConfig = isExternalQuery
          ? [{ googleSearch: {} }]
          : [{ functionDeclarations: GEMINI_TOOL_DECLARATIONS }];

        // Generate content with function calling capabilities
        let response = await ai.models.generateContent({
          model: "gemini-3.8-flash",
          config: {
            systemInstruction: systemPrompt,
            tools: toolsConfig,
            temperature: 0.3,
            maxOutputTokens: 2048
          },
          contents
        });

        // Handle potential tool function calls in loop
        let functionCalls = response.functionCalls || [];
        let maxToolTurns = 3;

        while (functionCalls && functionCalls.length > 0 && maxToolTurns > 0) {
          maxToolTurns -= 1;
          const toolCall = functionCalls[0];
          const toolName = toolCall.name;
          const toolArgs = toolCall.args || {};

          console.log(`[Aura AI] Gemini requested tool execution: ${toolName}`, toolArgs);

          const toolResult = await executeAiToolCall(toolName, toolArgs, {
            authenticatedUserId: userIsAuthenticated ? verifiedUserId : null,
            userEmail: verifiedEmail
          });

          if (toolResult?.action) {
            triggeredAction = toolResult;
          }

          // Append function call and function response to multi-turn contents
          contents.push({
            role: "model",
            parts: [{ functionCall: toolCall }]
          });
          contents.push({
            role: "user",
            parts: [{
              functionResponse: {
                name: toolName,
                response: { output: toolResult }
              }
            }]
          });

          response = await ai.models.generateContent({
            model: "gemini-3.8-flash",
            config: {
              systemInstruction: systemPrompt,
              tools: [{ functionDeclarations: GEMINI_TOOL_DECLARATIONS }],
              temperature: 0.3
            },
            contents
          });

          functionCalls = response.functionCalls || [];
        }

        fullRawContent = response.text || "";
        if (fullRawContent.trim()) {
          generatedViaLLM = true;
        }
      } catch (geminiErr) {
        console.warn("[Aura AI] Gemini API Execution Notice:", geminiErr?.message || geminiErr);
      }
    }

    // Secondary LLM Generation: NVIDIA NIM (with retry logic and timeout)
    if (!generatedViaLLM || !fullRawContent.trim()) {
      const nvidiaClient = getNvidiaClient();
      if (nvidiaClient) {
        for (let attempt = 1; attempt <= 2 && !generatedViaLLM; attempt++) {
          try {
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
            nimMessages.push({ role: "user", content: message });

            const nimCompletion = await nvidiaClient.chat.completions.create({
              model: PRIMARY_NIM_MODEL,
              messages: nimMessages,
              temperature: 0.35,
              max_tokens: 1500,
              chat_template_kwargs: { enable_thinking: false },
              reasoning_effort: "none"
            });

            const nimText = nimCompletion.choices?.[0]?.message?.content || "";
            if (nimText.trim()) {
              fullRawContent = nimText;
              generatedViaLLM = true;
              break;
            }
          } catch (nimErr) {
            console.warn(`[Aura AI] NVIDIA NIM attempt ${attempt} notice:`, nimErr?.message || nimErr);
          }
        }
      }
    }

    // Deterministic Vedic Knowledge Fallback if LLM responses are unavailable
    if (!generatedViaLLM || !fullRawContent.trim()) {
      let customerOrders = [];
      if (userIsAuthenticated && effectiveUserId) {
        try {
          if (isDbConnected()) {
            customerOrders = await Order.find({ authUserId: effectiveUserId }).sort({ createdAt: -1, date: -1 }).limit(3).lean();
          } else {
            customerOrders = inMemoryStore.orders.filter(o => String(o.authUserId) === String(effectiveUserId)).slice(0, 3);
          }
        } catch (ordErr) {
          console.warn("Notice fetching customer orders for AI context:", ordErr?.message);
        }
      }

      fullRawContent = `🙏 **Namaste! Main Aura AI hoon.**\n\nKshama karein, is samay main temporary connection issue face kar raha hoon (AI API disconnected). Kripya thodi der baad prayas karein, ya directly hamare products browse karein.`;
    }

    const safeFinalText = cleanServerAiText(stripInternalJsonFromCustomerText(fullRawContent));

    // Update Mem0-style long-term user memory in background
    extractAndUpdateMemories({
      userId: effectiveUserId,
      guestSessionId: effectiveGuestSessionId,
      userMessage: message,
      aiResponse: safeFinalText
    }).catch(mErr => console.warn("Memory extract notice:", mErr?.message));

    const isStreaming = Boolean(req.query?.stream === "true" || req.body?.stream === true || (req.headers?.accept && req.headers.accept.includes("text/event-stream")));

    if (isStreaming) {
      res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      if (res.flushHeaders) res.flushHeaders();
      
      res.write(`data: ${JSON.stringify({ type: "start", conversationId: targetConversationId, guestSessionId: effectiveGuestSessionId })}\n\n`);
      if (res.flush) res.flush();
      
      res.write(`data: ${JSON.stringify({ 
        type: "meta", 
        data: { 
          products: finalProducts, 
          coupons: finalCoupons, 
          quickReplies,
          action: triggeredAction
        } 
      })}\n\n`);
      if (res.flush) res.flush();

      res.write(`data: ${JSON.stringify({ type: "chunk", delta: safeFinalText })}\n\n`);
      if (res.flush) res.flush();

      // Save turn to MongoDB
      if (isDbConnected()) {
        try {
          const userMsg = {
            id: "msg_u_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
            sender: "user",
            text: message,
            timestamp: new Date().toISOString()
          };
          const aiMsg = {
            id: "msg_a_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
            sender: "ai",
            text: safeFinalText,
            products: finalProducts,
            coupons: finalCoupons,
            quickReplies,
            requiresHuman: isHumanEscalation,
            timestamp: new Date().toISOString()
          };

          if (existingConv) {
            await AuraAIConversation.findOneAndUpdate(
              { id: targetConversationId },
              {
                $push: { messages: { $each: [userMsg, aiMsg] } },
                $set: {
                  lastMessageAt: new Date().toISOString(),
                  mode: mode || existingConv.mode || "standard"
                },
                $addToSet: {
                  productsRecommended: { $each: finalProducts.map(p => String(p.id)) }
                }
              }
            );
          } else {
            await AuraAIConversation.create({
              id: targetConversationId,
              userId: effectiveUserId,
              guestSessionId: effectiveGuestSessionId,
              ipHash: getHashedIp(req),
              userEmail: effectiveEmail,
              userName: effectiveName,
              mode: mode || "standard",
              title: message.slice(0, 50) + (message.length > 50 ? "..." : ""),
              messages: [userMsg, aiMsg],
              productsRecommended: finalProducts.map(p => String(p.id)),
              lastMessageAt: new Date().toISOString()
            });
          }
        } catch (dbSaveErr) {
          console.warn("DB save error in chatAuraAI stream:", dbSaveErr?.message);
        }
      }

      res.write(`data: ${JSON.stringify({ 
        type: "final", 
        data: { 
          text: safeFinalText, 
          products: finalProducts, 
          coupons: finalCoupons, 
          quickReplies,
          requiresHuman: isHumanEscalation,
          action: triggeredAction,
          conversationId: targetConversationId,
          guestSessionId: effectiveGuestSessionId
        } 
      })}\n\n`);
      res.end();
      return;
    }

    // Standard Non-Streaming Handling
    if (isDbConnected()) {
      try {
        const userMsg = {
          id: "msg_u_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
          sender: "user",
          text: message,
          timestamp: new Date().toISOString()
        };
        const aiMsg = {
          id: "msg_a_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
          sender: "ai",
          text: safeFinalText,
          products: finalProducts,
          coupons: finalCoupons,
          quickReplies,
          requiresHuman: isHumanEscalation,
          timestamp: new Date().toISOString()
        };

        if (existingConv) {
          await AuraAIConversation.findOneAndUpdate(
            { id: targetConversationId },
            {
              $push: { messages: { $each: [userMsg, aiMsg] } },
              $set: {
                lastMessageAt: new Date().toISOString(),
                mode: mode || existingConv.mode || "standard"
              },
              $addToSet: {
                productsRecommended: { $each: finalProducts.map(p => String(p.id)) }
              }
            }
          );
        } else {
          await AuraAIConversation.create({
            id: targetConversationId,
            userId: effectiveUserId,
            guestSessionId: effectiveGuestSessionId,
            ipHash: getHashedIp(req),
            userEmail: effectiveEmail,
            userName: effectiveName,
            mode: mode || "standard",
            title: message.slice(0, 50) + (message.length > 50 ? "..." : ""),
            messages: [userMsg, aiMsg],
            productsRecommended: finalProducts.map(p => String(p.id)),
            lastMessageAt: new Date().toISOString()
          });
        }
      } catch (dbSaveErr) {
        console.warn("DB save error in chatAuraAI non-stream:", dbSaveErr?.message);
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        text: safeFinalText,
        products: finalProducts,
        coupons: finalCoupons,
        quickReplies,
        requiresHuman: isHumanEscalation,
        action: triggeredAction,
        conversationId: targetConversationId,
        guestSessionId: effectiveGuestSessionId
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function getAuraAISettings(req, res, next) {
  try {
    let settings = inMemoryStore.aiSettings || {
      id: "AURA_AI_SETTINGS",
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
      humanSupport: true,
      personalization: true
    };

    if (isDbConnected()) {
      const existing = await AuraAISetting.findOne({ id: "AURA_AI_SETTINGS" }).lean();
      if (existing) settings = existing;
    }

    return res.json({ success: true, data: settings });
  } catch (err) {
    next(err);
  }
}

export async function updateAuraAISettings(req, res, next) {
  try {
    const updateData = pickFields(req.body, AI_SETTING_FIELDS);
    if (!isDbConnected()) {
      inMemoryStore.aiSettings = { ...(inMemoryStore.aiSettings || {}), ...updateData };
      return res.json({ success: true, data: inMemoryStore.aiSettings, message: "Aura AI settings updated successfully." });
    }
    const updated = await AuraAISetting.findOneAndUpdate(
      { id: "AURA_AI_SETTINGS" },
      { $set: updateData },
      { upsert: true, returnDocument: "after" }
    ).lean();
    return res.json({ success: true, data: updated, message: "Aura AI settings updated successfully." });
  } catch (err) {
    next(err);
  }
}

export async function getAuraAIConversations(req, res, next) {
  try {
    const authenticatedUser = req.user || null;
    const clientGuestSessionId = (
      req.headers["x-guest-session-id"] ||
      req.query?.guestSessionId ||
      ""
    ).trim();

    if (!isDbConnected()) {
      let convos = inMemoryStore.aiConversations || [];
      const { isInitialAdmin } = isAdminUser(authenticatedUser || {});
      const isAdmin = isInitialAdmin || (authenticatedUser ? await hasAdminRole(authenticatedUser.authUserId) : false);

      if (!isAdmin) {
        if (authenticatedUser) {
          const scopedEmail = (authenticatedUser.email || "").toLowerCase().trim();
          const scopedId = authenticatedUser.authUserId || "";
          convos = convos.filter(c => 
            (scopedEmail && c.userEmail?.toLowerCase() === scopedEmail) ||
            (scopedId && (c.userId === scopedId || c.authUserId === scopedId))
          );
        } else {
          if (!clientGuestSessionId) {
            return res.json({ success: true, data: [], count: 0 });
          }
          convos = convos.filter(c => c.userId === "guest" && c.guestSessionId === clientGuestSessionId);
        }
      }
      return res.json({ success: true, data: convos, count: convos.length });
    }

    let query = {};
    
    const { isInitialAdmin } = isAdminUser(authenticatedUser || {});
    const isAdmin = isInitialAdmin || (authenticatedUser ? await hasAdminRole(authenticatedUser.authUserId) : false);

    if (!isAdmin) {
      if (authenticatedUser) {
        const scopedEmail = (authenticatedUser.email || "").toLowerCase().trim();
        const scopedId = authenticatedUser.authUserId || "";
        const queryOr = [];
        if (scopedEmail) queryOr.push({ userEmail: scopedEmail });
        if (scopedId) {
          queryOr.push({ userId: scopedId });
          queryOr.push({ authUserId: scopedId });
        }
        query = queryOr.length > 0 ? { $or: queryOr } : { userId: "__none__" };
      } else {
        if (!clientGuestSessionId) {
          return res.json({ success: true, data: [], count: 0 });
        }
        query = { userId: "guest", guestSessionId: clientGuestSessionId };
      }
    }

    const convos = await AuraAIConversation.find(query)
      .select("-ipHash")
      .sort({ updatedAt: -1 })
      .limit(50)
      .lean();

    return res.json({ success: true, data: convos || [], count: (convos || []).length });
  } catch (err) {
    next(err);
  }
}

export async function getAuraAIConversationById(req, res, next) {
  try {
    const { id } = req.params;
    if (!isDbConnected()) {
      const conv = (inMemoryStore.aiConversations || []).find(c => c.id === id);
      if (!conv) {
        return res.status(404).json({ success: false, message: "Conversation not found" });
      }

      const check = await verifyConversationOwnership(conv, req);
      if (!check.allowed) {
        return res.status(check.status || 403).json({ success: false, message: check.message });
      }

      return res.json({ success: true, data: conv });
    }

    const conv = await AuraAIConversation.findOne({ id }).select("-ipHash").lean();
    if (!conv) {
      return res.status(404).json({ success: false, message: "Conversation not found" });
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

export async function deleteAuraAIConversation(req, res, next) {
  try {
    const { id } = req.params;
    if (!isDbConnected()) {
      const idx = (inMemoryStore.aiConversations || []).findIndex(c => c.id === id);
      if (idx >= 0) {
        const conv = inMemoryStore.aiConversations[idx];
        const check = await verifyConversationOwnership(conv, req);
        if (!check.allowed) {
          return res.status(check.status || 403).json({ success: false, message: check.message });
        }
        inMemoryStore.aiConversations.splice(idx, 1);
      }
      return res.json({ success: true, message: "Conversation history removed securely." });
    }

    const conv = await AuraAIConversation.findOne({ id });
    if (!conv) {
      return res.json({ success: true, message: "Conversation already removed." });
    }

    const check = await verifyConversationOwnership(conv, req);
    if (!check.allowed) {
      return res.status(check.status || 403).json({ success: false, message: check.message });
    }

    await AuraAIConversation.deleteOne({ id });
    return res.json({ success: true, message: "Conversation history removed securely." });
  } catch (err) {
    next(err);
  }
}

export async function trackAuraAIAction(req, res, next) {
  try {
    const { conversationId, action, productId, orderId } = req.body;
    if (typeof conversationId !== "string" || !conversationId.trim()) {
      return res.status(400).json({ success: false, message: "conversationId is required" });
    }
    const cleanProduct = typeof productId === "string" ? productId.slice(0, 120) : "";
    const cleanOrder = typeof orderId === "string" ? orderId.slice(0, 120) : "";

    if (!isDbConnected()) {
      const conv = (inMemoryStore.aiConversations || []).find(c => c.id === conversationId);
      if (conv) {
        if (action === "cart" && cleanProduct) {
          conv.addedToCart = Array.from(new Set([...(conv.addedToCart || []), cleanProduct]));
        } else if (action === "click" && cleanProduct) {
          conv.productsClicked = Array.from(new Set([...(conv.productsClicked || []), cleanProduct]));
        } else if (action === "order" && cleanOrder) {
          conv.ordersDiscussed = Array.from(new Set([...(conv.ordersDiscussed || []), cleanOrder]));
        }
      }
      return res.json({ success: true });
    }

    if (action === "cart" && cleanProduct) {
      await AuraAIConversation.findOneAndUpdate(
        { id: conversationId },
        { $addToSet: { addedToCart: cleanProduct } }
      );
    } else if (action === "click" && cleanProduct) {
      await AuraAIConversation.findOneAndUpdate(
        { id: conversationId },
        { $addToSet: { productsClicked: cleanProduct } }
      );
    } else if (action === "order" && cleanOrder) {
      await AuraAIConversation.findOneAndUpdate(
        { id: conversationId },
        { $addToSet: { ordersDiscussed: cleanOrder } }
      );
    } else {
      return res.status(400).json({ success: false, message: "Unsupported action" });
    }

    return res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function getAuraAIAnalytics(req, res, next) {
  try {
    const empty = {
      totalConvos: 0,
      activeUsers: 0,
      recommendedCount: 0,
      cartConversions: 0,
      orderConversions: 0,
      conversionRate: "0.0",
      revenueFromAI: 0,
      escalations: 0,
      topQuestions: [],
      categoryBreakdown: [],
      hasData: false
    };

    let convos = [];
    if (isDbConnected()) {
      try {
        convos = await AuraAIConversation.find().lean();
      } catch (_) {
        convos = [];
      }
    } else {
      convos = inMemoryStore.aiConversations || [];
    }

    if (!convos || convos.length === 0) {
      return res.json({ success: true, data: empty });
    }

    const totalConvos = convos.length;
    const activeUsers = new Set(convos.map(c => c.userId || c.userEmail).filter(Boolean)).size;
    const recommendedCount = convos.reduce((acc, c) => acc + (c.productsRecommended?.length || 0), 0);
    const cartConversions = convos.reduce((acc, c) => acc + (c.addedToCart?.length || 0), 0);
    const escalations = convos.filter(c => c.requiresHumanSupport || c.status === "Escalated").length;

    let orderConversions = 0;
    let revenueFromAI = 0;
    const qualifyingConvos = convos.filter(c => (c.addedToCart || []).length > 0);
    const seenOrderIds = new Set();

    if (qualifyingConvos.length > 0) {
      if (isDbConnected()) {
        const userIds = new Set();
        const userEmails = new Set();
        for (const c of qualifyingConvos) {
          if (c.userId) userIds.add(String(c.userId));
          if (c.userEmail) {
            const rawEm = String(c.userEmail).trim();
            if (rawEm) {
              userEmails.add(rawEm);
              userEmails.add(rawEm.toLowerCase());
            }
          }
        }

        let allOrders = [];
        const orConditions = [];
        if (userIds.size > 0) orConditions.push({ authUserId: { $in: [...userIds] } });
        if (userEmails.size > 0) orConditions.push({ customerEmail: { $in: [...userEmails] } });

        if (orConditions.length > 0) {
          try {
            allOrders = await Order.find({ $or: orConditions, status: { $ne: "Cancelled" } }).lean();
          } catch (ordErr) {
            console.warn("Notice batch fetching orders for AI analytics:", ordErr?.message);
          }
        }

        const ordersByUserId = new Map();
        const ordersByEmail = new Map();
        for (const o of allOrders) {
          if (o.authUserId) {
            const uid = String(o.authUserId);
            if (!ordersByUserId.has(uid)) ordersByUserId.set(uid, []);
            ordersByUserId.get(uid).push(o);
          }
          if (o.customerEmail) {
            const em = String(o.customerEmail).toLowerCase().trim();
            if (!ordersByEmail.has(em)) ordersByEmail.set(em, []);
            ordersByEmail.get(em).push(o);
          }
        }

        for (const c of qualifyingConvos) {
          const cartIds = (c.addedToCart || []).map(String);
          if (!cartIds.length) continue;

          const candidateOrdersSet = new Set();
          if (c.userId && ordersByUserId.has(String(c.userId))) {
            ordersByUserId.get(String(c.userId)).forEach(o => candidateOrdersSet.add(o));
          }
          if (c.userEmail && ordersByEmail.has(String(c.userEmail).toLowerCase().trim())) {
            ordersByEmail.get(String(c.userEmail).toLowerCase().trim()).forEach(o => candidateOrdersSet.add(o));
          }

          for (const o of candidateOrdersSet) {
            if (seenOrderIds.has(o.id)) continue;
            const orderItemIds = (o.items || o.snapshotItems || [])
              .map(it => String(it?.id || it?.productId || ""))
              .filter(Boolean);
            if (orderItemIds.some(pid => cartIds.includes(pid))) {
              seenOrderIds.add(o.id);
              orderConversions += 1;
              revenueFromAI += Number(o.finalAmount || o.total || o.amount) || 0;
            }
          }
        }
      } else {
        for (const c of qualifyingConvos) {
          const cartIds = (c.addedToCart || []).map(String);
          if (!cartIds.length) continue;

          const userOrders = (inMemoryStore.orders || []).filter(o =>
            o.status !== "Cancelled" &&
            ((c.userId && (o.authUserId === c.userId || o.customerAuthUserId === c.userId)) ||
             (c.userEmail && (o.customerEmail === c.userEmail || o.email === c.userEmail)))
          );

          for (const o of userOrders) {
            if (seenOrderIds.has(o.id)) continue;
            const orderItemIds = (o.items || o.snapshotItems || [])
              .map(it => String(it?.id || it?.productId || ""))
              .filter(Boolean);
            if (orderItemIds.some(pid => cartIds.includes(pid))) {
              seenOrderIds.add(o.id);
              orderConversions += 1;
              revenueFromAI += Number(o.finalAmount || o.total || o.amount) || 0;
            }
          }
        }
      }
    }

    const conversionRate = totalConvos > 0 ? (((orderConversions / totalConvos) * 100)).toFixed(1) : "0.0";

    const questionCounts = new Map();
    for (const c of convos) {
      const firstUserMsg = (c.messages || []).find(m => m.sender === "user");
      if (!firstUserMsg) continue;
      const key = String(firstUserMsg.text || "").trim().replace(/\s+/g, " ").slice(0, 70);
      if (!key) continue;
      questionCounts.set(key, (questionCounts.get(key) || 0) + 1);
    }
    const topQuestions = [...questionCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([query, count]) => ({ query, count }));

    const recIds = new Set();
    convos.forEach(c => (c.productsRecommended || []).forEach(id => recIds.add(String(id))));
    let catCounts = {};
    if (recIds.size > 0) {
      try {
        const prods = await Product.find({ id: { $in: [...recIds] } }).lean();
        const prodCatMap = new Map();
        prods.forEach(pr => {
          prodCatMap.set(String(pr.id), pr.category || "Rudraksha");
        });
        convos.forEach(c => {
          (c.productsRecommended || []).forEach(id => {
            const strId = String(id);
            if (prodCatMap.has(strId)) {
              const cat = prodCatMap.get(strId) || "Rudraksha";
              catCounts[cat] = (catCounts[cat] || 0) + 1;
            }
          });
        });
      } catch (_) {}
    }
    const catTotal = Object.values(catCounts).reduce((a, b) => a + b, 0);
    const categoryBreakdown = Object.entries(catCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, n]) => ({ name, percentage: catTotal > 0 ? Math.round((n / catTotal) * 100) : 0 }));

    return res.json({
      success: true,
      data: {
        totalConvos,
        activeUsers,
        recommendedCount,
        cartConversions,
        orderConversions,
        conversionRate,
        revenueFromAI,
        escalations,
        topQuestions,
        categoryBreakdown,
        hasData: true
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function generateProductDescription(req, res, next) {
  try {
    const { name, category, language, details } = req.body;
    if (!name) return res.status(400).json({ success: false, message: "Product name is required" });

    const targetLanguage = language || "English";
    const cleanName = name.trim();

    // Helper: Infer category from title
    const inferCategoryFromTitle = (title) => {
      const lower = title.toLowerCase();
      if (lower.includes("mala") || lower.includes("rosary") || lower.includes("108")) return "Malas";
      if (lower.includes("bracelet") || lower.includes("kada") || lower.includes("wrist")) return "Bracelets";
      if (lower.includes("gauri shankar") || lower.includes("gaurishankar")) return "Gauri Shankar";
      if (lower.includes("puja") || lower.includes("pooja") || lower.includes("samagri") || lower.includes("havan") || lower.includes("incense") || lower.includes("dhoop")) return "Puja Samagri";
      if (lower.includes("crystal") || lower.includes("pyramid") || lower.includes("quartz") || lower.includes("stone") || lower.includes("sphatik") || lower.includes("yantra")) return "Crystals";
      return "Rudraksha";
    };

    const suggestedCategory = category && category !== "Rudraksha" ? category : inferCategoryFromTitle(cleanName);

    // Primary AI Generation using Gemini API (@google/genai)
    const geminiApiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : "";
    if (geminiApiKey) {
      try {
        const ai = new GoogleGenAI({
          apiKey: geminiApiKey,
          httpOptions: { headers: { "User-Agent": "aistudio-build" } }
        });

        const prompt = `Generate a professional, highly readable product description in clean HTML for "${cleanName}" (${suggestedCategory}) in ${targetLanguage}.
Use the following structured headings exactly (enclosed in h2):
<h2>✨ About the Product</h2>
<h2>📿 Product Highlights</h2>
<h2>🌿 Spiritual Significance</h2>
<h2>🙏 Suitable For</h2>
<h2>🕉️ How to Wear & Care</h2>

Output ONLY the pure HTML body itself, no markdown code fences, no extra commentary.`;

        const response = await ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: prompt,
          config: {
            systemInstruction: "You are an expert sales representative and Vedic spiritual guide for Aura Rudraksha. Write persuasive, authentic product descriptions in clean HTML.",
            temperature: 0.7
          }
        });

        let cleanHtml = cleanServerAiText(response.text || "");
        cleanHtml = cleanHtml.replace(/^```(?:html)?\s*/i, "").replace(/\s*```$/i, "").trim();

        if (cleanHtml && cleanHtml.includes("<h2>")) {
          return res.json({ 
            success: true, 
            description: cleanHtml,
            category: suggestedCategory,
            highlight: "100% Consecrated • Authentic Nepal Bead",
            badge: "Best Seller",
            tags: [suggestedCategory, "Authentic", "Consecrated"]
          });
        }
      } catch (geminiErr) {
        console.warn("[Aura AI] Description generation notice:", geminiErr?.message || geminiErr);
      }
    }

    // Secondary AI Generation (NVIDIA NIM fallback)
    const nvidiaApiKey = process.env.NVIDIA_API_KEY ? process.env.NVIDIA_API_KEY.trim() : "";
    if (nvidiaApiKey) {
      try {
        const nimRes = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${nvidiaApiKey}`,
            "Accept": "application/json"
          },
          body: JSON.stringify({
            model: PRIMARY_NIM_MODEL,
            messages: [{
              role: "system",
              content: "You are an expert sales representative and spiritual guide combined. Think independently and creatively to guide the user towards making a purchase. Write persuasive product descriptions."
            }, {
              role: "user",
              content: `Generate a professional, highly readable product description in clean HTML for ${cleanName} (${suggestedCategory}) in ${targetLanguage}.
Use the following structured headings exactly (enclosed in h2):
<h2>✨ About the Product</h2>
<h2>📿 Product Highlights</h2>
<h2>🌿 Spiritual Significance</h2>
<h2>🙏 Suitable For</h2>
<h2>🕉️ How to Wear & Care</h2>

Output ONLY the pure HTML body itself, no markdown code fences.`
            }],
            temperature: 0.7,
            max_tokens: 1000
          })
        });

        if (nimRes.ok) {
          const nimData = await nimRes.json();
          let cleanHtml = (nimData.choices?.[0]?.message?.content || "").replace(/^```(?:html)?\s*/i, "").replace(/\s*```$/i, "").trim();
          if (cleanHtml && cleanHtml.includes("<h2>")) {
            return res.json({ 
              success: true, 
              description: cleanHtml,
              category: suggestedCategory,
              highlight: "100% Consecrated • Authentic Nepal Bead",
              badge: "Best Seller",
              tags: [suggestedCategory, "Authentic", "Consecrated"]
            });
          }
        }
      } catch (nimErr) {
        console.warn("NVIDIA NIM description notice:", nimErr?.message || nimErr);
      }
    }

    // High quality Vedic default description if AI is momentarily unavailable
    const fallbackDesc = `<h2>✨ About the Product</h2><p>Original 100% authentic, lab-certified ${cleanName} sourced directly from high-altitude sacred groves of Nepal.</p><h2>📿 Product Highlights</h2><p>Natural Mukhi lines, X-Ray tested, smooth bead texture, and pre-energized with Vedic Shiva Mantras in Haridwar.</p><h2>🌿 Spiritual Significance</h2><p>Attracts peace, clarity, protection from negative energies, and spiritual awakening.</p><h2>🙏 Suitable For</h2><p>Devotees, professionals, students, and meditation practitioners seeking positivity.</p><h2>🕉️ How to Wear & Care</h2><p>Purify with holy water or raw milk on Monday morning, chant 'Om Namah Shivaya' 108 times, and wear with reverence.</p>`;
    return res.json({
      success: true,
      description: fallbackDesc,
      category: suggestedCategory,
      highlight: "100% Consecrated • Authentic Nepal Bead",
      badge: "Best Seller",
      tags: [suggestedCategory, "Authentic", "Consecrated"]
    });

  } catch (error) {
    console.error("Aura AI Description Generation Error:", error);
    return res.status(500).json({ success: false, message: "AI description could not be generated. Please check AI API configuration." });
  }
}

/**
 * Generate Smart E-Commerce Search Keywords, Tags, Category & Vedic SEO using AI (nemotron-3-super-120b-a12b)
 */
export async function generateProductKeywords(req, res, next) {
  try {
    const { name, category, description, mukhi, origin, details, price, language } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: "Product name is required" });
    }

    const cleanName = name.trim();
    const targetLang = language || "English & Hindi";

    // Auto-infer Mukhi and category baseline
    const mukhiNum = extractMukhiNumber(cleanName);
    const inferredMukhi = mukhiNum ? `${mukhiNum} Mukhi` : (cleanName.toLowerCase().includes("gauri shankar") ? "Gauri Shankar" : (mukhi || ""));
    const inferredOrigin = origin || (cleanName.toLowerCase().includes("indonesia") || cleanName.toLowerCase().includes("java") ? "Java / Indonesia" : "Nepal");

    // Primary AI Generation using Gemini API (@google/genai)
    const geminiApiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : "";
    if (geminiApiKey) {
      try {
        const ai = new GoogleGenAI({
          apiKey: geminiApiKey,
          httpOptions: { headers: { "User-Agent": "aistudio-build" } }
        });

        const prompt = `Generate comprehensive search keywords, phonetic terms, Hinglish synonyms, Hindi translations, tags, and astrological metadata for:
Product Name: "${cleanName}"
Category: "${category || 'Rudraksha'}"
Mukhi/Bead: "${inferredMukhi || 'N/A'}"
Origin: "${inferredOrigin}"
Price: ₹${price || 999}
Details: ${details || description?.replace(/<[^>]*>/g, '').slice(0, 300) || 'Authentic Vedic Sacred Bead'}
Language preference: ${targetLang}

Always respond with a valid, clean JSON object ONLY without markdown code fences:
{
  "keywords": ["keyword 1", "keyword 2", ... 18-25 keywords],
  "tags": ["Tag 1", "Tag 2", ... 6-10 tags],
  "subCategory": "Subcategory name",
  "mukhi": "e.g. 5 Mukhi",
  "rulingPlanet": "e.g. Jupiter (Guru / बृहस्पति)",
  "deity": "e.g. Kalagni Rudra / Lord Shiva",
  "origin": "Nepal",
  "zodiac": ["Sagittarius (धनु)", "Pisces (मीन)"],
  "highlight": "Short 1-line certified highlight badge"
}`;

        const response = await ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            systemInstruction: "You are an elite e-commerce search algorithm architect and Vedic Rudraksha specialist. Generate accurate, high-ranking SEO and astrological metadata.",
            temperature: 0.4
          }
        });

        let rawText = (response.text || "").trim();
        rawText = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (Array.isArray(parsed.keywords) && parsed.keywords.length > 0) {
            return res.json({
              success: true,
              data: {
                keywords: parsed.keywords.map(k => String(k).trim()).filter(Boolean),
                tags: Array.isArray(parsed.tags) ? parsed.tags.map(t => String(t).trim()).filter(Boolean) : ["Lab Certified", "Nepal Origin", "Authentic"],
                subCategory: parsed.subCategory || (inferredMukhi ? "Mukhi Rudraksha Beads" : (category || "Rudraksha")),
                mukhi: parsed.mukhi || inferredMukhi || "",
                rulingPlanet: parsed.rulingPlanet || "",
                deity: parsed.deity || "",
                origin: parsed.origin || inferredOrigin,
                zodiac: Array.isArray(parsed.zodiac) ? parsed.zodiac : [],
                highlight: parsed.highlight || "100% Authentic Nepal Consecrated Bead"
              }
            });
          }
        }
      } catch (geminiErr) {
        console.warn("[Aura AI] Keywords generation notice:", geminiErr?.message || geminiErr);
      }
    }

    // Secondary AI Generation (NVIDIA NIM fallback)
    const nvidiaApiKey = process.env.NVIDIA_API_KEY ? process.env.NVIDIA_API_KEY.trim() : "";
    if (nvidiaApiKey) {
      try {
        const nimRes = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${nvidiaApiKey}`,
            "Accept": "application/json"
          },
          body: JSON.stringify({
            model: PRIMARY_NIM_MODEL,
            messages: [
              {
                role: "system",
                content: `You are an elite e-commerce search algorithm architect and Vedic Rudraksha specialist. 
Your mission is to generate comprehensive search keywords, phonetic terms, Hinglish synonyms, Hindi translations, tags, and astrological metadata to maximize conversion and ensure any search query finds this product.
Think strategically about user search patterns:
1. Exact mukhi / name queries (e.g. "5 mukhi", "5mukhi", "panch mukhi", "panchamukhi")
2. Spelling variations and typos (e.g. "rudraksh", "rudraksha", "rudrakshya", "rudrakshm")
3. Hindi devanagari queries (e.g. "पंचमुखी रुद्राक्ष", "असली नेपाली रुद्राक्ष", "शिव रुद्राक्ष")
4. Benefit/Purpose-driven queries (e.g. "blood pressure bead", "peace of mind", "jupiter guru graha", "meditation mala", "shiva blessing")
5. Origin & Quality keywords (e.g. "nepal origin", "lab certified with certificate", "x-ray tested", "haridwar consecrated")

Always respond with a valid, clean JSON object ONLY without markdown code fences:
{
  "keywords": ["keyword 1", "keyword 2", ... 18-25 keywords],
  "tags": ["Tag 1", "Tag 2", ... 6-10 tags],
  "subCategory": "Subcategory name",
  "mukhi": "e.g. 5 Mukhi",
  "rulingPlanet": "e.g. Jupiter (Guru / बृहस्पति)",
  "deity": "e.g. Kalagni Rudra / Lord Shiva",
  "origin": "Nepal",
  "zodiac": ["Sagittarius (धनु)", "Pisces (मीन)"],
  "highlight": "Short 1-line certified highlight badge"
}`
              },
              {
                role: "user",
                content: `Generate high-ranking search keywords and Vedic product metadata for:
Product Name: "${cleanName}"
Category: "${category || 'Rudraksha'}"
Mukhi/Bead: "${inferredMukhi || 'N/A'}"
Origin: "${inferredOrigin}"
Price: ₹${price || 999}
Details: ${details || description?.replace(/<[^>]*>/g, '').slice(0, 300) || 'Authentic Vedic Sacred Bead'}
Language preference: ${targetLang}`
              }
            ],
            temperature: 0.6,
            max_tokens: 800
          })
        });

        if (nimRes.ok) {
          const nimData = await nimRes.json();
          let rawText = (nimData.choices?.[0]?.message?.content || "").trim();
          rawText = stripThinkingAndReasoning(rawText);
          rawText = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

          const jsonMatch = rawText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (Array.isArray(parsed.keywords) && parsed.keywords.length > 0) {
              return res.json({
                success: true,
                data: {
                  keywords: parsed.keywords.map(k => String(k).trim()).filter(Boolean),
                  tags: Array.isArray(parsed.tags) ? parsed.tags.map(t => String(t).trim()).filter(Boolean) : ["Lab Certified", "Nepal Origin", "Authentic"],
                  subCategory: parsed.subCategory || (inferredMukhi ? "Mukhi Rudraksha Beads" : (category || "Rudraksha")),
                  mukhi: parsed.mukhi || inferredMukhi || "",
                  rulingPlanet: parsed.rulingPlanet || "",
                  deity: parsed.deity || "",
                  origin: parsed.origin || inferredOrigin,
                  zodiac: Array.isArray(parsed.zodiac) ? parsed.zodiac : [],
                  highlight: parsed.highlight || "100% Authentic Nepal Consecrated Bead"
                }
              });
            }
          }
        }
      } catch (nimErr) {
        console.warn("NVIDIA NIM keywords error:", nimErr?.message || nimErr);
      }
    }

    // Direct deterministic fallback if API is unavailable
    const generatedKeywords = [];
    const generatedTags = ["Lab Certified", "Authentic", "Vedic Consecrated", inferredOrigin];
    
    // Split name words
    const nameWords = cleanName.toLowerCase().split(/[\s-]+/).filter(w => w.length > 1);
    generatedKeywords.push(cleanName.toLowerCase());
    if (inferredMukhi) {
      generatedKeywords.push(inferredMukhi.toLowerCase());
      generatedKeywords.push(inferredMukhi.toLowerCase().replace(/\s+/g, ""));
      const num = inferredMukhi.replace(/[^\d]/g, "");
      if (num) {
        const hindiMap = { "1": "ek", "2": "do", "3": "teen", "4": "char", "5": "panch", "6": "cheh", "7": "saat", "8": "aath", "9": "nau", "10": "das", "11": "gyarah", "12": "barah", "13": "terah", "14": "chaudah" };
        const hindiWord = hindiMap[num] || "";
        if (hindiWord) {
          generatedKeywords.push(`${hindiWord} mukhi`);
          generatedKeywords.push(`${hindiWord}mukhi`);
          generatedKeywords.push(`${hindiWord} mukhi rudraksha`);
        }
      }
    }
    generatedKeywords.push("original rudraksha", "nepali rudraksha", "certified rudraksha online", "aura rudraksha", "vedic puja bead");

    return res.json({
      success: true,
      data: {
        keywords: Array.from(new Set(generatedKeywords)),
        tags: generatedTags,
        subCategory: inferredMukhi ? "Mukhi Rudraksha Beads" : (category || "Rudraksha"),
        mukhi: inferredMukhi,
        rulingPlanet: "",
        deity: "Lord Shiva",
        origin: inferredOrigin,
        zodiac: [],
        highlight: "100% Lab Certified Authentic Consecrated Bead"
      }
    });

  } catch (error) {
    console.error("Generate Product Keywords Error:", error);
    return res.status(500).json({ success: false, message: "Could not generate keywords. Please try again." });
  }
}
