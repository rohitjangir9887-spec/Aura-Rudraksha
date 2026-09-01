import { ActiveOffer, Promotion, Offer } from "../models/Promotion.js";
import { isDbConnected } from "../config/db.js";
import { pickFields } from "../utils/sanitize.js";

const OFFER_FIELDS = {
  title: "string", label: "string", description: "string", buttonText: "string",
  link: "string", image: "url", type: "string", discountValue: "number",
  couponCode: "string", shownOn: "string", status: "string", theme: "string",
  order: "number", startDate: "nullableString", expiry: "nullableString",
  applyTo: "string", offerType: "string"
};
const PROMO_FIELDS = {
  title: "string", subtitle: "string", offer: "string", code: "string",
  couponCode: "string", discountType: "string", discountValue: "number",
  startAt: "nullableString", expiresAt: "nullableString", endDate: "nullableString",
  active: "bool", showOnHome: "bool", showOnProduct: "bool", showPopup: "bool",
  image: "url", mobileImage: "url", buttonText: "string", link: "string",
  badgeText: "string", order: "number", status: "string"
};
const ACTIVE_OFFER_FIELDS = {
  enabled: "bool", status: "string", title: "string", subtitle: "string",
  couponCode: "string", discountType: "string", discountValue: "number",
  startDate: "nullableString", startAt: "nullableString", expiresAt: "nullableString",
  expiry: "nullableString", backgroundColor: "string", textColor: "string",
  accentColor: "string", badgeColor: "string", borderColor: "string", buttonColor: "string",
  heroEnabled: "bool", topStripEnabled: "bool", marqueeEnabled: "bool", productCardEnabled: "bool", productPageEnabled: "bool",
  imageBadgeEnabled: "bool", floatingEnabled: "bool", stickyEnabled: "bool",
  popupEnabled: "bool", timerEnabled: "bool", popupDelay: "number",
  scrollTrigger: "number", animationStyle: "string",
  applicableProducts: "string[]", applicableCategories: "string[]"
};

// Central Live Offer
export async function getActiveOffer(req, res, next) {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({ success: false, message: "Database is unavailable." });
    }
    const offer = await ActiveOffer.findOne({ id: "OFFER-CENTRAL-1" }).lean();
    return res.json({ success: true, data: offer || null });
  } catch (err) {
    next(err);
  }
}

export async function saveActiveOffer(req, res, next) {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        message: "Database unavailable. Cannot save offer without a connected MongoDB database."
      });
    }

    const data = pickFields(req.body, ACTIVE_OFFER_FIELDS);
    const payload = {
      ...data,
      id: "OFFER-CENTRAL-1",
      expiry: data.expiresAt || data.expiry,
      expiresAt: data.expiresAt || data.expiry,
      startDate: data.startAt || data.startDate,
      startAt: data.startAt || data.startDate
    };

    const updated = await ActiveOffer.findOneAndUpdate(
      { id: "OFFER-CENTRAL-1" },
      { $set: payload },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );
    return res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

// Offers
export async function getOffers(req, res, next) {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({ success: false, message: "Database is unavailable." });
    }
    const list = await Offer.find().sort({ order: 1 }).lean();
    return res.json({ success: true, data: list || [] });
  } catch (err) {
    next(err);
  }
}

export async function saveOffer(req, res, next) {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        message: "Database unavailable. Cannot save offer without a connected MongoDB database."
      });
    }

    const data = pickFields(req.body, OFFER_FIELDS);
    const id = data.id || ("OFF-" + Date.now());
    const payload = { ...data, id };

    const saved = await Offer.findOneAndUpdate(
      { id: payload.id },
      payload,
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );
    return res.status(201).json({ success: true, data: saved });
  } catch (err) {
    next(err);
  }
}

export async function deleteOffer(req, res, next) {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        message: "Database unavailable. Cannot delete offer without a connected MongoDB database."
      });
    }

    const { id } = req.params;
    await Offer.findOneAndDelete({ id: String(id) });
    return res.json({ success: true, message: "Offer deleted", id });
  } catch (err) {
    next(err);
  }
}

// Promotions
export async function getPromotions(req, res, next) {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({ success: false, message: "Database is unavailable." });
    }
    const list = await Promotion.find().sort({ createdAt: -1 }).lean();
    return res.json({ success: true, data: list || [] });
  } catch (err) {
    next(err);
  }
}

export async function savePromotion(req, res, next) {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        message: "Database unavailable. Cannot save promotion without a connected MongoDB database."
      });
    }

    const data = pickFields(req.body, PROMO_FIELDS);
    const id = data.id || ("PROMO-" + Date.now());
    const payload = { ...data, id };

    const saved = await Promotion.findOneAndUpdate(
      { id: payload.id },
      payload,
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );
    return res.status(201).json({ success: true, data: saved });
  } catch (err) {
    next(err);
  }
}

export async function deletePromotion(req, res, next) {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        message: "Database unavailable. Cannot delete promotion without a connected MongoDB database."
      });
    }

    const { id } = req.params;
    await Promotion.findOneAndDelete({ id: String(id) });
    return res.json({ success: true, message: "Promotion deleted", id });
  } catch (err) {
    next(err);
  }
}

