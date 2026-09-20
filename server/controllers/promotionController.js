import mongoose from "mongoose";
import { ActiveOffer, Promotion, Offer } from "../models/Promotion.js";
import { Coupon } from "../models/Coupon.js";
import { isDbConnected, connectDB } from "../config/db.js";
import { pickFields } from "../utils/sanitize.js";
import { defaultActiveOffer } from "../data/defaultData.js";
import { inMemoryStore } from "../data/inMemoryStore.js";

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
  scrollTrigger: "number", animationStyle: "string", targetType: "string", selectedProducts: "string[]", excludedProducts: "string[]", targetCategories: "string[]", targetSubcategories: "string[]",
  applicableProducts: "string[]", applicableCategories: "string[]"
};

// Central Live Offer
export async function getActiveOffer(req, res, next) {
  try {
    if (!isDbConnected()) {
      await connectDB().catch(() => {});
    }
    if (!isDbConnected()) {
      return res.json({ success: true, data: inMemoryStore.activeOffer || defaultActiveOffer, isFallback: true });
    }
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    let offer = await ActiveOffer.findOne({ id: "OFFER-CENTRAL-1" }).lean();
    if (!offer) {
      offer = await ActiveOffer.findOne().sort({ updatedAt: -1 }).lean();
    }
    const resolvedOffer = offer || inMemoryStore.activeOffer || defaultActiveOffer;
    return res.json({ success: true, data: resolvedOffer });
  } catch (err) {
    next(err);
  }
}

export async function saveActiveOffer(req, res, next) {
  try {
    const data = pickFields(req.body, ACTIVE_OFFER_FIELDS);
    const isPct = data.discountType === "percentage";
    const discountVal = Number(data.discountValue) || (isPct ? 10 : 200);
    
    let resolvedTitle = data.title;
    if (isPct && (!resolvedTitle || resolvedTitle.includes("₹") || resolvedTitle === "₹200 OFF")) {
      resolvedTitle = `Flat ${discountVal}% OFF`;
    }

    const payload = {
      ...data,
      id: "OFFER-CENTRAL-1",
      title: resolvedTitle,
      discountValue: discountVal,
      expiry: data.expiresAt || data.expiry,
      expiresAt: data.expiresAt || data.expiry,
      startDate: data.startAt || data.startDate,
      startAt: data.startAt || data.startDate
    };

    inMemoryStore.activeOffer = payload;

    if (!isDbConnected()) {
      await connectDB().catch(() => {});
    }

    if (isDbConnected()) {
      const updated = await ActiveOffer.findOneAndUpdate(
        { id: "OFFER-CENTRAL-1" },
        { $set: payload },
        { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
      );

      // Also ensure coupon code is synchronized in Coupon collection if offer is active
      const cleanCode = (payload.couponCode || "").trim().toUpperCase();
      if (cleanCode && payload.enabled !== false && payload.status === "Active") {
        await Coupon.findOneAndUpdate(
          { code: cleanCode },
          {
            $set: {
              id: "COUP-" + cleanCode,
              code: cleanCode,
              discount: discountVal,
              type: isPct ? "percentage" : "fixed",
              status: "Active",
              expiry: payload.expiresAt || payload.expiry || null,
              minAmount: 0,
              description: isPct ? `${discountVal}% OFF` : (payload.subtitle || payload.title || "Central Live Offer")
            }
          },
          { upsert: true, setDefaultsOnInsert: true }
        ).catch(() => {});
      }

      return res.json({ success: true, data: updated });
    }

    return res.json({ success: true, data: payload });
  } catch (err) {
    next(err);
  }
}

// Offers
export async function getOffers(req, res, next) {
  try {
    if (!isDbConnected()) {
      await connectDB().catch(() => {});
    }
    if (!isDbConnected()) {
      return res.json({ success: true, data: inMemoryStore.offers || [], isFallback: true });
    }
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    const list = await Offer.find().sort({ order: 1 }).lean();
    return res.json({ success: true, data: list || [] });
  } catch (err) {
    next(err);
  }
}

export async function saveOffer(req, res, next) {
  try {
    const data = pickFields(req.body, OFFER_FIELDS);
    const id = data.id || ("OFF-" + Date.now());
    const payload = { ...data, id };

    if (!Array.isArray(inMemoryStore.offers)) inMemoryStore.offers = [];
    const idx = inMemoryStore.offers.findIndex(o => String(o.id) === String(id));
    if (idx !== -1) inMemoryStore.offers[idx] = payload;
    else inMemoryStore.offers.push(payload);

    if (!isDbConnected()) {
      await connectDB().catch(() => {});
    }

    if (isDbConnected()) {
      const saved = await Offer.findOneAndUpdate(
        { id: payload.id },
        payload,
        { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
      );
      return res.status(201).json({ success: true, data: saved });
    }

    return res.status(201).json({ success: true, data: payload });
  } catch (err) {
    next(err);
  }
}

export async function deleteOffer(req, res, next) {
  try {
    const { id } = req.params;
    const strId = String(id).trim();

    if (Array.isArray(inMemoryStore.offers)) {
      inMemoryStore.offers = inMemoryStore.offers.filter(o => String(o.id) !== strId && String(o._id) !== strId);
    }

    if (!isDbConnected()) {
      await connectDB().catch(() => {});
    }

    if (isDbConnected()) {
      const conds = [{ id: strId }];
      if (mongoose.Types.ObjectId.isValid(strId)) conds.push({ _id: strId });
      await Offer.findOneAndDelete({ $or: conds });
    }

    return res.json({ success: true, message: "Offer deleted", id: strId });
  } catch (err) {
    next(err);
  }
}

// Promotions
export async function getPromotions(req, res, next) {
  try {
    if (!isDbConnected()) {
      await connectDB().catch(() => {});
    }
    if (!isDbConnected()) {
      return res.json({ success: true, data: inMemoryStore.promotions || [], isFallback: true });
    }
    const list = await Promotion.find().sort({ createdAt: -1 }).lean();
    return res.json({ success: true, data: list || [] });
  } catch (err) {
    next(err);
  }
}

export async function savePromotion(req, res, next) {
  try {
    const data = pickFields(req.body, PROMO_FIELDS);
    const id = data.id || ("PROMO-" + Date.now());
    const payload = { ...data, id };

    if (!Array.isArray(inMemoryStore.promotions)) inMemoryStore.promotions = [];
    const idx = inMemoryStore.promotions.findIndex(p => String(p.id) === String(id));
    if (idx !== -1) inMemoryStore.promotions[idx] = payload;
    else inMemoryStore.promotions.push(payload);

    if (!isDbConnected()) {
      await connectDB().catch(() => {});
    }

    if (isDbConnected()) {
      const saved = await Promotion.findOneAndUpdate(
        { id: payload.id },
        payload,
        { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
      );
      return res.status(201).json({ success: true, data: saved });
    }

    return res.status(201).json({ success: true, data: payload });
  } catch (err) {
    next(err);
  }
}

export async function deletePromotion(req, res, next) {
  try {
    const { id } = req.params;
    const strId = String(id).trim();

    if (Array.isArray(inMemoryStore.promotions)) {
      inMemoryStore.promotions = inMemoryStore.promotions.filter(p => String(p.id) !== strId && String(p._id) !== strId);
    }

    if (!isDbConnected()) {
      await connectDB().catch(() => {});
    }

    if (isDbConnected()) {
      const conds = [{ id: strId }];
      if (mongoose.Types.ObjectId.isValid(strId)) conds.push({ _id: strId });
      await Promotion.findOneAndDelete({ $or: conds });
    }

    return res.json({ success: true, message: "Promotion deleted", id: strId });
  } catch (err) {
    next(err);
  }
}

