import {
  AuraAISetting,
  AuraAIConversation,
  AdminAIChatSession,
  AdminAIActionLog,
  AdminAITask,
  AdminAIWorkLog
} from "../models/AuraAI.js";
import { Product } from "../models/Product.js";
import { Coupon } from "../models/Coupon.js";
import { Order } from "../models/Order.js";
import { Customer } from "../models/Customer.js";
import { Setting } from "../models/Setting.js";
import { Review } from "../models/Review.js";
import { Banner } from "../models/Banner.js";
import { isDbConnected, getMongoUri, getLastDbSync, connectDB } from "../config/db.js";
import { inMemoryStore } from "../data/inMemoryStore.js";
import { defaultProducts } from "../data/defaultData.js";
import {
  resolveNvidiaKey,
  resolveGeminiKey,
  getNvidiaClient,
  getGeminiClient,
  PRIMARY_NIM_MODEL,
  GEMINI_TEXT_MODELS,
  convertNimMessagesToGemini
} from "../controllers/auraAiController.js";

// Resilient in-memory mirrors when DB is warming up
const memChatSessions = new Map();
const memActionLogs = new Map();
const memTasks = new Map();
const memWorkLogs = [];

export const NIM_FALLBACK_MODELS = [
  PRIMARY_NIM_MODEL,
  "meta/llama-3.3-70b-instruct",
  "nvidia/llama-3.1-nemotron-70b-instruct"
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
 * Strict message normalizer for NVIDIA NIM so roles ALWAYS start with system -> user -> assistant
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
      // Skip leading assistant welcome message so first message after system is always 'user'
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

/**
 * Call NVIDIA NIM (primary) with multi-model resilience + Gemini fallback
 */
export async function invokeAdminLLM(systemPrompt, rawMessages = [], maxTokens = 2800) {
  await resolveNvidiaKey();
  await resolveGeminiKey();

  const nvidia = getNvidiaClient();
  const gemini = getGeminiClient();
  const nimMessages = sanitizeNimMessages(systemPrompt, rawMessages);

  if (nvidia) {
    for (const modelName of NIM_FALLBACK_MODELS) {
      try {
        const completion = await nvidia.chat.completions.create({
          model: modelName,
          messages: nimMessages,
          temperature: 0.65,
          max_tokens: maxTokens
        });
        const msg = completion?.choices?.[0]?.message;
        const text = (msg?.content || msg?.reasoning_content || "").trim();
        if (text) {
          return { text, modelUsed: modelName, provider: "NVIDIA NIM" };
        }
      } catch (nimErr) {
        console.warn(`[AdminAgent] NVIDIA NIM (${modelName}) warning:`, nimErr?.message || nimErr);
      }
    }
  }

  if (gemini) {
    const geminiContents = convertNimMessagesToGemini(nimMessages);
    for (const gModel of GEMINI_TEXT_MODELS) {
      try {
        const response = await gemini.models.generateContent({
          model: gModel,
          contents: geminiContents,
          config: {
            systemInstruction: systemPrompt,
            temperature: 0.65
          }
        });
        const text = (response?.text || "").trim();
        if (text) {
          return { text, modelUsed: `${PRIMARY_NIM_MODEL} (via ${gModel} engine)`, provider: "Hybrid NIM/Gemini" };
        }
      } catch (gErr) {
        console.warn(`[AdminAgent] Gemini fallback (${gModel}) warning:`, gErr?.message || gErr);
      }
    }
  }

  throw new Error("Both NVIDIA NIM and Fallback AI engines could not complete the request.");
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
  let settings = null;

  if (isDbConnected()) {
    try {
      [products, orders, coupons, customersCount, reviewsCount, settings] = await Promise.all([
        Product.find().sort({ createdAt: -1 }).limit(60).lean().catch(() => []),
        Order.find().sort({ createdAt: -1 }).limit(20).lean().catch(() => []),
        Coupon.find().limit(25).lean().catch(() => []),
        Customer.countDocuments().catch(() => 0),
        Review.countDocuments().catch(() => 0),
        Setting.findOne().lean().catch(() => null)
      ]);
    } catch (_) {}
  }

  if (!products || products.length === 0) {
    products = (inMemoryStore.products && inMemoryStore.products.length > 0)
      ? inMemoryStore.products
      : defaultProducts;
  }

  const totalRevenue = orders.reduce((acc, o) => acc + (Number(o.total || o.totalAmount) || 0), 0);
  const lowStockProducts = products.filter(p => Number(p.stock ?? 25) <= 10);

  return {
    mongoConnected: isDbConnected(),
    productsCount: products.length,
    products,
    lowStockCount: lowStockProducts.length,
    ordersCount: orders.length,
    recentOrders: orders.slice(0, 10),
    totalRevenue,
    couponsCount: coupons.length,
    coupons,
    customersCount,
    reviewsCount,
    settings: settings || { storeName: "Aura Rudraksha", aiCustomFeatures: [] }
  };
}

/**
 * Scan the entire website & MongoDB for bugs, SEO issues, missing fields, and anomalies
 */
export async function runWebsiteBugDiagnostic() {
  const snapshot = await getCompleteWebsiteSnapshot();
  const bugs = [];

  // 1. Check MongoDB connection
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

  // 2. Check products for missing SEO, broken prices, low stock, or missing images
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
    if (Number(p.stock ?? 25) <= 5) {
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

  // 3. Check coupons
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
 * Execute an Autonomous Admin Action (Create/Update/Delete Product, Coupon, Feature, Settings, Bug Fix, etc.)
 */
export async function executeAdminAgentAction(actionPayload, context = {}) {
  const { type, data = {} } = actionPayload || {};
  const { sessionId = "", taskId = "", source = "admin_chat" } = context;

  if (!type) return null;

  switch (type.toUpperCase()) {
    case "CREATE_PRODUCT": {
      const mukhiMatch = String(data.name || data.mukhi || "5").match(/(\d+)/);
      const mukhiNum = mukhiMatch ? parseInt(mukhiMatch[1], 10) : 5;
      const name = data.name || `${mukhiNum} Mukhi Authentic Nepali Rudraksha`;
      const slug = (data.slug || name)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") + "-" + Math.random().toString(36).substring(2, 5);
      const id = "prod_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
      const price = Number(data.price) || (mukhiNum === 1 ? 14999 : mukhiNum >= 11 ? 5499 : 1499);
      const comparePrice = Number(data.comparePrice) || Math.round(price * 1.35);
      const stock = Number(data.stock ?? 25);
      const defaultImg = data.image || data.img || `/images/product-${mukhiNum >= 1 && mukhiNum <= 14 ? mukhiNum : 5}mukhi.jpg`;

      const newProductDoc = {
        id,
        name,
        slug,
        category: data.category || "Rudraksha Beads",
        subCategory: data.subCategory || `${mukhiNum} Mukhi`,
        mukhi: `${mukhiNum} Mukhi`,
        price,
        comparePrice,
        mrp: comparePrice,
        discount: Math.round(((comparePrice - price) / comparePrice) * 100),
        stock,
        origin: data.origin || "Nepal (Himalayan)",
        rulingPlanet: data.rulingPlanet || "Jupiter / Shiva",
        deity: data.deity || "Lord Shiva (Kalagni Rudra)",
        mantra: data.mantra || "Om Hreem Namah",
        description: data.description || `Authentic Lab-Certified ${name} sourced directly from the sacred Arun Valley of Nepal. Energized with Vedic Shiva Purana rituals and Gangajal Abhishekam for spiritual protection, clarity, and prosperity.`,
        benefits: Array.isArray(data.benefits) && data.benefits.length > 0
          ? data.benefits
          : [
              "100% Natural X-Ray & Lab Certified Himalayan Bead",
              "Prana-Pratishtha energized by Kashi Vedic Acharyas",
              "Balances planetary energies and enhances spiritual aura"
            ],
        images: [defaultImg],
        img: defaultImg,
        image: defaultImg,
        status: "Active",
        showOnHome: data.showOnHome !== false,
        rating: 4.9,
        reviews: 18,
        certification: "ISO 9001:2015 Lab Certified"
      };

      let savedProd = newProductDoc;
      if (isDbConnected()) {
        const created = await Product.create(newProductDoc);
        savedProd = created.toObject ? created.toObject() : created;
      }
      if (Array.isArray(inMemoryStore.products)) {
        inMemoryStore.products.unshift(savedProd);
      }

      const log = await recordAdminActionLog({
        actionType: "CREATE_PRODUCT",
        title: `Uploaded New Product: ${name} (₹${price})`,
        description: `Created product "${name}" with Stock: ${stock}, Price: ₹${price}, Slug: ${slug}`,
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
        previewTitle: `New Product Live Preview: ${name}`,
        product: savedProd
      };
    }

    case "UPDATE_PRODUCT": {
      const query = data.id
        ? { $or: [{ id: data.id }, { slug: data.id }] }
        : { name: new RegExp(String(data.name || "5 Mukhi").replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") };

      let existing = null;
      if (isDbConnected()) {
        existing = await Product.findOne(query).lean();
      }
      if (!existing && Array.isArray(inMemoryStore.products)) {
        existing = inMemoryStore.products.find(p =>
          p.id === data.id || p.slug === data.id || (data.name && p.name?.toLowerCase().includes(String(data.name).toLowerCase()))
        );
      }
      if (!existing) {
        return { error: `Product "${data.name || data.id}" not found in catalog.` };
      }

      const updates = {};
      if (data.price !== undefined) updates.price = Number(data.price);
      if (data.comparePrice !== undefined) updates.comparePrice = Number(data.comparePrice);
      if (data.stock !== undefined) updates.stock = Number(data.stock);
      if (data.name !== undefined && data.newName) updates.name = String(data.newName);
      if (data.description !== undefined) updates.description = String(data.description);
      if (data.status !== undefined) updates.status = String(data.status);
      if (data.showOnHome !== undefined) updates.showOnHome = Boolean(data.showOnHome);
      if (data.image !== undefined) {
        updates.img = data.image;
        updates.image = data.image;
        updates.images = [data.image];
      }

      let updatedDoc = { ...existing, ...updates };
      if (isDbConnected()) {
        await Product.updateOne({ id: existing.id }, { $set: updates });
      }
      if (Array.isArray(inMemoryStore.products)) {
        const idx = inMemoryStore.products.findIndex(p => p.id === existing.id);
        if (idx !== -1) inMemoryStore.products[idx] = { ...inMemoryStore.products[idx], ...updates };
      }

      const pRoute = `/product/${existing.slug || existing.id}`;
      const log = await recordAdminActionLog({
        actionType: "UPDATE_PRODUCT",
        title: `Updated Product: ${existing.name}`,
        description: `Updated fields (${Object.keys(updates).join(", ")}) on "${existing.name}"`,
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
        previewTitle: `Updated Product Preview: ${existing.name}`,
        product: updatedDoc
      };
    }

    case "DELETE_PRODUCT": {
      const query = data.id
        ? { $or: [{ id: data.id }, { slug: data.id }] }
        : { name: new RegExp(String(data.name || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") };

      let existing = null;
      if (isDbConnected()) {
        existing = await Product.findOne(query).lean();
        if (existing) {
          await Product.deleteOne({ id: existing.id });
        }
      }
      if (Array.isArray(inMemoryStore.products)) {
        const idx = inMemoryStore.products.findIndex(p => p.id === (existing?.id || data.id));
        if (idx !== -1) {
          if (!existing) existing = inMemoryStore.products[idx];
          inMemoryStore.products.splice(idx, 1);
        }
      }
      if (!existing) {
        return { error: `Product not found to delete.` };
      }

      const log = await recordAdminActionLog({
        actionType: "DELETE_PRODUCT",
        title: `Deleted Product: ${existing.name}`,
        description: `Removed "${existing.name}" from store catalog (Full backup saved for Undo).`,
        targetCollection: "Product",
        targetId: existing.id,
        previousData: existing,
        newData: null,
        previewRoute: "/shop",
        source,
        sessionId,
        taskId
      });

      return {
        actionId: log.actionId,
        actionType: "DELETE_PRODUCT",
        title: log.title,
        previewRoute: "/shop",
        previewTitle: "Store Shop Catalog (After Deletion)"
      };
    }

    case "CREATE_COUPON": {
      const code = String(data.code || "SHIVA" + Math.floor(10 + Math.random() * 89)).toUpperCase().replace(/\s+/g, "");
      const discountValue = Number(data.discountValue || data.discount || 15);
      const discountType = data.discountType || "percentage";
      const minOrder = Number(data.minOrder || 999);
      const id = "cpn_" + Date.now();

      const newCoupon = {
        id,
        code,
        discountType,
        discountValue,
        minOrderValue: minOrder,
        maxDiscount: Number(data.maxDiscount || 2000),
        description: data.description || `Flat ${discountValue}${discountType === "percentage" ? "%" : "₹"} OFF on Sacred Rudraksha`,
        isActive: true,
        usageLimit: 500,
        usedCount: 0
      };

      if (isDbConnected()) {
        await Coupon.findOneAndUpdate({ code }, { $set: newCoupon }, { upsert: true, new: true });
      }

      const log = await recordAdminActionLog({
        actionType: "CREATE_COUPON",
        title: `Created Coupon Code: ${code} (${discountValue}${discountType === "percentage" ? "%" : "₹"} OFF)`,
        description: `Active coupon ${code} created with min order ₹${minOrder}.`,
        targetCollection: "Coupon",
        targetId: code,
        previousData: null,
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
        previewTitle: `Admin Coupons Manager (${code})`
      };
    }

    case "ADD_WEBSITE_FEATURE": {
      const featureId = "feat_" + Date.now();
      const newFeature = {
        id: featureId,
        type: data.featureType || "flash_sale_banner",
        title: data.title || "🕉️ Maha Shivratri Sacred Energized Rudraksha Mahotsav — Use Code SHIVA20 for 20% OFF!",
        subtitle: data.subtitle || "100% Lab-Certified Nepali Beads • Free Kashi Gangajal Abhishekam",
        badge: data.badge || "LIVE OFFER",
        ctaText: data.ctaText || "Explore Sacred Collection",
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
        title: `Added New Website Feature: ${newFeature.title.slice(0, 50)}`,
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
        previewTitle: "Live Storefront Preview (With New Feature Added)",
        feature: newFeature
      };
    }

    case "UPDATE_ORDER": {
      const orderId = data.orderId || data.id;
      const newStatus = data.status || "Shipped";
      let existingOrder = null;
      if (isDbConnected()) {
        existingOrder = orderId
          ? await Order.findOne({ $or: [{ orderId }, { id: orderId }] }).lean()
          : await Order.findOne().sort({ createdAt: -1 }).lean();
        if (existingOrder) {
          await Order.updateOne(
            { _id: existingOrder._id },
            { $set: { status: newStatus } }
          );
        }
      }
      if (!existingOrder) {
        return { error: "No matching order found in database." };
      }

      const log = await recordAdminActionLog({
        actionType: "UPDATE_ORDER",
        title: `Updated Order #${existingOrder.orderId || existingOrder.id} -> ${newStatus}`,
        description: `Order status changed from "${existingOrder.status}" to "${newStatus}"`,
        targetCollection: "Order",
        targetId: existingOrder.orderId || existingOrder.id,
        previousData: existingOrder,
        newData: { ...existingOrder, status: newStatus },
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

    case "AUTO_FIX_BUGS": {
      const diag = await runWebsiteBugDiagnostic();
      const fixedList = [];

      if (!diag.metrics.mongoConnected) {
        await connectDB().catch(() => {});
      }

      for (const b of diag.bugs) {
        if (b.fixType === "RESTOCK_PRODUCT" && b.targetId && isDbConnected()) {
          const prev = await Product.findOne({ id: b.targetId }).lean();
          if (prev) {
            await Product.updateOne({ id: b.targetId }, { $set: { stock: 30 } });
            await recordAdminActionLog({
              actionType: "UPDATE_PRODUCT",
              title: `Auto-Fixed Low Stock: ${prev.name} (Restocked to 30)`,
              description: `Bug Auto-Fix raised stock from ${prev.stock} to 30.`,
              targetCollection: "Product",
              targetId: prev.id,
              previousData: prev,
              newData: { ...prev, stock: 30 },
              previewRoute: `/product/${prev.slug || prev.id}`,
              source,
              sessionId,
              taskId
            });
            fixedList.push(`Restocked "${prev.name}" to 30 units`);
          }
        } else if (b.fixType === "ENRICH_PRODUCT_SEO" && b.targetId && isDbConnected()) {
          const prev = await Product.findOne({ id: b.targetId }).lean();
          if (prev) {
            const richDesc = `${prev.name} — 100% Authentic Lab-Certified Himalayan Rudraksha consecrated with Vedic Shiva Purana Prana-Pratishtha rituals. Brings spiritual clarity, planetary harmony, and divine protection.`;
            await Product.updateOne({ id: b.targetId }, { $set: { description: richDesc } });
            await recordAdminActionLog({
              actionType: "UPDATE_PRODUCT",
              title: `Auto-Fixed SEO Description: ${prev.name}`,
              description: `Enriched thin product description with Vedic SEO copy.`,
              targetCollection: "Product",
              targetId: prev.id,
              previousData: prev,
              newData: { ...prev, description: richDesc },
              previewRoute: `/product/${prev.slug || prev.id}`,
              source,
              sessionId,
              taskId
            });
            fixedList.push(`Enriched SEO description for "${prev.name}"`);
          }
        }
      }

      return {
        actionId: "fix_" + Date.now(),
        actionType: "AUTO_FIX_BUGS",
        title: `Auto-Repaired ${fixedList.length} Website Bugs (${diag.bugsCount} scanned)`,
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
        title: `Opened Live Page Preview: ${title}`,
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

    default:
      return null;
  }
}

/**
 * Undo / Revert an AI Action by its actionId
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
    throw new Error("Action log not found in MongoDB.");
  }
  if (log.reverted) {
    return { alreadyReverted: true, log };
  }

  const { actionType, targetCollection, targetId, previousData } = log;

  if (actionType === "CREATE_PRODUCT" && targetCollection === "Product") {
    if (isDbConnected()) {
      await Product.deleteOne({ id: targetId });
    }
    if (Array.isArray(inMemoryStore.products)) {
      const idx = inMemoryStore.products.findIndex(p => p.id === targetId);
      if (idx !== -1) inMemoryStore.products.splice(idx, 1);
    }
  } else if (actionType === "UPDATE_PRODUCT" && previousData) {
    const cleanPrev = { ...previousData };
    delete cleanPrev._id;
    if (isDbConnected()) {
      await Product.findOneAndUpdate({ id: targetId }, { $set: cleanPrev }, { upsert: true });
    }
    if (Array.isArray(inMemoryStore.products)) {
      const idx = inMemoryStore.products.findIndex(p => p.id === targetId);
      if (idx !== -1) inMemoryStore.products[idx] = { ...inMemoryStore.products[idx], ...cleanPrev };
    }
  } else if (actionType === "DELETE_PRODUCT" && previousData) {
    const cleanPrev = { ...previousData };
    delete cleanPrev._id;
    if (isDbConnected()) {
      await Product.findOneAndUpdate({ id: targetId }, { $set: cleanPrev }, { upsert: true });
    }
    if (Array.isArray(inMemoryStore.products)) {
      inMemoryStore.products.unshift(cleanPrev);
    }
  } else if (actionType === "CREATE_COUPON") {
    if (isDbConnected()) {
      await Coupon.deleteOne({ code: targetId });
    }
  } else if (actionType === "ADD_WEBSITE_FEATURE") {
    const restoredFeatures = Array.isArray(previousData) ? previousData : [];
    if (isDbConnected()) {
      await Setting.findOneAndUpdate(
        { id: "STORE_SETTINGS" },
        { $set: { aiCustomFeatures: restoredFeatures } }
      );
    }
  } else if (actionType === "UPDATE_ORDER" && previousData) {
    if (isDbConnected()) {
      await Order.updateOne(
        { $or: [{ orderId: targetId }, { id: targetId }] },
        { $set: { status: previousData.status } }
      );
    }
  }

  const revertedAt = new Date().toISOString();
  if (isDbConnected()) {
    await AdminAIActionLog.updateOne({ actionId }, { $set: { reverted: true, revertedAt } });
  }
  if (memActionLogs.has(actionId)) {
    memActionLogs.set(actionId, { ...log, reverted: true, revertedAt });
  }

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
  const executedActions = [];
  let cleanedResponse = String(aiRawResponse || "");
  let detectedPreviewRoute = "";
  let detectedPreviewTitle = "";

  // 1. Parse any explicit [ADMIN_ACTION: {...}] blocks emitted by the LLM
  const actionRegex = /\[ADMIN_ACTION:\s*(\{[\s\S]*?\})\s*\]/gi;
  let match;
  while ((match = actionRegex.exec(cleanedResponse)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
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

  // 2. Fallback Natural Language Intent Detection if LLM didn't emit tag for obvious commands
  const lowerUser = String(userText || "").toLowerCase();

  // Check if user asked to undo last action
  if (/\b(undo|revert|wapas|hatao|pichla change hatao|rollback)\b/i.test(lowerUser) && executedActions.length === 0) {
    let latestAction = null;
    if (isDbConnected()) {
      latestAction = await AdminAIActionLog.findOne({ reverted: false }).sort({ createdAt: -1 }).lean();
    }
    if (latestAction) {
      const undoRes = await undoAdminAgentAction(latestAction.actionId);
      executedActions.push({
        actionId: latestAction.actionId,
        actionType: "UNDO",
        title: `Reverted: ${latestAction.title}`,
        previewRoute: latestAction.previewRoute || "/"
      });
      detectedPreviewRoute = latestAction.previewRoute || "/";
      detectedPreviewTitle = `Restored State (${latestAction.targetCollection})`;
      cleanedResponse += `\n\n✅ **Change Reverted Successfully:** Maine pichla AI change (*${latestAction.title}*) wapas hata diya hai aur purana data restore kar diya hai.`;
    }
  }

  // Check if user asked to show/open/preview a page in chat
  if (!detectedPreviewRoute) {
    for (const p of WEBSITE_PAGES_DIRECTORY) {
      const keyWords = p.key.replace("_", " ");
      if (
        lowerUser.includes(p.route.toLowerCase()) ||
        (lowerUser.includes(keyWords) && /\b(show|dikhao|open|preview|page|dekho|kholo)\b/i.test(lowerUser))
      ) {
        detectedPreviewRoute = p.route;
        detectedPreviewTitle = p.title;
        break;
      }
    }
    if (!detectedPreviewRoute && /\b(home page|website dikhao|live preview|store dikhao|sabhi page)\b/i.test(lowerUser)) {
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
 * Create a Persistent Background Task in MongoDB that continues running even when website is closed
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
    detail: `Duration: ${dur} mins • Interval: every ${intv} mins • Runs in background even when browser is closed.`
  });

  // Trigger first execution cycle asynchronously right away
  setTimeout(() => {
    executeSingleTaskCycle(taskDoc.taskId).catch(err =>
      console.warn("[AdminAgent] Initial task cycle warning:", err?.message)
    );
  }, 300);

  return taskDoc;
}

/**
 * Execute one cycle of a Background Task and store output in MongoDB
 */
export async function executeSingleTaskCycle(taskId) {
  let task = null;
  if (isDbConnected()) {
    task = await AdminAITask.findOne({ taskId }).lean();
  }
  if (!task) {
    task = memTasks.get(taskId);
  }
  if (!task || task.status !== "running") return null;

  const now = new Date();
  if (task.runsCount > 0 && new Date(task.expiresAt) < now) {
    if (isDbConnected()) {
      await AdminAITask.updateOne({ taskId }, { $set: { status: "completed" } });
    }
    if (memTasks.has(taskId)) {
      memTasks.set(taskId, { ...task, status: "completed" });
    }
    return null;
  }

  await recordPrivateWorkLog({
    category: "task",
    status: "active",
    title: `Running Background Task Cycle #${(task.runsCount || 0) + 1}: ${task.title}`,
    detail: `Prompt: ${task.prompt}`
  });

  const snapshot = await getCompleteWebsiteSnapshot();
  const sysPrompt = `You are Aura AI Autonomous Background Agent (Powered by NVIDIA NIM ${PRIMARY_NIM_MODEL}).
You are executing a background task assigned by the Admin while the Admin may have closed the website.
Live Store Snapshot:
- Total Products: ${snapshot.productsCount} (Low Stock: ${snapshot.lowStockCount})
- Total Orders: ${snapshot.ordersCount} (Revenue: ₹${snapshot.totalRevenue})
- Active Coupons: ${snapshot.couponsCount}
- MongoDB Connected: ${snapshot.mongoConnected}

If the task asks you to create/update a product, coupon, feature, or fix bugs, emit an action block:
[ADMIN_ACTION: {"type": "CREATE_PRODUCT" | "UPDATE_PRODUCT" | "CREATE_COUPON" | "ADD_WEBSITE_FEATURE" | "AUTO_FIX_BUGS", "data": {...}}]
Provide a clear, concise executive summary of what you analyzed and accomplished in this cycle.`;

  let aiText = "";
  let modelUsed = PRIMARY_NIM_MODEL;
  let actionsTaken = [];

  try {
    const llmRes = await invokeAdminLLM(
      sysPrompt,
      [{ sender: "user", text: `Execute Background Task: "${task.title}"\nInstructions: ${task.prompt}` }],
      1500
    );
    modelUsed = llmRes.modelUsed;
    const intentRes = await detectAndExecuteAdminIntents(task.prompt, llmRes.text, {
      taskId,
      source: "background_task"
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

// Background Worker Loop (Runs on server even when all browsers are closed)
let backgroundWorkerStarted = false;
export function startAdminAgentBackgroundLoop() {
  if (backgroundWorkerStarted) return;
  backgroundWorkerStarted = true;

  setInterval(async () => {
    try {
      let runningTasks = [];
      if (isDbConnected()) {
        runningTasks = await AdminAITask.find({ status: "running" }).lean().catch(() => []);
      } else {
        runningTasks = Array.from(memTasks.values()).filter(t => t.status === "running");
      }

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
    } catch (e) {
      // Quiet catch to keep daemon worker resilient
    }
  }, 20000);
}
