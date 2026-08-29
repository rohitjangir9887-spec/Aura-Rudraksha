import { Product } from "../models/Product.js";
import { isDbConnected } from "../config/db.js";
import { pickFields } from "../utils/sanitize.js";

const PRODUCT_FIELDS = {
  id: "string", name: "string", slug: "string", price: "number",
  comparePrice: "number", mrp: "number", discount: "number", discountPercent: "number",
  description: "string", category: "string", images: "string[]", img: "url",
  stock: "number", status: "string", tags: "string[]", highlight: "string",
  badge: "string", rating: "number", reviews: "number", reviewCount: "number",
  customOffer: "object", origin: "string"
};

export async function getProducts(req, res, next) {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        message: "Database is unavailable. Cannot retrieve products."
      });
    }
    const products = await Product.find().sort({ createdAt: -1 }).lean();
    return res.json({ success: true, data: products, count: products.length });
  } catch (err) {
    next(err);
  }
}

export async function getProductById(req, res, next) {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        message: "Database is unavailable."
      });
    }
    const { id } = req.params;
    let product = await Product.findOne({ id: String(id) }).lean();
    if (!product && id.match(/^[0-9a-fA-F]{24}$/)) {
      product = await Product.findById(id).lean();
    }
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }
    return res.json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
}

export async function saveProduct(req, res, next) {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({ success: false, message: "Database is unavailable." });
    }
    const body = pickFields(req.body, PRODUCT_FIELDS);
    if (!body.id) {
      body.id = "PROD-" + Math.floor(100000 + Math.random() * 900000);
    }
    if (!body.slug && body.name) {
      body.slug = body.name.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-");
    }
    const created = await Product.create(body);
    return res.status(201).json({ success: true, data: created });
  } catch (err) {
    next(err);
  }
}

export async function updateProduct(req, res, next) {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({ success: false, message: "Database is unavailable." });
    }
    const { id } = req.params;
    const body = pickFields(req.body, PRODUCT_FIELDS);
    if (body.name && !body.slug) {
      body.slug = body.name.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-");
    }
    let updated = await Product.findOneAndUpdate(
      { id: String(id) },
      { $set: body },
      { returnDocument: "after", runValidators: true }
    );
    if (!updated && id.match(/^[0-9a-fA-F]{24}$/)) {
      updated = await Product.findByIdAndUpdate(id, { $set: body }, { returnDocument: "after", runValidators: true });
    }
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
    if (!isDbConnected()) {
      return res.status(503).json({ success: false, message: "Database is unavailable." });
    }
    const { id } = req.params;
    let deleted = await Product.findOneAndDelete({ id: String(id) });
    if (!deleted && id.match(/^[0-9a-fA-F]{24}$/)) {
      deleted = await Product.findByIdAndDelete(id);
    }
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }
    return res.json({ success: true, message: "Product deleted successfully", data: deleted });
  } catch (err) {
    next(err);
  }
}
