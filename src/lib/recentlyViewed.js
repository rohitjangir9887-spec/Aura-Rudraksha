import { db, isPublicProduct } from "./db";

const STORAGE_KEY = "aura_recently_viewed";
const MAX_ITEMS = 10;

/**
 * Retrieve list of recently viewed products from local storage, resolved against current public products.
 */
export function getRecentlyViewedProducts() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const ids = JSON.parse(raw);
    if (!Array.isArray(ids)) return [];

    const publicProducts = db.getProducts().filter(isPublicProduct);
    const productMap = new Map();
    publicProducts.forEach((p) => {
      if (p.id) productMap.set(String(p.id), p);
      if (p._id) productMap.set(String(p._id), p);
      if (p.slug) productMap.set(String(p.slug), p);
    });

    const result = [];
    ids.forEach((id) => {
      const match = productMap.get(String(id));
      if (match && !result.some((existing) => existing.id === match.id || existing._id === match._id)) {
        result.push(match);
      }
    });

    return result.slice(0, 8);
  } catch (err) {
    console.warn("[RecentlyViewed] Error loading items:", err);
    return [];
  }
}

/**
 * Record a product as recently viewed.
 */
export function addRecentlyViewedProduct(productId) {
  if (typeof window === "undefined" || !productId) return;
  try {
    const strId = String(productId);
    const raw = localStorage.getItem(STORAGE_KEY);
    let ids = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(ids)) ids = [];

    // Filter out existing and prepend to front
    ids = [strId, ...ids.filter((id) => String(id) !== strId)].slice(0, MAX_ITEMS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));

    // Dispatch global event for reactive UI updates
    window.dispatchEvent(new CustomEvent("aura:recently-viewed-updated", { detail: { productId: strId } }));
  } catch (err) {
    console.warn("[RecentlyViewed] Error saving item:", err);
  }
}

/**
 * Clear recently viewed items.
 */
export function clearRecentlyViewed() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent("aura:recently-viewed-updated"));
  } catch (err) {
    console.warn("[RecentlyViewed] Error clearing items:", err);
  }
}
