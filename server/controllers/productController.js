import { Product } from "../models/Product.js";
import { Media } from "../models/Media.js";
import { deleteFromPcloud } from "../services/pcloudService.js";
import { isDbConnected } from "../config/db.js";
import { pickFields } from "../utils/sanitize.js";
import { isAdminUser, hasAdminRole } from "../middleware/auth.js";
import { invalidateRagCache } from "../services/ragService.js";

const PRODUCT_FIELDS = {
  id: "string", name: "string", slug: "string", price: "number",
  comparePrice: "number", mrp: "number", discount: "number", discountPercent: "number",
  description: "richText", category: "string", subCategory: "string", images: "url[]", img: "url",
  stock: "number", status: "string", tags: "string[]", keywords: "string[]", searchKeywords: "string[]",
  highlight: "string", badge: "string", homeBadge: "string", showOnHome: "bool", homeOrder: "number",
  displayOrder: "number", sortOrder: "number", productType: "string", isRudraksha: "bool",
  material: "string", netWeight: "string", purity: "string", sanctification: "string",
  usageGuide: "string", hasCertificate: "bool",
  isPopular: "bool", rating: "number", reviews: "number", reviewCount: "number",
  totalSold: "string", salesCount: "number", autoIncrementSales: "bool",
  lastSalesUpdateDate: "string", dailySalesMin: "number", dailySalesMax: "number",
  customOffer: "object", origin: "string", hasIndonesianVariant: "bool",
  indonesianTitle: "string", indonesianPrice: "number", indonesianMrp: "number",
  indonesianStock: "number", indonesianImages: "url[]", indonesianImg: "url",
  indonesianSize: "string", indonesianHighlight: "string",
  mukhi: "string", rulingPlanet: "string", deity: "string",
  zodiac: "string[]", metaTitle: "string", metaDescription: "string", freeShipping: "bool", shippingFee: "number"
};

/**
 * Daily sales helper - preserved for signature compatibility without automatic mutation
 */
export async function applyDailySalesIncrement(products = []) {
  return products;
}

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
function normalizeProductStatus(rawStatus, defaultStatus = "Published") {
  if (!rawStatus || typeof rawStatus !== "string") return defaultStatus;
  const s = rawStatus.trim().toLowerCase();
  if (s === "published" || s === "active") return "Published";
  if (s === "draft" || s === "inactive" || s === "archived") return "Draft";
  return defaultStatus;
}

export async function getProducts(req, res, next) {
  try {
    const isAdmin = await checkIsAdmin(req);

    if (isAdmin) {
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate, max-age=0");
    } else {
      res.setHeader("Cache-Control", "no-cache, must-revalidate");
    }

    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        databaseUnavailable: true,
        error: "Database unavailable",
        message: "Database is temporarily unavailable. Live MongoDB connection required."
      });
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

    const products = await Product.find(filter).sort({ sortOrder: 1, homeOrder: 1, createdAt: -1 }).lean();
    return res.json({ success: true, data: products, count: products.length });
  } catch (err) {
    console.warn("Error in getProducts:", err.message);
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    return res.status(503).json({
      success: false,
      databaseUnavailable: true,
      error: "Database unavailable",
      message: "Database is temporarily unavailable."
    });
  }
}

export async function getProductById(req, res, next) {
  try {
    const { id } = req.params;
    const cleanId = String(id).trim();

    res.setHeader("Cache-Control", "no-cache, must-revalidate");

    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        databaseUnavailable: true,
        error: "Database unavailable",
        message: "Database is temporarily unavailable."
      });
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
      // Secondary fallback search in MongoDB by slugified name or regex
      const allProds = await Product.find().lean();
      const cleanTarget = cleanId.toLowerCase();
      product = allProds.find(p => {
        const pSlug = String(p.slug || "").toLowerCase();
        const pName = String(p.name || "").toLowerCase();
        const pSlugifiedName = pName.replace(/[^\w\s-]/g, "").replace(/\s+/g, "-");
        return pSlug === cleanTarget || 
               pSlugifiedName === cleanTarget || 
               (cleanTarget.length >= 3 && pSlug.includes(cleanTarget)) ||
               (cleanTarget.length >= 3 && cleanTarget.includes(pSlug)) ||
               (cleanTarget.length >= 3 && pSlugifiedName.includes(cleanTarget)) ||
               (cleanTarget.length >= 3 && cleanTarget.includes(pSlugifiedName));
      });
    }

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const isAdmin = await checkIsAdmin(req);
    if (!isAdmin) {
      const currentStatus = (product.status || "Published").toLowerCase();
      if (currentStatus === "draft" || currentStatus === "inactive" || currentStatus === "archived") {
        return res.status(404).json({ success: false, message: "Product not found" });
      }
    }

    return res.json({ success: true, data: product });
  } catch (err) {
    console.warn("Error in getProductById:", err.message);
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    return res.status(503).json({
      success: false,
      databaseUnavailable: true,
      error: "Database unavailable",
      message: "Database is temporarily unavailable."
    });
  }
}

import { logAuditEvent } from "../services/auditService.js";
import { submitToIndexNow } from "../services/indexNowService.js";

function extractStringValue(item) {
  if (item === null || item === undefined) return "";
  if (typeof item === "string") return item.trim();
  if (typeof item === "number" || typeof item === "boolean") return String(item);
  if (typeof item === "object") {
    const val = item.keyword ?? item.term ?? item.text ?? item.value ?? item.name ?? item.tag ?? "";
    if (typeof val === "string") return val.trim();
    if (typeof val === "number") return String(val);
  }
  return "";
}

function normalizeArrayField(val) {
  if (Array.isArray(val)) {
    return val.map(item => extractStringValue(item)).filter(Boolean);
  }
  if (typeof val === "string" && val.trim()) {
    return val.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
  }
  if (typeof val === "object" && val !== null) {
    const str = extractStringValue(val);
    return str ? [str] : [];
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
    const normalizedStatus = normalizeProductStatus(data.status, "Published");
    const computedSlug = data.slug || (data.name ? String(data.name).trim().toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-") : String(id));

    const salesCountNum = Number(data.salesCount) || (data.totalSold ? parseInt(String(data.totalSold).replace(/\D/g, ""), 10) || 0 : 0);
    const totalSoldStr = data.totalSold !== undefined && String(data.totalSold).trim() ? String(data.totalSold).trim() : (salesCountNum > 0 ? `${salesCountNum}+ Sold` : "");

    const productPayload = {
      ...data,
      id,
      slug: computedSlug,
      status: normalizedStatus,
      tags: Array.isArray(data.tags) ? data.tags : [],
      keywords: Array.isArray(data.keywords) ? data.keywords : (Array.isArray(data.searchKeywords) ? data.searchKeywords : []),
      searchKeywords: Array.isArray(data.keywords) ? data.keywords : [],
      mrp: data.mrp || data.comparePrice || data.price,
      comparePrice: data.comparePrice || data.mrp || data.price,
      images: Array.isArray(data.images) && data.images.length > 0 ? data.images : (data.img ? [data.img] : []),
      img: (Array.isArray(data.images) && data.images[0]) || data.img || "/images/placeholder.svg",
      stock: data.stock !== undefined ? Number(data.stock) : 0,
      rating: Number(data.rating) || 0,
      reviews: Number(data.reviews || data.reviewCount) || 0,
      totalSold: totalSoldStr,
      salesCount: salesCountNum,
      autoIncrementSales: false,
      lastSalesUpdateDate: data.lastSalesUpdateDate || new Date().toISOString().split("T")[0],
      dailySalesMin: 0,
      dailySalesMax: 0
    };

    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        databaseUnavailable: true,
        error: "Database unavailable",
        message: "Cannot create product while database is disconnected."
      });
    }

    const cleanId = String(productPayload.id).trim();
    const isMongoId = /^[0-9a-fA-F]{24}$/.test(cleanId);
    const created = await Product.findOneAndUpdate(
      { 
        $or: [
          { id: cleanId },
          { slug: productPayload.slug },
          ...(isMongoId ? [{ _id: cleanId }] : [])
        ]
      },
      { $set: productPayload },
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

    submitToIndexNow([`/product/${created.slug || created.id}`, "/sitemap.xml"], req).catch(() => {});
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
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
    if (data.name && !data.slug) {
      updatePayload.slug = String(data.name).trim().toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
    }
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
    if (data.salesCount !== undefined && Number(data.salesCount) >= 0) {
      updatePayload.salesCount = Number(data.salesCount);
      updatePayload.totalSold = `${updatePayload.salesCount}+ Sold`;
      updatePayload.lastSalesUpdateDate = new Date().toISOString().split("T")[0];
    } else if (data.totalSold !== undefined) {
      updatePayload.totalSold = String(data.totalSold).trim();
      const extractedCount = parseInt(String(data.totalSold).replace(/\D/g, ""), 10);
      if (!isNaN(extractedCount) && extractedCount > 0) {
        updatePayload.salesCount = extractedCount;
      }
      updatePayload.lastSalesUpdateDate = new Date().toISOString().split("T")[0];
    }
    if (data.autoIncrementSales !== undefined) {
      updatePayload.autoIncrementSales = !!data.autoIncrementSales;
    }
    if (data.dailySalesMin !== undefined) {
      updatePayload.dailySalesMin = Number(data.dailySalesMin) || 1;
    }
    if (data.dailySalesMax !== undefined) {
      updatePayload.dailySalesMax = Number(data.dailySalesMax) || 10;
    }

    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        databaseUnavailable: true,
        error: "Database unavailable",
        message: "Cannot update product while database is disconnected."
      });
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

    await logAuditEvent({
      actor: req.user?.email || "admin",
      actorRole: "admin",
      action: "PRODUCT_UPDATED",
      entityType: "Product",
      entityId: cleanId,
      oldState: oldProduct,
      newState: updatePayload,
      req
    });

    submitToIndexNow([`/product/${updated.slug || updated.id}`, "/sitemap.xml"], req).catch(() => {});
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
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
      return res.status(503).json({
        success: false,
        databaseUnavailable: true,
        error: "Database unavailable",
        message: "Cannot delete product while database is disconnected."
      });
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
      submitToIndexNow(["/sitemap.xml"], req).catch(() => {});
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

/**
 * Batch reorder products (for both Home and Shop displays)
 */
export async function reorderProducts(req, res, next) {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: "Invalid items array for reordering" });
    }

    const updates = [];
    for (const item of items) {
      if (!item || !item.id) continue;
      const cleanId = String(item.id).trim();
      const updateData = {};
      if (typeof item.sortOrder === "number") updateData.sortOrder = item.sortOrder;
      if (typeof item.displayOrder === "number") updateData.displayOrder = item.displayOrder;
      if (typeof item.homeOrder === "number") updateData.homeOrder = item.homeOrder;
      if (typeof item.showOnHome === "boolean") updateData.showOnHome = item.showOnHome;

      if (Object.keys(updateData).length > 0) {
        updates.push(
          Product.findOneAndUpdate({ id: cleanId }, { $set: updateData }, { new: true })
        );
      }
    }

    await Promise.all(updates);
    invalidateRagCache();

    return res.json({ success: true, message: "Product sequence updated successfully" });
  } catch (err) {
    next(err);
  }
}

/**
 * Manually trigger daily sales auto-increment (1-10 sales per product)
 */
export async function triggerDailySalesIncrement(req, res, next) {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        databaseUnavailable: true,
        error: "Database unavailable",
        message: "Database is unavailable. MongoDB connection required."
      });
    }

    const allProds = await Product.find({}).lean();
    const todayStr = new Date().toISOString().split("T")[0];
    const bulkOps = [];
    let updatedCount = 0;

    for (const p of allProds) {
      if (p.autoIncrementSales === false) continue;
      const minInc = Number(p.dailySalesMin) || 1;
      const maxInc = Number(p.dailySalesMax) || 10;
      const dailyInc = Math.floor(Math.random() * (maxInc - minInc + 1)) + minInc;
      const curCount = Number(p.salesCount) || (p.totalSold ? parseInt(String(p.totalSold).replace(/\D/g, ""), 10) || 0 : 0);
      const newCount = (curCount > 0 ? curCount : 240) + dailyInc;
      const formattedTotalSold = `${newCount.toLocaleString("en-IN")}+ Sold`;

      p.salesCount = newCount;
      p.totalSold = formattedTotalSold;
      p.lastSalesUpdateDate = todayStr;
      updatedCount++;

      bulkOps.push({
        updateOne: {
          filter: { id: p.id },
          update: {
            $set: {
              salesCount: newCount,
              totalSold: formattedTotalSold,
              lastSalesUpdateDate: todayStr
            }
          }
        }
      });
    }

    if (bulkOps.length > 0) {
      await Product.bulkWrite(bulkOps);
    }

    invalidateRagCache();

    return res.json({
      success: true,
      message: `Daily sales successfully incremented by 1-10 for ${updatedCount} products.`,
      updatedCount,
      data: allProds
    });
  } catch (err) {
    next(err);
  }
}



