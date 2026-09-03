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

const SETTING_FIELDS = {
  storeName: "string", supportEmail: "string", supportPhone: "string", currency: "string",
  instagramUrl: "url", facebookUrl: "url", youtubeUrl: "url",
  shippingPolicy: "string", returnPolicy: "string", privacyPolicy: "string",
  termsPolicy: "string", contactSupport: "string", zodiacs: "array",
  shopCategories: "array"
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

export async function getSettings(req, res, next) {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        error: "Database unavailable",
        message: "Database is temporarily unavailable. Please try again shortly."
      });
    }

    let settings = await Setting.findOne({ id: "STORE_SETTINGS" }).lean();
    if (!settings) {
      settings = await Setting.create(defaultSettings);
    }
    return res.json({ success: true, data: settings });
  } catch (err) {
    next(err);
  }
}

export async function saveSettings(req, res, next) {
  try {
    const data = pickFields(req.body, SETTING_FIELDS);

    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        error: "Database unavailable",
        message: "Database is temporarily unavailable. Please try again shortly."
      });
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

export async function getPolicies(req, res, next) {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        error: "Database unavailable",
        message: "Database is temporarily unavailable. Please try again shortly."
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
      return res.status(503).json({
        success: false,
        error: "Database unavailable",
        message: "Database is temporarily unavailable. Please try again shortly."
      });
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
    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        error: "Database unavailable",
        message: "Database is temporarily unavailable. Please try again shortly."
      });
    }

    const tickets = await Ticket.find().sort({ createdAt: -1 }).lean();
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

    const id = "TIC-" + Date.now().toString(36).toUpperCase() + "-" + Math.floor(1000 + Math.random() * 9000);
    const payload = {
      ...data,
      id,
      status: "Open",
      priority: "Normal",
      adminResponse: "",
      date: new Date().toISOString()
    };

    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        error: "Database unavailable",
        message: "Database is temporarily unavailable. Please try again shortly."
      });
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
    const data = pickFields(req.body, ADMIN_TICKET_FIELDS);
    if (Object.keys(data).length === 0) {
      return res.status(400).json({ success: false, message: "No valid fields to update" });
    }

    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        error: "Database unavailable",
        message: "Database is temporarily unavailable. Please try again shortly."
      });
    }

    const updated = await Ticket.findOneAndUpdate(
      { id: String(id) },
      { $set: data },
      { returnDocument: "after" }
    );
    if (!updated) {
      return res.status(404).json({ success: false, message: "Ticket not found" });
    }
    return res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

// Analytics
export async function getAnalytics(req, res, next) {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        error: "Database unavailable",
        message: "Database is temporarily unavailable. Please try again shortly."
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
    return res.status(503).json({
      success: false,
      message: "Database is unavailable."
    });
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
    return res.status(503).json({
      success: false,
      message: "Database is unavailable."
    });
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

