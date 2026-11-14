import { Setting, Ticket } from "../models/Setting.js";
import { Counter } from "../models/Counter.js";
import { Product } from "../models/Product.js";
import { Review } from "../models/Review.js";
import { ActiveOffer } from "../models/Promotion.js";
import { Coupon } from "../models/Coupon.js";
import { Banner } from "../models/Banner.js";
import { Order } from "../models/Order.js";
import { Customer } from "../models/Customer.js";
import { isDbConnected } from "../config/db.js";
import { pickFields } from "../utils/sanitize.js";
import { isAdminUser, hasAdminRole } from "../middleware/auth.js";
import {
  recordVisitEvent,
  recordProductViewEvent,
  getDetailedAnalyticsPayload
} from "../services/analyticsService.js";
import { invalidateRagCache } from "../services/ragService.js";

const SETTING_FIELDS = {
  storeName: "string", supportEmail: "string", supportPhone: "string", currency: "string",
  instagramUrl: "webUrl", facebookUrl: "webUrl", youtubeUrl: "webUrl",
  shippingPolicy: "string", returnPolicy: "string", privacyPolicy: "string",
  termsPolicy: "string", contactSupport: "string", storageProvider: "string", zodiacs: "array",
  shopCategories: "array", standardShippingFee: "number", freeShippingThreshold: "number",
  enableProductShipping: "boolean", enableCod: "boolean", enableOnlinePayment: "boolean",
  codFee: "number", metaPixelId: "string", metaPixelEnabled: "boolean",
  metaDomainVerification: "string", metaCapiAccessToken: "string",
  featuredProductId: "string", featuredProductEnabled: "boolean", homeProductLayout: "object",
  pcloudAccessToken: "string", pcloudFolderId: "string",
  imagekitPublicKey: "string", imagekitPrivateKey: "string", imagekitUrlEndpoint: "string"
};
const POLICY_FIELDS = {
  shippingPolicy: "string", returnPolicy: "string", privacyPolicy: "string",
  termsPolicy: "string", contactSupport: "string"
};
// Public customers may set these fields when submitting or updating a ticket.
const CUSTOMER_TICKET_FIELDS = {
  name: "string", email: "string", phone: "string", subject: "string",
  message: "string", orderId: "string", category: "string", priority: "string",
  attachments: "object", replies: "object"
};
// Admin fields and status updates.
const ADMIN_TICKET_FIELDS = {
  status: "string", priority: "string", adminResponse: "string",
  category: "string", attachments: "object", replies: "object"
};
import {
  defaultSettings,
  defaultProducts,
  defaultReviews,
  defaultActiveOffer,
  defaultCoupons,
  defaultBanners
} from "../data/defaultData.js";

import { logAuditEvent } from "../services/auditService.js";

const CACHE_TTL_MS = 60000;
let settingsCache = null;
let settingsCacheTime = 0;

export function clearSettingsCache() {
  settingsCache = null;
  settingsCacheTime = 0;
}

export async function getAuthoritativeStoreSettings() {
  return await fetchStoreSettings();
}

async function fetchStoreSettings() {
  const now = Date.now();
  if (settingsCache && now - settingsCacheTime < CACHE_TTL_MS) {
    return settingsCache;
  }

  let settings = await Setting.findOne({ id: "STORE_SETTINGS" }).lean();
  if (!settings) {
    settings = await Setting.create(defaultSettings);
    if (settings && typeof settings.toObject === 'function') {
      settings = settings.toObject();
    }
  }

  settingsCache = settings;
  settingsCacheTime = now;
  return settingsCache;
}

function sanitizeSettingsForClient(settings, isAdmin = false) {
  if (!settings || typeof settings !== "object") return {};
  const copy = JSON.parse(JSON.stringify(settings));
  
  copy.featuredProductId = (copy.featuredProductId !== undefined && copy.featuredProductId !== null) ? String(copy.featuredProductId) : "";
  copy.featuredProductEnabled = copy.featuredProductEnabled !== undefined ? Boolean(copy.featuredProductEnabled) : true;
  copy.enableCod = copy.enableCod !== undefined ? Boolean(copy.enableCod) : true;
  copy.enableOnlinePayment = copy.enableOnlinePayment !== undefined ? Boolean(copy.enableOnlinePayment) : true;
  copy.codFee = copy.codFee !== undefined && !isNaN(Number(copy.codFee)) ? Math.max(0, Number(copy.codFee)) : 0;
  copy.metaPixelId = "1485640013424198";
  copy.metaPixelEnabled = copy.metaPixelEnabled !== undefined ? Boolean(copy.metaPixelEnabled) : true;
  copy.metaDomainVerification = copy.metaDomainVerification || "";
  copy.metaCapiEnabled = Boolean(process.env.META_CAPI_ACCESS_TOKEN || copy.metaCapiAccessToken);

  if (!isAdmin) {
    delete copy.pcloudAccessToken;
    delete copy.pcloudFolderId;
    delete copy.pcloudRefreshToken;
    delete copy.imagekitPrivateKey;
    delete copy.imagekitPublicKey;
    delete copy.imagekitUrlEndpoint;
    delete copy.metaCapiAccessToken;
  } else {
    if (copy.imagekitPrivateKey) {
      copy.imagekitPrivateKeyMasked = copy.imagekitPrivateKey.length > 8
        ? copy.imagekitPrivateKey.slice(0, 4) + "••••••••" + copy.imagekitPrivateKey.slice(-4)
        : "••••••••";
      delete copy.imagekitPrivateKey;
    }
    if (copy.pcloudAccessToken) {
      copy.hasPcloudToken = true;
      delete copy.pcloudAccessToken;
    }
    if (copy.metaCapiAccessToken) {
      copy.hasMetaCapiToken = true;
      copy.metaCapiAccessTokenMasked = copy.metaCapiAccessToken.length > 8
        ? copy.metaCapiAccessToken.slice(0, 4) + "••••••••" + copy.metaCapiAccessToken.slice(-4)
        : "••••••••";
      delete copy.metaCapiAccessToken;
    }
  }
  return copy;
}

export async function getSettings(req, res, next) {
  try {
    let isAdmin = false;
    if (req.user) {
      const { isInitialAdmin } = isAdminUser(req.user);
      isAdmin = isInitialAdmin || (await hasAdminRole(req.user.authUserId));
    }

    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate, max-age=0");

    if (req.query?._t || isAdmin) {
      clearSettingsCache();
    }

    if (!isDbConnected()) {
      return res.json({ success: true, data: sanitizeSettingsForClient(defaultSettings, isAdmin), isFallback: true });
    }

    const settings = await fetchStoreSettings();
    return res.json({ success: true, data: sanitizeSettingsForClient(settings, isAdmin) });
  } catch (err) {
    next(err);
  }
}

export async function saveSettings(req, res, next) {
  try {
    const data = pickFields(req.body, SETTING_FIELDS);

    // If incoming secret fields are masked placeholders or empty strings, do not overwrite existing secrets
    if (data.imagekitPrivateKey && (data.imagekitPrivateKey.includes("••••") || !data.imagekitPrivateKey.trim())) {
      delete data.imagekitPrivateKey;
    }
    if (data.pcloudAccessToken && (data.pcloudAccessToken.includes("••••") || !data.pcloudAccessToken.trim())) {
      delete data.pcloudAccessToken;
    }
    if (data.metaCapiAccessToken !== undefined && (String(data.metaCapiAccessToken).includes("••••") || !String(data.metaCapiAccessToken).trim())) {
      delete data.metaCapiAccessToken;
    }

    // Validate featuredProductId softly without blocking other setting updates (categories, layout, zodiacs, COD, etc.)
    if (data.featuredProductId && data.featuredProductId.trim()) {
      const prodId = data.featuredProductId.trim();
      if (isDbConnected()) {
        const isMongoId = /^[0-9a-fA-F]{24}$/.test(prodId);
        const prod = await Product.findOne({
          $or: [
            { id: prodId },
            ...(/^\d+$/.test(prodId) ? [{ id: Number(prodId) }] : []),
            { slug: prodId },
            ...(isMongoId ? [{ _id: prodId }] : [])
          ]
        }).lean().catch(() => null);
        if (!prod && req.body && Object.keys(req.body).length === 1 && req.body.featuredProductId) {
          return res.status(400).json({ success: false, message: "Selected featured product does not exist in catalog" });
        }
      }
    }

    Object.assign(defaultSettings, data);
    clearSettingsCache();

    if (!isDbConnected()) {
      await connectDB().catch(() => {});
    }

    if (!isDbConnected()) {
      return res.json({ success: true, data: sanitizeSettingsForClient(defaultSettings, true) });
    }

    const oldSettings = await Setting.findOne({ id: "STORE_SETTINGS" }).lean();
    const updated = await Setting.findOneAndUpdate(
      { id: "STORE_SETTINGS" },
      { $set: data },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );

    clearSettingsCache();
    invalidateRagCache();

    await logAuditEvent({
      actor: req.user?.email || "admin",
      actorRole: "admin",
      action: "SETTINGS_UPDATED",
      entityType: "Setting",
      entityId: "STORE_SETTINGS",
      oldState: oldSettings,
      newState: data,
      req
    });

    return res.json({ success: true, data: sanitizeSettingsForClient(updated, true) });
  } catch (err) {
    next(err);
  }
}

export async function getPolicies(req, res, next) {
  try {
    if (!isDbConnected()) {
      return res.json({
        success: true,
        data: {
          shippingPolicy: defaultSettings.shippingPolicy,
          returnPolicy: defaultSettings.returnPolicy,
          privacyPolicy: defaultSettings.privacyPolicy,
          termsPolicy: defaultSettings.termsPolicy,
          contactSupport: defaultSettings.contactSupport
        },
        isFallback: true
      });
    }

    const settings = await fetchStoreSettings();
    return res.json({
      success: true,
      data: {
        shippingPolicy: settings.shippingPolicy || defaultSettings.shippingPolicy,
        returnPolicy: settings.returnPolicy || defaultSettings.returnPolicy,
        privacyPolicy: settings.privacyPolicy || defaultSettings.privacyPolicy,
        termsPolicy: settings.termsPolicy || defaultSettings.termsPolicy,
        contactSupport: settings.contactSupport || defaultSettings.contactSupport
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function savePolicies(req, res, next) {
  try {
    const data = pickFields(req.body, POLICY_FIELDS);

    if (!isDbConnected()) {
      await connectDB().catch(() => {});
    }

    if (!isDbConnected()) {
      Object.assign(defaultSettings, data);
      clearSettingsCache();
      return res.json({ success: true, data });
    }

    const updated = await Setting.findOneAndUpdate(
      { id: "STORE_SETTINGS" },
      { $set: data },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );

    clearSettingsCache();
    return res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

// Tickets
export async function getTickets(req, res, next) {
  try {
    const authenticatedUser = req.user || null;
    let isAdmin = false;

    if (authenticatedUser) {
      const { isInitialAdmin } = isAdminUser(authenticatedUser);
      isAdmin = isInitialAdmin || (await hasAdminRole(authenticatedUser.authUserId));
    }

    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        error: "Database unavailable",
        message: "Support tickets require an authoritative MongoDB connection.",
        databaseUnavailable: true
      });
    }

    let query = {};
    if (!isAdmin) {
      const guestEmail = String(req.query.email || req.headers["x-guest-email"] || "").toLowerCase().trim();
      const rawIds = String(req.query.ids || req.headers["x-ticket-ids"] || "").trim();
      const ticketIds = rawIds ? rawIds.split(",").map(s => s.trim()).filter(Boolean) : [];
      const conditions = [];

      if (authenticatedUser?.authUserId) {
        conditions.push({ authUserId: authenticatedUser.authUserId }, { userId: authenticatedUser.authUserId });
      }
      if (authenticatedUser?.email || guestEmail) {
        const e = (authenticatedUser?.email || guestEmail).toLowerCase().trim();
        conditions.push({ userEmail: e }, { email: e });
      }
      if (ticketIds.length > 0) {
        conditions.push({ id: { $in: ticketIds } });
      }

      if (conditions.length === 0) {
        return res.json({ success: true, data: [] });
      }
      query = { $or: conditions };
    }

    const tickets = await Ticket.find(query).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, data: tickets || [] });
  } catch (err) {
    next(err);
  }
}

export async function createTicket(req, res, next) {
  try {
    const data = pickFields(req.body, CUSTOMER_TICKET_FIELDS);
    if (!data.name || !data.message) {
      return res.status(400).json({ success: false, message: "Name and message are required" });
    }

    const authenticatedUser = req.user || null;
    const authUserId = authenticatedUser ? (authenticatedUser.authUserId || authenticatedUser.uid || "") : "";
    const userEmail = authenticatedUser?.email ? authenticatedUser.email.toLowerCase().trim() : (data.email || "").toLowerCase().trim();

    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        error: "Database unavailable",
        message: "Support tickets require an authoritative MongoDB connection.",
        databaseUnavailable: true
      });
    }

    const counter = await Counter.findOneAndUpdate(
      { _id: "ticketNumber" },
      { $inc: { seq: 1 } },
      { upsert: true, returnDocument: "after" }
    );
    const seqNum = counter?.seq ? 1000 + counter.seq : Math.floor(1000 + Math.random() * 9000);
    const id = `TIC-${seqNum}`;

    const payload = {
      ...data,
      id,
      authUserId: authUserId || "guest",
      userId: authUserId || "guest",
      userEmail,
      email: userEmail || data.email,
      category: data.category || "General Support",
      status: data.status || "Pending Admin Review",
      priority: data.priority || "Normal",
      adminResponse: data.adminResponse || "",
      attachments: Array.isArray(data.attachments) ? data.attachments : [],
      replies: Array.isArray(data.replies) ? data.replies : [],
      date: new Date().toISOString()
    };

    const saved = await Ticket.create(payload);
    return res.status(201).json({ success: true, data: saved });
  } catch (err) {
    next(err);
  }
}

export async function updateTicket(req, res, next) {
  try {
    const { id } = req.params;
    const authenticatedUser = req.user || null;
    let isAdmin = false;

    if (authenticatedUser) {
      const { isInitialAdmin } = isAdminUser(authenticatedUser);
      isAdmin = isInitialAdmin || (await hasAdminRole(authenticatedUser.authUserId));
    }

    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        error: "Database unavailable",
        message: "Support tickets require an authoritative MongoDB connection.",
        databaseUnavailable: true
      });
    }

    const ticket = await Ticket.findOne({ id: String(id) });
    if (!ticket) {
      return res.status(404).json({ success: false, message: "Ticket not found" });
    }

    if (!isAdmin) {
      const userEmail = (authenticatedUser?.email || req.body?.email || "").toLowerCase().trim();
      const userId = authenticatedUser?.authUserId;
      const isOwner = (userId && (ticket.authUserId === userId || ticket.userId === userId)) ||
                      (userEmail && (ticket.userEmail?.toLowerCase() === userEmail || ticket.email?.toLowerCase() === userEmail)) ||
                      (req.body?.guestToken && ticket.guestToken === req.body.guestToken);
      if (!isOwner) return res.status(403).json({ success: false, message: "Access denied" });
    }

    const fieldMask = isAdmin ? ADMIN_TICKET_FIELDS : CUSTOMER_TICKET_FIELDS;
    const data = pickFields(req.body, fieldMask);

    // Support explicit status & priority updates
    if (req.body?.status) data.status = String(req.body.status).trim();
    if (req.body?.priority) data.priority = String(req.body.priority).trim();
    if (req.body?.adminResponse !== undefined) data.adminResponse = String(req.body.adminResponse).trim();
    if (req.body?.adminNotes !== undefined) data.adminNotes = String(req.body.adminNotes).trim();

    // Handle replies & attachments synchronization
    const replyText = String(req.body?.replyText || req.body?.replyMessage || "").trim();
    const replyAttachments = Array.isArray(req.body?.replyAttachments || req.body?.attachments)
      ? (req.body.replyAttachments || req.body.attachments)
      : [];

    const existingReplies = Array.isArray(ticket.replies) ? [...ticket.replies] : [];

    if (replyText || replyAttachments.length > 0) {
      const newReply = {
        id: `REP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        sender: isAdmin ? "admin" : "customer",
        senderName: isAdmin ? "Aura Support Team" : (ticket.name || authenticatedUser?.name || "Customer"),
        message: replyText,
        text: replyText,
        attachments: replyAttachments,
        createdAt: new Date().toISOString()
      };
      existingReplies.push(newReply);
      data.replies = existingReplies;

      if (isAdmin && replyText) {
        data.adminResponse = replyText;
        if (!data.status || data.status === "Open") {
          data.status = "In Progress";
        }
      } else if (!isAdmin && replyText && data.status === "Resolved") {
        data.status = "In Progress";
      }
    } else if (Array.isArray(req.body?.replies)) {
      data.replies = req.body.replies;
    }

    data.updatedAt = new Date().toISOString();

    const updated = await Ticket.findOneAndUpdate(
      { id: String(id) },
      { $set: data },
      { returnDocument: "after" }
    );
    return res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

export async function deleteTicket(req, res, next) {
  try {
    const { id } = req.params;
    const authenticatedUser = req.user || null;
    let isAdmin = false;

    if (authenticatedUser) {
      const { isInitialAdmin } = isAdminUser(authenticatedUser);
      isAdmin = isInitialAdmin || (await hasAdminRole(authenticatedUser.authUserId));
    }

    if (!isDbConnected()) {
      return res.status(503).json({ success: false, message: "Database unavailable" });
    }

    const ticket = await Ticket.findOne({ id: String(id) });
    if (!ticket) {
      return res.status(404).json({ success: false, message: "Ticket not found" });
    }

    if (!isAdmin) {
      const userEmail = (authenticatedUser?.email || "").toLowerCase().trim();
      const userId = authenticatedUser?.authUserId;
      const isOwner = (userId && (ticket.authUserId === userId || ticket.userId === userId)) ||
                      (userEmail && (ticket.userEmail?.toLowerCase() === userEmail || ticket.email?.toLowerCase() === userEmail));
      if (!isOwner) return res.status(403).json({ success: false, message: "Access denied" });
    }

    await Ticket.deleteOne({ id: String(id) });
    return res.json({ success: true, message: "Ticket deleted successfully", id });
  } catch (err) {
    next(err);
  }
}

// Analytics
export async function getAnalytics(req, res, next) {
  try {
    const range = req.query?.range || "today";
    let orders = [];
    if (isDbConnected()) {
      try {
        orders = await Order.find({}, {
          status: 1,
          finalAmount: 1,
          amount: 1,
          total: 1,
          orderSource: 1,
          source: 1,
          date: 1,
          createdAt: 1
        }).lean();
      } catch (_) {
        orders = [];
      }
    }

    const payload = await getDetailedAnalyticsPayload({
      range,
      orders,
      useDb: isDbConnected()
    });
    return res.json({ success: true, data: payload, hasData: payload.hasData });
  } catch (err) {
    next(err);
  }
}

export async function logVisit(req, res, next) {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const result = await recordVisitEvent({
      req,
      deviceId: body.deviceId || req.headers["x-device-id"] || "",
      path: body.path || "/",
      title: body.title || "",
      useDb: isDbConnected()
    });
    return res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function logProductView(req, res, next) {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const result = await recordProductViewEvent({
      req,
      deviceId: body.deviceId || req.headers["x-device-id"] || "",
      path: body.path || "",
      productId: body.productId || "",
      productName: body.productName || "",
      useDb: isDbConnected()
    });
    return res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// Seed Controller - explicit admin-only data load.
// INSERT-ONLY semantics ($setOnInsert): never overwrites existing production records.
export async function seedDatabase(req, res, next) {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        message: "Database unavailable. Cannot seed database without a connected MongoDB database."
      });
    }

    let seeded = { products: 0, reviews: 0, coupons: 0, banners: 0, orders: 0, customers: 0 };

    // Insert-only seeding: check existence before creating so existing records are NEVER modified.
    const seedInsertOnly = async (Model, items) => {
      const before = await Model.countDocuments();
      for (const item of items) {
        if (!item || !item.id) continue;
        const exists = await Model.exists({ id: String(item.id) });
        if (!exists) {
          const { _id, createdAt, updatedAt, ...cleanItem } = item;
          try {
            await Model.create(cleanItem);
          } catch (err) {
            console.warn(`Seed create notice for ${item.id}:`, err?.message);
          }
        }
      }
      const after = await Model.countDocuments();
      return Math.max(0, after - before);
    };

    if (process.env.NODE_ENV !== "production" && req.query?.includeProducts === "true") {
      seeded.products = await seedInsertOnly(Product, defaultProducts);
    } else {
      seeded.products = 0;
    }
    seeded.orders = 0;
    seeded.customers = 0;
    seeded.coupons = await seedInsertOnly(Coupon, defaultCoupons);
    seeded.banners = await seedInsertOnly(Banner, defaultBanners);

    // Sample reviews seeding — gated behind non-production + explicit ?includeDemo=true
    if (process.env.NODE_ENV !== "production" && req.query?.includeDemo === "true") {
      const reviewsBefore = await Review.countDocuments();
      for (const r of defaultReviews) {
        if (!r || !r.id) continue;
        const exists = await Review.exists({ id: String(r.id) });
        if (!exists) {
          const { _id, createdAt, updatedAt, ...cleanReview } = r;
          try {
            await Review.create({
              ...cleanReview,
              source: "customer",
              status: "Approved",
              isSample: true,
              isAiGenerated: true,
              sampleLabel: "Sample Review"
            });
          } catch (err) {
            console.warn(`Seed review notice for ${r.id}:`, err?.message);
          }
        }
      }
      const reviewsAfter = await Review.countDocuments();
      seeded.reviews = Math.max(0, reviewsAfter - reviewsBefore);
    } else {
      seeded.reviews = 0;
    }

    // Active Offer
    await ActiveOffer.findOneAndUpdate(
      { id: "OFFER-CENTRAL-1" },
      { $setOnInsert: defaultActiveOffer },
      { upsert: true }
    );

    // Settings
    await Setting.findOneAndUpdate(
      { id: "STORE_SETTINGS" },
      { $setOnInsert: defaultSettings },
      { upsert: true }
    );
    clearSettingsCache();

    // Banners
    const existingBanners = await Banner.countDocuments();
    if (existingBanners === 0) {
      const seedBanners = defaultBanners.map((img, i) => ({
        id: `BANNER-${i + 1}`,
        image: img,
        position: "hero",
        isActive: true,
        sortOrder: i
      }));
      await Banner.insertMany(seedBanners);
      seeded.banners = seedBanners.length;
    }

    return res.json({
      success: true,
      message: "Database successfully seeded into MongoDB",
      details: seeded
    });
  } catch (err) {
    next(err);
  }
}

