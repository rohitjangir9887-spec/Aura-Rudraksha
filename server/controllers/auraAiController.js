import crypto from "crypto";
const requestCounts = new Map();
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
import { defaultProducts, defaultCoupons, defaultSettings, defaultOrders } from "../data/defaultData.js";
import { 
  searchRelevantCatalogProducts, 
  extractMukhiNumber, 
  buildAuthenticVedicResponse, 
  VEDIC_BEADS_KNOWLEDGE 
} from "../services/vedicKnowledgeService.js";

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
const PRIMARY_NIM_MODEL = "nvidia/nemotron-3-super-120b-a12b";
const BACKUP_NIM_MODELS = [
  "meta/llama-3.2-90b-vision-instruct",
  "deepseek-ai/deepseek-v4-flash-0731",
  "mistralai/mistral-nemotron"
];

function getNvidiaClient() {
  const apiKey = process.env.NVIDIA_API_KEY ? process.env.NVIDIA_API_KEY.trim() : "";
  if (!apiKey) return null;
  try {
    return new OpenAI({
      baseURL: "https://integrate.api.nvidia.com/v1",
      apiKey,
      timeout: 15000
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
    stock: Number(p.stock) > 0 ? Number(p.stock) : 50,
    inStock: p.inStock !== false,
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

    // Always ensure catalog and coupons are populated from DB or defaultData fallback
    let products = [];
    let coupons = [];
    let userOrders = [];
    
    if (isDbConnected()) {
      try {
        products = await Product.find({ inStock: { $ne: false } }).lean();
        coupons = await Coupon.find({ status: "Active" }).lean();
        if (userIsAuthenticated && (verifiedUserId || verifiedEmail)) {
          const orderQueries = [];
          if (verifiedUserId) {
            orderQueries.push({ authUserId: verifiedUserId });
            orderQueries.push({ customerAuthUserId: verifiedUserId });
          }
          if (verifiedEmail) {
            orderQueries.push({ customerEmail: verifiedEmail });
            orderQueries.push({ email: verifiedEmail });
          }
          userOrders = await Order.find({ $or: orderQueries }).sort({ createdAt: -1 }).limit(5).lean();
        }
      } catch (err) {
        console.warn("DB fetch error:", err.message);
      }
    }

    if (!products || products.length === 0) {
      products = defaultProducts;
    }
    if (!coupons || coupons.length === 0) {
      coupons = defaultCoupons;
    }

    const intent = detectUserIntent(message);
    const targetMukhi = extractMukhiNumber(message);

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
    const finalCoupons = isCouponAppropriate ? coupons.slice(0, 1) : [];

    const quickReplies = generateDynamicQuickReplies({ userMessage: message, intent, targetMukhi });

    const catalogContext = finalProducts.map(p => ({
      id: p.id,
      name: p.name,
      price: p.price,
      mrp: p.mrp,
      inStock: p.inStock,
      rating: p.rating,
      reviews: p.reviews,
      highlight: p.highlight || ""
    }));

    const ordersContext = userOrders.map(o => ({
      id: o.id || o.orderId,
      status: o.status,
      total: o.total || o.finalAmount,
      date: o.createdAt
    }));

    const isPanditji = mode === "panditji";
    const assistantIdentity = isPanditji
      ? `You are "AI Panditji" (🕉️ AI Panditji), a revered 35+ years experienced Vedic Astrologer, Rudraksha Specialist, and Spiritual Guide for Aura Rudraksha.`
      : `You are "Aura AI", the intelligent Vedic Rudraksha shopping and guidance assistant for Aura Rudraksha.`;

    const systemPrompt = `${assistantIdentity}

${isPanditji ? `TONE & PERSONA (AI PANDITJI MODE):
- Speak with deep respect, spiritual warmth, wisdom, Vedic authority, and humility like a true Acharya.
- Address the user as "Devotee", "Priya Bhaktjan", or "Ji". Start greetings respectfully: "Hari Om 🙏 Pranam Devotee!", "Har Har Mahadev 🕉️", "Jai Shree Krishna 🕉️", or "Radhe Radhe 🚩".
- Provide authentic traditional Jyotish (astrology), Rashi, Nakshatra, Mulank, and Rudraksha Mukhi guidance based on ancient scriptures (Shiva Purana, Padma Purana).
- Whenever a user shares their birth details (Name, Date of Birth, Birth Time, Birth Place, Concern), perform a thorough, respectful Vedic analysis explaining their Rashi, ruling planet, element, recommended Mukhi Rudraksha, Beej Mantra, and Dharan Vidhi.
- Always include traditional Dharan Vidhi (wearing day, auspicious muhurat, Beej Mantra, Gangajal & raw milk purification, and daily Nitya Niyama).
- If the user has not shared their birth details yet, politely invite them to enter their Name, DOB, Time, and Place using the in-chat Birth Details Form.` : `TONE & PERSONA (STANDARD MODE):
- Warm, polite, knowledgeable, concise, and helpful. Answer customer queries directly.`}

PRIVACY & ORDER SUPPORT:
Never reveal another customer's data. Only show authenticated customer's own order details.
Tone: Warm, respectful, spiritual, knowledgeable, premium, trustworthy, helpful, concise.
Strictly NEVER output internal reasoning tags (<think>), JSON code blocks, or chain of thought.

Current Devotee State:
Mode: ${mode}
Authenticated: ${userIsAuthenticated ? verifiedName : "Guest"}
Intent: ${intent}
Target Mukhi/Bead: ${targetMukhi || "General"}
Live Catalog Available: ${JSON.stringify(catalogContext)}
Live Active Coupons: ${JSON.stringify(coupons.map(c => `${c.code} (${c.type === 'percentage' ? c.discount + '%' : '₹' + c.discount} OFF)`))}
Customer Orders: ${JSON.stringify(ordersContext)}`;

    const isStreaming = Boolean(req.query?.stream === "true" || req.body?.stream === true || (req.headers?.accept && req.headers.accept.includes("text/event-stream")));

    if (isStreaming) {
      res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      if (res.flushHeaders) res.flushHeaders();
      
      res.write(`data: ${JSON.stringify({ type: "start", conversationId: targetConversationId, guestSessionId: effectiveGuestSessionId })}\n\n`);
      
      res.write(`data: ${JSON.stringify({ 
        type: "meta", 
        data: { 
          products: finalProducts, 
          coupons: finalCoupons, 
          quickReplies 
        } 
      })}\n\n`);
      if (res.flush) res.flush();

      let fullRawContent = "";
      let generatedViaLLM = false;

      const nvidiaApiKey = process.env.NVIDIA_API_KEY ? process.env.NVIDIA_API_KEY.trim() : "";
      if (nvidiaApiKey) {
        try {
          const formattedMessages = [{ role: "system", content: systemPrompt }];
          for (const h of history.slice(-4)) {
            if (h.sender === "user" && h.text) formattedMessages.push({ role: "user", content: String(h.text) });
            else if (h.sender === "ai" && h.text) formattedMessages.push({ role: "assistant", content: String(h.text) });
          }
          formattedMessages.push({ role: "user", content: message });

          const nimRes = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${nvidiaApiKey}`,
              "Accept": "text/event-stream"
            },
            body: JSON.stringify({
              model: PRIMARY_NIM_MODEL,
              messages: formattedMessages,
              temperature: 0.3,
              max_tokens: 450,
              stream: true,
              chat_template_kwargs: { enable_thinking: false },
              reasoning_effort: "none"
            })
          });

          if (nimRes.ok && nimRes.body) {
            const reader = nimRes.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";

            while (true) {
              const { done, value } = await reader.read();
              if (value) {
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() || "";

                for (const line of lines) {
                  const trimmed = line.trim();
                  if (trimmed.startsWith("data: ") && trimmed !== "data: [DONE]") {
                    try {
                      const parsedJson = JSON.parse(trimmed.slice(6));
                      const deltaObj = parsedJson.choices?.[0]?.delta;
                      if (deltaObj?.reasoning_content || deltaObj?.thinking || deltaObj?.reasoning) continue;
                      const deltaText = deltaObj?.content || "";
                      if (deltaText) {
                        fullRawContent += deltaText;
                        const cleanDelta = cleanServerAiText(deltaText);
                        if (cleanDelta) {
                          res.write(`data: ${JSON.stringify({ type: "chunk", delta: cleanDelta })}\n\n`);
                          if (res.flush) res.flush();
                        }
                      }
                    } catch (_) {}
                  }
                }
              }
              if (done) break;
            }
            if (fullRawContent.trim()) {
              generatedViaLLM = true;
            }
          }
        } catch (nimErr) {
          console.warn("NVIDIA NIM Stream Notice:", nimErr?.message || nimErr);
        }
      }

      if (!generatedViaLLM || !fullRawContent.trim()) {
        const vedicText = buildAuthenticVedicResponse({
          message,
          userIntent: intent,
          products: finalProducts,
          coupons: finalCoupons
        });
        fullRawContent = vedicText;
        res.write(`data: ${JSON.stringify({ type: "chunk", delta: vedicText })}\n\n`);
        if (res.flush) res.flush();
      }

      const safeFinalText = cleanServerAiText(stripInternalJsonFromCustomerText(fullRawContent));

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
            requiresHuman: false,
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
          requiresHuman: false,
          conversationId: targetConversationId,
          guestSessionId: effectiveGuestSessionId
        } 
      })}\n\n`);
      res.end();
      return;
    }

    // Standard Non-Streaming Handling
    let fullRawContent = "";
    let generatedViaLLM = false;

    const nvidiaApiKey = process.env.NVIDIA_API_KEY ? process.env.NVIDIA_API_KEY.trim() : "";
    if (nvidiaApiKey) {
      try {
        const formattedMessages = [{ role: "system", content: systemPrompt }];
        for (const h of history.slice(-4)) {
          if (h.sender === "user" && h.text) formattedMessages.push({ role: "user", content: String(h.text) });
          else if (h.sender === "ai" && h.text) formattedMessages.push({ role: "assistant", content: String(h.text) });
        }
        formattedMessages.push({ role: "user", content: message });

        const nimRes = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${nvidiaApiKey}`,
            "Accept": "application/json"
          },
          body: JSON.stringify({
            model: PRIMARY_NIM_MODEL,
            messages: formattedMessages,
            temperature: 0.3,
            max_tokens: 450,
            chat_template_kwargs: { enable_thinking: false },
            reasoning_effort: "none"
          })
        });

        if (nimRes.ok) {
          const nimData = await nimRes.json();
          fullRawContent = nimData.choices?.[0]?.message?.content || "";
          if (fullRawContent.trim()) generatedViaLLM = true;
        }
      } catch (nimErr) {
        console.warn("NVIDIA NIM Non-Streaming Notice:", nimErr?.message || nimErr);
      }
    }

    if (!generatedViaLLM || !fullRawContent.trim()) {
      fullRawContent = buildAuthenticVedicResponse({
        message,
        userIntent: intent,
        products: finalProducts,
        coupons: finalCoupons
      });
    }

    const safeFinalText = cleanServerAiText(stripInternalJsonFromCustomerText(fullRawContent));

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
          requiresHuman: false,
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
        requiresHuman: false,
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
    let settings = {
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
    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        message: "Database unavailable. Aura AI settings cannot be saved without a connected MongoDB database."
      });
    }
    const updateData = pickFields(req.body, AI_SETTING_FIELDS);
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

    if (isDbConnected()) {
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
    }

    if (process.env.NODE_ENV === "production") {
      return res.status(503).json({
        success: false,
        message: "Database is unavailable."
      });
    }

    return res.json({ success: true, data: [], count: 0, demoMode: true });
  } catch (err) {
    next(err);
  }
}

export async function getAuraAIConversationById(req, res, next) {
  try {
    const { id } = req.params;
    if (isDbConnected()) {
      const conv = await AuraAIConversation.findOne({ id }).select("-ipHash").lean();
      if (!conv) {
        return res.status(404).json({ success: false, message: "Conversation not found" });
      }

      const check = await verifyConversationOwnership(conv, req);
      if (!check.allowed) {
        return res.status(check.status || 403).json({ success: false, message: check.message });
      }

      return res.json({ success: true, data: conv });
    }

    return res.status(503).json({ success: false, message: "Database is unavailable." });
  } catch (err) {
    next(err);
  }
}

export async function deleteAuraAIConversation(req, res, next) {
  try {
    const { id } = req.params;
    if (isDbConnected()) {
      const conv = await AuraAIConversation.findOne({ id });
      if (!conv) {
        return res.json({ success: true, message: "Conversation already removed." });
      }

      const check = await verifyConversationOwnership(conv, req);
      if (!check.allowed) {
        return res.status(check.status || 403).json({ success: false, message: check.message });
      }

      await AuraAIConversation.deleteOne({ id });
    }
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

    if (isDbConnected()) {
      const conv = await AuraAIConversation.findOne({ id: conversationId });
      if (conv) {
        const check = await verifyConversationOwnership(conv, req);
        if (!check.allowed) {
          return res.status(check.status || 403).json({ success: false, message: check.message });
        }
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

    if (!isDbConnected()) {
      return res.json({ success: true, data: empty });
    }

    let convos = [];
    try {
      convos = await AuraAIConversation.find().lean();
    } catch (_) {
      convos = [];
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
    for (const c of qualifyingConvos) {
      const cartIds = (c.addedToCart || []).map(String);
      if (!cartIds.length) continue;
      const scope = [];
      if (c.userId) scope.push({ authUserId: c.userId });
      if (c.userEmail) scope.push({ customerEmail: c.userEmail });
      if (!scope.length) continue;
      const userOrders = await Order.find({ $or: scope, status: { $ne: "Cancelled" } }).lean();
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
        prods.forEach(pr => {
          const cat = pr.category || "Rudraksha";
          catCounts[cat] = (catCounts[cat] || 0) + 1;
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
    const { name, category, price, mrp, stock, language, details } = req.body;
    if (!name) return res.status(400).json({ success: false, message: "Product name is required" });

    const targetLanguage = language || "English";

    const generateAuthenticFallbackHtml = (prodName, prodCat, lang) => {
      const cleanName = prodName.trim();
      const isHindi = lang === "Hindi";
      const isHinglish = lang === "Hinglish";

      if (isHindi) {
        return `<p><strong>${cleanName}</strong> वैदिक परंपरा में एक अत्यंत पवित्र एवं आध्यात्मिक रूप से जागृत स्वरूप माना जाता है। यह मन की शांति, सकारात्मक ऊर्जा और आत्म-संयम को सुदृढ़ करने में सहायक होता है।</p>
<h2>PRODUCT HIGHLIGHTS</h2>
<ul>
  <li>100% प्राकृतिक एवं दुर्लभ मूल नेपाली दाना, स्पष्ट मुखी रेखाओं के साथ।</li>
  <li>प्रेषण से पूर्व प्राचीन वैदिक पद्धति एवं गंगाजल से अभिमंत्रित।</li>
  <li>दैनिक ध्यान, आध्यात्मिक साधना एवं नित्य धारण के लिए उपयुक्त।</li>
  <li>प्राकृतिक शुद्धता एवं बिना किसी रासायनिक रंग के संरक्षित।</li>
</ul>
<h2>ABOUT THE PRODUCT</h2>
<p>यह पवित्र <strong>${cleanName}</strong> हिमालयी क्षेत्र से प्राप्त की जाती है। इसकी प्राकृतिक बनावट और ऊर्जा ध्यान केंद्रित करने, नकारात्मक प्रभावों को दूर करने और आत्मिक संतुलन बनाए रखने में पारंपरिक रूप से सहायक मानी जाती है।</p>
<h2>SUITABLE FOR</h2>
<p>आध्यात्मिक साधकों, विद्यार्थियों, व्यवसायियों एवं गृहस्थों के लिए अत्यंत फलदायी जो जीवन में मानसिक शांति, एकाग्रता और सकारात्मकता की कामना करते हैं।</p>
<h2>HOW TO USE &amp; CARE</h2>
<p>शुभ मुहूर्त अथवा सोमवार को स्नान के उपरांत "ॐ नमः शिवाय" मंत्र के साथ धारण करें। समय-समय पर शुद्ध चंदन अथवा तिल के तेल से हल्का अभ्यंजन करें।</p>
<p><em>यह दिव्य रुद्राक्ष आपके जीवन में सकारात्मकता और शांति का संचार करे।</em></p>`;
      }

      if (isHinglish) {
        return `<p><strong>${cleanName}</strong> ek authentic aur spiritually energized sacred bead hai, jo Vedic shastron mein positivity, inner peace aur spiritual focus ke liye revere kiya jata hai.</p>
<h2>PRODUCT HIGHLIGHTS</h2>
<ul>
  <li>100% Original aur natural seed with authentic natural mukhi lines.</li>
  <li>Disptach se pehle traditional Vedic mantras aur Ganga Jal se consecrated.</li>
  <li>Daily wear, meditation aur positive aura ke liye suitable.</li>
  <li>Pure natural form, without any artificial polish or chemicals.</li>
</ul>
<h2>ABOUT THE PRODUCT</h2>
<p>High-altitude Himalayan regions se ethically collect kiya gaya har ek <strong>${cleanName}</strong> natural density aur symmetry ke sath aata hai. Yeh traditional spiritual practices mein stress release aur emotional balance ke liye beneficial mana jata hai.</p>
<h2>SUITABLE FOR</h2>
<p>Seekers, professionals, students aur devotees jo daily routine mein peace of mind aur focus chahte hain.</p>
<h2>HOW TO USE &amp; CARE</h2>
<p>Shubh din ya Monday morning bath ke baad "Om Namah Shivaya" chant karte hue pehnein. Natural luster maintain karne ke liye occasionally sandalwood ya mustard oil se gently wipe karein.</p>
<p><em>May this sacred blessing bring harmony and grace to your life.</em></p>`;
      }

      return `<p>The <strong>${cleanName}</strong> is revered in ancient Vedic tradition as a sacred spiritual instrument that harmonizes energy, encourages mental clarity, and shields the wearer with positive vibrations.</p>
<h2>PRODUCT HIGHLIGHTS</h2>
<ul>
  <li>100% authentic natural bead with distinct, organically formed contours.</li>
  <li>Consecrated through traditional Vedic rituals and holy water prior to dispatch.</li>
  <li>Ideal for daily spiritual sadhana, mindful living, and sustained focus.</li>
  <li>Preserved in its pure, un-dyed, and chemical-free natural essence.</li>
</ul>
<h2>ABOUT THE PRODUCT</h2>
<p>Ethically gathered from sacred high-altitude Himalayan groves, every <strong>${cleanName}</strong> is chosen for its structural integrity, authentic density, and natural beauty. In classical spiritual heritage, this sacred seed is traditionally associated with calming the restless mind, dissipating stress, and awakening inner discernment.</p>
<h2>SUITABLE FOR</h2>
<p>Spiritual seekers, meditators, students, and professionals seeking emotional grounding, mental resilience, and peaceful mindfulness in their daily journey.</p>
<h2>HOW TO USE &amp; CARE</h2>
<p>Wear as a pendant on silk/cotton thread or keep in your sacred altar space. Cleanse periodically with pure water and gently condition with a drop of natural sandalwood or olive oil to maintain natural vitality.</p>
<p><em>May this sacred blessing bring serenity, protection, and divine grace to your spiritual path.</em></p>`;
    };

    // 1. Production AI Model: NVIDIA NIM
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
              role: "user",
              content: `Generate a product description in clean HTML for ${name} (${category || 'Rudraksha'}) in ${targetLanguage}. Include <p><strong>${name}</strong>...</p>, <h2>PRODUCT HIGHLIGHTS</h2>, <ul><li>...</li></ul>, <h2>ABOUT THE PRODUCT</h2>, <h2>SUITABLE FOR</h2>, <h2>HOW TO USE & CARE</h2>. Output pure HTML only without markdown code fences.`
            }],
            temperature: 0.35,
            max_tokens: 1000,
            chat_template_kwargs: { enable_thinking: false },
            reasoning_effort: "none"
          })
        });

        if (nimRes.ok) {
          const nimData = await nimRes.json();
          let cleanHtml = (nimData.choices?.[0]?.message?.content || "").replace(/^```html\s*/i, "").replace(/\s*```$/i, "").trim();
          if (cleanHtml && cleanHtml.includes("<h2>")) {
            return res.json({ success: true, description: cleanHtml });
          }
        }
      } catch (nimErr) {
        console.warn("NVIDIA NIM description notice:", nimErr?.message || nimErr);
      }
    }

    const fallbackDesc = generateAuthenticFallbackHtml(name, category, targetLanguage);
    return res.json({ success: true, description: fallbackDesc });
  } catch (error) {
    console.error("Aura AI Description Generation Error:", error);
    return res.status(500).json({ success: false, message: "AI description could not be generated. Please try again." });
  }
}
