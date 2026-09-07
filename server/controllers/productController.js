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
 * Compute and apply daily sales increment (1-10 sales per day) for products
 */
export async function applyDailySalesIncrement(products = []) {
  if (!Array.isArray(products) || products.length === 0) return products;
  
  const todayStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const bulkOps = [];

  for (const p of products) {
    if (p.autoIncrementSales === false) {
      continue;
    }

    const lastDateStr = p.lastSalesUpdateDate || "";
    let shouldUpdate = false;
    let newSalesCount = Number(p.salesCount) || (p.totalSold ? parseInt(String(p.totalSold).replace(/\D/g, ""), 10) || 0 : 0);

    // If newSalesCount is 0, initialize realistic starting baseline (e.g. 180 + mukhi/reviews)
    if (newSalesCount <= 0) {
      const base = (Number(p.reviews) || 45) * 4 + 160;
      newSalesCount = base;
      shouldUpdate = true;
    }

    if (!lastDateStr) {
      shouldUpdate = true;
    } else if (lastDateStr < todayStr) {
      // Calculate days passed
      const lastDate = new Date(lastDateStr);
      const todayDate = new Date(todayStr);
      const diffTime = Math.abs(todayDate.getTime() - lastDate.getTime());
      const diffDays = Math.min(30, Math.max(1, Math.floor(diffTime / (1000 * 60 * 60 * 24))));

      const minInc = Number(p.dailySalesMin) || 1;
      const maxInc = Number(p.dailySalesMax) || 10;
      
      for (let day = 0; day < diffDays; day++) {
        // Random increment between 1 and 10 per day
        const dailyInc = Math.floor(Math.random() * (maxInc - minInc + 1)) + minInc;
        newSalesCount += dailyInc;
      }
      shouldUpdate = true;
    }

    if (shouldUpdate) {
      const formattedTotalSold = `${newSalesCount.toLocaleString("en-IN")}+ Sold`;
      p.salesCount = newSalesCount;
      p.totalSold = formattedTotalSold;
      p.lastSalesUpdateDate = todayStr;

      if (isDbConnected()) {
        bulkOps.push({
          updateOne: {
            filter: { id: p.id },
            update: {
              $set: {
                salesCount: newSalesCount,
                totalSold: formattedTotalSold,
                lastSalesUpdateDate: todayStr
              }
            }
          }
        });
      } else {
        const inMemIdx = inMemoryStore.products.findIndex(x => String(x.id) === String(p.id));
        if (inMemIdx >= 0) {
          inMemoryStore.products[inMemIdx].salesCount = newSalesCount;
          inMemoryStore.products[inMemIdx].totalSold = formattedTotalSold;
          inMemoryStore.products[inMemIdx].lastSalesUpdateDate = todayStr;
        }
      }
    }
  }

  if (bulkOps.length > 0 && isDbConnected()) {
    try {
      await Product.bulkWrite(bulkOps);
    } catch (err) {
      console.warn("Notice in Product bulkWrite daily sales increment:", err.message);
    }
  }

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
function normalizeProductStatus(rawStatus, defaultStatus = "Draft") {
  if (!rawStatus || typeof rawStatus !== "string") return defaultStatus;
  const s = rawStatus.trim().toLowerCase();
  if (s === "published" || s === "active") return "Published";
  if (s === "draft" || s === "inactive" || s === "archived") return "Draft";
  return defaultStatus;
}

export async function getProducts(req, res, next) {
  try {
    const isAdmin = await checkIsAdmin(req);

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
    await applyDailySalesIncrement(products);
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate, max-age=0");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    return res.json({ success: true, data: products, count: products.length });
  } catch (err) {
    console.warn("Notice in getProducts, serving in-memory catalog fallback:", err.message);
    const isAdmin = await checkIsAdmin(req).catch(() => false);
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
    await applyDailySalesIncrement(products);
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate, max-age=0");
    return res.json({ success: true, data: products, count: products.length });
  }
}

export async function getProductById(req, res, next) {
  try {
    const { id } = req.params;
    const cleanId = String(id).trim();

    const findInMemory = (targetId) => {
      const cleanTarget = targetId.toLowerCase();
      // 1. Exact match
      let p = inMemoryStore.products.find(x => 
        String(x.id).toLowerCase() === cleanTarget || 
        String(x._id || "").toLowerCase() === cleanTarget ||
        String(x.slug || "").toLowerCase() === cleanTarget
      );
      // 2. Slugified name or partial match
      if (!p) {
        p = inMemoryStore.products.find(x => {
          const xName = String(x.name || "").toLowerCase();
          const xSlugified = xName.replace(/[^\w\s-]/g, "").replace(/\s+/g, "-");
          const xSlug = String(x.slug || "").toLowerCase();
          return xSlugified === cleanTarget || 
                 (cleanTarget.length >= 3 && xSlugified.includes(cleanTarget)) ||
                 (cleanTarget.length >= 3 && cleanTarget.includes(xSlugified)) ||
                 (cleanTarget.length >= 3 && xSlug.includes(cleanTarget)) ||
                 (cleanTarget.length >= 3 && cleanTarget.includes(xSlug));
        });
      }
      return p;
    };

    if (!isDbConnected()) {
      const product = findInMemory(cleanId);
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

    await applyDailySalesIncrement([product]);

    const isAdmin = await checkIsAdmin(req);
    if (!isAdmin) {
      const currentStatus = (product.status || "Published").toLowerCase();
      if (currentStatus === "draft" || currentStatus === "inactive" || currentStatus === "archived") {
        return res.status(404).json({ success: false, message: "Product not found" });
      }
    }

    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    return res.json({ success: true, data: product });
  } catch (err) {
    console.warn("Notice in getProductById, serving in-memory product fallback:", err.message);
    const cleanId = String(req.params.id || "").trim();
    const cleanTarget = cleanId.toLowerCase();
    const product = inMemoryStore.products.find(p => {
      const pSlug = String(p.slug || "").toLowerCase();
      const pSlugified = String(p.name || "").toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-");
      return String(p.id).toLowerCase() === cleanTarget || pSlug === cleanTarget || pSlugified === cleanTarget;
    });
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }
    await applyDailySalesIncrement([product]);
    const isAdmin = await checkIsAdmin(req).catch(() => false);
    if (!isAdmin) {
      const currentStatus = (product.status || "Published").toLowerCase();
      if (currentStatus === "draft" || currentStatus === "inactive" || currentStatus === "archived") {
        return res.status(404).json({ success: false, message: "Product not found" });
      }
    }
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    return res.json({ success: true, data: product });
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
    const computedSlug = data.slug || (data.name ? String(data.name).trim().toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-") : String(id));

    const salesCountNum = Number(data.salesCount) || (data.totalSold ? parseInt(String(data.totalSold).replace(/\D/g, ""), 10) || 0 : 0);
    const totalSoldStr = data.totalSold !== undefined && String(data.totalSold).trim() ? String(data.totalSold).trim() : (salesCountNum > 0 ? `${salesCountNum}+ Sold` : "180+ Sold");

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
      img: (Array.isArray(data.images) && data.images[0]) || data.img || "/images/product-5mukhi.jpg",
      stock: data.stock !== undefined ? Number(data.stock) : 50,
      rating: Number(data.rating) || 4.9,
      reviews: Number(data.reviews || data.reviewCount) || 0,
      totalSold: totalSoldStr,
      salesCount: salesCountNum > 0 ? salesCountNum : 180,
      autoIncrementSales: data.autoIncrementSales !== undefined ? !!data.autoIncrementSales : true,
      lastSalesUpdateDate: data.lastSalesUpdateDate || new Date().toISOString().split("T")[0],
      dailySalesMin: Number(data.dailySalesMin) || 1,
      dailySalesMax: Number(data.dailySalesMax) || 10
    };

    if (!isDbConnected()) {
      const idx = inMemoryStore.products.findIndex(p => 
        String(p.id) === String(id) || (p._id && String(p._id) === String(id)) || (p.slug && p.slug === productPayload.slug)
      );
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
    let allProds = [];
    if (isDbConnected()) {
      allProds = await Product.find({}).lean();
    } else {
      allProds = [...inMemoryStore.products];
    }

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

      if (isDbConnected()) {
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
      } else {
        const inMemIdx = inMemoryStore.products.findIndex(x => String(x.id) === String(p.id));
        if (inMemIdx >= 0) {
          inMemoryStore.products[inMemIdx].salesCount = newCount;
          inMemoryStore.products[inMemIdx].totalSold = formattedTotalSold;
          inMemoryStore.products[inMemIdx].lastSalesUpdateDate = todayStr;
        }
      }
    }

    if (bulkOps.length > 0 && isDbConnected()) {
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



