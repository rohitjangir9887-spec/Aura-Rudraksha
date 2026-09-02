import { Product } from "../models/Product.js";
import { isDbConnected } from "../config/db.js";
import { pickFields } from "../utils/sanitize.js";
import { inMemoryStore } from "../data/inMemoryStore.js";

const PRODUCT_FIELDS = {
  id: "string", name: "string", slug: "string", price: "number",
  comparePrice: "number", mrp: "number", discount: "number", discountPercent: "number",
  description: "string", category: "string", images: "url[]", img: "url",
  stock: "number", status: "string", tags: "string[]", highlight: "string",
  badge: "string", homeBadge: "string", showOnHome: "boolean", homeOrder: "number",
  isPopular: "boolean", rating: "number", reviews: "number", reviewCount: "number",
  customOffer: "object", origin: "string"
};

export async function getProducts(req, res, next) {
  try {
    if (!isDbConnected()) {
      const data = inMemoryStore.getProducts();
      return res.json({ success: true, data, count: data.length });
    }
    const products = await Product.find().sort({ createdAt: -1 }).lean();
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
      const product = inMemoryStore.getProductById(cleanId) || inMemoryStore.getProducts().find(p => p.slug === cleanId);
      if (!product) {
        return res.status(404).json({ success: false, message: "Product not found" });
      }
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
    const productPayload = {
      ...data,
      id,
      mrp: data.mrp || data.comparePrice || data.price,
      comparePrice: data.comparePrice || data.mrp || data.price,
      images: Array.isArray(data.images) && data.images.length > 0 ? data.images : (data.img ? [data.img] : []),
      img: (Array.isArray(data.images) && data.images[0]) || data.img || "/images/product-5mukhi.jpg",
      stock: data.stock !== undefined ? Number(data.stock) : 50,
      rating: Number(data.rating) || 4.9,
      reviews: Number(data.reviews || data.reviewCount) || 0
    };

    if (!isDbConnected()) {
      const created = inMemoryStore.saveProduct(productPayload);
      return res.status(201).json({ success: true, data: created });
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
    if (data.mrp) updatePayload.comparePrice = data.mrp;
    if (data.comparePrice) updatePayload.mrp = data.comparePrice;
    if (Array.isArray(data.images) && data.images.length > 0) {
      updatePayload.img = data.images[0];
    }

    if (!isDbConnected()) {
      const updated = inMemoryStore.saveProduct(updatePayload);
      return res.json({ success: true, data: updated });
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
      inMemoryStore.deleteProduct(cleanId);
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
    return res.json({ success: true, message: "Product deleted", id: cleanId });
  } catch (err) {
    next(err);
  }
}

