import { getProductPrimaryImage } from "./imageUtils";
import { db } from "./db";
import { isCustomMalaLine, calculateCustomMalaPricing } from "../../shared/customMalaCatalog";

/**
 * Resolves a product or product variant (Nepali vs Indonesian Java) from cart line or id
 */
export function resolveCartProduct(products = [], lineOrId) {
  if (!lineOrId) return null;

  const lineObj = typeof lineOrId === "object" ? lineOrId : { id: String(lineOrId) };
  let rawId = String(lineObj.id || lineObj.productId || lineObj._id || "").trim();
  if (rawId && typeof rawId === "object") {
    rawId = String(rawId.id || rawId.productId || rawId._id || "").trim();
  }
  if (!rawId || rawId === "[object Object]" || rawId === "undefined" || rawId === "null") return null;

  const productPool = (Array.isArray(products) && products.length > 0) 
    ? products 
    : (db && typeof db.getProducts === "function" ? db.getProducts() : []);

  if (isCustomMalaLine(lineObj) || rawId.startsWith("custom-mala-")) {
    const calc = calculateCustomMalaPricing(lineObj.customMala || {}, productPool);
    const hasStoreProducts = Array.isArray(calc.config.products) && calc.config.products.length > 0;
    const fallbackPoolImg = (() => {
      if (calc.items[0]?.img && !calc.items[0].img.includes("placeholder.svg")) {
        return calc.items[0].img;
      }
      const matched = productPool.find((p) =>
        String(p?.category || "").toLowerCase().includes("mala") ||
        String(p?.name || "").toLowerCase().includes("5 mukhi")
      );
      return matched ? getProductPrimaryImage(matched) : "/images/placeholder.svg";
    })();
    const itemImg = lineObj.img && typeof lineObj.img === "string" && !lineObj.img.includes("placeholder.svg")
      ? lineObj.img
      : fallbackPoolImg;

    const fallbackItems = Array.isArray(lineObj.customMalaItems) ? lineObj.customMalaItems : [];
    const hasCompleteLiveCalc =
      calc.totalBeads > 0 &&
      calc.unitPrice > 0 &&
      (!Array.isArray(calc.missingProductIds) || calc.missingProductIds.length === 0);

    const resolvedMalaItems = hasCompleteLiveCalc
      ? calc.items
      : (fallbackItems.length >= calc.items.length ? fallbackItems : calc.items);
    const resolvedBeadCount =
      resolvedMalaItems.reduce((s, b) => s + Math.max(1, Number(b?.qty) || 1), 0) || calc.totalBeads;

    const snapshotBeadSubtotal = fallbackItems.reduce((sum, b) => {
      const qty = Math.max(1, Number(b?.qty || b?.quantity) || 1);
      const unitP = Math.max(0, Math.round(Number(b?.unitPrice ?? b?.price) || 0));
      const lineT = Math.max(0, Math.round(Number(b?.lineTotal) || unitP * qty));
      return sum + lineT;
    }, 0);
    const snapshotTotal =
      snapshotBeadSubtotal > 0
        ? snapshotBeadSubtotal + (Number(calc.threadFee) || 0) + (Number(calc.cappingFee) || 0)
        : 0;

    const resolvedPrice = hasCompleteLiveCalc
      ? calc.unitPrice
      : Math.max(Number(lineObj.price || lineObj.unitPrice) || 0, snapshotTotal, calc.unitPrice || 0);
    const resolvedMrp = hasCompleteLiveCalc
      ? calc.mrp
      : Math.max(resolvedPrice, Number(lineObj.mrp || lineObj.comparePrice) || 0, calc.mrp || 0);

    return {
      id: rawId,
      productId: rawId,
      cartItemId: rawId,
      name: hasCompleteLiveCalc ? calc.name : (lineObj.name || calc.name),
      category: "Custom Sacred Mala",
      origin: "Hand-Strung Custom Sacred Mala",
      resolvedOrigin: "Hand-Strung Custom Sacred Mala",
      isIndonesian: false,
      isCustomMala: true,
      customMala: calc.config,
      customMalaItems: resolvedMalaItems,
      customDescription: hasCompleteLiveCalc
        ? calc.customDescription
        : (lineObj.customDescription || calc.customDescription),
      price: resolvedPrice,
      mrp: resolvedMrp,
      img: itemImg,
      images: [itemImg],
      size: hasStoreProducts ? `${resolvedBeadCount} Sacred Bead${resolvedBeadCount === 1 ? "" : "s"}` : calc.sizeObj.label,
      variant: hasStoreProducts
        ? `${resolvedMalaItems.length} Product${resolvedMalaItems.length === 1 ? "" : "s"} • Hand-Strung`
        : `${calc.threadObj.shortLabel} • ${calc.cappingObj.shortLabel}`,
      stock: 99
    };
  }

  const isIndo = !!lineObj.isIndonesian || 
    rawId.endsWith("-indo") || 
    rawId.includes("_indo") || 
    (typeof lineObj.variant === "string" && lineObj.variant.toLowerCase().includes("indonesian"));

  const baseId = rawId.replace(/-indo$|_indo$/i, "");

  // 1. Strict exact ID or Mongo _ID match (prevents slug collision with another product's ID)
  let baseProduct = productPool.find(p => 
    p && (
      String(p.id) === baseId || 
      String(p._id) === baseId || 
      String(p.id) === rawId ||
      String(p._id) === rawId
    )
  );

  // 2. Secondary slug match only if exact ID match was not found
  if (!baseProduct) {
    baseProduct = productPool.find(p => p && (String(p.slug) === baseId || String(p.slug) === rawId));
  }

  if (!baseProduct && db && typeof db.getProduct === "function") {
    baseProduct = db.getProduct(baseId) || db.getProduct(rawId);
  }

  if (!baseProduct) return null;

  if (!isIndo) {
    return {
      ...baseProduct,
      cartItemId: rawId,
      resolvedOrigin: baseProduct.origin || "Nepal (Himalayan Origin)",
      isIndonesian: false
    };
  }

  const indoImages = (Array.isArray(baseProduct.indonesianImages) && baseProduct.indonesianImages.length > 0)
    ? baseProduct.indonesianImages
    : (baseProduct.indonesianImg ? [baseProduct.indonesianImg] : baseProduct.images);

  const indoPrice = Number(baseProduct.indonesianPrice) > 0 ? Number(baseProduct.indonesianPrice) : baseProduct.price;
  const indoMrp = Number(baseProduct.indonesianMrp) > 0 ? Number(baseProduct.indonesianMrp) : (Number(baseProduct.indonesianPrice) || baseProduct.mrp);

  return {
    ...baseProduct,
    id: rawId,
    productId: baseProduct.id,
    cartItemId: rawId,
    name: baseProduct.indonesianTitle || `${baseProduct.name} (Indonesian / Java Origin)`,
    price: indoPrice,
    mrp: indoMrp,
    img: baseProduct.indonesianImg || (indoImages && indoImages[0]) || baseProduct.img,
    images: indoImages,
    size: baseProduct.indonesianSize || "Small Java Bead (10–14 mm)",
    origin: "Java / Indonesia",
    resolvedOrigin: "Java / Indonesia",
    isIndonesian: true
  };
}
