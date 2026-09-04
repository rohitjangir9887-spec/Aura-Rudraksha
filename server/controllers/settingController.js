import { Setting, Ticket, Analytics } from "../models/Setting.js";
import { Product } from "../models/Product.js";
import { Review } from "../models/Review.js";
import { ActiveOffer } from "../models/Promotion.js";
import { Coupon } from "../models/Coupon.js";
import { Banner } from "../models/Banner.js";
import { Order } from "../models/Order.js";
import { Customer } from "../models/Customer.js";
import { isDbConnected } from "../config/db.js";
import { pickFields } from "../utils/sanitize.js";
import { inMemoryStore } from "../data/inMemoryStore.js";
import { isAdminUser, hasAdminRole } from "../middleware/auth.js";

const SETTING_FIELDS = {
  storeName: "string", supportEmail: "string", supportPhone: "string", currency: "string",
  instagramUrl: "url", facebookUrl: "url", youtubeUrl: "url",
  shippingPolicy: "string", returnPolicy: "string", privacyPolicy: "string",
  termsPolicy: "string", contactSupport: "string", storageProvider: "string", zodiacs: "array",
  shopCategories: "array", standardShippingFee: "number", freeShippingThreshold: "number",
  enableProductShipping: "boolean"
};
const POLICY_FIELDS = {
  shippingPolicy: "string", returnPolicy: "string", privacyPolicy: "string",
  termsPolicy: "string", contactSupport: "string"
};
// Public customers may only ever set these fields when submitting a ticket.
const CUSTOMER_TICKET_FIELDS = { name: "string", email: "string", phone: "string", subject: "string", message: "string", orderId: "string" };
// Admin-only fields (status, priority, adminResponse) are applied separately, only on the admin-gated PUT route.
const ADMIN_TICKET_FIELDS = { status: "string", priority: "string", adminResponse: "string" };
import {
  defaultSettings,
  defaultProducts,
  defaultReviews,
  defaultActiveOffer,
  defaultCoupons,
  defaultBanners,
  defaultOrders,
  defaultCustomers
} from "../data/defaultData.js";

import { logAuditEvent } from "../services/auditService.js";

function sanitizeSettingsForClient(settings, isAdmin = false) {
  if (!settings || typeof settings !== "object") return {};
  const copy = JSON.parse(JSON.stringify(settings));
  
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

    if (!isDbConnected()) {
      return res.json({ success: true, data: sanitizeSettingsForClient(inMemoryStore.settings, isAdmin) });
    }

    let settings = await Setting.findOne({ id: "STORE_SETTINGS" }).lean();
    if (!settings) {
      settings = await Setting.create(defaultSettings);
    }
    return res.json({ success: true, data: sanitizeSettingsForClient(settings, isAdmin) });
  } catch (err) {
    next(err);
  }
}

export async function saveSettings(req, res, next) {
  try {
    const data = pickFields(req.body, SETTING_FIELDS);

    if (!isDbConnected()) {
      inMemoryStore.settings = { ...inMemoryStore.settings, ...data };
      await logAuditEvent({
        actor: req.user?.email || "admin",
        actorRole: "admin",
        action: "SETTINGS_UPDATED",
        entityType: "Setting",
        entityId: "STORE_SETTINGS",
        newState: data,
        req
      });
      return res.json({ success: true, data: sanitizeSettingsForClient(inMemoryStore.settings, true) });
    }

    const oldSettings = await Setting.findOne({ id: "STORE_SETTINGS" }).lean();
    const updated = await Setting.findOneAndUpdate(
      { id: "STORE_SETTINGS" },
      { $set: data },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );

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
      const settings = inMemoryStore.settings || defaultSettings;
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
    }

    let settings = await Setting.findOne({ id: "STORE_SETTINGS" }).lean();
    if (!settings) {
      settings = await Setting.create(defaultSettings);
    }
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
      inMemoryStore.settings = { ...inMemoryStore.settings, ...data };
      return res.json({ success: true, data: inMemoryStore.settings });
    }

    const updated = await Setting.findOneAndUpdate(
      { id: "STORE_SETTINGS" },
      { $set: data },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );
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
      let tickets = inMemoryStore.tickets || [];
      if (!isAdmin) {
        if (!authenticatedUser) return res.json({ success: true, data: [] });
        const userEmail = (authenticatedUser.email || "").toLowerCase().trim();
        const userId = authenticatedUser.authUserId || "";
        tickets = tickets.filter(t => 
          (userId && (t.authUserId === userId || t.userId === userId)) ||
          (userEmail && (t.userEmail?.toLowerCase() === userEmail || t.email?.toLowerCase() === userEmail))
        );
      }
      return res.json({ success: true, data: tickets });
    }

    let query = {};
    if (!isAdmin) {
      if (!authenticatedUser) {
        return res.json({ success: true, data: [] });
      }
      const userEmail = (authenticatedUser.email || "").toLowerCase().trim();
      const userId = authenticatedUser.authUserId || "";
      const queryOr = [];
      if (userId) {
        queryOr.push({ authUserId: userId });
        queryOr.push({ userId: userId });
      }
      if (userEmail) {
        queryOr.push({ userEmail: userEmail });
        queryOr.push({ email: userEmail });
      }
      query = queryOr.length > 0 ? { $or: queryOr } : { authUserId: "__none__" };
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

    const id = "TIC-" + Date.now().toString(36).toUpperCase() + "-" + Math.floor(1000 + Math.random() * 9000);
    const payload = {
      ...data,
      id,
      authUserId: authUserId || "guest",
      userId: authUserId || "guest",
      userEmail,
      email: userEmail || data.email,
      status: "Open",
      priority: "Normal",
      adminResponse: "",
      date: new Date().toISOString()
    };

    if (!isDbConnected()) {
      inMemoryStore.tickets.unshift(payload);
      return res.status(201).json({ success: true, data: payload });
    }

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

    const data = pickFields(req.body, ADMIN_TICKET_FIELDS);
    if (Object.keys(data).length === 0) {
      return res.status(400).json({ success: false, message: "No valid fields to update" });
    }

    if (!isDbConnected()) {
      const idx = inMemoryStore.tickets.findIndex(t => String(t.id) === String(id));
      if (idx < 0) {
        return res.status(404).json({ success: false, message: "Ticket not found" });
      }
      const ticket = inMemoryStore.tickets[idx];
      if (!isAdmin) {
        if (!authenticatedUser) return res.status(401).json({ success: false, message: "Authentication required" });
        const userEmail = (authenticatedUser.email || "").toLowerCase().trim();
        const userId = authenticatedUser.authUserId;
        const isOwner = (userId && (ticket.authUserId === userId || ticket.userId === userId)) ||
                        (userEmail && (ticket.userEmail?.toLowerCase() === userEmail || ticket.email?.toLowerCase() === userEmail));
        if (!isOwner) return res.status(403).json({ success: false, message: "Access denied" });
      }
      inMemoryStore.tickets[idx] = { ...inMemoryStore.tickets[idx], ...data };
      return res.json({ success: true, data: inMemoryStore.tickets[idx] });
    }

    const ticket = await Ticket.findOne({ id: String(id) });
    if (!ticket) {
      return res.status(404).json({ success: false, message: "Ticket not found" });
    }

    if (!isAdmin) {
      if (!authenticatedUser) return res.status(401).json({ success: false, message: "Authentication required" });
      const userEmail = (authenticatedUser.email || "").toLowerCase().trim();
      const userId = authenticatedUser.authUserId;
      const isOwner = (userId && (ticket.authUserId === userId || ticket.userId === userId)) ||
                      (userEmail && (ticket.userEmail?.toLowerCase() === userEmail || ticket.email?.toLowerCase() === userEmail));
      if (!isOwner) return res.status(403).json({ success: false, message: "Access denied" });
    }

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

// Analytics
export async function getAnalytics(req, res, next) {
  try {
    if (!isDbConnected()) {
      return res.json({
        success: true,
        data: {
          id: "GLOBAL_ANALYTICS",
          visits: 124,
          productViews: 450,
          hasData: true,
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

    // Insert-only seeding: $setOnInsert means existing records are NEVER modified.
    // We report how many new records appeared by comparing counts (portable).
    const diffCount = async (Model, run) => {
      const before = await Model.countDocuments();
      await run();
      const after = await Model.countDocuments();
      return Math.max(0, after - before);
    };

    seeded.products = await diffCount(Product, async () => {
      for (const p of defaultProducts) {
        await Product.findOneAndUpdate({ id: String(p.id) }, { $setOnInsert: p }, { upsert: true });
      }
    });
    seeded.orders = await diffCount(Order, async () => {
      for (const o of defaultOrders) {
        await Order.findOneAndUpdate({ id: String(o.id) }, { $setOnInsert: o }, { upsert: true });
      }
    });
    seeded.customers = await diffCount(Customer, async () => {
      for (const cust of defaultCustomers) {
        await Customer.findOneAndUpdate({ id: String(cust.id) }, { $setOnInsert: cust }, { upsert: true });
      }
    });
    seeded.reviews = await diffCount(Review, async () => {
      for (const r of defaultReviews) {
        await Review.findOneAndUpdate(
          { id: String(r.id) },
          {
            $set: {
              ...r,
              source: "customer",
              status: "Approved",
              isSample: true,
              isAiGenerated: true,
              sampleLabel: "Sample Review"
            }
          },
          { upsert: true }
        );
      }
    });
    seeded.coupons = await diffCount(Coupon, async () => {
      for (const c of defaultCoupons) {
        await Coupon.findOneAndUpdate({ id: String(c.id) }, { $setOnInsert: c }, { upsert: true });
      }
    });

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

