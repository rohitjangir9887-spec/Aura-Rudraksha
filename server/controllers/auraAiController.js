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
const PRIMARY_NIM_MODEL = "meta/llama-3.3-70b-instruct";
const BACKUP_NIM_MODELS = [
  "nvidia/llama-3.1-nemotron-70b-instruct",
  "meta/llama3-70b-instruct",
  "mistralai/mistral-7b-instruct-v0.2"
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

    // Query catalog and coupons strictly from database
    let products = [];
    let coupons = [];
    let userOrders = [];
    
    if (isDbConnected()) {
      try {
        products = await Product.find({ 
          inStock: { $ne: false },
          status: { $nin: ["Draft", "draft", "Inactive", "inactive", "Archived", "archived"] }
        }).lean();
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
      if (res.flush) res.flush();
      
      res.write(`data: ${JSON.stringify({ type: "status", message: "Checking products..." })}\n\n`);
      if (res.flush) res.flush();

      res.write(`data: ${JSON.stringify({ 
        type: "meta", 
        data: { 
          products: finalProducts, 
          coupons: finalCoupons, 
          quickReplies 
        } 
      })}\n\n`);
      if (res.flush) res.flush();

      res.write(`data: ${JSON.stringify({ type: "status", message: "Finding recommendations..." })}\n\n`);
      if (res.flush) res.flush();

      let fullRawContent = "";
      let generatedViaLLM = false;

      const nvidiaApiKey = process.env.NVIDIA_API_KEY ? process.env.NVIDIA_API_KEY.trim() : "";
      if (nvidiaApiKey) {
        try {
          res.write(`data: ${JSON.stringify({ type: "status", message: "Thinking..." })}\n\n`);
          if (res.flush) res.flush();

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
              max_tokens: 2048,
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
            max_tokens: 2048,
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

    return res.status(503).json({
      success: false,
      message: "Database is unavailable."
    });
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
      return res.status(503).json({
        success: false,
        error: "Database unavailable",
        message: "Database is temporarily unavailable. Please try again shortly."
      });
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

    const generateAuthenticFallbackHtml = (prodName, prodCat, lang) => {
      const isHindi = lang === "Hindi";
      const isHinglish = lang === "Hinglish";

      if (isHindi) {
        return `<h2>✨ About the Product</h2>
<p>पवित्र <strong>${cleanName}</strong> हिमालय के पावन क्षेत्रों से प्राप्त एक दिव्य आध्यात्मिक साधन है। यह नकारात्मक ऊर्जाओं को नष्ट करने, मन को शांत करने और सकारात्मकता का संचार करने में सहायक होता है।</p>

<h2>📿 Product Highlights</h2>
<ul>
  <li><strong>100% प्राकृतिक:</strong> प्राकृतिक रूप से निर्मित गहरी एवं स्पष्ट रेखाएं।</li>
  <li><strong>गंगाजल अभिषेक:</strong> प्रेषण से पूर्व गंगाजल से शुद्ध एवं सिद्ध किया गया।</li>
  <li><strong>आध्यात्मिक ऊर्जा:</strong> पूजा, ध्यान और नित्य धारण के लिए अत्यंत शुभ।</li>
  <li><strong>पूर्ण शुद्धता:</strong> किसी भी कृत्रिम रंग, रसायन या पॉलिश से रहित।</li>
</ul>

<h2>🌿 Spiritual Significance</h2>
<p>शास्त्रों के अनुसार, यह दिव्य उत्पाद हमारे ऊर्जा केंद्रों (चक्रों) को संतुलित करता है और धारण करने वाले के चारों ओर सकारात्मकता का सुरक्षा कवच (Aura) प्रदान करता है।</p>

<h2>🙏 Suitable For</h2>
<p>यह विद्यार्थियों, गृहस्थों, आध्यात्मिक साधकों और पेशेवरों के लिए अत्यंत लाभदायक है, जो जीवन में मानसिक शांति, ध्यान, एकाग्रता और दिव्य सुरक्षा चाहते हैं।</p>

<h2>🕉️ How to Wear & Care</h2>
<p>शुभ सोमवार को प्रातः स्नान के पश्चात पूर्व या उत्तर दिशा की ओर मुख करके <strong>"ॐ नमः शिवाय"</strong> मंत्र का 108 बार जाप करते हुए धारण करें। महीने में एक बार शुद्ध जल से धोएं और हल्का चंदन का तेल लगाएं।</p>`;
      }

      if (isHinglish) {
        return `<h2>✨ About the Product</h2>
<p>Pavitra <strong>${cleanName}</strong> ek authentic aur spiritually energized sacred spiritual product hai. Yeh Himalayan high-altitude regions se ethically collect kiya jata hai aur iska primary purpose mind ko calm karna aur energy level ko elevate karna hai.</p>

<h2>📿 Product Highlights</h2>
<ul>
  <li><strong>100% Original:</strong> Naturally crafted high vibration spiritual item.</li>
  <li><strong>Vedic Consecration:</strong> Dispatch se pehle Ganga Jal aur sacred mantras se energize kiya jata hai.</li>
  <li><strong>Daily Sadhana:</strong> Pooja, meditation aur daily wear ke liye highly recommended.</li>
  <li><strong>Pure Form:</strong> No artificial colors, polish, or synthetic chemicals used.</li>
</ul>

<h2>🌿 Spiritual Significance</h2>
<p>Vedic tradition ke mutabik, yeh item wearer ke chakra energy ko balance karta hai aur aspas ke negative vibrations ko dur rakh kar ek positive Aura create karta hai.</p>

<h2>🙏 Suitable For</h2>
<p>Yeh students, professionals, spiritual seekers aur devotees sabhi ke liye suitable hai jo stressful life mein focus, emotional balance aur dynamic protection chahte hain.</p>

<h2>🕉️ How to Wear & Care</h2>
<p>Kisi bhi Monday morning ko naha kar East ya North direction face karke <strong>"Om Namah Shivaya"</strong> beej mantra ka 108 baar chant karke pehnein/sthapit karein. Month mein ek baar gentle water se wash karein.</p>`;
      }

      return `<h2>✨ About the Product</h2>
<p>The sacred <strong>${cleanName}</strong> is a genuine, high-vibration spiritual instrument ethically gathered from pristine Himalayan heights. Worn worldwide to invite divine peace, shield against negative energies, and align the wearer's subtle energy centers.</p>

<h2>📿 Product Highlights</h2>
<ul>
  <li><strong>100% Genuine Origin:</strong> Features naturally formed high-vibration spiritual craftsmanship.</li>
  <li><strong>Vedic Consecration:</strong> Consecrated with holy Ganga Jal and Vedic mantras before shipping.</li>
  <li><strong>Spiritual Sadhana:</strong> Ideal for meditation, mindfulness, and promoting inner peace.</li>
  <li><strong>Ethical Preservation:</strong> Unaltered, pure, and free of synthetic polishes or chemical treatments.</li>
</ul>

<h2>🌿 Spiritual Significance</h2>
<p>In Vedic heritage, sacred spiritual items serve as an emotional grounding shield, helping harmonize personal bio-frequencies and expanding inner spiritual consciousness.</p>

<h2>🙏 Suitable For</h2>
<p>Highly beneficial for spiritual seekers, meditators, students, and professionals seeking clarity of thought, stress reduction, and positive aura protection.</p>

<h2>🕉️ How to Wear & Care</h2>
<p>Wear or place on any auspicious morning facing East or North. Chant the sacred mantra <strong>"Om Namah Shivaya"</strong> 108 times. Cleanse monthly with pure water and condition gently with sandalwood oil.</p>`;
    };

    // 1. Primary AI Model: NVIDIA NIM
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
              content: `Generate a professional, highly readable product description in clean HTML for ${cleanName} (${suggestedCategory}) in ${targetLanguage}.
Use the following structured headings exactly (enclosed in h2):
<h2>✨ About the Product</h2>
<h2>📿 Product Highlights</h2>
<h2>🌿 Spiritual Significance</h2>
<h2>🙏 Suitable For</h2>
<h2>🕉️ How to Wear & Care</h2>

Output ONLY the pure HTML body itself, no markdown code fences.`
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

    // 3. Fallback
    const fallbackDesc = generateAuthenticFallbackHtml(cleanName, suggestedCategory, targetLanguage);
    return res.json({ 
      success: true, 
      description: fallbackDesc,
      category: suggestedCategory,
      highlight: "100% Original & Consecrated with Ganga Jal",
      badge: "Best Seller",
      tags: [suggestedCategory, "Authentic", "Consecrated"]
    });
  } catch (error) {
    console.error("Aura AI Description Generation Error:", error);
    return res.status(500).json({ success: false, message: "AI description could not be generated. Please try again." });
  }
}
