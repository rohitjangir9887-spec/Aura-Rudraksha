import { Product } from "../models/Product.js";
import { Media } from "../models/Media.js";
import { deleteFromPcloud } from "../services/pcloudService.js";
import { isDbConnected } from "../config/db.js";
import { pickFields } from "../utils/sanitize.js";
import { isAdminUser, hasAdminRole } from "../middleware/auth.js";
import { inMemoryStore } from "../data/inMemoryStore.js";
import { invalidateRagCache } from "../services/ragService.js";

const PRODUCT_FIELDS = {
  id: "string", name: "string", slug: "string", price: "number",
  comparePrice: "number", mrp: "number", discount: "number", discountPercent: "number",
  description: "richText", category: "string", subCategory: "string", images: "url[]", img: "url",
  stock: "number", status: "string", tags: "string[]", keywords: "string[]", searchKeywords: "string[]",
  highlight: "string", badge: "string", homeBadge: "string", showOnHome: "bool", homeOrder: "number",
  isPopular: "bool", rating: "number", reviews: "number", reviewCount: "number",
  customOffer: "object", origin: "string", mukhi: "string", rulingPlanet: "string", deity: "string",
  zodiac: "string[]", metaTitle: "string", metaDescription: "string", freeShipping: "bool", shippingFee: "number"
};

/**
 * Check if the current request is from an authenticated admin
 */
async function checkIsAdmin(req) {
  if (!req.user) return false;
  try {
    const { isInitialAdmin } = isAdminUser(req.user);
    if (isInitialAdmin) return true;
    if (req.user.authUserId) {
      const hasRole = await hasAdminRole(req.user.authUserId);
      if (hasRole) return true;
    }
  } catch (_) {}
  return false;
}

/**
 * Normalize and validate status values
 * Allowed normalized values: "Published", "Draft"
 */
function normalizeProductStatus(rawStatus, defaultStatus = "Draft") {
  if (!rawStatus || typeof rawStatus !== "string") return defaultStatus;
  const s = rawStatus.trim().toLowerCase();
  if (s === "published" || s === "active") return "Published";
  if (s === "draft" || s === "inactive" || s === "archived") return "Draft";
  return defaultStatus;
}

export async function getProducts(req, res, next) {
  try {
    const isAdmin = req.user && req.user.isAdmin;

    if (!isDbConnected()) {
      let products = [...inMemoryStore.products];
      if (!isAdmin) {
        products = products.filter(p => {
          const s = (p.status || "Published").toLowerCase();
          return s === "published" || s === "active";
        });
      } else if (req.query.status) {
        const queryStatus = String(req.query.status).trim().toLowerCase();
        products = products.filter(p => {
          const s = (p.status || "Draft").toLowerCase();
          if (queryStatus === "draft") return s === "draft" || s === "inactive";
          if (queryStatus === "published" || queryStatus === "active") return s === "published" || s === "active";
          return s === queryStatus;
        });
      }
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate, max-age=0");
      return res.json({ success: true, data: products, count: products.length });
    }

    let filter = {};

    if (isAdmin) {
      if (req.query.status) {
        const queryStatus = String(req.query.status).trim();
        if (queryStatus.toLowerCase() === "draft") {
          filter.status = { $in: ["Draft", "draft", "Inactive", "inactive"] };
        } else if (queryStatus.toLowerCase() === "published" || queryStatus.toLowerCase() === "active") {
          filter.status = { $in: ["Published", "published", "Active", "active"] };
        } else {
          filter.status = queryStatus;
        }
      }
    } else {
      filter = {
        $and: [
          {
            $or: [
              { status: { $in: ["Published", "published", "Active", "active"] } },
              { status: { $exists: false } },
              { status: null },
              { status: "" }
            ]
          },
          {
            status: { $nin: ["Draft", "draft", "Inactive", "inactive", "Archived", "archived"] }
          }
        ]
      };
    }

    const products = await Product.find(filter).sort({ createdAt: -1 }).lean();
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate, max-age=0");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    return res.json({ success: true, data: products, count: products.length });
  } catch (err) {
    next(err);
  }
}

export async function getProductById(req, res, next) {
  try {
    const { id } = req.params;
    const cleanId = String(id).trim();

    if (!isDbConnected()) {
      const product = inMemoryStore.products.find(p => String(p.id) === cleanId || p.slug === cleanId);
      if (!product) {
        return res.status(404).json({ success: false, message: "Product not found" });
      }
      const isAdmin = req.user && req.user.isAdmin;
      if (!isAdmin) {
        const currentStatus = (product.status || "Published").toLowerCase();
        if (currentStatus === "draft" || currentStatus === "inactive" || currentStatus === "archived") {
          return res.status(404).json({ success: false, message: "Product not found" });
        }
      }
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      return res.json({ success: true, data: product });
    }

    const isMongoId = /^[0-9a-fA-F]{24}$/.test(cleanId);
    let product = await Product.findOne({
      $or: [
        { id: cleanId },
        { slug: cleanId },
        ...(isMongoId ? [{ _id: cleanId }] : [])
      ]
    }).lean();

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const isAdmin = req.user && req.user.isAdmin;
    if (!isAdmin) {
      const currentStatus = (product.status || "Published").toLowerCase();
      if (currentStatus === "draft" || currentStatus === "inactive" || currentStatus === "archived") {
        return res.status(404).json({ success: false, message: "Product not found" });
      }
    }

    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    return res.json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
}

import { logAuditEvent } from "../services/auditService.js";

function normalizeArrayField(val) {
  if (Array.isArray(val)) {
    return val.map(s => String(s || "").trim()).filter(Boolean);
  }
  if (typeof val === "string" && val.trim()) {
    return val.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
  }
  return [];
}

export async function createProduct(req, res, next) {
  try {
    const rawBody = { ...req.body };
    if (rawBody.tags !== undefined) rawBody.tags = normalizeArrayField(rawBody.tags);
    if (rawBody.keywords !== undefined) rawBody.keywords = normalizeArrayField(rawBody.keywords);
    if (rawBody.searchKeywords !== undefined) rawBody.searchKeywords = normalizeArrayField(rawBody.searchKeywords);
    if (rawBody.zodiac !== undefined) rawBody.zodiac = normalizeArrayField(rawBody.zodiac);

    const data = pickFields(rawBody, PRODUCT_FIELDS);
    if (!data.name || data.price === undefined) {
      return res.status(400).json({ success: false, message: "Name and Price are required" });
    }

    const id = data.id || Date.now().toString();
    const normalizedStatus = normalizeProductStatus(data.status, "Draft");

    const productPayload = {
      ...data,
      id,
      status: normalizedStatus,
      tags: Array.isArray(data.tags) ? data.tags : [],
      keywords: Array.isArray(data.keywords) ? data.keywords : (Array.isArray(data.searchKeywords) ? data.searchKeywords : []),
      searchKeywords: Array.isArray(data.keywords) ? data.keywords : [],
      mrp: data.mrp || data.comparePrice || data.price,
      comparePrice: data.comparePrice || data.mrp || data.price,
      images: Array.isArray(data.images) && data.images.length > 0 ? data.images : (data.img ? [data.img] : []),
      img: (Array.isArray(data.images) && data.images[0]) || data.img || "/images/product-5mukhi.jpg",
      stock: data.stock !== undefined ? Number(data.stock) : 50,
      rating: Number(data.rating) || 4.9,
      reviews: Number(data.reviews || data.reviewCount) || 0
    };

    if (!isDbConnected()) {
      const idx = inMemoryStore.products.findIndex(p => String(p.id) === String(id));
      if (idx >= 0) {
        inMemoryStore.products[idx] = { ...inMemoryStore.products[idx], ...productPayload };
      } else {
        inMemoryStore.products.unshift(productPayload);
      }
      invalidateRagCache();
      await logAuditEvent({
        actor: req.user?.email || "admin",
        actorRole: "admin",
        action: "PRODUCT_CREATED",
        entityType: "Product",
        entityId: String(id),
        newState: productPayload,
        req
      });
      return res.status(201).json({ success: true, data: productPayload });
    }

    const created = await Product.findOneAndUpdate(
      { id: productPayload.id },
      productPayload,
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );
    invalidateRagCache();

    await logAuditEvent({
      actor: req.user?.email || "admin",
      actorRole: "admin",
      action: "PRODUCT_CREATED",
      entityType: "Product",
      entityId: String(id),
      newState: created,
      req
    });

    return res.status(201).json({ success: true, data: created });
  } catch (err) {
    next(err);
  }
}

export async function updateProduct(req, res, next) {
  try {
    const { id } = req.params;
    const rawBody = { ...req.body };
    if (rawBody.tags !== undefined) rawBody.tags = normalizeArrayField(rawBody.tags);
    if (rawBody.keywords !== undefined) rawBody.keywords = normalizeArrayField(rawBody.keywords);
    if (rawBody.searchKeywords !== undefined) rawBody.searchKeywords = normalizeArrayField(rawBody.searchKeywords);
    if (rawBody.zodiac !== undefined) rawBody.zodiac = normalizeArrayField(rawBody.zodiac);

    const data = pickFields(rawBody, PRODUCT_FIELDS);

    const updatePayload = { ...data, id: String(id) };
    if (data.tags !== undefined) updatePayload.tags = Array.isArray(data.tags) ? data.tags : [];
    if (data.keywords !== undefined) {
      updatePayload.keywords = Array.isArray(data.keywords) ? data.keywords : [];
      updatePayload.searchKeywords = updatePayload.keywords;
    }
    if (data.status !== undefined) {
      updatePayload.status = normalizeProductStatus(data.status, "Published");
    }
    if (data.mrp) updatePayload.comparePrice = data.mrp;
    if (data.comparePrice) updatePayload.mrp = data.comparePrice;
    if (Array.isArray(data.images) && data.images.length > 0) {
      updatePayload.img = data.images[0];
    }

    if (!isDbConnected()) {
      const idx = inMemoryStore.products.findIndex(p => String(p.id) === String(id) || p.slug === String(id));
      if (idx < 0) {
        return res.status(404).json({ success: false, message: "Product not found" });
      }
      inMemoryStore.products[idx] = { ...inMemoryStore.products[idx], ...updatePayload };
      invalidateRagCache();
      await logAuditEvent({
        actor: req.user?.email || "admin",
        actorRole: "admin",
        action: "PRODUCT_UPDATED",
        entityType: "Product",
        entityId: String(id),
        newState: updatePayload,
        req
      });
      return res.json({ success: true, data: inMemoryStore.products[idx] });
    }

    const cleanId = String(id).trim();
    const isMongoId = /^[0-9a-fA-F]{24}$/.test(cleanId);
    const oldProduct = await Product.findOne({
      $or: [
        { id: cleanId },
        { slug: cleanId },
        ...(isMongoId ? [{ _id: cleanId }] : [])
      ]
    }).lean();

    let updated = await Product.findOneAndUpdate(
      {
        $or: [
          { id: cleanId },
          { slug: cleanId },
          ...(isMongoId ? [{ _id: cleanId }] : [])
        ]
      },
      { $set: updatePayload },
      { returnDocument: "after" }
    );
    if (!updated) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }
    invalidateRagCache();

    // Check for removed images to cleanup after successful product update
    if (oldProduct && Array.isArray(oldProduct.images) && Array.isArray(updatePayload.images)) {
      const removedImages = oldProduct.images.filter(img => !updatePayload.images.includes(img));
      if (removedImages.length > 0) {
        // Trigger async cleanup
        import('../models/Media.js').then(({ Media }) => {
          removedImages.forEach(async (imgUrl) => {
             try {
                // Determine provider based on url and delete
                const media = await Media.findOne({ $or: [{ readURL: imgUrl }, { url: imgUrl }] });
                if (media && media.provider === "imagekit" && media.fileId) {
                   const { deleteFromImagekit } = await import('../services/imagekitService.js');
                   const delRes = await deleteFromImagekit(media.fileId);
                   if (!delRes.success && (!delRes.message || (!delRes.message.includes("404") && !delRes.message.includes("not found")))) {
                       media.reconciliationState = 'failed_delete';
                       await media.save();
                   } else {
                       await Media.deleteOne({ _id: media._id });
                   }
                } else if (media && media.provider === "pcloud" && media.fileId) {
                   const { deleteFromPcloud } = await import('../services/pcloudService.js');
                   const delRes = await deleteFromPcloud(media.fileId);
                   if (!delRes.success && (!delRes.message || (!delRes.message.includes("404") && !delRes.message.includes("not found")))) {
                       media.reconciliationState = 'failed_delete';
                       await media.save();
                   } else {
                       await Media.deleteOne({ _id: media._id });
                   }
                } else if (media) {
                   await Media.deleteOne({ _id: media._id });
                }
             } catch (cleanupErr) {
                 console.warn("Image cleanup error:", cleanupErr);
             }
          });
        }).catch(err => console.warn("Failed to load Media module for cleanup", err));
      }
    }

    await logAuditEvent({ {

      actor: req.user?.email || "admin",
      actorRole: "admin",
      action: "PRODUCT_UPDATED",
      entityType: "Product",
      entityId: cleanId,
      oldState: oldProduct,
      newState: updatePayload,
      req
    });

    return res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

export async function deleteProduct(req, res, next) {
  try {
    const { id } = req.params;
    const cleanId = String(id).trim();

    if (!isDbConnected()) {
      inMemoryStore.products = inMemoryStore.products.filter(p => String(p.id) !== cleanId && p.slug !== cleanId);
      invalidateRagCache();
      await logAuditEvent({
        actor: req.user?.email || "admin",
        actorRole: "admin",
        action: "PRODUCT_DELETED",
        entityType: "Product",
        entityId: cleanId,
        req
      });
      return res.json({ success: true, message: "Product deleted", id: cleanId });
    }

    const isMongoId = /^[0-9a-fA-F]{24}$/.test(cleanId);

    const deleted = await Product.findOneAndDelete({
      $or: [
        { id: cleanId },
        { slug: cleanId },
        ...(isMongoId ? [{ _id: cleanId }] : [])
      ]
    });

    if (deleted) {
      const productUrls = Array.from(new Set([
        ...(deleted.images || []),
        ...(deleted.img ? [deleted.img] : [])
      ].filter(Boolean)));

      if (productUrls.length > 0) {
        try {
          const mediaItems = await Media.find({
            $or: [
              { readURL: { $in: productUrls } },
              { url: { $in: productUrls } }
            ]
          });

          for (const media of mediaItems) {
            if (media.provider === "pcloud" && media.fileId) {
              await deleteFromPcloud(media.fileId).catch(() => {});
            }
            await Media.deleteOne({ _id: media._id }).catch(() => {});
          }
        } catch (_) {}
      }
    }

    invalidateRagCache();

    await logAuditEvent({
      actor: req.user?.email || "admin",
      actorRole: "admin",
      action: "PRODUCT_DELETED",
      entityType: "Product",
      entityId: cleanId,
      req
    });

    return res.json({ success: true, message: "Product deleted", id: cleanId });
  } catch (err) {
    next(err);
  }
}

