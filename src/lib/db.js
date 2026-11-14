import { getProductPrimaryImage, getProductGalleryImages } from "./imageUtils";
import { getProductRoute } from "./routes";
import { authClient } from "./authClient.js";
import { preloadImages } from "./imageUtils.js";
import { searchAndRankProducts } from "./searchUtils.js";
import { normalizeKeywordItems } from "./keywordUtils.js";
import { resolveCartProduct } from "./productResolver.js";

// Non-blocking idle writer for large cache keys so JSON.stringify never stalls 60-90 FPS scrolling
const pendingStorageWrites = new Map();
let storageIdleId = null;

function flushPendingStorageWrites() {
  storageIdleId = null;
  if (typeof window === "undefined" || !window.localStorage) return;
  const entries = Array.from(pendingStorageWrites.entries());
  pendingStorageWrites.clear();
  for (const [k, v] of entries) {
    try {
      window.localStorage.setItem(k, typeof v === "string" ? v : JSON.stringify(v));
    } catch (_) {}
  }
}

// Safe localStorage wrapper to prevent QuotaExceededError or security exceptions from halting execution
export function safeLocalStorageSet(key, value) {
  if (typeof window === "undefined" || !window.localStorage) return false;
  if (key && key.endsWith("_cache")) {
    pendingStorageWrites.set(key, value);
    if (!storageIdleId) {
      if (typeof window.requestIdleCallback === "function") {
        storageIdleId = window.requestIdleCallback(flushPendingStorageWrites, { timeout: 1000 });
      } else {
        storageIdleId = setTimeout(flushPendingStorageWrites, 80);
      }
    }
    return true;
  }
  try {
    window.localStorage.setItem(key, typeof value === "string" ? value : JSON.stringify(value));
    return true;
  } catch (_) {
    return false;
  }
}

export function safeLocalStorageGet(key, fallback = null) {
  if (typeof window === "undefined" || !window.localStorage) return fallback;
  try {
    const item = window.localStorage.getItem(key);
    return item !== null ? item : fallback;
  } catch (_) {
    return fallback;
  }
}

// Cross-Tab and Process-Wide Real-Time Synchronization Channel
let syncBroadcastChannel = null;
if (typeof window !== "undefined" && typeof window.BroadcastChannel === "function") {
  try {
    syncBroadcastChannel = new BroadcastChannel("aura_store_sync_channel");
  } catch (_) {}
}

// Event Broadcasters for real-time React UI updates
let pendingSyncEvents = null;
let syncRafId = null;

function applyStoreUpdatePayload(type, payload) {
  if (!payload && type !== "batch:synced") return;

  if ((type === "product:saved" || type === "product:updated") && payload) {
    const idx = storeCache.products.findIndex(x => 
      String(x.id) === String(payload.id) || (payload._id && String(x._id) === String(payload._id)) || (payload.slug && x.slug === payload.slug)
    );
    if (idx >= 0) storeCache.products[idx] = { ...storeCache.products[idx], ...payload };
    else storeCache.products.unshift(payload);
  } else if (type === "product:deleted" && payload) {
    storeCache.products = storeCache.products.filter(p => 
      String(p.id) !== String(payload) && String(p._id) !== String(payload) && p.slug !== String(payload)
    );
  } else if ((type === "active-offer:saved" || type === "active-offer:synced" || type === "active-offer:updated") && payload) {
    storeCache.activeOffer = payload;
  } else if ((type === "offer:saved" || type === "offer:updated") && payload) {
    const idx = storeCache.offers.findIndex(x => String(x.id) === String(payload.id));
    if (idx >= 0) storeCache.offers[idx] = { ...storeCache.offers[idx], ...payload };
    else storeCache.offers.unshift(payload);
  } else if (type === "offer:deleted" && payload) {
    storeCache.offers = storeCache.offers.filter(x => String(x.id) !== String(payload));
  } else if ((type === "banner:saved" || type === "banner:updated") && payload) {
    const idx = storeCache.banners.findIndex(x => String(x.id) === String(payload.id));
    if (idx >= 0) storeCache.banners[idx] = { ...storeCache.banners[idx], ...payload };
    else storeCache.banners.unshift(payload);
  } else if (type === "banner:deleted" && payload) {
    storeCache.banners = storeCache.banners.filter(x => String(x.id) !== String(payload));
  } else if ((type === "coupon:saved" || type === "coupon:updated") && payload) {
    const idx = storeCache.coupons.findIndex(x => String(x.id) === String(payload.id) || (payload.code && String(x.code).toUpperCase() === String(payload.code).toUpperCase()));
    if (idx >= 0) storeCache.coupons[idx] = { ...storeCache.coupons[idx], ...payload };
    else storeCache.coupons.unshift(payload);
  } else if (type === "coupon:deleted" && payload) {
    storeCache.coupons = storeCache.coupons.filter(x => String(x.id) !== String(payload) && String(x.code || "").toUpperCase() !== String(payload).toUpperCase());
  } else if (type === "settings:saved" && payload) {
    storeCache.settings = { ...storeCache.settings, ...payload };
  } else if (type === "products:synced" && Array.isArray(payload)) {
    storeCache.products = payload;
  } else if (type === "banners:synced" && Array.isArray(payload)) {
    storeCache.banners = payload;
  } else if (type === "offers:synced" && Array.isArray(payload)) {
    storeCache.offers = payload;
  } else if (type === "coupons:synced" && Array.isArray(payload)) {
    storeCache.coupons = payload;
  }
}

export const emitStoreUpdate = (type, payload) => {
  if (typeof window === "undefined") return;
  const detail = { type, payload, timestamp: Date.now() };

  // For background synchronization events, coalesce them into a single batch render pass
  // without serializing megabytes of JSON into cross-tab localStorage
  if (type.endsWith(":synced") || type === "home:synced") {
    if (!pendingSyncEvents) pendingSyncEvents = [];
    pendingSyncEvents.push(detail);

    if (!syncRafId) {
      syncRafId = setTimeout(() => {
        syncRafId = null;
        const events = pendingSyncEvents || [];
        pendingSyncEvents = null;
        const batchDetail = { type: "batch:synced", events, timestamp: Date.now() };
        window.dispatchEvent(
          new CustomEvent("aura:store-updated", { detail: batchDetail })
        );
      }, 40);
    }
    return;
  }

  // Immediate user/admin action events dispatch immediately
  applyStoreUpdatePayload(type, payload);
  window.dispatchEvent(
    new CustomEvent("aura:store-updated", { detail })
  );
  if (syncBroadcastChannel) {
    try { syncBroadcastChannel.postMessage(detail); } catch (_) {}
  }
  try {
    localStorage.setItem("aura_cross_tab_signal", JSON.stringify(detail));
  } catch (_) {}
};

export const onStoreUpdate = (callback) => {
  if (typeof window === "undefined") return () => {};
  const handler = (event) => {
    const detail = event.detail || {};
    callback(detail, detail.payload, detail.type);
  };
  window.addEventListener("aura:store-updated", handler);
  return () => {
    window.removeEventListener("aura:store-updated", handler);
  };
};

// API Base URL
// Defaults to same-origin "/api" (works when Express serves the built frontend).
// For split deployments (Cloudflare Pages frontend + separate Node backend),
// set VITE_API_BASE_URL="https://api.yourdomain.com/api" at build time.
const API_BASE = (((typeof import.meta !== "undefined" && import.meta.env) ? import.meta.env.VITE_API_BASE_URL : undefined) || "/api").replace(/\/$/, "");

if (typeof window !== "undefined") {
  const handleIncomingCrossTabSync = (detail) => {
    if (!detail) return;
    const { type, payload, events } = detail;

    if (type === "batch:synced" && Array.isArray(events)) {
      events.forEach(ev => applyStoreUpdatePayload(ev.type, ev.payload));
    } else {
      applyStoreUpdatePayload(type, payload);
    }

    // Trigger local React components
    window.dispatchEvent(new CustomEvent("aura:store-updated", { detail }));

    // If visible, trigger non-blocking revalidation
    if (document.visibilityState === "visible") {
      if (type && type.startsWith("product")) {
        revalidateProducts(true).catch(() => {});
      } else if (type && (type.startsWith("active-offer") || type.startsWith("offer") || type.startsWith("banners") || type.startsWith("settings"))) {
        fetchHomeData(true).catch(() => {});
      }
    }
  };

  // BroadcastChannel listener (Instant cross-tab messaging)
  if (syncBroadcastChannel) {
    syncBroadcastChannel.onmessage = (event) => {
      handleIncomingCrossTabSync(event.data);
    };
  }

  // localStorage storage event listener (Fallback)
  window.addEventListener("storage", (e) => {
    if (e.key === "aura_cross_tab_signal" && e.newValue) {
      try {
        const detail = JSON.parse(e.newValue);
        handleIncomingCrossTabSync(detail);
      } catch (_) {}
    }
  });

  let lastVisibilityRevalidate = 0;
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      const now = Date.now();
      if (now - lastVisibilityRevalidate > 10000) { // 10s cooldown throttle
        lastVisibilityRevalidate = now;
        revalidateProducts(false).catch(() => {});
        fetchHomeData(false).catch(() => {});
      }
    }
  });
}



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
      let token = "";
      if (options.requiresAuth) {
        token = await authClient.getToken(false, true).catch(() => "");
      } else {
        token = await authClient.getToken(false, false).catch(() => "");
      }

      const res = await fetch(`${API_BASE}${endpoint}`, {
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          ...(options.noCache ? { "Cache-Control": "no-cache" } : {}),
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
          ...(options.headers || {})
        },
        ...options
      });

      clearTimeout(timeoutId);

      let data = {};
      let isJson = false;

      // Try parsing JSON directly first regardless of Content-Type variations
      try {
        data = await res.json();
        isJson = true;
      } catch (_) {
        isJson = false;
      }

      if (!isJson) {
        return {
          success: false,
          status: res.status,
          message: res.status === 200 
            ? "Server connection syncing. Please try again or refresh shortly." 
            : `Endpoint unavailable (${res.status})`
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

// Deleted product tracking to ensure deleted products are never resurrected on refresh
function getDeletedProductIds() {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem("aura_deleted_product_ids");
    if (raw) return new Set(JSON.parse(raw));
  } catch (_) {}
  return new Set();
}

function recordDeletedProductId(id) {
  if (typeof window === "undefined" || !id) return;
  try {
    const set = getDeletedProductIds();
    set.add(String(id));
    localStorage.setItem("aura_deleted_product_ids", JSON.stringify(Array.from(set)));
  } catch (_) {}
}

function unrecordDeletedProductId(id) {
  if (typeof window === "undefined" || !id) return;
  try {
    const set = getDeletedProductIds();
    set.delete(String(id));
    localStorage.setItem("aura_deleted_product_ids", JSON.stringify(Array.from(set)));
  } catch (_) {}
}

// Deleted coupon tracking to ensure deleted coupons are never resurrected on refresh
function getDeletedCouponIds() {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem("aura_deleted_coupon_ids");
    if (raw) return new Set(JSON.parse(raw));
  } catch (_) {}
  return new Set();
}

function recordDeletedCouponId(id) {
  if (typeof window === "undefined" || !id) return;
  try {
    const set = getDeletedCouponIds();
    set.add(String(id));
    localStorage.setItem("aura_deleted_coupon_ids", JSON.stringify(Array.from(set)));
  } catch (_) {}
}

function getDeletedCouponCodes() {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem("aura_deleted_coupon_codes");
    if (raw) return new Set(JSON.parse(raw));
  } catch (_) {}
  return new Set();
}

function recordDeletedCouponCode(code) {
  if (typeof window === "undefined" || !code) return;
  try {
    const set = getDeletedCouponCodes();
    set.add(String(code).trim().toUpperCase());
    localStorage.setItem("aura_deleted_coupon_codes", JSON.stringify(Array.from(set)));
  } catch (_) {}
}

function unrecordDeletedCoupon(id, code) {
  if (typeof window === "undefined") return;
  try {
    if (id) {
      const set = getDeletedCouponIds();
      set.delete(String(id));
      localStorage.setItem("aura_deleted_coupon_ids", JSON.stringify(Array.from(set)));
    }
    if (code) {
      const set = getDeletedCouponCodes();
      set.delete(String(code).trim().toUpperCase());
      localStorage.setItem("aura_deleted_coupon_codes", JSON.stringify(Array.from(set)));
    }
  } catch (_) {}
}

export function isPublicProduct(p) {
  if (!p) return false;
  const s = String(p.status || "").trim().toLowerCase();
  if (s === "draft" || s === "inactive" || s === "archived") return false;
  return true;
}

// Live MongoDB Data Store Cache (hydrated via API and persistent localStorage)
const storeCache = {
  products: [],
  orders: [],
  customers: [],
  coupons: [],
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
      discountValue: 0,
      couponCode: "",
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
    enabled: false,
    status: "Disabled",
    neverExpires: true,
    autoApply: true,
    title: "Special Offer",
    subtitle: "Authentic Consecrated Rudraksha",
    couponCode: "",
    discountType: "fixed",
    discountValue: 200,
    startDate: new Date(Date.now() - 3600000).toISOString(),
    startAt: new Date(Date.now() - 3600000).toISOString(),
    expiresAt: "",
    expiry: "",
    backgroundColor: "#2b170d",
    textColor: "#fbf5ef",
    accentColor: "#c89b3c",
    badgeColor: "#7a320c",
    borderColor: "#4b2614",
    buttonColor: "#c89b3c",
    topStripEnabled: true,
    heroEnabled: true,
    productCardEnabled: true,
    productPageEnabled: true,
    imageBadgeEnabled: true,
    floatingEnabled: true,
    stickyEnabled: true,
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
    standardShippingFee: 0,
    freeShippingThreshold: 0,
    enableProductShipping: true,
    enableCod: true,
    enableOnlinePayment: true,
    codFee: 0,
    metaPixelId: "1485640013424198",
    metaPixelEnabled: true,
    metaDomainVerification: "1d24m9buiji2m2y1f8gq19abou79rk",
    metaCapiEnabled: false,
    featuredProductId: "14",
    featuredProductEnabled: true,
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
const CACHE_FRESHNESS_LIMIT = 10 * 1000; // 10 seconds freshness limit for background revalidation
const CACHE_OBSOLETE_LIMIT = 24 * 60 * 60 * 1000; // 24 hours for complete cache expiration
const CATALOG_CACHE_VERSION = "2026-11-13-v5"; // Versioned cache key to purge stale/demo caches cleanly

let isInitialized = false;
let isHydrated = false;
let hasFetchedFreshData = false;
let hydrationResolver = null;
let hydrationPromise = new Promise((resolve) => {
  hydrationResolver = resolve;
});

let consecutiveDbFailures = 0;
let healthCheckRecoveryTimer = null;

export function setStoreDbStatus(status) {
  if (status === "connected") {
    consecutiveDbFailures = 0;
    if (healthCheckRecoveryTimer) {
      clearInterval(healthCheckRecoveryTimer);
      healthCheckRecoveryTimer = null;
    }
  } else if (status === "disconnected") {
    consecutiveDbFailures++;
    // Require 2 consecutive failures before declaring database disconnected
    // so temporary network latency or single request timeouts do not trigger false alarms
    if (consecutiveDbFailures < 2) {
      return;
    }
    // Start periodic background check to automatically restore status as soon as server/DB is back up
    if (!healthCheckRecoveryTimer && typeof window !== "undefined") {
      healthCheckRecoveryTimer = setInterval(async () => {
        try {
          const res = await apiRequest("/health");
          if (res?.database === "connected") {
            setStoreDbStatus("connected");
          }
        } catch (_) {}
      }, 5000);
    }
  }

  if (storeCache.dbStatus !== status) {
    storeCache.dbStatus = status;
    emitStoreUpdate("db:status", status);
    emitStoreUpdate("home:synced", { dbStatus: status, timestamp: Date.now() });
  }
}

export function isBackendSynced() {
  return hasFetchedFreshData;
}

export function loadCacheFromLocalStorage() {
  if (typeof window === "undefined") return;
  try {
    // One-time cache migration/invalidation if version mismatch
    const currentVersion = localStorage.getItem("aura_catalog_cache_version");
    if (currentVersion !== CATALOG_CACHE_VERSION) {
      localStorage.removeItem("aura_products_cache");
      localStorage.removeItem("aura_banners_cache");
      localStorage.removeItem("aura_offers_cache");
      localStorage.removeItem("aura_active_offer_cache");
      localStorage.removeItem("aura_last_fetch_time");
      localStorage.removeItem("aura_last_product_fetch_time");
      localStorage.removeItem("aura_cache_hydrated");
      localStorage.setItem("aura_catalog_cache_version", CATALOG_CACHE_VERSION);
    }

    const cachedProducts = localStorage.getItem("aura_products_cache");
    if (cachedProducts) {
      const parsed = JSON.parse(cachedProducts);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const deletedIds = getDeletedProductIds();
        storeCache.products = parsed.filter(p => p && !deletedIds.has(String(p.id)) && !deletedIds.has(String(p._id)) && !deletedIds.has(String(p.slug)));
      }
    }
    // Seed server-injected __SSR_PRODUCT__ for 0ms direct product link rendering
    if (typeof window !== "undefined" && window.__SSR_PRODUCT__ && typeof window.__SSR_PRODUCT__ === "object") {
      const ssrProd = window.__SSR_PRODUCT__;
      const ssrId = String(ssrProd.id || ssrProd._id || "");
      const deletedIds = getDeletedProductIds();
      if (ssrId && !deletedIds.has(ssrId)) {
        const exists = (storeCache.products || []).some(p => p && String(p.id || p._id || "") === ssrId);
        if (!exists) {
          storeCache.products = [ssrProd, ...(storeCache.products || [])];
        }
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
      if (Array.isArray(parsed)) {
        const deletedIds = getDeletedCouponIds();
        const deletedCodes = getDeletedCouponCodes();
        storeCache.coupons = parsed.filter(c => 
          !deletedIds.has(String(c.id)) && 
          !deletedIds.has(String(c._id)) && 
          !deletedCodes.has(String(c.code || "").toUpperCase())
        );
      }
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
    // Clear any legacy stale order/customer cache keys to ensure MongoDB authoritative state
    localStorage.removeItem("aura_admin_orders_cache");
    localStorage.removeItem("aura_orders_cache");
    localStorage.removeItem("aura_admin_customers_cache");
    localStorage.removeItem("aura_customers_cache");
    
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

const PRODUCT_FRESHNESS_LIMIT = 5 * 1000; // 5 seconds window for fresh product updates
let lastProductFetchTime = Number((typeof localStorage !== "undefined" && localStorage.getItem("aura_last_product_fetch_time")) || 0);
let inFlightProductsPromise = null;
let lastMutationTime = 0;
let _enrichedProductsCache = null;
let _enrichedProductsRef = null;
let _enrichedReviewsRef = null;

function invalidateEnrichedProductsCache() {
  _enrichedProductsCache = null;
}

export function invalidateLocalProductCache() {
  lastProductFetchTime = 0;
  hasFetchedFreshData = false;
  inFlightProductsPromise = null;
  invalidateEnrichedProductsCache();
  try {
    localStorage.setItem("aura_last_product_fetch_time", "0");
  } catch (_) {}
}

export async function revalidateProducts(force = false) {
  if (typeof window === "undefined") return storeCache.products;

  const shouldForce = force || !hasFetchedFreshData;

  if (shouldForce) {
    lastProductFetchTime = 0;
  } else if (inFlightProductsPromise) {
    return inFlightProductsPromise;
  }

  const now = Date.now();
  if (!shouldForce && lastProductFetchTime > 0 && (now - lastProductFetchTime < PRODUCT_FRESHNESS_LIMIT)) {
    return storeCache.products;
  }

  const requestStartTime = Date.now();

  inFlightProductsPromise = (async () => {
    try {
      const url = shouldForce ? `/products?_t=${requestStartTime}` : "/products";
      const res = await apiRequest(url, shouldForce ? { noCache: true } : {});
      if (res?.success && Array.isArray(res.data) && !res.isFallback) {
        // Ignore stale background response if an admin mutation occurred while this GET was in flight
        if (!force && lastMutationTime > requestStartTime) {
          return storeCache.products;
        }
        setStoreDbStatus("connected");
        hasFetchedFreshData = true;
        const deletedProductIds = getDeletedProductIds();
        const normalized = res.data
          .filter(p => p && !deletedProductIds.has(String(p.id)) && !deletedProductIds.has(String(p._id)) && !deletedProductIds.has(String(p.slug)))
          .map(p => {
            const ord = Number(p.homeOrder) > 0
              ? Number(p.homeOrder)
              : Number(p.sortOrder) > 0
              ? Number(p.sortOrder)
              : Number(p.displayOrder) > 0
              ? Number(p.displayOrder)
              : 0;
            return {
              ...p,
              id: String(p.id || p._id),
              showOnHome: p.showOnHome !== undefined ? p.showOnHome : true,
              isPopular: !!p.isPopular,
              homeOrder: ord,
              sortOrder: ord,
              displayOrder: ord,
              homeBadge: p.homeBadge || p.badge || "",
              mrp: p.mrp || p.comparePrice || p.price,
              comparePrice: p.comparePrice || p.mrp || p.price,
              images: getProductGalleryImages(p)
            };
          });

        storeCache.products = normalized;
        invalidateEnrichedProductsCache();
        lastProductFetchTime = Date.now();
        safeLocalStorageSet("aura_products_cache", storeCache.products);
        try {
          localStorage.setItem("aura_last_product_fetch_time", String(lastProductFetchTime));
          localStorage.setItem("aura_cache_hydrated", "true");
        } catch (_) {}

        emitStoreUpdate("products:synced", storeCache.products);
      } else if (res?.status === 503 || res?.error === "Database unavailable") {
        setStoreDbStatus("disconnected");
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

  // Deduplicate background fetches for home resources, unless force=true
  if (globalThis.__aura_fetching_home && !force) {
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

  const reqOpts = force ? { noCache: true } : {};
  const requestStartTime = Date.now();

  const fetchPromise = (async () => {
    try {
      globalThis.__aura_fetching_home = true;

      // Parallel but decoupled fetches
      const fetchProducts = async () => {
        await revalidateProducts(force);
      };

      const fetchActiveOffer = async () => {
        try {
          const res = await apiRequest("/active-offer", reqOpts);
          if (res?.success && res.data && (force || lastMutationTime <= requestStartTime)) {
            const expiresAt = res.data.expiresAt || res.data.expiry;
            const startDate = res.data.startDate || res.data.startAt;
            storeCache.activeOffer = { 
              ...res.data,
              expiresAt,
              expiry: expiresAt,
              startDate,
              startAt: startDate
            };
            safeLocalStorageSet("aura_active_offer_cache", storeCache.activeOffer);
            emitStoreUpdate("active-offer:synced", storeCache.activeOffer);
          }
        } catch (e) {
          console.warn("Failed background active offer fetch:", e);
        }
      };

      const fetchOffers = async () => {
        try {
          const res = await apiRequest("/offers", reqOpts);
          if (res?.success && Array.isArray(res.data) && (force || lastMutationTime <= requestStartTime)) {
            storeCache.offers = res.data;
            safeLocalStorageSet("aura_offers_cache", storeCache.offers);
            emitStoreUpdate("offers:synced", storeCache.offers);
          }
        } catch (e) {
          console.warn("Failed background offers fetch:", e);
        }
      };

      const fetchBanners = async () => {
        try {
          const res = await apiRequest("/banners", reqOpts);
          if (res?.success && Array.isArray(res.data) && (force || lastMutationTime <= requestStartTime)) {
            storeCache.banners = res.data;
            safeLocalStorageSet("aura_banners_cache", storeCache.banners);
            emitStoreUpdate("banners:synced", storeCache.banners);
          }
        } catch (e) {
          console.warn("Failed background banners fetch:", e);
        }
      };

      const fetchReviews = async () => {
        try {
          const res = await apiRequest("/reviews", reqOpts);
          if (res?.success && Array.isArray(res.data) && (force || lastMutationTime <= requestStartTime)) {
            const deletedIds = getDeletedReviewIds();
            storeCache.reviews = res.data.filter(r => !deletedIds.has(String(r.id)) && r.status !== "deleted");
            invalidateEnrichedProductsCache();
            safeLocalStorageSet("aura_reviews_cache", storeCache.reviews);
            emitStoreUpdate("reviews:synced", storeCache.reviews);
          }
        } catch (e) {
          console.warn("Failed background reviews fetch:", e);
        }
      };

      const fetchSettings = async () => {
        try {
          const url = force ? `/settings?_t=${requestStartTime}` : "/settings";
          const res = await apiRequest(url, reqOpts);
          if (res?.success && res.data && (force || lastMutationTime <= requestStartTime)) {
            storeCache.settings = { ...storeCache.settings, ...res.data };
            safeLocalStorageSet("aura_settings_cache", storeCache.settings);
            emitStoreUpdate("settings:synced", storeCache.settings);
          }
        } catch (e) {
          console.warn("Failed background settings fetch:", e);
        }
      };

      const fetchReviewSettings = async () => {
        try {
          const res = await apiRequest("/reviews/settings", reqOpts);
          if (res?.success && res.data && (force || lastMutationTime <= requestStartTime)) {
            storeCache.reviewSettings = { ...storeCache.reviewSettings, ...res.data };
            safeLocalStorageSet("aura_review_settings_cache", storeCache.reviewSettings);
            emitStoreUpdate("review-settings:synced", storeCache.reviewSettings);
          }
        } catch (e) {
          console.warn("Failed background review settings fetch:", e);
        }
      };

      const fetchCoupons = async () => {
        try {
          const res = await apiRequest("/coupons", reqOpts);
          if (res?.success && Array.isArray(res.data) && (force || lastMutationTime <= requestStartTime)) {
            const deletedIds = getDeletedCouponIds();
            const deletedCodes = getDeletedCouponCodes();
            storeCache.coupons = res.data.filter(c => 
              !deletedIds.has(String(c.id)) && 
              !deletedIds.has(String(c._id)) && 
              !deletedCodes.has(String(c.code || "").toUpperCase())
            );
            safeLocalStorageSet("aura_coupons_cache", storeCache.coupons);
            emitStoreUpdate("coupons:synced", storeCache.coupons);
          }
        } catch (e) {
          console.warn("Failed background coupons fetch:", e);
        }
      };

      // Fetch all public home resources concurrently
      await Promise.all([
        fetchBanners(),
        fetchProducts(),
        fetchActiveOffer(),
        fetchSettings(),
        fetchOffers(),
        fetchReviews(),
        fetchReviewSettings(),
        fetchCoupons()
      ]);

      safeLocalStorageSet("aura_last_fetch_time", String(Date.now()));
      isHydrated = true;
      if (storeCache.products && storeCache.products.length > 0) {
        setStoreDbStatus("connected");
      }
      if (hydrationResolver) hydrationResolver(true);

      emitStoreUpdate("home:synced", { dbStatus: storeCache.dbStatus, timestamp: Date.now() });
    } catch (err) {
      setStoreDbStatus("disconnected");
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
      apiRequest("/orders", { requiresAuth: true, noCache: true }),
      apiRequest("/customers", { requiresAuth: true, noCache: true }),
      apiRequest("/coupons?scope=admin", { requiresAuth: true, noCache: true })
    ]);

    if (ordersRes?.success && Array.isArray(ordersRes.data)) {
      storeCache.orders = ordersRes.data;
      if (!ordersRes.isFallback) setStoreDbStatus("connected");
    }
    if (customersRes?.success && Array.isArray(customersRes.data)) {
      storeCache.customers = customersRes.data;
      if (!customersRes.isFallback) setStoreDbStatus("connected");
    }
    if (couponsRes?.success && Array.isArray(couponsRes.data)) {
      const deletedIds = getDeletedCouponIds();
      const deletedCodes = getDeletedCouponCodes();
      storeCache.coupons = couponsRes.data.filter(c => 
        !deletedIds.has(String(c.id)) && 
        !deletedIds.has(String(c._id)) && 
        !deletedCodes.has(String(c.code || "").toUpperCase())
      );
      try {
        localStorage.setItem("aura_coupons_cache", JSON.stringify(storeCache.coupons));
      } catch (_) {}
    }

    emitStoreUpdate("admin:synced", { timestamp: Date.now() });
  } catch (err) {
    console.warn("[Aura DB] Admin data fetch notice:", err.message);
  }
}

async function hydrateFromBackend() {
  await fetchHomeData(true);
}

// Broadcast channel helper to sync cache invalidations across browser tabs
export function broadcastCacheInvalidation() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("aura_last_fetch_time", "0");
    localStorage.setItem("aura_last_product_fetch_time", "0");
    if (typeof BroadcastChannel !== "undefined") {
      const channel = new BroadcastChannel("aura_store_sync");
      channel.postMessage({ type: "SYNC_CACHE", timestamp: Date.now() });
      channel.close();
    }
  } catch (_) {}
}

// Auto-trigger initial home data fetch immediately on app load
if (typeof window !== "undefined" && !isInitialized) {
  isInitialized = true;
  loadCacheFromLocalStorage();

  // Sync from temporary 24-hour memory cache or background refresh if expired
  fetchHomeData(false).catch(() => {});

  // Cross-tab Synchronization via BroadcastChannel & LocalStorage Event
  if (typeof BroadcastChannel !== "undefined") {
    try {
      const syncChannel = new BroadcastChannel("aura_store_sync");
      syncChannel.onmessage = (e) => {
        if (e.data?.type === "SYNC_CACHE") {
          fetchHomeData(true).catch(() => {});
        }
      };
    } catch (_) {}
  }
  window.addEventListener("storage", (e) => {
    if (e.key === "aura_last_fetch_time" && e.newValue === "0") {
      fetchHomeData(true).catch(() => {});
    }
  });

  // Sync on tab focus / visibility change with throttling (respect 24h cache limit)
  let lastFocusSync = 0;
  const triggerFocusSync = () => {
    const now = Date.now();
    if (now - lastFocusSync > 10000 && document.visibilityState === "visible") {
      lastFocusSync = now;
      fetchHomeData(false).catch(() => {});
    }
  };
  window.addEventListener("focus", triggerFocusSync);
  document.addEventListener("visibilitychange", triggerFocusSync);
}

// ----------------------------------------------------
// UNIFIED DATABASE OBJECT CONNECTED TO MONGODB API
// ----------------------------------------------------
export const db = {
  isBackendSynced: () => isBackendSynced(),
  onStoreUpdate: (callback) => onStoreUpdate(callback),
  emitStoreUpdate: (type, payload) => emitStoreUpdate(type, payload),

  // Immediate in-memory cache seeder for instant PDP transitions
  cacheProduct: (p) => {
    if (!p) return;
    const targetId = String(p.id || p._id || p.slug || "");
    if (!targetId) return;
    const idx = storeCache.products.findIndex(x => {
      if (!x) return false;
      return String(x.id) === targetId || (p._id && String(x._id) === String(p._id)) || (p.slug && String(x.slug) === String(p.slug));
    });
    if (idx >= 0) {
      storeCache.products[idx] = { ...storeCache.products[idx], ...p };
    } else {
      storeCache.products.push(p);
    }
    invalidateEnrichedProductsCache();
    if (typeof window !== "undefined" && window.__SSR_PRODUCT__ && typeof window.__SSR_PRODUCT__ === "object") {
      const ssr = window.__SSR_PRODUCT__;
      const sameProduct =
        String(ssr.id || "") === String(p.id || "") ||
        (p._id && String(ssr._id || "") === String(p._id)) ||
        (p.slug && String(ssr.slug || "") === String(p.slug));
      if (sameProduct) {
        window.__SSR_PRODUCT__ = { ...ssr, ...p };
      }
    }
  },

  // Check Database Health
  checkDbHealth: async () => {
    const res = await apiRequest("/health", { noCache: true });
    const connected = res?.database === "connected";
    setStoreDbStatus(connected ? "connected" : "disconnected");
    return {
      connected,
      status: res?.status || "unavailable",
      message: res?.message || ""
    };
  },

  // Full Database Diagnostics & Error Logs (Admin)
  getDbDiagnostics: async () => {
    const res = await apiRequest("/admin/db-status", {
      requiresAuth: true,
      noCache: true
    });
    if (res?.success && res?.data) {
      setStoreDbStatus(res.data.isConnected ? "connected" : "disconnected");
    }
    return res;
  },

  // Test / Reconnect MongoDB live (Admin)
  testDbConnection: async () => {
    const res = await apiRequest("/admin/db-status/test", {
      method: "POST",
      requiresAuth: true,
      noCache: true
    });
    return res;
  },

  // Clear Database Error Logs (Admin)
  clearDbErrorLogs: async () => {
    const res = await apiRequest("/admin/db-status/clear-errors", {
      method: "POST",
      requiresAuth: true,
      noCache: true
    });
    return res;
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

  // REVIEWS CALCULATION HELPERS
  getProductReviewStats: (productId) => {
    if (!productId || productId === "all") return { count: 0, rating: null };
    const pIdStr = String(productId).trim().toLowerCase();
    const cleanTarget = pIdStr.replace(/^(product-card-|product-)/, "");

    const foundProduct = (storeCache.products || []).find(p => {
      if (!p) return false;
      const xId = String(p.id || "").toLowerCase();
      const xMongoId = String(p._id || "").toLowerCase();
      const xSlug = String(p.slug || "").toLowerCase();
      return xId === pIdStr || xId === cleanTarget || xMongoId === pIdStr || xSlug === pIdStr || (!isNaN(cleanTarget) && Number(p.id) === Number(cleanTarget));
    });

    const targetIds = new Set([
      pIdStr,
      cleanTarget,
      foundProduct?.id ? String(foundProduct.id).toLowerCase() : null,
      foundProduct?._id ? String(foundProduct._id).toLowerCase() : null,
      foundProduct?.slug ? String(foundProduct.slug).toLowerCase() : null,
      `product-card-${cleanTarget}`,
      `product-${cleanTarget}`
    ].filter(Boolean));

    const pName = foundProduct?.name ? foundProduct.name.trim().toLowerCase() : null;

    const deletedIds = getDeletedReviewIds();
    const prodReviews = (storeCache.reviews || []).filter(r => {
      if (!r || deletedIds.has(String(r.id))) return false;
      const status = (r.status || "Approved").toLowerCase();
      if (status !== "approved" && status !== "published") return false;
      if (r.status === "deleted" || r.status === "draft" || r.status === "hidden" || r.status === "rejected") return false;
      if (r.source === "ai_draft" || r.publicDisplay === false) return false;

      const rPid = String(r.productId || "").trim().toLowerCase();
      const rCleanPid = rPid.replace(/^(product-card-|product-)/, "");
      if (targetIds.has(rPid) || targetIds.has(rCleanPid)) return true;
      if (pName && r.productName && r.productName.trim().toLowerCase() === pName) return true;
      return false;
    });

    const count = prodReviews.length;
    if (count === 0) {
      return { count: 0, rating: null };
    }
    const sum = prodReviews.reduce((acc, r) => acc + (Number(r.rating) || 5), 0);
    const avg = Number((sum / count).toFixed(1));
    return { count, rating: avg };
  },

  recalculateProductReviewStats: (productId) => {
    if (!productId || productId === "all") return;
    const pIdStr = String(productId).trim().toLowerCase();
    const stats = db.getProductReviewStats(productId);
    const idx = storeCache.products.findIndex(p => {
      const pId = String(p.id || p._id || "").toLowerCase();
      const pSlug = String(p.slug || "").toLowerCase();
      return pId === pIdStr || pSlug === pIdStr;
    });

    if (idx !== -1) {
      const current = storeCache.products[idx];
      storeCache.products[idx] = {
        ...current,
        rating: stats.rating !== null ? stats.rating : (Number(current.rating) || 4.9),
        reviews: stats.count > 0 ? stats.count : (current.reviews !== undefined ? current.reviews : 0),
        reviewCount: stats.count > 0 ? stats.count : (current.reviewCount !== undefined ? current.reviewCount : 0)
      };
      invalidateEnrichedProductsCache();
      emitStoreUpdate("product:updated", storeCache.products[idx]);
    }
    emitStoreUpdate("products:synced", storeCache.products);
  },

  recalculateAllProductsReviewStats: () => {
    if (!Array.isArray(storeCache.products) || !Array.isArray(storeCache.reviews)) return;
    invalidateEnrichedProductsCache();
    emitStoreUpdate("products:synced", storeCache.products);
  },

  // PRODUCTS (Memoized to prevent O(N*M) review scans & localStorage JSON.parse on every render)
  getProducts: () => {
    const prods = storeCache.products || [];
    const revs = storeCache.reviews || [];
    if (
      _enrichedProductsCache &&
      _enrichedProductsRef === prods &&
      _enrichedReviewsRef === revs
    ) {
      return _enrichedProductsCache;
    }

    // Build O(1) review stats lookup map in a single pass over reviews
    const deletedIds = getDeletedReviewIds();
    const statsByProductId = new Map();
    const statsByProductName = new Map();

    for (let i = 0; i < revs.length; i++) {
      const r = revs[i];
      if (!r || deletedIds.has(String(r.id))) continue;
      const status = String(r.status || "Approved").toLowerCase();
      if (status !== "approved" && status !== "published") continue;
      if (r.source === "ai_draft" || r.publicDisplay === false) continue;

      const ratingVal = Number(r.rating) || 5;
      const rPid = String(r.productId || "").trim().toLowerCase().replace(/^(product-card-|product-)/, "");
      if (rPid) {
        const prev = statsByProductId.get(rPid) || { sum: 0, count: 0 };
        prev.sum += ratingVal;
        prev.count += 1;
        statsByProductId.set(rPid, prev);
      }
      const rName = r.productName ? String(r.productName).trim().toLowerCase() : "";
      if (rName) {
        const prevN = statsByProductName.get(rName) || { sum: 0, count: 0 };
        prevN.sum += ratingVal;
        prevN.count += 1;
        statsByProductName.set(rName, prevN);
      }
    }

    _enrichedProductsRef = prods;
    _enrichedReviewsRef = revs;
    _enrichedProductsCache = prods.map(p => {
      if (!p) return p;
      const pId = String(p.id || p._id || "");
      const pIdLower = pId.toLowerCase();
      const slugLower = String(p.slug || "").toLowerCase();
      const nameLower = p.name ? String(p.name).trim().toLowerCase() : "";

      const statEntry =
        statsByProductId.get(pIdLower) ||
        (slugLower && statsByProductId.get(slugLower)) ||
        (nameLower && statsByProductName.get(nameLower)) ||
        null;

      const liveReviews = statEntry && statEntry.count > 0 ? statEntry.count : (p.reviews !== undefined ? p.reviews : 0);
      const liveRating = statEntry && statEntry.count > 0 ? Number((statEntry.sum / statEntry.count).toFixed(1)) : (Number(p.rating) || 4.9);

      return {
        ...p,
        id: pId,
        rating: liveRating,
        reviews: liveReviews,
        reviewCount: liveReviews,
        mrp: p.mrp || p.comparePrice || p.price,
        comparePrice: p.comparePrice || p.mrp || p.price,
        img: getProductPrimaryImage(p),
        images: getProductGalleryImages(p)
      };
    });

    return _enrichedProductsCache;
  },

  getProduct: (idOrSlug) => {
    if (!idOrSlug) return null;
    let raw = String(idOrSlug).trim();
    try {
      raw = decodeURIComponent(raw);
    } catch (_) {}
    const target = raw.toLowerCase().split("?")[0];
    const cleanId = target.replace(/^(product-card-|product-)/, "");
    const slugTarget = target.replace(/^\/+|\/+$/g, "");
    const stripMarketingSlug = (val) => {
      let current = String(val || "")
        .toLowerCase()
        .replace(/^(product-card-|product-)/, "");
      let prev = "";
      while (current !== prev) {
        prev = current;
        current = current
          .replace(/^(?:premium-|original-|buy-|authentic-|pure-|real-|nepali-)+/i, "")
          .replace(/(?:-authentic-lab-certified-aura-rudraksha|-lab-certified-aura-rudraksha|-aura-rudraksha|-nepali-online-lab-certified|-online-lab-certified|-lab-certified|-authentic|-supreme-bead|-deva-mani|-online)+$/gi, "");
      }
      return current.replace(/^-+|-+$/g, "");
    };
    const strippedSlug = stripMarketingSlug(slugTarget);

    const hasRealMedia = (prod) => {
      if (!prod) return false;
      const isReal = (u) => {
        if (!u || typeof u !== "string") return false;
        const c = u.trim().toLowerCase();
        return Boolean(c) && !c.includes("placeholder.svg") && !/^\/images\/product-.*mukhi/i.test(c) && !/^\/images\/product-mala/i.test(c);
      };
      return (Array.isArray(prod.images) && prod.images.some(isReal)) || isReal(prod.img) || isReal(prod.image);
    };

    const pickPreferred = (matches) => {
      if (!Array.isArray(matches) || matches.length === 0) return null;
      if (matches.length === 1) return matches[0];
      return matches.find(hasRealMedia) || matches[0];
    };

    const deletedIds = getDeletedProductIds();

    const findInList = (list) => {
      if (!Array.isArray(list) || list.length === 0) return null;

      // 1. Strict exact match on id or _id
      let matches = list.filter(x => {
        if (!x) return false;
        const xId = String(x.id || "").toLowerCase();
        const xMongoId = String(x._id || "").toLowerCase();
        if (deletedIds.has(String(x.id)) || deletedIds.has(String(x._id))) return false;

        if (xId === target || xId === slugTarget || xId === cleanId || xId === strippedSlug) return true;
        if (xMongoId && (xMongoId === target || xMongoId === slugTarget || xMongoId === cleanId || xMongoId === strippedSlug)) return true;
        if (!isNaN(target) && Number(x.id) === Number(target)) return true;
        if (!isNaN(cleanId) && Number(x.id) === Number(cleanId)) return true;
        if (!isNaN(strippedSlug) && strippedSlug !== "" && Number(x.id) === Number(strippedSlug)) return true;
        return false;
      });
      if (matches.length > 0) return pickPreferred(matches);

      // 2. Match on slug (exact or stripped marketing slug)
      matches = list.filter(x => {
        if (!x) return false;
        if (deletedIds.has(String(x.id)) || deletedIds.has(String(x._id))) return false;
        const xSlug = String(x.slug || "").toLowerCase();
        if (!xSlug) return false;
        const xStripped = stripMarketingSlug(xSlug);
        return (
          xSlug === target ||
          xSlug === slugTarget ||
          xSlug === cleanId ||
          xSlug === strippedSlug ||
          (strippedSlug && xStripped === strippedSlug)
        );
      });
      if (matches.length > 0) return pickPreferred(matches);

      // 3. Match on slugified product name
      matches = list.filter(x => {
        if (!x) return false;
        if (deletedIds.has(String(x.id)) || deletedIds.has(String(x._id))) return false;
        const xName = String(x.name || "").toLowerCase().trim();
        const xSlugifiedName = xName.replace(/[^\w\s-]/g, "").replace(/\s+/g, "-");
        if (
          xSlugifiedName &&
          (xSlugifiedName === target ||
            xSlugifiedName === slugTarget ||
            xSlugifiedName === cleanId ||
            xSlugifiedName === strippedSlug ||
            (strippedSlug.length >= 5 && (xSlugifiedName.startsWith(strippedSlug) || strippedSlug.startsWith(xSlugifiedName))))
        ) {
          return true;
        }
        if (xName && (xName === target || xName === slugTarget)) return true;
        return false;
      });
      if (matches.length > 0) return pickPreferred(matches);

      // 4. Match by Mukhi number for SEO URLs like "5-mukhi-rudraksha" or "buy-original-7-mukhi-rudraksha..."
      const mukhiMatch = slugTarget.match(/\b([1-9]|1[0-9]|20|21)\s*-?\s*mukhi\b/i) ||
                         strippedSlug.match(/\b([1-9]|1[0-9]|20|21)\s*-?\s*mukhi\b/i);
      if (mukhiMatch && mukhiMatch[1]) {
        const mNum = String(parseInt(mukhiMatch[1], 10));
        const mukhiRegex = new RegExp(`(^|[^0-9])${mNum}(\\s*-?\\s*mukhi|$)`, "i");
        matches = list.filter(x => {
          if (!x) return false;
          if (deletedIds.has(String(x.id)) || deletedIds.has(String(x._id))) return false;
          return (
            String(x.id) === mNum ||
            String(x.id).toLowerCase() === `p${mNum}` ||
            String(x.mukhi || "").replace(/\D/g, "") === mNum ||
            (x.slug && mukhiRegex.test(String(x.slug))) ||
            (x.name && mukhiRegex.test(String(x.name)))
          );
        });
        if (matches.length > 0) return pickPreferred(matches);
      }

      return null;
    };

    // Check synced storeCache.products AND window.__SSR_PRODUCT__; always prefer whichever has real product media
    const memMatch = findInList(storeCache.products);
    const ssrMatch = (typeof window !== "undefined" && window.__SSR_PRODUCT__ && typeof window.__SSR_PRODUCT__ === "object")
      ? findInList([window.__SSR_PRODUCT__])
      : null;

    let p = null;
    if (memMatch && (hasRealMedia(memMatch) || !ssrMatch || !hasRealMedia(ssrMatch))) {
      p = memMatch;
    } else if (ssrMatch) {
      p = ssrMatch;
    }

    if (!p) return null;
    const pId = String(p.id || p._id || "");
    const stats = db.getProductReviewStats(pId);
    const liveReviews = stats.count > 0 ? stats.count : (p.reviews !== undefined ? p.reviews : 0);
    const liveRating = stats.rating !== null ? stats.rating : (Number(p.rating) || 4.9);

    return {
      ...p,
      id: pId,
      rating: liveRating,
      reviews: liveReviews,
      reviewCount: liveReviews,
      slug: p.slug || (p.name ? p.name.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-") : pId),
      mrp: p.mrp || p.comparePrice || p.price,
      comparePrice: p.comparePrice || p.mrp || p.price,
      img: getProductPrimaryImage(p),
      images: getProductGalleryImages(p)
    };
  },

  getProductAsync: async (idOrSlug) => {
    if (!idOrSlug) return null;

    const hasRealMedia = (prod) => {
      if (!prod) return false;
      const isReal = (u) => {
        if (!u || typeof u !== "string") return false;
        const c = u.trim().toLowerCase();
        return Boolean(c) && !c.includes("placeholder.svg") && !/^\/images\/product-.*mukhi/i.test(c) && !/^\/images\/product-mala/i.test(c);
      };
      return (Array.isArray(prod.images) && prod.images.some(isReal)) || isReal(prod.img) || isReal(prod.image);
    };

    const normalizeFetched = (p) => ({
      ...p,
      id: String(p.id || p._id),
      mrp: p.mrp || p.comparePrice || p.price,
      comparePrice: p.comparePrice || p.mrp || p.price,
      img: getProductPrimaryImage(p),
      images: getProductGalleryImages(p),
      totalSold: p.totalSold !== undefined ? String(p.totalSold).trim() : (p.salesCount || p.timesPurchased ? `${p.salesCount || p.timesPurchased}+ Sold` : ""),
      salesCount: Number(p.salesCount ?? p.timesPurchased) || (p.totalSold ? parseInt(String(p.totalSold).replace(/\D/g, ""), 10) || 0 : 0),
      timesPurchased: Number(p.timesPurchased ?? p.salesCount) || (p.totalSold ? parseInt(String(p.totalSold).replace(/\D/g, ""), 10) || 0 : 0)
    });

    // STEP 1: Immediate Memory & Cache Check (0ms Response Time when real media is already present)
    const cached = db.getProduct(idOrSlug);
    if (cached && hasRealMedia(cached)) {
      // Background non-blocking network revalidation
      (async () => {
        try {
          let cleanParam = String(idOrSlug).trim();
          try { cleanParam = decodeURIComponent(cleanParam); } catch (_) {}
          const res = await apiRequest(`/products/${encodeURIComponent(cleanParam)}`, { timeoutMs: 8000 });
          if (res?.success && res.data) {
            const normalized = normalizeFetched(res.data);
            db.cacheProduct(normalized);
            emitStoreUpdate("product:synced", normalized);
          }
        } catch (_) {}
      })();

      return cached;
    }

    // STEP 2: Live API Fetch when not cached OR cached copy only had placeholder images
    try {
      let cleanParam = String(idOrSlug).trim();
      try { cleanParam = decodeURIComponent(cleanParam); } catch (_) {}
      const res = await apiRequest(`/products/${encodeURIComponent(cleanParam)}`, { timeoutMs: 8000 });
      if (res?.success && res.data) {
        const normalized = normalizeFetched(res.data);
        db.cacheProduct(normalized);
        emitStoreUpdate("product:synced", normalized);
        return normalized;
      }
    } catch (_) {}

    // STEP 3: Return cached Admin/DB product if live request failed
    return cached || db.getProduct(idOrSlug);
  },

  revalidateProducts: async (force = false) => {
    return await revalidateProducts(force);
  },

  getProductsAsync: async (force = false) => {
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
    const imgs = getProductGalleryImages(p);
    const primaryImg = getProductPrimaryImage(p);

    const rawStatus = p.status || "Published";
    const normalizedStatus = (rawStatus === "Draft" || rawStatus === "draft" || rawStatus === "Inactive" || rawStatus === "inactive") ? "Draft" : "Published";

    const explicitOrder = Number(p.homeOrder) > 0
      ? Number(p.homeOrder)
      : Number(p.sortOrder) > 0
      ? Number(p.sortOrder)
      : Number(p.displayOrder) > 0
      ? Number(p.displayOrder)
      : 0;

    const finalProduct = {
      ...p,
      id,
      img: primaryImg,
      images: imgs,
      tags: normalizeKeywordItems(p.tags),
      keywords: normalizeKeywordItems(p.keywords || p.searchKeywords),
      searchKeywords: normalizeKeywordItems(p.keywords || p.searchKeywords),
      subCategory: (p.subCategory || "").trim(),
      mukhi: (p.mukhi || "").trim(),
      rulingPlanet: (p.rulingPlanet || "").trim(),
      deity: (p.deity || "").trim(),
      origin: (p.origin || "Nepal").trim(),
      hasIndonesianVariant: !!p.hasIndonesianVariant || (Number(p.indonesianPrice) > 0),
      indonesianTitle: (p.indonesianTitle || "").trim(),
      indonesianPrice: Number(p.indonesianPrice) || 0,
      indonesianMrp: Number(p.indonesianMrp) || Number(p.indonesianPrice) || 0,
      indonesianStock: Number(p.indonesianStock) >= 0 ? Number(p.indonesianStock) : 0,
      indonesianImages: Array.isArray(p.indonesianImages) ? p.indonesianImages.filter(Boolean) : (p.indonesianImg ? [p.indonesianImg] : []),
      indonesianImg: p.indonesianImg || (Array.isArray(p.indonesianImages) && p.indonesianImages[0]) || "",
      indonesianSize: (p.indonesianSize || "").trim(),
      indonesianHighlight: (p.indonesianHighlight || "").trim(),
      zodiac: Array.isArray(p.zodiac) ? p.zodiac : [],
      metaTitle: p.metaTitle || "",
      metaDescription: p.metaDescription || "",
      freeShipping: p.freeShipping !== false,
      shippingFee: Number(p.shippingFee) || 0,
      variants: Array.isArray(p.variants) ? p.variants : [],
      sizes: Array.isArray(p.sizes) ? p.sizes : [],
      mrp: Number(p.mrp) || Number(p.comparePrice) || Number(p.price) || 0,
      comparePrice: Number(p.comparePrice) || Number(p.mrp) || Number(p.price) || 0,
      price: Number(p.price) || 0,
      stock: Number(p.stock) >= 0 ? Number(p.stock) : 0,
      status: normalizedStatus,
      showOnHome: p.showOnHome !== undefined ? !!p.showOnHome : true,
      isPopular: !!p.isPopular,
      homeOrder: explicitOrder,
      sortOrder: explicitOrder,
      displayOrder: explicitOrder,
      homeBadge: p.homeBadge || p.badge || "",
      totalSold: p.totalSold !== undefined ? String(p.totalSold).trim() : (p.salesCount || p.timesPurchased ? `${p.salesCount || p.timesPurchased}+ Sold` : ""),
      salesCount: Number(p.salesCount ?? p.timesPurchased) || (p.totalSold ? parseInt(String(p.totalSold).replace(/\D/g, ""), 10) || 0 : 0),
      timesPurchased: Number(p.timesPurchased ?? p.salesCount) || (p.totalSold ? parseInt(String(p.totalSold).replace(/\D/g, ""), 10) || 0 : 0),
      autoIncrementSales: false,
      lastSalesUpdateDate: p.lastSalesUpdateDate || "",
      dailySalesMin: 0,
      dailySalesMax: 0
    };

    lastMutationTime = Date.now();
    const isExisting = Boolean(finalProduct.id && finalProduct.id !== "new" && !String(finalProduct.id).startsWith("TEMP-"));
    const endpoint = isExisting ? `/products/${encodeURIComponent(finalProduct.id)}` : "/products";
    const method = isExisting ? "PUT" : "POST";

    let res = await apiRequest(endpoint, {
      method,
      body: JSON.stringify(finalProduct),
      requiresAuth: true,
      noCache: true
    });

    if (!res?.success && isExisting) {
      res = await apiRequest("/products", {
        method: "POST",
        body: JSON.stringify(finalProduct),
        requiresAuth: true,
        noCache: true
      });
    }

    if (!res?.success) {
      throw new Error(res?.message || "Failed to save product. Database is unavailable.");
    }

    lastMutationTime = Date.now();
    const savedData = res.data || finalProduct;
    const strId = String(savedData.id || id);
    const mongoId = savedData._id ? String(savedData._id) : null;

    unrecordDeletedProductId(strId);
    if (mongoId) unrecordDeletedProductId(mongoId);
    if (savedData.slug) unrecordDeletedProductId(savedData.slug);

    const currentIdx = storeCache.products.findIndex(x =>
      String(x.id) === strId || (mongoId && String(x._id) === mongoId) || (x.slug && x.slug === savedData.slug)
    );

    const savedOrder = Number(savedData.homeOrder ?? savedData.sortOrder ?? savedData.displayOrder ?? explicitOrder) || 0;

    const normalizedSaved = {
      ...savedData,
      id: String(savedData.id || savedData._id || id),
      homeOrder: savedOrder,
      sortOrder: savedOrder,
      displayOrder: savedOrder,
      tags: normalizeKeywordItems(savedData.tags || finalProduct.tags),
      keywords: normalizeKeywordItems(savedData.keywords || finalProduct.keywords),
      searchKeywords: normalizeKeywordItems(savedData.keywords || finalProduct.keywords),
      subCategory: savedData.subCategory || finalProduct.subCategory || "",
      mukhi: savedData.mukhi || finalProduct.mukhi || "",
      rulingPlanet: savedData.rulingPlanet || finalProduct.rulingPlanet || "",
      deity: savedData.deity || finalProduct.deity || "",
      origin: savedData.origin || finalProduct.origin || "Nepal",
      hasIndonesianVariant: savedData.hasIndonesianVariant !== undefined ? !!savedData.hasIndonesianVariant : !!finalProduct.hasIndonesianVariant,
      indonesianTitle: savedData.indonesianTitle || finalProduct.indonesianTitle || "",
      indonesianPrice: Number(savedData.indonesianPrice ?? finalProduct.indonesianPrice ?? 0),
      indonesianMrp: Number(savedData.indonesianMrp ?? finalProduct.indonesianMrp ?? 0),
      indonesianStock: Number(savedData.indonesianStock ?? finalProduct.indonesianStock ?? 50),
      indonesianImages: Array.isArray(savedData.indonesianImages) ? savedData.indonesianImages : (finalProduct.indonesianImages || []),
      indonesianImg: savedData.indonesianImg || finalProduct.indonesianImg || "",
      indonesianSize: savedData.indonesianSize || finalProduct.indonesianSize || "",
      indonesianHighlight: savedData.indonesianHighlight || finalProduct.indonesianHighlight || "",
      zodiac: Array.isArray(savedData.zodiac) ? savedData.zodiac : (finalProduct.zodiac || []),
      mrp: savedData.mrp || savedData.comparePrice || savedData.price,
      comparePrice: savedData.comparePrice || savedData.mrp || savedData.price,
      images: getProductGalleryImages(savedData),
      totalSold: savedData.totalSold || finalProduct.totalSold || (finalProduct.salesCount || finalProduct.timesPurchased ? `${finalProduct.salesCount || finalProduct.timesPurchased}+ Sold` : ""),
      salesCount: Number(savedData.salesCount ?? savedData.timesPurchased ?? finalProduct.salesCount ?? finalProduct.timesPurchased ?? 0),
      timesPurchased: Number(savedData.timesPurchased ?? savedData.salesCount ?? finalProduct.timesPurchased ?? finalProduct.salesCount ?? 0),
      autoIncrementSales: savedData.autoIncrementSales !== undefined ? !!savedData.autoIncrementSales : finalProduct.autoIncrementSales,
      lastSalesUpdateDate: savedData.lastSalesUpdateDate || finalProduct.lastSalesUpdateDate || "",
      dailySalesMin: Number(savedData.dailySalesMin ?? finalProduct.dailySalesMin ?? 1),
      dailySalesMax: Number(savedData.dailySalesMax ?? finalProduct.dailySalesMax ?? 10),
      variants: Array.isArray(savedData.variants) ? savedData.variants : (finalProduct.variants || []),
      sizes: Array.isArray(savedData.sizes) ? savedData.sizes : (finalProduct.sizes || [])
    };

    if (currentIdx >= 0) {
      storeCache.products[currentIdx] = normalizedSaved;
    } else {
      storeCache.products.unshift(normalizedSaved);
    }

    // Keep storeCache.settings.homeProductLayout in sync immediately
    if (storeCache.settings?.homeProductLayout) {
      const prodIdStr = String(normalizedSaved.id);
      let liveArr = Array.isArray(storeCache.settings.homeProductLayout.live)
        ? storeCache.settings.homeProductLayout.live.map(String).filter(x => x !== prodIdStr)
        : [];
      let draftArr = Array.isArray(storeCache.settings.homeProductLayout.draft)
        ? storeCache.settings.homeProductLayout.draft.map(String).filter(x => x !== prodIdStr)
        : [];
      if (normalizedSaved.showOnHome !== false) {
        const insertIdx = savedOrder > 0 ? Math.max(0, Math.min(savedOrder - 1, liveArr.length)) : liveArr.length;
        liveArr.splice(insertIdx, 0, prodIdStr);
        draftArr.splice(Math.min(insertIdx, draftArr.length), 0, prodIdStr);
      }
      storeCache.settings = {
        ...storeCache.settings,
        homeProductLayout: {
          ...storeCache.settings.homeProductLayout,
          live: liveArr,
          draft: draftArr
        }
      };
      safeLocalStorageSet("aura_settings_cache", storeCache.settings);
    }

    invalidateEnrichedProductsCache();
    lastProductFetchTime = Date.now();
    try {
      localStorage.setItem("aura_products_cache", JSON.stringify(storeCache.products));
      localStorage.setItem("aura_cache_hydrated", "true");
      localStorage.setItem("aura_last_product_fetch_time", String(lastProductFetchTime));
    } catch (_) {}

    emitStoreUpdate("product:saved", normalizedSaved);
    emitStoreUpdate("products:synced", storeCache.products);
    return normalizedSaved;
  },

  updateProduct: async (id, updates) => {
    const strId = String(id);
    const existing = db.getProduct(strId) || {};
    const merged = { ...existing, ...updates, id: strId };
    return await db.saveProduct(merged);
  },

  reorderProducts: async (itemsOrIds = []) => {
    if (!Array.isArray(itemsOrIds) || itemsOrIds.length === 0) return storeCache.products;
    lastMutationTime = Date.now();

    const normalizedItems = itemsOrIds.map((entry, idx) => {
      if (typeof entry === "string" || typeof entry === "number") {
        return {
          id: String(entry),
          homeOrder: idx + 1,
          sortOrder: idx + 1,
          displayOrder: idx + 1,
          showOnHome: true
        };
      }
      const seq = Number(entry.homeOrder ?? entry.sortOrder ?? entry.displayOrder) > 0
        ? Number(entry.homeOrder ?? entry.sortOrder ?? entry.displayOrder)
        : idx + 1;
      return {
        id: String(entry.id ?? entry._id ?? ""),
        homeOrder: seq,
        sortOrder: seq,
        displayOrder: seq,
        showOnHome: entry.showOnHome !== undefined ? Boolean(entry.showOnHome) : true
      };
    }).filter(x => x.id);

    const orderMap = new Map(normalizedItems.map(item => [item.id, item]));

    storeCache.products = (storeCache.products || []).map(p => {
      const pid = String(p.id || p._id || "");
      const matched = orderMap.get(pid);
      if (matched) {
        return {
          ...p,
          homeOrder: matched.homeOrder,
          sortOrder: matched.sortOrder,
          displayOrder: matched.displayOrder,
          showOnHome: matched.showOnHome
        };
      }
      return p;
    });

    const sortedOrderedIds = [...normalizedItems]
      .filter(x => x.showOnHome !== false)
      .sort((a, b) => a.homeOrder - b.homeOrder)
      .map(x => x.id);

    const existingLive = Array.isArray(storeCache.settings?.homeProductLayout?.live)
      ? storeCache.settings.homeProductLayout.live.map(String)
      : [];
    const remainingLive = existingLive.filter(id => !sortedOrderedIds.includes(id));
    const nextLayoutIds = [...sortedOrderedIds, ...remainingLive];

    storeCache.settings = {
      ...storeCache.settings,
      homeProductLayout: {
        ...(storeCache.settings?.homeProductLayout || {}),
        live: nextLayoutIds,
        draft: nextLayoutIds
      }
    };

    invalidateEnrichedProductsCache();
    lastProductFetchTime = Date.now();
    try {
      localStorage.setItem("aura_products_cache", JSON.stringify(storeCache.products));
      localStorage.setItem("aura_settings_cache", JSON.stringify(storeCache.settings));
      localStorage.setItem("aura_last_product_fetch_time", String(lastProductFetchTime));
    } catch (_) {}

    emitStoreUpdate("products:synced", storeCache.products);
    emitStoreUpdate("settings:saved", storeCache.settings);

    const res = await apiRequest("/products/reorder", {
      method: "PUT",
      body: JSON.stringify({ items: normalizedItems }),
      requiresAuth: true,
      noCache: true
    });

    if (!res?.success) {
      throw new Error(res?.message || "Failed to save product sequence.");
    }

    lastMutationTime = Date.now();
    return storeCache.products;
  },

  searchProducts: (query, options = {}) => {
    const all = storeCache.products.map(p => ({
      ...p,
      id: String(p.id || p._id),
      mrp: p.mrp || p.comparePrice || p.price,
      comparePrice: p.comparePrice || p.mrp || p.price,
      img: getProductPrimaryImage(p),
      images: getProductGalleryImages(p)
    }));
    const filtered = options.includeDrafts ? all : all.filter(isPublicProduct);
    return searchAndRankProducts(filtered, query);
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
    recordDeletedProductId(strId);

    const existingP = db.getProduct(strId);
    if (existingP) {
      if (existingP.id) recordDeletedProductId(existingP.id);
      if (existingP._id) recordDeletedProductId(existingP._id);
      if (existingP.slug) recordDeletedProductId(existingP.slug);
    }

    lastMutationTime = Date.now();
    const res = await apiRequest(`/products/${encodeURIComponent(strId)}`, {
      method: "DELETE",
      requiresAuth: true,
      noCache: true
    });
    if (!res?.success) {
      throw new Error(res?.message || "Failed to delete product. Database is unavailable.");
    }
    lastMutationTime = Date.now();
    storeCache.products = storeCache.products.filter(p =>
      String(p.id) !== strId && String(p._id) !== strId && p.slug !== strId &&
      (!existingP || (String(p.id) !== String(existingP.id) && String(p._id) !== String(existingP._id)))
    );

    invalidateEnrichedProductsCache();
    lastProductFetchTime = Date.now();
    try {
      localStorage.setItem("aura_products_cache", JSON.stringify(storeCache.products));
      localStorage.setItem("aura_cache_hydrated", "true");
      localStorage.setItem("aura_last_product_fetch_time", String(lastProductFetchTime));
    } catch (_) {}

    emitStoreUpdate("product:deleted", strId);
    emitStoreUpdate("products:synced", storeCache.products);
    return true;
  },

  triggerDailySalesIncrement: async () => {
    try {
      const res = await apiRequest("/products/increment-daily-sales", { method: "POST" });
      if (res?.success) {
        if (Array.isArray(res.data) && res.data.length > 0) {
          storeCache.products = res.data.map(p => ({
            ...p,
            id: String(p.id || p._id),
            salesCount: Number(p.salesCount ?? p.timesPurchased) || (p.totalSold ? parseInt(String(p.totalSold).replace(/\D/g, ""), 10) || 0 : 0),
            timesPurchased: Number(p.timesPurchased ?? p.salesCount) || (p.totalSold ? parseInt(String(p.totalSold).replace(/\D/g, ""), 10) || 0 : 0),
            totalSold: p.totalSold || (p.salesCount || p.timesPurchased ? `${p.salesCount || p.timesPurchased}+ Sold` : "")
          }));
          try {
            localStorage.setItem("aura_products_cache", JSON.stringify(storeCache.products));
            localStorage.setItem("aura_cache_hydrated", "true");
            localStorage.setItem("aura_last_product_fetch_time", String(Date.now()));
          } catch (_) {}
          emitStoreUpdate("product:bulk_updated", storeCache.products);
        }
        await revalidateProducts(true).catch(() => {});
        await fetchHomeData(true).catch(() => {});
        return res;
      }
    } catch (err) {
      console.warn("Notice in triggerDailySalesIncrement:", err.message);
      throw err;
    }
    return { success: false };
  },

  // ORDERS
  getOrders: () => storeCache.orders,

  // WISHLIST API
  getWishlist: async () => {
    const now = Date.now();
    if (storeCache._wishlistCache && (now - (storeCache._wishlistFetchTime || 0) < 15000)) {
      return storeCache._wishlistCache;
    }
    const res = await apiRequest("/wishlist");
    if (res?.success) {
      storeCache._wishlistCache = res;
      storeCache._wishlistFetchTime = Date.now();
    }
    return res;
  },
  addToWishlist: async (productId) => {
    storeCache._wishlistFetchTime = 0;
    return await apiRequest("/wishlist", {
      method: "POST",
      body: JSON.stringify({ productId })
    });
  },
  removeFromWishlist: async (productId) => {
    storeCache._wishlistFetchTime = 0;
    return await apiRequest(`/wishlist/${productId}`, {
      method: "DELETE"
    });
  },

  getCachedMyOrders: () => {
    const user = authClient.getUser();
    if (!user || user.isAnonymous) return [];
    if (Array.isArray(storeCache.myOrders) && storeCache.myOrders.length > 0) return storeCache.myOrders;
    const myCacheKey = db.getUserScopedKey("aura_cached_my_orders");
    if (myCacheKey && typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(myCacheKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            storeCache.myOrders = parsed;
            return parsed;
          }
        }
      } catch (_) {}
    }
    return [];
  },

  getMyOrders: async () => {
    const user = authClient.getUser();
    
    // Strict privacy: If user is not logged in, return empty orders list
    if (!user || user.isAnonymous) {
      return { success: true, data: [] };
    }

    try {
      const res = await apiRequest("/orders/my", { timeoutMs: 15000, requiresAuth: true, noCache: true });
      if (res?.success && Array.isArray(res.data)) {
        storeCache.myOrders = res.data;
        const myCacheKey = db.getUserScopedKey("aura_cached_my_orders");
        if (myCacheKey && typeof window !== "undefined") {
          try {
            localStorage.setItem(myCacheKey, JSON.stringify(res.data.slice(0, 60)));
          } catch (_) {}
        }
        return res;
      }

      // If server returned error or unavailable, check if user has cached orders locally
      const cached = db.getCachedMyOrders();
      if (Array.isArray(cached) && cached.length > 0) {
        return {
          success: true,
          data: cached,
          fromCache: true,
          message: res?.message
        };
      }

      return { 
        success: false, 
        message: res?.message || "Failed to fetch orders from server", 
        data: [] 
      };
    } catch (err) {
      console.error("[DB] getMyOrders API error:", err);
      const cached = db.getCachedMyOrders();
      if (Array.isArray(cached) && cached.length > 0) {
        return {
          success: true,
          data: cached,
          fromCache: true,
          message: err?.message
        };
      }
      return { 
        success: false, 
        message: err?.message || "Network error while loading your orders", 
        data: [] 
      };
    }
  },

  getOrder: async (id, guestToken = "", txnid = "") => {
    if (!id) return { success: false, notFound: true, message: "Order ID is required" };
    try {
      const gToken = guestToken || (typeof window !== "undefined" ? (
        sessionStorage.getItem(`aura_order_token_${id}`) ||
        localStorage.getItem(`aura_order_token_${id}`) ||
        sessionStorage.getItem("aura_guest_token") ||
        localStorage.getItem("aura_guest_token") || ""
      ) : "");
      const tId = txnid || (typeof window !== "undefined" ? (
        sessionStorage.getItem(`aura_order_txnid_${id}`) ||
        localStorage.getItem(`aura_order_txnid_${id}`) ||
        sessionStorage.getItem("aura_pending_txnid") || ""
      ) : "");
      const headers = {};
      if (gToken) headers["x-guest-token"] = gToken;
      if (tId) headers["x-payu-txnid"] = tId;

      let url = `/orders/${id}`;
      const params = new URLSearchParams();
      if (gToken) params.set("guestToken", gToken);
      if (tId) params.set("txnid", tId);
      const q = params.toString();
      if (q) url += `?${q}`;

      const res = await apiRequest(url, { headers, timeoutMs: 15000 });
      if (res?.success && res.data) {
        if (typeof window !== "undefined") {
          const retToken = res.data.guestToken || gToken;
          const retTxnid = res.data.txnid || tId;
          const orderKey = res.data.orderNumber || res.data.id || id;
          if (retToken) {
            sessionStorage.setItem(`aura_order_token_${orderKey}`, retToken);
            localStorage.setItem(`aura_order_token_${orderKey}`, retToken);
            sessionStorage.setItem("aura_guest_token", retToken);
          }
          if (retTxnid) {
            sessionStorage.setItem(`aura_order_txnid_${orderKey}`, retTxnid);
            localStorage.setItem(`aura_order_txnid_${orderKey}`, retTxnid);
          }
        }
        return res;
      }
      return {
        success: false,
        notFound: res?.status === 404 || (res?.message && res.message.toLowerCase().includes("not found")),
        message: res?.message || "Order not found"
      };
    } catch (err) {
      console.error("[DB] getOrder API error:", err);
      return {
        success: false,
        notFound: false,
        message: err?.message || "Network error while loading order details"
      };
    }
  },

  trackOrder: async (queryOrOrderId, phone = "") => {
    const rawTerm = String(queryOrOrderId || "").trim();
    const rawPhone = String(phone || "").replace(/\D/g, "");
    try {
      const res = await apiRequest(`/orders/public/track?query=${encodeURIComponent(rawTerm)}&phone=${encodeURIComponent(rawPhone)}`);
      if (res?.success && res.data) {
        return res;
      }
      if (res?.databaseUnavailable || res?.status === 503) {
        return {
          success: false,
          databaseUnavailable: true,
          error: "Database unavailable",
          message: res?.message || "Order tracking is temporarily unavailable. Please try again in a few moments."
        };
      }
      return {
        success: false,
        notFound: true,
        message: res?.message || "No matching order found. Please check your Order ID or phone number."
      };
    } catch (err) {
      console.error("[DB] trackOrder API error:", err);
      return {
        success: false,
        databaseUnavailable: true,
        error: "Network error",
        message: "Order tracking service is temporarily unreachable. Please try again in a few moments."
      };
    }
  },

  updateOrder: async (id, data) => {
    const res = await apiRequest(`/orders/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
      requiresAuth: true,
      noCache: true
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
    const res = await apiRequest("/orders", { requiresAuth: true, noCache: true });
    if (res?.success && Array.isArray(res.data)) {
      if (!res.isFallback) setStoreDbStatus("connected");
      storeCache.orders = res.data;
      try {
        localStorage.setItem("aura_admin_orders_cache", JSON.stringify(res.data));
      } catch (_) {}
      emitStoreUpdate("orders:synced", storeCache.orders);
      return storeCache.orders;
    }
    if (res?.status === 503 || res?.error === "Database unavailable" || res?.success === false) {
      throw new Error(res?.message || "Database unavailable");
    }
    return storeCache.orders;
  },

  saveOrder: async (o) => {
    const now = new Date().toISOString();
    const payload = {
      ...o,
      date: o.date || now,
      amount: o.amount || o.total || o.finalAmount || 0,
      total: o.total || o.amount || o.finalAmount || 0,
      finalAmount: o.finalAmount || o.total || o.amount || 0,
      status: o.status || o.orderStatus || "Confirmed"
    };

    const res = await apiRequest("/orders", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    if (!res?.success || !res?.data) {
      throw new Error(res?.message || "Failed to save order. Database is unavailable.");
    }

    const savedData = res.data;
    const guestToken = res.guestToken || savedData.guestToken || "";
    if (guestToken) {
      savedData.guestToken = guestToken;
    }
    const finalId = String(savedData.id || savedData.orderId || savedData.orderNumber || "");
    const idx = storeCache.orders.findIndex(x => String(x.id) === finalId || String(x.orderId) === finalId);
    if (idx >= 0) {
      storeCache.orders[idx] = { ...storeCache.orders[idx], ...savedData };
    } else {
      storeCache.orders.unshift(savedData);
    }

    if (!Array.isArray(storeCache.myOrders)) storeCache.myOrders = [];
    const myIdx = storeCache.myOrders.findIndex(x => String(x.id) === finalId || String(x.orderId) === finalId);
    if (myIdx >= 0) {
      storeCache.myOrders[myIdx] = { ...storeCache.myOrders[myIdx], ...savedData };
    } else {
      storeCache.myOrders.unshift(savedData);
    }

    try {
      if (guestToken && typeof window !== "undefined") {
        sessionStorage.setItem("aura_guest_token", guestToken);
        localStorage.setItem("aura_guest_token", guestToken);
        if (finalId) {
          sessionStorage.setItem(`aura_order_token_${finalId}`, guestToken);
          localStorage.setItem(`aura_order_token_${finalId}`, guestToken);
        }
      }
      localStorage.setItem("aura_orders_cache", JSON.stringify(storeCache.orders.slice(0, 50)));
      const myCacheKey = db.getUserScopedKey("aura_cached_my_orders");
      if (myCacheKey && typeof window !== "undefined") {
        localStorage.setItem(myCacheKey, JSON.stringify(storeCache.myOrders.slice(0, 50)));
      }
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

  verifyPayment: async (orderId, txnid = "", guestToken = "") => {
    if (!orderId) return { success: false };
    try {
      const gToken = guestToken || (typeof window !== "undefined" ? (sessionStorage.getItem("aura_guest_token") || localStorage.getItem("aura_guest_token") || "") : "");
      let url = `/payment/verify/${encodeURIComponent(orderId)}`;
      const params = new URLSearchParams();
      if (txnid) params.set("txnid", txnid);
      if (gToken) params.set("guestToken", gToken);
      const qStr = params.toString();
      if (qStr) url += `?${qStr}`;

      const headers = {};
      if (gToken) headers["x-guest-token"] = gToken;
      if (txnid) headers["x-payu-txnid"] = txnid;

      const res = await apiRequest(url, { headers, timeoutMs: 10000 });
      if (res?.success && res.data) {
        const idx = storeCache.orders.findIndex(o => String(o.id) === String(orderId) || String(o.orderId) === String(orderId));
        if (idx >= 0) {
          storeCache.orders[idx] = { ...storeCache.orders[idx], ...res.data };
          emitStoreUpdate("order:updated", storeCache.orders[idx]);
        }
      }
      return res;
    } catch (e) {
      console.error("Payment verify err:", e);
      return { success: false, error: e.message };
    }
  },

  retryPayment: async (orderId, txnid = "", guestToken = "") => {
    const gToken = guestToken || (typeof window !== "undefined" ? (sessionStorage.getItem("aura_guest_token") || localStorage.getItem("aura_guest_token") || "") : "");
    const headers = {};
    if (gToken) headers["x-guest-token"] = gToken;
    if (txnid) headers["x-payu-txnid"] = txnid;

    const res = await apiRequest(`/payment/retry/${orderId}`, {
      method: "POST",
      headers,
      body: JSON.stringify({ txnid, guestToken: gToken }),
      requiresAuth: true
    });
    if (!res?.success) {
      throw new Error(res?.message || "Failed to generate PayU payment retry.");
    }
    return res;
  },
  syncPayuOrder: async (orderId) => {
    const res = await apiRequest(`/payment/sync-payu/${orderId}`, {
      method: "POST",
      requiresAuth: true
    });
    if (!res?.success) throw new Error(res?.message || "Failed to sync PayU status.");
    return res;
  },

  requestRefundOtp: async (orderId, { refundAmount, reason }) => {
    const res = await apiRequest(`/payment/refund/request-otp/${orderId}`, {
      method: "POST",
      body: JSON.stringify({ refundAmount, reason }),
      requiresAuth: true
    });
    if (!res?.success) {
      throw new Error(res?.message || "Failed to send refund OTP to admin Gmail.");
    }
    return res;
  },

  processRefund: async (orderId, { refundAmount, reason, otp, refundToken, refundNotes, refundStatus }) => {
    const res = await apiRequest(`/payment/refund/${orderId}`, {
      method: "POST",
      body: JSON.stringify({ refundAmount, reason, otp, refundToken, refundNotes, refundStatus }),
      requiresAuth: true
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
  getCachedAddresses: () => {
    const user = authClient.getUser();
    if (!user || user.isAnonymous) return [];
    if (Array.isArray(storeCache.addresses) && storeCache.addresses.length > 0) return storeCache.addresses;
    const cacheKey = db.getUserScopedKey("aura_addresses_cache");
    if (cacheKey && typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(cacheKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            storeCache.addresses = parsed;
            return parsed;
          }
        }
      } catch (_) {}
    }
    return [];
  },

  getAddresses: async () => {
    const user = authClient.getUser();
    if (!user || user.isAnonymous) {
      storeCache.addresses = [];
      return { success: true, data: [] };
    }
    const cacheKey = db.getUserScopedKey("aura_addresses_cache");
    const cached = db.getCachedAddresses();

    try {
      const res = await apiRequest("/addresses", { timeoutMs: 5000, requiresAuth: true, noCache: true });
      if (res?.success && Array.isArray(res.data)) {
        storeCache.addresses = res.data;
        if (cacheKey && typeof window !== "undefined") {
          try { localStorage.setItem(cacheKey, JSON.stringify(res.data)); } catch(_) {}
        }
        return res;
      }
    } catch (_) {}

    return { success: true, data: (cached && cached.length > 0) ? cached : (storeCache.addresses || []) };
  },

  saveAddress: async (address) => {
    const user = authClient.getUser();
    const cacheKey = db.getUserScopedKey("aura_addresses_cache");
    if (!storeCache.addresses) storeCache.addresses = [];

    // Deduplicate by content if no explicit id is provided
    let id = address.id;
    if (!id) {
      const clean = str => String(str || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
      const match = storeCache.addresses.find(a => 
        (clean(a.address) === clean(address.address) && clean(a.pincode) === clean(address.pincode)) ||
        (clean(a.address) === clean(address.address) && clean(a.city) === clean(address.city))
      );
      if (match) id = match.id;
    }
    if (!id) id = "ADDR-" + Date.now();

    const finalAddr = { 
      ...address, 
      id, 
      isDefault: address.isDefault !== undefined ? address.isDefault : true 
    };

    if (finalAddr.isDefault) {
      storeCache.addresses.forEach(a => { a.isDefault = false; });
    }

    const idx = storeCache.addresses.findIndex(a => String(a.id) === String(id));
    if (idx >= 0) storeCache.addresses[idx] = finalAddr;
    else storeCache.addresses.unshift(finalAddr);

    if (cacheKey && typeof window !== "undefined") {
      try { localStorage.setItem(cacheKey, JSON.stringify(storeCache.addresses)); } catch(_) {}
    }

    if (user && !user.isAnonymous) {
      try {
        const endpoint = address.id ? `/addresses/${encodeURIComponent(address.id)}` : "/addresses";
        const method = address.id ? "PUT" : "POST";
        const res = await apiRequest(endpoint, {
          method,
          body: JSON.stringify(finalAddr),
          requiresAuth: true,
          noCache: true
        });

        if (res?.success) {
          if (Array.isArray(res.data)) {
            storeCache.addresses = res.data;
          }
          if (cacheKey && typeof window !== "undefined") {
            try { localStorage.setItem(cacheKey, JSON.stringify(storeCache.addresses)); } catch(_) {}
          }
          emitStoreUpdate("addresses:synced", storeCache.addresses);
          return { success: true, data: storeCache.addresses, savedAddress: finalAddr };
        }
      } catch (err) {
        console.warn("[db.saveAddress] API call failed, falling back to local cache:", err);
      }
    }

    emitStoreUpdate("addresses:synced", storeCache.addresses);
    return { success: true, data: storeCache.addresses, savedAddress: finalAddr };
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
        method: "DELETE",
        requiresAuth: true,
        noCache: true
      });
    } catch (_) {}
    return { success: true };
  },

  // CUSTOMERS (CUSTOMER ME & PROFILES)
  getCachedCustomerMe: () => {
    const user = authClient.getUser();
    if (!user || user.isAnonymous) return null;
    const cacheKey = db.getUserScopedKey("aura_cached_me");
    if (cacheKey && typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(cacheKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && typeof parsed === "object") {
            return parsed;
          }
        }
      } catch (_) {}
    }
    return {
      email: user?.email || "",
      name: user?.displayName || user?.name || "Aura Devotee",
      phone: user?.phoneNumber || user?.phone || "",
      address: "",
      avatar: user?.photoURL || "",
      joined: new Date().toISOString()
    };
  },

  getCustomerMe: async () => {
    const user = authClient.getUser();
    if (!user || user.isAnonymous) {
      return { success: true, data: null };
    }
    const cacheKey = db.getUserScopedKey("aura_cached_me");
    const cached = db.getCachedCustomerMe();

    try {
      const res = await apiRequest("/customers/me", { timeoutMs: 5000, requiresAuth: true, noCache: true });
      if (res?.success && res.data) {
        if (cacheKey && typeof window !== "undefined") {
          try { localStorage.setItem(cacheKey, JSON.stringify(res.data)); } catch(_) {}
        }
        return res;
      }
    } catch (_) {}

    return {
      success: true,
      data: cached || {
        email: user?.email || "",
        name: user?.displayName || user?.name || "Aura Devotee",
        phone: user?.phoneNumber || user?.phone || "",
        address: "",
        avatar: user?.photoURL || "",
        joined: new Date().toISOString()
      }
    };
  },

  updateCustomerMe: async (data) => {
    const cacheKey = db.getUserScopedKey("aura_cached_me");
    try {
      const res = await apiRequest("/customers/me", {
        method: "PUT",
        body: JSON.stringify(data),
        requiresAuth: true,
        noCache: true
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
    const res = await apiRequest("/customers", { requiresAuth: true, noCache: true });
    if (res?.success && Array.isArray(res.data)) {
      if (!res.isFallback) setStoreDbStatus("connected");
      storeCache.customers = res.data;
      try {
        localStorage.setItem("aura_admin_customers_cache", JSON.stringify(res.data));
      } catch (_) {}
      emitStoreUpdate("customers:synced", storeCache.customers);
      return db.getCustomers();
    }
    if (res?.status === 503 || res?.error === "Database unavailable" || res?.success === false) {
      throw new Error(res?.message || "Database unavailable");
    }
    return db.getCustomers();
  },
  fetchBanners: async () => {
    const res = await apiRequest("/banners");
    if (res?.success && Array.isArray(res.data)) {
      storeCache.banners = res.data;
      try {
        localStorage.setItem("aura_banners_cache", JSON.stringify(storeCache.banners));
      } catch (_) {}
    }
    return storeCache.banners;
  },
  fetchSettings: async () => {
    const res = await apiRequest("/settings");
    if (res?.success && res.data) {
      storeCache.settings = { ...storeCache.settings, ...res.data };
      try {
        localStorage.setItem("aura_settings_cache", JSON.stringify(storeCache.settings));
      } catch (_) {}
    }
    return storeCache.settings;
  },
  fetchCoupons: async () => {
    const res = await apiRequest("/coupons?scope=admin", { requiresAuth: true, noCache: true });
    if (res?.success && Array.isArray(res.data)) {
      const deletedIds = getDeletedCouponIds();
      const deletedCodes = getDeletedCouponCodes();
      storeCache.coupons = res.data.filter(c => 
        !deletedIds.has(String(c.id)) && 
        !deletedIds.has(String(c._id)) && 
        !deletedCodes.has(String(c.code || "").toUpperCase())
      );
      try {
        localStorage.setItem("aura_coupons_cache", JSON.stringify(storeCache.coupons));
      } catch (_) {}
      emitStoreUpdate("coupons:synced", storeCache.coupons);
    }
    return storeCache.coupons;
  },
  logProductView: async (meta = {}) => {
    try {
      const deviceId = (() => {
        try {
          let id = localStorage.getItem("aura_visitor_device_id");
          if (!id) {
            id = "dev_" + Math.random().toString(36).slice(2, 10) + "_" + Date.now().toString(36);
            localStorage.setItem("aura_visitor_device_id", id);
          }
          return id;
        } catch (_) {
          return "";
        }
      })();
      const payload = {
        deviceId,
        path: meta?.path || (typeof window !== "undefined" ? window.location.pathname : "/product"),
        productId: meta?.productId || "",
        productName: meta?.productName || ""
      };
      await apiRequest("/analytics/product-view", {
        method: "POST",
        body: JSON.stringify(payload)
      });
    } catch (_) {}
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
      body: JSON.stringify(arr),
      requiresAuth: true
    });
    if (!res?.success) {
      throw new Error(res?.message || "Failed to save banners. Database unavailable.");
    }
    storeCache.banners = arr;
    try {
      localStorage.setItem("aura_banners_cache", JSON.stringify(storeCache.banners));
      localStorage.setItem("aura_last_fetch_time", "0");
    } catch (_) {}
    emitStoreUpdate("banners:saved", arr);
    fetchHomeData(true).catch(() => {});
    return arr;
  },
  deleteBanner: async (id) => {
    const res = await apiRequest(`/banners/${encodeURIComponent(String(id))}`, {
      method: "DELETE",
      requiresAuth: true
    });
    if (!res?.success) {
      throw new Error(res?.message || "Failed to delete banner. Database unavailable.");
    }
    storeCache.banners = storeCache.banners.filter(b => b.id !== id && b._id !== id);
    try {
      localStorage.setItem("aura_banners_cache", JSON.stringify(storeCache.banners));
      localStorage.setItem("aura_last_fetch_time", "0");
    } catch (_) {}
    emitStoreUpdate("banners:deleted", id);
    fetchHomeData(true).catch(() => {});
    return true;
  },

  // ANALYTICS
  getAnalytics: () => storeCache.analytics,
  fetchAnalytics: async (range = "today") => {
    const safeRange = encodeURIComponent(String(range || "today"));
    const res = await apiRequest(`/analytics?range=${safeRange}`, { requiresAuth: true, noCache: true });
    if (res?.success && res.data) {
      if (!res.isFallback) setStoreDbStatus("connected");
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
  logVisit: async (meta = {}) => {
    try {
      const deviceId = (() => {
        try {
          let id = localStorage.getItem("aura_visitor_device_id");
          if (!id) {
            id = "dev_" + Math.random().toString(36).slice(2, 10) + "_" + Date.now().toString(36);
            localStorage.setItem("aura_visitor_device_id", id);
          }
          return id;
        } catch (_) {
          return "";
        }
      })();
      const path = meta?.path || (typeof window !== "undefined" ? window.location.pathname : "/");
      const title = meta?.title || (typeof document !== "undefined" ? document.title : "");

      storeCache.analytics.visits = (storeCache.analytics.visits || 0) + 1;
      emitStoreUpdate("analytics:updated", storeCache.analytics);

      const res = await apiRequest("/analytics/visit", {
        method: "POST",
        body: JSON.stringify({ deviceId, path, title })
      });
      if (res?.success && res.data) {
        storeCache.analytics = { ...storeCache.analytics, ...res.data };
      }
      return res;
    } catch (_) {
      return null;
    }
  },

  // PROMOTIONS & OFFERS
  getPromotions: () => storeCache.promotions,
  savePromotion: async (p) => {
    const id = p.id || ("PROMO-" + Date.now());
    const finalPromo = { ...p, id };

    const res = await apiRequest("/promotions", {
      method: "POST",
      body: JSON.stringify(finalPromo),
      requiresAuth: true
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
    const res = await apiRequest(`/promotions/${encodeURIComponent(String(id))}`, {
      method: "DELETE",
      requiresAuth: true
    });
    if (!res?.success) {
      throw new Error(res?.message || "Failed to delete promotion. Database is unavailable.");
    }
    storeCache.promotions = storeCache.promotions.filter(x => x.id !== id && x._id !== id);
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
      let title = res.data.title;
      if (res.data.discountType === "percentage" && (!title || title.includes("₹") || title === "₹200 OFF")) {
        const val = res.data.discountValue || 10;
        title = `Flat ${val}% OFF`;
      }
      storeCache.activeOffer = { 
        ...storeCache.activeOffer, 
        ...res.data,
        title: title || res.data.title,
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
    let title = offer.title;
    if (offer.discountType === "percentage" && (!title || title.includes("₹") || title === "₹200 OFF")) {
      const val = offer.discountValue || 10;
      title = `Flat ${val}% OFF`;
    }
    const isNeverExpire = offer.neverExpires === true || offer.timerEnabled === false;
    const isExplicitlyDisabled = offer.enabled === false || offer.status === "Disabled" || offer.status === "Inactive";
    const isExplicitlyEnabled = !isExplicitlyDisabled && (offer.enabled === true || offer.status === "Active");
    const isEnabled = isExplicitlyEnabled;
    const status = isEnabled ? "Active" : "Disabled";

    const resolvedSelectedProducts = Array.isArray(offer.applicableProducts) && offer.applicableProducts.length > 0
      ? offer.applicableProducts
      : (Array.isArray(offer.selectedProducts) ? offer.selectedProducts : (storeCache.activeOffer?.selectedProducts || []));

    const updated = {
      ...storeCache.activeOffer,
      ...offer,
      enabled: isEnabled,
      status: status,
      title: title || offer.title || "Special Offer",
      couponCode: String(offer.couponCode ?? "").trim().toUpperCase(),
      id: "OFFER-CENTRAL-1",
      neverExpires: isNeverExpire,
      autoApply: offer.autoApply !== false,
      selectedProducts: resolvedSelectedProducts,
      applicableProducts: resolvedSelectedProducts,
      expiresAt: isNeverExpire ? "" : (offer.expiresAt || offer.expiry || storeCache.activeOffer?.expiresAt || ""),
      expiry: isNeverExpire ? "" : (offer.expiresAt || offer.expiry || storeCache.activeOffer?.expiry || ""),
      startDate: offer.startDate || offer.startAt || storeCache.activeOffer?.startDate,
      startAt: offer.startDate || offer.startAt || storeCache.activeOffer?.startAt,
      updatedAt: new Date().toISOString()
    };

    // Optimistic persistence immediately
    storeCache.activeOffer = updated;
    try {
      localStorage.setItem("aura_active_offer_cache", JSON.stringify(storeCache.activeOffer));
      localStorage.setItem("aura_last_fetch_time", String(Date.now()));
    } catch (_) {}
    emitStoreUpdate("active-offer:saved", storeCache.activeOffer);

    try {
      const res = await apiRequest("/active-offer", {
        method: "POST",
        body: JSON.stringify(updated),
        requiresAuth: true,
        noCache: true
      });
      if (res?.success && res.data) {
        storeCache.activeOffer = { ...updated, ...res.data, updatedAt: new Date().toISOString() };
        try {
          localStorage.setItem("aura_active_offer_cache", JSON.stringify(storeCache.activeOffer));
        } catch (_) {}
        emitStoreUpdate("active-offer:saved", storeCache.activeOffer);
      }
    } catch (apiErr) {
      console.warn("Notice in saveActiveOffer background sync:", apiErr?.message);
    }

    return storeCache.activeOffer;
  },

  // STORE OFFERS / HOME DEALS
  getOffers: () => storeCache.offers,
  saveOffer: async (o) => {
    const id = o.id || o._id || ("OFF-" + Date.now());
    const finalOffer = { ...o, id };

    const curIdx = storeCache.offers.findIndex(x => x.id === id || String(x._id) === String(id));
    if (curIdx >= 0) storeCache.offers[curIdx] = finalOffer;
    else storeCache.offers.push(finalOffer);
    try {
      localStorage.setItem("aura_offers_cache", JSON.stringify(storeCache.offers));
      localStorage.setItem("aura_last_fetch_time", "0");
    } catch (_) {}
    emitStoreUpdate("offer:saved", finalOffer);
    emitStoreUpdate("offers:synced", storeCache.offers);

    try {
      const res = await apiRequest(`/offers/${encodeURIComponent(String(id))}`, {
        method: "PUT",
        body: JSON.stringify(finalOffer),
        requiresAuth: true
      });
      if (res?.status === 404 || (!res?.success && res?.message === "Offer not found")) {
        await apiRequest("/offers", {
          method: "POST",
          body: JSON.stringify(finalOffer),
          requiresAuth: true
        });
      }
    } catch (apiErr) {
      console.warn("Notice in saveOffer background sync:", apiErr?.message);
    }

    fetchHomeData(true).catch(() => {});
    return finalOffer;
  },
  deleteOffer: async (id) => {
    const strId = String(id);
    storeCache.offers = storeCache.offers.filter(x => x.id !== strId && String(x._id) !== strId);
    try {
      localStorage.setItem("aura_offers_cache", JSON.stringify(storeCache.offers));
      localStorage.setItem("aura_last_fetch_time", "0");
    } catch (_) {}
    emitStoreUpdate("offer:deleted", strId);
    emitStoreUpdate("offers:synced", storeCache.offers);
    try {
      await apiRequest(`/offers/${encodeURIComponent(strId)}`, {
        method: "DELETE",
        requiresAuth: true
      });
    } catch (_) {}
    fetchHomeData(true).catch(() => {});
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
    if (!p) return storeCache.activeOffer;
    const isPromoActive = p.enablePromo !== undefined ? Boolean(p.enablePromo) : (p.enabled !== undefined ? Boolean(p.enabled) : true);
    return await db.saveActiveOffer({
      ...storeCache.activeOffer,
      ...p,
      enabled: isPromoActive,
      status: isPromoActive ? "Active" : "Inactive"
    });
  },
  deleteTopPromo: async () => {
    return await db.saveActiveOffer({
      ...storeCache.activeOffer,
      enabled: false,
      status: "Inactive"
    });
  },

  // COUPONS & CART CALCULATION (server-authoritative pricing with robust local fallback)
  getCoupons: () => storeCache.coupons,
  getUserCart: async () => {
    try {
      const res = await apiRequest("/cart", { requiresAuth: true, noCache: true });
      if (res?.success) return res.data?.lines || [];
    } catch (_) {}
    return null;
  },
  saveUserCart: async (lines = []) => {
    try {
      const res = await apiRequest("/cart", {
        method: "POST",
        body: JSON.stringify({ lines }),
        requiresAuth: true,
        noCache: true
      });
      if (res?.success) return res.data?.lines || [];
    } catch (_) {}
    return null;
  },
  mergeUserCart: async (guestLines = []) => {
    try {
      const res = await apiRequest("/cart/merge", {
        method: "POST",
        body: JSON.stringify({ guestLines }),
        requiresAuth: true,
        noCache: true
      });
      if (res?.success) return res.data?.lines || [];
    } catch (_) {}
    return null;
  },
  calculateCartSync: (lines = [], couponCode = null) => {
    let prods = (storeCache && Array.isArray(storeCache.products) && storeCache.products.length > 0)
      ? storeCache.products
      : (db && typeof db.getProducts === "function" ? db.getProducts() : []);
    if ((!prods || prods.length === 0) && typeof localStorage !== "undefined") {
      try {
        const cached = JSON.parse(localStorage.getItem("aura_products_cache") || "[]");
        if (Array.isArray(cached) && cached.length > 0) prods = cached;
      } catch (_) {}
    }
    let subtotal = 0;
    let totalMrp = 0;
    const validItems = [];

    (lines || []).forEach(l => {
      const p = resolveCartProduct(prods, l)
        || prods.find(x => String(x.id) === String(l.id) || String(x._id) === String(l.id) || String(x.slug) === String(l.id));
      if (!p) return;
      const price = Number(p.price) || 0;
      if (price <= 0) return;
      const mrp = Number(p.mrp || p.comparePrice || price) || price;
      subtotal += price * (l.qty || 1);
      totalMrp += mrp * (l.qty || 1);
      validItems.push({
        id: l.id,
        productId: p.productId || p.id || l.id,
        name: p.name || "Sacred Rudraksha Item",
        price,
        mrp,
        quantity: l.qty || 1,
        qty: l.qty || 1,
        isIndonesian: !!p?.isIndonesian,
        isCustomMala: !!p?.isCustomMala || !!l?.isCustomMala,
        ...(p?.customMala || l?.customMala ? { customMala: p?.customMala || l?.customMala } : {}),
        ...(Array.isArray(p?.customMalaItems) && p.customMalaItems.length > 0
          ? { customMalaItems: p.customMalaItems }
          : Array.isArray(l?.customMalaItems) && l?.customMalaItems.length > 0
            ? { customMalaItems: l.customMalaItems }
            : {}),
        ...(p?.customDescription || l?.customDescription ? { customDescription: p?.customDescription || l?.customDescription } : {}),
        ...(p?.size || l?.size ? { size: p?.size || l?.size } : {}),
        ...(p?.variant || l?.variant ? { variant: p?.variant || l?.variant } : {}),
        origin: p?.origin || (p?.isIndonesian ? "Java / Indonesia" : "Nepal"),
        img: getProductPrimaryImage(p)
      });
    });

    const productSavings = Math.max(0, totalMrp - subtotal);
    const storeSettings = storeCache.settings || {};
    const standardFee = Number(storeSettings.standardShippingFee ?? 0);
    const threshold = Number(storeSettings.freeShippingThreshold ?? 0);
    const enableProductShipping = storeSettings.enableProductShipping !== false;

    let productShippingFees = 0;
    if (enableProductShipping) {
      (lines || []).forEach(l => {
        const p = resolveCartProduct(prods, l) || prods.find(x => String(x.id) === String(l.id));
        if (p && p.freeShipping === false && Number(p.shippingFee) > 0) {
          productShippingFees += Number(p.shippingFee) * (l.qty || 1);
        }
      });
    }

    const isBaseFreeShipping = subtotal === 0 || threshold === 0 || subtotal >= threshold;
    const baseShippingFee = isBaseFreeShipping ? 0 : standardFee;
    const shipping = baseShippingFee + productShippingFees;
    const isFreeShipping = (shipping === 0);
    const shippingDiscount = (isBaseFreeShipping && standardFee > 0) ? standardFee : 0;

    let couponDiscount = 0;
    let appliedCoupon = null;
    let couponStatus = "NONE";
    let couponValid = false;
    let couponReason = "";

    if (couponCode && String(couponCode).trim()) {
      const clean = String(couponCode).trim().toUpperCase();
      let coup = (storeCache.coupons || []).find(c => String(c.code || "").trim().toUpperCase() === clean);
      if (!coup && storeCache.activeOffer && storeCache.activeOffer.enabled !== false && storeCache.activeOffer.status === "Active") {
        const offerCode = String(storeCache.activeOffer.couponCode || "").trim().toUpperCase();
        if (offerCode && offerCode === clean) {
          const isPct = String(storeCache.activeOffer.discountType || "").toLowerCase() === "percentage";
          coup = {
            id: storeCache.activeOffer.id || "OFFER-CENTRAL-1",
            code: clean,
            discount: Number(storeCache.activeOffer.discountValue) || (isPct ? 10 : 200),
            type: isPct ? "percentage" : "fixed",
            status: "Active",
            expiry: storeCache.activeOffer.neverExpires ? null : (storeCache.activeOffer.expiresAt || storeCache.activeOffer.expiry),
            minAmount: 0,
            targetType: storeCache.activeOffer.targetType || "all",
            selectedProducts: storeCache.activeOffer.applicableProducts || storeCache.activeOffer.selectedProducts || [],
            excludedProducts: storeCache.activeOffer.excludedProducts || []
          };
        }
      }
      if (coup) {
        const isExp = coup.expiry && new Date(coup.expiry).getTime() < Date.now();
        const isDisabled = coup.status === "Inactive" || coup.status === "Disabled";
        const minSpend = Number(coup.minAmount || coup.minOrderValue || coup.minOrder || 0);

        if (isDisabled || isExp) {
          couponStatus = "INVALID";
          couponReason = `Coupon '${clean}' is ${isExp ? "expired" : "disabled"}.`;
        } else if (minSpend > 0 && subtotal < minSpend) {
          couponStatus = "NOT_ELIGIBLE";
          couponReason = `Minimum shopping amount of ₹${minSpend.toLocaleString()} required for coupon '${clean}'.`;
        } else {
          let eligibleSubtotal = 0;
          let eligibleItemCount = 0;
          const selIds = (coup.selectedProducts || []).map(String);
          const excIds = (coup.excludedProducts || []).map(String);
          const targetType = coup.targetType || "all";

          validItems.forEach(it => {
            const rawPId = String(it.productId || "").trim();
            const rawId = String(it.id || "").trim();
            const basePId = rawPId.replace(/-indo$|_indo$/i, "");
            const baseId = rawId.replace(/-indo$|_indo$/i, "");
            const matchIds = [rawPId, rawId, basePId, baseId, String(it._id || "")].filter(Boolean);
            let isItemEligible = true;

            if (excIds.length > 0 && matchIds.some(mid => excIds.includes(mid))) isItemEligible = false;
            if (targetType === "selected" && selIds.length > 0 && !matchIds.some(mid => selIds.includes(mid))) isItemEligible = false;

            if (isItemEligible) {
              eligibleSubtotal += Number(it.price * (it.qty || 1)) || 0;
              eligibleItemCount += (it.qty || 1);
            }
          });

          if (validItems.length > 0 && eligibleItemCount === 0) {
            couponStatus = "NOT_ELIGIBLE";
            couponReason = `Coupon '${clean}' is not applicable to the items in your cart.`;
          } else {
            const evalSubtotal = eligibleSubtotal > 0 ? eligibleSubtotal : subtotal;
            let rawDiscount = 0;

            const cTypeNorm = String(coup.type || "percentage").toLowerCase();
            const isFixedType = cTypeNorm === "fixed" || cTypeNorm.includes("flat");
            if (isFixedType) {
              rawDiscount = Number(coup.discount || coup.value || 0);
            } else {
              const pct = Number(coup.discount || coup.value || 10);
              rawDiscount = Math.round((evalSubtotal * pct) / 100);
            }

            const maxCap = Number(coup.maxDiscount || 0);
            if (maxCap > 0 && rawDiscount > maxCap) rawDiscount = maxCap;

            couponDiscount = Math.min(rawDiscount, evalSubtotal);
            couponValid = true;
            couponStatus = "APPLIED";
            couponReason = `Applied '${clean}' discount!`;
            appliedCoupon = {
              code: clean,
              discount: coup.discount,
              discountAmount: couponDiscount,
              type: coup.type || "percentage",
              valid: true,
              status: "APPLIED",
              reason: couponReason,
              minAmount: minSpend,
              targetType: coup.targetType || "all"
            };
          }
        }
      } else {
        couponStatus = "INVALID";
        couponReason = `Coupon '${clean}' is not valid`;
      }
    } else if (couponCode !== false) {
      // Automatic Store-wide Live Offer application when enabled and in automatic mode
      const liveOffer = storeCache.activeOffer;
      if (liveOffer && liveOffer.status === "Active" && liveOffer.enabled !== false && (liveOffer.autoApply !== false || !String(liveOffer.couponCode || "").trim())) {
        const isNeverExpire = liveOffer.neverExpires === true || liveOffer.timerEnabled === false;
        const expiryDate = liveOffer.expiry || liveOffer.expiresAt || null;
        const isExpired = !isNeverExpire && expiryDate && (new Date(expiryDate) < new Date());
        if (!isExpired) {
          const isPct = liveOffer.discountType === "percentage";
          const discountVal = Number(liveOffer.discountValue || 0);
          if (discountVal > 0 && subtotal > 0) {
            const tType = liveOffer.targetType || "all";
            const selProds = (liveOffer.applicableProducts || liveOffer.selectedProducts || []).map(String);
            const excProds = (liveOffer.excludedProducts || []).map(String);
            let eligibleSubtotal = 0;
            validItems.forEach(it => {
              const ids = [String(it.productId || ""), String(it.id || ""), String(it.productId || "").replace(/-indo$|_indo$/i, ""), String(it.id || "").replace(/-indo$|_indo$/i, "")].filter(Boolean);
              let eligible = true;
              if (tType === "selected" && selProds.length > 0) eligible = ids.some(mid => selProds.includes(mid));
              else if (tType === "excluded" && excProds.length > 0) eligible = !ids.some(mid => excProds.includes(mid));
              else if (tType === "all" && excProds.length > 0) eligible = !ids.some(mid => excProds.includes(mid));
              if (eligible) eligibleSubtotal += Number(it.price * (it.qty || 1)) || 0;
            });
            if (eligibleSubtotal > 0) {
              couponDiscount = isPct
                ? Math.min(eligibleSubtotal, Math.round((eligibleSubtotal * discountVal) / 100))
                : Math.min(eligibleSubtotal, discountVal);
              couponValid = true;
              couponStatus = "APPLIED";
              couponReason = `Automatic discount applied: ${liveOffer.title || "Central Live Offer"}`;
              appliedCoupon = {
                id: liveOffer.id || "OFFER-CENTRAL-1",
                code: liveOffer.couponCode || "LIVE-OFFER",
                status: "APPLIED",
                valid: true,
                discount: discountVal,
                discountAmount: couponDiscount,
                type: isPct ? "percentage" : "fixed",
                minOrder: 0,
                isAutomatic: true,
                description: liveOffer.title || "Live Store Offer",
                reason: couponReason
              };
            }
          }
        }
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
        freeShippingThreshold: threshold,
        standardShippingFee: standardFee,
        freeShippingRemaining: isFreeShipping ? 0 : Math.max(0, threshold - subtotal),
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
        itemCount: validItems.reduce((acc, it) => acc + (it.qty || 1), 0)
      }
    };
  },
  calculateCart: async (lines = [], couponCode = null) => {
    // 1. Attempt authoritative server calculation
    try {
      const res = await apiRequest("/cart/calculate", {
        method: "POST",
        body: JSON.stringify({ lines, couponCode })
      });
      if (res?.success && res.data && (res.data.subtotal > 0 || (lines || []).length === 0)) {
        return res;
      }
    } catch (_) {}

    // 2. Resilient local synchronous fallback
    return db.calculateCartSync(lines, couponCode);
  },

  validateCartCoupon: async (code, lines = []) => {
    try {
      const res = await apiRequest("/cart/validate-coupon", {
        method: "POST",
        body: JSON.stringify({ code, lines })
      });
      if (res?.success) {
        if (res.totals && res.totals.subtotal === 0 && (lines || []).length > 0) {
          const syncCalc = db.calculateCartSync(lines, code);
          if (syncCalc?.data) {
            res.totals = syncCalc.data;
          }
        }
        return res;
      }
    } catch (_) {}

    const clean = (code || "").trim().toUpperCase();
    let coup = (storeCache.coupons || []).find(c => (c.code || "").trim().toUpperCase() === clean);
    if (!coup && storeCache.activeOffer && storeCache.activeOffer.enabled !== false && storeCache.activeOffer.status === "Active") {
      const offerCode = String(storeCache.activeOffer.couponCode || "").trim().toUpperCase();
      if (offerCode && offerCode === clean) {
        const isPct = String(storeCache.activeOffer.discountType || "").toLowerCase() === "percentage";
        coup = {
          id: storeCache.activeOffer.id || "OFFER-CENTRAL-1",
          code: clean,
          discount: Number(storeCache.activeOffer.discountValue) || (isPct ? 10 : 200),
          type: isPct ? "percentage" : "fixed",
          status: "Active",
          expiry: storeCache.activeOffer.neverExpires ? null : (storeCache.activeOffer.expiresAt || storeCache.activeOffer.expiry),
          minAmount: 0,
          targetType: storeCache.activeOffer.targetType || "all",
          selectedProducts: storeCache.activeOffer.applicableProducts || storeCache.activeOffer.selectedProducts || [],
          excludedProducts: storeCache.activeOffer.excludedProducts || []
        };
      }
    }
    if (!coup) {
      return {
        success: false,
        valid: false,
        status: "INVALID",
        message: `Coupon '${clean}' is invalid or does not exist.`
      };
    }

    const isExp = coup.expiry && new Date(coup.expiry).getTime() < Date.now();
    const isDisabled = coup.status === "Inactive" || coup.status === "Disabled" || coup.active === false;
    if (isDisabled || isExp) {
      return {
        success: false,
        valid: false,
        status: isExp ? "EXPIRED" : "INVALID",
        message: `Coupon '${clean}' is ${isExp ? "expired" : "disabled"}.`
      };
    }

    // Compute cart subtotal reliably from resolved catalog products when inline price is omitted
    const syncCalc = db.calculateCartSync(lines, clean);
    const subtotal = Number(syncCalc?.data?.subtotal ?? lines.reduce((sum, l) => sum + ((l.price || l.product?.price || 0) * (l.qty || 1)), 0));
    const minSpend = Number(coup.minAmount || coup.minOrderValue || coup.minOrder || 0);

    if (minSpend > 0 && subtotal < minSpend) {
      return {
        success: false,
        valid: false,
        status: "NOT_ELIGIBLE",
        message: `Minimum shopping amount of ₹${minSpend.toLocaleString()} required to apply '${clean}'. (Your current subtotal: ₹${subtotal.toLocaleString()})`
      };
    }

    // Check item eligibility
    const selIds = (coup.selectedProducts || []).map(String);
    const excIds = (coup.excludedProducts || []).map(String);
    const targetType = coup.targetType || "all";

    if (lines.length > 0) {
      const eligibleItems = lines.filter(l => {
        const rawPId = String(l.productId || l.product?.id || l.product?._id || "").trim();
        const rawId = String(l.id || "").trim();
        const ids = [rawPId, rawId, rawPId.replace(/-indo$|_indo$/i, ""), rawId.replace(/-indo$|_indo$/i, "")].filter(Boolean);
        if (excIds.length > 0 && ids.some(mid => excIds.includes(mid))) return false;
        if (targetType === "selected" && selIds.length > 0 && !ids.some(mid => selIds.includes(mid))) return false;
        return true;
      });

      if (eligibleItems.length === 0) {
        return {
          success: false,
          valid: false,
          status: "NOT_ELIGIBLE",
          message: `Coupon '${clean}' is not applicable to the items in your cart.`
        };
      }
    }

    return {
      success: true,
      valid: true,
      status: "APPLIED",
      message: `Coupon '${clean}' applied successfully!`,
      data: syncCalc?.data?.appliedCoupon || coup,
      totals: syncCalc?.data || null
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
    const isUpdate = Boolean(c.id && !String(c.id).startsWith("temp_"));
    const id = c.id || ("COUP-" + Date.now());
    const finalCoupon = {
      ...c,
      id,
      code: (c.code || "").trim().toUpperCase(),
      discount: Number(c.discount) || 0,
      usage: Number(c.usage) || 0,
      limit: Number(c.limit) || 1000,
      minAmount: Number(c.minAmount || c.minOrder || 0),
      maxDiscount: Number(c.maxDiscount || 0),
      status: c.status || "Active",
      showOnHome: Boolean(c.showOnHome),
      showOnCart: c.showOnCart !== false,
      targetType: c.targetType || "all",
      selectedProducts: Array.isArray(c.selectedProducts) ? c.selectedProducts : [],
      excludedProducts: Array.isArray(c.excludedProducts) ? c.excludedProducts : []
    };

    let res;
    if (isUpdate) {
      res = await apiRequest(`/coupons/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify(finalCoupon),
        requiresAuth: true,
        noCache: true
      });
      if (res?.status === 404 || (!res?.success && res?.message === "Coupon not found")) {
        res = await apiRequest("/coupons", {
          method: "POST",
          body: JSON.stringify(finalCoupon),
          requiresAuth: true,
          noCache: true
        });
      }
    } else {
      res = await apiRequest("/coupons", {
        method: "POST",
        body: JSON.stringify(finalCoupon),
        requiresAuth: true,
        noCache: true
      });
    }

    if (!res?.success) {
      throw new Error(res?.message || "Failed to save coupon. Database is unavailable.");
    }

    const saved = res.data || finalCoupon;
    unrecordDeletedCoupon(id, finalCoupon.code);
    if (saved.id) unrecordDeletedCoupon(saved.id, saved.code);
    if (saved._id) unrecordDeletedCoupon(String(saved._id), saved.code);

    const curIdx = storeCache.coupons.findIndex(x => x.id === id || String(x._id) === id || x.code === finalCoupon.code);
    if (curIdx >= 0) storeCache.coupons[curIdx] = saved;
    else storeCache.coupons.unshift(saved);
    try {
      localStorage.setItem("aura_coupons_cache", JSON.stringify(storeCache.coupons));
      localStorage.setItem("aura_last_fetch_time", "0");
    } catch (_) {}
    broadcastCacheInvalidation();
    emitStoreUpdate("coupon:saved", saved);
    emitStoreUpdate("coupons:synced", storeCache.coupons);
    return saved;
  },

  deleteCoupon: async (id) => {
    const cleanId = String(id).trim();
    const existing = storeCache.coupons.find(
      x => x.id === cleanId || String(x._id) === cleanId || String(x.code || "").toUpperCase() === cleanId.toUpperCase()
    );
    const targetCode = (existing?.code || cleanId).trim().toUpperCase();
    const targetId = existing?.id || cleanId;
    const targetDbId = existing?._id ? String(existing._id) : null;

    // Record tombstones immediately in client localStorage
    recordDeletedCouponId(cleanId);
    if (targetId) recordDeletedCouponId(targetId);
    if (targetDbId) recordDeletedCouponId(targetDbId);
    if (targetCode) recordDeletedCouponCode(targetCode);

    try {
      await apiRequest(`/coupons/${encodeURIComponent(cleanId)}`, {
        method: "DELETE",
        requiresAuth: true,
        noCache: true
      });
    } catch (e) {
      console.warn("[Aura DB] Notice on coupon deletion API:", e?.message);
    }

    storeCache.coupons = (storeCache.coupons || []).filter(
      x => x.id !== cleanId && x.id !== targetId && String(x._id) !== targetDbId && String(x.code || "").toUpperCase() !== targetCode
    );
    try {
      localStorage.setItem("aura_coupons_cache", JSON.stringify(storeCache.coupons));
      localStorage.setItem("aura_last_fetch_time", "0");
    } catch (_) {}
    broadcastCacheInvalidation();

    // Clean up matching offers from store cache so they disappear immediately from Home UI
    storeCache.offers = (storeCache.offers || []).filter(
      x => String(x.couponCode || "").toUpperCase() !== targetCode && x.id !== targetId && x.id !== cleanId
    );
    try {
      localStorage.setItem("aura_offers_cache", JSON.stringify(storeCache.offers));
    } catch (_) {}

    // If active offer was using this coupon code, detach the code without disabling the offer
    if (targetCode && storeCache.activeOffer && String(storeCache.activeOffer.couponCode || "").toUpperCase() === targetCode) {
      storeCache.activeOffer = {
        ...storeCache.activeOffer,
        couponCode: ""
      };
      try {
        localStorage.setItem("aura_active_offer_cache", JSON.stringify(storeCache.activeOffer));
      } catch (_) {}
    }

    emitStoreUpdate("coupon:deleted", cleanId);
    emitStoreUpdate("coupons:synced", storeCache.coupons);
    emitStoreUpdate("offers:synced", storeCache.offers);
    return true;
  },

  // REVIEWS SYSTEM
  getReviews: (productId, tab = "all") => {
    const deletedIds = getDeletedReviewIds();
    let allReviews = storeCache.reviews
      .filter(r => 
        !deletedIds.has(String(r.id)) && 
        r.status !== "deleted" && 
        r.status !== "draft" && 
        r.status !== "Hidden" && 
        r.status !== "Rejected" &&
        r.source !== "ai_draft" &&
        r.publicDisplay !== false &&
        (r.status === "Approved" || r.status === "Published" || !r.status)
      )
      .map(r => ({
        id: r.id || "REV-" + Math.random().toString(36).substr(2, 9),
        type: r.type || (r.productId && r.productId !== "all" ? "product" : "store"),
        productId: r.productId ? String(r.productId) : "all",
        productName: r.productName || "Rudraksha Bead",
        name: r.name && r.name !== "AI DRAFT" ? r.name : "Aura Devotee",
        city: r.city || "",
        rating: Number(r.rating) || 5,
        title: r.title || "",
        text: (r.text || "").replace(/^AI\s*DRAFT\s*[—–-]\s*HUMAN\s*REVIEW\s*REQUIRED\s*[-—–:]?\s*/gi, "").replace(/^AI\s*DRAFT\s*[-—–:]\s*/gi, "").replace(/\[\s*AI\s*DRAFT\s*\]\s*/gi, "").trim(),
        originalText: r.originalText || r.text || "",
        processedText: r.processedText || r.text || "",
        date: r.date || "Recently",
        createdAt: r.createdAt || Date.now(),
        verified: r.verified !== false,
        featured: !!r.featured,
        source: r.source || "customer",
        status: r.status || "Approved",
        publicDisplay: true,
        images: (Array.isArray(r.images) ? r.images : (r.img ? [r.img] : [])).filter(img => img && typeof img === "string" && !/^\/images\/product-/i.test(img.trim()) && img !== "/images/placeholder.svg"),
        img: getProductPrimaryImage(r) !== "/images/placeholder.svg" ? getProductPrimaryImage(r) : null,
        helpfulUp: Number(r.helpfulUp) || 0,
        helpfulDown: Number(r.helpfulDown) || 0,
        adminReply: r.adminReply || null,
        isAiGenerated: !!r.isAiGenerated,
        aiProcessed: !!r.aiProcessed,
        aiModel: r.aiModel || "",
        language: r.language || "en"
      }));

    if (tab === "store") {
      return allReviews.filter(r => r.type === "store" || r.productId === "all");
    }

    if (!productId || productId === "all") return allReviews;

    const pIdStr = String(productId).trim().toLowerCase();
    const cleanTarget = pIdStr.replace(/^(product-card-|product-)/, "");

    const foundProduct = (storeCache.products || []).find(p => {
      if (!p) return false;
      const xId = String(p.id || "").toLowerCase();
      const xMongoId = String(p._id || "").toLowerCase();
      const xSlug = String(p.slug || "").toLowerCase();
      return xId === pIdStr || xId === cleanTarget || xMongoId === pIdStr || xSlug === pIdStr || (!isNaN(cleanTarget) && Number(p.id) === Number(cleanTarget));
    });

    const targetIds = new Set([
      pIdStr,
      cleanTarget,
      foundProduct?.id ? String(foundProduct.id).toLowerCase() : null,
      foundProduct?._id ? String(foundProduct._id).toLowerCase() : null,
      foundProduct?.slug ? String(foundProduct.slug).toLowerCase() : null,
      `product-card-${cleanTarget}`,
      `product-${cleanTarget}`
    ].filter(Boolean));

    const pName = foundProduct?.name ? foundProduct.name.trim().toLowerCase() : null;

    return allReviews.filter(r => {
      if (tab === "product" && r.type !== "product") return false;
      const rPid = String(r.productId || "").trim().toLowerCase();
      const rCleanPid = rPid.replace(/^(product-card-|product-)/, "");
      if (targetIds.has(rPid) || targetIds.has(rCleanPid)) return true;
      if (pName && r.productName && r.productName.trim().toLowerCase() === pName) return true;
      return false;
    });
  },

  revalidateReviews: async () => {
    try {
      const res = await apiRequest("/reviews");
      if (res?.success && Array.isArray(res.data)) {
        const deletedIds = getDeletedReviewIds();
        storeCache.reviews = res.data.filter(r => !deletedIds.has(String(r.id)) && r.status !== "deleted");
        localStorage.setItem("aura_reviews_cache", JSON.stringify(storeCache.reviews));
        db.recalculateAllProductsReviewStats();
        emitStoreUpdate("reviews:synced", storeCache.reviews);
        return storeCache.reviews;
      }
    } catch (e) {
      console.warn("Failed revalidateReviews fetch:", e);
    }
    return storeCache.reviews;
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
        name: r.name && r.name !== "AI DRAFT" ? r.name : "Aura Devotee",
        city: r.city || "",
        rating: Number(r.rating) || 5,
        title: r.title || "",
        text: (r.text || "").replace(/^AI\s*DRAFT\s*[—–-]\s*HUMAN\s*REVIEW\s*REQUIRED\s*[-—–:]?\s*/gi, "").replace(/^AI\s*DRAFT\s*[-—–:]\s*/gi, "").replace(/\[\s*AI\s*DRAFT\s*\]\s*/gi, "").trim(),
        originalText: r.originalText || r.text || "",
        processedText: r.processedText || r.text || "",
        date: r.date || "Recently",
        createdAt: r.createdAt || Date.now(),
        verified: r.verified !== false,
        featured: !!r.featured,
        source: r.source || "customer",
        status: r.status || "Approved",
        publicDisplay: r.publicDisplay !== false,
        images: (Array.isArray(r.images) ? r.images : (r.img ? [r.img] : [])).filter(img => img && typeof img === "string" && !/^\/images\/product-/i.test(img.trim()) && img !== "/images/placeholder.svg"),
        img: getProductPrimaryImage(r) !== "/images/placeholder.svg" ? getProductPrimaryImage(r) : null,
        helpfulUp: Number(r.helpfulUp) || 0,
        helpfulDown: Number(r.helpfulDown) || 0,
        adminReply: r.adminReply || null,
        isAiGenerated: !!r.isAiGenerated,
        aiProcessed: !!r.aiProcessed,
        aiModel: r.aiModel || "",
        language: r.language || "en"
      }));
  },

  saveReview: async (rev) => {
    const id = rev.id || ("REV-" + Date.now());
    const images = Array.isArray(rev.images) ? rev.images : (rev.img ? [rev.img] : []);
    const source = rev.source || "customer";
    const cleanText = (rev.text || "").replace(/^AI\s*DRAFT\s*[—–-]\s*HUMAN\s*REVIEW\s*REQUIRED\s*[-—–:]?\s*/gi, "").replace(/^AI\s*DRAFT\s*[-—–:]\s*/gi, "").replace(/\[\s*AI\s*DRAFT\s*\]\s*/gi, "").trim();

    const newRev = {
      ...rev,
      id,
      type: rev.type || (rev.productId && rev.productId !== "all" ? "product" : "store"),
      productId: rev.productId ? String(rev.productId) : "all",
      name: (rev.name && rev.name !== "AI DRAFT" && rev.name !== "Anonymous" ? rev.name.trim() : "Aura Devotee"),
      city: rev.city?.trim() || "Varanasi, UP",
      rating: Number(rev.rating) || 5,
      title: rev.title?.trim() || "",
      text: cleanText,
      date: rev.date || "Recently",
      createdAt: rev.createdAt || Date.now(),
      verified: rev.verified !== false,
      source: source,
      isAiGenerated: false,
      isSample: false,
      sampleLabel: "",
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
    const existingIdx = storeCache.reviews.findIndex(r => String(r.id) === String(saved.id));
    if (existingIdx !== -1) {
      storeCache.reviews[existingIdx] = saved;
    } else {
      storeCache.reviews.unshift(saved);
    }
    try {
      localStorage.setItem("aura_reviews_cache", JSON.stringify(storeCache.reviews));
      localStorage.setItem("aura_last_fetch_time", "0");
    } catch (_) {}
    if (saved.productId) {
      db.recalculateProductReviewStats(saved.productId);
    }
    emitStoreUpdate("review:saved", saved);
    emitStoreUpdate("reviews:synced", storeCache.reviews);
    emitStoreUpdate("products:synced", storeCache.products);
    fetchHomeData(true).catch(() => {});
    return saved;
  },

  updateReview: async (id, updatedFields) => {
    const res = await apiRequest(`/reviews/${encodeURIComponent(String(id))}`, {
      method: "PUT",
      body: JSON.stringify(updatedFields),
      requiresAuth: true
    });
    if (!res?.success) {
      throw new Error(res?.message || "Failed to update review. Database is unavailable.");
    }

    const serverUpdated = res.data;
    const strId = String(id);
    const idx = storeCache.reviews.findIndex(r => String(r.id) === strId || String(r._id) === strId);
    let updated;
    let oldProductId = null;
    if (idx !== -1) {
      const current = storeCache.reviews[idx];
      oldProductId = current.productId;
      const images = updatedFields.images !== undefined
        ? (Array.isArray(updatedFields.images) ? updatedFields.images : (updatedFields.img ? [updatedFields.img] : []))
        : current.images;

      updated = {
        ...current,
        ...updatedFields,
        ...(serverUpdated || {}),
        images,
        img: images[0] || null
      };

      storeCache.reviews[idx] = updated;
    } else {
      updated = serverUpdated || { id, ...updatedFields };
      storeCache.reviews.unshift(updated);
    }

    // Recompute product ratings and review count immediately
    try {
      localStorage.setItem("aura_reviews_cache", JSON.stringify(storeCache.reviews));
      localStorage.setItem("aura_last_fetch_time", "0");
    } catch (_) {}
    if (updated.productId) db.recalculateProductReviewStats(updated.productId);
    if (oldProductId && String(oldProductId) !== String(updated.productId)) {
      db.recalculateProductReviewStats(oldProductId);
    }
    emitStoreUpdate("review:updated", updated);
    emitStoreUpdate("reviews:synced", storeCache.reviews);
    emitStoreUpdate("products:synced", storeCache.products);
    fetchHomeData(true).catch(() => {});
    return updated;
  },

  deleteReview: async (id) => {
    const strId = String(id);
    const res = await apiRequest(`/reviews/${encodeURIComponent(strId)}`, {
      method: "DELETE",
      requiresAuth: true
    });
    if (!res?.success) {
      throw new Error(res?.message || "Failed to delete review. Database is unavailable.");
    }
    recordDeletedReviewId(strId);
    const targetRev = storeCache.reviews.find(r => String(r.id) === strId || String(r._id) === strId);
    const targetProductId = targetRev?.productId;
    storeCache.reviews = storeCache.reviews.filter(r => String(r.id) !== strId && String(r._id) !== strId);
    try {
      localStorage.setItem("aura_reviews_cache", JSON.stringify(storeCache.reviews));
      localStorage.setItem("aura_last_fetch_time", "0");
    } catch (_) {}
    if (targetProductId) {
      db.recalculateProductReviewStats(targetProductId);
    }
    emitStoreUpdate("review:deleted", { id: strId });
    emitStoreUpdate("reviews:synced", storeCache.reviews);
    emitStoreUpdate("products:synced", storeCache.products);
    fetchHomeData(true).catch(() => {});
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
      body: JSON.stringify(settings),
      requiresAuth: true
    });
    if (!res?.success) {
      throw new Error(res?.message || "Failed to save review settings. Database is unavailable.");
    }
    const saved = res.data || settings;
    storeCache.reviewSettings = { ...storeCache.reviewSettings, ...saved };
    try {
      localStorage.setItem("aura_review_settings_cache", JSON.stringify(storeCache.reviewSettings));
      localStorage.setItem("aura_last_fetch_time", "0");
    } catch (_) {}
    emitStoreUpdate("review:settings-updated", storeCache.reviewSettings);
    return storeCache.reviewSettings;
  },

  generateReviewDrafts: async (params) => {
    const res = await apiRequest("/reviews/generate-drafts", {
      method: "POST",
      body: JSON.stringify(params),
      requiresAuth: true,
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
      requiresAuth: true,
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
      try {
        localStorage.setItem("aura_reviews_cache", JSON.stringify(storeCache.reviews));
        localStorage.setItem("aura_last_fetch_time", "0");
      } catch (_) {}
      const distinctProductIds = new Set(savedList.map(s => String(s.productId)).filter(Boolean));
      distinctProductIds.forEach(pid => db.recalculateProductReviewStats(pid));
      emitStoreUpdate("review:bulk-saved", savedList);
      emitStoreUpdate("reviews:synced", storeCache.reviews);
      emitStoreUpdate("products:synced", storeCache.products);
      fetchHomeData(true).catch(() => {});
    }
    return { success: true, data: savedList, skipped: res.skipped || [] };
  },

  previewImportReviews: async (params) => {
    const res = await apiRequest("/reviews/preview-import", {
      method: "POST",
      body: JSON.stringify(params),
      requiresAuth: true,
      timeoutMs: 45000
    });
    if (!res?.success) {
      throw new Error(res?.message || "Failed to preview and parse review import data.");
    }
    return res;
  },

  importExternalReviews: async (reviews, importDefaults = {}, allowDuplicates = false) => {
    const res = await apiRequest("/reviews/import-external", {
      method: "POST",
      body: JSON.stringify({ reviews, importDefaults, allowDuplicates }),
      requiresAuth: true,
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
      try {
        localStorage.setItem("aura_reviews_cache", JSON.stringify(storeCache.reviews));
        localStorage.setItem("aura_last_fetch_time", "0");
      } catch (_) {}
      const distinctProductIds = new Set(importedList.map(s => String(s.productId)).filter(Boolean));
      distinctProductIds.forEach(pid => db.recalculateProductReviewStats(pid));
      emitStoreUpdate("review:imported", importedList);
      emitStoreUpdate("reviews:synced", storeCache.reviews);
      emitStoreUpdate("products:synced", storeCache.products);
      fetchHomeData(true).catch(() => {});
    }
    return res;
  },

  polishReviewWithAI: async ({ id, text, author, rating, productName, language }) => {
    const res = await apiRequest("/reviews/polish", {
      method: "POST",
      body: JSON.stringify({ id, text, author, rating, productName, language }),
      requiresAuth: true,
      timeoutMs: 25000
    });
    if (!res?.success) {
      throw new Error(res?.message || "Failed to polish review text with AI.");
    }
    if (res.data) {
      const idx = storeCache.reviews.findIndex(r => String(r.id) === String(res.data.id));
      if (idx !== -1) storeCache.reviews[idx] = res.data;
      try {
        localStorage.setItem("aura_reviews_cache", JSON.stringify(storeCache.reviews));
        localStorage.setItem("aura_last_fetch_time", "0");
      } catch (_) {}
      emitStoreUpdate("review:updated", res.data);
      emitStoreUpdate("reviews:synced", storeCache.reviews);
    }
    return res;
  },

  auditReviewHealth: async () => {
    const res = await apiRequest("/reviews/audit-health", {
      method: "GET"
    });
    if (!res?.success) {
      throw new Error(res?.message || "Failed to audit review health.");
    }
    return res;
  },

  repairMalformedReviews: async (reviewIds = []) => {
    const res = await apiRequest("/reviews/repair-database", {
      method: "POST",
      body: JSON.stringify({ reviewIds }),
      timeoutMs: 30000
    });
    if (!res?.success) {
      throw new Error(res?.message || "Failed to repair malformed reviews.");
    }
    await hydrateFromBackend();
    return res;
  },

  // STORE SETTINGS & POLICIES
  getSettings: () => storeCache.settings,
  saveSettings: async (settings) => {
    lastMutationTime = Date.now();
    // Optimistically update in-memory settings immediately so Home UI and Admin never flicker or revert
    storeCache.settings = { ...storeCache.settings, ...settings };
    if (Array.isArray(settings?.homeProductLayout?.live) && settings.homeProductLayout.live.length > 0) {
      const liveIds = settings.homeProductLayout.live.map(String);
      const liveIdxMap = new Map(liveIds.map((id, idx) => [id, idx + 1]));
      storeCache.products = (storeCache.products || []).map(p => {
        const pid = String(p.id || p._id || "");
        if (liveIdxMap.has(pid)) {
          const ord = liveIdxMap.get(pid);
          return { ...p, homeOrder: ord, sortOrder: ord, displayOrder: ord, showOnHome: true };
        }
        return p;
      });
      invalidateEnrichedProductsCache();
      try {
        localStorage.setItem("aura_products_cache", JSON.stringify(storeCache.products));
      } catch (_) {}
    }
    try {
      localStorage.setItem("aura_settings_cache", JSON.stringify(storeCache.settings));
    } catch (_) {}

    const res = await apiRequest("/settings", {
      method: "PUT",
      body: JSON.stringify(settings),
      requiresAuth: true,
      noCache: true
    });
    if (!res?.success) {
      throw new Error(res?.message || "Failed to save settings. Database is unavailable.");
    }
    lastMutationTime = Date.now();
    const saved = res.data || settings;
    storeCache.settings = { ...storeCache.settings, ... settings, ...saved };
    try {
      localStorage.setItem("aura_settings_cache", JSON.stringify(storeCache.settings));
      localStorage.setItem("aura_last_fetch_time", String(Date.now()));
    } catch (_) {}
    emitStoreUpdate("settings:saved", storeCache.settings);
    emitStoreUpdate("products:synced", storeCache.products);
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
      body: JSON.stringify(policies),
      requiresAuth: true
    });
    if (!res?.success) {
      throw new Error(res?.message || "Failed to save policies. Database is unavailable.");
    }
    const saved = res.data || policies;
    storeCache.settings = { ...storeCache.settings, ...saved };
    try {
      localStorage.setItem("aura_settings_cache", JSON.stringify(storeCache.settings));
      localStorage.setItem("aura_last_fetch_time", "0");
    } catch (_) {}
    emitStoreUpdate("policies:saved", saved);
    fetchHomeData(true).catch(() => {});
    return saved;
  },

  // SUPPORT TICKETS
  getCachedTickets: () => {
    if (Array.isArray(storeCache.tickets) && storeCache.tickets.length > 0) return storeCache.tickets;
    const cacheKey = db.getUserScopedKey("aura_tickets_cache");
    if (cacheKey && typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(cacheKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            storeCache.tickets = parsed;
            return parsed;
          }
        }
      } catch (_) {}
    }
    return storeCache.tickets || [];
  },

  getTickets: () => {
    const cached = db.getCachedTickets();
    return Array.isArray(cached) && cached.length > 0 ? cached : storeCache.tickets;
  },

  fetchTickets: async () => {
    const cacheKey = db.getUserScopedKey("aura_tickets_cache");
    try {
      const res = await apiRequest("/tickets", { noCache: true, requiresAuth: true });
      if (res?.success && Array.isArray(res.data)) {
        storeCache.tickets = res.data;
        if (cacheKey && typeof window !== "undefined") {
          try { localStorage.setItem(cacheKey, JSON.stringify(res.data)); } catch(_) {}
        }
        emitStoreUpdate("tickets:synced", storeCache.tickets);
        return storeCache.tickets;
      }
    } catch (_) {}
    const cached = db.getCachedTickets();
    return (Array.isArray(cached) && cached.length > 0) ? cached : storeCache.tickets;
  },

  saveTicket: async (t) => {
    const cacheKey = db.getUserScopedKey("aura_tickets_cache");
    const isExisting = Boolean(t.id && storeCache.tickets.some(x => x.id === t.id));
    const id = t.id || ("TIC-" + Math.floor(1000 + Math.random() * 9000));
    const finalTicket = { ...t, id, date: t.date || new Date().toISOString(), status: t.status || "Open" };

    let saved = finalTicket;
    try {
      const endpoint = isExisting ? `/tickets/${encodeURIComponent(id)}` : "/tickets";
      const method = isExisting ? "PUT" : "POST";
      const res = await apiRequest(endpoint, {
        method,
        body: JSON.stringify(finalTicket),
        requiresAuth: true,
        noCache: true
      });
      if (res?.success && res.data) {
        saved = res.data;
      }
    } catch (_) {}

    const idx = storeCache.tickets.findIndex(x => x.id === id);
    if (idx >= 0) storeCache.tickets[idx] = saved;
    else storeCache.tickets.unshift(saved);

    if (cacheKey && typeof window !== "undefined") {
      try { localStorage.setItem(cacheKey, JSON.stringify(storeCache.tickets)); } catch (_) {}
    }

    emitStoreUpdate("ticket:saved", saved);
    return saved;
  },

  // HELPERS FOR ORDERS & CUSTOMER PROFILES
  getOrderItemImage: (item) => {
    if (!item) return "/images/placeholder.svg";
    if (item.img && typeof item.img === "string" && item.img.trim() && !item.img.includes("placeholder.svg")) return item.img;
    if (item.image && typeof item.image === "string" && item.image.trim() && !item.image.includes("placeholder.svg")) return item.image;
    if (Array.isArray(item.customMalaItems) && item.customMalaItems.length > 0) {
      const beadWithImg = item.customMalaItems.find((b) => b?.img && typeof b.img === "string" && !b.img.includes("placeholder.svg"));
      if (beadWithImg) return beadWithImg.img;
    }
    if (item.id) {
      const p = db.getProduct(item.id);
      if (p) {
        if (p.img) return p.img;
        if (Array.isArray(p.images) && p.images[0]) return p.images[0];
      }
    }
    return "/images/placeholder.svg";
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
            discount: item.discount || 0,
            isCustomMala: Boolean(item.isCustomMala || String(id).startsWith("custom-mala-")),
            customMala: item.customMala || null,
            customMalaItems: Array.isArray(item.customMalaItems) ? item.customMalaItems : [],
            customDescription: item.customDescription || "",
            size: item.size || "",
            variant: item.variant || ""
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
        const img = p ? getProductPrimaryImage(p) : (typeof it === "object" ? db.getOrderItemImage(it) : "/images/placeholder.svg");
        const qty = typeof it === "object" && it !== null ? Math.max(1, Number(it.qty || it.quantity || 1)) : 1;

        if (!map[strId]) {
          map[strId] = {
            id: strId,
            name: name,
            price: price,
            qty: qty,
            img: img,
            isCustomMala: typeof it === "object" && it !== null ? Boolean(it.isCustomMala || strId.startsWith("custom-mala-")) : false,
            customMala: typeof it === "object" && it !== null ? (it.customMala || null) : null,
            customMalaItems: typeof it === "object" && it !== null && Array.isArray(it.customMalaItems) ? it.customMalaItems : [],
            customDescription: typeof it === "object" && it !== null ? (it.customDescription || "") : "",
            size: typeof it === "object" && it !== null ? (it.size || "") : "",
            variant: typeof it === "object" && it !== null ? (it.variant || "") : ""
          };
        } else {
          map[strId].qty += qty;
        }
      });
      return Object.values(map);
    }
    return [];
  },

  normalizeOrder: (o) => {
    if (!o) return o;
    if (!o.snapshotItems || !Array.isArray(o.snapshotItems) || o.snapshotItems.length === 0) {
      o.snapshotItems = db.normalizeOrderItems(o);
    }
    o.id = o.id || o.orderId || o.orderNumber;
    o.orderId = o.orderId || o.id;
    o.orderNumber = o.orderNumber || o.id;

    // Synchronize Order Status
    const isCancelled = o.status === "Cancelled" || o.orderStatus === "Cancelled" || Boolean(o.cancelledAt);
    if (isCancelled) {
      o.status = "Cancelled";
      o.orderStatus = "Cancelled";
      o.cancelledBy = o.cancelledBy || "Seller";
      o.cancelReason = o.cancelReason || "Order cancelled";
    } else {
      o.status = o.status || o.orderStatus || "Confirmed";
      o.orderStatus = o.status;
    }

    // Synchronize Payment and Refund Status
    const amtRefunded = Number(o.amountRefunded || 0);
    const totalAmt = Number(o.finalAmount || o.total || o.amount || 0);

    if (amtRefunded > 0 && amtRefunded >= (totalAmt - 0.01)) {
      o.refundStatus = "Refunded";
      o.paymentStatus = o.paymentStatus === "Paid" ? "Paid" : "Refunded";
    } else if (amtRefunded > 0) {
      o.refundStatus = "Partially Refunded";
      o.paymentStatus = "Partially Refunded";
    } else if (o.paymentStatus === "Refund Pending") {
      o.refundStatus = "Refund Pending";
    } else if (isCancelled && (!o.paymentStatus || ["Pending", "Failed", "Not Received", "Unpaid"].includes(o.paymentStatus))) {
      o.paymentStatus = "Not Received";
      o.refundStatus = "None";
    } else {
      o.refundStatus = o.refundStatus || "None";
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
    return found || null;
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
    storeCache.myOrders = [];
    storeCache.tickets = [];
    storeCache.customerMe = null;
    storeCache.wishlist = [];
  }
};

authClient.onAuthStateChanged(() => {
  db.clearUserCache();
});
