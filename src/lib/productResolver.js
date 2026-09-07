import { getProductPrimaryImage } from "./imageUtils";

/**
 * Resolves a product or product variant (Nepali vs Indonesian Java) from cart line or id
 */
export function resolveCartProduct(products = [], lineOrId) {
  if (!lineOrId || !Array.isArray(products)) return null;

  const lineObj = typeof lineOrId === "object" ? lineOrId : { id: String(lineOrId) };
  const rawId = String(lineObj.id || lineObj.productId || lineObj._id || "").trim();
  if (!rawId) return null;

  const isIndo = !!lineObj.isIndonesian || 
    rawId.endsWith("-indo") || 
    rawId.includes("_indo") || 
    (typeof lineObj.variant === "string" && lineObj.variant.toLowerCase().includes("indonesian"));

  const baseId = rawId.replace(/-indo$|_indo$/i, "");

  const baseProduct = products.find(p => 
    String(p.id) === baseId || 
    String(p._id) === baseId || 
    String(p.id) === rawId ||
    String(p.slug) === baseId
  );

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
