import { products as defaultProducts } from "../data/index.js";
import { authClient } from "./authClient.js";

// Event Broadcasters for real-time React UI updates
export const emitStoreUpdate = (type, payload) => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("aura:store-updated", {
        detail: { type, payload, timestamp: Date.now() }
      })
    );
  }
};

export const onStoreUpdate = (callback) => {
  if (typeof window === "undefined") return () => {};
  const handler = (event) => callback(event.detail || {});
  window.addEventListener("aura:store-updated", handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener("aura:store-updated", handler);
    window.removeEventListener("storage", handler);
  };
};

// API Base URL
// Defaults to same-origin "/api" (works when Express serves the built frontend).
// For split deployments (Cloudflare Pages frontend + separate Node backend),
// set VITE_API_BASE_URL="https://api.yourdomain.com/api" at build time.
const API_BASE = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");

// Request Deduplication Map for in-flight GET requests
const pendingGetRequests = new Map();

// Helper for safe API calls with deduplication, timeouts, and error classification
async function apiRequest(endpoint, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  const isGet = method === "GET";

  // Deduplicate GET requests
  if (isGet && !options.noCache) {
    if (pendingGetRequests.has(endpoint)) {
      return pendingGetRequests.get(endpoint);
    }
  }

  const execute = async () => {
    const controller = new AbortController();
    const defaultTimeout = isGet ? 15000 : 35000;
    const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs || defaultTimeout);

    try {
      const token = await authClient.getToken().catch(() => "");
      const res = await fetch(`${API_BASE}${endpoint}`, {
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
          ...(options.headers || {})
        },
        ...options
      });

      clearTimeout(timeoutId);

      const contentType = res.headers?.get("content-type") || "";
      let data = {};
      if (contentType.includes("application/json")) {
        data = await res.json().catch(() => ({}));
      } else {
        return {
          success: false,
          status: res.status,
          message: `Endpoint unavailable (${res.status})`
        };
      }

      if (!res.ok) {
        return {
          success: false,
          status: res.status,
          message: data.message || `Server error (${res.status}): ${res.statusText || "Request failed"}`
        };
      }
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === "AbortError") {
        return {
          success: false,
          status: 408,
          message: "Request timed out. Please try again."
        };
      }
      return {
        success: false,
        status: 503,
        message: error.message || "Network error. Database unavailable."
      };
    }
  };

  if (isGet && !options.noCache) {
    const promise = execute().finally(() => {
      pendingGetRequests.delete(endpoint);
    });
    pendingGetRequests.set(endpoint, promise);
    return promise;
  }

  return execute();
}

// Deleted review tracking to ensure deleted reviews are never resurrected on refresh
function getDeletedReviewIds() {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem("aura_deleted_review_ids");
    if (raw) return new Set(JSON.parse(raw));
  } catch (_) {}
  return new Set();
}

function recordDeletedReviewId(id) {
  if (typeof window === "undefined" || !id) return;
  try {
    const set = getDeletedReviewIds();
    set.add(String(id));
    localStorage.setItem("aura_deleted_review_ids", JSON.stringify(Array.from(set)));
  } catch (_) {}
}

export function isPublicProduct(p) {
  if (!p) return false;
  const s = String(p.status || "").trim().toLowerCase();
  if (s === "draft" || s === "inactive" || s === "archived") return false;
  return true;
}

// Live MongoDB Data Store Cache with initial catalog for UI rendering
const storeCache = {
  products: defaultProducts.map(p => ({
    ...p,
    id: String(p.id),
    status: p.status || "Published",
    category: p.category || "Rudraksha",
    stock: p.stock !== undefined ? p.stock : 50,
    showOnHome: p.showOnHome !== undefined ? p.showOnHome : true,
    isPopular: !!p.isPopular,
    homeOrder: p.homeOrder || 0,
    homeBadge: p.homeBadge || p.badge || "",
    mrp: p.mrp || p.comparePrice || p.price,
    comparePrice: p.comparePrice || p.mrp || p.price,
    images: (Array.isArray(p.images) && p.images.length > 0) ? p.images : [p.img || "/images/product-5mukhi.jpg"]
  })),
  orders: [],
  customers: [],
  coupons: [
    { id: "COUP-AURA10", code: "AURA10", discount: 10, type: "percentage", limit: 1000, status: "Active", usage: 0 },
    { id: "COUP-AURA20", code: "AURA20", discount: 20, type: "percentage", limit: 500, status: "Active", usage: 0 },
    { id: "COUP-SHRAWAN200", code: "SHRAWAN200", discount: 200, type: "fixed", limit: 1000, status: "Active", usage: 0 }
  ],
  promotions: [],
  offers: [
    {
      id: "OFF-1",
      title: "Flat 20% OFF",
      label: "Special Offer",
      description: "On All Rudraksha",
      buttonText: "Shop Now",
      link: "/shop",
      image: "https://i.ibb.co/xKN0T46x/file-00000000b33082088625dc1f759658a4.png",
      type: "Percentage",
      discountValue: 20,
      couponCode: "AURA20",
      shownOn: "Home Banner",
      status: "Active",
      order: 1
    },
    {
      id: "OFF-2",
      title: "Lab Tested & Certified",
      label: "100% Authentic",
      description: "Quality you can trust.",
      buttonText: "Shop Now",
      link: "/shop",
      image: "https://i.ibb.co/ymXRsrZk/file-0000000030c48208b839cd9a8978bb05.png",
      type: "Feature",
      discountValue: 0,
      couponCode: "",
      shownOn: "Home Banner",
      status: "Active",
      theme: "light",
      order: 2
    },
    {
      id: "OFF-3",
      title: "On Orders Above ₹1499",
      label: "Free Shipping",
      description: "Fast & Reliable delivery.",
      buttonText: "Shop Now",
      link: "/shop",
      image: "https://i.ibb.co/BVtGczcQ/file-00000000ee808211869df734ac614fe5.png",
      type: "Shipping",
      discountValue: 0,
      couponCode: "",
      shownOn: "Home Banner",
      status: "Active",
      theme: "light",
      order: 3
    }
  ],
  activeOffer: {
    id: "OFFER-CENTRAL-1",
    enabled: true,
    status: "Active",
    title: "₹200 OFF",
    subtitle: "Limited Time Festival Offer",
    couponCode: "SHRAWAN200",
    discountType: "fixed",
    discountValue: 200,
    startDate: new Date(Date.now() - 3600000).toISOString(),
    startAt: new Date(Date.now() - 3600000).toISOString(),
    expiresAt: new Date(Date.now() + 2 * 24 * 3600000 + 5 * 3600000 + 40 * 60000).toISOString(),
    expiry: new Date(Date.now() + 2 * 24 * 3600000 + 5 * 3600000 + 40 * 60000).toISOString(),
    backgroundColor: "#2b170d",
    textColor: "#fbf5ef",
    accentColor: "#c89b3c",
    badgeColor: "#7a320c",
    borderColor: "#4b2614",
    buttonColor: "#c89b3c",
    topStripEnabled: false,
    heroEnabled: false,
    productCardEnabled: false,
    productPageEnabled: false,
    imageBadgeEnabled: false,
    floatingEnabled: false,
    stickyEnabled: false,
    popupEnabled: false,
    timerEnabled: false,
    marqueeEnabled: true,
    popupDelay: 10,
    scrollTrigger: 400,
    animationStyle: "fade"
  },
  banners: [
    "https://i.ibb.co/Pvb9qZy7/file-00000000310082118c0c939fa357349f.png",
    "https://i.ibb.co/23zYS09n/file-00000000886c82118cc5dc60c8082572.png",
    "https://i.ibb.co/vvjdFqNQ/file-0000000057548208a095c1d1fc26f78c.jpg"
  ],
  reviews: [],
  reviewSettings: {
    enabled: true,
    photoGalleryEnabled: true,
    writeReviewEnabled: true,
    verifiedBadgeEnabled: true,
    helpfulVotingEnabled: true,
    perPage: 6,
    defaultSort: "recent",
    cardStyle: {
      borderRadius: "18px",
      bgColor: "#fffdf9",
      borderColor: "#eadecd",
      textColor: "#2b1810",
      accentColor: "#b45309"
    }
  },
  settings: {
    storeName: "Aura Rudraksha",
    supportEmail: "aurarudrakshaofficial@gmail.com",
    supportPhone: "+91 9672996531",
    currency: "INR",
    instagramUrl: "https://instagram.com/aurarudraksha",
    facebookUrl: "https://facebook.com/aurarudraksha",
    youtubeUrl: "https://youtube.com/@aurarudraksha"
  },
  policies: null,
  tickets: [],
  analytics: { visits: 0, productViews: 0, hasData: false },
  votesMap: {},
  dbStatus: "unknown" // "connected" | "disconnected" | "unknown"
};

// Domain-Separated Hydration Engine
// Home page fetches ONLY public customer data (products, banners, offers, settings)
// Admin pages fetch admin endpoints (orders, customers, coupons, analytics) on demand
const CACHE_FRESHNESS_LIMIT = 4000; // 4 seconds for fast background revalidation
const CACHE_OBSOLETE_LIMIT = 24 * 60 * 60 * 1000; // 24 hours for complete cache expiration

let isInitialized = false;
let isHydrated = false;
let hydrationResolver = null;
let hydrationPromise = new Promise((resolve) => {
  hydrationResolver = resolve;
});

export function loadCacheFromLocalStorage() {
  if (typeof window === "undefined") return;
  try {
    const cachedProducts = localStorage.getItem("aura_products_cache");
    if (cachedProducts) {
      const parsed = JSON.parse(cachedProducts);
      if (Array.isArray(parsed) && parsed.length > 0) {
        storeCache.products = parsed;
      }
    }
    const cachedBanners = localStorage.getItem("aura_banners_cache");
    if (cachedBanners) {
      const parsed = JSON.parse(cachedBanners);
      if (Array.isArray(parsed) && parsed.length > 0) storeCache.banners = parsed;
    }
    const cachedOffers = localStorage.getItem("aura_offers_cache");
    if (cachedOffers) {
      const parsed = JSON.parse(cachedOffers);
      if (Array.isArray(parsed) && parsed.length > 0) storeCache.offers = parsed;
    }
    const cachedActiveOffer = localStorage.getItem("aura_active_offer_cache");
    if (cachedActiveOffer) {
      const parsed = JSON.parse(cachedActiveOffer);
      if (parsed && typeof parsed === "object") storeCache.activeOffer = parsed;
    }
    const cachedCoupons = localStorage.getItem("aura_coupons_cache");
    if (cachedCoupons) {
      const parsed = JSON.parse(cachedCoupons);
      if (Array.isArray(parsed)) storeCache.coupons = parsed;
    }
    const cachedSettings = localStorage.getItem("aura_settings_cache");
    if (cachedSettings) {
      const parsed = JSON.parse(cachedSettings);
      if (parsed && typeof parsed === "object") storeCache.settings = { ...storeCache.settings, ...parsed };
    }
    const cachedReviewSettings = localStorage.getItem("aura_review_settings_cache");
    if (cachedReviewSettings) {
      const parsed = JSON.parse(cachedReviewSettings);
      if (parsed && typeof parsed === "object") storeCache.reviewSettings = { ...storeCache.reviewSettings, ...parsed };
    }
    const cachedReviews = localStorage.getItem("aura_reviews_cache");
    if (cachedReviews) {
      const parsed = JSON.parse(cachedReviews);
      if (Array.isArray(parsed)) storeCache.reviews = parsed;
    }
    
    // Check if we have a valid, unexpired cache
    const lastFetch = Number(localStorage.getItem("aura_last_fetch_time") || 0);
    const hasRealCache = localStorage.getItem("aura_cache_hydrated") === "true";
    if (hasRealCache && (Date.now() - lastFetch < CACHE_OBSOLETE_LIMIT)) {
      isHydrated = true;
      if (hydrationResolver) {
        hydrationResolver(true);
      }
    }
  } catch (err) {
    console.warn("Error loading local storage cache:", err);
  }
}

const PRODUCT_FRESHNESS_LIMIT = 3500; // Short 3.5s window for fast live sync
let lastProductFetchTime = Number((typeof localStorage !== "undefined" && localStorage.getItem("aura_last_product_fetch_time")) || 0);
let inFlightProductsPromise = null;

export async function revalidateProducts(force = false) {
  if (typeof window === "undefined") return storeCache.products;

  if (!force && inFlightProductsPromise) {
    return inFlightProductsPromise;
  }

  const now = Date.now();
  if (!force && lastProductFetchTime > 0 && (now - lastProductFetchTime < PRODUCT_FRESHNESS_LIMIT)) {
    return storeCache.products;
  }

  inFlightProductsPromise = (async () => {
    try {
      const res = await apiRequest(`/products?_t=${now}`, { noCache: true });
      if (res?.success && Array.isArray(res.data)) {
        storeCache.dbStatus = "connected";
        const normalized = res.data.map(p => ({
          ...p,
          id: String(p.id || p._id),
          showOnHome: p.showOnHome !== undefined ? p.showOnHome : true,
          isPopular: !!p.isPopular,
          homeOrder: Number(p.homeOrder) || 0,
          homeBadge: p.homeBadge || p.badge || "",
          mrp: p.mrp || p.comparePrice || p.price,
          comparePrice: p.comparePrice || p.mrp || p.price,
          images: (Array.isArray(p.images) && p.images.length > 0) ? p.images : [p.img || "/images/product-5mukhi.jpg"]
        }));

        storeCache.products = normalized;
        lastProductFetchTime = Date.now();
        try {
          localStorage.setItem("aura_products_cache", JSON.stringify(storeCache.products));
          localStorage.setItem("aura_last_product_fetch_time", String(lastProductFetchTime));
          localStorage.setItem("aura_cache_hydrated", "true");
        } catch (_) {}

        emitStoreUpdate("products:synced", storeCache.products);
      } else if (res?.status === 503 || res?.error === "Database unavailable") {
        storeCache.dbStatus = "disconnected";
      }
    } catch (e) {
      console.warn("Product revalidation background error:", e);
    } finally {
      inFlightProductsPromise = null;
    }
    return storeCache.products;
  })();

  return inFlightProductsPromise;
}

export async function fetchHomeData(force = false) {
  if (typeof window === "undefined") return;

  // Always revalidate products independently so updates propagate quickly
  revalidateProducts(force).catch(() => {});

  // Deduplicate background fetches for other home resources
  if (globalThis.__aura_fetching_home) {
    return globalThis.__aura_fetching_home_promise;
  }

  // Check background freshness limit for secondary resources (banners, offers, reviews, settings)
  const lastFetch = Number(localStorage.getItem("aura_last_fetch_time") || 0);
  const isCacheHydrated = localStorage.getItem("aura_cache_hydrated") === "true";
  
  if (!force && isCacheHydrated && (Date.now() - lastFetch < CACHE_FRESHNESS_LIMIT)) {
    isHydrated = true;
    if (hydrationResolver) hydrationResolver(true);
    return;
  }

  const fetchPromise = (async () => {
    try {
      globalThis.__aura_fetching_home = true;

      // Parallel but decoupled fetches
      const fetchProducts = async () => {
        await revalidateProducts(force);
      };

      const fetchActiveOffer = async () => {
        try {
          const res = await apiRequest("/active-offer");
          if (res?.success && res.data) {
            const expiresAt = res.data.expiresAt || res.data.expiry;
            const startDate = res.data.startDate || res.data.startAt;
            storeCache.activeOffer = { 
              ...res.data,
              expiresAt,
              expiry: expiresAt,
              startDate,
              startAt: startDate
            };
            localStorage.setItem("aura_active_offer_cache", JSON.stringify(storeCache.activeOffer));
            emitStoreUpdate("active-offer:synced", storeCache.activeOffer);
          }
        } catch (e) {
          console.warn("Failed background active offer fetch:", e);
        }
      };

      const fetchOffers = async () => {
        try {
          const res = await apiRequest("/offers");
          if (res?.success && Array.isArray(res.data)) {
            storeCache.offers = res.data;
            localStorage.setItem("aura_offers_cache", JSON.stringify(storeCache.offers));
            emitStoreUpdate("offers:synced", storeCache.offers);
          }
        } catch (e) {
          console.warn("Failed background offers fetch:", e);
        }
      };

      const fetchBanners = async () => {
        try {
          const res = await apiRequest("/banners");
          if (res?.success && Array.isArray(res.data)) {
            storeCache.banners = res.data;
            localStorage.setItem("aura_banners_cache", JSON.stringify(storeCache.banners));
            emitStoreUpdate("banners:synced", storeCache.banners);
          }
        } catch (e) {
          console.warn("Failed background banners fetch:", e);
        }
      };

      const fetchReviews = async () => {
        try {
          const res = await apiRequest("/reviews");
          if (res?.success && Array.isArray(res.data)) {
            const deletedIds = getDeletedReviewIds();
            storeCache.reviews = res.data.filter(r => !deletedIds.has(String(r.id)) && r.status !== "deleted");
            localStorage.setItem("aura_reviews_cache", JSON.stringify(storeCache.reviews));
            emitStoreUpdate("reviews:synced", storeCache.reviews);
          }
        } catch (e) {
          console.warn("Failed background reviews fetch:", e);
        }
      };

      const fetchSettings = async () => {
        try {
          const res = await apiRequest("/settings");
          if (res?.success && res.data) {
            storeCache.settings = { ...storeCache.settings, ...res.data };
            localStorage.setItem("aura_settings_cache", JSON.stringify(storeCache.settings));
            emitStoreUpdate("settings:synced", storeCache.settings);
          }
        } catch (e) {
          console.warn("Failed background settings fetch:", e);
        }
      };

      const fetchReviewSettings = async () => {
        try {
          const res = await apiRequest("/reviews/settings");
          if (res?.success && res.data) {
            storeCache.reviewSettings = { ...storeCache.reviewSettings, ...res.data };
            localStorage.setItem("aura_review_settings_cache", JSON.stringify(storeCache.reviewSettings));
            emitStoreUpdate("review-settings:synced", storeCache.reviewSettings);
          }
        } catch (e) {
          console.warn("Failed background review settings fetch:", e);
        }
      };

      const fetchCoupons = async () => {
        try {
          const res = await apiRequest("/coupons");
          if (res?.success && Array.isArray(res.data)) {
            storeCache.coupons = res.data;
            localStorage.setItem("aura_coupons_cache", JSON.stringify(storeCache.coupons));
            emitStoreUpdate("coupons:synced", storeCache.coupons);
          }
        } catch (e) {
          console.warn("Failed background coupons fetch:", e);
        }
      };

      await Promise.all([
        fetchProducts(),
        fetchActiveOffer(),
        fetchOffers(),
        fetchBanners(),
        fetchReviews(),
        fetchSettings(),
        fetchReviewSettings(),
        fetchCoupons()
      ]);

      localStorage.setItem("aura_last_fetch_time", String(Date.now()));
      isHydrated = true;
      if (hydrationResolver) hydrationResolver(true);

      emitStoreUpdate("home:synced", { dbStatus: storeCache.dbStatus, timestamp: Date.now() });
    } catch (err) {
      storeCache.dbStatus = "disconnected";
      isHydrated = true;
      if (hydrationResolver) hydrationResolver(true);
      console.warn("Error inside background home data hydration:", err.message);
    } finally {
      globalThis.__aura_fetching_home = false;
    }
  })();

  globalThis.__aura_fetching_home_promise = fetchPromise;
  return fetchPromise;
}

export async function fetchAdminData() {
  try {
    const [ordersRes, customersRes, couponsRes] = await Promise.all([
      apiRequest("/orders"),
      apiRequest("/customers"),
      apiRequest("/coupons")
    ]);

    if (ordersRes?.success && Array.isArray(ordersRes.data)) {
      storeCache.orders = ordersRes.data;
    }
    if (customersRes?.success && Array.isArray(customersRes.data)) {
      storeCache.customers = customersRes.data;
    }
    if (couponsRes?.success && Array.isArray(couponsRes.data)) {
      storeCache.coupons = couponsRes.data;
    }

    emitStoreUpdate("admin:synced", { timestamp: Date.now() });
  } catch (err) {
    console.warn("[Aura DB] Admin data fetch notice:", err.message);
  }
}

async function hydrateFromBackend() {
  await fetchHomeData(true);
}

// Auto-trigger initial home data fetch on load
if (typeof window !== "undefined" && !isInitialized) {
  isInitialized = true;
  loadCacheFromLocalStorage();
  fetchHomeData();

  // Sync on tab focus / visibility change without global polling loop
  window.addEventListener("focus", () => {
    fetchHomeData();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      fetchHomeData();
    }
  });
}

// ----------------------------------------------------
// UNIFIED DATABASE OBJECT CONNECTED TO MONGODB API
// ----------------------------------------------------
export const db = {
  // Check Database Health
  checkDbHealth: async () => {
    const res = await apiRequest("/health");
    return {
      connected: res?.database === "connected",
      status: res?.status || "unavailable",
      message: res?.message || ""
    };
  },

  // Manual Trigger to re-fetch from MongoDB
  syncFromBackend: async () => {
    await hydrateFromBackend();
  },

  // Hydration State Checkers
  isHydrated: () => isHydrated,
  fetchHomeData: async (force = false) => {
    return await fetchHomeData(force);
  },
  waitForHydration: async () => {
    if (hydrationPromise) {
      await hydrationPromise;
    }
    return isHydrated;
  },

  // PRODUCTS
  getProducts: () => {
    return storeCache.products.map(p => ({
      ...p,
      id: String(p.id || p._id),
      mrp: p.mrp || p.comparePrice || p.price,
      comparePrice: p.comparePrice || p.mrp || p.price,
      images: (Array.isArray(p.images) && p.images.length > 0)
        ? p.images
        : [p.img || "/images/product-5mukhi.jpg"]
    }));
  },

  getProduct: (idOrSlug) => {
    if (!idOrSlug) return null;
    const target = String(idOrSlug).trim().toLowerCase();
    const p = storeCache.products.find(x => 
      String(x.id || "").toLowerCase() === target ||
      (x._id && String(x._id).toLowerCase() === target) ||
      (x.slug && String(x.slug).toLowerCase() === target)
    );
    if (!p) return null;
    return {
      ...p,
      id: String(p.id || p._id),
      mrp: p.mrp || p.comparePrice || p.price,
      comparePrice: p.comparePrice || p.mrp || p.price,
      images: (Array.isArray(p.images) && p.images.length > 0)
        ? p.images
        : [p.img || "/images/product-5mukhi.jpg"]
    };
  },

  getProductAsync: async (idOrSlug) => {
    if (!idOrSlug) return null;

    // 1. Check in-memory storeCache immediately
    const cached = db.getProduct(idOrSlug);
    if (cached) return cached;

    // 2. Direct API lookup for fast single-item load
    const res = await apiRequest(`/products/${encodeURIComponent(idOrSlug)}`);
    if (res?.success && res.data) {
      const p = res.data;
      const normalized = {
        ...p,
        id: String(p.id || p._id),
        mrp: p.mrp || p.comparePrice || p.price,
        comparePrice: p.comparePrice || p.mrp || p.price,
        images: (Array.isArray(p.images) && p.images.length > 0) ? p.images : [p.img || "/images/product-5mukhi.jpg"]
      };
      const idx = storeCache.products.findIndex(x =>
        String(x.id) === String(normalized.id) || (x._id && String(x._id) === String(p._id)) || (x.slug && x.slug === p.slug)
      );
      if (idx >= 0) {
        storeCache.products[idx] = normalized;
      } else {
        storeCache.products.push(normalized);
      }
      return normalized;
    }

    // 3. Fallback: wait for initial home sync if API call didn't return
    await db.waitForHydration();
    return db.getProduct(idOrSlug);
  },

  revalidateProducts: async (force = false) => {
    return await revalidateProducts(force);
  },

  isPublicProduct: (p) => {
    return isPublicProduct(p);
  },

  fetchProducts: async (force = false) => {
    return await revalidateProducts(force);
  },

  saveProduct: async (p) => {
    const id = p.id ? String(p.id) : (p._id ? String(p._id) : Date.now().toString());
    const imgs = (Array.isArray(p.images) && p.images.length > 0) ? p.images : (p.img ? [p.img] : ["/images/product-5mukhi.jpg"]);
    const primaryImg = p.img || imgs[0];

    const rawStatus = p.status || "Draft";
    const normalizedStatus = (rawStatus === "Published" || rawStatus === "Active" || rawStatus === "published") ? "Published" : "Draft";

    const finalProduct = {
      ...p,
      id,
      img: primaryImg,
      images: imgs,
      mrp: Number(p.mrp) || Number(p.comparePrice) || Number(p.price) || 0,
      comparePrice: Number(p.comparePrice) || Number(p.mrp) || Number(p.price) || 0,
      price: Number(p.price) || 0,
      stock: Number(p.stock) >= 0 ? Number(p.stock) : 50,
      status: normalizedStatus,
      showOnHome: p.showOnHome !== undefined ? !!p.showOnHome : true,
      isPopular: !!p.isPopular,
      homeOrder: Number(p.homeOrder) || 0,
      homeBadge: p.homeBadge || p.badge || ""
    };

    const res = await apiRequest("/products", {
      method: "POST",
      body: JSON.stringify(finalProduct)
    });

    if (!res?.success) {
      throw new Error(res?.message || "Failed to save product. Database is unavailable.");
    }

    const savedData = res.data || finalProduct;
    const strId = String(savedData.id || id);
    const mongoId = savedData._id ? String(savedData._id) : null;

    const currentIdx = storeCache.products.findIndex(x =>
      String(x.id) === strId || (mongoId && String(x._id) === mongoId) || (x.slug && x.slug === savedData.slug)
    );

    const normalizedSaved = {
      ...savedData,
      id: String(savedData.id || savedData._id || id),
      mrp: savedData.mrp || savedData.comparePrice || savedData.price,
      comparePrice: savedData.comparePrice || savedData.mrp || savedData.price,
      images: (Array.isArray(savedData.images) && savedData.images.length > 0) ? savedData.images : [savedData.img || "/images/product-5mukhi.jpg"]
    };

    if (currentIdx >= 0) {
      storeCache.products[currentIdx] = normalizedSaved;
    } else {
      storeCache.products.unshift(normalizedSaved);
    }

    try {
      localStorage.setItem("aura_products_cache", JSON.stringify(storeCache.products));
      localStorage.setItem("aura_cache_hydrated", "true");
      localStorage.setItem("aura_last_fetch_time", "0"); // Invalidate freshness for re-sync
      localStorage.setItem("aura_last_product_fetch_time", "0");
    } catch (_) {}

    emitStoreUpdate("product:saved", normalizedSaved);
    revalidateProducts(true).catch(() => {});
    fetchHomeData(true).catch(() => {}); // Force background sync across app
    return normalizedSaved;
  },

  toggleProductHomeShowcase: async (id, showOnHome) => {
    const strId = String(id);
    const prod = db.getProduct(strId);
    if (!prod) return null;
    const updated = {
      ...prod,
      showOnHome: Boolean(showOnHome)
    };
    return await db.saveProduct(updated);
  },

  deleteProduct: async (id) => {
    const strId = String(id);
    const res = await apiRequest(`/products/${strId}`, { method: "DELETE" });
    if (!res?.success) {
      throw new Error(res?.message || "Failed to delete product. Database is unavailable.");
    }
    storeCache.products = storeCache.products.filter(p =>
      String(p.id) !== strId && String(p._id) !== strId && p.slug !== strId
    );

    try {
      localStorage.setItem("aura_products_cache", JSON.stringify(storeCache.products));
      localStorage.setItem("aura_cache_hydrated", "true");
      localStorage.setItem("aura_last_fetch_time", "0"); // Invalidate freshness for re-sync
      localStorage.setItem("aura_last_product_fetch_time", "0");
    } catch (_) {}

    emitStoreUpdate("product:deleted", strId);
    revalidateProducts(true).catch(() => {});
    fetchHomeData(true).catch(() => {}); // Force background sync across app
    return true;
  },

  // ORDERS
  getOrders: () => storeCache.orders,

  // WISHLIST API
  getWishlist: async () => {
    return await apiRequest("/wishlist");
  },
  addToWishlist: async (productId) => {
    return await apiRequest("/wishlist", {
      method: "POST",
      body: JSON.stringify({ productId })
    });
  },
  removeFromWishlist: async (productId) => {
    return await apiRequest(`/wishlist/${productId}`, {
      method: "DELETE"
    });
  },

  getMyOrders: async () => {
    const user = authClient.getUser();
    const userEmail = (user?.email || "").trim().toLowerCase();
    
    // Strict privacy: If user is not logged in, return empty orders list
    if (!user || user.isAnonymous || !userEmail) {
      return { success: true, data: [] };
    }

    try {
      const res = await apiRequest("/orders/my");
      if (res?.success && Array.isArray(res.data)) {
        return res;
      }
    } catch (_) {}

    let userOrders = [];
    if (userEmail) {
      userOrders = storeCache.orders.filter(o =>
        (o.customerEmail || "").toLowerCase() === userEmail ||
        (o.email || "").toLowerCase() === userEmail ||
        (o.shippingAddress?.email || "").toLowerCase() === userEmail ||
        (o.userEmail || "").toLowerCase() === userEmail
      );
    }
    return { success: true, data: userOrders };
  },

  getOrder: async (id) => {
    const strId = String(id).trim().toUpperCase();
    try {
      const res = await apiRequest(`/orders/${id}`);
      if (res?.success && res.data) {
        return res;
      }
    } catch (_) {}

    const order = storeCache.orders.find(o =>
      String(o.id).toUpperCase() === strId ||
      String(o.orderId).toUpperCase() === strId
    );
    if (order) {
      return { success: true, data: order };
    }
    return { success: false, message: "Order not found" };
  },

  updateOrder: async (id, data) => {
    const res = await apiRequest(`/orders/${id}`, {
      method: "PUT",
      body: JSON.stringify(data)
    });
    if (!res?.success) {
      throw new Error(res?.message || "Failed to update order. Database is unavailable.");
    }
    const serverUpdated = res.data;
    const strId = String(id).trim().toUpperCase();
    const idx = storeCache.orders.findIndex(o =>
      String(o.id).toUpperCase() === strId ||
      String(o.orderId).toUpperCase() === strId
    );
    if (idx >= 0) {
      storeCache.orders[idx] = {
        ...storeCache.orders[idx],
        ...data,
        ...(serverUpdated || {})
      };
      emitStoreUpdate("order:updated", storeCache.orders[idx]);
      return { success: true, data: storeCache.orders[idx] };
    }
    return { success: true, data: serverUpdated || data };
  },

  fetchOrders: async () => {
    const res = await apiRequest("/orders");
    if (res?.success && Array.isArray(res.data)) {
      storeCache.orders = res.data;
      return storeCache.orders;
    }
    if (res?.status === 503 || res?.error === "Database unavailable" || res?.success === false) {
      throw new Error(res?.message || "Database unavailable");
    }
    return storeCache.orders;
  },

  saveOrder: async (o) => {
    const id = o.id || o.orderId || ("ORD-" + Math.floor(1000 + Math.random() * 9000));
    const now = new Date().toISOString();
    const finalOrder = {
      ...o,
      id,
      orderId: id,
      date: o.date || now,
      amount: o.amount || o.total || o.finalAmount || 0,
      total: o.total || o.amount || o.finalAmount || 0,
      finalAmount: o.finalAmount || o.total || o.amount || 0,
      status: o.status || o.orderStatus || "Confirmed"
    };

    const res = await apiRequest("/orders", {
      method: "POST",
      body: JSON.stringify(finalOrder)
    });
    if (!res?.success) {
      throw new Error(res?.message || "Failed to save order. Database is unavailable.");
    }

    const savedData = res.data || finalOrder;
    const idx = storeCache.orders.findIndex(x => String(x.id) === String(id));
    if (idx >= 0) {
      storeCache.orders[idx] = { ...storeCache.orders[idx], ...savedData };
    } else {
      storeCache.orders.unshift(savedData);
    }
    try {
      localStorage.setItem("aura_orders_cache", JSON.stringify(storeCache.orders.slice(0, 50)));
    } catch (_) {}
    emitStoreUpdate("order:saved", savedData);
    return savedData;
  },

  // PAYU LIVE PAYMENT GATEWAY INTEGRATION
  initiatePayment: async (payload) => {
    const res = await apiRequest("/payment/initiate", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    if (!res?.success) {
      throw new Error(res?.message || "Failed to initiate PayU payment.");
    }
    return res;
  },

  verifyPayment: async (orderId) => {
    const res = await apiRequest(`/payment/verify/${orderId}`);
    if (res?.success && res.data) {
      const idx = storeCache.orders.findIndex(o => String(o.id) === String(orderId) || String(o.orderId) === String(orderId));
      if (idx >= 0) {
        storeCache.orders[idx] = { ...storeCache.orders[idx], ...res.data };
        emitStoreUpdate("order:updated", storeCache.orders[idx]);
      }
    }
    return res;
  },

  retryPayment: async (orderId) => {
    const res = await apiRequest(`/payment/retry/${orderId}`, {
      method: "POST"
    });
    if (!res?.success) {
      throw new Error(res?.message || "Failed to generate PayU payment retry.");
    }
    return res;
  },

  processRefund: async (orderId, { refundAmount, reason }) => {
    const res = await apiRequest(`/payment/refund/${orderId}`, {
      method: "POST",
      body: JSON.stringify({ refundAmount, reason })
    });
    if (!res?.success) {
      throw new Error(res?.message || "Failed to process PayU refund.");
    }
    if (res.data) {
      const idx = storeCache.orders.findIndex(o => String(o.id) === String(orderId) || String(o.orderId) === String(orderId));
      if (idx >= 0) {
        storeCache.orders[idx] = { ...storeCache.orders[idx], ...res.data };
        emitStoreUpdate("order:updated", storeCache.orders[idx]);
      }
    }
    return res;
  },

  // ADDRESSES & PROFILE ISOLATION HELPERS
  getUserScopedKey: (baseKey) => {
    if (typeof window === "undefined") return null;
    const user = authClient.getUser();
    if (!user || user.isAnonymous) return null;
    const uid = user.authUserId || user.uid || (user.email ? `email_${user.email.toLowerCase().replace(/[^a-z0-9]/g, '_')}` : null);
    return uid ? `${baseKey}_${uid}` : null;
  },

  // ADDRESSES
  getAddresses: async () => {
    const user = authClient.getUser();
    if (!user || user.isAnonymous) {
      storeCache.addresses = [];
      return { success: true, data: [] };
    }
    const cacheKey = db.getUserScopedKey("aura_addresses_cache");
    try {
      const res = await apiRequest("/addresses");
      if (res?.success && Array.isArray(res.data)) {
        storeCache.addresses = res.data;
        if (cacheKey) {
          try { localStorage.setItem(cacheKey, JSON.stringify(res.data)); } catch(_) {}
        }
        return res;
      }
    } catch (_) {}
    let cached = [];
    if (cacheKey) {
      try {
        const stored = localStorage.getItem(cacheKey);
        if (stored) cached = JSON.parse(stored);
      } catch (_) {}
    }
    return { success: true, data: (cached && cached.length > 0) ? cached : (storeCache.addresses || []) };
  },

  saveAddress: async (address) => {
    const cacheKey = db.getUserScopedKey("aura_addresses_cache");
    const id = address.id || ("ADDR-" + Date.now());
    const finalAddr = { ...address, id };
    if (!storeCache.addresses) storeCache.addresses = [];
    const idx = storeCache.addresses.findIndex(a => a.id === id);
    if (idx >= 0) storeCache.addresses[idx] = finalAddr;
    else storeCache.addresses.push(finalAddr);

    try {
      if (address.id) {
        const res = await apiRequest(`/addresses/${address.id}`, {
          method: "PUT",
          body: JSON.stringify(address)
        });
        if (res?.success) {
          if (cacheKey) {
            try { localStorage.setItem(cacheKey, JSON.stringify(storeCache.addresses)); } catch(_) {}
          }
          return res;
        }
      } else {
        const res = await apiRequest("/addresses", {
          method: "POST",
          body: JSON.stringify(address)
        });
        if (res?.success) {
          if (cacheKey) {
            try { localStorage.setItem(cacheKey, JSON.stringify(storeCache.addresses)); } catch(_) {}
          }
          return res;
        }
      }
    } catch (_) {}
    if (cacheKey) {
      try { localStorage.setItem(cacheKey, JSON.stringify(storeCache.addresses)); } catch(_) {}
    }
    return { success: true, data: finalAddr };
  },

  deleteAddress: async (id) => {
    const cacheKey = db.getUserScopedKey("aura_addresses_cache");
    if (!storeCache.addresses) storeCache.addresses = [];
    storeCache.addresses = storeCache.addresses.filter(a => a.id !== id);
    if (cacheKey) {
      try {
        localStorage.setItem(cacheKey, JSON.stringify(storeCache.addresses));
      } catch (_) {}
    }
    try {
      await apiRequest(`/addresses/${id}`, {
        method: "DELETE"
      });
    } catch (_) {}
    return { success: true };
  },

  // CUSTOMERS (CUSTOMER ME & PROFILES)
  getCustomerMe: async () => {
    const user = authClient.getUser();
    if (!user || user.isAnonymous) {
      return { success: true, data: null };
    }
    const cacheKey = db.getUserScopedKey("aura_cached_me");
    try {
      const res = await apiRequest("/customers/me");
      if (res?.success && res.data) {
        if (cacheKey) {
          try { localStorage.setItem(cacheKey, JSON.stringify(res.data)); } catch(_) {}
        }
        return res;
      }
    } catch (_) {}
    
    let cached = {};
    if (cacheKey) {
      try {
        const stored = localStorage.getItem(cacheKey);
        if (stored) cached = JSON.parse(stored);
      } catch (_) {}
    }

    return {
      success: true,
      data: {
        email: cached.email || user?.email || "",
        name: cached.name || user?.displayName || user?.name || "Aura Devotee",
        phone: cached.phone || user?.phoneNumber || user?.phone || "",
        address: cached.address || "",
        avatar: cached.avatar || user?.photoURL || "",
        joined: cached.joined || new Date().toISOString()
      }
    };
  },

  updateCustomerMe: async (data) => {
    const cacheKey = db.getUserScopedKey("aura_cached_me");
    try {
      const res = await apiRequest("/customers/me", {
        method: "PUT",
        body: JSON.stringify(data)
      });
      if (res?.success && res.data) {
        if (cacheKey) {
          try { localStorage.setItem(cacheKey, JSON.stringify(res.data)); } catch(_) {}
        }
        emitStoreUpdate("customer:updated", res.data);
        return res;
      }
    } catch (_) {}
    
    let cached = {};
    if (cacheKey) {
      try {
        const stored = localStorage.getItem(cacheKey);
        if (stored) cached = JSON.parse(stored);
      } catch (_) {}
    }
    
    const merged = { ...cached, ...data };
    if (cacheKey) {
      try { localStorage.setItem(cacheKey, JSON.stringify(merged)); } catch(_) {}
    }
    emitStoreUpdate("customer:updated", merged);
    
    return { success: true, data: merged };
  },

  // LIVE STATUS
  getDbStatus: () => storeCache.dbStatus,

  // Explicit fresh fetches (admin pages) - revalidates cache from MongoDB
  fetchCustomers: async () => {
    const res = await apiRequest("/customers");
    if (res?.success && Array.isArray(res.data)) {
      storeCache.customers = res.data;
      return db.getCustomers();
    }
    if (res?.status === 503 || res?.error === "Database unavailable" || res?.success === false) {
      throw new Error(res?.message || "Database unavailable");
    }
    return db.getCustomers();
  },
  fetchTickets: async () => {
    const res = await apiRequest("/tickets");
    if (res?.success && Array.isArray(res.data)) {
      storeCache.tickets = res.data;
      // emitStoreUpdate (removed to prevent infinite fetch loop)
    }
    return storeCache.tickets;
  },
  fetchBanners: async () => {
    const res = await apiRequest("/banners");
    if (res?.success && Array.isArray(res.data)) {
      storeCache.banners = res.data;
      // emitStoreUpdate (removed to prevent infinite fetch loop)
    }
    return storeCache.banners;
  },
  fetchSettings: async () => {
    const res = await apiRequest("/settings");
    if (res?.success && res.data) {
      storeCache.settings = { ...storeCache.settings, ...res.data };
      // emitStoreUpdate (removed to prevent infinite fetch loop)
    }
    return storeCache.settings;
  },
  fetchCoupons: async () => {
    const res = await apiRequest("/coupons");
    if (res?.success && Array.isArray(res.data)) {
      storeCache.coupons = res.data;
      // emitStoreUpdate (removed to prevent infinite fetch loop)
    }
    return storeCache.coupons;
  },
  logProductView: async () => {
    await apiRequest("/analytics/product-view", { method: "POST" });
  },

  // CUSTOMERS
  getCustomers: () => {
    const custs = [...storeCache.customers];
    const orders = storeCache.orders;

    // Synthesize orders into customer profiles for rich metrics
    orders.forEach(o => {
      const email = (o.customerEmail || "").trim().toLowerCase();
      const phone = (o.phone || o.customerPhone || "").trim();
      const name = o.customerName || (o.firstName ? `${o.firstName} ${o.lastName || ''}`.trim() : "Customer");

      let idx = -1;
      if (email) idx = custs.findIndex(x => (x.email || "").toLowerCase() === email);
      if (idx < 0 && phone) idx = custs.findIndex(x => (x.phone || "").trim() === phone);

      if (idx >= 0) {
        if (!custs[idx].email && email) custs[idx].email = email;
        if (!custs[idx].phone && phone) custs[idx].phone = phone;
        if (!custs[idx].name && name) custs[idx].name = name;
        if (o.address && !custs[idx].address) custs[idx].address = o.address;
      } else {
        custs.push({
          id: "CUS-" + Math.floor(1000 + Math.random() * 9000),
          name: name || "Customer",
          email: email || "",
          phone: phone || "",
          address: o.address || "",
          joined: o.date || new Date().toISOString(),
          firstSeen: o.date || new Date().toISOString(),
          lastSeen: o.date || new Date().toISOString(),
          visits: 1,
          status: "Active"
        });
      }
    });

    return custs.map(c => {
      const cEmail = (c.email || "").toLowerCase();
      const cPhone = (c.phone || "").trim();

      const cOrders = orders.filter(o => {
        const oEmail = (o.customerEmail || "").toLowerCase();
        const oPhone = (o.phone || "").trim();
        return (cEmail && oEmail === cEmail) || (cPhone && oPhone === cPhone);
      });

      const validOrders = cOrders.filter(o => o.status !== "Cancelled");
      const totalSpent = validOrders.reduce((sum, o) => sum + (o.amount || o.finalAmount || 0), 0);
      const totalOrdersCount = cOrders.length;
      const avgOrderValue = totalOrdersCount > 0 ? Math.round(totalSpent / totalOrdersCount) : 0;
      
      let lastOrderDate = null;
      if (cOrders.length > 0) {
        const sorted = [...cOrders].sort((a,b) => new Date(b.date) - new Date(a.date));
        lastOrderDate = sorted[0].date;
      }

      return {
        ...c,
        totalOrders: totalOrdersCount,
        totalSpent: totalSpent,
        avgOrderValue: avgOrderValue,
        lastOrderDate: lastOrderDate,
        visits: c.visits || (totalOrdersCount > 0 ? totalOrdersCount : 1),
        firstSeen: c.firstSeen || c.joined || new Date().toISOString(),
        lastSeen: c.lastSeen || lastOrderDate || c.joined || new Date().toISOString(),
        status: c.status || (totalOrdersCount > 0 ? "Active" : "Registered")
      };
    });
  },

  saveCustomer: async (c) => {
    const email = (c.email || "").trim().toLowerCase();
    const phone = (c.phone || "").trim();
    const now = new Date().toISOString();
    const id = c.id || ("CUS-" + Math.floor(1000 + Math.random() * 9000));

    const finalCustomer = {
      ...c,
      id,
      email,
      phone,
      lastSeen: now,
      joined: c.joined || now
    };

    const res = await apiRequest("/customers", {
      method: "POST",
      body: JSON.stringify(finalCustomer)
    });

    if (!res?.success) {
      throw new Error(res?.message || "Failed to save customer. Database is unavailable.");
    }

    const saved = res.data || finalCustomer;
    const idx = storeCache.customers.findIndex(x => 
      String(x.id) === String(id) || (email && x.email === email) || (phone && x.phone === phone)
    );
    if (idx >= 0) {
      storeCache.customers[idx] = { ...storeCache.customers[idx], ...saved, visits: (storeCache.customers[idx].visits || 1) + 1 };
    } else {
      storeCache.customers.unshift(saved);
    }
    emitStoreUpdate("customer:saved", saved);
    return saved;
  },

  // BANNERS
  getBanners: () => storeCache.banners,
  saveBanners: async (arr) => {
    const res = await apiRequest("/banners", {
      method: "POST",
      body: JSON.stringify(arr)
    });
    if (!res?.success) {
      throw new Error(res?.message || "Failed to save banners. Database unavailable.");
    }
    storeCache.banners = arr;
    emitStoreUpdate("banners:saved", arr);
    return arr;
  },

  // ANALYTICS
  getAnalytics: () => storeCache.analytics,
  fetchAnalytics: async () => {
    const res = await apiRequest("/analytics");
    if (res?.success && res.data) {
      storeCache.analytics = {
        ...storeCache.analytics,
        ...res.data,
        hasData: res.hasData !== undefined ? res.hasData : ((res.data.visits || 0) > 0 || (res.data.productViews || 0) > 0)
      };
      emitStoreUpdate("analytics:updated", storeCache.analytics);
      return storeCache.analytics;
    }
    if (res?.status === 503 || res?.error === "Database unavailable" || res?.success === false) {
      throw new Error(res?.message || "Database unavailable");
    }
    return storeCache.analytics;
  },
  logVisit: async () => {
    storeCache.analytics.visits = (storeCache.analytics.visits || 0) + 1;
    emitStoreUpdate("analytics:updated", storeCache.analytics);
    await apiRequest("/analytics/visit", { method: "POST" });
  },

  // PROMOTIONS & OFFERS
  getPromotions: () => storeCache.promotions,
  savePromotion: async (p) => {
    const id = p.id || ("PROMO-" + Date.now());
    const finalPromo = { ...p, id };

    const res = await apiRequest("/promotions", {
      method: "POST",
      body: JSON.stringify(finalPromo)
    });
    if (!res?.success) {
      throw new Error(res?.message || "Failed to save promotion. Database is unavailable.");
    }

    const saved = res.data || finalPromo;
    const curIdx = storeCache.promotions.findIndex(x => x.id === id);
    if (curIdx >= 0) storeCache.promotions[curIdx] = saved;
    else storeCache.promotions.unshift(saved);
    emitStoreUpdate("promotion:saved", saved);
    return saved;
  },
  deletePromotion: async (id) => {
    const res = await apiRequest(`/promotions/${id}`, { method: "DELETE" });
    if (!res?.success) {
      throw new Error(res?.message || "Failed to delete promotion. Database is unavailable.");
    }
    storeCache.promotions = storeCache.promotions.filter(x => x.id !== id);
    emitStoreUpdate("promotion:deleted", id);
    return true;
  },

  // CENTRAL ACTIVE OFFER SYSTEM
  getActiveOffer: () => {
    return storeCache.activeOffer;
  },

  fetchActiveOffer: async () => {
    const res = await apiRequest("/active-offer");
    if (res?.success && res.data) {
      const expiresAt = res.data.expiresAt || res.data.expiry || storeCache.activeOffer?.expiresAt;
      const startDate = res.data.startDate || res.data.startAt || storeCache.activeOffer?.startDate;
      storeCache.activeOffer = { 
        ...storeCache.activeOffer, 
        ...res.data,
        expiresAt,
        expiry: expiresAt,
        startDate,
        startAt: startDate
      };
      emitStoreUpdate("active-offer:saved", storeCache.activeOffer);
    }
    return storeCache.activeOffer;
  },

  saveActiveOffer: async (offer) => {
    const updated = {
      ...storeCache.activeOffer,
      ...offer,
      id: "OFFER-CENTRAL-1",
      expiresAt: offer.expiresAt || offer.expiry || storeCache.activeOffer.expiresAt,
      expiry: offer.expiresAt || offer.expiry || storeCache.activeOffer.expiry,
      startDate: offer.startDate || offer.startAt || storeCache.activeOffer.startDate,
      startAt: offer.startDate || offer.startAt || storeCache.activeOffer.startAt
    };

    const res = await apiRequest("/active-offer", {
      method: "POST",
      body: JSON.stringify(updated)
    });
    if (!res?.success) {
      throw new Error(res?.message || "Failed to save active offer. Database is unavailable.");
    }

    storeCache.activeOffer = res.data || updated;
    emitStoreUpdate("active-offer:saved", storeCache.activeOffer);
    return storeCache.activeOffer;
  },

  // STORE OFFERS / HOME DEALS
  getOffers: () => storeCache.offers,
  saveOffer: async (o) => {
    const id = o.id || ("OFF-" + Date.now());
    const finalOffer = { ...o, id };

    const res = await apiRequest("/offers", {
      method: "POST",
      body: JSON.stringify(finalOffer)
    });
    if (!res?.success) {
      throw new Error(res?.message || "Failed to save offer. Database is unavailable.");
    }

    const saved = res.data || finalOffer;
    const curIdx = storeCache.offers.findIndex(x => x.id === id);
    if (curIdx >= 0) storeCache.offers[curIdx] = saved;
    else storeCache.offers.push(saved);
    emitStoreUpdate("offer:saved", saved);
    return saved;
  },
  deleteOffer: async (id) => {
    const res = await apiRequest(`/offers/${id}`, { method: "DELETE" });
    if (!res?.success) {
      throw new Error(res?.message || "Failed to delete offer. Database is unavailable.");
    }
    storeCache.offers = storeCache.offers.filter(x => x.id !== id);
    emitStoreUpdate("offer:deleted", id);
    return true;
  },

  // TOP PROMO STRIP (Derived from Active Offer or Top Promos)
  getTopPromos: () => {
    const offer = storeCache.activeOffer;
    if (!offer) return [];

    const exp = offer.expiresAt || offer.expiry;
    const isOfferExpired = exp ? new Date(exp).getTime() <= Date.now() : false;
    const isPromoActive = offer.enabled !== false && offer.status === "Active" && offer.topStripEnabled !== false && !isOfferExpired;

    return [
      {
        id: offer.id || "TOP-PROMO-1",
        name: offer.title || "Special Offer",
        offerText: offer.title || "₹200 OFF",
        optionalMessage: offer.subtitle || "Limited Time Festival Offer",
        couponCode: offer.couponCode || "",
        ctaText: "Shop Now",
        ctaLink: "/shop",
        icon: "🎁",
        enableCountdown: offer.timerEnabled !== false && !isOfferExpired,
        startDate: offer.startDate || offer.startAt,
        expiry: exp,
        countdownUnits: "DAYS_HRS_MIN",
        autoHideOnExpiry: true,
        enablePromo: isPromoActive,
        clickablePromo: true,
        copyCouponOnClick: true,
        backgroundType: "solid",
        bgColor: offer.backgroundColor || "#2b170d",
        gradientColor1: "#2b170d",
        gradientColor2: "#4b2614",
        textColor: offer.textColor || "#fbf5ef",
        offerTextColor: "#f5c382",
        couponBg: "rgba(255,255,255,0.12)",
        couponBorderColor: offer.accentColor || "#c88a3d",
        countdownBg: "rgba(0,0,0,0.3)",
        countdownNumColor: offer.textColor || "#fbf5ef",
        countdownLabelColor: offer.accentColor || "#c88a3d",
        accentColor: offer.accentColor || "#c88a3d",
        borderColor: offer.borderColor || "#4b2614",
        animationEnabled: true,
        animationStyle: offer.animationStyle || "fade",
        priority: 1,
        status: isOfferExpired ? "Expired" : (offer.status || "Active")
      }
    ];
  },
  saveTopPromo: async (p) => {
    return await db.saveActiveOffer(p);
  },
  deleteTopPromo: async (id) => {
    return await db.saveActiveOffer({ enabled: false, status: "Inactive" });
  },

  // COUPONS & CART CALCULATION (server-authoritative pricing with robust local fallback)
  getCoupons: () => storeCache.coupons,
  calculateCart: async (lines = [], couponCode = null) => {
    try {
      const res = await apiRequest("/cart/calculate", {
        method: "POST",
        body: JSON.stringify({ lines, couponCode })
      });
      if (res?.success && res.data) {
        return res;
      }
    } catch (_) {}

    // Fallback local calculations
    const prods = storeCache.products || [];
    let subtotal = 0;
    let totalMrp = 0;
    const validItems = [];

    lines.forEach(l => {
      const p = prods.find(x => String(x.id) === String(l.id));
      const price = p ? Number(p.price) : 0;
      const mrp = p ? Number(p.mrp || p.comparePrice || price) : price;
      subtotal += price * l.qty;
      totalMrp += mrp * l.qty;
      validItems.push({
        id: l.id,
        productId: l.id,
        name: p ? p.name : "Sacred Rudraksha Item",
        price,
        mrp,
        quantity: l.qty,
        qty: l.qty,
        img: p ? (p.img || (p.images && p.images[0])) : null
      });
    });

    const productSavings = Math.max(0, totalMrp - subtotal);
    const isFreeShipping = subtotal >= 499 || subtotal === 0;
    const shipping = isFreeShipping ? 0 : 50;
    const shippingDiscount = isFreeShipping && subtotal > 0 ? 50 : 0;

    let couponDiscount = 0;
    let appliedCoupon = null;
    let couponStatus = "NONE";
    let couponValid = false;
    let couponReason = "";

    if (couponCode && String(couponCode).trim()) {
      const clean = String(couponCode).trim().toUpperCase();
      const coup = storeCache.coupons.find(c => c.code.toUpperCase() === clean);
      if (coup) {
        couponValid = true;
        couponStatus = "APPLIED";
        if (clean === "SHRAWAN200" || clean === "MAHASHIVRATRI" || (coup.discount && coup.discount >= 100)) {
          couponDiscount = Math.min(coup.discount || 200, subtotal);
        } else {
          const pct = coup.discount || 10;
          couponDiscount = Math.round((subtotal * pct) / 100);
        }
        couponReason = `Applied '${clean}' discount`;
        appliedCoupon = {
          code: clean,
          discount: coup.discount,
          discountAmount: couponDiscount,
          valid: true,
          status: "APPLIED",
          reason: couponReason
        };
      } else {
        couponStatus = "INVALID";
        couponReason = `Coupon '${clean}' is not valid`;
      }
    }

    const finalTotal = Math.max(0, subtotal - couponDiscount + shipping);

    return {
      success: true,
      data: {
        subtotal,
        totalMrp,
        productSavings,
        productDiscount: productSavings,
        couponDiscount,
        shipping,
        shippingFee: shipping,
        shippingDiscount,
        isFreeShipping,
        freeShippingThreshold: 499,
        tax: 0,
        finalTotal,
        total: finalTotal,
        amount: finalTotal,
        savings: productSavings + couponDiscount + shippingDiscount,
        totalSavings: productSavings + couponDiscount + shippingDiscount,
        appliedCoupon,
        couponStatus,
        couponValid,
        couponReason,
        items: validItems,
        itemCount: validItems.reduce((acc, it) => acc + (it.qty || 1), 0),
        freeShippingRemaining: isFreeShipping ? 0 : Math.max(0, 499 - subtotal)
      }
    };
  },

  validateCartCoupon: async (code, lines = []) => {
    try {
      const res = await apiRequest("/cart/validate-coupon", {
        method: "POST",
        body: JSON.stringify({ code, lines })
      });
      if (res?.success) {
        return res;
      }
    } catch (_) {}

    const clean = (code || "").trim().toUpperCase();
    const coup = storeCache.coupons.find(c => c.code.toUpperCase() === clean);
    if (coup) {
      return {
        success: true,
        valid: true,
        status: "APPLIED",
        message: `Coupon '${clean}' applied successfully!`,
        data: coup
      };
    }
    return {
      success: false,
      valid: false,
      status: "INVALID",
      message: `Coupon '${clean}' is invalid or expired.`
    };
  },

  validateCoupon: async (code, subtotal = 0) => {
    try {
      const res = await apiRequest("/coupons/validate", {
        method: "POST",
        body: JSON.stringify({ code, subtotal })
      });
      if (res?.success) return res;
    } catch (_) {}

    const clean = (code || "").trim().toUpperCase();
    const coup = storeCache.coupons.find(c => c.code.toUpperCase() === clean);
    if (coup) {
      return {
        success: true,
        valid: true,
        message: `Coupon '${clean}' applied!`,
        data: coup
      };
    }
    return {
      success: false,
      valid: false,
      message: `Coupon '${clean}' is invalid.`
    };
  },

  saveCoupon: async (c) => {
    const id = c.id || ("COUP-" + Date.now());
    const finalCoupon = {
      ...c,
      id,
      code: (c.code || "").trim().toUpperCase(),
      discount: Number(c.discount) || 0,
      usage: Number(c.usage) || 0,
      limit: Number(c.limit) || 1000,
      status: c.status || "Active"
    };

    const res = await apiRequest("/coupons", {
      method: "POST",
      body: JSON.stringify(finalCoupon)
    });
    if (!res?.success) {
      throw new Error(res?.message || "Failed to save coupon. Database is unavailable.");
    }

    const saved = res.data || finalCoupon;
    const curIdx = storeCache.coupons.findIndex(x => x.id === id || x.code === finalCoupon.code);
    if (curIdx >= 0) storeCache.coupons[curIdx] = saved;
    else storeCache.coupons.push(saved);
    try {
      localStorage.setItem("aura_coupons_cache", JSON.stringify(storeCache.coupons));
    } catch (_) {}
    emitStoreUpdate("coupon:saved", saved);
    return saved;
  },

  deleteCoupon: async (id) => {
    const res = await apiRequest(`/coupons/${id}`, { method: "DELETE" });
    if (!res?.success) {
      throw new Error(res?.message || "Failed to delete coupon. Database is unavailable.");
    }
    const targetCode = String(id).toUpperCase();
    storeCache.coupons = storeCache.coupons.filter(x => x.id !== id && x.code !== targetCode);
    try {
      localStorage.setItem("aura_coupons_cache", JSON.stringify(storeCache.coupons));
    } catch (_) {}
    emitStoreUpdate("coupon:deleted", id);
    return true;
  },

  // REVIEWS SYSTEM
  getReviews: (productId, tab = "all") => {
    const deletedIds = getDeletedReviewIds();
    let allReviews = storeCache.reviews
      .filter(r => !deletedIds.has(String(r.id)) && r.status !== "deleted" && r.status !== "draft" && r.status !== "Hidden" && r.status !== "Rejected")
      .map(r => ({
        id: r.id || "REV-" + Math.random().toString(36).substr(2, 9),
        type: r.type || (r.productId && r.productId !== "all" ? "product" : "store"),
        productId: r.productId ? String(r.productId) : "all",
        productName: r.productName || "Rudraksha Bead",
        name: r.name || "Aura Devotee",
        city: r.city || "",
        rating: Number(r.rating) || 5,
        title: r.title || "",
        text: r.text || "",
        date: r.date || "Recently",
        createdAt: r.createdAt || Date.now(),
        verified: !!(r.verified && !r.isAiGenerated),
        featured: !!r.featured,
        source: r.source || (r.isAiGenerated ? "ai_draft" : "customer"),
        status: r.status || "Approved",
        images: Array.isArray(r.images) && r.images.length > 0 ? r.images : (r.img ? [r.img] : []),
        img: (Array.isArray(r.images) && r.images[0]) || r.img || null,
        helpfulUp: Number(r.helpfulUp) || 0,
        helpfulDown: Number(r.helpfulDown) || 0,
        adminReply: r.adminReply || null,
        isAiGenerated: !!r.isAiGenerated
      }));

    if (tab === "product" && productId && productId !== "all") {
      return allReviews.filter(r => r.type === "product" && String(r.productId) === String(productId));
    } else if (tab === "store") {
      return allReviews.filter(r => r.type === "store" || r.productId === "all");
    }

    if (!productId || productId === "all") return allReviews;
    return allReviews.filter(r => String(r.productId) === String(productId));
  },

  getAllReviews: () => {
    const deletedIds = getDeletedReviewIds();
    return storeCache.reviews
      .filter(r => !deletedIds.has(String(r.id)) && r.status !== "deleted")
      .map(r => ({
        id: r.id || "REV-" + Math.random().toString(36).substr(2, 9),
        type: r.type || (r.productId && r.productId !== "all" ? "product" : "store"),
        productId: r.productId ? String(r.productId) : "all",
        productName: r.productName || "Rudraksha Bead",
        name: r.name || "Aura Devotee",
        city: r.city || "",
        rating: Number(r.rating) || 5,
        title: r.title || "",
        text: r.text || "",
        date: r.date || "Recently",
        createdAt: r.createdAt || Date.now(),
        verified: !!(r.verified && !r.isAiGenerated),
        featured: !!r.featured,
        source: r.source || (r.isAiGenerated ? "ai_draft" : "customer"),
        status: r.status || "Approved",
        images: Array.isArray(r.images) && r.images.length > 0 ? r.images : (r.img ? [r.img] : []),
        img: (Array.isArray(r.images) && r.images[0]) || r.img || null,
        helpfulUp: Number(r.helpfulUp) || 0,
        helpfulDown: Number(r.helpfulDown) || 0,
        adminReply: r.adminReply || null,
        isAiGenerated: !!r.isAiGenerated
      }));
  },

  saveReview: async (rev) => {
    const id = rev.id || ("REV-" + Date.now());
    const images = Array.isArray(rev.images) ? rev.images : (rev.img ? [rev.img] : []);
    const source = rev.source || "customer";
    const isAi = source === "ai_draft" || !!rev.isAiGenerated;

    const newRev = {
      ...rev,
      id,
      type: rev.type || (rev.productId && rev.productId !== "all" ? "product" : "store"),
      productId: rev.productId ? String(rev.productId) : "all",
      name: rev.name?.trim() || "Aura Devotee",
      city: rev.city?.trim() || "Varanasi, UP",
      rating: Number(rev.rating) || 5,
      title: rev.title?.trim() || "",
      text: rev.text || "",
      date: rev.date || "Recently",
      createdAt: rev.createdAt || Date.now(),
      verified: isAi ? false : (rev.verified ?? true),
      source,
      isAiGenerated: isAi,
      isSample: isAi,
      sampleLabel: isAi ? (rev.sampleLabel || "Not a customer review") : "",
      status: rev.status || "Approved",
      images,
      img: images[0] || null,
      helpfulUp: Number(rev.helpfulUp) || 0,
      helpfulDown: Number(rev.helpfulDown) || 0
    };

    const res = await apiRequest("/reviews", {
      method: "POST",
      body: JSON.stringify(newRev)
    });
    if (!res?.success) {
      throw new Error(res?.message || "Failed to save review. Database is unavailable.");
    }

    const saved = res.data || newRev;
    storeCache.reviews.unshift(saved);
    emitStoreUpdate("review:saved", saved);
    return saved;
  },

  updateReview: async (id, updatedFields) => {
    const res = await apiRequest(`/reviews/${id}`, {
      method: "PUT",
      body: JSON.stringify(updatedFields)
    });
    if (!res?.success) {
      throw new Error(res?.message || "Failed to update review. Database is unavailable.");
    }

    const serverUpdated = res.data;
    const idx = storeCache.reviews.findIndex(r => String(r.id) === String(id));
    if (idx !== -1) {
      const current = storeCache.reviews[idx];
      const images = updatedFields.images !== undefined
        ? (Array.isArray(updatedFields.images) ? updatedFields.images : (updatedFields.img ? [updatedFields.img] : []))
        : current.images;

      const updated = {
        ...current,
        ...updatedFields,
        ...(serverUpdated || {}),
        images,
        img: images[0] || null
      };

      storeCache.reviews[idx] = updated;
      emitStoreUpdate("review:updated", updated);
      return updated;
    }
    return serverUpdated || { id, ...updatedFields };
  },

  deleteReview: async (id) => {
    const strId = String(id);
    const res = await apiRequest(`/reviews/${strId}`, { method: "DELETE" });
    if (!res?.success) {
      throw new Error(res?.message || "Failed to delete review. Database is unavailable.");
    }
    recordDeletedReviewId(strId);
    storeCache.reviews = storeCache.reviews.filter(r => String(r.id) !== strId);
    emitStoreUpdate("review:deleted", { id: strId });
    return true;
  },

  voteReviewHelpful: async (id, voteType = "up") => {
    const voteKey = `${id}`;
    if (storeCache.votesMap[voteKey]) {
      return { success: false, message: "You have already voted on this review." };
    }

    try {
      await apiRequest(`/reviews/${id}/vote`, {
        method: "POST",
        body: JSON.stringify({ voteType })
      });
    } catch (_) {}

    const idx = storeCache.reviews.findIndex(r => String(r.id) === String(id));
    if (idx !== -1) {
      if (voteType === "up") {
        storeCache.reviews[idx].helpfulUp = (Number(storeCache.reviews[idx].helpfulUp) || 0) + 1;
      } else {
        storeCache.reviews[idx].helpfulDown = (Number(storeCache.reviews[idx].helpfulDown) || 0) + 1;
      }
      storeCache.votesMap[voteKey] = voteType;
      emitStoreUpdate("review:voted", { id, voteType, updatedReview: storeCache.reviews[idx] });
      return { success: true, updatedReview: storeCache.reviews[idx] };
    }
    return { success: true };
  },

  getUserVote: (id) => storeCache.votesMap[`${id}`] || null,

  getReviewSettings: () => storeCache.reviewSettings,
  saveReviewSettings: async (settings) => {
    const res = await apiRequest("/reviews/settings", {
      method: "PUT",
      body: JSON.stringify(settings)
    });
    if (!res?.success) {
      throw new Error(res?.message || "Failed to save review settings. Database is unavailable.");
    }
    const saved = res.data || settings;
    storeCache.reviewSettings = { ...storeCache.reviewSettings, ...saved };
    emitStoreUpdate("review:settings-updated", storeCache.reviewSettings);
    return storeCache.reviewSettings;
  },

  generateReviewDrafts: async (params) => {
    const res = await apiRequest("/reviews/generate-drafts", {
      method: "POST",
      body: JSON.stringify(params),
      timeoutMs: 60000
    });
    if (!res?.success) {
      throw new Error(res?.message || "Failed to generate review drafts.");
    }
    return res;
  },

  bulkSaveReviews: async (reviews, allowDuplicates = false) => {
    const res = await apiRequest("/reviews/bulk-save", {
      method: "POST",
      body: JSON.stringify({ reviews, allowDuplicates }),
      timeoutMs: 30000
    });
    if (!res?.success) {
      throw new Error(res?.message || "Failed to bulk save reviews. Database is unavailable.");
    }

    const savedList = res.data || reviews;
    if (savedList && Array.isArray(savedList)) {
      savedList.forEach(saved => {
        const idx = storeCache.reviews.findIndex(r => String(r.id) === String(saved.id));
        if (idx !== -1) {
          storeCache.reviews[idx] = saved;
        } else {
          storeCache.reviews.unshift(saved);
        }
      });
      emitStoreUpdate("review:bulk-saved", savedList);
    }
    return { success: true, data: savedList, skipped: res.skipped || [] };
  },

  importExternalReviews: async (reviews) => {
    const res = await apiRequest("/reviews/import-external", {
      method: "POST",
      body: JSON.stringify({ reviews }),
      timeoutMs: 30000
    });
    if (!res?.success) {
      throw new Error(res?.message || "Failed to import external reviews.");
    }
    const importedList = res.data || [];
    if (Array.isArray(importedList)) {
      importedList.forEach(rev => {
        const idx = storeCache.reviews.findIndex(r => String(r.id) === String(rev.id));
        if (idx !== -1) storeCache.reviews[idx] = rev;
        else storeCache.reviews.unshift(rev);
      });
      emitStoreUpdate("review:imported", importedList);
    }
    return res;
  },

  polishReviewWithAI: async ({ id, text }) => {
    const res = await apiRequest("/reviews/polish", {
      method: "POST",
      body: JSON.stringify({ id, text }),
      timeoutMs: 15000
    });
    if (!res?.success) {
      throw new Error(res?.message || "Failed to polish review text with AI.");
    }
    if (res.data) {
      const idx = storeCache.reviews.findIndex(r => String(r.id) === String(res.data.id));
      if (idx !== -1) storeCache.reviews[idx] = res.data;
      emitStoreUpdate("review:updated", res.data);
    }
    return res;
  },

  // STORE SETTINGS & POLICIES
  getSettings: () => storeCache.settings,
  saveSettings: async (settings) => {
    const res = await apiRequest("/settings", {
      method: "PUT",
      body: JSON.stringify(settings)
    });
    if (!res?.success) {
      throw new Error(res?.message || "Failed to save settings. Database is unavailable.");
    }
    const saved = res.data || settings;
    storeCache.settings = { ...storeCache.settings, ...saved };
    emitStoreUpdate("settings:saved", storeCache.settings);
    return storeCache.settings;
  },

  getPolicies: () => {
    const s = storeCache.settings;
    return {
      shippingPolicy: s.shippingPolicy,
      returnPolicy: s.returnPolicy,
      privacyPolicy: s.privacyPolicy,
      termsPolicy: s.termsPolicy,
      contactSupport: s.contactSupport
    };
  },
  savePolicies: async (policies) => {
    const res = await apiRequest("/settings/policies", {
      method: "PUT",
      body: JSON.stringify(policies)
    });
    if (!res?.success) {
      throw new Error(res?.message || "Failed to save policies. Database is unavailable.");
    }
    const saved = res.data || policies;
    storeCache.settings = { ...storeCache.settings, ...saved };
    emitStoreUpdate("policies:saved", saved);
    return saved;
  },

  // SUPPORT TICKETS
  getTickets: () => storeCache.tickets,
  fetchTickets: async () => {
    try {
      const res = await apiRequest("/tickets", { noCache: true });
      if (res?.success && Array.isArray(res.data)) {
        storeCache.tickets = res.data;
        emitStoreUpdate("tickets:synced", storeCache.tickets);
        return storeCache.tickets;
      }
    } catch (_) {}
    return storeCache.tickets;
  },
  saveTicket: async (t) => {
    const isExisting = Boolean(t.id && storeCache.tickets.some(x => x.id === t.id));
    const id = t.id || ("TIC-" + Math.floor(1000 + Math.random() * 9000));
    const finalTicket = { ...t, id, date: t.date || new Date().toISOString(), status: t.status || "Open" };

    let saved = finalTicket;
    try {
      const endpoint = isExisting ? `/tickets/${encodeURIComponent(id)}` : "/tickets";
      const method = isExisting ? "PUT" : "POST";
      const res = await apiRequest(endpoint, {
        method,
        body: JSON.stringify(finalTicket)
      });
      if (res?.success && res.data) {
        saved = res.data;
      }
    } catch (_) {}

    const idx = storeCache.tickets.findIndex(x => x.id === id);
    if (idx >= 0) storeCache.tickets[idx] = saved;
    else storeCache.tickets.unshift(saved);
    emitStoreUpdate("ticket:saved", saved);
    return saved;
  },

  // HELPERS FOR ORDERS & CUSTOMER PROFILES
  getOrderItemImage: (item) => {
    if (!item) return "/images/product-5mukhi.jpg";
    if (item.img && typeof item.img === "string" && item.img.trim()) return item.img;
    if (item.image && typeof item.image === "string" && item.image.trim()) return item.image;
    if (item.id) {
      const p = db.getProduct(item.id);
      if (p) {
        if (p.img) return p.img;
        if (Array.isArray(p.images) && p.images[0]) return p.images[0];
      }
    }
    return "/images/product-5mukhi.jpg";
  },

  normalizeOrderItems: (o) => {
    if (!o) return [];
    if (o.snapshotItems && Array.isArray(o.snapshotItems) && o.snapshotItems.length > 0) {
      const map = {};
      o.snapshotItems.forEach(item => {
        const id = String(item.id || item.productId || item.name || "item");
        const price = Number(item.price || item.unitPrice || 0);
        const qty = Number(item.qty || item.quantity || 1);
        if (!map[id]) {
          map[id] = {
            id: item.id || item.productId || "",
            name: item.name || "Rudraksha Bead",
            price: price,
            qty: qty,
            img: db.getOrderItemImage(item),
            discount: item.discount || 0
          };
        } else {
          map[id].qty += qty;
        }
      });
      return Object.values(map);
    }

    if (o.items && Array.isArray(o.items)) {
      const allProducts = db.getProducts();
      const map = {};
      o.items.forEach(it => {
        const id = typeof it === 'object' && it !== null ? (it.id || it.productId || it._id) : it;
        const strId = String(id || "item");
        const p = allProducts.find(x => String(x.id) === strId);
        
        const name = p ? p.name : (typeof it === 'object' && it.name ? it.name : "Rudraksha Bead");
        const price = p ? p.price : (typeof it === 'object' && (it.price || it.unitPrice) ? Number(it.price || it.unitPrice) : 999);
        const img = p ? (p.img || (p.images && p.images[0])) : (typeof it === 'object' ? db.getOrderItemImage(it) : "/images/product-5mukhi.jpg");

        if (!map[strId]) {
          map[strId] = {
            id: strId,
            name: name,
            price: price,
            qty: 1,
            img: img
          };
        } else {
          map[strId].qty += 1;
        }
      });
      return Object.values(map);
    }
    return [];
  },

  normalizeOrder: (o) => {
    if (!o.snapshotItems || !Array.isArray(o.snapshotItems) || o.snapshotItems.length === 0) {
      o.snapshotItems = db.normalizeOrderItems(o);
    }
    return o;
  },

  getCustomerProfile: (emailOrPhone) => {
    if (!emailOrPhone) return null;
    const query = String(emailOrPhone).trim().toLowerCase();
    const customers = db.getCustomers();
    const found = customers.find(c => 
      (c.email && c.email.toLowerCase() === query) || 
      (c.phone && c.phone.trim() === query)
    );
    if (found) return found;

    return {
      id: "CUS-" + Math.floor(1000 + Math.random() * 9000),
      name: emailOrPhone.includes('@') ? emailOrPhone.split('@')[0] : "Aura Devotee",
      email: emailOrPhone.includes('@') ? emailOrPhone : "",
      phone: !emailOrPhone.includes('@') ? emailOrPhone : "",
      address: "",
      avatar: "",
      joined: new Date().toISOString()
    };
  },

  saveCustomerProfile: async (identifier, data) => {
    try {
      const res = await db.updateCustomerMe(data);
      if (res?.success && res.data) return res.data;
    } catch (_) {}
    return data;
  },

  // SEED TRIGGER
  seed: async () => {
    const res = await apiRequest("/seed", { method: "POST" });
    if (res?.success) {
      await hydrateFromBackend();
    }
    return res;
  },

  clearUserCache: () => {
    storeCache.addresses = [];
    storeCache.orders = [];
    storeCache.tickets = [];
    storeCache.customerMe = null;
    storeCache.wishlist = [];
  }
};

authClient.onAuthStateChanged(() => {
  db.clearUserCache();
});
