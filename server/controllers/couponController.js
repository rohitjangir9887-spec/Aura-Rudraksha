import mongoose from "mongoose";
import { Coupon } from "../models/Coupon.js";
import { ActiveOffer, Promotion, Offer } from "../models/Promotion.js";
import { isDbConnected } from "../config/db.js";
import { getAuthoritativeCoupon } from "../services/pricingService.js";
import { isAdminUser, hasAdminRole } from "../middleware/auth.js";
import { pickFields } from "../utils/sanitize.js";
import { logAuditEvent } from "../services/auditService.js";
import { defaultCoupons } from "../data/defaultData.js";
import { inMemoryStore } from "../data/inMemoryStore.js";

// Fields an admin may set on a coupon. Allowlisted for defense-in-depth
// consistency with the rest of the admin write paths in this codebase, even
// though this route is already requireAdmin-gated and Coupon.usage is the
// only counter that matters for abuse (incremented server-side only, in
// orderController, never from this admin form).
const COUPON_FIELDS = {
  code: "string", discount: "number", value: "number", type: "string", limit: "number",
  usage: "number", minAmount: "number", minOrder: "number", minOrderValue: "number",
  expiry: "nullableString", status: "string", description: "string", targetType: "string", selectedProducts: "string[]", excludedProducts: "string[]", targetCategories: "string[]", targetSubcategories: "string[]", maxDiscount: "number", perCustomerLimit: "number"
};

// Fields safe to show to unauthenticated shoppers on cart/checkout (no usage
// counters or other internal business data).
function toPublicCoupon(c) {
  return {
    id: c.id || c._id,
    code: c.code,
    discount: c.discount ?? c.value ?? 0,
    type: c.type || "percentage",
    minAmount: c.minAmount ?? c.minOrder ?? 0,
    expiry: c.expiry || c.expiresAt || null,
    status: c.status,
    description: c.description || ""
  };
}


function formatDate(dateStr) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return String(dateStr);
  }
}

export async function validateCoupon(req, res, next) {
  try {
    const { code, couponCode, subtotal = 0 } = req.body;
    const rawCode = code || couponCode;
    if (!rawCode) {
      return res.status(400).json({ success: false, valid: false, status: "INVALID", message: "Coupon code is required" });
    }

    const cleanCode = String(rawCode).trim().toUpperCase();
    const orderSubtotal = Math.max(0, Number(subtotal) || 0);

    const coupon = await getAuthoritativeCoupon(cleanCode);

    if (!coupon) {
      return res.status(400).json({
        success: false,
        valid: false,
        status: "INVALID",
        message: `Coupon code '${cleanCode}' is invalid or does not exist.`
      });
    }

    const now = new Date();
    const expiryDate = coupon.expiry || coupon.expiresAt || null;
    const isExpiredByDate = expiryDate ? (new Date(expiryDate) < now) : false;
    const isStatusExpired = coupon.status === "Expired";
    const formattedExpiry = formatDate(expiryDate);

    if (isExpiredByDate || isStatusExpired) {
      return res.status(400).json({
        success: false,
        valid: false,
        status: "EXPIRED",
        data: {
          id: coupon.id || coupon._id,
          code: coupon.code,
          status: "EXPIRED",
          discount: Number(coupon.discount || coupon.value || 0),
          discountAmount: 0,
          type: coupon.type || "percentage",
          expiry: expiryDate,
          formattedExpiry,
          reason: `This coupon expired on ${formattedExpiry || "recently"}.`
        },
        message: `Coupon '${cleanCode}' has expired on ${formattedExpiry || "recently"}.`
      });
    }

    if (coupon.status === "Inactive") {
      return res.status(400).json({
        success: false,
        valid: false,
        status: "INVALID",
        message: `Coupon '${cleanCode}' is currently inactive.`
      });
    }

    if (coupon.limit && (coupon.usage || 0) >= Number(coupon.limit)) {
      return res.status(400).json({
        success: false,
        valid: false,
        status: "INVALID",
        message: `Coupon '${cleanCode}' usage limit has been reached.`
      });
    }

    const minOrder = Number(coupon.minAmount || coupon.minOrder || coupon.minOrderValue || 0);
    if (minOrder > 0 && orderSubtotal < minOrder) {
      const shortfall = minOrder - orderSubtotal;
      return res.status(400).json({
        success: false,
        valid: false,
        status: "NOT_ELIGIBLE",
        data: {
          id: coupon.id || coupon._id,
          code: coupon.code,
          status: "NOT_ELIGIBLE",
          minOrder,
          shortfall,
          discount: Number(coupon.discount || coupon.value || 0),
          discountAmount: 0,
          type: coupon.type || "percentage"
        },
        message: `Add ₹${shortfall.toLocaleString('en-IN')} more to use coupon '${cleanCode}'. (Min order: ₹${minOrder.toLocaleString('en-IN')})`
      });
    }

    let discountAmount = 0;
    const discountVal = Number(coupon.discount || coupon.value || 0);
    if (coupon.type === "fixed") {
      discountAmount = Math.min(orderSubtotal, discountVal);
    } else {
      discountAmount = Math.min(orderSubtotal, Math.round((orderSubtotal * discountVal) / 100));
    }

    return res.json({
      success: true,
      valid: true,
      status: "APPLIED",
      data: {
        id: coupon.id || coupon._id,
        code: coupon.code,
        status: "APPLIED",
        discount: discountVal,
        type: coupon.type || "percentage",
        discountAmount: discountAmount,
        minOrder: minOrder,
        description: coupon.type === "percentage" ? `${discountVal}% Discount` : `Flat ₹${discountVal} Off`
      },
      message: `Coupon '${coupon.code}' applied successfully!`
    });
  } catch (err) {
    next(err);
  }
}

export async function getCoupons(req, res, next) {
  try {
    let isAdmin = false;
    if (req.user) {
      const { isInitialAdmin } = isAdminUser(req.user);
      isAdmin = isInitialAdmin || (await hasAdminRole(req.user.authUserId));
    }

    if (!isDbConnected()) {
      const list = inMemoryStore.coupons || defaultCoupons;
      if (isAdmin) {
        return res.json({ success: true, data: list, count: list.length, isFallback: true });
      }
      const publicCoupons = list.filter(c => c.status === "Active").map(toPublicCoupon);
      return res.json({ success: true, data: publicCoupons, count: publicCoupons.length, isFallback: true });
    }

    const coupons = await Coupon.find().sort({ createdAt: -1 }).lean();
    const now = Date.now();
    for (const c of coupons) {
      if (c.status === "Active" && c.expiry && new Date(c.expiry).getTime() < now) {
        await Coupon.updateOne({ _id: c._id }, { $set: { status: "Expired" } });
        c.status = "Expired";
      }
    }
    inMemoryStore.coupons = coupons;
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    if (isAdmin) {
      return res.json({ success: true, data: coupons, count: coupons.length });
    }
    const publicCoupons = coupons.filter(c => c.status === "Active").map(toPublicCoupon);
    return res.json({ success: true, data: publicCoupons, count: publicCoupons.length });
  } catch (err) {
    next(err);
  }
}


export async function createCoupon(req, res, next) {
  try {
    const data = pickFields(req.body, COUPON_FIELDS);
    const resolvedDiscount = Number(data.discount !== undefined ? data.discount : data.value);
    if (!data.code || isNaN(resolvedDiscount)) {
      return res.status(400).json({ success: false, message: "Code and discount are required" });
    }

    const id = "COUP-" + Date.now();
    const payload = {
      ...data,
      id,
      code: data.code.trim().toUpperCase(),
      discount: resolvedDiscount,
      type: data.type || "percentage",
      limit: Number(data.limit) || 1000,
      usage: Number(data.usage) || 0,
      minAmount: Number(data.minAmount || data.minOrder || data.minOrderValue || 0),
      expiry: data.expiry || null,
      status: data.status === "Disabled" ? "Inactive" : (data.status || "Active"),
      description: (data.description || (data.type === "fixed" ? `Flat ₹${resolvedDiscount} Off` : `${resolvedDiscount}% Off`)).trim()
    };

    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        error: "Database unavailable",
        message: "Database is unavailable. Cannot create coupon without MongoDB connection.",
        databaseUnavailable: true
      });
    }

    const created = await Coupon.findOneAndUpdate(
      { $or: [{ id: payload.id }, { code: payload.code }] },
      payload,
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );

    await logAuditEvent({
      actor: req.user?.email || "admin",
      actorRole: "admin",
      action: "COUPON_CREATED",
      entityType: "Coupon",
      entityId: payload.code,
      newState: created,
      req
    });

    return res.status(201).json({ success: true, data: created });
  } catch (err) {
    next(err);
  }
}

export async function updateCoupon(req, res, next) {
  try {
    const { id } = req.params;
    const data = pickFields(req.body, COUPON_FIELDS);
    if (data.code) data.code = String(data.code).trim().toUpperCase();

    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        error: "Database unavailable",
        message: "Database is unavailable. Cannot update coupon without MongoDB connection.",
        databaseUnavailable: true
      });
    }

    const oldCoupon = await Coupon.findOne({ $or: [{ id: String(id) }, { code: String(id).toUpperCase() }] }).lean();
    const updated = await Coupon.findOneAndUpdate(
      { $or: [{ id: String(id) }, { code: String(id).toUpperCase() }] },
      { $set: data },
      { returnDocument: "after" }
    );
    if (!updated) {
      return res.status(404).json({ success: false, message: "Coupon not found" });
    }

    const oldCode = oldCoupon?.code ? String(oldCoupon.code).toUpperCase() : "";
    const newCode = updated?.code ? String(updated.code).toUpperCase() : oldCode;

    // Sync any linked Offers, ActiveOffers, and Promotions so home page UI updates immediately
    if (data.status === "Inactive" || data.status === "Disabled" || data.status === "Expired") {
      await Offer.updateMany(
        { $or: [{ couponCode: oldCode }, { couponCode: newCode }] },
        { $set: { status: "Inactive" } }
      ).catch(() => {});
      await ActiveOffer.updateMany(
        { $or: [{ couponCode: oldCode }, { couponCode: newCode }] },
        { $set: { status: "Inactive", enabled: false } }
      ).catch(() => {});
    } else if (newCode && oldCode && newCode !== oldCode) {
      await Offer.updateMany({ couponCode: oldCode }, { $set: { couponCode: newCode } }).catch(() => {});
      await ActiveOffer.updateMany({ couponCode: oldCode }, { $set: { couponCode: newCode } }).catch(() => {});
      await Promotion.updateMany({ $or: [{ code: oldCode }, { couponCode: oldCode }] }, { $set: { code: newCode, couponCode: newCode } }).catch(() => {});
    }

    await logAuditEvent({
      actor: req.user?.email || "admin",
      actorRole: "admin",
      action: "COUPON_UPDATED",
      entityType: "Coupon",
      entityId: String(id),
      oldState: oldCoupon,
      newState: data,
      req
    });

    return res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

export async function deleteCoupon(req, res, next) {
  try {
    const { id } = req.params;
    const cleanId = String(id).trim();

    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        databaseUnavailable: true,
        error: "Database unavailable",
        message: "Coupons require an authoritative MongoDB connection."
      });
    }

    // 1. Find target coupon to resolve exact code, id, and _id
    const findConditions = [
      { id: cleanId },
      { code: { $regex: `^${cleanId}$`, $options: "i" } }
    ];
    if (mongoose.Types.ObjectId.isValid(cleanId)) {
      findConditions.push({ _id: cleanId });
    }

    const existingCoupon = await Coupon.findOne({ $or: findConditions }).lean();
    const targetCode = (existingCoupon?.code || cleanId).trim().toUpperCase();
    const targetId = existingCoupon?.id || cleanId;
    const targetDbId = existingCoupon?._id ? String(existingCoupon._id) : null;

    // 2. Delete coupon from Coupon collection across all identifier matches
    const deleteConditions = [
      { id: cleanId },
      { id: targetId },
      { code: { $regex: `^${targetCode}$`, $options: "i" } }
    ];
    if (targetDbId) deleteConditions.push({ _id: targetDbId });
    if (mongoose.Types.ObjectId.isValid(cleanId)) deleteConditions.push({ _id: cleanId });

    await Coupon.deleteMany({ $or: deleteConditions });

    // 3. Delete matching offers and promotions from Offer/Promotion collections so they vanish from Home UI
    const offerDeleteConditions = [
      { couponCode: { $regex: `^${targetCode}$`, $options: "i" } },
      { code: { $regex: `^${targetCode}$`, $options: "i" } },
      { id: targetId },
      { id: cleanId }
    ];
    await Offer.deleteMany({ $or: offerDeleteConditions }).catch(() => {});
    await Promotion.deleteMany({ $or: offerDeleteConditions }).catch(() => {});

    // 4. Deactivate ActiveOffer if it referenced this deleted coupon
    await ActiveOffer.updateMany(
      {
        $or: [
          { couponCode: { $regex: `^${targetCode}$`, $options: "i" } },
          { id: targetId },
          { id: cleanId }
        ]
      },
      { $set: { enabled: false, status: "Inactive", couponCode: "" } }
    ).catch(() => {});

    // 5. Clean up in-memory store
    if (inMemoryStore.coupons) {
      inMemoryStore.coupons = inMemoryStore.coupons.filter(
        c => String(c.id) !== cleanId && String(c.id) !== targetId && String(c._id) !== targetDbId && String(c.code || "").toUpperCase() !== targetCode
      );
    }
    if (inMemoryStore.offers) {
      inMemoryStore.offers = inMemoryStore.offers.filter(
        o => String(o.couponCode || "").toUpperCase() !== targetCode && String(o.id) !== targetId && String(o.id) !== cleanId
      );
    }
    if (inMemoryStore.activeOffer && String(inMemoryStore.activeOffer.couponCode || "").toUpperCase() === targetCode) {
      inMemoryStore.activeOffer.enabled = false;
      inMemoryStore.activeOffer.status = "Inactive";
      inMemoryStore.activeOffer.couponCode = "";
    }

    await logAuditEvent({
      actor: req.user?.email || "admin",
      actorRole: "admin",
      action: "COUPON_DELETED",
      entityType: "Coupon",
      entityId: targetCode,
      req
    });

    return res.json({
      success: true,
      message: "Coupon and associated home offers deleted successfully",
      id: targetId,
      code: targetCode
    });
  } catch (err) {
    next(err);
  }
}

