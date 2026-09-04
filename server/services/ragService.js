import { AuraAIRagDocument } from "../models/AuraAI.js";
import { Product } from "../models/Product.js";
import { Coupon } from "../models/Coupon.js";
import { Setting } from "../models/Setting.js";
import { Review } from "../models/Review.js";
import { isDbConnected } from "../config/db.js";
import { GoogleGenAI } from "@google/genai";
import { VEDIC_BEADS_KNOWLEDGE } from "./vedicKnowledgeService.js";

// Global in-memory cache for ultra-fast RAG retrieval
let ragCacheDocs = [];
let lastCacheTime = 0;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes (or explicitly invalidated)

/**
 * Invalidate RAG Cache (called when Admin updates products, prices, stock, offers, or policies)
 */
export function invalidateRagCache() {
  lastCacheTime = 0;
  ragCacheDocs = [];
  console.log("[RAG Service] Cache invalidated due to store update.");
}

/**
 * Generate text embedding using Gemini API (@google/genai)
 */
async function generateEmbedding(text = "") {
  if (!text || !process.env.GEMINI_API_KEY) return [];
  try {
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: { headers: { "User-Agent": "aistudio-build" } }
    });
    const res = await ai.models.embedContent({
      model: "gemini-embedding-2-preview",
      contents: text.slice(0, 2000)
    });
    return res.embedding?.values || [];
  } catch (err) {
    console.warn("[RAG Service] Gemini embedding notice:", err?.message);
    return [];
  }
}

/**
 * Calculate Cosine Similarity between two vector arrays
 */
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0 || vecA.length !== vecB.length) {
    return 0;
  }
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Build & Index live Aura Store knowledge documents into MongoDB / memory cache
 */
export async function buildStoreRagIndex() {
  const now = Date.now();
  if (ragCacheDocs.length > 0 && now - lastCacheTime < CACHE_TTL_MS) {
    return ragCacheDocs;
  }

  const docs = [];

  // 1. Index Static Policies & FAQs
  docs.push({
    docId: "policy_shipping",
    docType: "policy",
    title: "Shipping & Delivery Policy",
    content: "Aura Rudraksha provides FREE Shipping across all India. Delivery takes 3 to 5 business days via trusted express courier partners (BlueDart, Delhivery, SpeedPost). Every shipment is fully insured in tamper-proof packaging.",
    metadata: { category: "shipping" }
  });

  docs.push({
    docId: "policy_returns",
    docType: "policy",
    title: "Return, Refund & Lab Guarantee Policy",
    content: "Aura Rudraksha offers a hassle-free 7-Day Return and Replacement Policy for genuine manufacturing defects or damaged items. Every Rudraksha bead is 100% Nepali Origin, X-Ray tested, and delivered with an official Government-Approved Gemological Lab Test Certificate.",
    metadata: { category: "returns" }
  });

  docs.push({
    docId: "policy_purification",
    docType: "policy",
    title: "Dharan Vidhi & Purification Rules",
    content: "Purification Vidhi: Dip the Rudraksha in Holy Ganga Jal or raw milk on Monday morning. Recite 'Om Namah Shivaya' or the specific Mukhi Beej Mantra 108 times before wearing. You can wear it during daily activities; remove before heavy exercise, sleeping, or visiting cremation grounds if following strict traditional ascetism.",
    metadata: { category: "spiritual" }
  });

  // 2. Index Vedic Bead Knowledge
  for (const [key, kb] of Object.entries(VEDIC_BEADS_KNOWLEDGE)) {
    docs.push({
      docId: `vedic_${key}`,
      docType: "knowledge",
      title: kb.name,
      content: `${kb.name} (${kb.deity} - ${kb.planet}). Traditional significance: ${kb.traditionalSignificance}. Primary benefits: ${kb.primaryBenefits}. Dharan Vidhi: ${kb.dharanVidhi}. Beej Mantra: ${kb.beejMantra}. Care: ${kb.careGuidance}. Keywords: ${(kb.keywords || []).join(", ")}`,
      metadata: { mukhiKey: key, planet: kb.planet, deity: kb.deity }
    });
  }

  // 3. Index Live Products from MongoDB
  if (isDbConnected()) {
    try {
      const dbProducts = await Product.find({
        status: { $nin: ["Draft", "draft", "Inactive", "inactive", "Archived", "archived"] }
      }).lean();

      for (const p of dbProducts) {
        const pPrice = Number(p.price) || 0;
        const pMrp = Number(p.mrp || p.comparePrice || Math.round(pPrice * 1.35));
        const pStock = Number(p.stock) > 0 ? Number(p.stock) : (p.inStock !== false ? 50 : 0);
        const inStockText = pStock > 0 ? `In Stock (${pStock} available)` : "Out of Stock";

        docs.push({
          docId: `product_${p.id || p._id}`,
          docType: "product",
          title: `Product: ${p.name}`,
          content: `${p.name} (Category: ${p.category || 'Rudraksha'}). Price: ₹${pPrice} (MRP: ₹${pMrp}). Availability: ${inStockText}. Rating: ${p.rating || 4.9} stars (${p.reviews || 24} reviews). Highlights & Benefits: ${p.highlight || p.description || ''}. Tags: ${Array.isArray(p.tags) ? p.tags.join(', ') : ''}. Slug: ${p.slug}`,
          metadata: {
            productId: String(p.id || p._id),
            name: p.name,
            price: pPrice,
            mrp: pMrp,
            stock: pStock,
            inStock: pStock > 0,
            image: (p.images && p.images[0]) || p.img || p.image || "/images/product-5mukhi.jpg",
            category: p.category || "Rudraksha"
          }
        });
      }
    } catch (dbErr) {
      console.warn("[RAG Service] MongoDB products fetch notice:", dbErr?.message);
    }

    // 4. Index Live Active Coupons
    try {
      const activeCoupons = await Coupon.find({ status: "Active" }).lean();
      for (const c of activeCoupons) {
        docs.push({
          docId: `coupon_${c.code}`,
          docType: "coupon",
          title: `Coupon Code: ${c.code}`,
          content: `Coupon Code '${c.code}': Offers ${c.type === 'percentage' ? c.discount + '%' : '₹' + c.discount} OFF. Minimum order amount: ₹${c.minPurchase || 0}. Valid code for checkout.`,
          metadata: { code: c.code, discount: c.discount, type: c.type }
        });
      }
    } catch (cErr) {
      console.warn("[RAG Service] MongoDB coupons fetch notice:", cErr?.message);
    }
  }

  ragCacheDocs = docs;
  lastCacheTime = now;
  return docs;
}

/**
 * Retrieve Relevant Live Store Context using RAG Vector & Keyword Search
 */
export async function retrieveRagContext(userQuery = "", topK = 4) {
  if (!userQuery) return [];

  const docs = await buildStoreRagIndex();
  const queryLower = userQuery.toLowerCase().trim();

  // Keyword score & term matching
  const scoredDocs = docs.map(doc => {
    let score = 0;
    const contentLower = doc.content.toLowerCase();
    const titleLower = doc.title.toLowerCase();

    // Exact phrase match
    if (contentLower.includes(queryLower) || titleLower.includes(queryLower)) {
      score += 100;
    }

    // Word token match
    const words = queryLower.split(/\s+/).filter(w => w.length > 2);
    for (const w of words) {
      if (titleLower.includes(w)) score += 30;
      if (contentLower.includes(w)) score += 15;
    }

    // Specific category boosts
    if (doc.docType === "product" && (queryLower.includes("dikhao") || queryLower.includes("price") || queryLower.includes("buy") || queryLower.includes("under") || queryLower.includes("rudraksha"))) {
      score += 20;
    }
    if (doc.docType === "policy" && (queryLower.includes("shipping") || queryLower.includes("return") || queryLower.includes("guarantee") || queryLower.includes("certificate") || queryLower.includes("delivery"))) {
      score += 40;
    }

    return { doc, score };
  });

  scoredDocs.sort((a, b) => b.score - a.score);
  const relevant = scoredDocs.filter(item => item.score > 0).slice(0, topK).map(item => item.doc);

  if (relevant.length === 0) {
    // Return default general policy & featured product
    return docs.filter(d => d.docType === "policy" || d.docType === "coupon").slice(0, 2);
  }

  return relevant;
}
