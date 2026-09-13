import { Setting, Ticket, Analytics } from "../models/Setting.js";
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

const SETTING_FIELDS = {
  storeName: "string", supportEmail: "string", supportPhone: "string", currency: "string",
  instagramUrl: "webUrl", facebookUrl: "webUrl", youtubeUrl: "webUrl",
  shippingPolicy: "string", returnPolicy: "string", privacyPolicy: "string",
  termsPolicy: "string", contactSupport: "string", storageProvider: "string", zodiacs: "array",
  shopCategories: "array", standardShippingFee: "number", freeShippingThreshold: "number",
  enableProductShipping: "boolean", featuredProductId: "string", featuredProductEnabled: "boolean", homeProductLayout: "object",
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

async function fetchStoreSettings() {
  const now = Date.now();
  if (settingsCache && now - settingsCacheTime < CACHE_TTL_MS) {
    return settingsCache;
  }

  let settings = await Setting.findOne({ id: "STORE_SETTINGS" }).lean();
  if (!settings) {
    settings = await Setting.create(defaultSettings);
    // If it was just created, it might be a mongoose document instead of plain object,
    // so we can lean it if we fetched again, or we can just use toObject if it's a doc.
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
  
  copy.featuredProductId = (copy.featuredProductId !== undefined && copy.featuredProductId !== null && copy.featuredProductId !== "") ? copy.featuredProductId : "14";
  copy.featuredProductEnabled = copy.featuredProductEnabled !== undefined ? Boolean(copy.featuredProductEnabled) : true;

  if (!isAdmin) {
    delete copy.pcloudAccessToken;
    delete copy.pcloudFolderId;
    delete copy.pcloudRefreshToken;
    delete copy.imagekitPrivateKey;
    delete copy.imagekitPublicKey;
    delete copy.imagekitUrlEndpoint;
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

    if (isAdmin) {
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate, max-age=0");
    } else {
      res.setHeader("Cache-Control", "public, max-age=120, stale-while-revalidate=600");
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

    // Validate featuredProductId if provided
    if (data.featuredProductId && data.featuredProductId.trim()) {
      const prodId = data.featuredProductId.trim();
      let exists = false;
      if (isDbConnected()) {
        const prod = await Product.findOne({
          $or: [
            { id: prodId },
            { slug: prodId }
          ]
        }).lean();
        if (prod) exists = true;
      }
      if (!exists) {
        return res.status(400).json({ success: false, message: "Selected featured product does not exist in catalog" });
      }
    }

    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        error: "Database unavailable",
        message: "Database is unavailable. Cannot save settings without MongoDB connection.",
        databaseUnavailable: true
      });
    }

    const oldSettings = await Setting.findOne({ id: "STORE_SETTINGS" }).lean();
    const updated = await Setting.findOneAndUpdate(
      { id: "STORE_SETTINGS" },
      { $set: data },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );

    clearSettingsCache();

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
      return res.status(503).json({
        success: false,
        error: "Database unavailable",
        message: "Database is unavailable. Cannot save policies without MongoDB connection.",
        databaseUnavailable: true
      });
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
    if (!isDbConnected()) {
      return res.json({
        success: true,
        data: {
          id: "GLOBAL_ANALYTICS",
          visits: 0,
          productViews: 0,
          hasData: false,
          lastUpdated: new Date().toISOString()
        }
      });
    }

    let doc = await Analytics.findOne({ id: "GLOBAL_ANALYTICS" }).lean();
    if (!doc) {
      doc = await Analytics.create({
        id: "GLOBAL_ANALYTICS",
        visits: 0,
        productViews: 0,
        lastUpdated: new Date().toISOString()
      });
    }
    return res.json({ success: true, data: { ...doc, hasData: (doc.visits || 0) > 0 || (doc.productViews || 0) > 0 } });
  } catch (err) {
    next(err);
  }
}

export async function logVisit(req, res, next) {
  try {
    const now = new Date().toISOString();
    if (isDbConnected()) {
      const updated = await Analytics.findOneAndUpdate(
        { id: "GLOBAL_ANALYTICS" },
        { $inc: { visits: 1 }, $set: { lastUpdated: now } },
        { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
      );
      return res.json({ success: true, data: updated });
    }
    return res.json({ success: true, data: { id: "GLOBAL_ANALYTICS", visits: 1, lastUpdated: now } });
  } catch (err) {
    next(err);
  }
}

export async function logProductView(req, res, next) {
  try {
    const now = new Date().toISOString();
    if (isDbConnected()) {
      const updated = await Analytics.findOneAndUpdate(
        { id: "GLOBAL_ANALYTICS" },
        { $inc: { productViews: 1 }, $set: { lastUpdated: now } },
        { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
      );
      return res.json({ success: true, data: updated });
    }
    return res.json({ success: true, data: { id: "GLOBAL_ANALYTICS", productViews: 1, lastUpdated: now } });
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
      if (!items || !items.length) return 0;
      const before = await Model.countDocuments();
      const operations = items
        .filter(item => item && item.id)
        .map(item => {
          const { _id, createdAt, updatedAt, ...cleanItem } = item;
          return {
            updateOne: {
              filter: { id: String(item.id) },
              update: { $setOnInsert: cleanItem },
              upsert: true
            }
          };
        });

      if (operations.length > 0) {
        try {
          await Model.bulkWrite(operations, { ordered: false });
        } catch (err) {
          console.warn(`Seed bulk write notice:`, err?.message);
        }
      }
      const after = await Model.countDocuments();
      return Math.max(0, after - before);
    };

    seeded.products = await seedInsertOnly(Product, defaultProducts);
    seeded.orders = 0;
    seeded.customers = 0;
    seeded.coupons = await seedInsertOnly(Coupon, defaultCoupons);
    seeded.banners = await seedInsertOnly(Banner, defaultBanners);

    // Reviews seeding
    const reviewsBefore = await Review.countDocuments();
    const reviewOperations = defaultReviews
      .filter(r => r && r.id)
      .map(r => {
        const { _id, createdAt, updatedAt, ...cleanReview } = r;
        return {
          updateOne: {
            filter: { id: String(r.id) },
            update: {
              $setOnInsert: {
                ...cleanReview,
                source: "customer",
                status: "Approved",
                isSample: true,
                isAiGenerated: true,
                sampleLabel: "Sample Review"
              }
            },
            upsert: true
          }
        };
      });

    if (reviewOperations.length > 0) {
      try {
        await Review.bulkWrite(reviewOperations, { ordered: false });
      } catch (err) {
        console.warn(`Seed reviews bulk write notice:`, err?.message);
      }
    }
    const reviewsAfter = await Review.countDocuments();
    seeded.reviews = Math.max(0, reviewsAfter - reviewsBefore);

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

