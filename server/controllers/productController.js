import { Product } from "../models/Product.js";
import { isDbConnected } from "../config/db.js";
import { pickFields } from "../utils/sanitize.js";
import { isAdminUser, hasAdminRole } from "../middleware/auth.js";

const PRODUCT_FIELDS = {
  id: "string", name: "string", slug: "string", price: "number",
  comparePrice: "number", mrp: "number", discount: "number", discountPercent: "number",
  description: "string", category: "string", images: "url[]", img: "url",
  stock: "number", status: "string", tags: "string[]", highlight: "string",
  badge: "string", homeBadge: "string", showOnHome: "boolean", homeOrder: "number",
  isPopular: "boolean", rating: "number", reviews: "number", reviewCount: "number",
  customOffer: "object", origin: "string"
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
    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        error: "Database unavailable",
        message: "Database is temporarily unavailable. Please try again shortly."
      });
    }

    const isAdmin = await checkIsAdmin(req);
    let filter = {};

    if (isAdmin) {
      // Admin can view all products or filter by specific query status (e.g. ?status=Draft)
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
      // Customer / Public API: STRICT SERVER-SIDE FILTER
      // Exclude ALL draft/inactive/archived products
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
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
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
      return res.status(503).json({
        success: false,
        error: "Database unavailable",
        message: "Database is temporarily unavailable. Please try again shortly."
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
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    // Check if the caller is an authenticated admin
    const isAdmin = await checkIsAdmin(req);

    // If customer/public caller, reject Draft or Inactive products
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

export async function createProduct(req, res, next) {
  try {
    const data = pickFields(req.body, PRODUCT_FIELDS);
    if (!data.name || data.price === undefined) {
      return res.status(400).json({ success: false, message: "Name and Price are required" });
    }

    const id = data.id || Date.now().toString();
    const normalizedStatus = normalizeProductStatus(data.status, "Draft");

    const productPayload = {
      ...data,
      id,
      status: normalizedStatus,
      mrp: data.mrp || data.comparePrice || data.price,
      comparePrice: data.comparePrice || data.mrp || data.price,
      images: Array.isArray(data.images) && data.images.length > 0 ? data.images : (data.img ? [data.img] : []),
      img: (Array.isArray(data.images) && data.images[0]) || data.img || "/images/product-5mukhi.jpg",
      stock: data.stock !== undefined ? Number(data.stock) : 50,
      rating: Number(data.rating) || 4.9,
      reviews: Number(data.reviews || data.reviewCount) || 0
    };

    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        error: "Database unavailable",
        message: "Database is temporarily unavailable. Please try again shortly."
      });
    }

    const created = await Product.findOneAndUpdate(
      { id: productPayload.id },
      productPayload,
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );
    return res.status(201).json({ success: true, data: created });
  } catch (err) {
    next(err);
  }
}

export async function updateProduct(req, res, next) {
  try {
    const { id } = req.params;
    const data = pickFields(req.body, PRODUCT_FIELDS);

    const updatePayload = { ...data, id: String(id) };
    if (data.status !== undefined) {
      updatePayload.status = normalizeProductStatus(data.status, "Published");
    }
    if (data.mrp) updatePayload.comparePrice = data.mrp;
    if (data.comparePrice) updatePayload.mrp = data.comparePrice;
    if (Array.isArray(data.images) && data.images.length > 0) {
      updatePayload.img = data.images[0];
    }

    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        error: "Database unavailable",
        message: "Database is temporarily unavailable. Please try again shortly."
      });
    }

    const cleanId = String(id).trim();
    const isMongoId = /^[0-9a-fA-F]{24}$/.test(cleanId);
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
        error: "Database unavailable",
        message: "Database is temporarily unavailable. Please try again shortly."
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
    return res.json({ success: true, message: "Product deleted", id: cleanId });
  } catch (err) {
    next(err);
  }
}

