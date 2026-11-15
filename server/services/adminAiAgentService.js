import { Type } from "@google/genai";
import {
  AuraAISetting,
  AdminAIChatSession,
  AdminAIActionLog,
  AdminAITask,
  AdminAIWorkLog
} from "../models/AuraAI.js";
import { Product } from "../models/Product.js";
import { Coupon } from "../models/Coupon.js";
import { ActiveOffer } from "../models/Promotion.js";
import { Order } from "../models/Order.js";
import { Customer } from "../models/Customer.js";
import { Setting, Ticket, Analytics } from "../models/Setting.js";
import { Review } from "../models/Review.js";
import { Banner } from "../models/Banner.js";
import { isDbConnected, connectDB } from "../config/db.js";
import { inMemoryStore } from "../data/inMemoryStore.js";
import { invalidateProductCache } from "../controllers/productController.js";
import { invalidateRagCache, buildStoreRagIndex, getPublicStoreTrendsPayload } from "./ragService.js";
import {
  resolveNvidiaKey,
  resolveGeminiKey,
  getNvidiaClient,
  getGeminiClient,
  PRIMARY_NIM_MODEL,
  GEMINI_TEXT_MODELS,
  convertNimMessagesToGemini,
  isGeminiModelName,
  resolveActiveWebsiteAiModel
} from "../controllers/auraAiController.js";

// Resilient in-memory mirrors when DB is warming up
export const memChatSessions = new Map();
export const memActionLogs = new Map();
export const memTasks = new Map();
export const memWorkLogs = [];

export const NIM_FALLBACK_MODELS = [
  "nvidia/nemotron-3-ultra-550b-a55b",
  "nvidia/nemotron-3-super-120b-a12b",
  "nvidia/llama-3.1-nemotron-70b-instruct",
  "meta/llama-3.3-70b-instruct",
  "mistralai/mixtral-8x22b-instruct-v0.1",
  "deepseek-ai/deepseek-r1"
];

// All navigable pages on Storefront + Admin Dashboard for Live Chat Preview
export const WEBSITE_PAGES_DIRECTORY = [
  { key: "home", title: "Storefront Home Page", route: "/", category: "storefront" },
  { key: "shop", title: "All Rudraksha Shop Catalog", route: "/shop", category: "storefront" },
  { key: "categories", title: "Sacred Categories Page", route: "/categories", category: "storefront" },
  { key: "calculator", title: "Vedic Rudraksha Rashi Calculator", route: "/rudraksha-calculator", category: "storefront" },
  { key: "guide", title: "Shiva Purana Rudraksha Guide", route: "/how-to-wear-rudraksha", category: "storefront" },
  { key: "verify", title: "Lab Certificate Verification", route: "/verify-certificate", category: "storefront" },
  { key: "wholesale", title: "Wholesale & Bulk Inquiry", route: "/wholesale", category: "storefront" },
  { key: "about", title: "About Aura Rudraksha", route: "/about", category: "storefront" },
  { key: "contact", title: "Contact & Support Page", route: "/contact", category: "storefront" },
  { key: "cart", title: "Shopping Cart Page", route: "/cart", category: "storefront" },
  { key: "track", title: "Order Tracking Page", route: "/track-order", category: "storefront" },
  { key: "admin_dashboard", title: "Admin Overview Dashboard", route: "/admin", category: "admin" },
  { key: "admin_products", title: "Admin Products & Inventory Manager", route: "/admin/products", category: "admin" },
  { key: "admin_orders", title: "Admin Orders & Fulfillment", route: "/admin/orders", category: "admin" },
  { key: "admin_customers", title: "Admin Customers Directory", route: "/admin/customers", category: "admin" },
  { key: "admin_coupons", title: "Admin Discount Coupons", route: "/admin/coupons", category: "admin" },
  { key: "admin_offers", title: "Admin Offers & Campaigns", route: "/admin/offers", category: "admin" },
  { key: "admin_banners", title: "Admin Hero & Banners", route: "/admin/banners", category: "admin" },
  { key: "admin_home_products", title: "Admin Home Merchandising", route: "/admin/home-products", category: "admin" },
  { key: "admin_reviews", title: "Admin Customer Reviews", route: "/admin/reviews", category: "admin" },
  { key: "admin_support", title: "Admin Support Tickets", route: "/admin/support", category: "admin" },
  { key: "admin_analytics", title: "Admin Traffic & Sales Analytics", route: "/admin/analytics", category: "admin" },
  { key: "admin_settings", title: "Admin Store Settings", route: "/admin/settings", category: "admin" }
];

/**
 * Record a private work log entry in MongoDB + memory so Admin can see live AI work
 */
export async function recordPrivateWorkLog({
  category = "agent",
  status = "completed",
  title,
  detail = "",
  modelUsed = PRIMARY_NIM_MODEL,
  metadata = {}
}) {
  const entry = {
    logId: "wlog_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
    category,
    status,
    title: String(title || "AI Operation"),
    detail: String(detail || ""),
    modelUsed,
    metadata,
    timestamp: new Date().toISOString()
  };

  memWorkLogs.unshift(entry);
  if (memWorkLogs.length > 200) memWorkLogs.pop();

  if (isDbConnected()) {
    try {
      await AdminAIWorkLog.create(entry);
    } catch (_) {}
  }
  return entry;
}

/**
 * Record an AI mutation in AdminAIActionLog with full previousData snapshot for 1-click Undo
 */
export async function recordAdminActionLog({
  actionType,
  title,
  description = "",
  targetCollection,
  targetId,
  previousData = null,
  newData = null,
  previewRoute = "/",
  source = "admin_chat",
  sessionId = "",
  taskId = ""
}) {
  const entry = {
    actionId: "act_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
    actionType,
    title,
    description,
    targetCollection,
    targetId: String(targetId || "global"),
    previousData,
    newData,
    previewRoute,
    reverted: false,
    revertedAt: "",
    source,
    sessionId,
    taskId,
    timestamp: new Date().toISOString()
  };

  memActionLogs.set(entry.actionId, entry);
  if (isDbConnected()) {
    try {
      await AdminAIActionLog.create(entry);
    } catch (_) {}
  }

  await recordPrivateWorkLog({
    category: "action",
    status: "completed",
    title: `Action Executed: ${title}`,
    detail: description,
    metadata: { actionId: entry.actionId, actionType, previewRoute }
  });

  return entry;
}

/**
 * Strict message normalizer so roles ALWAYS start with system -> user -> assistant
 */
export function sanitizeNimMessages(systemPrompt, rawMessages = []) {
  const cleaned = [];
  for (const m of rawMessages) {
    if (!m) continue;
    const isAi = m.sender === "ai" || m.sender === "assistant" || m.role === "assistant" || m.role === "model";
    const role = isAi ? "assistant" : "user";
    const content = String(m.text || m.content || "").trim();
    if (!content) continue;

    if (cleaned.length === 0 && role === "assistant") {
      continue;
    }

    if (cleaned.length > 0 && cleaned[cleaned.length - 1].role === role) {
      cleaned[cleaned.length - 1].content += "\n\n" + content;
    } else {
      cleaned.push({ role, content });
    }
  }

  if (cleaned.length === 0) {
    cleaned.push({ role: "user", content: "Analyze current website status and assist me." });
  }

  return [
    { role: "system", content: systemPrompt },
    ...cleaned
  ];
}

function withTimeout(promise, ms = 12000) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`API request timed out after ${ms}ms`)), ms)
    )
  ]);
}

function escapeRegex(str) {
  return String(str || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getAllInMemoryProducts() {
  return Array.isArray(inMemoryStore.products) ? inMemoryStore.products : [];
}

/**
 * Normalize common Hinglish & typing mistakes so Admin commands execute reliably
 */
export function normalizeAdminPrompt(raw = "") {
  let s = String(raw || "").trim();
  if (!s) return "";
  const replacements = [
    [/\b(produced|prduced|prodc|prduct|produc|prouct|prodct|produts|producs|produ)\b/gi, "product"],
    [/\b(htana|hatana|htao|hatao|hatado|htado|dlt|delet)\b/gi, "delete"],
    [/\b(nikalo|nikal\s*do|nikalna)\b/gi, "delete"],
    [/\b(bnao|bnado|banado|bnaao)\b/gi, "banao"],
    [/\b(ad)\b(?=\s*(karo|kr|krna|karna|product|new|naya|item|mala|rudraksha|mukhi|to|me|mein))/gi, "add"],
    [/\b(karo|kr|krdo|kar\s*do)\s+ad\b/gi, "$1 add"],
    [/\b(jodo|jod\s*do|daaldo|daldo|dalo|daalo|rakho|lga|lgao|lagao)\b/gi, "add"],
    [/\b(fichar|fechar|featur|fichers|features)\b/gi, "feature"],
    [/\b(websait|webside|wbsite)\b/gi, "website"],
    [/\b(desbord|dashbord|deshbord|deshboard)\b/gi, "dashboard"],
    [/\b(dikho|dkho|dekho|btado|btao)\b/gi, "dikhao"],
    [/\b(aigent|agnt|egent)\b/gi, "agent"],
    [/\b(gugal|gugle|googal)\b/gi, "google"],
    [/\b(gitub|githb|git\s*hub)\b/gi, "github"],
    [/\b(pablic|pablik|publc)\b/gi, "public"]
  ];
  for (const [rx, rep] of replacements) {
    s = s.replace(rx, rep);
  }
  return s.replace(/\s+/g, " ").trim();
}

/**
 * Search GitHub public repositories & open-source tools safely (with timeout)
 */
export async function searchGitHubPublicTools({ query = "ecommerce seo schema javascript", language = "", limit = 6 } = {}) {
  const cleanQuery = String(query || "").trim() || "ecommerce seo schema";
  const fullQuery = language ? `${cleanQuery} language:${String(language).trim()}` : cleanQuery;
  const maxResults = Math.min(10, Math.max(1, Number(limit) || 6));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 7000);

  try {
    const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(fullQuery)}&sort=stars&order=desc&per_page=${maxResults}`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "Aura-Rudraksha-Admin-Agent"
      }
    });
    clearTimeout(timer);

    if (!res.ok) {
      return {
        success: false,
        query: cleanQuery,
        error: `GitHub API returned HTTP ${res.status}`,
        items: []
      };
    }

    const json = await res.json();
    const items = Array.isArray(json.items)
      ? json.items.slice(0, maxResults).map(repo => ({
          name: repo.name,
          fullName: repo.full_name,
          description: String(repo.description || "Open-source repository").slice(0, 180),
          stars: Number(repo.stargazers_count || 0),
          language: repo.language || "JavaScript",
          topics: Array.isArray(repo.topics) ? repo.topics.slice(0, 5) : [],
          url: repo.html_url,
          homepage: repo.homepage || "",
          license: repo.license?.spdx_id || ""
        }))
      : [];

    return {
      success: true,
      query: cleanQuery,
      totalCount: Number(json.total_count || items.length),
      items
    };
  } catch (err) {
    clearTimeout(timer);
    return {
      success: false,
      query: cleanQuery,
      error: err?.message || "GitHub request failed",
      items: []
    };
  }
}

/**
 * Public Google Web / News Trends & Research helper (uses Gemini Google Search grounding when available + live public feeds fallback)
 */
export async function searchGooglePublicResearch({ query = "rudraksha benefits price market trends india" } = {}) {
  const cleanQuery = String(query || "").trim();
  const sources = [];
  let summary = "";

  // 1. Try Gemini Google Search Grounding if key configured
  try {
    await resolveGeminiKey();
    const gemini = getGeminiClient();
    if (gemini) {
      const resp = await withTimeout(
        gemini.models.generateContent({
          model: "gemini-4-hydrogen",
          contents: `Research accurately using live Google Search and summarize key actionable points for an Indian Rudraksha & spiritual e-commerce store admin:\n\nQuery: ${cleanQuery}`,
          config: {
            tools: [{ googleSearch: {} }]
          }
        }),
        14000
      );
      summary = String(resp?.text || "").trim();
      const chunks = resp?.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      for (const ch of chunks) {
        if (ch?.web?.uri) {
          sources.push({ title: ch.web.title || ch.web.uri, url: ch.web.uri });
        }
      }
      if (summary) {
        return { success: true, provider: "Google Search Grounding", query: cleanQuery, summary, sources: sources.slice(0, 8) };
      }
    }
  } catch (err) {
    console.warn("[AdminAgent:GoogleSearch] Grounding fallback notice:", err?.message || err);
  }

  // 2. Fallback: Fetch live Google News RSS public search results (no key required)
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(cleanQuery)}&hl=en-IN&gl=IN&ceid=IN:en`;
    const res = await fetch(rssUrl, {
      signal: controller.signal,
      headers: { "User-Agent": "Aura-Rudraksha-Admin-Agent" }
    });
    clearTimeout(timer);
    if (res.ok) {
      const xml = await res.text();
      const itemMatches = [...xml.matchAll(/<item>[\s\S]*?<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>[\s\S]*?<link>([\s\S]*?)<\/link>[\s\S]*?<\/item>/gi)];
      for (const m of itemMatches.slice(0, 5)) {
        const t = String(m[1] || "").replace(/<[^>]+>/g, "").trim();
        const u = String(m[2] || "").trim();
        if (t && u) sources.push({ title: t, url: u });
      }
    }
  } catch (_) {
    clearTimeout(timer);
  }

  const storeTrends = await getPublicStoreTrendsPayload(false).catch(() => null);
  return {
    success: true,
    provider: sources.length > 0 ? "Google News Public RSS + Live Store Trends" : "Live Store Trends Engine",
    query: cleanQuery,
    summary: sources.length > 0
      ? `Live public web results fetched for "${cleanQuery}".`
      : `Live internal store & catalog trends analyzed for "${cleanQuery}".`,
    sources: sources.slice(0, 6),
    storeTrends
  };
}

/**
 * Curated safe open-source storefront widgets & utility modules inspired by GitHub community tools
 */
const CURATED_PUBLIC_TOOLS_CATALOG = [
  {
    key: "schema_jsonld_booster",
    title: "Schema.org Product & FAQ Rich Snippet Booster",
    subtitle: "Boosts Google Shopping & organic CTR with verified Rudraksha certification & review schema",
    featureType: "seo_schema_booster",
    badge: "SEO TOOL",
    ctaText: "Explore Certified Beads",
    ctaLink: "/shop",
    githubRef: "https://github.com/google/schema-dts"
  },
  {
    key: "whatsapp_concierge_banner",
    title: "Instant WhatsApp Vedic Consultation & Order Support",
    subtitle: "Direct Rudraksha Mukhi guidance & instant COD/PayU order assistance",
    featureType: "whatsapp_concierge",
    badge: "CONVERSION TOOL",
    ctaText: "Ask Pandit Ji",
    ctaLink: "/rudraksha-calculator",
    githubRef: "https://github.com/pedroslopez/whatsapp-web.js"
  },
  {
    key: "trust_certificate_bar",
    title: "100% X-Ray & ISO Lab Certified Himalayan Rudraksha Guarantee",
    subtitle: "Live Certificate Verification • Prana-Pratishtha Energized in Kashi • Insured Shipping",
    featureType: "trust_certificate_bar",
    badge: "TRUST BADGE",
    ctaText: "Verify Certificate",
    ctaLink: "/verify-certificate",
    githubRef: "https://github.com/vercel/commerce"
  },
  {
    key: "flash_sale_banner",
    title: "Sacred Energized Rudraksha Mahotsav — Limited Stock Live!",
    subtitle: "Authentic Nepal & Java Beads • Free Express Shipping Across India",
    featureType: "flash_sale_banner",
    badge: "LIVE OFFER",
    ctaText: "Shop Collection",
    ctaLink: "/shop",
    githubRef: "https://github.com/medusajs/medusa"
  }
];

function buildProductSeoMetadata(p = {}) {
  const name = String(p.name || "Authentic Rudraksha").trim();
  const mukhiMatch = `${name} ${p.mukhi || ""}`.match(/(\d{1,2})\s*mukhi/i);
  const mukhiNum = mukhiMatch ? mukhiMatch[1] : "";
  const origin = p.origin || "Nepal (Himalayan)";
  const category = p.category || "Rudraksha Beads";

  const baseKw = [
    name.toLowerCase(),
    `buy ${name.toLowerCase()} online`,
    `original ${name.toLowerCase()}`,
    `${name.toLowerCase()} price india`,
    `lab certified ${name.toLowerCase()}`,
    `aura rudraksha ${name.toLowerCase()}`,
    `${category.toLowerCase()}`,
    origin.toLowerCase()
  ];
  if (mukhiNum) {
    baseKw.push(
      `${mukhiNum} mukhi rudraksha`,
      `${mukhiNum} mukhi rudraksha benefits`,
      `${mukhiNum} mukhi nepali rudraksha`,
      `${mukhiNum} mukhi rudraksha price`,
      `${mukhiNum} mukhi rudraksha hindi`,
      `${mukhiNum} मुखी रुद्राक्ष`
    );
  }
  const existingKw = Array.isArray(p.keywords) ? p.keywords.map(k => (typeof k === "string" ? k : k?.keyword || "")).filter(Boolean) : [];
  const mergedKeywords = [...new Set([...existingKw, ...baseKw])].slice(0, 18);
  const tags = [...new Set([...(Array.isArray(p.tags) ? p.tags : []), "Lab Certified", "Energized", origin.includes("Nepal") ? "Nepali" : "Original", category])].slice(0, 8);
  const metaTitle = p.metaTitle || `${name} | 100% Lab Certified & Energized — Aura Rudraksha`;
  const metaDescription = p.metaDescription || `Buy authentic ISO Lab-Certified ${name} (${origin}) with Prana-Pratishtha energization certificate & insured shipping at Aura Rudraksha.`;
  const richDesc = (!p.description || String(p.description).trim().length < 50)
    ? `${name} — 100% Authentic ISO Lab-Certified spiritual product from ${origin}. Consecrated with Vedic Shiva Purana Prana-Pratishtha & Gangajal Abhishekam rituals for positivity, clarity, protection, and harmony.`
    : p.description;

  return {
    keywords: mergedKeywords,
    searchKeywords: mergedKeywords,
    tags,
    metaTitle,
    metaDescription,
    seoTitle: metaTitle,
    seoDescription: metaDescription,
    description: richDesc
  };
}

/**
 * Gemini Native Function Declarations for True Autonomous Multi-Tool Execution
 */
export const ADMIN_AGENT_FUNCTION_DECLARATIONS = [
  {
    name: "query_store_data",
    description: "Inspect live database records for products, orders, customers, coupons, activeOffer, banners, reviews, support tickets, store settings, or analytics.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        entity: {
          type: Type.STRING,
          description: "Target entity: products, orders, customers, coupons, active_offer, banners, reviews, tickets, settings, analytics"
        },
        search: {
          type: Type.STRING,
          description: "Optional search keyword, orderId, coupon code, customer name/email, or product name/mukhi"
        },
        filter: {
          type: Type.STRING,
          description: "Optional filter such as low_stock, out_of_stock, pending, paid, unpaid, vip, negative, open"
        },
        limit: {
          type: Type.NUMBER,
          description: "Max number of items to return (default 15, max 40)"
        }
      },
      required: ["entity"]
    }
  },
  {
    name: "create_product",
    description: "Create and publish a new product in the store catalog with Nepali & optional Indonesian variants.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: "Product name, e.g. 11 Mukhi Authentic Nepali Rudraksha" },
        mukhi: { type: Type.STRING, description: "Mukhi count or label, e.g. 11" },
        price: { type: Type.NUMBER, description: "Selling price in INR" },
        comparePrice: { type: Type.NUMBER, description: "MRP compare price in INR" },
        stock: { type: Type.NUMBER, description: "Stock quantity" },
        category: { type: Type.STRING, description: "Category e.g. Rudraksha Beads, Jaap Mala, Combinations, Puja Samagri" },
        origin: { type: Type.STRING, description: "Origin e.g. Nepal (Himalayan) or Indonesia (Java)" },
        indonesiaPrice: { type: Type.NUMBER, description: "Optional Indonesian variant price in INR" },
        indonesiaStock: { type: Type.NUMBER, description: "Optional Indonesian variant stock" },
        rulingPlanet: { type: Type.STRING, description: "Ruling planet" },
        deity: { type: Type.STRING, description: "Adhishtatha deity" },
        mantra: { type: Type.STRING, description: "Sacred Beej mantra" },
        description: { type: Type.STRING, description: "Rich SEO & Vedic description" },
        showOnHome: { type: Type.BOOLEAN, description: "Whether to display on Home page" }
      },
      required: ["name", "price"]
    }
  },
  {
    name: "update_product",
    description: "Update an existing product's price, MRP, stock, Indonesian variant price/stock, status (Published/Draft), home visibility, badge, or SEO description.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        idOrName: { type: Type.STRING, description: "Product id, slug, or exact/partial name (e.g. '5 Mukhi' or prod id)" },
        price: { type: Type.NUMBER, description: "New Nepali/base selling price in INR" },
        comparePrice: { type: Type.NUMBER, description: "New MRP in INR" },
        stock: { type: Type.NUMBER, description: "New stock count" },
        indonesiaPrice: { type: Type.NUMBER, description: "New Indonesian variant price" },
        indonesiaStock: { type: Type.NUMBER, description: "New Indonesian variant stock" },
        status: { type: Type.STRING, description: "Published or Draft" },
        showOnHome: { type: Type.BOOLEAN, description: "Show on storefront homepage" },
        badge: { type: Type.STRING, description: "Badge e.g. Bestseller, New Arrival, Rare" },
        description: { type: Type.STRING, description: "Updated description" },
        seoTitle: { type: Type.STRING, description: "SEO meta title" },
        seoDescription: { type: Type.STRING, description: "SEO meta description" }
      },
      required: ["idOrName"]
    }
  },
  {
    name: "bulk_update_products",
    description: "Apply a percentage discount/markup or bulk stock adjustment across all products or a specific category. Full snapshot saved for 1-click Undo.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        category: { type: Type.STRING, description: "Optional category filter (leave empty for ALL products)" },
        discountPercent: { type: Type.NUMBER, description: "Percentage discount to apply to price (e.g. 10 reduces prices by 10%, -10 raises by 10%)" },
        setStock: { type: Type.NUMBER, description: "Set stock to this exact number for matching items" },
        onlyLowStock: { type: Type.BOOLEAN, description: "If true, only update items with stock <= 10" },
        showOnHome: { type: Type.BOOLEAN, description: "Bulk set showOnHome true/false" }
      }
    }
  },
  {
    name: "delete_product",
    description: "Delete a product from catalog (stores complete backup for 1-click Undo).",
    parameters: {
      type: Type.OBJECT,
      properties: {
        idOrName: { type: Type.STRING, description: "Product id, slug, or name to delete" }
      },
      required: ["idOrName"]
    }
  },
  {
    name: "update_order",
    description: "Update an order's fulfillment status, payment status, courier/tracking details, estimated delivery, or notes.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        orderId: { type: Type.STRING, description: "Order ID or orderNumber (e.g. ORD-...)" },
        status: { type: Type.STRING, description: "Pending, Confirmed, Processing, Shipped, Delivered, Cancelled" },
        paymentStatus: { type: Type.STRING, description: "Optional: Pending, Paid, Failed, Refunded" },
        trackingNumber: { type: Type.STRING, description: "Shipping tracking AWB number" },
        courierName: { type: Type.STRING, description: "Courier partner name e.g. BlueDart, Delhivery, DTDC" },
        trackingUrl: { type: Type.STRING, description: "Tracking link URL" },
        estimatedDelivery: { type: Type.STRING, description: "Estimated delivery date string" },
        notes: { type: Type.STRING, description: "Admin internal note" }
      },
      required: ["orderId"]
    }
  },
  {
    name: "manage_coupon",
    description: "Create, update/toggle, or delete a discount coupon code.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        operation: { type: Type.STRING, description: "create, update, toggle, or delete" },
        code: { type: Type.STRING, description: "Coupon code (uppercase, e.g. SHIVA20)" },
        discountValue: { type: Type.NUMBER, description: "Discount amount or percentage" },
        discountType: { type: Type.STRING, description: "percentage or fixed" },
        minOrder: { type: Type.NUMBER, description: "Minimum cart amount" },
        maxDiscount: { type: Type.NUMBER, description: "Max discount cap in INR" },
        isActive: { type: Type.BOOLEAN, description: "Activate or pause coupon" },
        expiryDate: { type: Type.STRING, description: "Optional ISO expiry date" }
      },
      required: ["operation", "code"]
    }
  },
  {
    name: "update_active_offer",
    description: "Update or toggle the storewide ActiveOffer campaign (OFFER-CENTRAL-1) shown on top strip, hero, marquee, and product cards.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        enabled: { type: Type.BOOLEAN, description: "Turn storewide active offer on/off" },
        title: { type: Type.STRING, description: "Offer headline" },
        subtitle: { type: Type.STRING, description: "Offer subtitle" },
        couponCode: { type: Type.STRING, description: "Associated coupon code" },
        discountType: { type: Type.STRING, description: "percentage or fixed" },
        discountValue: { type: Type.NUMBER, description: "Discount value" },
        timerEnabled: { type: Type.BOOLEAN, description: "Show countdown timer" },
        hoursValid: { type: Type.NUMBER, description: "Countdown duration in hours" }
      }
    }
  },
  {
    name: "manage_banner",
    description: "Create, toggle, or delete a Hero/Promo Banner on the storefront.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        operation: { type: Type.STRING, description: "create, toggle, or delete" },
        bannerId: { type: Type.STRING, description: "Banner id (for toggle/delete)" },
        title: { type: Type.STRING, description: "Banner headline" },
        subtitle: { type: Type.STRING, description: "Banner subtitle" },
        link: { type: Type.STRING, description: "Target route e.g. /shop" },
        image: { type: Type.STRING, description: "Image URL (defaults to /images/placeholder.svg if not given)" },
        isActive: { type: Type.BOOLEAN, description: "Active state" }
      },
      required: ["operation"]
    }
  },
  {
    name: "add_website_feature",
    description: "Inject or remove a live top announcement/flash sale feature banner (aiCustomFeatures) on the storefront.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        featureType: { type: Type.STRING, description: "flash_sale_banner or muhurat_ticker" },
        title: { type: Type.STRING, description: "Banner headline text" },
        subtitle: { type: Type.STRING, description: "Subtitle text" },
        badge: { type: Type.STRING, description: "Short badge label e.g. LIVE OFFER" },
        ctaText: { type: Type.STRING, description: "CTA button text" },
        ctaLink: { type: Type.STRING, description: "CTA link route e.g. /shop" }
      },
      required: ["title"]
    }
  },
  {
    name: "update_store_settings",
    description: "Update store-wide payment, shipping, announcement, or contact settings (COD toggle, Online Pay toggle, COD fee, shipping fee, free shipping threshold, announcementText).",
    parameters: {
      type: Type.OBJECT,
      properties: {
        enableCod: { type: Type.BOOLEAN, description: "Enable or disable Cash on Delivery" },
        enableOnlinePayment: { type: Type.BOOLEAN, description: "Enable or disable Online PayU Payment" },
        codFee: { type: Type.NUMBER, description: "Optional COD handling charge in INR" },
        standardShippingFee: { type: Type.NUMBER, description: "Standard shipping fee in INR (0 = Free)" },
        freeShippingThreshold: { type: Type.NUMBER, description: "Cart amount for free shipping" },
        announcementText: { type: Type.STRING, description: "Storefront top announcement text" },
        supportPhone: { type: Type.STRING, description: "WhatsApp/support phone number" },
        featuredProductEnabled: { type: Type.BOOLEAN, description: "Show featured product section on Home" }
      }
    }
  },
  {
    name: "manage_review_or_ticket",
    description: "Approve/hide/reply to a customer product review OR resolve/reply to a customer support ticket.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        kind: { type: Type.STRING, description: "review or ticket" },
        targetId: { type: Type.STRING, description: "Review ID or Ticket ID" },
        status: { type: Type.STRING, description: "Review: Approved/Hidden/Rejected. Ticket: Resolved/In Progress/Closed" },
        replyText: { type: Type.STRING, description: "Admin reply / response text" }
      },
      required: ["kind", "targetId"]
    }
  },
  {
    name: "run_bug_scan_and_fix",
    description: "Scan the entire website, catalog, coupons, orders, and database for bugs/issues and optionally auto-fix safe issues (low stock, thin SEO, expired coupons, missing images).",
    parameters: {
      type: Type.OBJECT,
      properties: {
        autoFix: { type: Type.BOOLEAN, description: "If true, automatically fix detected safe issues with Undo logs" }
      }
    }
  },
  {
    name: "run_growth_audit",
    description: "Run a comprehensive executive store health & growth audit: revenue velocity, COD vs PayU breakdown, stuck unpaid orders, dead stock, fast-moving low stock alerts, VIP customers for outreach, and actionable conversion wins.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        focus: { type: Type.STRING, description: "Optional focus: all, revenue, inventory, orders, vip, seo" }
      }
    }
  },
  {
    name: "navigate_to_page",
    description: "Open a Storefront or Admin page inside the live interactive split-view preview panel.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        route: { type: Type.STRING, description: "Route path e.g. /, /shop, /admin/orders, /admin/products, /admin/coupons, /admin/settings" },
        title: { type: Type.STRING, description: "Descriptive title for preview panel" }
      },
      required: ["route"]
    }
  },
  {
    name: "schedule_background_task",
    description: "Create a persistent background task that keeps running on the server even when the admin closes the browser.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: "Task title" },
        prompt: { type: Type.STRING, description: "Task instructions" },
        taskType: { type: Type.STRING, description: "seo_optimizer, bug_scanner, inventory_guardian, or custom" },
        durationMinutes: { type: Type.NUMBER, description: "Total active duration in minutes" },
        intervalMinutes: { type: Type.NUMBER, description: "Cycle interval in minutes" }
      },
      required: ["title", "prompt"]
    }
  },
  {
    name: "retrain_ai_and_get_trends",
    description: "Force-retrain the AI RAG knowledge base on 100% live public store data (published products, prices, stock, shipping/COD rules, active coupons/offers, verified public reviews, and zero-PII bestselling trends) and return live trends summary.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        forceRefresh: { type: Type.BOOLEAN, description: "Set true to force full MongoDB re-indexing into AuraAIRagDocument" }
      }
    }
  },
  {
    name: "undo_action",
    description: "Undo/rollback a specific AI actionId or the most recent un-reverted AI change.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        actionId: { type: Type.STRING, description: "Optional actionId (defaults to latest action if omitted)" }
      }
    }
  },
  {
    name: "search_github_tools",
    description: "Search public GitHub repositories and open-source tools/libraries (e.g., ecommerce SEO schema, WhatsApp notifications, UI widgets, analytics) to recommend or integrate.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING, description: "Search topic or tool keywords (e.g. 'ecommerce schema json-ld', 'rudraksha', 'react analytics dashboard')" },
        language: { type: Type.STRING, description: "Optional programming language filter e.g. JavaScript, TypeScript" },
        limit: { type: Type.NUMBER, description: "Number of repositories to return (1-10)" }
      },
      required: ["query"]
    }
  },
  {
    name: "google_public_search",
    description: "Run a live Google public web & market trends search for Rudraksha pricing, festival dates, SEO keywords, or competitor insights.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING, description: "Search query for Google public web & trends" }
      },
      required: ["query"]
    }
  },
  {
    name: "generate_product_seo",
    description: "Generate and save rich English & Hindi SEO keywords, tags, metaTitle, metaDescription, and Vedic description for a specific product or ALL products missing SEO.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        idOrName: { type: Type.STRING, description: "Optional product id, slug, or name. Leave empty to optimize all products missing/thin SEO." }
      }
    }
  },
  {
    name: "install_public_tool_feature",
    description: "Install and activate a curated, verified storefront feature or public tool widget (e.g. schema_jsonld_booster, whatsapp_concierge_banner, trust_certificate_bar, flash_sale_banner) with 1-click Undo.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        toolKey: { type: Type.STRING, description: "One of: schema_jsonld_booster, whatsapp_concierge_banner, trust_certificate_bar, flash_sale_banner" },
        title: { type: Type.STRING, description: "Optional custom title" },
        subtitle: { type: Type.STRING, description: "Optional custom subtitle" },
        githubRepoUrl: { type: Type.STRING, description: "Optional GitHub repository URL referenced" }
      }
    }
  }
];

/**
 * Execute a read-only store data query
 */
export async function queryStoreData({ entity = "products", search = "", filter = "", limit = 15 } = {}) {
  const maxItems = Math.min(40, Math.max(1, Number(limit) || 15));
  const qLower = String(search || "").trim().toLowerCase();
  const fLower = String(filter || "").trim().toLowerCase();
  const dbReady = isDbConnected();

  switch (String(entity).toLowerCase()) {
    case "products": {
      let list = dbReady ? await Product.find().sort({ createdAt: -1 }).limit(150).lean().catch(() => []) : getAllInMemoryProducts();
      if (!list.length && getAllInMemoryProducts().length) list = getAllInMemoryProducts();
      if (qLower) {
        list = list.filter(p =>
          String(p.name || "").toLowerCase().includes(qLower) ||
          String(p.slug || "").toLowerCase().includes(qLower) ||
          String(p.id || "").toLowerCase() === qLower ||
          String(p.category || "").toLowerCase().includes(qLower) ||
          String(p.mukhi || "").toLowerCase().includes(qLower)
        );
      }
      if (fLower === "low_stock") list = list.filter(p => Number(p.stock ?? 0) > 0 && Number(p.stock ?? 0) <= 10);
      if (fLower === "out_of_stock") list = list.filter(p => Number(p.stock ?? 0) <= 0);
      if (fLower === "draft") list = list.filter(p => p.status === "Draft" || p.status === "Inactive");
      return {
        totalMatched: list.length,
        items: list.slice(0, maxItems).map(p => ({
          id: p.id || String(p._id),
          name: p.name,
          slug: p.slug,
          category: p.category,
          price: p.price,
          comparePrice: p.comparePrice || p.mrp,
          indonesiaPrice: p.indonesiaPrice || null,
          stock: p.stock ?? 0,
          indonesiaStock: p.indonesiaStock ?? null,
          status: p.status || "Published",
          showOnHome: p.showOnHome !== false,
          salesCount: p.totalSold || p.salesCount || 0
        }))
      };
    }

    case "orders": {
      let orders = dbReady ? await Order.find().sort({ createdAt: -1 }).limit(120).lean().catch(() => []) : [];
      if (qLower) {
        orders = orders.filter(o =>
          String(o.orderId || o.id || "").toLowerCase().includes(qLower) ||
          String(o.customerName || "").toLowerCase().includes(qLower) ||
          String(o.customerEmail || "").toLowerCase().includes(qLower) ||
          String(o.customerPhone || o.phone || "").toLowerCase().includes(qLower)
        );
      }
      if (fLower === "pending") orders = orders.filter(o => ["Pending", "Processing"].includes(o.orderStatus || o.status));
      if (fLower === "unpaid") orders = orders.filter(o => o.paymentStatus !== "Paid");
      if (fLower === "paid") orders = orders.filter(o => o.paymentStatus === "Paid");
      if (fLower === "shipped") orders = orders.filter(o => (o.orderStatus || o.status) === "Shipped");
      if (fLower === "delivered") orders = orders.filter(o => (o.orderStatus || o.status) === "Delivered");
      return {
        totalMatched: orders.length,
        items: orders.slice(0, maxItems).map(o => ({
          orderId: o.orderId || o.id,
          status: o.orderStatus || o.status,
          paymentStatus: o.paymentStatus,
          paymentMethod: o.paymentMethod,
          amount: Number(o.finalAmount || o.total || o.amount || 0),
          customerName: o.customerName || `${o.firstName || ""} ${o.lastName || ""}`.trim() || "Guest",
          phone: o.customerPhone || o.phone,
          city: o.city || o.shippingAddress?.city,
          trackingNumber: o.trackingNumber || o.trackingId || "",
          courierName: o.courierName || o.carrier || "",
          itemsCount: Array.isArray(o.items) ? o.items.length : 0,
          date: o.date || o.createdAt
        }))
      };
    }

    case "customers": {
      let customers = dbReady ? await Customer.find().sort({ totalSpent: -1, createdAt: -1 }).limit(80).lean().catch(() => []) : [];
      if (qLower) {
        customers = customers.filter(c =>
          String(c.name || "").toLowerCase().includes(qLower) ||
          String(c.email || "").toLowerCase().includes(qLower) ||
          String(c.phone || "").toLowerCase().includes(qLower)
        );
      }
      if (fLower === "vip") customers = customers.filter(c => (c.ordersCount || 0) >= 2 || (c.totalSpent || 0) >= 3000);
      return {
        totalMatched: customers.length,
        items: customers.slice(0, maxItems).map(c => ({
          id: c.id || String(c._id),
          name: c.name,
          email: c.email,
          phone: c.phone,
          ordersCount: c.ordersCount || 0,
          totalSpent: c.totalSpent || 0,
          role: c.role || "customer"
        }))
      };
    }

    case "coupons": {
      let coupons = dbReady ? await Coupon.find().sort({ createdAt: -1 }).limit(50).lean().catch(() => []) : [];
      if (qLower) coupons = coupons.filter(c => String(c.code || "").toLowerCase().includes(qLower));
      return { totalMatched: coupons.length, items: coupons.slice(0, maxItems) };
    }

    case "active_offer": {
      const offer = dbReady ? await ActiveOffer.findOne({ id: "OFFER-CENTRAL-1" }).lean().catch(() => null) : null;
      return { activeOffer: offer || { id: "OFFER-CENTRAL-1", enabled: false, status: "Disabled" } };
    }

    case "banners": {
      const banners = dbReady ? await Banner.find().sort({ sortOrder: 1 }).limit(30).lean().catch(() => []) : [];
      return { totalMatched: banners.length, items: banners.slice(0, maxItems) };
    }

    case "reviews": {
      let reviews = dbReady ? await Review.find().sort({ createdAt: -1 }).limit(60).lean().catch(() => []) : [];
      if (fLower === "pending") reviews = reviews.filter(r => r.status === "Pending");
      if (fLower === "negative") reviews = reviews.filter(r => Number(r.rating || 5) <= 3);
      return {
        totalMatched: reviews.length,
        items: reviews.slice(0, maxItems).map(r => ({
          id: r.id,
          productId: r.productId,
          productName: r.productName,
          name: r.name,
          rating: r.rating,
          text: String(r.text || "").slice(0, 180),
          status: r.status,
          hasAdminReply: Boolean(r.adminReply)
        }))
      };
    }

    case "tickets": {
      let tickets = dbReady ? await Ticket.find().sort({ createdAt: -1 }).limit(50).lean().catch(() => []) : [];
      if (fLower === "open") tickets = tickets.filter(t => !["Resolved", "Closed"].includes(t.status));
      return { totalMatched: tickets.length, items: tickets.slice(0, maxItems) };
    }

    case "settings": {
      const s = dbReady ? await Setting.findOne({ id: "STORE_SETTINGS" }).lean().catch(() => null) : null;
      return { settings: s || {} };
    }

    case "analytics": {
      return await runStoreGrowthAndHealthAudit("all");
    }

    default:
      return { error: `Unknown entity "${entity}"` };
  }
}

/**
 * Proactive Store Health & Growth Audit ("things the admin didn't even think of")
 */
export async function runStoreGrowthAndHealthAudit(focus = "all") {
  const dbReady = isDbConnected();
  const [products, orders, coupons, customers, reviews, tickets, analyticsDoc, settings] = dbReady
    ? await Promise.all([
        Product.find().lean().catch(() => []),
        Order.find().sort({ createdAt: -1 }).limit(250).lean().catch(() => []),
        Coupon.find().lean().catch(() => []),
        Customer.find().lean().catch(() => []),
        Review.find().lean().catch(() => []),
        Ticket.find().lean().catch(() => []),
        Analytics.findOne({ id: "GLOBAL_ANALYTICS" }).lean().catch(() => null),
        Setting.findOne({ id: "STORE_SETTINGS" }).lean().catch(() => null)
      ])
    : [getAllInMemoryProducts(), [], [], [], [], [], null, null];

  const activeOrders = orders.filter(o => (o.orderStatus || o.status) !== "Cancelled");
  const totalRevenue = activeOrders.reduce((s, o) => s + (Number(o.finalAmount || o.total || o.amount) || 0), 0);
  const avgOrderValue = activeOrders.length ? Math.round(totalRevenue / activeOrders.length) : 0;

  const codOrders = activeOrders.filter(o => String(o.paymentMethod || "").toLowerCase().includes("cod") || String(o.paymentMethod || "").toLowerCase().includes("cash"));
  const onlineOrders = activeOrders.filter(o => !codOrders.includes(o));
  const unpaidOnlineOrders = orders.filter(o => !codOrders.includes(o) && o.paymentStatus !== "Paid" && (o.orderStatus || o.status) !== "Cancelled");
  const pendingFulfillment = orders.filter(o => ["Pending", "Confirmed", "Processing"].includes(o.orderStatus || o.status));

  const outOfStock = products.filter(p => Number(p.stock ?? 0) <= 0 && p.status !== "Draft");
  const lowStock = products.filter(p => Number(p.stock ?? 0) > 0 && Number(p.stock ?? 0) <= 5);
  const missingSeo = products.filter(p => !p.description || String(p.description).trim().length < 40);
  const expiredActiveCoupons = coupons.filter(c => c.expiryDate && new Date(c.expiryDate) < new Date() && c.isActive !== false);
  const pendingReviews = reviews.filter(r => r.status === "Pending");
  const openTickets = tickets.filter(t => !["Resolved", "Closed"].includes(t.status));

  // Compute product sales leaderboard from actual order items
  const salesByProduct = new Map();
  for (const o of activeOrders) {
    for (const item of (Array.isArray(o.items) ? o.items : [])) {
      const key = item.name || item.productId || "Item";
      salesByProduct.set(key, (salesByProduct.get(key) || 0) + (Number(item.qty || item.quantity) || 1));
    }
  }
  const topSellers = Array.from(salesByProduct.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, units]) => ({ name, units }));

  // Identify VIP customers with phone/email for WhatsApp retention outreach
  const vipMap = new Map();
  for (const o of activeOrders) {
    const key = (o.customerEmail || o.customerPhone || o.phone || "").toLowerCase();
    if (!key) continue;
    const prev = vipMap.get(key) || {
      name: o.customerName || "Devotee",
      phone: o.customerPhone || o.phone || "",
      email: o.customerEmail || "",
      ordersCount: 0,
      totalSpent: 0
    };
    prev.ordersCount += 1;
    prev.totalSpent += Number(o.finalAmount || o.total || o.amount) || 0;
    vipMap.set(key, prev);
  }
  const vipBuyers = Array.from(vipMap.values())
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 5);

  const opportunities = [];
  if (unpaidOnlineOrders.length > 0) {
    opportunities.push({
      priority: "High",
      title: `${unpaidOnlineOrders.length} Unpaid Online Order(s) Need Recovery / Check`,
      detail: `Online orders marked "${unpaidOnlineOrders[0]?.paymentStatus || "Pending"}" total ₹${unpaidOnlineOrders.reduce((s, o) => s + Number(o.finalAmount || o.total || 0), 0).toLocaleString("en-IN")}. Send WhatsApp payment reminder or check PayU status.`,
      suggestedPrompt: "Unpaid online orders ki list dikhao aur recovery action plan btao"
    });
  }
  if (outOfStock.length > 0 || lowStock.length > 0) {
    opportunities.push({
      priority: "High",
      title: `${outOfStock.length} Out-of-Stock & ${lowStock.length} Critical Low-Stock Products`,
      detail: `Products risk losing ad spend. Say "low stock sabhi products ko 25 stock par restock karo" for 1-click recovery.`,
      suggestedPrompt: "Low stock aur out of stock products ko 25 par restock karo"
    });
  }
  if (missingSeo.length > 0) {
    opportunities.push({
      priority: "Medium",
      title: `${missingSeo.length} Products Have Thin/Missing SEO Descriptions`,
      detail: `Enriching Vedic descriptions improves Google Merchant & organic ranking.`,
      suggestedPrompt: "Website bugs scan aur SEO auto-fix karo"
    });
  }
  if (openTickets.length > 0 || pendingReviews.length > 0) {
    opportunities.push({
      priority: "Medium",
      title: `${openTickets.length} Open Support Tickets & ${pendingReviews.length} Pending Reviews`,
      detail: `Unanswered tickets slow trust; pending reviews wait approval.`,
      suggestedPrompt: "Open support tickets aur pending reviews dikhao"
    });
  }
  if (coupons.filter(c => c.isActive !== false).length === 0) {
    opportunities.push({
      priority: "Growth",
      title: "No Active Discount Coupon Running",
      detail: "Launching a clean 10%-15% festival or first-order coupon lifts cart conversion.",
      suggestedPrompt: "AURA10 naam ka 10% coupon min order 999 par bnao"
    });
  }

  return {
    focus,
    auditedAt: new Date().toISOString(),
    metrics: {
      mongoConnected: dbReady,
      totalProducts: products.length,
      outOfStockCount: outOfStock.length,
      lowStockCount: lowStock.length,
      missingSeoCount: missingSeo.length,
      totalOrders: orders.length,
      activeOrdersCount: activeOrders.length,
      pendingFulfillmentCount: pendingFulfillment.length,
      unpaidOnlineOrdersCount: unpaidOnlineOrders.length,
      totalRevenue,
      avgOrderValue,
      codOrdersCount: codOrders.length,
      onlineOrdersCount: onlineOrders.length,
      totalCustomers: customers.length,
      activeCouponsCount: coupons.filter(c => c.isActive !== false).length,
      expiredActiveCouponsCount: expiredActiveCoupons.length,
      pendingReviewsCount: pendingReviews.length,
      openTicketsCount: openTickets.length,
      storeVisits: analyticsDoc?.visits || 0,
      enableCod: settings?.enableCod !== false,
      enableOnlinePayment: settings?.enableOnlinePayment !== false
    },
    topSellers,
    vipBuyers,
    opportunities
  };
}

/**
 * Dispatcher for Gemini native Function Calling tools
 */
async function executeGeminiFunctionTool(fnName, args = {}, context = {}) {
  switch (fnName) {
    case "query_store_data":
      return await queryStoreData(args);

    case "create_product":
      return await executeAdminAgentAction({ type: "CREATE_PRODUCT", data: args }, context);

    case "update_product":
      return await executeAdminAgentAction({
        type: "UPDATE_PRODUCT",
        data: { id: args.idOrName, name: args.idOrName, ...args }
      }, context);

    case "bulk_update_products":
      return await executeAdminAgentAction({ type: "BULK_UPDATE_PRODUCTS", data: args }, context);

    case "delete_product":
      return await executeAdminAgentAction({
        type: "DELETE_PRODUCT",
        data: { id: args.idOrName, name: args.idOrName }
      }, context);

    case "update_order":
      return await executeAdminAgentAction({ type: "UPDATE_ORDER", data: args }, context);

    case "manage_coupon": {
      const op = String(args.operation || "create").toLowerCase();
      if (op === "delete") return await executeAdminAgentAction({ type: "DELETE_COUPON", data: args }, context);
      if (op === "update" || op === "toggle") return await executeAdminAgentAction({ type: "UPDATE_COUPON", data: args }, context);
      return await executeAdminAgentAction({ type: "CREATE_COUPON", data: args }, context);
    }

    case "update_active_offer":
      return await executeAdminAgentAction({ type: "UPDATE_ACTIVE_OFFER", data: args }, context);

    case "manage_banner":
      return await executeAdminAgentAction({ type: "MANAGE_BANNER", data: args }, context);

    case "add_website_feature":
      return await executeAdminAgentAction({ type: "ADD_WEBSITE_FEATURE", data: args }, context);

    case "update_store_settings":
      return await executeAdminAgentAction({ type: "UPDATE_STORE_SETTINGS", data: args }, context);

    case "manage_review_or_ticket":
      return await executeAdminAgentAction({
        type: String(args.kind).toLowerCase() === "ticket" ? "RESOLVE_TICKET" : "MANAGE_REVIEW",
        data: args
      }, context);

    case "run_bug_scan_and_fix":
      return args.autoFix
        ? await executeAdminAgentAction({ type: "AUTO_FIX_BUGS", data: {} }, context)
        : await runWebsiteBugDiagnostic();

    case "run_growth_audit":
      return await runStoreGrowthAndHealthAudit(args.focus || "all");

    case "navigate_to_page":
      return await executeAdminAgentAction({ type: "SHOW_PAGE", data: args }, context);

    case "schedule_background_task":
      return await executeAdminAgentAction({ type: "CREATE_TASK", data: args }, context);

    case "retrain_ai_and_get_trends":
      return await executeAdminAgentAction({ type: "RETRAIN_AI_KNOWLEDGE", data: args }, context);

    case "undo_action": {
      let targetId = args.actionId;
      if (!targetId && isDbConnected()) {
        const latest = await AdminAIActionLog.findOne({ reverted: false }).sort({ createdAt: -1 }).lean();
        targetId = latest?.actionId;
      }
      if (!targetId) {
        const memLatest = Array.from(memActionLogs.values()).reverse().find(a => !a.reverted);
        targetId = memLatest?.actionId;
      }
      if (!targetId) return { error: "No recent un-reverted AI action found to undo." };
      return await undoAdminAgentAction(targetId);
    }

    case "search_github_tools":
      return await searchGitHubPublicTools(args);

    case "google_public_search":
      return await searchGooglePublicResearch(args);

    case "generate_product_seo":
      return await executeAdminAgentAction({ type: "GENERATE_PRODUCT_SEO", data: args }, context);

    case "install_public_tool_feature":
      return await executeAdminAgentAction({ type: "INSTALL_PUBLIC_TOOL", data: args }, context);

    default:
      return { error: `Unknown tool: ${fnName}` };
  }
}

/**
 * Call Gemini (with Native Function Calling Loop) OR NVIDIA NIM OR Autonomous Synthesis Engine
 */
export async function invokeAdminLLM(systemPrompt, rawMessages = [], maxTokens = 2800, context = {}) {
  await resolveNvidiaKey();
  await resolveGeminiKey();

  const gemini = getGeminiClient();
  const nvidia = getNvidiaClient();
  const nimMessages = sanitizeNimMessages(systemPrompt, rawMessages);

  // 1. Resolve Admin's website-wide active AI model (DB + inMemory fallback)
  const userSelectedModel = await resolveActiveWebsiteAiModel();
  const preferGemini = isGeminiModelName(userSelectedModel);

  const executedViaTools = [];
  let previewRouteFromTools = "";
  let previewTitleFromTools = "";

  const tryGeminiToolAgent = async () => {
    if (!gemini) return null;
    const contents = convertNimMessagesToGemini(nimMessages);
    const hybridTools = [
      { googleSearch: {} },
      { urlContext: {} },
      { functionDeclarations: ADMIN_AGENT_FUNCTION_DECLARATIONS }
    ];
    const functionOnlyTools = [{ functionDeclarations: ADMIN_AGENT_FUNCTION_DECLARATIONS }];
    const modelsToTry = [...new Set([
      preferGemini ? userSelectedModel : "",
      "gemini-4-hydrogen",
      ...GEMINI_TEXT_MODELS
    ])].filter(Boolean);

    for (const gModel of modelsToTry) {
      let useHybrid = gModel.startsWith("gemini-4") || gModel.startsWith("gemini-3");
      try {
        let currentContents = [...contents];
        let finalText = "";
        const groundingSources = [];

        // Multi-round tool calling loop (max 5 turns)
        for (let round = 0; round < 5; round++) {
          const requestConfig = {
            systemInstruction: systemPrompt + "\n\nIMPORTANT: You have native function calling tools AND live Google Search + URL Context attached! ALWAYS call the appropriate tool(s) to inspect data, research public trends/GitHub tools, or mutate MongoDB instead of guessing. When Admin writes in Hindi/Hinglish or has typos like 'produced' (product), 'htana' (delete), 'ad' (add), understand the true intent and execute immediately. Summarize exact results cleanly.",
            tools: useHybrid ? hybridTools : functionOnlyTools,
            ...(useHybrid ? { toolConfig: { includeServerSideToolInvocations: true } } : {})
          };

          let response;
          try {
            response = await withTimeout(
              gemini.models.generateContent({
                model: gModel,
                contents: currentContents,
                config: requestConfig
              }),
              16000
            );
          } catch (hybridErr) {
            if (useHybrid) {
              useHybrid = false;
              response = await withTimeout(
                gemini.models.generateContent({
                  model: gModel,
                  contents: currentContents,
                  config: {
                    systemInstruction: requestConfig.systemInstruction,
                    tools: functionOnlyTools
                  }
                }),
                16000
              );
            } else {
              throw hybridErr;
            }
          }

          const gChunks = response?.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
          for (const ch of gChunks) {
            if (ch?.web?.uri && !groundingSources.some(s => s.url === ch.web.uri)) {
              groundingSources.push({ title: ch.web.title || ch.web.uri, url: ch.web.uri });
            }
          }

          const candidateContent = response?.candidates?.[0]?.content;
          const calls = response?.functionCalls || candidateContent?.parts?.filter(p => p.functionCall)?.map(p => p.functionCall) || [];

          if (calls.length > 0 && candidateContent) {
            currentContents.push(candidateContent);
            const responseParts = [];

            for (const call of calls) {
              const fnName = call.name;
              const fnArgs = call.args || {};
              console.log(`[AdminAgent:GeminiTool] Calling ${fnName}`, fnArgs);
              const toolOutput = await executeGeminiFunctionTool(fnName, fnArgs, context);

              if (toolOutput && !toolOutput.error) {
                if (toolOutput.actionId) {
                  executedViaTools.push(toolOutput);
                }
                if (toolOutput.previewRoute) {
                  previewRouteFromTools = toolOutput.previewRoute;
                  previewTitleFromTools = toolOutput.previewTitle || toolOutput.title || "";
                }
              }

              responseParts.push({
                functionResponse: {
                  id: call.id,
                  name: fnName,
                  response: { result: toolOutput }
                }
              });
            }

            currentContents.push({ role: "user", parts: responseParts });
          } else {
            finalText = (response?.text || "").trim();
            if (!finalText && candidateContent?.parts) {
              finalText = candidateContent.parts
                .map(p => (typeof p.text === "string" ? p.text : ""))
                .join("\n")
                .trim();
            }
            break;
          }
        }

        if (!finalText && executedViaTools.length > 0) {
          try {
            const summaryResp = await withTimeout(
              gemini.models.generateContent({
                model: gModel,
                contents: currentContents,
                config: {
                  systemInstruction: systemPrompt + "\nSummarize the completed tool results clearly for the Admin in the same language (Hindi/Hinglish/English)."
                }
              }),
              10000
            );
            finalText = (summaryResp?.text || "").trim();
          } catch (_) {}
          if (!finalText) {
            finalText = executedViaTools.map((a, idx) => `${idx + 1}. **${a.title || a.actionType}**`).join("\n");
          }
        }

        if (finalText) {
          if (groundingSources.length > 0 && !finalText.includes(groundingSources[0].url)) {
            finalText += "\n\n**Verified Google Web Sources:**\n" +
              groundingSources.slice(0, 5).map((s, idx) => `${idx + 1}. [${s.title}](${s.url})`).join("\n");
          }
          return {
            text: finalText,
            modelUsed: gModel,
            provider: "Gemini Tool Agent",
            executedViaTools,
            previewRoute: previewRouteFromTools,
            previewTitle: previewTitleFromTools,
            groundingSources
          };
        }
      } catch (gErr) {
        console.warn(`[AdminAgent] Gemini (${gModel}) notice:`, gErr?.message || gErr);
      }
    }
    return null;
  };

  const tryNvidiaNimAgent = async () => {
    if (!nvidia) return null;
    const uniqueCandidateModels = [...new Set([
      !preferGemini ? userSelectedModel : "",
      ...NIM_FALLBACK_MODELS
    ].filter(m => m && !isGeminiModelName(m)))];

    for (const modelName of uniqueCandidateModels) {
      try {
        console.log(`[AdminAgent] Attempting NVIDIA NIM model: ${modelName}`);
        const completion = await withTimeout(
          nvidia.chat.completions.create({
            model: modelName,
            messages: nimMessages,
            temperature: 0.55,
            max_tokens: maxTokens
          }),
          12000
        );
        const msg = completion?.choices?.[0]?.message;
        const text = (msg?.content || msg?.reasoning_content || "").trim();
        if (text) {
          return { text, modelUsed: modelName, provider: "NVIDIA NIM", executedViaTools };
        }
      } catch (nimErr) {
        console.warn(`[AdminAgent] NVIDIA NIM (${modelName}) notice:`, nimErr?.message || nimErr);
      }
    }
    return null;
  };

  // 2. Respect website-wide saved model provider first, with cross-provider fallback
  if (preferGemini) {
    const gRes = await tryGeminiToolAgent();
    if (gRes) return gRes;
    const nimRes = await tryNvidiaNimAgent();
    if (nimRes) return nimRes;
  } else {
    const nimRes = await tryNvidiaNimAgent();
    if (nimRes) return nimRes;
    const gRes = await tryGeminiToolAgent();
    if (gRes) return gRes;
  }

  // 4. Fallback Tier: Context-Aware Autonomous Live Store Engine (Answers all queries & commands using live DB data)
  console.log("[AdminAgent] Executing Autonomous Synthesis Engine...");
  const synth = await synthesizeAutonomousAdminResponse(systemPrompt, rawMessages);
  return { ...synth, executedViaTools };
}

/**
 * Autonomous Vedic & Store Administration Synthesizer
 * Handles natural Hindi / Hinglish / English queries & commands dynamically using live DB snapshot + queryStoreData.
 */
export async function synthesizeAutonomousAdminResponse(systemPrompt, rawMessages = []) {
  const lastUserMsg = [...rawMessages].reverse().find(m => m && (m.role === "user" || m.sender === "user")) || {};
  const prompt = String(lastUserMsg.content || lastUserMsg.text || "").trim();
  const normalizedPrompt = normalizeAdminPrompt(prompt);
  const lower = normalizedPrompt.toLowerCase();
  const snapshot = await getCompleteWebsiteSnapshot().catch(() => ({
    productsCount: 0,
    products: [],
    lowStockCount: 0,
    ordersCount: 0,
    recentOrders: [],
    couponsCount: 0,
    coupons: [],
    customersCount: 0,
    reviewsCount: 0,
    openTicketsCount: 0,
    totalRevenue: 0,
    mongoConnected: false,
    settings: { enableCod: true, enableOnlinePayment: true }
  }));

  let text = "";
  let actionTag = "";
  let navTag = "";

  // 1. Bulk discount / bulk price / bulk stock intent
  const isBulkAction = /(sabhi|all|sab|entire|poora|pura|store)\s*(product|products|catalog|item|items|rudraksha)/i.test(lower) &&
    /(discount|off|kam|reduce|ghatao|stock|restock)/i.test(lower);
  if (isBulkAction) {
    const pctMatch = lower.match(/(\d{1,2})\s*%/);
    const stockMatch = lower.match(/stock\s*(?:ko|to|=|:)?\s*(\d{1,4})/i);
    if (pctMatch) {
      const pct = parseInt(pctMatch[1], 10);
      actionTag = `[ADMIN_ACTION: {"type": "BULK_UPDATE_PRODUCTS", "data": {"discountPercent": ${pct}}}]`;
      navTag = `[NAVIGATE_PREVIEW: "/shop"]`;
      text = `Done! Maine sabhi catalog products par **${pct}% bulk discount** apply kar diya hai.\n\n${actionTag}\n${navTag}\n\nHar product ki purani price Action Ledger mein backup ho chuki hai — aap 1-click **Undo** se original prices restore kar sakte hain.`;
      return { text, modelUsed: "Aura Autonomous Agent", provider: "Aura Autonomous Agent" };
    }
    if (stockMatch) {
      const stk = parseInt(stockMatch[1], 10);
      const onlyLow = /low/i.test(lower);
      actionTag = `[ADMIN_ACTION: {"type": "BULK_UPDATE_PRODUCTS", "data": {"setStock": ${stk}, "onlyLowStock": ${onlyLow}}}]`;
      navTag = `[NAVIGATE_PREVIEW: "/admin/products"]`;
      text = `Done! Maine ${onlyLow ? "low-stock" : "sabhi"} products ka stock **${stk} units** par update kar diya hai.\n\n${actionTag}\n${navTag}`;
      return { text, modelUsed: "Aura Autonomous Agent", provider: "Aura Autonomous Agent" };
    }
  }

  // 2. Payment / COD / Shipping Settings TOGGLE vs READ CHECK
  const mentionsPaymentOrSettings = /\bcod\b|cash on delivery|online pay|payu|upi payment|shipping|delivery charge|store setting|payment setting/i.test(lower);
  const isToggleCommand = /\b(on|off|enable|disable|band|chalu|karo|kar do|set|badlo|update)\b/i.test(lower) && !/(kya|check|batao|btao|status|hai|hain|dikhao)/i.test(lower);

  if (mentionsPaymentOrSettings) {
    const isCod = /\bcod\b|cash on delivery/i.test(lower);
    const isOnlinePay = /online pay|payu|upi payment/i.test(lower);
    const shippingMatch = lower.match(/(?:shipping|delivery)\s*(?:fee|charge|charges)?\s*(?:ko|to|=|:)?\s*(?:₹|rs)?\s*(\d{1,4})/i);

    if (isToggleCommand && (isCod || isOnlinePay || shippingMatch)) {
      const turnOff = /\b(off|disable|band|hato|hatao)\b/i.test(lower);
      const payload = {};
      if (isCod) payload.enableCod = !turnOff;
      if (isOnlinePay) payload.enableOnlinePayment = !turnOff;
      if (shippingMatch) payload.shippingFee = parseInt(shippingMatch[1], 10);
      actionTag = `[ADMIN_ACTION: {"type": "UPDATE_STORE_SETTINGS", "data": ${JSON.stringify(payload)}}]`;
      navTag = `[NAVIGATE_PREVIEW: "/admin/settings"]`;
      text = `Store settings update kar di gayi hain:\n${isCod ? `• **Cash on Delivery (COD):** ${!turnOff ? "Enabled (ON)" : "Disabled (OFF)"}\n` : ""}${isOnlinePay ? `• **Online Payment (PayU):** ${!turnOff ? "Enabled (ON)" : "Disabled (OFF)"}\n` : ""}${shippingMatch ? `• **Shipping Fee:** ₹${payload.shippingFee}\n` : ""}\n${actionTag}\n${navTag}`;
      return { text, modelUsed: "Aura Autonomous Agent", provider: "Aura Autonomous Agent" };
    }

    const sRes = await queryStoreData({ entity: "settings" }).catch(() => ({ settings: snapshot.settings }));
    const s = sRes?.settings || snapshot.settings || {};
    const codOn = s.enableCod !== false;
    const payuOn = s.enableOnlinePayment !== false;
    const freeThreshold = s.freeShippingThreshold ?? s.freeShippingAbove ?? 499;
    const shipFee = s.shippingFee ?? s.deliveryCharge ?? 0;
    text = `**Live Payment & Store Settings Status:**\n\n• **Cash on Delivery (COD):** ${codOn ? "Enabled (ON)" : "Disabled (OFF)"}\n• **Online Payment (PayU / UPI / Cards):** ${payuOn ? "Enabled (ON)" : "Disabled (OFF)"}\n• **Shipping Fee:** ₹${Number(shipFee || 0).toLocaleString("en-IN")} (Free shipping above ₹${Number(freeThreshold).toLocaleString("en-IN")})\n• **Announcement Bar:** ${s.announcementBarEnabled ? `ON ("${s.announcementText || ""}")` : "OFF"}\n\nBadalne ke liye likhein: *"COD off karo"* ya *"Online payment on karo"*.`;
    return { text, modelUsed: "Aura Autonomous Agent", provider: "Aura Autonomous Agent" };
  }

  // 3. Coupon Management: Create / Toggle / Delete / List
  if (/coupon|promo\s*code|discount code/i.test(lower)) {
    const codeMatch = prompt.match(/\b([A-Z][A-Z0-9_-]{2,15})\b/);
    if (/(create|add|bnao|bana|chalu|new)/i.test(lower)) {
      const code = codeMatch ? codeMatch[1] : `SHIVA${Math.floor(10 + Math.random() * 89)}`;
      const valMatch = lower.match(/(\d{1,4})\s*(%|off|rupees|rs|₹)?/);
      const discountValue = valMatch ? parseInt(valMatch[1], 10) : 15;
      const isFixed = /rupee|rs|₹|flat\s*₹/i.test(lower) && !lower.includes("%");
      const minMatch = lower.match(/min(?:imum)?\s*(?:order|cart)?\s*(?:₹|rs)?\s*(\d{2,6})/i);
      const minOrder = minMatch ? parseInt(minMatch[1], 10) : 999;

      actionTag = `[ADMIN_ACTION: {"type": "CREATE_COUPON", "data": {"code": "${code}", "discountValue": ${discountValue}, "discountType": "${isFixed ? "fixed" : "percentage"}", "minOrder": ${minOrder}}}]`;
      navTag = `[NAVIGATE_PREVIEW: "/admin/coupons"]`;
      text = `Coupon code **${code}** (${discountValue}${isFixed ? "₹" : "%"} OFF, min order ₹${minOrder}) live ho gaya hai!\n\n${actionTag}\n${navTag}`;
      return { text, modelUsed: "Aura Autonomous Agent", provider: "Aura Autonomous Agent" };
    }

    if (codeMatch && /(delete|remove|hatao|hatado)/i.test(lower)) {
      const code = codeMatch[1];
      actionTag = `[ADMIN_ACTION: {"type": "DELETE_COUPON", "data": {"code": "${code}"}}]`;
      navTag = `[NAVIGATE_PREVIEW: "/admin/coupons"]`;
      text = `Coupon **${code}** ko delete karne ka command execute kar diya hai.\n\n${actionTag}\n${navTag}`;
      return { text, modelUsed: "Aura Autonomous Agent", provider: "Aura Autonomous Agent" };
    }

    if (codeMatch && /(pause|disable|band|off|enable|activate|on|chalu)/i.test(lower)) {
      const code = codeMatch[1];
      const disable = /(pause|disable|band|off)/i.test(lower);
      actionTag = `[ADMIN_ACTION: {"type": "UPDATE_COUPON", "data": {"code": "${code}", "isActive": ${!disable}}}]`;
      navTag = `[NAVIGATE_PREVIEW: "/admin/coupons"]`;
      text = `Coupon **${code}** ko **${disable ? "Paused (Inactive)" : "Active"}** mark kar diya hai.\n\n${actionTag}\n${navTag}`;
      return { text, modelUsed: "Aura Autonomous Agent", provider: "Aura Autonomous Agent" };
    }

    // List coupons from live database
    const cRes = await queryStoreData({ entity: "coupons", limit: 20 });
    const listText = (cRes.items || []).length
      ? cRes.items.map((c, i) => `${i + 1}. **${c.code}** — ${c.discountValue}${c.discountType === "percentage" ? "%" : "₹"} OFF · Min ₹${c.minOrder || 0} · ${c.isActive !== false ? "Active" : "Paused"}`).join("\n")
      : "Abhi store mein koi coupon code saved nahi hai.";
    text = `**Store Discount Coupons (${cRes.totalMatched || 0} total):**\n\n${listText}\n\nNaya coupon banane ke liye likhein: *"15% off coupon SHIVA15 bnao min order 999"*.`;
    return { text, modelUsed: "Aura Autonomous Agent", provider: "Aura Autonomous Agent" };
  }

  // 4. Orders Mutation & Live Orders Query (Must run BEFORE Page Preview so "pending orders dikhao" returns real orders!)
  if (/\border|orders|tracking|awb|courier|shipped|delivered|dispatch|unpaid|pending pay/i.test(lower)) {
    const orderIdMatch = prompt.match(/\b(AURA-[A-Z0-9-]+|ORD-[A-Z0-9-]+|#?[A-Z0-9]{6,20})\b/i);
    const trackingMatch = prompt.match(/(?:tracking|awb)\s*(?:id|no|number|#|:|=)?\s*([A-Z0-9-]{5,25})/i);
    const targetStatus = /\bdelivered\b/i.test(lower)
      ? "Delivered"
      : /\bshipped|dispatch/i.test(lower)
      ? "Shipped"
      : /\bconfirmed|confirm\b/i.test(lower)
      ? "Confirmed"
      : /\bprocessing\b/i.test(lower)
      ? "Processing"
      : /\bcancelled|cancel\b/i.test(lower)
      ? "Cancelled"
      : "";
    const targetPayStatus = /\bmark\s*paid|paid\s*kar/i.test(lower) ? "Paid" : "";

    if (orderIdMatch && (targetStatus || targetPayStatus || trackingMatch) && /(karo|kar do|mark|update|set|add)/i.test(lower)) {
      const cleanOrderId = orderIdMatch[1].replace(/^#/, "");
      const payload = { orderId: cleanOrderId };
      if (targetStatus) payload.orderStatus = targetStatus;
      if (targetPayStatus) payload.paymentStatus = targetPayStatus;
      if (trackingMatch) payload.trackingNumber = trackingMatch[1];
      actionTag = `[ADMIN_ACTION: {"type": "UPDATE_ORDER", "data": ${JSON.stringify(payload)}}]`;
      navTag = `[NAVIGATE_PREVIEW: "/admin/orders"]`;
      text = `Order **#${cleanOrderId}** update kar diya hai:\n${targetStatus ? `• Status: **${targetStatus}**\n` : ""}${targetPayStatus ? `• Payment: **${targetPayStatus}**\n` : ""}${trackingMatch ? `• Tracking ID: **${trackingMatch[1]}**\n` : ""}\n${actionTag}\n${navTag}`;
      return { text, modelUsed: "Aura Autonomous Agent", provider: "Aura Autonomous Agent" };
    }

    const filter = /unpaid/i.test(lower)
      ? "unpaid"
      : /pending/i.test(lower)
      ? "pending"
      : /shipped/i.test(lower)
      ? "shipped"
      : /delivered/i.test(lower)
      ? "delivered"
      : /paid/i.test(lower)
      ? "paid"
      : "";
    const searchKey = orderIdMatch ? orderIdMatch[1].replace(/^#/, "") : "";
    const oRes = await queryStoreData({ entity: "orders", search: searchKey, filter, limit: 15 });
    const listText = (oRes.items || []).length
      ? oRes.items.slice(0, 10).map((o, i) =>
          `${i + 1}. **#${o.orderId}** — ₹${Number(o.amount || 0).toLocaleString("en-IN")} · ${o.status || "Pending"} · Pay: ${o.paymentStatus || "Pending"} (${o.paymentMethod || "Online"}) · ${o.customerName}${o.city ? `, ${o.city}` : ""}`
        ).join("\n")
      : `Koi ${filter ? filter + " " : ""}order abhi record mein nahi mila.`;
    text = `**Live Orders Report (${oRes.totalMatched || 0} ${filter ? filter + " " : ""}matched):**\n\n${listText}\n\nKisi order ko update karne ke liye likhein: *"Order #ORDER_ID ko Shipped mark karo tracking AWB123 ke saath"*.`;
    return { text, modelUsed: "Aura Autonomous Agent", provider: "Aura Autonomous Agent" };
  }

  // 5. Delete single product (Hinglish/typos: "7 mukhi produced htana h", "delete product X", "remove X")
  const hasDeleteVerb = /\b(delete|remove|drop|erase)\b/i.test(lower);
  const mentionsProductNoun = /(product|bead|rudraksha|mala|bracelet|yantra|shivling|kavach|item|\d{1,2}\s*[-]?\s*mukhi)/i.test(lower);
  const notCouponOrOrderOrUndo = !/\b(coupon|promo|order|banner|message|chat|task|undo|revert|wapas|rollback)\b/i.test(lower);

  if (hasDeleteVerb && notCouponOrOrderOrUndo) {
    const cleanedHint = normalizedPrompt
      .replace(/\b(please|pls|plz|bhai|sir|ye|yeh|iss|is|ka|ki|ke|ko|se|me|mein|h|hai|hain|ho|karo|kar|do|karna|kardo|delete|remove|drop|erase|product|products|item|items|dashboard|admin|se|bhi|mujh|mujhe)\b/gi, " ")
      .replace(/\s+/g, " ")
      .trim();

    const mukhiMatch = lower.match(/(\d{1,2})\s*[-]?\s*mukhi/i);
    const matchedTarget = await findTargetProduct({
      idOrName: cleanedHint || (mukhiMatch ? `${mukhiMatch[1]} mukhi` : ""),
      name: cleanedHint || (mukhiMatch ? `${mukhiMatch[1]} mukhi` : "")
    });

    if (matchedTarget) {
      actionTag = `[ADMIN_ACTION: ${JSON.stringify({ type: "DELETE_PRODUCT", data: { id: matchedTarget.id, name: matchedTarget.name } })}]`;
      navTag = `[NAVIGATE_PREVIEW: "/admin/products"]`;
      text = `Done! Maine product **"${matchedTarget.name}"** (₹${Number(matchedTarget.price || 0).toLocaleString("en-IN")}) ko catalog se delete kar diya hai aur Admin Dashboard Products update ho gaya hai.\n\nGalti se delete hua ho to niche **Undo** button dabakar turant wapas la sakte hain.\n\n${actionTag}\n${navTag}`;
      return { text, modelUsed: "Aura Autonomous Agent", provider: "Aura Autonomous Agent" };
    }

    if (mentionsProductNoun || cleanedHint.length > 0) {
      const sampleList = (snapshot.products || []).slice(0, 8).map((p, idx) => `${idx + 1}. **${p.name}** (₹${Number(p.price || 0).toLocaleString("en-IN")})`).join("\n");
      text = cleanedHint
        ? `Catalog mein **"${cleanedHint}"** naam ka product nahi mila. Kripya sahi naam ya Mukhi likhein (jaise *"7 Mukhi delete karo"*).\n\n**Abhi Store Catalog ke Products (${snapshot.productsCount}):**\n${sampleList || "Catalog abhi khali hai."}`
        : `Kaun sa product delete karna hai? Kripya product ka naam likhein — jaise *"7 Mukhi product delete karo"*.\n\n**Abhi Store Catalog ke Products (${snapshot.productsCount}):**\n${sampleList || "Catalog abhi khali hai."}`;
      return { text, modelUsed: "Aura Autonomous Agent", provider: "Aura Autonomous Agent" };
    }
  }

  // 6. Update single product (price / MRP / stock / publish / draft / home visibility / rename)
  const hasUpdateVerb = /(price|rate|mrp|stock|update|change|badlo|set|draft|publish|published|hide|unpublish|show\s*on\s*home|home\s*par|naam|rename)/i.test(lower);
  const isUpdateProduct = (mentionsProductNoun || snapshot.products.some(p => p.name && lower.includes(p.name.toLowerCase()))) &&
    hasUpdateVerb &&
    !/(create|add|upload|banao|bana|nya|new|kitna|kya\s+hai|dikhao|list|delete|remove)/i.test(lower);

  if (isUpdateProduct) {
    const mukhiMatch = lower.match(/(\d{1,2}\s*[-]?\s*mukhi)/i);
    const cleanedName = normalizedPrompt
      .replace(/(?:price|rate|mrp|stock)\s*(?:ko|to|=|:)?\s*(?:₹|rs)?\s*\d+/gi, " ")
      .replace(/\b(update|change|badlo|set|karo|kar|do|ko|ka|ki|ke|product|products|draft|publish|published|hide|show|on|home|par|hai|me|mein)\b/gi, " ")
      .replace(/\s+/g, " ")
      .trim();

    const searchHint = mukhiMatch ? mukhiMatch[1] : (cleanedName || (lower.includes("mala") ? "Mala" : ""));
    const matchedTarget = searchHint ? await findTargetProduct({ idOrName: searchHint, name: searchHint }) : null;

    const priceMatch = lower.match(/(?:price|rate|₹|rs)\s*(?:ko|to|=|:)?\s*(\d{2,7})/i);
    const mrpMatch = lower.match(/(?:mrp|compare\s*price)\s*(?:ko|to|=|:)?\s*(\d{2,7})/i);
    const stockMatch = lower.match(/stock\s*(?:ko|to|=|:)?\s*(\d{1,5})/i);

    const updateData = {
      id: matchedTarget?.id || undefined,
      name: matchedTarget?.name || searchHint || "5 Mukhi"
    };
    if (priceMatch) updateData.price = parseInt(priceMatch[1], 10);
    if (mrpMatch) updateData.comparePrice = parseInt(mrpMatch[1], 10);
    if (stockMatch) updateData.stock = parseInt(stockMatch[1], 10);
    if (/\b(draft|hide|unpublish)\b/i.test(lower)) updateData.status = "Draft";
    if (/\b(publish|published|live)\b/i.test(lower)) updateData.status = "Published";
    if (/home\s*(?:se\s*)?hat/i.test(lower) || /hide\s*from\s*home/i.test(lower)) updateData.showOnHome = false;
    if (/home\s*par\s*(?:dikhao|show|lagao)/i.test(lower)) updateData.showOnHome = true;

    if (
      updateData.price !== undefined ||
      updateData.comparePrice !== undefined ||
      updateData.stock !== undefined ||
      updateData.status !== undefined ||
      updateData.showOnHome !== undefined
    ) {
      if (!matchedTarget) {
        const sampleList = (snapshot.products || []).slice(0, 6).map(p => `• **${p.name}**`).join("\n");
        text = `Product **"${searchHint || "target"}"** catalog mein nahi mila. Sahi product naam batayein:\n${sampleList}`;
        return { text, modelUsed: "Aura Autonomous Agent", provider: "Aura Autonomous Agent" };
      }
      actionTag = `[ADMIN_ACTION: ${JSON.stringify({ type: "UPDATE_PRODUCT", data: updateData })}]`;
      navTag = `[NAVIGATE_PREVIEW: "/admin/products"]`;
      text = `Product **"${matchedTarget.name}"** update kar diya hai:\n` +
        `${updateData.price !== undefined ? `• New Price: ₹${updateData.price.toLocaleString("en-IN")}\n` : ""}` +
        `${updateData.comparePrice !== undefined ? `• New MRP: ₹${updateData.comparePrice.toLocaleString("en-IN")}\n` : ""}` +
        `${updateData.stock !== undefined ? `• New Stock: ${updateData.stock}\n` : ""}` +
        `${updateData.status !== undefined ? `• Status: **${updateData.status}**\n` : ""}` +
        `${updateData.showOnHome !== undefined ? `• Show on Home: **${updateData.showOnHome ? "Yes" : "Hidden"}**\n` : ""}` +
        `\n${actionTag}\n${navTag}`;
      return { text, modelUsed: "Aura Autonomous Agent", provider: "Aura Autonomous Agent" };
    }
  }

  // 7. Product creation intent (supports Hinglish, typos like "produced ad karo", custom product names, prices, stock, origin)
  const hasCreateVerb = /\b(create|add|upload|banao|bana|nya|new|naya|publish|insert|launch)\b/i.test(lower);
  const isCreateProduct = (mentionsProductNoun || /"[^"]{2,60}"/.test(prompt)) &&
    hasCreateVerb &&
    !/\b(banner|coupon|feature|task|website)\b/i.test(lower);

  if (isCreateProduct) {
    const quotedMatch = prompt.match(/["']([^"']{2,90})["']/);
    const namedFieldMatch = normalizedPrompt.match(/(?:name|naam|title)\s*[:=\-]?\s*([A-Za-z0-9\s\-&()]{3,70}?)(?=\s+(?:price|rate|mrp|stock|qty|rs|₹|add|banao|category|origin|$))/i);
    const mukhiMatch = lower.match(/(\d{1,2})\s*[-]?\s*mukhi/i);
    const mukhiNum = mukhiMatch ? mukhiMatch[1] : "";

    const priceMatch = lower.match(/(?:price|rate|rs\.?|inr|₹|ke)\s*[:=\-]?\s*(\d{2,6})/i) || prompt.match(/(\d{3,6})\s*(?:rs|₹|rupees?|inr|\/-)/i);
    const mrpMatch = lower.match(/(?:mrp|compare\s*price)\s*[:=\-]?\s*(\d{2,6})/i);
    const stockMatch = lower.match(/(?:stock|qty|quantity|pieces?|pcs)\s*[:=\-]?\s*(\d{1,5})/i) || lower.match(/(\d{1,4})\s*(?:stock|pieces?|pcs)/i);

    const price = priceMatch ? parseInt(priceMatch[1], 10) : (mukhiNum ? parseInt(mukhiNum, 10) * 850 + 2499 : 1499);
    const comparePrice = mrpMatch ? parseInt(mrpMatch[1], 10) : Math.round(price * 1.35);
    const stock = stockMatch ? parseInt(stockMatch[1], 10) : 25;

    const isIndonesia = /indonesi|java/i.test(lower);
    const origin = isIndonesia ? "Indonesia (Java)" : "Nepal (Himalayan)";
    let category = "Rudraksha Beads";
    if (/mala/i.test(lower)) category = "Jaap Mala";
    else if (/bracelet|kada|wrist/i.test(lower)) category = "Bracelets";
    else if (/yantra/i.test(lower)) category = "Yantra";
    else if (/combo|combination|set/i.test(lower)) category = "Combinations";
    else if (/samagri|shivling|idol|incense|dhoop|diya/i.test(lower)) category = "Puja Samagri";

    let extractedTitle = quotedMatch?.[1]?.trim() || namedFieldMatch?.[1]?.trim() || "";
    if (!extractedTitle) {
      let stripped = normalizedPrompt
        .replace(/^(?:ek|ek\s+naya|naya|new|please|pls|sir|bhai)\s+/i, "")
        .replace(/(?:price|rate|mrp|compare\s*price|stock|qty|quantity)\s*[:=\-]?\s*(?:₹|rs\.?|inr)?\s*\d{1,6}/gi, " ")
        .replace(/(?:₹|rs\.?|inr)\s*\d{1,6}|\d{1,6}\s*(?:rs|₹|rupees?|inr|\/-|pieces?|pcs|stock)/gi, " ")
        .replace(/\b(create|add|upload|banao|bana|nya|new|naya|publish|insert|launch|product|products|item|karo|kar|do|karna|hai|h|me|mein|dashboard|admin|store|catalog|ke|ka|ki|ko|se|aur|with|naam|name)\b/gi, " ")
        .replace(/\s+/g, " ")
        .trim();

      if (stripped.length >= 3) {
        if (mukhiNum && !/rudraksha|mala|bracelet|yantra|shivling/i.test(stripped)) {
          stripped = `${stripped} ${isIndonesia ? "Indonesian" : "Nepali"} Rudraksha`;
        }
        extractedTitle = stripped.replace(/\b\w/g, c => c.toUpperCase());
      }
    }

    const deityMap = {
      "1": "Lord Shiva", "5": "Kalagni Rudra", "7": "Goddess Mahalakshmi",
      "8": "Lord Ganesha", "9": "Goddess Durga", "11": "Lord Hanuman (Ekadasha Rudra)", "14": "Deva Mani"
    };
    const deity = (mukhiNum && deityMap[mukhiNum]) || "Lord Shiva";
    const prodName = extractedTitle || `Original ${mukhiNum || "11"} Mukhi ${isIndonesia ? "Indonesian" : "Nepali"} Rudraksha (Lab Certified)`;

    const createPayload = {
      name: prodName,
      ...(mukhiNum ? { mukhi: `${mukhiNum} Mukhi` } : {}),
      price,
      comparePrice,
      stock,
      category,
      origin,
      deity,
      showOnHome: true,
      status: "Published"
    };

    actionTag = `[ADMIN_ACTION: ${JSON.stringify({ type: "CREATE_PRODUCT", data: createPayload })}]`;
    navTag = `[NAVIGATE_PREVIEW: "/admin/products"]`;

    text = `Naya product **${prodName}** (₹${price.toLocaleString("en-IN")} · MRP ₹${comparePrice.toLocaleString("en-IN")} · Stock: ${stock} · ${category}) publish ho gaya hai aur aapke **Admin Dashboard -> Products** mein turant show hoga!\n\n${actionTag}\n${navTag}`;
    return { text, modelUsed: "Aura Autonomous Agent", provider: "Aura Autonomous Agent" };
  }

  // 8. Auto SEO & Hindi/English Keywords Generator for Products
  if (/\b(seo|keyword|keywords|meta\s*title|meta\s*desc|ranking)\b/i.test(lower) && /\b(generate|update|add|banao|optimize|fix|karo|improve|all|sabhi|\d+\s*mukhi)\b/i.test(lower)) {
    const mukhiMatch = lower.match(/(\d{1,2}\s*[-]?\s*mukhi)/i);
    const idOrName = mukhiMatch ? mukhiMatch[1] : "";
    actionTag = `[ADMIN_ACTION: ${JSON.stringify({ type: "GENERATE_PRODUCT_SEO", data: { idOrName } })}]`;
    navTag = `[NAVIGATE_PREVIEW: "/admin/products"]`;
    text = `Storefront products ke liye **English + Hindi Vedic SEO Keywords, Meta Title aur Rich Description** auto-generate karke save kar diye gaye hain!\n\n${actionTag}\n${navTag}`;
    return { text, modelUsed: "Aura Autonomous Agent", provider: "Aura Autonomous Agent" };
  }

  // 9. GitHub Public Repositories & Open-Source Tools Search / Install
  if (/github|open\s*source|repository|\brepo\b|public\s*tool|plugin/i.test(lower)) {
    const searchSubject = normalizedPrompt
      .replace(/\b(github|par|pe|se|me|mein|public|tool|tools|repo|repository|repositories|search|find|dikhao|batao|btao|dalo|add|install|karo|kar|ke|ki|ka|help|mdd|madad|iss|is|open|source|publish|published)\b/gi, " ")
      .replace(/\s+/g, " ")
      .trim() || "ecommerce seo schema javascript";

    const ghRes = await searchGitHubPublicTools({ query: searchSubject, limit: 5 });
    const repoListText = (ghRes.items || []).length
      ? ghRes.items.map((r, i) => `${i + 1}. **[${r.fullName}](${r.url})** (★ ${r.stars.toLocaleString("en-IN")} · ${r.language}) — ${r.description}`).join("\n")
      : `GitHub public search abhi rate-limited ya offline ho sakta hai (${ghRes.error || "check network"}). Curated storefront tools ready hain.`;

    const shouldInstallFeature = /\b(add|install|dalo|lagao|integrate|enable|use)\b/i.test(lower);
    if (shouldInstallFeature) {
      const topRepo = ghRes.items?.[0];
      const toolKey = /whatsapp/i.test(lower)
        ? "whatsapp_concierge_banner"
        : /trust|cert/i.test(lower)
        ? "trust_certificate_bar"
        : "schema_jsonld_booster";
      actionTag = `[ADMIN_ACTION: ${JSON.stringify({ type: "INSTALL_PUBLIC_TOOL", data: { toolKey, githubRepoUrl: topRepo?.url || "" } })}]`;
      navTag = `[NAVIGATE_PREVIEW: "/"]`;
    }

    text = `**GitHub Public Open-Source Tools & Repositories (${searchSubject}):**\n\n${repoListText}${actionTag ? `\n\nIs research par based curated storefront enhancement feature live activate kar diya hai!\n\n${actionTag}\n${navTag}` : `\n\nKisi tool widget ko store par activate karne ke liye likhein: *"Schema SEO booster public tool website mein add karo"* ya *"WhatsApp concierge tool dalo"*.`}`;
    return { text, modelUsed: "Aura Autonomous Agent", provider: "Aura Autonomous Agent" };
  }

  // 10. Google Search / Live Web Research & Market Trends
  if (/\b(google|web\s*search|market\s*trend|competitor|research|online\s*trend)\b/i.test(lower)) {
    const researchQuery = normalizedPrompt
      .replace(/\b(google|par|pe|se|search|research|trend|karo|iss|ko|batao|btao|dikhao|public|tool|ke|mdd|madad)\b/gi, " ")
      .replace(/\s+/g, " ")
      .trim() || "Authentic Nepali Rudraksha India market trends";

    const webRes = await searchGooglePublicResearch({ query: researchQuery });
    const srcLines = (webRes.sources || []).length
      ? "\n\n**Live Public Web Sources:**\n" + webRes.sources.map((s, i) => `${i + 1}. [${s.title}](${s.url})`).join("\n")
      : "";

    const shouldTrainToo = /train|rag|knowledge|seekho|update/i.test(lower);
    if (shouldTrainToo) {
      actionTag = `[ADMIN_ACTION: {"type": "RETRAIN_AI_KNOWLEDGE", "data": {"forceRefresh": true}}]`;
      navTag = `[NAVIGATE_PREVIEW: "/shop"]`;
    }

    text = `**Google & Public Web Research (${webRes.provider}):**\nQuery: *${researchQuery}*\n\n${webRes.summary}${srcLines}${actionTag ? `\n\n${actionTag}\n${navTag}` : ""}`;
    return { text, modelUsed: "Aura Autonomous Agent", provider: "Aura Autonomous Agent" };
  }

  // 11. Live Product Catalog / Stock / Price Query
  if (/(product|products|catalog|item|items|rudraksha|mala|stock|price|rate|sasta|mehnga|cheapest|expensive)/i.test(lower)) {
    const mukhiMatch = lower.match(/(\d{1,2})\s*[-]?\s*mukhi/i);
    const filter = /out\s*of\s*stock|khatam|zero\s*stock/i.test(lower)
      ? "out_of_stock"
      : /low\s*stock|kam\s*stock/i.test(lower)
      ? "low_stock"
      : /draft|unpublished/i.test(lower)
      ? "draft"
      : "";
    const searchHint = mukhiMatch ? `${mukhiMatch[1]} mukhi` : (/mala/i.test(lower) ? "mala" : (/gauri/i.test(lower) ? "gauri" : (/ganesh/i.test(lower) ? "ganesh" : "")));
    const pRes = await queryStoreData({ entity: "products", search: searchHint, filter, limit: 25 });
    let items = [...(pRes.items || [])];
    if (/sasta|cheapest|lowest/i.test(lower)) items.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    if (/mehnga|expensive|costliest|highest/i.test(lower)) items.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));

    const lines = items.slice(0, 10).map((p, i) =>
      `${i + 1}. **${p.name}** — Nepal: ₹${Number(p.price || 0).toLocaleString("en-IN")}${p.indonesiaPrice ? ` · Indo: ₹${Number(p.indonesiaPrice).toLocaleString("en-IN")}` : ""} · Stock: **${p.stock ?? 0}** · ${p.status}`
    ).join("\n");

    text = items.length
      ? `**Live Product Catalog (${pRes.totalMatched} matched${searchHint ? ` for "${searchHint}"` : ""}${filter ? ` · ${filter}` : ""}):**\n\n${lines}`
      : `Catalog mein "${searchHint || filter || "matching"}" ke liye koi product nahi mila. Total catalog products: ${snapshot.productsCount}.`;
    return { text, modelUsed: "Aura Autonomous Agent", provider: "Aura Autonomous Agent" };
  }

  // 12. Customers & VIP Buyers Query
  if (/customer|customers|buyer|buyers|user|users|devotee|clients/i.test(lower)) {
    const isVip = /vip|repeat|top|best/i.test(lower);
    const cRes = await queryStoreData({ entity: "customers", filter: isVip ? "vip" : "", limit: 15 });
    const lines = (cRes.items || []).slice(0, 10).map((c, i) =>
      `${i + 1}. **${c.name || "Devotee"}** — ${c.ordersCount || 0} orders · ₹${Number(c.totalSpent || 0).toLocaleString("en-IN")} · ${c.phone || c.email || "No contact"}`
    ).join("\n");
    text = `**Store Customers (${cRes.totalMatched || snapshot.customersCount || 0} total):**\n\n${lines || "Abhi customer directory sync ho rahi hai."}`;
    return { text, modelUsed: "Aura Autonomous Agent", provider: "Aura Autonomous Agent" };
  }

  // 13. Reviews & Support Tickets Query
  if (/review|reviews|rating|feedback|ticket|tickets|complaint|support/i.test(lower)) {
    const isTicket = /ticket|tickets|complaint|support/i.test(lower);
    if (isTicket) {
      const tRes = await queryStoreData({ entity: "tickets", filter: /open|pending/i.test(lower) ? "open" : "", limit: 12 });
      const lines = (tRes.items || []).slice(0, 8).map((t, i) =>
        `${i + 1}. **${t.subject || t.title || t.id}** — ${t.status || "Open"} · ${t.customerName || t.email || ""}`
      ).join("\n");
      text = `**Support Tickets (${tRes.totalMatched || 0}):**\n\n${lines || "Abhi koi open support ticket pending nahi hai."}`;
    } else {
      const rFilter = /pending/i.test(lower) ? "pending" : (/negative|bad|low/i.test(lower) ? "negative" : "");
      const rRes = await queryStoreData({ entity: "reviews", filter: rFilter, limit: 12 });
      const lines = (rRes.items || []).slice(0, 8).map((r, i) =>
        `${i + 1}. **${r.name || "Customer"}** (${r.rating || 5}★) on *${r.productName || r.productId}* — "${r.text}" [${r.status || "Approved"}]`
      ).join("\n");
      text = `**Customer Reviews (${rRes.totalMatched || 0}):**\n\n${lines || "Abhi koi matching reviews nahi mile."}`;
    }
    return { text, modelUsed: "Aura Autonomous Agent", provider: "Aura Autonomous Agent" };
  }

  // 14. Train / Retrain AI Knowledge & Live Public Trends
  if (/(train|retrain|\brag\b|public data|public trend|trending|knowledge update|ai ko train|seekho)/i.test(lower)) {
    const trends = await getPublicStoreTrendsPayload(true);
    const topTrendText = (trends.trendingProducts || []).slice(0, 5).map((t, i) => `${i + 1}. **${t.name}** — ₹${Number(t.price || 0).toLocaleString("en-IN")} (${t.unitsSold} ordered)`).join("\n") || "Storefront trending products ready";
    const isTrainCmd = /(train|retrain|update|seekho)/i.test(lower);
    if (isTrainCmd) {
      actionTag = `[ADMIN_ACTION: {"type": "RETRAIN_AI_KNOWLEDGE", "data": {"forceRefresh": true}}]`;
      navTag = `[NAVIGATE_PREVIEW: "/shop"]`;
    }
    text = `${isTrainCmd ? "Customer aur Admin AI dono ko **Live Public Data aur Trends** par re-train kar diya hai! " : "**Live Store Trends & Knowledge Summary:** "}(**${trends.indexedDocumentsCount} RAG documents**)\n\n• **Published Products:** ${trends.totals.publishedProducts} (${trends.totals.inStockProducts} in stock)\n• **Active Coupons & Campaigns:** ${trends.totals.activeCoupons} coupons · ${trends.totals.activeCampaigns} active campaigns\n• **Shipping & Payments:** COD ${trends.shippingAndPayments.enableCod ? "ON" : "OFF"} · Online Pay ${trends.shippingAndPayments.enableOnlinePayment ? "ON" : "OFF"}\n\n**Top Trending Products:**\n${topTrendText}${actionTag ? `\n\n${actionTag}\n${navTag}` : ""}`;
    return { text, modelUsed: "Aura Autonomous Agent", provider: "Aura Autonomous Agent" };
  }

  // 15. Add Feature / Banner intent
  const isFeature = /feature|banner|announcement|offer banner|sale banner/i.test(lower) && /(add|create|lagao|dikhao|banao|publish)/i.test(lower);
  if (isFeature) {
    const liveCoupon = (snapshot.coupons || []).find(c => c.status === "Active" || c.isActive !== false);
    const couponSuffix = liveCoupon ? ` — Use Code ${liveCoupon.code}` : "";
    const featTitle = `Sacred Nepali Rudraksha Collection${couponSuffix}`;
    const featSubtitle = "100% Lab-Certified Nepali Beads • Haridwar Prana Pratishtha • Insured Delivery";
    actionTag = `[ADMIN_ACTION: {"type": "ADD_WEBSITE_FEATURE", "data": {"featureType": "flash_sale_banner", "title": "${featTitle}", "subtitle": "${featSubtitle}", "ctaText": "Shop Collection", "ctaLink": "/shop"}}]`;
    navTag = `[NAVIGATE_PREVIEW: "/"]`;
    text = `Live storefront feature banner publish ho gaya hai!\n\n${actionTag}\n${navTag}`;
    return { text, modelUsed: "Aura Autonomous Agent", provider: "Aura Autonomous Agent" };
  }

  // 12. Growth / Revenue / Insights / Audit
  if (/growth|audit|insight|revenue|profit|kamai|sales|bikri|report|analytics|suggestion|socha/i.test(lower)) {
    const audit = await runStoreGrowthAndHealthAudit("all");
    const m = audit.metrics;
    const oppsText = audit.opportunities.length
      ? audit.opportunities.map((o, i) => `${i + 1}. **[${o.priority}] ${o.title}** — ${o.detail}`).join("\n")
      : "Sabhi metrics healthy hain! Koi immediate bottleneck nahi mila.";
    const vipText = audit.vipBuyers.length
      ? audit.vipBuyers.map(v => `• **${v.name}** (${v.ordersCount} orders · ₹${v.totalSpent.toLocaleString("en-IN")}) ${v.phone || v.email}`).join("\n")
      : "Abhi repeat VIP buyers record ho rahe hain.";

    text = `**Executive Store Growth & Health Audit**\n\n• **Total Revenue:** ₹${m.totalRevenue.toLocaleString("en-IN")} (${m.activeOrdersCount} orders · Avg Order Value: ₹${m.avgOrderValue.toLocaleString("en-IN")})\n• **Payment Split:** Online ${m.onlineOrdersCount} vs COD ${m.codOrdersCount} · Unpaid Online Pending: ${m.unpaidOnlineOrdersCount}\n• **Catalog Health:** ${m.totalProducts} products · Out-of-Stock: ${m.outOfStockCount} · Low Stock: ${m.lowStockCount} · Missing SEO: ${m.missingSeoCount}\n• **Support & Reviews:** Open Tickets: ${m.openTicketsCount} · Pending Reviews: ${m.pendingReviewsCount}\n\n**Actionable Growth Opportunities:**\n${oppsText}\n\n**Top VIP Repeat Buyers:**\n${vipText}`;
    return { text, modelUsed: "Aura Autonomous Agent", provider: "Aura Autonomous Agent" };
  }

  // 13. Bug scan / diagnostics + optional autofix
  if (/bug|scan|diagnostic|issue|error|health|fix|theek|shi|problem/i.test(lower)) {
    const shouldFix = /\b(fix|repair|theek|shi|auto)\b/i.test(lower);
    if (shouldFix) {
      actionTag = `[ADMIN_ACTION: {"type": "AUTO_FIX_BUGS", "data": {}}]`;
      text = `Website aur database ka automatic bug scan aur safe auto-repair run kar diya hai.\n\n${actionTag}`;
    } else {
      const diag = await runWebsiteBugDiagnostic();
      const summaryLines = diag.bugs.slice(0, 8).map(b => `• [${b.severity.toUpperCase()}] **${b.title}** — ${b.detail}`).join("\n");
      text = `**Store Diagnostic Complete** (${diag.bugsCount} issues found across ${diag.metrics.productsScanned} products, ${diag.metrics.ordersScanned} orders):\n\n${summaryLines || "Zero bugs detected! All endpoints and catalog records are healthy."}`;
    }
    return { text, modelUsed: "Aura Autonomous Agent", provider: "Aura Autonomous Agent" };
  }

  // 14. Undo intent handled cleanly in detectAndExecuteAdminIntents without emitting canned intro
  if (/\b(undo|revert|wapas|pichla change hatao|rollback)\b/i.test(lower)) {
    return {
      text: "Checking Action Ledger to revert the latest change...",
      modelUsed: "Aura Autonomous Agent",
      provider: "Aura Autonomous Agent"
    };
  }

  // 15. Explicit Page Preview Navigation
  if (/\b(page|preview|route)\b/i.test(lower) && /\b(dikhao|open|kholo|view|show)\b/i.test(lower)) {
    let route = "/";
    let pageTitle = "Storefront Home";
    if (lower.includes("shop") || lower.includes("catalog")) { route = "/shop"; pageTitle = "Shop Catalog (/shop)"; }
    else if (lower.includes("order")) { route = "/admin/orders"; pageTitle = "Admin Orders (/admin/orders)"; }
    else if (lower.includes("product")) { route = "/admin/products"; pageTitle = "Admin Products (/admin/products)"; }
    else if (lower.includes("coupon")) { route = "/admin/coupons"; pageTitle = "Admin Coupons (/admin/coupons)"; }
    else if (lower.includes("setting")) { route = "/admin/settings"; pageTitle = "Admin Settings (/admin/settings)"; }
    else if (lower.includes("calc") || lower.includes("kundali")) { route = "/rudraksha-calculator"; pageTitle = "Rudraksha Calculator"; }
    navTag = `[NAVIGATE_PREVIEW: "${route}"]`;
    text = `Live preview panel mein **${pageTitle}** open kar diya hai.\n\n${navTag}`;
    return { text, modelUsed: "Aura Autonomous Agent", provider: "Aura Autonomous Agent" };
  }

  // 16. Arithmetic calculation check (margin / discount / pricing math)
  const mathExprMatch = prompt.match(/([\d,.]+\s*(?:[+\-*/×÷%]|percent|discount)\s*[\d,.]+)/i);
  if (mathExprMatch) {
    const pctCalc = lower.match(/(\d+(?:\.\d+)?)\s*(?:ka|of)\s*(\d+(?:\.\d+)?)\s*%/i);
    if (pctCalc) {
      const base = parseFloat(pctCalc[1]);
      const pct = parseFloat(pctCalc[2]);
      const diff = Math.round((base * pct) / 100);
      text = `**Calculation:** ₹${base.toLocaleString("en-IN")} ka ${pct}% = **₹${diff.toLocaleString("en-IN")}** (Net after ${pct}% off: **₹${(base - diff).toLocaleString("en-IN")}**).`;
      return { text, modelUsed: "Aura Autonomous Agent", provider: "Aura Autonomous Agent" };
    }
  }

  // 17. Greeting / Capabilities check
  if (/^(hi+|hello+|hey+|namaste|namaskar|pranam|hlo|hlw|kaise ho|how are you|kya hal|help|commands?)[\s!?.]*$/i.test(lower)) {
    text = `Namaste! Main **Aura Admin Copilot** hoon — aapke store (${snapshot.productsCount} products, ${snapshot.ordersCount} orders, ${snapshot.couponsCount} coupons) se live connected hoon.\n\nAap mujhse directly kuchh bhi poochh ya karwa sakte hain:\n• *"Pending orders aur unpaid status dikhao"*\n• *"7 Mukhi ka price aur stock kitna hai?"*\n• *"15% off coupon SHIVA15 bnao min order 999"*\n• *"COD off karo"* / *"Sabhi products par 10% discount lagao"*\n• *"Store bugs scan karke auto-fix karo"*`;
    return { text, modelUsed: "Aura Autonomous Agent", provider: "Aura Autonomous Agent" };
  }

  // 18. Smart Keyword-Search + Contextual Response (Prevents ever returning an identical canned block)
  const stopWords = new Set(["hai", "hain", "kya", "ka", "ki", "ke", "ko", "se", "me", "mein", "par", "aur", "the", "is", "are", "for", "and", "how", "what", "why", "who", "show", "tell", "batao", "btao", "karo", "kr", "do", "mujhe", "mera", "mere", "store", "admin", "website"]);
  const searchTokens = lower
    .replace(/[^\w\s\u0900-\u097F]/g, " ")
    .split(/\s+/)
    .filter(w => w.length >= 2 && !stopWords.has(w));

  const matchedProducts = (snapshot.products || []).filter(p => {
    const hay = `${p.name || ""} ${p.category || ""} ${p.mukhi || ""} ${p.slug || ""} ${p.description || ""}`.toLowerCase();
    return searchTokens.some(t => hay.includes(t));
  }).slice(0, 5);

  const matchedCoupons = (snapshot.coupons || []).filter(c => {
    const hay = `${c.code || ""} ${c.description || ""}`.toLowerCase();
    return searchTokens.some(t => hay.includes(t));
  }).slice(0, 3);

  const matchedOrders = (snapshot.recentOrders || []).filter(o => {
    const hay = `${o.orderId || o.id || ""} ${o.customerName || ""} ${o.orderStatus || o.status || ""} ${o.paymentStatus || ""}`.toLowerCase();
    return searchTokens.some(t => hay.includes(t));
  }).slice(0, 5);

  const dynamicParts = [];
  if (matchedProducts.length > 0) {
    dynamicParts.push(
      `**Matched Products:**\n` +
        matchedProducts
          .map(p => `• **${p.name}** — ₹${Number(p.price || 0).toLocaleString("en-IN")} (Stock: ${p.stock ?? 0})`)
          .join("\n")
    );
  }
  if (matchedOrders.length > 0) {
    dynamicParts.push(
      `**Matched Orders:**\n` +
        matchedOrders
          .map(o => `• **#${o.orderId || o.id}** — ₹${Number(o.finalAmount || o.total || 0).toLocaleString("en-IN")} · ${o.orderStatus || o.status || "Pending"} (${o.customerName || "Guest"})`)
          .join("\n")
    );
  }
  if (matchedCoupons.length > 0) {
    dynamicParts.push(
      `**Matched Coupons:**\n` +
        matchedCoupons
          .map(c => `• **${c.code}** — ${c.discountValue}${c.discountType === "percentage" ? "%" : "₹"} OFF`)
          .join("\n")
    );
  }

  if (dynamicParts.length > 0) {
    text = `Aapke sawaal *"${prompt}"* se judi live store details:\n\n${dynamicParts.join("\n\n")}`;
  } else {
    text = `Maine aapke sawaal *"${prompt}"* ke liye live store snapshot check kiya (${snapshot.productsCount} products · ${snapshot.ordersCount} orders · ₹${Number(snapshot.totalRevenue || 0).toLocaleString("en-IN")} revenue · COD ${snapshot.settings?.enableCod !== false ? "ON" : "OFF"}).\n\nIs par exact action lene ke liye aap direct specify kar sakte hain — jaise kisi product/order/coupon ka naam, ya *"growth audit"*, *"pending orders"*, *"coupons list"*, ya *"bugs fix karo"*.`;
  }

  return { text, modelUsed: "Aura Autonomous Agent", provider: "Aura Autonomous Agent" };
}

/**
 * Gather comprehensive live website snapshot from MongoDB for the Admin AI Agent
 */
export async function getCompleteWebsiteSnapshot() {
  let products = [];
  let orders = [];
  let coupons = [];
  let customersCount = 0;
  let reviewsCount = 0;
  let ticketsCount = 0;
  let settings = null;
  let activeOffer = null;

  if (isDbConnected()) {
    try {
      [products, orders, coupons, customersCount, reviewsCount, ticketsCount, settings, activeOffer] = await Promise.all([
        Product.find().sort({ createdAt: -1 }).limit(80).lean().catch(() => []),
        Order.find().sort({ createdAt: -1 }).limit(30).lean().catch(() => []),
        Coupon.find().limit(30).lean().catch(() => []),
        Customer.countDocuments().catch(() => 0),
        Review.countDocuments().catch(() => 0),
        Ticket.countDocuments({ status: { $nin: ["Resolved", "Closed"] } }).catch(() => 0),
        Setting.findOne({ id: "STORE_SETTINGS" }).lean().catch(() => null),
        ActiveOffer.findOne({ id: "OFFER-CENTRAL-1" }).lean().catch(() => null)
      ]);
    } catch (_) {}
  }

  if ((!products || products.length === 0) && inMemoryStore.isProductsSyncedFromDb && Array.isArray(inMemoryStore.products)) {
    products = inMemoryStore.products;
  }

  const totalRevenue = orders
    .filter(o => (o.orderStatus || o.status) !== "Cancelled")
    .reduce((acc, o) => acc + (Number(o.finalAmount || o.total || o.amount) || 0), 0);
  const lowStockProducts = products.filter(p => Number(p.stock ?? 0) <= 10);

  return {
    mongoConnected: isDbConnected(),
    productsCount: products.length,
    products,
    lowStockCount: lowStockProducts.length,
    ordersCount: orders.length,
    recentOrders: orders.slice(0, 12),
    totalRevenue,
    couponsCount: coupons.length,
    coupons,
    customersCount,
    reviewsCount,
    openTicketsCount: ticketsCount,
    activeOffer,
    settings: settings || { storeName: "Aura Rudraksha", aiCustomFeatures: [], enableCod: true, enableOnlinePayment: true }
  };
}

/**
 * Scan the entire website & MongoDB for bugs, SEO issues, missing fields, and anomalies
 */
export async function runWebsiteBugDiagnostic() {
  const snapshot = await getCompleteWebsiteSnapshot();
  const bugs = [];

  if (!snapshot.mongoConnected) {
    bugs.push({
      id: "bug_db_conn",
      severity: "high",
      category: "Database",
      title: "MongoDB Cluster Disconnected / Using Fallback",
      detail: "Primary MongoDB socket is not connected. Reconnect required.",
      autoFixable: true,
      fixType: "RECONNECT_DB"
    });
  }

  for (const p of snapshot.products) {
    const pid = p.id || String(p._id);
    if (!p.price || Number(p.price) <= 0) {
      bugs.push({
        id: `bug_price_${pid}`,
        severity: "critical",
        category: "Product Pricing",
        title: `Invalid Price on "${p.name}"`,
        detail: `Product "${p.name}" (ID: ${pid}) has price ₹${p.price || 0}.`,
        targetId: pid,
        autoFixable: true,
        fixType: "FIX_PRODUCT_PRICE"
      });
    }
    if (Number(p.stock ?? 0) <= 5) {
      bugs.push({
        id: `bug_stock_${pid}`,
        severity: "medium",
        category: "Inventory",
        title: `Critical Low Stock on "${p.name}" (${p.stock ?? 0} left)`,
        detail: `Stock is at ${p.stock ?? 0} units and risks stockout.`,
        targetId: pid,
        autoFixable: true,
        fixType: "RESTOCK_PRODUCT"
      });
    }
    if (!p.description || String(p.description).trim().length < 40) {
      bugs.push({
        id: `bug_seo_${pid}`,
        severity: "low",
        category: "SEO & Content",
        title: `Thin / Missing SEO Description on "${p.name}"`,
        detail: `Description is only ${String(p.description || "").length} chars. Needs Vedic & SEO enrichment.`,
        targetId: pid,
        autoFixable: true,
        fixType: "ENRICH_PRODUCT_SEO"
      });
    }
    const hasImg = (Array.isArray(p.images) && p.images.length > 0 && p.images[0]) || p.img || p.image;
    if (!hasImg) {
      bugs.push({
        id: `bug_img_${pid}`,
        severity: "high",
        category: "Media",
        title: `Missing Primary Image on "${p.name}"`,
        detail: `Product has no primary image configured.`,
        targetId: pid,
        autoFixable: true,
        fixType: "FIX_PRODUCT_IMAGE"
      });
    }
  }

  for (const c of snapshot.coupons) {
    if (c.expiryDate && new Date(c.expiryDate) < new Date() && c.isActive !== false) {
      bugs.push({
        id: `bug_coupon_${c.code}`,
        severity: "low",
        category: "Promotions",
        title: `Expired Coupon "${c.code}" Still Marked Active`,
        detail: `Coupon expired on ${c.expiryDate}.`,
        targetId: c.id || c.code,
        autoFixable: true,
        fixType: "DEACTIVATE_EXPIRED_COUPON"
      });
    }
  }

  await recordPrivateWorkLog({
    category: "bug_scan",
    status: "completed",
    title: `Website Bug & Health Scan Completed (${bugs.length} issues found)`,
    detail: `Scanned ${snapshot.productsCount} products, ${snapshot.ordersCount} orders, ${snapshot.couponsCount} coupons.`
  });

  return {
    scannedAt: new Date().toISOString(),
    healthy: bugs.length === 0,
    bugsCount: bugs.length,
    bugs,
    metrics: {
      mongoConnected: snapshot.mongoConnected,
      productsScanned: snapshot.productsCount,
      ordersScanned: snapshot.ordersCount,
      couponsScanned: snapshot.couponsCount
    }
  };
}

/**
 * Helper to resolve a product by id, _id, slug, mukhi, or fuzzy partial name
 */
async function findTargetProduct(data = {}) {
  const rawIdOrName = String(data.id || data.slug || data.idOrName || data.name || "").trim();
  const idOrSlug = String(data.id || data.slug || data.idOrName || "").trim();
  const nameHint = String(data.name || data.idOrName || "").trim();
  let existing = null;

  let candidates = [];
  if (isDbConnected()) {
    if (idOrSlug) {
      existing = await Product.findOne({ $or: [{ id: idOrSlug }, { slug: idOrSlug }] }).lean().catch(() => null);
    }
    if (!existing && nameHint) {
      existing = await Product.findOne({ name: new RegExp(escapeRegex(nameHint), "i") }).lean().catch(() => null);
    }
    if (!existing) {
      candidates = await Product.find().limit(250).lean().catch(() => []);
    }
  }
  if (!candidates.length && Array.isArray(inMemoryStore.products)) {
    candidates = inMemoryStore.products;
  }

  if (!existing && candidates.length > 0) {
    const low = (idOrSlug || nameHint).toLowerCase();
    existing = candidates.find(p =>
      String(p.id || "").toLowerCase() === low ||
      String(p._id || "").toLowerCase() === low ||
      String(p.slug || "").toLowerCase() === low ||
      (nameHint && String(p.name || "").toLowerCase().includes(nameHint.toLowerCase()))
    ) || null;
  }

  // Fuzzy Mukhi + Token Overlap match (handles partial or Hinglish phrases like "7 mukhi" or "bracelets")
  if (!existing && rawIdOrName && candidates.length > 0) {
    const mukhiMatch = rawIdOrName.toLowerCase().match(/(\d{1,2})\s*[-]?\s*mukhi/);
    if (mukhiMatch) {
      const mRegex = new RegExp(`\\b${mukhiMatch[1]}\\s*[-]?\\s*mukhi\\b`, "i");
      existing = candidates.find(p =>
        mRegex.test(String(p.name || "")) ||
        mRegex.test(String(p.mukhi || "")) ||
        String(p.mukhi || "").trim() === mukhiMatch[1]
      ) || null;
    }

    if (!existing) {
      const tokens = rawIdOrName
        .toLowerCase()
        .replace(/[^\w\s]/g, " ")
        .split(/\s+/)
        .filter(t => t.length >= 2 && !["product", "produced", "item", "delete", "remove", "karo"].includes(t));

      if (tokens.length > 0) {
        let bestScore = 0;
        let bestProd = null;
        for (const p of candidates) {
          const hay = `${p.name || ""} ${p.slug || ""} ${p.category || ""} ${p.mukhi || ""}`.toLowerCase();
          let score = 0;
          for (const t of tokens) {
            if (hay.includes(t)) score += t.length >= 4 ? 2 : 1;
          }
          if (score > bestScore) {
            bestScore = score;
            bestProd = p;
          }
        }
        if (bestScore >= 2 || (tokens.length === 1 && bestScore >= 1)) {
          existing = bestProd;
        }
      }
    }
  }

  return existing;
}

/**
 * Execute an Autonomous Admin Action (Full Store CRUD, Settings, Offers, Banners, Reviews, Tickets, Bug Fix, etc.)
 */
export async function executeAdminAgentAction(actionPayload, context = {}) {
  const { type, data = {} } = actionPayload || {};
  const { sessionId = "", taskId = "", source = "admin_chat" } = context;

  if (!type) return null;

  switch (type.toUpperCase()) {
    case "CREATE_PRODUCT": {
      const hasExplicitMukhi = /\d+\s*[-]?\s*mukhi/i.test(String(data.name || "")) || Boolean(data.mukhi);
      const mukhiMatch = hasExplicitMukhi ? String(data.name || data.mukhi || "").match(/(\d+)/) : null;
      const mukhiNum = mukhiMatch ? parseInt(mukhiMatch[1], 10) : null;

      const name = String(data.name || (mukhiNum ? `${mukhiNum} Mukhi Authentic Nepali Rudraksha` : "Authentic Himalayan Rudraksha Product")).trim();
      const slug = (data.slug || name)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") + "-" + Math.random().toString(36).substring(2, 5);
      const id = "prod_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
      const price = Number(data.price) || (mukhiNum ? (mukhiNum === 1 ? 14999 : mukhiNum >= 11 ? 5499 : 1499) : 1499);
      const comparePrice = Number(data.comparePrice) || Math.round(price * 1.35);
      const stock = Number(data.stock ?? 25);
      const defaultImg = data.image || data.img || "/images/placeholder.svg";
      const category = data.category || "Rudraksha Beads";
      const origin = data.origin || "Nepal (Himalayan)";
      const nowIso = new Date().toISOString();

      const seoMeta = buildProductSeoMetadata({ name, mukhi: mukhiNum ? `${mukhiNum} Mukhi` : "", origin, category, description: data.description });

      const newProductDoc = {
        id,
        name,
        slug,
        category,
        subCategory: data.subCategory || (mukhiNum ? `${mukhiNum} Mukhi` : category),
        ...(mukhiNum ? { mukhi: `${mukhiNum} Mukhi` } : {}),
        isRudraksha: /rudraksha|mukhi/i.test(`${name} ${category}`),
        hasCertificate: true,
        price,
        comparePrice,
        mrp: comparePrice,
        discount: comparePrice > price ? Math.round(((comparePrice - price) / comparePrice) * 100) : 0,
        stock,
        ...(data.indonesiaPrice !== undefined ? { indonesiaPrice: Number(data.indonesiaPrice), hasIndonesianVariant: true, indonesianPrice: Number(data.indonesiaPrice) } : {}),
        ...(data.indonesiaStock !== undefined ? { indonesiaStock: Number(data.indonesiaStock), indonesianStock: Number(data.indonesiaStock) } : {}),
        origin,
        rulingPlanet: data.rulingPlanet || "Jupiter / Shiva",
        deity: data.deity || "Lord Shiva (Kalagni Rudra)",
        mantra: data.mantra || "Om Hreem Namah",
        description: data.description || seoMeta.description,
        keywords: Array.isArray(data.keywords) && data.keywords.length ? data.keywords : seoMeta.keywords,
        searchKeywords: Array.isArray(data.keywords) && data.keywords.length ? data.keywords : seoMeta.searchKeywords,
        tags: Array.isArray(data.tags) && data.tags.length ? data.tags : seoMeta.tags,
        metaTitle: data.metaTitle || seoMeta.metaTitle,
        metaDescription: data.metaDescription || seoMeta.metaDescription,
        benefits: Array.isArray(data.benefits) && data.benefits.length > 0
          ? data.benefits
          : [
              "100% Natural X-Ray & Lab Certified Spiritual Bead",
              "Prana-Pratishtha energized by Kashi Vedic Acharyas",
              "Balances planetary energies and enhances spiritual aura"
            ],
        images: [defaultImg],
        img: defaultImg,
        image: defaultImg,
        status: data.status || "Published",
        showOnHome: data.showOnHome !== false,
        isPopular: true,
        badge: data.badge || "New Arrival",
        homeBadge: data.badge || "New Arrival",
        rating: 4.9,
        reviews: 0,
        certification: "ISO 9001:2015 Lab Certified",
        createdAt: nowIso,
        updatedAt: nowIso
      };

      let savedProd = newProductDoc;
      if (isDbConnected()) {
        const created = await Product.create(newProductDoc);
        savedProd = created.toObject ? created.toObject() : created;
        if (newProductDoc.showOnHome !== false) {
          try {
            const settingDoc = await Setting.findOne({ id: "STORE_SETTINGS" }).lean();
            if (settingDoc?.homeProductLayout) {
              const liveArr = Array.isArray(settingDoc.homeProductLayout.live) ? settingDoc.homeProductLayout.live : [];
              const draftArr = Array.isArray(settingDoc.homeProductLayout.draft) ? settingDoc.homeProductLayout.draft : [];
              await Setting.updateOne(
                { id: "STORE_SETTINGS" },
                {
                  $set: {
                    "homeProductLayout.live": [id, ...liveArr.filter(x => String(x) !== id)],
                    "homeProductLayout.draft": [id, ...draftArr.filter(x => String(x) !== id)]
                  }
                }
              );
            }
          } catch (_) {}
        }
      }
      if (!Array.isArray(inMemoryStore.products)) {
        inMemoryStore.products = [];
      }
      inMemoryStore.products.unshift(savedProd);
      inMemoryStore.isProductsSyncedFromDb = true;
      invalidateProductCache();
      invalidateRagCache();

      const log = await recordAdminActionLog({
        actionType: "CREATE_PRODUCT",
        title: `Uploaded Product: ${name} (₹${price})`,
        description: `Created "${name}" (Stock: ${stock}, Price: ₹${price}, Slug: ${slug})`,
        targetCollection: "Product",
        targetId: id,
        previousData: null,
        newData: savedProd,
        previewRoute: `/product/${slug}`,
        source,
        sessionId,
        taskId
      });

      return {
        actionId: log.actionId,
        actionType: "CREATE_PRODUCT",
        title: log.title,
        previewRoute: `/product/${slug}`,
        adminProductsRoute: "/admin/products",
        previewTitle: `New Product Live Preview: ${name}`,
        product: savedProd
      };
    }

    case "UPDATE_PRODUCT": {
      const existing = await findTargetProduct(data);
      if (!existing) {
        return { error: `Product "${data.idOrName || data.name || data.id}" not found in catalog.` };
      }

      const updates = {};
      if (data.price !== undefined) updates.price = Number(data.price);
      if (data.comparePrice !== undefined) {
        updates.comparePrice = Number(data.comparePrice);
        updates.mrp = Number(data.comparePrice);
      }
      if (data.stock !== undefined) updates.stock = Number(data.stock);
      if (data.indonesiaPrice !== undefined) updates.indonesiaPrice = Number(data.indonesiaPrice);
      if (data.indonesiaStock !== undefined) updates.indonesiaStock = Number(data.indonesiaStock);
      if (data.newName) updates.name = String(data.newName);
      if (data.description !== undefined) updates.description = String(data.description);
      if (data.seoTitle !== undefined) updates.seoTitle = String(data.seoTitle);
      if (data.seoDescription !== undefined) updates.seoDescription = String(data.seoDescription);
      if (data.status !== undefined) updates.status = String(data.status);
      if (data.badge !== undefined) updates.badge = String(data.badge);
      if (data.showOnHome !== undefined) updates.showOnHome = Boolean(data.showOnHome);
      if (data.image !== undefined) {
        updates.img = data.image;
        updates.image = data.image;
        updates.images = [data.image];
      }

      const updatedDoc = { ...existing, ...updates };
      if (isDbConnected()) {
        await Product.updateOne({ id: existing.id }, { $set: updates });
      }
      if (Array.isArray(inMemoryStore.products)) {
        const idx = inMemoryStore.products.findIndex(p => p.id === existing.id);
        if (idx !== -1) inMemoryStore.products[idx] = { ...inMemoryStore.products[idx], ...updates };
      }
      invalidateProductCache();
      invalidateRagCache();

      const pRoute = `/product/${existing.slug || existing.id}`;
      const log = await recordAdminActionLog({
        actionType: "UPDATE_PRODUCT",
        title: `Updated Product: ${existing.name}`,
        description: `Updated (${Object.keys(updates).join(", ")}) on "${existing.name}"`,
        targetCollection: "Product",
        targetId: existing.id,
        previousData: existing,
        newData: updatedDoc,
        previewRoute: pRoute,
        source,
        sessionId,
        taskId
      });

      return {
        actionId: log.actionId,
        actionType: "UPDATE_PRODUCT",
        title: log.title,
        previewRoute: pRoute,
        previewTitle: `Updated Product: ${existing.name}`,
        product: updatedDoc
      };
    }

    case "BULK_UPDATE_PRODUCTS": {
      const catFilter = data.category ? String(data.category).trim().toLowerCase() : "";
      const discountPct = data.discountPercent !== undefined ? Number(data.discountPercent) : null;
      const setStock = data.setStock !== undefined ? Number(data.setStock) : null;
      const onlyLowStock = Boolean(data.onlyLowStock);
      const showOnHomeFlag = data.showOnHome !== undefined ? Boolean(data.showOnHome) : null;

      let targets = isDbConnected()
        ? await Product.find().lean().catch(() => [])
        : [...getAllInMemoryProducts()];
      if (!targets.length) targets = [...getAllInMemoryProducts()];

      if (catFilter) {
        targets = targets.filter(p => String(p.category || "").toLowerCase().includes(catFilter));
      }
      if (onlyLowStock) {
        targets = targets.filter(p => Number(p.stock ?? 0) <= 10);
      }
      if (!targets.length) {
        return { error: "No matching products found for bulk update." };
      }

      const prevSnapshots = [];
      let modifiedCount = 0;

      for (const p of targets) {
        const updates = {};
        if (discountPct !== null && !isNaN(discountPct) && discountPct !== 0 && p.price > 0) {
          const factor = 1 - discountPct / 100;
          const nextPrice = Math.max(1, Math.round(Number(p.price) * factor));
          updates.price = nextPrice;
          if (!p.comparePrice || p.comparePrice < p.price) {
            updates.comparePrice = Number(p.price);
            updates.mrp = Number(p.price);
          }
          if (p.indonesiaPrice && Number(p.indonesiaPrice) > 0) {
            updates.indonesiaPrice = Math.max(1, Math.round(Number(p.indonesiaPrice) * factor));
          }
        }
        if (setStock !== null && !isNaN(setStock)) {
          updates.stock = Math.max(0, setStock);
        }
        if (showOnHomeFlag !== null) {
          updates.showOnHome = showOnHomeFlag;
        }

        if (Object.keys(updates).length > 0) {
          prevSnapshots.push({
            id: p.id,
            price: p.price,
            comparePrice: p.comparePrice,
            mrp: p.mrp,
            indonesiaPrice: p.indonesiaPrice,
            stock: p.stock,
            showOnHome: p.showOnHome
          });
          if (isDbConnected()) {
            await Product.updateOne({ id: p.id }, { $set: updates });
          }
          if (Array.isArray(inMemoryStore.products)) {
            const idx = inMemoryStore.products.findIndex(mp => mp.id === p.id);
            if (idx !== -1) inMemoryStore.products[idx] = { ...inMemoryStore.products[idx], ...updates };
          }
          modifiedCount++;
        }
      }

      invalidateProductCache();
      invalidateRagCache();

      const summaryParts = [];
      if (discountPct) summaryParts.push(`${discountPct}% price adjustment`);
      if (setStock !== null) summaryParts.push(`stock=${setStock}`);
      if (showOnHomeFlag !== null) summaryParts.push(`showOnHome=${showOnHomeFlag}`);

      const log = await recordAdminActionLog({
        actionType: "BULK_UPDATE_PRODUCTS",
        title: `Bulk Updated ${modifiedCount} Products (${summaryParts.join(", ")})`,
        description: `Applied ${summaryParts.join(", ")} across ${modifiedCount} items${catFilter ? ` in "${data.category}"` : ""}. Full per-item backup saved for Undo.`,
        targetCollection: "Product",
        targetId: `bulk_${modifiedCount}`,
        previousData: prevSnapshots,
        newData: { discountPct, setStock, showOnHomeFlag, modifiedCount },
        previewRoute: "/admin/products",
        source,
        sessionId,
        taskId
      });

      return {
        actionId: log.actionId,
        actionType: "BULK_UPDATE_PRODUCTS",
        title: log.title,
        modifiedCount,
        previewRoute: "/admin/products",
        previewTitle: `Admin Products (${modifiedCount} Updated)`
      };
    }

    case "DELETE_PRODUCT": {
      const existing = await findTargetProduct(data);
      if (!existing) {
        return { error: `Product "${data.name || data.idOrName || data.id || ""}" not found to delete.` };
      }
      if (isDbConnected()) {
        await Product.deleteOne({
          $or: [
            { id: existing.id },
            ...(existing.slug ? [{ slug: existing.slug }] : [])
          ]
        });
        try {
          await Setting.updateOne(
            { id: "STORE_SETTINGS" },
            {
              $pull: {
                "homeProductLayout.live": existing.id,
                "homeProductLayout.draft": existing.id
              }
            }
          );
        } catch (_) {}
      }
      if (Array.isArray(inMemoryStore.products)) {
        const idx = inMemoryStore.products.findIndex(p => String(p.id) === String(existing.id) || (existing.slug && p.slug === existing.slug));
        if (idx !== -1) inMemoryStore.products.splice(idx, 1);
        inMemoryStore.isProductsSyncedFromDb = true;
      }
      invalidateProductCache();
      invalidateRagCache();

      const log = await recordAdminActionLog({
        actionType: "DELETE_PRODUCT",
        title: `Deleted Product: ${existing.name}`,
        description: `Removed "${existing.name}" from store catalog (Full backup saved for Undo).`,
        targetCollection: "Product",
        targetId: existing.id,
        previousData: existing,
        newData: null,
        previewRoute: "/admin/products",
        source,
        sessionId,
        taskId
      });

      return {
        actionId: log.actionId,
        actionType: "DELETE_PRODUCT",
        title: log.title,
        deletedProductId: existing.id,
        previewRoute: "/admin/products",
        previewTitle: "Admin Products Catalog (After Deletion)"
      };
    }

    case "CREATE_COUPON": {
      const code = String(data.code || "SHIVA" + Math.floor(10 + Math.random() * 89)).toUpperCase().replace(/\s+/g, "");
      const discountValue = Number(data.discountValue || data.discount || 15);
      const discountType = data.discountType || "percentage";
      const minOrder = Number(data.minOrder ?? data.minOrderValue ?? 999);
      const id = "cpn_" + Date.now();

      const newCoupon = {
        id,
        code,
        discountType,
        type: discountType,
        discountValue,
        discount: discountValue,
        minOrderValue: minOrder,
        minAmount: minOrder,
        maxDiscount: Number(data.maxDiscount || 2000),
        description: data.description || `Flat ${discountValue}${discountType === "percentage" ? "%" : "₹"} OFF on Sacred Rudraksha`,
        isActive: data.isActive !== false,
        status: data.isActive === false ? "Inactive" : "Active",
        usageLimit: 500,
        usedCount: 0,
        ...(data.expiryDate ? { expiryDate: data.expiryDate, expiry: data.expiryDate } : {})
      };

      let previousCoupon = null;
      if (isDbConnected()) {
        previousCoupon = await Coupon.findOne({ code }).lean().catch(() => null);
        await Coupon.findOneAndUpdate({ code }, { $set: newCoupon }, { upsert: true, new: true });
      }

      const log = await recordAdminActionLog({
        actionType: "CREATE_COUPON",
        title: `Created Coupon: ${code} (${discountValue}${discountType === "percentage" ? "%" : "₹"} OFF)`,
        description: `Active coupon ${code} created with min order ₹${minOrder}.`,
        targetCollection: "Coupon",
        targetId: code,
        previousData: previousCoupon,
        newData: newCoupon,
        previewRoute: "/admin/coupons",
        source,
        sessionId,
        taskId
      });

      return {
        actionId: log.actionId,
        actionType: "CREATE_COUPON",
        title: log.title,
        previewRoute: "/admin/coupons",
        previewTitle: `Admin Coupons (${code})`
      };
    }

    case "UPDATE_COUPON": {
      const code = String(data.code || "").toUpperCase().trim();
      if (!code) return { error: "Coupon code is required." };
      const existing = isDbConnected() ? await Coupon.findOne({ code }).lean().catch(() => null) : null;
      if (!existing) return { error: `Coupon "${code}" not found.` };

      const updates = {};
      if (data.isActive !== undefined) {
        updates.isActive = Boolean(data.isActive);
        updates.status = Boolean(data.isActive) ? "Active" : "Inactive";
      }
      if (data.discountValue !== undefined) {
        updates.discountValue = Number(data.discountValue);
        updates.discount = Number(data.discountValue);
      }
      if (data.minOrder !== undefined) {
        updates.minOrderValue = Number(data.minOrder);
        updates.minAmount = Number(data.minOrder);
      }
      if (data.expiryDate !== undefined) {
        updates.expiryDate = data.expiryDate;
        updates.expiry = data.expiryDate;
      }

      if (isDbConnected()) {
        await Coupon.updateOne({ code }, { $set: updates });
      }

      const log = await recordAdminActionLog({
        actionType: "UPDATE_COUPON",
        title: `Updated Coupon ${code} (${updates.isActive === false ? "Paused" : "Updated"})`,
        description: `Modified (${Object.keys(updates).join(", ")}) on coupon ${code}.`,
        targetCollection: "Coupon",
        targetId: code,
        previousData: existing,
        newData: { ...existing, ...updates },
        previewRoute: "/admin/coupons",
        source,
        sessionId,
        taskId
      });

      return {
        actionId: log.actionId,
        actionType: "UPDATE_COUPON",
        title: log.title,
        previewRoute: "/admin/coupons",
        previewTitle: `Admin Coupons (${code})`
      };
    }

    case "DELETE_COUPON": {
      const code = String(data.code || "").toUpperCase().trim();
      if (!code) return { error: "Coupon code is required." };
      const existing = isDbConnected() ? await Coupon.findOne({ code }).lean().catch(() => null) : null;
      if (!existing) return { error: `Coupon "${code}" not found.` };

      if (isDbConnected()) {
        await Coupon.deleteOne({ code });
      }
      const log = await recordAdminActionLog({
        actionType: "DELETE_COUPON",
        title: `Deleted Coupon: ${code}`,
        description: `Removed coupon ${code} (Full backup saved for Undo).`,
        targetCollection: "Coupon",
        targetId: code,
        previousData: existing,
        newData: null,
        previewRoute: "/admin/coupons",
        source,
        sessionId,
        taskId
      });

      return {
        actionId: log.actionId,
        actionType: "DELETE_COUPON",
        title: log.title,
        previewRoute: "/admin/coupons",
        previewTitle: "Admin Coupons"
      };
    }

    case "UPDATE_ACTIVE_OFFER": {
      const prev = isDbConnected() ? await ActiveOffer.findOne({ id: "OFFER-CENTRAL-1" }).lean().catch(() => null) : null;
      const updates = { id: "OFFER-CENTRAL-1" };
      if (data.enabled !== undefined) {
        updates.enabled = Boolean(data.enabled);
        updates.status = Boolean(data.enabled) ? "Active" : "Disabled";
      }
      if (data.title !== undefined) updates.title = String(data.title);
      if (data.subtitle !== undefined) updates.subtitle = String(data.subtitle);
      if (data.couponCode !== undefined) updates.couponCode = String(data.couponCode).toUpperCase();
      if (data.discountType !== undefined) updates.discountType = data.discountType;
      if (data.discountValue !== undefined) updates.discountValue = Number(data.discountValue);
      if (data.timerEnabled !== undefined) updates.timerEnabled = Boolean(data.timerEnabled);
      if (data.hoursValid) {
        const exp = new Date(Date.now() + Number(data.hoursValid) * 3600000).toISOString();
        updates.expiresAt = exp;
        updates.expiry = exp;
        updates.neverExpires = false;
      }

      if (isDbConnected()) {
        await ActiveOffer.findOneAndUpdate({ id: "OFFER-CENTRAL-1" }, { $set: updates }, { upsert: true, new: true });
      }

      const log = await recordAdminActionLog({
        actionType: "UPDATE_ACTIVE_OFFER",
        title: `Updated Storewide Active Offer (${updates.status || "Updated"})`,
        description: `Updated central ActiveOffer (${Object.keys(updates).filter(k => k !== "id").join(", ")})`,
        targetCollection: "ActiveOffer",
        targetId: "OFFER-CENTRAL-1",
        previousData: prev,
        newData: { ...(prev || {}), ...updates },
        previewRoute: "/admin/offers",
        source,
        sessionId,
        taskId
      });

      return {
        actionId: log.actionId,
        actionType: "UPDATE_ACTIVE_OFFER",
        title: log.title,
        previewRoute: "/",
        previewTitle: "Storefront Live Offer Preview"
      };
    }

    case "MANAGE_BANNER": {
      const op = String(data.operation || "create").toLowerCase();
      if (op === "delete" && data.bannerId) {
        const prev = isDbConnected() ? await Banner.findOne({ id: data.bannerId }).lean().catch(() => null) : null;
        if (!prev) return { error: `Banner ${data.bannerId} not found.` };
        if (isDbConnected()) await Banner.deleteOne({ id: data.bannerId });
        const log = await recordAdminActionLog({
          actionType: "MANAGE_BANNER",
          title: `Deleted Banner: ${prev.title || prev.id}`,
          description: "Deleted hero banner (backup stored for Undo).",
          targetCollection: "Banner",
          targetId: prev.id,
          previousData: { op: "delete", doc: prev },
          newData: null,
          previewRoute: "/admin/banners",
          source, sessionId, taskId
        });
        return { actionId: log.actionId, actionType: "MANAGE_BANNER", title: log.title, previewRoute: "/admin/banners" };
      }

      if (op === "toggle" && data.bannerId) {
        const prev = isDbConnected() ? await Banner.findOne({ id: data.bannerId }).lean().catch(() => null) : null;
        if (!prev) return { error: `Banner ${data.bannerId} not found.` };
        const nextActive = data.isActive !== undefined ? Boolean(data.isActive) : !prev.isActive;
        if (isDbConnected()) await Banner.updateOne({ id: prev.id }, { $set: { isActive: nextActive } });
        const log = await recordAdminActionLog({
          actionType: "MANAGE_BANNER",
          title: `${nextActive ? "Activated" : "Paused"} Banner: ${prev.title || prev.id}`,
          description: `Banner active state set to ${nextActive}.`,
          targetCollection: "Banner",
          targetId: prev.id,
          previousData: { op: "update", doc: prev },
          newData: { ...prev, isActive: nextActive },
          previewRoute: "/admin/banners",
          source, sessionId, taskId
        });
        return { actionId: log.actionId, actionType: "MANAGE_BANNER", title: log.title, previewRoute: "/" };
      }

      const id = "ban_" + Date.now();
      const doc = {
        id,
        image: data.image || "/images/placeholder.svg",
        title: data.title || "Sacred Himalayan Rudraksha Collection",
        subtitle: data.subtitle || "100% Lab Certified • Energized in Kashi",
        link: data.link || "/shop",
        position: data.position || "hero",
        isActive: data.isActive !== false,
        sortOrder: Number(data.sortOrder || 0)
      };
      if (isDbConnected()) await Banner.create(doc);
      const log = await recordAdminActionLog({
        actionType: "MANAGE_BANNER",
        title: `Created Hero Banner: ${doc.title}`,
        description: `Added banner linking to ${doc.link}.`,
        targetCollection: "Banner",
        targetId: id,
        previousData: { op: "create", doc: null },
        newData: doc,
        previewRoute: "/",
        source, sessionId, taskId
      });
      return { actionId: log.actionId, actionType: "MANAGE_BANNER", title: log.title, previewRoute: "/" };
    }

    case "ADD_WEBSITE_FEATURE": {
      const featureId = "feat_" + Date.now();
      const newFeature = {
        id: featureId,
        type: data.featureType || "flash_sale_banner",
        title: data.title || "Maha Shivratri Sacred Energized Rudraksha Mahotsav — Use Code SHIVA20!",
        subtitle: data.subtitle || "100% Lab-Certified Nepali Beads • Kashi Abhishekam",
        badge: data.badge || "LIVE OFFER",
        ctaText: data.ctaText || "Explore Collection",
        ctaLink: data.ctaLink || "/shop",
        bgColor: data.bgColor || "linear-gradient(90deg, #431407 0%, #7c2d12 50%, #431407 100%)",
        textColor: data.textColor || "#fde68a",
        enabled: true,
        createdAt: new Date().toISOString()
      };

      let prevSettings = null;
      let updatedFeatures = [newFeature];

      if (isDbConnected()) {
        prevSettings = await Setting.findOne({ id: "STORE_SETTINGS" }).lean();
        const existingList = Array.isArray(prevSettings?.aiCustomFeatures) ? prevSettings.aiCustomFeatures : [];
        updatedFeatures = [newFeature, ...existingList];
        await Setting.findOneAndUpdate(
          { id: "STORE_SETTINGS" },
          { $set: { aiCustomFeatures: updatedFeatures, announcementText: newFeature.title } },
          { upsert: true, new: true }
        );
      }

      const log = await recordAdminActionLog({
        actionType: "ADD_WEBSITE_FEATURE",
        title: `Added Storefront Feature: ${newFeature.title.slice(0, 50)}`,
        description: `Injected live storefront feature (${newFeature.type}) onto customer website.`,
        targetCollection: "Setting",
        targetId: featureId,
        previousData: prevSettings?.aiCustomFeatures || [],
        newData: updatedFeatures,
        previewRoute: "/",
        source,
        sessionId,
        taskId
      });

      return {
        actionId: log.actionId,
        actionType: "ADD_WEBSITE_FEATURE",
        title: log.title,
        previewRoute: "/",
        previewTitle: "Live Storefront Preview",
        feature: newFeature
      };
    }

    case "UPDATE_STORE_SETTINGS": {
      const prev = isDbConnected() ? await Setting.findOne({ id: "STORE_SETTINGS" }).lean().catch(() => null) : null;
      const updates = {};
      if (data.enableCod !== undefined) updates.enableCod = Boolean(data.enableCod);
      if (data.enableOnlinePayment !== undefined) updates.enableOnlinePayment = Boolean(data.enableOnlinePayment);
      if (data.codFee !== undefined) updates.codFee = Number(data.codFee);
      if (data.standardShippingFee !== undefined) updates.standardShippingFee = Number(data.standardShippingFee);
      if (data.freeShippingThreshold !== undefined) updates.freeShippingThreshold = Number(data.freeShippingThreshold);
      if (data.announcementText !== undefined) updates.announcementText = String(data.announcementText);
      if (data.supportPhone !== undefined) updates.supportPhone = String(data.supportPhone);
      if (data.featuredProductEnabled !== undefined) updates.featuredProductEnabled = Boolean(data.featuredProductEnabled);
      if (data.featuredProductId !== undefined) updates.featuredProductId = String(data.featuredProductId);

      if (Object.keys(updates).length === 0) {
        return { error: "No valid settings fields specified to update." };
      }

      if (isDbConnected()) {
        await Setting.findOneAndUpdate({ id: "STORE_SETTINGS" }, { $set: updates }, { upsert: true, new: true });
      }

      const prevSubset = {};
      for (const k of Object.keys(updates)) {
        prevSubset[k] = prev?.[k];
      }

      const log = await recordAdminActionLog({
        actionType: "UPDATE_STORE_SETTINGS",
        title: `Updated Store Settings (${Object.keys(updates).join(", ")})`,
        description: `Changed ${Object.entries(updates).map(([k, v]) => `${k}=${v}`).join(", ")}`,
        targetCollection: "Setting",
        targetId: "STORE_SETTINGS",
        previousData: prevSubset,
        newData: updates,
        previewRoute: "/admin/settings",
        source,
        sessionId,
        taskId
      });

      return {
        actionId: log.actionId,
        actionType: "UPDATE_STORE_SETTINGS",
        title: log.title,
        previewRoute: "/admin/settings",
        previewTitle: "Admin Store Settings"
      };
    }

    case "UPDATE_ORDER": {
      const orderId = data.orderId || data.id;
      let existingOrder = null;
      if (isDbConnected()) {
        existingOrder = orderId
          ? await Order.findOne({ $or: [{ orderId }, { id: orderId }, { orderNumber: orderId }] }).lean()
          : await Order.findOne().sort({ createdAt: -1 }).lean();
      }
      if (!existingOrder) {
        return { error: `Order "${orderId || "latest"}" not found in database.` };
      }

      const updates = {};
      if (data.status !== undefined) {
        updates.status = data.status;
        updates.orderStatus = data.status;
      }
      if (data.paymentStatus !== undefined) updates.paymentStatus = data.paymentStatus;
      if (data.trackingNumber !== undefined) {
        updates.trackingNumber = String(data.trackingNumber);
        updates.trackingId = String(data.trackingNumber);
      }
      if (data.courierName !== undefined) {
        updates.courierName = String(data.courierName);
        updates.carrier = String(data.courierName);
      }
      if (data.trackingUrl !== undefined) {
        updates.trackingUrl = String(data.trackingUrl);
        updates.shippingLink = String(data.trackingUrl);
      }
      if (data.estimatedDelivery !== undefined) {
        updates.estimatedDelivery = String(data.estimatedDelivery);
        updates.estimatedDeliveryDate = String(data.estimatedDelivery);
      }
      if (data.notes !== undefined) updates.notes = String(data.notes);

      if (Object.keys(updates).length === 0) updates.status = "Shipped";

      if (isDbConnected()) {
        await Order.updateOne({ _id: existingOrder._id }, { $set: updates });
      }

      const log = await recordAdminActionLog({
        actionType: "UPDATE_ORDER",
        title: `Updated Order #${existingOrder.orderId || existingOrder.id} -> ${updates.status || Object.keys(updates).join(", ")}`,
        description: `Order updated: ${Object.entries(updates).map(([k, v]) => `${k}=${v}`).join(", ")}`,
        targetCollection: "Order",
        targetId: existingOrder.orderId || existingOrder.id,
        previousData: existingOrder,
        newData: { ...existingOrder, ...updates },
        previewRoute: "/admin/orders",
        source,
        sessionId,
        taskId
      });

      return {
        actionId: log.actionId,
        actionType: "UPDATE_ORDER",
        title: log.title,
        previewRoute: "/admin/orders",
        previewTitle: "Admin Orders Dashboard"
      };
    }

    case "MANAGE_REVIEW": {
      const targetId = String(data.targetId || data.id || "").trim();
      if (!targetId) return { error: "Review ID is required." };
      const existing = isDbConnected() ? await Review.findOne({ id: targetId }).lean().catch(() => null) : null;
      if (!existing) return { error: `Review ${targetId} not found.` };

      const updates = {};
      if (data.status) {
        updates.status = data.status;
        updates.publicDisplay = ["Approved", "Published"].includes(data.status);
      }
      if (data.replyText) {
        updates.adminReply = {
          text: String(data.replyText),
          repliedAt: new Date().toISOString(),
          repliedBy: "Aura Rudraksha Admin"
        };
      }
      if (isDbConnected()) await Review.updateOne({ id: existing.id }, { $set: updates });

      const log = await recordAdminActionLog({
        actionType: "MANAGE_REVIEW",
        title: `Updated Review by ${existing.name} (${updates.status || "Replied"})`,
        description: `Updated review ${existing.id}`,
        targetCollection: "Review",
        targetId: existing.id,
        previousData: existing,
        newData: { ...existing, ...updates },
        previewRoute: "/admin/reviews",
        source, sessionId, taskId
      });
      return { actionId: log.actionId, actionType: "MANAGE_REVIEW", title: log.title, previewRoute: "/admin/reviews" };
    }

    case "RESOLVE_TICKET": {
      const targetId = String(data.targetId || data.id || "").trim();
      if (!targetId) return { error: "Ticket ID is required." };
      const existing = isDbConnected() ? await Ticket.findOne({ id: targetId }).lean().catch(() => null) : null;
      if (!existing) return { error: `Ticket ${targetId} not found.` };

      const updates = { status: data.status || "Resolved" };
      if (data.replyText) {
        updates.adminResponse = String(data.replyText);
        updates.replies = [
          ...(Array.isArray(existing.replies) ? existing.replies : []),
          { sender: "admin", text: String(data.replyText), timestamp: new Date().toISOString() }
        ];
      }
      if (isDbConnected()) await Ticket.updateOne({ id: existing.id }, { $set: updates });

      const log = await recordAdminActionLog({
        actionType: "RESOLVE_TICKET",
        title: `Ticket #${existing.id} -> ${updates.status}`,
        description: `Support ticket ${existing.subject || existing.id} updated.`,
        targetCollection: "Ticket",
        targetId: existing.id,
        previousData: existing,
        newData: { ...existing, ...updates },
        previewRoute: "/admin/support",
        source, sessionId, taskId
      });
      return { actionId: log.actionId, actionType: "RESOLVE_TICKET", title: log.title, previewRoute: "/admin/support" };
    }

    case "AUTO_FIX_BUGS": {
      if (!isDbConnected() && (process.env.MONGO_URI || process.env.MONGODB_URI || process.env.DATABASE_URL)) {
        await connectDB().catch(() => {});
      }
      const diag = await runWebsiteBugDiagnostic();
      const fixedList = [];

      for (const b of diag.bugs) {
        if (b.fixType === "RESTOCK_PRODUCT" && b.targetId) {
          let prev = isDbConnected() ? await Product.findOne({ id: b.targetId }).lean().catch(() => null) : null;
          if (!prev && Array.isArray(inMemoryStore.products)) {
            prev = inMemoryStore.products.find(p => p.id === b.targetId) || null;
          }
          if (prev) {
            if (isDbConnected()) await Product.updateOne({ id: b.targetId }, { $set: { stock: 25 } });
            if (Array.isArray(inMemoryStore.products)) {
              const idx = inMemoryStore.products.findIndex(p => p.id === b.targetId);
              if (idx !== -1) inMemoryStore.products[idx] = { ...inMemoryStore.products[idx], stock: 25 };
            }
            await recordAdminActionLog({
              actionType: "UPDATE_PRODUCT",
              title: `Auto-Fixed Low Stock: ${prev.name} (Restocked to 25)`,
              description: `Bug Auto-Fix raised stock from ${prev.stock} to 25.`,
              targetCollection: "Product",
              targetId: prev.id,
              previousData: { ...prev },
              newData: { ...prev, stock: 25 },
              previewRoute: `/product/${prev.slug || prev.id}`,
              source, sessionId, taskId
            });
            fixedList.push(`Restocked "${prev.name}" to 25 units`);
          }
        } else if (b.fixType === "ENRICH_PRODUCT_SEO" && b.targetId) {
          let prev = isDbConnected() ? await Product.findOne({ id: b.targetId }).lean().catch(() => null) : null;
          if (!prev && Array.isArray(inMemoryStore.products)) {
            prev = inMemoryStore.products.find(p => p.id === b.targetId) || null;
          }
          if (prev) {
            const richDesc = `${prev.name} — 100% Authentic Lab-Certified Himalayan Rudraksha consecrated with Vedic Shiva Purana Prana-Pratishtha rituals. Brings spiritual clarity, planetary harmony, and divine protection.`;
            if (isDbConnected()) await Product.updateOne({ id: b.targetId }, { $set: { description: richDesc } });
            if (Array.isArray(inMemoryStore.products)) {
              const idx = inMemoryStore.products.findIndex(p => p.id === b.targetId);
              if (idx !== -1) inMemoryStore.products[idx] = { ...inMemoryStore.products[idx], description: richDesc };
            }
            await recordAdminActionLog({
              actionType: "UPDATE_PRODUCT",
              title: `Auto-Fixed SEO Description: ${prev.name}`,
              description: `Enriched thin product description with Vedic SEO copy.`,
              targetCollection: "Product",
              targetId: prev.id,
              previousData: { ...prev },
              newData: { ...prev, description: richDesc },
              previewRoute: `/product/${prev.slug || prev.id}`,
              source, sessionId, taskId
            });
            fixedList.push(`Enriched SEO description for "${prev.name}"`);
          }
        } else if (b.fixType === "DEACTIVATE_EXPIRED_COUPON" && b.targetId && isDbConnected()) {
          const prev = await Coupon.findOne({ $or: [{ id: b.targetId }, { code: b.targetId }] }).lean();
          if (prev) {
            await Coupon.updateOne({ _id: prev._id }, { $set: { isActive: false, status: "Expired" } });
            await recordAdminActionLog({
              actionType: "UPDATE_COUPON",
              title: `Auto-Deactivated Expired Coupon: ${prev.code}`,
              description: `Disabled expired coupon ${prev.code}.`,
              targetCollection: "Coupon",
              targetId: prev.code,
              previousData: prev,
              newData: { ...prev, isActive: false, status: "Expired" },
              previewRoute: "/admin/coupons",
              source, sessionId, taskId
            });
            fixedList.push(`Deactivated expired coupon ${prev.code}`);
          }
        }
      }

      invalidateProductCache();
      invalidateRagCache();

      return {
        actionId: "fix_" + Date.now(),
        actionType: "AUTO_FIX_BUGS",
        title: `Auto-Repaired ${fixedList.length} Store Issues (${diag.bugsCount} scanned)`,
        fixedList,
        previewRoute: "/admin/products",
        previewTitle: "Admin Products Catalog"
      };
    }

    case "SHOW_PAGE": {
      const route = data.route || "/";
      const title = data.title || `Live Page Preview (${route})`;
      return {
        actionId: "view_" + Date.now(),
        actionType: "SHOW_PAGE",
        title: `Opened Live Preview: ${title}`,
        previewRoute: route,
        previewTitle: title
      };
    }

    case "CREATE_TASK": {
      const task = await createAdminBackgroundTask({
        title: data.title || "Autonomous Store Optimization Task",
        prompt: data.prompt || "Analyze catalog, optimize SEO, and monitor inventory.",
        taskType: data.taskType || "custom",
        durationMinutes: Number(data.durationMinutes || 60),
        intervalMinutes: Number(data.intervalMinutes || 5)
      });
      return {
        actionId: task.taskId,
        actionType: "CREATE_TASK",
        title: `Started Background Task: "${task.title}" (${task.durationMinutes} mins)`,
        previewRoute: "/admin/ai",
        previewTitle: "Background Task Active",
        task
      };
    }

    case "RETRAIN_AI_KNOWLEDGE": {
      invalidateRagCache();
      const docs = await buildStoreRagIndex(true);
      const trends = await getPublicStoreTrendsPayload(false);

      await recordPrivateWorkLog({
        category: "rag_training",
        status: "completed",
        title: `Retrained AI Knowledge Base (${docs.length} live documents)`,
        detail: `Indexed ${trends.totals.publishedProducts} products, ${trends.totals.activeCoupons} coupons, ${trends.totals.publicVerifiedReviews} verified reviews, and ${trends.trendingProducts.length} trending products.`,
        metadata: { indexedDocumentsCount: docs.length, trainedAt: trends.trainedAt }
      });

      const log = await recordAdminActionLog({
        actionType: "RETRAIN_AI_KNOWLEDGE",
        title: `Trained AI on Live Store & Public Trends (${docs.length} docs)`,
        description: `Published products: ${trends.totals.publishedProducts}, Trending items: ${trends.trendingProducts.length}, Coupons: ${trends.totals.activeCoupons}`,
        targetCollection: "AuraAIRagDocument",
        targetId: "trends_public_summary",
        previousData: null,
        newData: trends,
        previewRoute: "/shop",
        source, sessionId, taskId
      });

      return {
        actionId: log.actionId,
        actionType: "RETRAIN_AI_KNOWLEDGE",
        title: log.title,
        previewRoute: "/shop",
        previewTitle: "Trained Storefront & Trending Catalog",
        trends
      };
    }

    case "GENERATE_PRODUCT_SEO": {
      const targetHint = String(data.idOrName || data.name || data.id || "").trim();
      let targets = [];
      if (targetHint) {
        const one = await findTargetProduct({ idOrName: targetHint, name: targetHint });
        if (!one) return { error: `Product "${targetHint}" not found for SEO generation.` };
        targets = [one];
      } else {
        targets = isDbConnected()
          ? await Product.find().lean().catch(() => [])
          : [...getAllInMemoryProducts()];
        if (!targets.length) targets = [...getAllInMemoryProducts()];
      }

      if (!targets.length) return { error: "No products found to optimize SEO." };

      const prevSnapshots = [];
      let updatedCount = 0;

      for (const p of targets) {
        const seo = buildProductSeoMetadata(p);
        prevSnapshots.push({
          id: p.id,
          keywords: p.keywords,
          searchKeywords: p.searchKeywords,
          tags: p.tags,
          metaTitle: p.metaTitle,
          metaDescription: p.metaDescription,
          description: p.description
        });
        if (isDbConnected()) {
          await Product.updateOne({ id: p.id }, { $set: seo });
        }
        if (Array.isArray(inMemoryStore.products)) {
          const idx = inMemoryStore.products.findIndex(mp => String(mp.id) === String(p.id));
          if (idx !== -1) inMemoryStore.products[idx] = { ...inMemoryStore.products[idx], ...seo };
        }
        updatedCount++;
      }

      invalidateProductCache();
      invalidateRagCache();

      const log = await recordAdminActionLog({
        actionType: "GENERATE_PRODUCT_SEO",
        title: `Generated Vedic SEO & Keywords for ${updatedCount} Product(s)`,
        description: `Updated English + Hindi keywords, meta titles, and descriptions across ${updatedCount} catalog item(s).`,
        targetCollection: "Product",
        targetId: targets.length === 1 ? targets[0].id : `seo_${updatedCount}`,
        previousData: prevSnapshots,
        newData: { updatedCount },
        previewRoute: "/admin/products",
        source, sessionId, taskId
      });

      return {
        actionId: log.actionId,
        actionType: "GENERATE_PRODUCT_SEO",
        title: log.title,
        updatedCount,
        previewRoute: "/admin/products",
        previewTitle: "Admin Products SEO Optimized"
      };
    }

    case "INSTALL_PUBLIC_TOOL": {
      const toolKey = String(data.toolKey || "schema_jsonld_booster").trim();
      const preset = CURATED_PUBLIC_TOOLS_CATALOG.find(t => t.key === toolKey) || CURATED_PUBLIC_TOOLS_CATALOG[0];
      const featureId = "tool_" + Date.now();
      const newFeature = {
        id: featureId,
        type: preset.featureType,
        toolKey: preset.key,
        title: String(data.title || preset.title),
        subtitle: String(data.subtitle || preset.subtitle),
        badge: preset.badge,
        ctaText: preset.ctaText,
        ctaLink: preset.ctaLink,
        githubRef: String(data.githubRepoUrl || preset.githubRef),
        bgColor: "linear-gradient(90deg, #431407 0%, #7c2d12 50%, #431407 100%)",
        textColor: "#fde68a",
        enabled: true,
        createdAt: new Date().toISOString()
      };

      let prevFeatures = Array.isArray(inMemoryStore.settings?.aiCustomFeatures) ? inMemoryStore.settings.aiCustomFeatures : [];
      let updatedFeatures = [newFeature, ...prevFeatures];

      if (isDbConnected()) {
        const prevSettings = await Setting.findOne({ id: "STORE_SETTINGS" }).lean();
        const existingList = Array.isArray(prevSettings?.aiCustomFeatures) ? prevSettings.aiCustomFeatures : [];
        prevFeatures = existingList;
        updatedFeatures = [newFeature, ...existingList];
        await Setting.findOneAndUpdate(
          { id: "STORE_SETTINGS" },
          { $set: { aiCustomFeatures: updatedFeatures } },
          { upsert: true, new: true }
        );
      }
      if (inMemoryStore.settings) {
        inMemoryStore.settings.aiCustomFeatures = updatedFeatures;
      }

      const log = await recordAdminActionLog({
        actionType: "ADD_WEBSITE_FEATURE",
        title: `Activated Public Tool Widget: ${newFeature.title.slice(0, 52)}`,
        description: `Installed storefront feature (${newFeature.toolKey}) referencing ${newFeature.githubRef}`,
        targetCollection: "Setting",
        targetId: featureId,
        previousData: prevFeatures,
        newData: updatedFeatures,
        previewRoute: "/",
        source, sessionId, taskId
      });

      return {
        actionId: log.actionId,
        actionType: "ADD_WEBSITE_FEATURE",
        title: log.title,
        previewRoute: "/",
        previewTitle: `Live Storefront (${newFeature.badge})`,
        feature: newFeature
      };
    }

    default:
      return null;
  }
}

/**
 * Undo / Revert an AI Action by its actionId (covers EVERY mutation type!)
 */
export async function undoAdminAgentAction(actionId) {
  let log = null;
  if (isDbConnected()) {
    log = await AdminAIActionLog.findOne({ actionId }).lean();
  }
  if (!log) {
    log = memActionLogs.get(actionId);
  }
  if (!log) {
    throw new Error("Action log not found.");
  }
  if (log.reverted) {
    return { alreadyReverted: true, log };
  }

  const { actionType, targetCollection, targetId, previousData } = log;

  if (actionType === "CREATE_PRODUCT" && targetCollection === "Product") {
    if (isDbConnected()) await Product.deleteOne({ id: targetId });
    if (Array.isArray(inMemoryStore.products)) {
      const idx = inMemoryStore.products.findIndex(p => p.id === targetId);
      if (idx !== -1) inMemoryStore.products.splice(idx, 1);
    }
  } else if (actionType === "UPDATE_PRODUCT" && previousData) {
    const cleanPrev = { ...previousData };
    delete cleanPrev._id;
    if (isDbConnected()) await Product.findOneAndUpdate({ id: targetId }, { $set: cleanPrev }, { upsert: true });
    if (Array.isArray(inMemoryStore.products)) {
      const idx = inMemoryStore.products.findIndex(p => p.id === targetId);
      if (idx !== -1) inMemoryStore.products[idx] = { ...inMemoryStore.products[idx], ...cleanPrev };
    }
  } else if (actionType === "BULK_UPDATE_PRODUCTS" && Array.isArray(previousData)) {
    for (const snap of previousData) {
      if (!snap?.id) continue;
      const restoreFields = {};
      if (snap.price !== undefined) restoreFields.price = snap.price;
      if (snap.comparePrice !== undefined) restoreFields.comparePrice = snap.comparePrice;
      if (snap.mrp !== undefined) restoreFields.mrp = snap.mrp;
      if (snap.indonesiaPrice !== undefined) restoreFields.indonesiaPrice = snap.indonesiaPrice;
      if (snap.stock !== undefined) restoreFields.stock = snap.stock;
      if (snap.showOnHome !== undefined) restoreFields.showOnHome = snap.showOnHome;

      if (isDbConnected()) await Product.updateOne({ id: snap.id }, { $set: restoreFields });
      if (Array.isArray(inMemoryStore.products)) {
        const idx = inMemoryStore.products.findIndex(p => p.id === snap.id);
        if (idx !== -1) inMemoryStore.products[idx] = { ...inMemoryStore.products[idx], ...restoreFields };
      }
    }
  } else if (actionType === "DELETE_PRODUCT" && previousData) {
    const cleanPrev = { ...previousData };
    delete cleanPrev._id;
    if (isDbConnected()) await Product.findOneAndUpdate({ id: targetId }, { $set: cleanPrev }, { upsert: true });
    if (Array.isArray(inMemoryStore.products)) {
      const existsIdx = inMemoryStore.products.findIndex(p => String(p.id) === String(cleanPrev.id));
      if (existsIdx === -1) inMemoryStore.products.unshift(cleanPrev);
      inMemoryStore.isProductsSyncedFromDb = true;
    }
  } else if (actionType === "GENERATE_PRODUCT_SEO" && Array.isArray(previousData)) {
    for (const snap of previousData) {
      if (!snap?.id) continue;
      const restore = {
        keywords: snap.keywords || [],
        searchKeywords: snap.searchKeywords || [],
        tags: snap.tags || [],
        metaTitle: snap.metaTitle || "",
        metaDescription: snap.metaDescription || "",
        description: snap.description || ""
      };
      if (isDbConnected()) await Product.updateOne({ id: snap.id }, { $set: restore });
      if (Array.isArray(inMemoryStore.products)) {
        const idx = inMemoryStore.products.findIndex(mp => String(mp.id) === String(snap.id));
        if (idx !== -1) inMemoryStore.products[idx] = { ...inMemoryStore.products[idx], ...restore };
      }
    }
  } else if (actionType === "CREATE_COUPON") {
    if (isDbConnected()) {
      if (previousData) {
        const cleanPrev = { ...previousData };
        delete cleanPrev._id;
        await Coupon.findOneAndUpdate({ code: targetId }, { $set: cleanPrev }, { upsert: true });
      } else {
        await Coupon.deleteOne({ code: targetId });
      }
    }
  } else if (actionType === "UPDATE_COUPON" && previousData) {
    const cleanPrev = { ...previousData };
    delete cleanPrev._id;
    if (isDbConnected()) await Coupon.findOneAndUpdate({ code: targetId }, { $set: cleanPrev }, { upsert: true });
  } else if (actionType === "DELETE_COUPON" && previousData) {
    const cleanPrev = { ...previousData };
    delete cleanPrev._id;
    if (isDbConnected()) await Coupon.findOneAndUpdate({ code: targetId }, { $set: cleanPrev }, { upsert: true });
  } else if (actionType === "UPDATE_ACTIVE_OFFER") {
    if (isDbConnected()) {
      if (previousData) {
        const cleanPrev = { ...previousData };
        delete cleanPrev._id;
        await ActiveOffer.findOneAndUpdate({ id: "OFFER-CENTRAL-1" }, { $set: cleanPrev }, { upsert: true });
      } else {
        await ActiveOffer.updateOne({ id: "OFFER-CENTRAL-1" }, { $set: { enabled: false, status: "Disabled" } });
      }
    }
  } else if (actionType === "MANAGE_BANNER" && previousData) {
    if (isDbConnected()) {
      if (previousData.op === "create") {
        await Banner.deleteOne({ id: targetId });
      } else if ((previousData.op === "delete" || previousData.op === "update") && previousData.doc) {
        const cleanPrev = { ...previousData.doc };
        delete cleanPrev._id;
        await Banner.findOneAndUpdate({ id: targetId }, { $set: cleanPrev }, { upsert: true });
      }
    }
  } else if (actionType === "ADD_WEBSITE_FEATURE") {
    const restoredFeatures = Array.isArray(previousData) ? previousData : [];
    if (isDbConnected()) {
      await Setting.findOneAndUpdate(
        { id: "STORE_SETTINGS" },
        { $set: { aiCustomFeatures: restoredFeatures } }
      );
    }
  } else if (actionType === "UPDATE_STORE_SETTINGS" && previousData) {
    if (isDbConnected()) {
      await Setting.findOneAndUpdate({ id: "STORE_SETTINGS" }, { $set: previousData }, { upsert: true });
    }
  } else if (actionType === "UPDATE_ORDER" && previousData) {
    const restoreOrderFields = {
      status: previousData.status,
      orderStatus: previousData.orderStatus || previousData.status,
      paymentStatus: previousData.paymentStatus,
      trackingNumber: previousData.trackingNumber || "",
      trackingId: previousData.trackingId || "",
      courierName: previousData.courierName || "",
      carrier: previousData.carrier || "",
      trackingUrl: previousData.trackingUrl || "",
      estimatedDelivery: previousData.estimatedDelivery || "",
      notes: previousData.notes || ""
    };
    if (isDbConnected()) {
      await Order.updateOne({ $or: [{ orderId: targetId }, { id: targetId }] }, { $set: restoreOrderFields });
    }
  } else if (actionType === "MANAGE_REVIEW" && previousData) {
    const cleanPrev = { ...previousData };
    delete cleanPrev._id;
    if (isDbConnected()) await Review.findOneAndUpdate({ id: targetId }, { $set: cleanPrev });
  } else if (actionType === "RESOLVE_TICKET" && previousData) {
    const cleanPrev = { ...previousData };
    delete cleanPrev._id;
    if (isDbConnected()) await Ticket.findOneAndUpdate({ id: targetId }, { $set: cleanPrev });
  }

  const revertedAt = new Date().toISOString();
  if (isDbConnected()) {
    await AdminAIActionLog.updateOne({ actionId }, { $set: { reverted: true, revertedAt } });
  }
  if (memActionLogs.has(actionId)) {
    memActionLogs.set(actionId, { ...log, reverted: true, revertedAt });
  }
  invalidateProductCache();
  invalidateRagCache();

  await recordPrivateWorkLog({
    category: "undo",
    status: "completed",
    title: `Reverted AI Action: ${log.title}`,
    detail: `Restored previous state for ${targetCollection} (${targetId}).`
  });

  return { success: true, log: { ...log, reverted: true, revertedAt } };
}

/**
 * Natural language + JSON Tag Parser to detect and execute actions requested by Admin
 */
export async function detectAndExecuteAdminIntents(userText, aiRawResponse, context = {}) {
  const executedActions = [...(Array.isArray(context.preExecutedActions) ? context.preExecutedActions : [])];
  let cleanedResponse = String(aiRawResponse || "");
  let detectedPreviewRoute = context.prePreviewRoute || "";
  let detectedPreviewTitle = context.prePreviewTitle || "";

  // 1. Parse explicit [ADMIN_ACTION: {...}] tags emitted by LLM or Synthesizer
  const actionRegex = /\[ADMIN_ACTION:\s*(\{[\s\S]*?\})\s*\]/gi;
  let match;
  while ((match = actionRegex.exec(cleanedResponse)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      if (parsed?.type === "SCAN_BUGS") {
        await runWebsiteBugDiagnostic();
        continue;
      }
      const result = await executeAdminAgentAction(parsed, context);
      if (result && !result.error) {
        executedActions.push(result);
        if (result.previewRoute) {
          detectedPreviewRoute = result.previewRoute;
          detectedPreviewTitle = result.previewTitle || result.title;
        }
      }
    } catch (e) {
      console.warn("[AdminAgent] Action JSON parse notice:", e?.message);
    }
  }
  cleanedResponse = cleanedResponse.replace(actionRegex, "").trim();

  // 2. Parse [NAVIGATE_PREVIEW: "/route"] tags
  const navRegex = /\[NAVIGATE_PREVIEW:\s*"([^"]+)"\s*\]/gi;
  let navMatch;
  while ((navMatch = navRegex.exec(cleanedResponse)) !== null) {
    if (!detectedPreviewRoute && navMatch[1]) {
      detectedPreviewRoute = navMatch[1];
      const matchedPage = WEBSITE_PAGES_DIRECTORY.find(p => p.route === detectedPreviewRoute);
      detectedPreviewTitle = matchedPage?.title || `Live Preview (${detectedPreviewRoute})`;
    }
  }
  cleanedResponse = cleanedResponse.replace(navRegex, "").trim();

  // 3. Fallback Undo intent if LLM didn't invoke undo tool
  const lowerUser = String(userText || "").toLowerCase();
  if (/\b(undo|revert|wapas|pichla change hatao|rollback)\b/i.test(lowerUser) && executedActions.length === 0) {
    let latestAction = null;
    if (isDbConnected()) {
      latestAction = await AdminAIActionLog.findOne({ reverted: false }).sort({ createdAt: -1 }).lean();
    } else {
      latestAction = Array.from(memActionLogs.values()).find(a => !a.reverted) || null;
    }
    if (latestAction) {
      await undoAdminAgentAction(latestAction.actionId);
      executedActions.push({
        actionId: latestAction.actionId,
        actionType: "UNDO",
        title: `Reverted: ${latestAction.title}`,
        previewRoute: latestAction.previewRoute || "/"
      });
      detectedPreviewRoute = latestAction.previewRoute || "/";
      detectedPreviewTitle = `Restored State (${latestAction.targetCollection})`;
      cleanedResponse += `\n\n✅ **Change Reverted:** Maine pichla AI change (*${latestAction.title}*) wapas hata kar purana data restore kar diya hai.`;
    }
  }

  // 4. Fallback Page Preview intent
  if (!detectedPreviewRoute) {
    for (const p of WEBSITE_PAGES_DIRECTORY) {
      const keyWords = p.key.replace(/_/g, " ");
      if (
        lowerUser.includes(p.route.toLowerCase()) ||
        (lowerUser.includes(keyWords) && /\b(show|dikhao|open|preview|page|dekho|kholo)\b/i.test(lowerUser))
      ) {
        detectedPreviewRoute = p.route;
        detectedPreviewTitle = p.title;
        break;
      }
    }
    if (!detectedPreviewRoute && /\b(home page|website dikhao|live preview|store dikhao)\b/i.test(lowerUser)) {
      detectedPreviewRoute = "/";
      detectedPreviewTitle = "Storefront Home Page Live Preview";
    } else if (!detectedPreviewRoute && /\b(shop page|catalog dikhao|all products page)\b/i.test(lowerUser)) {
      detectedPreviewRoute = "/shop";
      detectedPreviewTitle = "Shop Catalog Live Preview";
    } else if (!detectedPreviewRoute && /\b(order page|orders dikhao)\b/i.test(lowerUser)) {
      detectedPreviewRoute = "/admin/orders";
      detectedPreviewTitle = "Admin Orders Live View";
    }
  }

  return {
    cleanedResponse,
    executedActions,
    previewRoute: detectedPreviewRoute,
    previewTitle: detectedPreviewTitle
  };
}

/**
 * Create a Persistent Background Task in MongoDB
 */
export async function createAdminBackgroundTask({
  title,
  prompt,
  taskType = "custom",
  durationMinutes = 60,
  intervalMinutes = 5
}) {
  const dur = Math.max(1, Number(durationMinutes) || 60);
  const intv = Math.max(1, Number(intervalMinutes) || 5);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + dur * 60 * 1000).toISOString();

  const taskDoc = {
    taskId: "task_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
    title: String(title || "Autonomous AI Background Task"),
    prompt: String(prompt || "Audit store catalog, SEO, and inventory"),
    taskType,
    status: "running",
    durationMinutes: dur,
    intervalMinutes: intv,
    startedAt: now.toISOString(),
    expiresAt,
    lastRunAt: "",
    nextRunAt: now.toISOString(),
    runsCount: 0,
    maxRuns: Math.max(1, Math.ceil(dur / intv) + 1),
    logs: []
  };

  memTasks.set(taskDoc.taskId, taskDoc);
  if (isDbConnected()) {
    try {
      await AdminAITask.create(taskDoc);
    } catch (_) {}
  }

  await recordPrivateWorkLog({
    category: "task",
    status: "active",
    title: `Background Task Scheduled: "${taskDoc.title}"`,
    detail: `Duration: ${dur} mins · Interval: every ${intv} mins`
  });

  // Lazily ensure background loop wakes up only when tasks exist
  startAdminAgentBackgroundLoop();

  // Trigger first cycle asynchronously
  setTimeout(() => {
    executeSingleTaskCycle(taskDoc.taskId).catch(err =>
      console.warn("[AdminAgent] Initial task cycle warning:", err?.message)
    );
  }, 250);

  return taskDoc;
}

/**
 * Execute one cycle of a Background Task and store output in MongoDB
 */
export async function executeSingleTaskCycle(taskId, { forceRun = false } = {}) {
  let task = null;
  if (isDbConnected()) {
    task = await AdminAITask.findOne({ taskId }).lean();
  }
  if (!task) task = memTasks.get(taskId);
  if (!task || (!forceRun && task.status !== "running")) return null;

  const now = new Date();
  if (task.runsCount > 0 && new Date(task.expiresAt) < now) {
    if (isDbConnected()) await AdminAITask.updateOne({ taskId }, { $set: { status: "completed" } });
    if (memTasks.has(taskId)) memTasks.set(taskId, { ...task, status: "completed" });
    return null;
  }

  await recordPrivateWorkLog({
    category: "task",
    status: "active",
    title: `Running Task Cycle #${(task.runsCount || 0) + 1}: ${task.title}`,
    detail: `Prompt: ${task.prompt}`
  });

  const snapshot = await getCompleteWebsiteSnapshot();
  const sysPrompt = `You are Aura AI Autonomous Background Agent.
Execute this scheduled background task on Live Store Snapshot:
- Total Products: ${snapshot.productsCount} (Low Stock: ${snapshot.lowStockCount})
- Total Orders: ${snapshot.ordersCount} (Revenue: ₹${snapshot.totalRevenue})
- Active Coupons: ${snapshot.couponsCount}
Provide a clear, concise executive summary of what you analyzed and accomplished in this cycle.`;

  let aiText = "";
  let modelUsed = await resolveActiveWebsiteAiModel();
  let actionsTaken = [];

  try {
    const llmRes = await invokeAdminLLM(
      sysPrompt,
      [{ sender: "user", text: `Execute Background Task: "${task.title}"\nInstructions: ${task.prompt}` }],
      1500,
      { taskId, source: "background_task" }
    );
    modelUsed = llmRes.modelUsed;
    const intentRes = await detectAndExecuteAdminIntents(task.prompt, llmRes.text, {
      taskId,
      source: "background_task",
      preExecutedActions: llmRes.executedViaTools || []
    });
    aiText = intentRes.cleanedResponse;
    actionsTaken = intentRes.executedActions;
  } catch (err) {
    aiText = `Cycle completed diagnostics across ${snapshot.productsCount} products and ${snapshot.ordersCount} orders.`;
  }

  const runLog = {
    runId: "run_" + Date.now(),
    timestamp: new Date().toISOString(),
    status: "success",
    summary: aiText.slice(0, 220),
    aiOutput: aiText,
    actionsTaken,
    modelUsed
  };

  const nextRun = new Date(Date.now() + (task.intervalMinutes || 5) * 60 * 1000);
  const newRunsCount = (task.runsCount || 0) + 1;
  const isFinished = nextRun > new Date(task.expiresAt) || newRunsCount >= (task.maxRuns || 100);
  const nextStatus = isFinished ? "completed" : "running";
  const updatedLogs = [runLog, ...(Array.isArray(task.logs) ? task.logs : [])].slice(0, 50);

  if (isDbConnected()) {
    await AdminAITask.updateOne(
      { taskId },
      {
        $set: {
          lastRunAt: runLog.timestamp,
          nextRunAt: nextRun.toISOString(),
          runsCount: newRunsCount,
          status: nextStatus,
          logs: updatedLogs
        }
      }
    );
  }
  memTasks.set(taskId, {
    ...task,
    lastRunAt: runLog.timestamp,
    nextRunAt: nextRun.toISOString(),
    runsCount: newRunsCount,
    status: nextStatus,
    logs: updatedLogs
  });

  await recordPrivateWorkLog({
    category: "task",
    status: "completed",
    title: `Completed Cycle #${newRunsCount} for "${task.title}"`,
    detail: runLog.summary,
    modelUsed
  });

  return runLog;
}

// Lazy Background Worker Loop: ONLY runs while active running tasks exist; stops automatically when idle
let backgroundLoopTimer = null;
export function startAdminAgentBackgroundLoop() {
  if (backgroundLoopTimer) return;

  let idleTicks = 0;
  backgroundLoopTimer = setInterval(async () => {
    try {
      let runningTasks = [];
      if (isDbConnected()) {
        runningTasks = await AdminAITask.find({ status: "running" }).lean().catch(() => []);
      } else {
        runningTasks = Array.from(memTasks.values()).filter(t => t.status === "running");
      }

      if (runningTasks.length === 0) {
        idleTicks++;
        if (idleTicks >= 3) {
          clearInterval(backgroundLoopTimer);
          backgroundLoopTimer = null;
        }
        return;
      }

      idleTicks = 0;
      const now = new Date();
      for (const t of runningTasks) {
        if (new Date(t.expiresAt) < now && t.runsCount > 0) {
          if (isDbConnected()) {
            await AdminAITask.updateOne({ taskId: t.taskId }, { $set: { status: "completed" } });
          }
          if (memTasks.has(t.taskId)) {
            memTasks.set(t.taskId, { ...t, status: "completed" });
          }
          continue;
        }
        if (!t.nextRunAt || new Date(t.nextRunAt) <= now) {
          await executeSingleTaskCycle(t.taskId);
        }
      }
    } catch (_) {}
  }, 20000);
  if (backgroundLoopTimer && typeof backgroundLoopTimer.unref === "function") {
    backgroundLoopTimer.unref();
  }
}
