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
import { invalidateRagCache } from "./ragService.js";
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
    name: "undo_action",
    description: "Undo/rollback a specific AI actionId or the most recent un-reverted AI change.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        actionId: { type: Type.STRING, description: "Optional actionId (defaults to latest action if omitted)" }
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

    case "undo_action": {
      let targetId = args.actionId;
      if (!targetId && isDbConnected()) {
        const latest = await AdminAIActionLog.findOne({ reverted: false }).sort({ createdAt: -1 }).lean();
        targetId = latest?.actionId;
      }
      if (!targetId) return { error: "No recent un-reverted AI action found to undo." };
      return await undoAdminAgentAction(targetId);
    }

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

  // 1. Check Admin's preferred engine/model configuration
  let userSelectedModel = "";
  if (isDbConnected()) {
    try {
      const setting = await AuraAISetting.findOne().select("selectedNimModel nemotronModel nvidiaModel").lean();
      userSelectedModel = (setting?.selectedNimModel || setting?.nemotronModel || setting?.nvidiaModel || "").trim();
    } catch (_) {}
  }

  // 2. Primary Path when Gemini is available: Native Multi-Tool Function Calling (gemini-4-hydrogen)
  const executedViaTools = [];
  let previewRouteFromTools = "";
  let previewTitleFromTools = "";

  if (gemini) {
    let contents = convertNimMessagesToGemini(nimMessages);
    const tools = [{ functionDeclarations: ADMIN_AGENT_FUNCTION_DECLARATIONS }];
    const modelsToTry = [...new Set(["gemini-4-hydrogen", ...GEMINI_TEXT_MODELS])].filter(Boolean);

    for (const gModel of modelsToTry) {
      try {
        let currentContents = [...contents];
        let finalText = "";

        // Multi-round tool calling loop (max 5 turns)
        for (let round = 0; round < 5; round++) {
          const response = await withTimeout(
            gemini.models.generateContent({
              model: gModel,
              contents: currentContents,
              config: {
                systemInstruction: systemPrompt + "\n\nIMPORTANT: You have native function calling tools attached! ALWAYS call the appropriate tool(s) to inspect data or mutate MongoDB instead of guessing or emitting raw JSON. Summarize the exact results after the tool executes.",
                temperature: 0.4,
                tools
              }
            }),
            15000
          );

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
            break;
          }
        }

        if (finalText) {
          return {
            text: finalText,
            modelUsed: `${gModel} (Autonomous Tool Agent)`,
            provider: "Gemini Tool Agent",
            executedViaTools,
            previewRoute: previewRouteFromTools,
            previewTitle: previewTitleFromTools
          };
        }
      } catch (gErr) {
        console.warn(`[AdminAgent] Gemini (${gModel}) notice:`, gErr?.message || gErr);
      }
    }
  }

  // 3. NVIDIA NIM Path (Primary when Gemini key isn't set or failed)
  const candidateModels = [userSelectedModel, ...NIM_FALLBACK_MODELS].filter(Boolean);
  const uniqueCandidateModels = [...new Set(candidateModels)];

  if (nvidia) {
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
  }

  // 4. Fallback Tier: Upgraded Autonomous Synthesis Engine (100% Infallible offline/no-key mode)
  console.log("[AdminAgent] Executing Autonomous Synthesis Engine...");
  const synth = await synthesizeAutonomousAdminResponse(systemPrompt, rawMessages);
  return { ...synth, executedViaTools };
}

/**
 * Autonomous Vedic & Store Administration Synthesizer
 * Handles natural Hindi / Hinglish / English commands directly even without external LLM API keys.
 */
export async function synthesizeAutonomousAdminResponse(systemPrompt, rawMessages = []) {
  const lastUserMsg = [...rawMessages].reverse().find(m => m && (m.role === "user" || m.sender === "user")) || {};
  const prompt = String(lastUserMsg.content || lastUserMsg.text || "").trim();
  const lower = prompt.toLowerCase();
  const snapshot = await getCompleteWebsiteSnapshot().catch(() => ({
    productsCount: 0,
    lowStockCount: 0,
    ordersCount: 0,
    couponsCount: 0,
    totalRevenue: 0,
    mongoConnected: false
  }));

  let text = "";
  let actionTag = "";
  let navTag = "";

  // 1. Bulk discount / bulk price / bulk stock intent
  const isBulkAction = /(sabhi|all|sab|entire|poora|store)\s*(product|products|catalog|item|items|rudraksha)/i.test(lower) &&
    /(discount|off|kam|reduce|ghatao|stock|restock)/i.test(lower);
  if (isBulkAction) {
    const pctMatch = lower.match(/(\d{1,2})\s*%/);
    const stockMatch = lower.match(/stock\s*(?:ko|to|=|:)?\s*(\d{1,4})/i);
    if (pctMatch) {
      const pct = parseInt(pctMatch[1], 10);
      actionTag = `[ADMIN_ACTION: {"type": "BULK_UPDATE_PRODUCTS", "data": {"discountPercent": ${pct}}}]`;
      navTag = `[NAVIGATE_PREVIEW: "/shop"]`;
      text = `Done! Maine sabhi catalog products par **${pct}% bulk discount** apply kar diya hai.\n\n${actionTag}\n${navTag}\n\nHar product ki purani price MongoDB Action Ledger mein backup ho chuki hai — aap 1-click **Undo** se kabhi bhi original prices restore kar sakte hain.`;
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

  // 2. Payment / COD / Shipping Settings toggle
  const isCodToggle = /\bcod\b|cash on delivery/i.test(lower) && /(on|off|enable|disable|band|chalu|karo)/i.test(lower);
  const isOnlinePayToggle = /online pay|payu|upi payment/i.test(lower) && /(on|off|enable|disable|band|chalu|karo)/i.test(lower);
  if (isCodToggle || isOnlinePayToggle) {
    const turnOff = /\b(off|disable|band|hato|hatao)\b/i.test(lower);
    const payload = {};
    if (isCodToggle) payload.enableCod = !turnOff;
    if (isOnlinePayToggle) payload.enableOnlinePayment = !turnOff;
    actionTag = `[ADMIN_ACTION: {"type": "UPDATE_STORE_SETTINGS", "data": ${JSON.stringify(payload)}}]`;
    navTag = `[NAVIGATE_PREVIEW: "/admin/settings"]`;
    text = `Store payment settings update ho gayi hain:\n${isCodToggle ? `• **Cash on Delivery (COD):** ${!turnOff ? "Enabled (ON)" : "Disabled (OFF)"}\n` : ""}${isOnlinePayToggle ? `• **Online Payment (PayU):** ${!turnOff ? "Enabled (ON)" : "Disabled (OFF)"}\n` : ""}\n${actionTag}\n${navTag}`;
    return { text, modelUsed: "Aura Autonomous Agent", provider: "Aura Autonomous Agent" };
  }

  // 3. Coupon creation intent
  const isCouponCreate = /coupon|promo\s*code|discount code/i.test(lower) && /(create|add|bnao|bana|chalu|new)/i.test(lower);
  if (isCouponCreate) {
    const codeMatch = prompt.match(/\b([A-Z0-9]{4,14})\b/);
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

  // 4. Update single product (price/stock/status)
  const isUpdateProduct = /(\d{1,2}\s*mukhi|mala|product)/i.test(lower) && /(price|stock|update|change|kar do|badlo|set)/i.test(lower) && !/(create|add|upload|bnao|nya|new)/i.test(lower);
  if (isUpdateProduct) {
    const mukhiMatch = lower.match(/(\d{1,2}\s*mukhi)/i);
    const nameHint = mukhiMatch ? mukhiMatch[1] : "5 Mukhi";
    const priceMatch = lower.match(/(?:price|rate|₹|rs)\s*(?:ko|to|=|:)?\s*(\d{2,7})/i);
    const stockMatch = lower.match(/stock\s*(?:ko|to|=|:)?\s*(\d{1,5})/i);
    const updateData = { name: nameHint };
    if (priceMatch) updateData.price = parseInt(priceMatch[1], 10);
    if (stockMatch) updateData.stock = parseInt(stockMatch[1], 10);

    if (updateData.price !== undefined || updateData.stock !== undefined) {
      actionTag = `[ADMIN_ACTION: {"type": "UPDATE_PRODUCT", "data": ${JSON.stringify(updateData)}}]`;
      text = `Product **"${nameHint}"** update command dispatch kar diya hai:\n${updateData.price !== undefined ? `• New Price: ₹${updateData.price.toLocaleString("en-IN")}\n` : ""}${updateData.stock !== undefined ? `• New Stock: ${updateData.stock}\n` : ""}\n${actionTag}`;
      return { text, modelUsed: "Aura Autonomous Agent", provider: "Aura Autonomous Agent" };
    }
  }

  // 5. Product creation intent
  const isCreateProduct = /product|bead|rudraksha/i.test(lower) && /(create|add|upload|bnao|bana|daalo|nya|new)/i.test(lower);
  if (isCreateProduct) {
    const mukhiMatch = lower.match(/(\d{1,2})\s*mukhi/i);
    const mukhiNum = mukhiMatch ? mukhiMatch[1] : "11";
    const deityMap = {
      "1": "Lord Shiva", "5": "Kalagni Rudra", "7": "Goddess Mahalakshmi",
      "11": "Lord Hanuman (Ekadasha Rudra)", "14": "Deva Mani"
    };
    const deity = deityMap[mukhiNum] || "Lord Shiva";
    const priceMatch = lower.match(/(?:price|rs|inr|₹|ke)\s*[:=]?\s*(\d{3,6})/i);
    const price = priceMatch ? parseInt(priceMatch[1], 10) : (parseInt(mukhiNum, 10) * 850 + 2499);
    const comparePrice = Math.round(price * 1.4);
    const prodName = `Original ${mukhiNum} Mukhi Nepali Rudraksha (Lab Certified)`;

    actionTag = `[ADMIN_ACTION: {"type": "CREATE_PRODUCT", "data": {"name": "${prodName}", "mukhi": "${mukhiNum}", "price": ${price}, "comparePrice": ${comparePrice}, "stock": 25, "category": "Rudraksha Beads", "origin": "Nepal (Himalayan)", "deity": "${deity}"}}]`;
    navTag = `[NAVIGATE_PREVIEW: "/shop"]`;

    text = `Naya Rudraksha product **${prodName}** (₹${price.toLocaleString("en-IN")}, Stock: 25) catalog mein live publish ho gaya hai!\n\n${actionTag}\n${navTag}`;
    return { text, modelUsed: "Aura Autonomous Agent", provider: "Aura Autonomous Agent" };
  }

  // 6. Add Feature / Banner intent
  const isFeature = /feature|banner|announcement|offer banner|sale banner/i.test(lower) && /(add|create|lagao|dikhao|bnao|publish)/i.test(lower);
  if (isFeature) {
    const featTitle = "Sacred Rudraksha Mahotsav — Flat 15% OFF With Code SHIVOHAM10";
    const featSubtitle = "100% Lab-Certified Nepali Beads • Energized in Kashi • Express Delivery";
    actionTag = `[ADMIN_ACTION: {"type": "ADD_WEBSITE_FEATURE", "data": {"featureType": "flash_sale_banner", "title": "${featTitle}", "subtitle": "${featSubtitle}", "ctaText": "Shop Collection", "ctaLink": "/shop"}}]`;
    navTag = `[NAVIGATE_PREVIEW: "/"]`;
    text = `Live storefront feature banner publish ho gaya hai!\n\n${actionTag}\n${navTag}`;
    return { text, modelUsed: "Aura Autonomous Agent", provider: "Aura Autonomous Agent" };
  }

  // 7. Growth / VIP / Insights / Orders audit
  if (/growth|audit|insight|revenue|vip|sales|unpaid|stuck|suggestion|socha/i.test(lower)) {
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

  // 8. Bug scan / diagnostics + optional autofix
  const isBugScan = /bug|scan|diagnostic|issue|error|health|fix/i.test(lower);
  if (isBugScan) {
    const shouldFix = /\b(fix|repair|theek|shi|auto)\b/i.test(lower);
    if (shouldFix) {
      actionTag = `[ADMIN_ACTION: {"type": "AUTO_FIX_BUGS", "data": {}}]`;
      text = `Website aur database ka automatic bug scan aur safe auto-repair run kar diya hai.\n\n${actionTag}`;
    } else {
      const diag = await runWebsiteBugDiagnostic();
      const summaryLines = diag.bugs.slice(0, 8).map(b => `• [${b.severity.toUpperCase()}] **${b.title}** — ${b.detail}`).join("\n");
      text = `**Store Diagnostic Complete** (${diag.bugsCount} issues found across ${diag.metrics.productsScanned} products, ${diag.metrics.ordersScanned} orders):\n\n${summaryLines || "✅ Zero bugs detected! All endpoints and catalog records are healthy."}`;
    }
    return { text, modelUsed: "Aura Autonomous Agent", provider: "Aura Autonomous Agent" };
  }

  // 9. Page Preview intent
  const isPagePreview = /preview|dikhao|open|kholo|view/i.test(lower);
  if (isPagePreview) {
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

  // 10. Default executive summary
  text = `**Aura AI Autonomous Admin Agent** online hai.\n\n• **Products:** ${snapshot.productsCount} (${snapshot.lowStockCount} low stock)\n• **Orders:** ${snapshot.ordersCount} (₹${Number(snapshot.totalRevenue || 0).toLocaleString("en-IN")})\n• **Coupons:** ${snapshot.couponsCount} · **MongoDB:** ${snapshot.mongoConnected ? "Connected" : "Cache Fallback"}\n\nAap mujhe sidha command de sakte hain:\n- *"5 Mukhi ka price ₹999 aur stock 40 kar do"*\n- *"Sabhi products par 10% discount lagao"*\n- *"SHIV15 coupon bnao 15% off min order 999"*\n- *"COD off kar do"* / *"Online payment on karo"*\n- *"Order #... ko Shipped mark karo aur tracking number add karo"*\n- *"Full store growth aur VIP buyers audit chalao"*\n- *"Bugs scan karke auto-fix karo"*`;
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
 * Helper to resolve a product by id, _id, slug, or partial name/mukhi
 */
async function findTargetProduct(data = {}) {
  const idOrSlug = String(data.id || data.slug || data.idOrName || "").trim();
  const nameHint = String(data.name || data.idOrName || "").trim();
  let existing = null;

  if (isDbConnected()) {
    if (idOrSlug) {
      existing = await Product.findOne({ $or: [{ id: idOrSlug }, { slug: idOrSlug }] }).lean().catch(() => null);
    }
    if (!existing && nameHint) {
      existing = await Product.findOne({ name: new RegExp(escapeRegex(nameHint), "i") }).lean().catch(() => null);
    }
  }
  if (!existing && Array.isArray(inMemoryStore.products)) {
    const low = (idOrSlug || nameHint).toLowerCase();
    existing = inMemoryStore.products.find(p =>
      String(p.id || "").toLowerCase() === low ||
      String(p.slug || "").toLowerCase() === low ||
      (nameHint && String(p.name || "").toLowerCase().includes(nameHint.toLowerCase()))
    ) || null;
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
      const defaultImg = data.image || data.img || "/images/placeholder.svg";

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
        discount: comparePrice > price ? Math.round(((comparePrice - price) / comparePrice) * 100) : 0,
        stock,
        ...(data.indonesiaPrice !== undefined ? { indonesiaPrice: Number(data.indonesiaPrice) } : {}),
        ...(data.indonesiaStock !== undefined ? { indonesiaStock: Number(data.indonesiaStock) } : {}),
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
        status: data.status || "Published",
        showOnHome: data.showOnHome !== false,
        isPopular: true,
        badge: data.badge || "New Arrival",
        homeBadge: data.badge || "New Arrival",
        rating: 4.9,
        reviews: 18,
        certification: "ISO 9001:2015 Lab Certified"
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
      if (Array.isArray(inMemoryStore.products)) {
        inMemoryStore.products.unshift(savedProd);
      }
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
      let existing = await findTargetProduct(data);
      if (!existing) {
        return { error: `Product not found to delete.` };
      }
      if (isDbConnected()) {
        await Product.deleteOne({ id: existing.id });
      }
      if (Array.isArray(inMemoryStore.products)) {
        const idx = inMemoryStore.products.findIndex(p => p.id === existing.id);
        if (idx !== -1) inMemoryStore.products.splice(idx, 1);
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
      const diag = await runWebsiteBugDiagnostic();
      const fixedList = [];

      if (!diag.metrics.mongoConnected) {
        await connectDB().catch(() => {});
      }

      for (const b of diag.bugs) {
        if (b.fixType === "RESTOCK_PRODUCT" && b.targetId && isDbConnected()) {
          const prev = await Product.findOne({ id: b.targetId }).lean();
          if (prev) {
            await Product.updateOne({ id: b.targetId }, { $set: { stock: 25 } });
            await recordAdminActionLog({
              actionType: "UPDATE_PRODUCT",
              title: `Auto-Fixed Low Stock: ${prev.name} (Restocked to 25)`,
              description: `Bug Auto-Fix raised stock from ${prev.stock} to 25.`,
              targetCollection: "Product",
              targetId: prev.id,
              previousData: prev,
              newData: { ...prev, stock: 25 },
              previewRoute: `/product/${prev.slug || prev.id}`,
              source, sessionId, taskId
            });
            fixedList.push(`Restocked "${prev.name}" to 25 units`);
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
    if (Array.isArray(inMemoryStore.products)) inMemoryStore.products.unshift(cleanPrev);
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
export async function executeSingleTaskCycle(taskId) {
  let task = null;
  if (isDbConnected()) {
    task = await AdminAITask.findOne({ taskId }).lean();
  }
  if (!task) task = memTasks.get(taskId);
  if (!task || task.status !== "running") return null;

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
  let modelUsed = PRIMARY_NIM_MODEL;
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
}
