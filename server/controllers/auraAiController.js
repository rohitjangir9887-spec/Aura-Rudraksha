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

const AI_SETTING_FIELDS = {
  enabled: "bool", showFloatingButton: "bool", showHeaderButton: "bool",
  language: "string", tone: "string", greeting: "string",
  recommendProducts: "bool", recommendOffers: "bool", cartActions: "bool",
  orderSupport: "bool", humanSupport: "bool", personalization: "bool"
};
import { defaultProducts, defaultCoupons, defaultSettings, defaultOrders } from "../data/defaultData.js";

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

// Single production AI provider configuration: NVIDIA NIM (Ultra-fast low-latency models)
const PRIMARY_NIM_MODEL = "nvidia/nemotron-3-super-120b-a12b";
const BACKUP_NIM_MODELS = [
  "meta/llama-3.2-90b-vision-instruct",
  "deepseek-ai/deepseek-v4-flash-0731",
  "mistralai/mistral-nemotron"
];

// Helper for NVIDIA NIM AI client initialization
function getNvidiaClient() {
  const apiKey = process.env.NVIDIA_API_KEY ? process.env.NVIDIA_API_KEY.trim() : "";
  if (!apiKey) return null;
  try {
    return new OpenAI({
      baseURL: "https://integrate.api.nvidia.com/v1",
      apiKey,
      timeout: 15000 // 15 second timeout
    });
  } catch (err) {
    console.warn("Could not initialize NVIDIA NIM Client:", err?.message || err);
    return null;
  }
}

// Format product object with real catalog image, price, and attributes
function formatProductForResponse(p) {
  if (!p) return null;
  const img = (p.images && p.images.length > 0 && p.images[0]) || p.img || p.image || "";
  const price = Number(p.price) || 0;
  const comparePrice = Number(p.comparePrice || p.mrp || Math.round(price * 1.3));
  const mrp = Number(p.mrp || comparePrice || Math.round(price * 1.3));
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
    images: p.images && p.images.length > 0 ? p.images : (img ? [img] : []),
    img: img,
    category: p.category || "Rudraksha",
    rating: Number(p.rating) || 4.9,
    reviews: Number(p.reviews || p.reviewCount) || 24,
    stock: Number(p.stock) || 50,
    badge: p.badge || (discount >= 30 ? "Best Seller" : "Popular"),
    highlight: p.highlight || ""
  };
}

// Helper to sanitize customer-facing text on the server
function cleanServerAiText(raw) {
  if (!raw || typeof raw !== "string") return "";
  let text = raw.trim();
  // Strip code fences
  text = text.replace(/^```(?:json|markdown)?\s*/i, "").replace(/\s*```$/i, "").trim();
  // Protect admin details
  text = text.replace(/rohitjangir\d*@gmail\.com/gi, "support@aurarudraksha.com");
  text = text.replace(/MONGODB_[A-Z0-9_]+/gi, "");
  text = text.replace(/GEMINI_API_[A-Z0-9_]+/gi, "");
  text = text.replace(/NVIDIA_API_[A-Z0-9_]+/gi, "");
  // Clean raw markdown heading markers
  text = text.replace(/^#{1,6}\s+/gm, "");
  return text;
}

// Intent Classification Layer
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
    if (before && inner && before !== inner) return `${before}

${inner}`.trim();
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
  
  if (/(fayde|fayda|benefits|what is good|why should|profit|use of|what does|meaning of|kya hota|kaise madad|labh)/i.test(msg)) {
    intents.push("BENEFITS");
  }
  if (/(dikhao|chahiye|need|want|show|buy|purchase|looking for|mere liye sahi|suggest|recommend|which rudraksha|order karna hai|order krna|mangwana)/i.test(msg)) {
    if (msg.includes("order karna") || msg.includes("order krna") || msg.includes("mangwana")) {
      intents.push("CHECKOUT");
    } else {
      intents.push(msg.includes("mere liye sahi") || msg.includes("suggest") || msg.includes("recommend") ? "PRODUCT_RECOMMENDATION" : "PRODUCT_SEARCH");
    }
  }
  if (/(price|cost|rate|kitne ka|bhav|rupees|amount|under|budget|₹|sasta|mehenga)/i.test(msg)) {
    intents.push("PRICE");
  }
  if (/(offer|discount|deal|sale)/i.test(msg)) {
    intents.push("OFFER");
  }
  if (/(coupon|promo|code)/i.test(msg)) {
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
  if (/(shipping|deliver|dispatch|bhej|kab aayega|how many days)/i.test(msg)) {
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
  if (/(hi|hello|hey|namaste|pranam|radhe|har har|prabhat|kaise ho)/i.test(msg) && msg.length < 25) {
    intents.push("GREETING");
  }
  if (/(customer care|support|human|agent|baat karni|phone|contact|number|helpline|help|şikayat)/i.test(msg)) {
    intents.push("GENERAL_SUPPORT");
  }
  if (/(mukhi)/i.test(msg) && !intents.includes("PRODUCT_SEARCH") && !intents.includes("BENEFITS")) {
     intents.push("PRODUCT_INFO");
  }
  
  if (intents.length === 0) return "UNKNOWN";
  
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

function generateDynamicQuickReplies({ userMessage, intent }) {
  const msgLower = (userMessage || "").toLowerCase();
  const replies = [];
  
  if (msgLower.includes("13 mukhi") && (msgLower.includes("fayde") || msgLower.includes("benefit"))) {
    replies.push("13 Mukhi Price", "13 Mukhi Dekhein", "Kaise Pehne", "Order Karein");
  } else if (msgLower.includes("1000") && (msgLower.includes("andar") || msgLower.includes("under") || msgLower.includes("kam"))) {
    replies.push("5 Mukhi Dekhein", "7 Mukhi Dekhein", "Best Seller", "Compare Products");
  } else if (msgLower.includes("mera order kaha hai") || intent === "ORDER_TRACKING") {
    replies.push("Track Order", "Order History", "Shipping Help");
  } else if (msgLower.includes("coupon hai") || intent === "COUPON" || intent === "OFFER") {
    replies.push("Today's Offers", "Available Coupons", "Apply Coupon");
  } else if (intent === "BENEFITS") {
    let m = msgLower.match(/(\d+)\s*mukhi/);
    if (m) {
      replies.push(`${m[1]} Mukhi Price`, `${m[1]} Mukhi Dekhein`, "Kaise Pehne", "Order Karein");
    } else {
      replies.push("Check Price", "View Products", "How to Wear");
    }
  } else if (intent === "PRODUCT_SEARCH" || intent === "PRODUCT_INFO") {
    let m = msgLower.match(/(\d+)\s*mukhi/);
    if (m) {
      replies.push(`${m[1]} Mukhi Details`, `Buy ${m[1]} Mukhi`, "Compare Products");
    } else {
      replies.push("Best Sellers", "Shop by Rashi", "Offers");
    }
  } else if (intent === "CHECKOUT" || intent === "CART") {
     replies.push("Confirm Order", "Apply Coupon", "Change Address");
  } else if (intent === "GREETING") {
     replies.push("5 Mukhi Rudraksha", "Find by Rashi", "Today's Offers", "Track Order");
  } else {
     replies.push("Talk to Support", "Explore Catalog", "Offers", "Find Rudraksha");
  }
  
  return Array.from(new Set(replies)).slice(0, 4);
}


function searchRelevantProducts(message, products) {
  const msgLower = message.toLowerCase();
  
  let scored = products.map(p => {
    let score = 0;
    const nameLower = (p.name || "").toLowerCase();
    
    const mukhiMatch = msgLower.match(/(\d+)\s*mukhi/);
    if (mukhiMatch) {
      if (nameLower.includes(`${mukhiMatch[1]} mukhi`)) score += 100;
    }
    
    if (msgLower.includes("1000") && (msgLower.includes("under") || msgLower.includes("andar") || msgLower.includes("kam"))) {
      if (p.price <= 1000) score += 50;
      else score -= 100;
    }

    if (msgLower.includes("sasta") || msgLower.includes("cheap")) {
      if (p.price < 1500) score += 30;
    }

    if (msgLower.includes("mesh") || msgLower.includes("aries")) { if (nameLower.includes("3 mukhi")) score += 40; }
    if (msgLower.includes("mithun") || msgLower.includes("gemini") || msgLower.includes("kanya")) { if (nameLower.includes("4 mukhi")) score += 40; }
    if (msgLower.includes("kark") || msgLower.includes("cancer")) { if (nameLower.includes("2 mukhi")) score += 40; }
    if (msgLower.includes("singh") || msgLower.includes("leo")) { if (nameLower.includes("1 mukhi") || nameLower.includes("12 mukhi")) score += 40; }
    if (msgLower.includes("dhanu") || msgLower.includes("sagittarius") || msgLower.includes("meen") || msgLower.includes("pisces")) { if (nameLower.includes("5 mukhi")) score += 40; }
    if (msgLower.includes("makar") || msgLower.includes("capricorn") || msgLower.includes("kumbh") || msgLower.includes("aquarius")) { if (nameLower.includes("7 mukhi") || nameLower.includes("14 mukhi")) score += 40; }

    score += (p.rating || 4.5) * 2;
    return { product: p, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.filter(s => s.score > 10).map(s => s.product).slice(0, 3);
}

export async function chatAuraAI(req, res, next) {
  try {
    const { message, conversationId = "guest", userEmail, userName, history = [] } = req.body;
    
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

    const intent = detectUserIntent(message);
    let relevantProducts = [];
    if (["PRODUCT_SEARCH", "PRODUCT_RECOMMENDATION", "BENEFITS", "PRICE", "CHECKOUT", "PRODUCT_INFO"].includes(intent)) {
      relevantProducts = searchRelevantProducts(message, products);
    }
    
    let contextualProducts = [...relevantProducts];
    if (contextualProducts.length === 0 && history.length > 0) {
       const lastUserMsgs = history.filter(h => h.sender === 'user').slice(-2).map(h => h.text).join(" ");
       if (lastUserMsgs) {
         contextualProducts = searchRelevantProducts(lastUserMsgs + " " + message, products);
       }
    }

    const quickReplies = generateDynamicQuickReplies({ userMessage: message, intent });
    
    const catalogContext = contextualProducts.map(p => ({
      id: String(p.id || p._id),
      name: p.name,
      price: p.price,
      mrp: p.comparePrice || Math.round(p.price * 1.3),
      inStock: p.inStock !== false,
      rating: p.rating || 4.5,
      reviews: p.reviewsCount || 10,
      description: (p.description || "").substring(0, 100)
    }));

    const ordersContext = userOrders.map(o => ({
      id: o.id || o.orderId,
      status: o.status,
      total: o.total,
      date: o.createdAt
    }));

    const systemPrompt = `You are Aura AI, a premium spiritual ecommerce assistant for Aura Rudraksha.
Your core behavior:
1. Short, Natural & Human-like: Answer concisely. Do NOT write long paragraphs. Do NOT repeat "Namaste, Main Aura AI hoon".
2. Multilingual: Understand English, Hindi, and Hinglish perfectly. Reply in the same language/tone as the user.
3. Order Flow Guidance: If the user wants to place an order, guide them step-by-step. Do NOT ask for credit card numbers. Tell them you will show the product card below to add to cart.
4. Memory: Contextualize queries (e.g. if they just asked about 5 mukhi, and now say "under 1000", combine them).
5. Accurate Website Data: Use the provided context precisely. Never invent products, prices, or orders.

Current User Intent: ${intent}
Authenticated Customer: ${userIsAuthenticated ? verifiedName : "Guest (Not logged in)"}
Customer Orders (Auth-Only): ${JSON.stringify(ordersContext)}
Relevant Catalog Products Found: ${JSON.stringify(catalogContext)}
Active Coupons: ${JSON.stringify(coupons.map(c => c.code + " - " + c.discount))}

Instructions:
- If user asks about their order, only use the 'Customer Orders' context. If they are Guest, ask them to log in. NEVER invent an order.
- If user asks for 13 mukhi fayde, give a concise 2-line answer about benefits, do NOT dump products unless they also want to buy.
- Answer the user DIRECTLY in pure text. NO markdown code blocks. NO json wrappers. JUST TEXT.`;

    const formattedMessages = [{ role: "system", content: systemPrompt }];
    for (const h of history.slice(-4)) {
      if (h.sender === "user" && h.text) formattedMessages.push({ role: "user", content: String(h.text) });
      else if (h.sender === "ai" && h.text) formattedMessages.push({ role: "assistant", content: String(h.text) });
    }
    formattedMessages.push({ role: "user", content: message });

    const nvidiaApiKey = process.env.NVIDIA_API_KEY ? process.env.NVIDIA_API_KEY.trim() : "";
    
    const isStreaming = Boolean(req.query?.stream === "true" || req.body?.stream === true || (req.headers?.accept && req.headers.accept.includes("text/event-stream")));
    
    if (isStreaming) {
      res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      if (res.flushHeaders) res.flushHeaders();
      res.write(`data: ${JSON.stringify({ type: "start", conversationId })}\n\n`);

      if (!nvidiaApiKey) {
        const fallbackText = "Namaste! Main abhi thoda maintainance mein hoon, please support se contact karein.";
        res.write(`data: ${JSON.stringify({ type: "chunk", delta: fallbackText })}\n\n`);
        res.write(`data: ${JSON.stringify({ type: "final", data: { text: fallbackText, products: [], coupons: [], quickReplies } })}\n\n`);
        res.end();
        return;
      }

      let fullRawContent = "";
      try {
        const nimRes = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${nvidiaApiKey}`,
            "Accept": "text/event-stream"
          },
          body: JSON.stringify({
            model: "nvidia/nemotron-3-super-120b-a12b",
            messages: formattedMessages,
            temperature: 0.3,
            max_tokens: 300,
            stream: true
          })
        });

        if (nimRes.ok && nimRes.body) {
          const reader = nimRes.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed.startsWith("data: ") && trimmed !== "data: [DONE]") {
                try {
                  const parsedJson = JSON.parse(trimmed.slice(6));
                  const delta = parsedJson.choices?.[0]?.delta?.content || "";
                  if (delta) {
                    fullRawContent += delta;
                    res.write(`data: ${JSON.stringify({ type: "chunk", delta })}\n\n`);
                    if (res.flush) res.flush();
                  }
                } catch (_) {}
              }
            }
          }
        } else {
            const fallbackText = "Kshama karein, connection thoda slow hai.";
            res.write(`data: ${JSON.stringify({ type: "chunk", delta: fallbackText })}\n\n`);
            fullRawContent = fallbackText;
        }
      } catch (err) {
        console.error("NIM Exception:", err.message);
      }

      const finalProducts = contextualProducts.slice(0, 3).map(p => ({
        id: String(p._id || p.id),
        name: p.name,
        price: p.price,
        comparePrice: p.comparePrice || Math.round(p.price * 1.3),
        images: p.images || (p.image ? [p.image] : []),
        image: p.image || (p.images && p.images[0]) || "",
        rating: p.rating || 4.5,
        reviewsCount: p.reviewsCount || 10,
        inStock: p.inStock !== false,
        slug: p.slug
      }));
      
      const finalCoupons = intent === "COUPON" || intent === "OFFER" ? coupons.slice(0, 2) : [];

      res.write(`data: ${JSON.stringify({ 
        type: "final", 
        data: { 
          text: fullRawContent, 
          products: finalProducts, 
          coupons: finalCoupons, 
          quickReplies,
          requiresHuman: false
        } 
      })}

`);
      res.end();
      return;
    }

    return res.status(200).json({ success: true, text: "Streaming required", products: [], quickReplies: [] });
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

// PUT /api/aura-ai/settings (Admin Protected)
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

// GET /api/aura-ai/conversations (User or Admin)
export async function getAuraAIConversations(req, res, next) {
  try {
    const authenticatedUser = req.user || null;

    if (isDbConnected()) {
      let query = {};
      
      // Determine if requester is an admin on the server side (normalized phone match + DB role)
      const { isInitialAdmin } = isAdminUser(authenticatedUser || {});
      const isAdmin = isInitialAdmin || (authenticatedUser ? await hasAdminRole(authenticatedUser.authUserId) : false);

      if (!isAdmin) {
        if (!authenticatedUser) {
          // Unauthenticated guest can only view their specific conversation if id provided
          return res.json({ success: true, data: [], count: 0 });
        }
        const scopedEmail = (authenticatedUser.email || "").toLowerCase();
        const scopedId = authenticatedUser.authUserId || "";
        const queryOr = [];
        if (scopedEmail) queryOr.push({ userEmail: scopedEmail });
        if (scopedId) {
          queryOr.push({ userId: scopedId });
          queryOr.push({ authUserId: scopedId });
        }
        query = queryOr.length > 0 ? { $or: queryOr } : { userId: "__none__" };
      }

      const convos = await AuraAIConversation.find(query).sort({ updatedAt: -1 }).limit(50).lean();
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

// GET /api/aura-ai/conversations/:id (owner or admin only)
export async function getAuraAIConversationById(req, res, next) {
  try {
    const { id } = req.params;
    const authenticatedUser = req.user || null;

    if (!authenticatedUser) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }
    if (isDbConnected()) {
      const conv = await AuraAIConversation.findOne({ id }).lean();
      if (!conv) {
        return res.status(404).json({ success: false, message: "Conversation not found" });
      }

      // Owner or server-side admin only
      const { isInitialAdmin } = isAdminUser(authenticatedUser);
      const isAdmin = isInitialAdmin || (await hasAdminRole(authenticatedUser.authUserId));
      const isOwner =
        (conv.userId && conv.userId === authenticatedUser.authUserId) ||
        (conv.authUserId && conv.authUserId === authenticatedUser.authUserId) ||
        (authenticatedUser.email && conv.userEmail && conv.userEmail.toLowerCase() === authenticatedUser.email.toLowerCase());
      if (!isAdmin && !isOwner) {
        return res.status(403).json({ success: false, message: "Access Denied: You do not own this conversation" });
      }

      return res.json({ success: true, data: conv });
    }

    return res.status(503).json({ success: false, message: "Database is unavailable." });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/aura-ai/conversations/:id (Privacy compliance)
export async function deleteAuraAIConversation(req, res, next) {
  try {
    const { id } = req.params;
    const authenticatedUser = req.user || null;

    if (!authenticatedUser) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }
    if (isDbConnected()) {
      const conv = await AuraAIConversation.findOne({ id });
      if (!conv) {
        return res.json({ success: true, message: "Conversation already removed." });
      }

      const { isInitialAdmin } = isAdminUser(authenticatedUser);
      const isAdmin = isInitialAdmin || (await hasAdminRole(authenticatedUser.authUserId));
      const isOwner =
        (conv.userId && conv.userId === authenticatedUser.authUserId) ||
        (conv.authUserId && conv.authUserId === authenticatedUser.authUserId) ||
        (authenticatedUser.email && conv.userEmail && conv.userEmail.toLowerCase() === authenticatedUser.email.toLowerCase());
      if (!isAdmin && !isOwner) {
        return res.status(403).json({ success: false, message: "Access Denied: You cannot delete this conversation" });
      }

      await AuraAIConversation.deleteOne({ id });
    }
    return res.json({ success: true, message: "Conversation history removed securely." });
  } catch (err) {
    next(err);
  }
}

// POST /api/aura-ai/track-action (Log clicked product, add to cart from AI)
export async function trackAuraAIAction(req, res, next) {
  try {
    const { conversationId, action, productId, orderId } = req.body;
    if (typeof conversationId !== "string" || !conversationId.trim()) {
      return res.status(400).json({ success: false, message: "conversationId is required" });
    }
    const cleanProduct = typeof productId === "string" ? productId.slice(0, 120) : "";
    const cleanOrder = typeof orderId === "string" ? orderId.slice(0, 120) : "";

    if (isDbConnected()) {
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

// GET /api/aura-ai/analytics (Admin Insights - real data only)
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

    // ---- AI-attributed orders (real orders, not estimates) ----
    // A conversation qualifies when the user added at least one AI-recommended
    // product to cart; an order is attributed when the same customer ordered
    // at least one of those products afterwards.
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

    // ---- Top real questions (first user message per conversation) ----
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

    // ---- Category breakdown from real recommended products ----
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

    const nvidiaApiKey = process.env.NVIDIA_API_KEY ? process.env.NVIDIA_API_KEY.trim() : "";
    const targetLanguage = language || "English";

    // High quality Vedic / Spiritual knowledge helper for resilient fallback or enrichment
    const generateAuthenticFallbackHtml = (prodName, prodCat, lang) => {
      const cleanName = prodName.trim();
      const isHindi = lang === "Hindi";
      const isHinglish = lang === "Hinglish";

      if (isHindi) {
        return `<p><strong>${cleanName}</strong> वैदिक परंपरा में एक अत्यंत पवित्र एवं आध्यात्मिक रूप से जागृत स्वरूप माना जाता है। यह मन की शांति, सकारात्मक ऊर्जा और आत्म-संयम को सुदृढ़ करने में सहायक होता है।</p>
<h2>PRODUCT HIGHLIGHTS</h2>
<ul>
  <li>100% प्राकृतिक एवं दुर्लभ मूल दाना, स्पष्ट मुखी रेखाओं के साथ।</li>
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

      // Default English
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

    if (!nvidiaApiKey) {
      console.warn("NVIDIA API key not found in env, using authentic Vedic template generator.");
      const fallbackDesc = generateAuthenticFallbackHtml(name, category, targetLanguage);
      return res.json({ success: true, description: fallbackDesc });
    }

    const systemPrompt = `You are the lead Vedic scholar and product specialist for "Aura Rudraksha", a luxury, authentic spiritual brand.
Your task is to generate complete, elegant, culturally respectful, and complete product descriptions formatted in clean HTML for the rich-text editor (Tiptap).

CRITICAL RULES:
1. Output ONLY clean HTML with tags: <p>, <h2>, <ul>, <li>, <strong>, <em>.
2. DO NOT output Markdown syntax (never output **text**, ## Heading, or markdown bullets).
3. DO NOT invent fake lab names, medical cures, or guarantee miraculous physical/financial outcomes. Use respectful traditional terminology (e.g. "traditionally associated with", "revered in classical tradition for").
4. ALWAYS complete all sections in full (150 to 250 words total). Never output unfinished or truncated sentences.
5. Highlight the product title "${name}" inside <strong> tags in the opening paragraph.
6. The structure MUST contain:
   <p>[Opening introductory paragraph highlighting <strong>${name}</strong>]</p>
   <h2>PRODUCT HIGHLIGHTS</h2>
   <ul>
     <li>[Bullet 1]</li>
     <li>[Bullet 2]</li>
     <li>[Bullet 3]</li>
     <li>[Bullet 4]</li>
   </ul>
   <h2>ABOUT THE PRODUCT</h2>
   <p>[1-2 paragraphs detailing authentic spiritual background and natural characteristics]</p>
   <h2>SUITABLE FOR</h2>
   <p>[Who should wear/choose this item]</p>
   <h2>HOW TO USE &amp; CARE</h2>
   <p>[Care instructions, purification, and wearing guidance]</p>
   <p><em>[Short graceful closing blessing]</em></p>`;

    const userPrompt = `Product Name: ${name}
Category: ${category || 'Rudraksha'}
Language: ${targetLanguage}
Additional Context: ${details || 'Sacred natural bead consecrated for spiritual practice'}

Generate the complete HTML product description now:`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 18000);

    try {
      const nimRes = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + nvidiaApiKey,
          "Accept": "application/json"
        },
        body: JSON.stringify({
          model: PRIMARY_NIM_MODEL,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          temperature: 0.35,
          max_tokens: 1400
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!nimRes.ok) {
        const errText = await nimRes.text();
        console.warn("NVIDIA NIM API responded with non-200, generating verified authentic description:", errText);
        const fallback = generateAuthenticFallbackHtml(name, category, targetLanguage);
        return res.json({ success: true, description: fallback });
      }

      const nimData = await nimRes.json();
      let aiContent = nimData.choices?.[0]?.message?.content || "";
      
      // Clean up code fences or json wrapper if model accidentally included them
      aiContent = aiContent
        .replace(/^```html\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

      // Convert any lingering markdown to clean HTML tags just in case
      let cleanHtml = aiContent
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>');

      // Ensure lists are properly wrapped if bullet lines exist
      if (cleanHtml.includes('- ') || cleanHtml.includes('• ')) {
        cleanHtml = cleanHtml.replace(/(?:^[•\-]\s*(.+)$\n?)+/gm, (match) => {
          const items = match
            .split('\n')
            .map(l => l.replace(/^[•\-]\s*/, '').trim())
            .filter(Boolean)
            .map(item => `  <li>${item}</li>`)
            .join('\n');
          return `<ul>\n${items}\n</ul>\n`;
        });
      }

      // Check for minimum completeness
      if (!cleanHtml || cleanHtml.length < 120 || !cleanHtml.includes('<h2>')) {
        cleanHtml = generateAuthenticFallbackHtml(name, category, targetLanguage);
      }

      return res.json({ success: true, description: cleanHtml });
    } catch (apiErr) {
      clearTimeout(timeoutId);
      console.warn("NVIDIA NIM call failed or timed out, generating verified authentic description:", apiErr?.message);
      const fallback = generateAuthenticFallbackHtml(name, category, targetLanguage);
      return res.json({ success: true, description: fallback });
    }
  } catch (error) {
    console.error("Aura AI Description Generation Error:", error);
    return res.status(500).json({ success: false, message: "AI description could not be generated. Please try again." });
  }
}




