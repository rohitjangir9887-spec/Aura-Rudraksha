import { AuraAIRagDocument } from "../models/AuraAI.js";
import { Product } from "../models/Product.js";
import { Coupon } from "../models/Coupon.js";
import { ActiveOffer, Offer } from "../models/Promotion.js";
import { Setting } from "../models/Setting.js";
import { Review } from "../models/Review.js";
import { Order } from "../models/Order.js";
import { isDbConnected } from "../config/db.js";
import { inMemoryStore } from "../data/inMemoryStore.js";
import { VEDIC_BEADS_KNOWLEDGE, VEDIC_SHASTRA_KNOWLEDGE } from "./vedicKnowledgeService.js";

// Global in-memory cache for ultra-fast RAG retrieval & public trends
let ragCacheDocs = [];
let publicTrendsCache = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes (or explicitly invalidated)

/**
 * Invalidate RAG Cache (called when Admin updates products, prices, stock, offers, coupons, or settings)
 */
export function invalidateRagCache() {
  lastCacheTime = 0;
  ragCacheDocs = [];
  publicTrendsCache = null;
  console.log("[RAG Service] Cache invalidated due to store update.");
}

/**
 * Build public-safe, zero-PII store trends & aggregated statistics from live store records
 */
function computePublicTrends({
  liveProducts = [],
  liveOrders = [],
  liveReviews = [],
  activeCoupons = [],
  activeOffers = [],
  storeOffers = [],
  settings = null
}) {
  const productMap = new Map();
  for (const p of liveProducts) {
    const pid = String(p.id || p._id || "").trim();
    if (pid) productMap.set(pid, p);
    if (p.slug) productMap.set(String(p.slug).trim(), p);
  }

  // Aggregate trending & bestselling products strictly from order line items (ZERO customer PII!)
  const salesMap = new Map();
  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

  for (const order of liveOrders) {
    const orderStatus = String(order.orderStatus || order.status || "").toLowerCase();
    if (orderStatus === "cancelled" || orderStatus === "failed") continue;
    const orderTime = order.createdAt ? new Date(order.createdAt).getTime() : 0;
    const isRecent = orderTime >= thirtyDaysAgo;

    const items = Array.isArray(order.items) ? order.items : [];
    for (const item of items) {
      if (!item) continue;
      const key = String(item.productId || item.id || item.slug || item.name || "").trim();
      if (!key) continue;
      const qty = Math.max(1, Number(item.quantity || item.qty || 1));
      const prod = productMap.get(key) || liveProducts.find(p =>
        String(p.name || "").toLowerCase() === String(item.name || "").toLowerCase()
      );
      const canonicalId = prod ? String(prod.id || prod._id) : key;
      const entry = salesMap.get(canonicalId) || {
        productId: canonicalId,
        name: prod?.name || item.name || "Sacred Rudraksha",
        slug: prod?.slug || item.slug || canonicalId,
        category: prod?.category || "Rudraksha",
        price: Number(prod?.price ?? item.price ?? 0),
        stock: Number(prod?.stock ?? 0),
        unitsSold: 0,
        recent30dUnits: 0
      };
      entry.unitsSold += qty;
      if (isRecent) entry.recent30dUnits += qty;
      salesMap.set(canonicalId, entry);
    }
  }

  const trendingProducts = Array.from(salesMap.values())
    .sort((a, b) => (b.recent30dUnits - a.recent30dUnits) || (b.unitsSold - a.unitsSold))
    .slice(0, 8);

  // Public category distribution
  const categoryStatsMap = new Map();
  let inStockProductsCount = 0;
  for (const p of liveProducts) {
    const cat = String(p.category || "Rudraksha Beads").trim();
    const stk = Number(p.stock ?? 0);
    if (stk > 0 || p.inStock !== false) inStockProductsCount += 1;
    const prev = categoryStatsMap.get(cat) || { category: cat, count: 0 };
    prev.count += 1;
    categoryStatsMap.set(cat, prev);
  }

  // Verified public reviews aggregate (strictly excluding samples & AI drafts)
  const verifiedPublicReviews = liveReviews.filter(r =>
    r && !r.isSample && !r.isAiGenerated && r.source !== "ai_draft" && r.publicDisplay !== false
  );
  const reviewCount = verifiedPublicReviews.length;
  const avgRating = reviewCount > 0
    ? Number((verifiedPublicReviews.reduce((acc, r) => acc + (Number(r.rating) || 5), 0) / reviewCount).toFixed(2))
    : 5.0;

  const s = settings || {};
  const shippingSummary = {
    standardShippingFee: Number(s.standardShippingFee ?? 0),
    freeShippingThreshold: Number(s.freeShippingThreshold ?? 0),
    enableCod: s.enableCod !== false,
    enableOnlinePayment: s.enableOnlinePayment !== false,
    codFee: Math.max(0, Number(s.codFee ?? 0)),
    currency: s.currency || "INR"
  };

  return {
    trainedAt: new Date().toISOString(),
    totals: {
      publishedProducts: liveProducts.length,
      inStockProducts: inStockProductsCount,
      activeCoupons: activeCoupons.length,
      activeCampaigns: activeOffers.filter(o => o.enabled !== false).length + storeOffers.filter(o => o.status === "Active").length,
      publicVerifiedReviews: reviewCount,
      averageStoreRating: avgRating
    },
    categories: Array.from(categoryStatsMap.values()).sort((a, b) => b.count - a.count),
    trendingProducts,
    activeCoupons: activeCoupons.map(c => ({
      code: c.code,
      discount: c.discount,
      type: c.type,
      minAmount: c.minAmount || 0
    })),
    activeCampaigns: activeOffers
      .filter(ao => ao && ao.enabled !== false && ao.status === "Active")
      .map(ao => ({
        title: ao.title || "Special Offer",
        subtitle: ao.subtitle || "",
        discountValue: ao.discountValue || 0,
        discountType: ao.discountType || "fixed",
        couponCode: ao.couponCode || ""
      })),
    shippingAndPayments: shippingSummary
  };
}

/**
 * Build & Index live Aura Store public knowledge + real trends into MongoDB / memory cache
 */
export async function buildStoreRagIndex(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && ragCacheDocs.length > 0 && now - lastCacheTime < CACHE_TTL_MS) {
    return ragCacheDocs;
  }

  const docs = [];

  // 1. Fetch live Store Settings for dynamic policy accuracy
  let liveSettings = null;
  if (isDbConnected()) {
    try {
      liveSettings = await Setting.findOne({ id: "STORE_SETTINGS" }).lean().catch(() => null);
    } catch (_) {
      liveSettings = null;
    }
  }

  const shipFee = Number(liveSettings?.standardShippingFee ?? 0);
  const freeThreshold = Number(liveSettings?.freeShippingThreshold ?? 0);
  const codEnabled = liveSettings?.enableCod !== false;
  const onlinePayEnabled = liveSettings?.enableOnlinePayment !== false;
  const codFee = Math.max(0, Number(liveSettings?.codFee ?? 0));

  const shippingLine = shipFee <= 0
    ? "Aura Rudraksha provides FREE Standard Shipping across all India."
    : freeThreshold > 0
      ? `Standard shipping is ₹${shipFee}, and FREE shipping applies on orders above ₹${freeThreshold}.`
      : `Standard shipping fee across India is ₹${shipFee}.`;

  const paymentLine = [
    onlinePayEnabled ? "Secure Online Payment (UPI / Cards / NetBanking via PayU) is ENABLED" : "Online Payment is currently disabled",
    codEnabled ? `Cash on Delivery (COD) is ENABLED${codFee > 0 ? ` (₹${codFee} COD handling fee)` : " (No extra COD fee)"}` : "Cash on Delivery (COD) is currently disabled"
  ].join(". ");

  docs.push({
    docId: "policy_shipping",
    docType: "policy",
    title: "Live Shipping & Payment Policy",
    content: `${shippingLine} ${paymentLine}. Delivery takes 3 to 5 business days via BlueDart, Delhivery, or SpeedPost in tamper-proof insured packaging.`,
    metadata: { category: "shipping" }
  });

  docs.push({
    docId: "policy_returns",
    docType: "policy",
    title: "Return, Refund & Lab Guarantee Policy",
    content: "Aura Rudraksha offers a 7-Day Return and Replacement Policy for manufacturing defects or damaged items. Every Rudraksha bead is X-Ray tested and accompanied by an official Gemological Lab Test Certificate.",
    metadata: { category: "returns" }
  });

  docs.push({
    docId: "policy_purification",
    docType: "policy",
    title: "Dharan Vidhi & Purification Rules",
    content: "Purification Vidhi: Dip the Rudraksha in Holy Ganga Jal or raw milk on Monday morning. Recite 'Om Namah Shivaya' or the specific Mukhi Beej Mantra 108 times before wearing.",
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

  // 2.5 Index Classical Vedic Shastra Canons & Life Domain Matrices
  if (VEDIC_SHASTRA_KNOWLEDGE) {
    for (const [canonKey, canon] of Object.entries(VEDIC_SHASTRA_KNOWLEDGE.classicalCanons || {})) {
      docs.push({
        docId: `shastra_${canonKey}`,
        docType: "shastra",
        title: `Classical Authority: ${canon.title}`,
        content: `${canon.title} by ${canon.author || "Vedic Tradition"}. Authority: ${canon.authority}. Principles: ${(canon.corePrinciples || []).join(" ")}`,
        metadata: { canon: canonKey }
      });
    }

    for (const [domainKey, domain] of Object.entries(VEDIC_SHASTRA_KNOWLEDGE.lifeDomainMatrices || {})) {
      docs.push({
        docId: `domain_${domainKey}`,
        docType: "astrology_domain",
        title: `Astrological Analysis: ${domain.domain}`,
        content: `Domain: ${domain.domain}. Houses: ${(domain.primaryHouses || []).join(", ")}. Karakas: ${(domain.primaryKarakas || []).join(", ")}. Divisional Charts: ${(domain.divisionalCharts || []).join(", ")}. Yogas: ${(domain.yogas || []).join(", ")}. Rudraksha Guidance: ${domain.rudrakshaGuidance}`,
        metadata: { domain: domainKey }
      });
    }
  }

  // 3. Index Live Published Products, Real Public Orders (line items only), Verified Reviews, Offers & Coupons
  let liveProducts = [];
  let liveOrders = [];
  let liveReviews = [];
  let dbCoupons = [];
  let dbActiveOffers = [];
  let dbStoreOffers = [];

  if (isDbConnected()) {
    try {
      [liveProducts, liveOrders, liveReviews, dbCoupons, dbActiveOffers, dbStoreOffers] = await Promise.all([
        Product.find({
          status: { $nin: ["Draft", "draft", "Inactive", "inactive", "Archived", "archived"] }
        }).lean().catch(() => []),
        Order.find({}, { items: 1, status: 1, orderStatus: 1, createdAt: 1 }).sort({ createdAt: -1 }).limit(300).lean().catch(() => []),
        Review.find({
          status: { $in: ["Approved", "Published"] },
          isSample: { $ne: true },
          isAiGenerated: { $ne: true },
          source: { $ne: "ai_draft" },
          publicDisplay: { $ne: false }
        }, { productId: 1, productName: 1, rating: 1, isSample: 1, isAiGenerated: 1, source: 1, publicDisplay: 1 }).lean().catch(() => []),
        Coupon.find({ status: "Active" }).lean().catch(() => []),
        ActiveOffer.find({ enabled: true, status: "Active" }).lean().catch(() => []),
        Offer.find({ status: "Active" }).lean().catch(() => [])
      ]);
    } catch (dbErr) {
      console.warn("[RAG Service] MongoDB fetch notice:", dbErr?.message);
    }
  } else if (inMemoryStore.isProductsSyncedFromDb && Array.isArray(inMemoryStore.products)) {
    liveProducts = inMemoryStore.products.filter(p => {
      const s = String(p?.status || "Published").toLowerCase();
      return !["draft", "inactive", "archived"].includes(s);
    });
    liveReviews = (inMemoryStore.reviews || []).filter(r => !r?.isSample && !r?.isAiGenerated);
    dbCoupons = (inMemoryStore.coupons || []).filter(c => c?.status === "Active");
    dbActiveOffers = inMemoryStore.activeOffer?.enabled ? [inMemoryStore.activeOffer] : [];
    dbStoreOffers = (inMemoryStore.offers || []).filter(o => o?.status === "Active");
  }

  for (const p of (liveProducts || [])) {
    const pPrice = Number(p.price) || 0;
    const pMrp = Number(p.mrp || p.comparePrice || Math.round(pPrice * 1.35));
    const pStock = Number(p.stock ?? 0);
    const inStockText = pStock > 0 ? `In Stock (${pStock} available)` : "Out of Stock";
    const indInfo = p.indonesiaPrice
      ? ` Indonesian variant: ₹${Number(p.indonesiaPrice)} (${Number(p.indonesiaStock ?? 0)} in stock).`
      : "";

    docs.push({
      docId: `product_${p.id || p._id}`,
      docType: "product",
      title: `Product: ${p.name}`,
      content: `${p.name} (Category: ${p.category || "Rudraksha"}). Nepali Price: ₹${pPrice} (MRP: ₹${pMrp}). Availability: ${inStockText}.${indInfo} Rating: ${p.rating || 4.9} stars (${p.reviews || 0} reviews). Highlights & Benefits: ${p.highlight || p.description || ""}. Tags: ${Array.isArray(p.tags) ? p.tags.join(", ") : ""}. Slug: ${p.slug}`,
      metadata: {
        productId: String(p.id || p._id),
        name: p.name,
        price: pPrice,
        mrp: pMrp,
        stock: pStock,
        inStock: pStock > 0,
        image: (p.images && p.images[0]) || p.img || p.image || "/images/placeholder.svg",
        category: p.category || "Rudraksha"
      }
    });
  }

  // 4. Filter active non-expired coupons
  const activeCoupons = [];
  const nowTime = Date.now();
  for (const c of (dbCoupons || [])) {
    const code = String(c.code || "").trim().toUpperCase();
    if (!code || inMemoryStore.deletedCouponCodes?.has(code)) continue;
    if (c.expiry && !isNaN(new Date(c.expiry).getTime()) && new Date(c.expiry).getTime() < nowTime) continue;
    activeCoupons.push({ code, discount: c.discount, type: c.type || "percentage", minAmount: c.minAmount || c.minOrderValue || 0 });
  }
  for (const ao of (dbActiveOffers || [])) {
    const code = String(ao.couponCode || "").trim().toUpperCase();
    if (!code || inMemoryStore.deletedCouponCodes?.has(code)) continue;
    if (!ao.neverExpires && (ao.expiresAt || ao.expiry) && new Date(ao.expiresAt || ao.expiry).getTime() < nowTime) continue;
    if (!activeCoupons.some(x => x.code === code)) {
      activeCoupons.push({ code, discount: ao.discountValue, type: ao.discountType || "fixed", minAmount: 0 });
    }
  }

  for (const c of activeCoupons) {
    docs.push({
      docId: `coupon_${c.code}`,
      docType: "coupon",
      title: `Coupon Code: ${c.code}`,
      content: `Coupon Code '${c.code}': Offers ${c.type === "percentage" ? `${c.discount}%` : `₹${c.discount}`} OFF. Minimum order amount: ₹${c.minAmount || 0}. Verified active admin code.`,
      metadata: { code: c.code, discount: c.discount, type: c.type }
    });
  }

  // 5. Compute & Index Live Public Store Trends Document (strictly zero PII)
  const trends = computePublicTrends({
    liveProducts,
    liveOrders,
    liveReviews,
    activeCoupons,
    activeOffers: dbActiveOffers,
    storeOffers: dbStoreOffers,
    settings: liveSettings
  });

  const trendingText = trends.trendingProducts.length > 0
    ? trends.trendingProducts.map((tp, idx) => `${idx + 1}. ${tp.name} (₹${tp.price}, ${tp.unitsSold} ordered)`).join("; ")
    : "Trending rankings will populate automatically as customer orders arrive.";

  docs.push({
    docId: "trends_public_summary",
    docType: "trends",
    title: "Live Public Store Trends & Bestsellers",
    content: `Live Aura Rudraksha Store Snapshot: ${trends.totals.publishedProducts} published products (${trends.totals.inStockProducts} in stock), ${trends.totals.activeCoupons} active coupons, ${trends.totals.publicVerifiedReviews} verified customer reviews (${trends.totals.averageStoreRating}★ avg). Top Trending / Most Ordered: ${trendingText}. Categories: ${trends.categories.map(c => `${c.category} (${c.count})`).join(", ")}.`,
    metadata: trends
  });

  // 6. Persist live RAG knowledge index into MongoDB AuraAIRagDocument when connected
  if (isDbConnected()) {
    try {
      const bulkOps = docs.map(doc => ({
        updateOne: {
          filter: { docId: doc.docId },
          update: {
            $set: {
              docId: doc.docId,
              docType: doc.docType,
              title: doc.title,
              content: doc.content,
              metadata: doc.metadata || {},
              lastIndexedAt: new Date()
            }
          },
          upsert: true
        }
      }));
      if (bulkOps.length > 0) {
        await AuraAIRagDocument.bulkWrite(bulkOps, { ordered: false }).catch(() => {});
      }
      // Prune stale product / coupon docs that no longer exist
      const validIds = new Set(docs.map(d => d.docId));
      await AuraAIRagDocument.deleteMany({
        docType: { $in: ["product", "coupon"] },
        docId: { $nin: Array.from(validIds) }
      }).catch(() => {});
    } catch (_) {}
  }

  ragCacheDocs = docs;
  publicTrendsCache = trends;
  lastCacheTime = now;
  return docs;
}

/**
 * Return cached or freshly trained Public Store Trends & Public Data Summary (strictly zero PII)
 */
export async function getPublicStoreTrendsPayload(forceRefresh = false) {
  const docs = await buildStoreRagIndex(forceRefresh);
  if (!publicTrendsCache) {
    const trendsDoc = docs.find(d => d.docId === "trends_public_summary");
    publicTrendsCache = trendsDoc?.metadata || computePublicTrends({});
  }
  return {
    ...publicTrendsCache,
    indexedDocumentsCount: docs.length
  };
}

/**
 * Retrieve Relevant Live Store Context using RAG Keyword Search
 */
export async function retrieveRagContext(userQuery = "", topK = 4) {
  if (!userQuery) return [];

  const docs = await buildStoreRagIndex();
  const queryLower = userQuery.toLowerCase().trim();

  const scoredDocs = docs.map(doc => {
    let score = 0;
    const contentLower = doc.content.toLowerCase();
    const titleLower = doc.title.toLowerCase();

    if (contentLower.includes(queryLower) || titleLower.includes(queryLower)) {
      score += 100;
    }

    const words = queryLower.split(/\s+/).filter(w => w.length > 2);
    for (const w of words) {
      if (titleLower.includes(w)) score += 30;
      if (contentLower.includes(w)) score += 15;
    }

    if (doc.docType === "trends" && /(trend|trending|popular|bestseller|best seller|most ordered|sabse jyada|famous|public|top product|store stats)/i.test(queryLower)) {
      score += 120;
    }
    if (doc.docType === "product" && (queryLower.includes("dikhao") || queryLower.includes("price") || queryLower.includes("buy") || queryLower.includes("under") || queryLower.includes("rudraksha"))) {
      score += 20;
    }
    if (doc.docType === "policy" && (queryLower.includes("shipping") || queryLower.includes("return") || queryLower.includes("guarantee") || queryLower.includes("certificate") || queryLower.includes("delivery") || queryLower.includes("cod") || queryLower.includes("payment"))) {
      score += 40;
    }
    if (doc.docType === "shastra" && (queryLower.includes("shastra") || queryLower.includes("bphs") || queryLower.includes("parashar") || queryLower.includes("jaimini") || queryLower.includes("jyotish") || queryLower.includes("dasha") || queryLower.includes("yoga") || queryLower.includes("purana"))) {
      score += 50;
    }
    if (doc.docType === "astrology_domain" && (queryLower.includes("career") || queryLower.includes("marriage") || queryLower.includes("health") || queryLower.includes("wealth") || queryLower.includes("business") || queryLower.includes("education") || queryLower.includes("travel") || queryLower.includes("foreign") || queryLower.includes("progeny") || queryLower.includes("child") || queryLower.includes("property") || queryLower.includes("money"))) {
      score += 60;
    }

    return { doc, score };
  });

  scoredDocs.sort((a, b) => b.score - a.score);
  const relevant = scoredDocs.filter(item => item.score > 0).slice(0, topK).map(item => item.doc);

  if (relevant.length === 0) {
    return docs.filter(d => d.docType === "trends" || d.docType === "policy" || d.docType === "coupon").slice(0, 3);
  }

  return relevant;
}
