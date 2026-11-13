/**
 * Meta Ads (Facebook / Instagram Pixel) & Conversion Attribution Utility
 * Official Aura Rudraksha Meta Pixel ID: 1485640013424198
 * Tracks standard e-commerce events: PageView, ViewContent, AddToCart, InitiateCheckout, Purchase.
 * Enforces Meta Business Tools Terms compliance:
 * - Blocks tracking on private/auth/admin/certificate routes
 * - Strips sensitive URL query parameters & PII before event capture
 * - Sanitizes health/medical keywords from event payload metadata
 * - Supports optional server-side Conversions API (CAPI) eventID deduplication
 */

export const DEFAULT_META_PIXEL_ID = "1485640013424198";

const RESTRICTED_PIXEL_PREFIXES = [
  "/admin",
  "/login",
  "/register",
  "/reset-password",
  "/verify-email",
  "/account",
  "/verify-certificate"
];

const SENSITIVE_QUERY_KEYS = new Set([
  "guesttoken",
  "guest_token",
  "txnid",
  "transaction_id",
  "oobcode",
  "apikey",
  "token",
  "secret",
  "password",
  "email",
  "phone",
  "reason",
  "error",
  "message",
  "q",
  "search",
  "query",
  "searchquery"
]);

const RESTRICTED_HEALTH_TERMS_REGEX =
  /\b(blood\s*pressure|hypertension|bp|diabetes|diabetic|sugar|cancer|tumor|tumour|depression|anxiety|insomnia|migraine|arthritis|asthma|heart\s*disease|kidney|liver|disease|disorder|illness|sickness|cure|remedy|medicine|medical|clinical|therapy|therapeutic|treatment|symptom|diagnosis|doctor|patient|ailment|wellness|health)\b/gi;

export function isRestrictedPixelPath(pathname = "") {
  const clean = String(pathname || (typeof window !== "undefined" ? window.location.pathname : "/"))
    .toLowerCase()
    .trim() || "/";
  return RESTRICTED_PIXEL_PREFIXES.some(
    (prefix) => clean === prefix || clean.startsWith(`${prefix}/`)
  );
}

export function hasSensitiveQueryParams(search = "") {
  try {
    const raw = String(search || (typeof window !== "undefined" ? window.location.search : ""));
    if (!raw || raw === "?") return false;
    const params = new URLSearchParams(raw);
    for (const key of params.keys()) {
      if (SENSITIVE_QUERY_KEYS.has(String(key || "").toLowerCase())) {
        return true;
      }
    }
    return false;
  } catch (_) {
    return false;
  }
}

export function sanitizePixelText(raw = "", fallback = "Sacred Rudraksha") {
  const str = String(raw || "").trim();
  if (!str) return fallback;
  const cleaned = str
    .replace(RESTRICTED_HEALTH_TERMS_REGEX, "spiritual")
    .replace(/\s{2,}/g, " ")
    .trim();
  return cleaned || fallback;
}

export function sanitizePixelCategory(raw = "") {
  const str = String(raw || "").trim();
  if (!str || RESTRICTED_HEALTH_TERMS_REGEX.test(str)) {
    return "Sacred Spiritual Beads";
  }
  return str;
}

export function getCleanPixelSourceUrl() {
  if (typeof window === "undefined" || !window.location) return "https://aurarudraksha.bond/";
  return `${window.location.origin}${window.location.pathname || "/"}`;
}

function getCookieVal(name) {
  if (typeof document === "undefined") return "";
  try {
    const m = (document.cookie || "").match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
    return m ? decodeURIComponent(m[1]) : "";
  } catch (_) {
    return "";
  }
}

function isServerCapiEnabled() {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage?.getItem("aura_meta_capi_enabled") === "1";
  } catch (_) {
    return false;
  }
}

function relayServerCapiEvent(eventName, eventId, customData = {}, extraUserData = {}) {
  if (typeof window === "undefined" || typeof fetch !== "function") return;
  if (!isServerCapiEnabled()) return;
  if (isRestrictedPixelPath(window.location.pathname)) return;
  try {
    const userData = getMetaAdvancedMatchingData(extraUserData);
    const fbp = getCookieVal("_fbp");
    const fbc = getCookieVal("_fbc");
    fetch("/api/meta/capi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        eventName,
        eventId,
        sourceUrl: getCleanPixelSourceUrl(),
        customData,
        userData: { ...userData, ...(fbp ? { fbp } : {}), ...(fbc ? { fbc } : {}) }
      })
    }).catch(() => {});
  } catch (_) {}
}

// index.html initializes window.fbq('init', '1485640013424198') on non-restricted public pages
// and fires initial PageView unless deferred on /payment-result or sensitive query URLs.
let initialized =
  typeof window !== "undefined" && typeof window.fbq === "function";

let lastTrackedPageViewPath =
  typeof window !== "undefined" &&
  typeof window.fbq === "function" &&
  !isRestrictedPixelPath(window.location.pathname) &&
  window.location.pathname.toLowerCase() !== "/payment-result" &&
  !hasSensitiveQueryParams(window.location.search)
    ? window.location.pathname
    : "";

let lastViewContentKey = "";
let lastAddToCartKey = "";
let lastAddToCartTime = 0;
const firedPurchaseOrderIds = new Set();

function makeEventId(prefix = "EV") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Normalize customer fields for Meta Advanced Matching (strictly standard 9 AM fields only).
 * fbevents.js automatically SHA-256 hashes normalized em, ph, fn, ln, ct, st, zp, country, external_id.
 */
function normalizeAdvancedMatching(raw = {}) {
  const result = { country: "in" };
  try {
    const storage = (typeof window !== "undefined" && window.localStorage)
      ? window.localStorage
      : (typeof localStorage !== "undefined" ? localStorage : null);
    if (storage) {
      let extId = storage.getItem("aura_external_id") || "";
      if (!extId) {
        extId = `aura_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 10)}`;
        storage.setItem("aura_external_id", extId);
      }
      result.external_id = String(raw.external_id || raw.userId || extId).trim();
    }

    const email = String(raw.em || raw.email || raw.customerEmail || "").trim().toLowerCase();
    if (email && email.includes("@")) {
      result.em = email;
    }

    const rawPhone = String(raw.ph || raw.phone || raw.customerPhone || "").replace(/\D/g, "");
    if (rawPhone.length >= 10) {
      const clean10 = rawPhone.slice(-10);
      result.ph = `91${clean10}`;
    }

    let firstName = String(raw.fn || raw.firstName || "").trim().toLowerCase();
    let lastName = String(raw.ln || raw.lastName || "").trim().toLowerCase();
    const fullName = String(raw.name || raw.customerName || "").trim().toLowerCase();
    if (!firstName && fullName) {
      const parts = fullName.split(/\s+/);
      firstName = parts[0] || "";
      if (!lastName && parts.length > 1) {
        lastName = parts.slice(1).join(" ");
      }
    }
    if (firstName) result.fn = firstName.replace(/[^a-z\u0900-\u097f]/g, "");
    if (lastName) result.ln = lastName.replace(/[^a-z\u0900-\u097f]/g, "");

    const city = String(raw.ct || raw.city || "").trim().toLowerCase().replace(/[^a-z]/g, "");
    if (city) result.ct = city;

    const state = String(raw.st || raw.state || "").trim().toLowerCase().replace(/[^a-z]/g, "");
    if (state) result.st = state;

    const zip = String(raw.zp || raw.pincode || raw.zip || "").replace(/\D/g, "");
    if (zip.length >= 5) result.zp = zip;
  } catch (_) {}
  return result;
}

/**
 * Retrieve and merge all available customer matching parameters from localStorage & current session
 */
export function getMetaAdvancedMatchingData(extra = {}) {
  if (typeof window === "undefined") return { country: "in" };
  try {
    let stored = {};
    const storage = window.localStorage || (typeof localStorage !== "undefined" ? localStorage : null);
    if (storage) {
      const rawMeta = storage.getItem("aura_meta_user_data");
      if (rawMeta) {
        stored = JSON.parse(rawMeta) || {};
      }
      const rawUser = storage.getItem("aura_user") || storage.getItem("aura_customer_me_cache") || storage.getItem("aura_cached_user");
      if (rawUser) {
        const u = JSON.parse(rawUser);
        if (u && typeof u === "object") {
          stored = {
            ...u,
            ...stored,
            email: stored.em || stored.email || u.email,
            phone: stored.ph || stored.phone || u.phone || u.phoneNumber,
            name: stored.name || u.name || u.displayName,
            city: stored.ct || stored.city || u.city,
            state: stored.st || stored.state || u.state,
            pincode: stored.zp || stored.pincode || u.pincode,
            userId: stored.external_id || u.id || u._id || u.uid || u.authUserId
          };
        }
      }
    }
    const cleanExtra = {};
    if (extra && typeof extra === "object") {
      for (const [k, v] of Object.entries(extra)) {
        if (v !== undefined && v !== null && String(v).trim() !== "") {
          cleanExtra[k] = v;
        }
      }
    }
    const merged = normalizeAdvancedMatching({ ...stored, ...cleanExtra });
    if (storage) {
      storage.setItem("aura_meta_user_data", JSON.stringify(merged));
    }
    return merged;
  } catch (_) {
    return { country: "in" };
  }
}

/**
 * Update Meta Pixel Advanced Matching parameters dynamically when customer enters/updates info
 */
export function syncMetaUserMatching(customerData = {}) {
  if (typeof window === "undefined") return;
  try {
    const userData = getMetaAdvancedMatchingData(customerData);
    if (typeof window.fbq === "function" && !isRestrictedPixelPath(window.location.pathname)) {
      window.fbq("dataProcessingOptions", []);
      window.fbq("init", DEFAULT_META_PIXEL_ID, userData);
    }
  } catch (_) {}
}

/**
 * Ensure first-party _fbp and _fbc cookies are set for high Event Match Quality
 */
function ensureFirstPartyMetaCookies(fbclid = "") {
  if (typeof document === "undefined") return;
  try {
    const now = Date.now();
    const cookies = document.cookie || "";
    const maxAge = 90 * 24 * 60 * 60; // 90 days
    if (!cookies.includes("_fbp=")) {
      const fbp = `fb.1.${now}.${Math.floor(1000000000 + Math.random() * 9000000000)}`;
      document.cookie = `_fbp=${fbp}; path=/; max-age=${maxAge}; SameSite=Lax`;
    }
    if (fbclid) {
      const fbc = `fb.1.${now}.${fbclid}`;
      document.cookie = `_fbc=${fbc}; path=/; max-age=${maxAge}; SameSite=Lax`;
    }
  } catch (_) {}
}

function getScrubbedReferrer() {
  if (typeof document === "undefined" || !document.referrer) return "";
  try {
    const u = new URL(document.referrer);
    return `${u.origin}${u.pathname}`;
  } catch (_) {
    return "";
  }
}

/**
 * If an older Service Worker controller was still attached on first load,
 * send a direct keepalive fetch beacon (destination === "") which bypasses
 * legacy image-only Service Worker interception.
 */
function sendDirectPixelBeaconIfSwActive(eventName, customData = null) {
  if (typeof window === "undefined") return;
  if (isRestrictedPixelPath(window.location.pathname)) return;
  try {
    const hasLegacySwController = Boolean(
      navigator.serviceWorker && navigator.serviceWorker.controller
    );
    if (!hasLegacySwController) return;

    const params = new URLSearchParams({
      id: DEFAULT_META_PIXEL_ID,
      ev: eventName,
      dl: `${window.location.origin}${window.location.pathname}`,
      rl: getScrubbedReferrer(),
      if: "false",
      ts: String(Date.now()),
      sw: String(window.screen?.width || 0),
      sh: String(window.screen?.height || 0),
      v: "2.9.179",
      r: "stable",
      ec: "1",
      o: "4126"
    });
    if (customData && typeof customData === "object") {
      Object.entries(customData).forEach(([k, v]) => {
        if (v !== undefined && v !== null) {
          params.set(`cd[${k}]`, Array.isArray(v) ? JSON.stringify(v) : String(v));
        }
      });
    }
    const url = `https://www.facebook.com/tr/?${params.toString()}`;
    if (typeof fetch === "function") {
      fetch(url, { mode: "no-cors", keepalive: true, credentials: "include" }).catch(() => {});
    }
  } catch (_) {}
}

// Fire immediate direct beacon on initial load only on non-restricted public pages
if (
  typeof window !== "undefined" &&
  !isRestrictedPixelPath(window.location.pathname) &&
  window.location.pathname.toLowerCase() !== "/payment-result" &&
  !hasSensitiveQueryParams(window.location.search)
) {
  sendDirectPixelBeaconIfSwActive("PageView");
}

/**
 * Capture UTM parameters, fbclid & igshid from Meta (Facebook / Instagram) Ads clicks for order attribution
 */
export function captureAdAttribution() {
  if (typeof window === "undefined") return;
  try {
    const params = new URLSearchParams(window.location.search);
    const fbclid = params.get("fbclid") || "";
    const igshid = params.get("igshid") || params.get("igsh") || "";
    const utmSource = params.get("utm_source") || "";
    const utmMedium = params.get("utm_medium") || "";
    const utmCampaign = params.get("utm_campaign") || "";
    const utmContent = params.get("utm_content") || "";
    const utmTerm = params.get("utm_term") || "";

    ensureFirstPartyMetaCookies(fbclid);

    if (fbclid || igshid || utmSource || utmCampaign) {
      const attribution = {
        fbclid: fbclid || igshid,
        igshid,
        utmSource: utmSource || (igshid ? "instagram_ads" : fbclid ? "facebook_ads" : ""),
        utmMedium: utmMedium || ((fbclid || igshid) ? "paid_social" : ""),
        utmCampaign,
        utmContent,
        utmTerm,
        landingPage: window.location.pathname,
        timestamp: new Date().toISOString()
      };
      sessionStorage.setItem("aura_ad_attribution", JSON.stringify(attribution));
      localStorage.setItem("aura_ad_attribution", JSON.stringify(attribution));
    }
  } catch (_) {}
}

/**
 * Get stored ad attribution for attaching to orders
 */
export function getAdAttribution() {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem("aura_ad_attribution") || localStorage.getItem("aura_ad_attribution");
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return null;
}

/**
 * Always returns the single official Meta Pixel ID (1485640013424198)
 */
export function getActiveMetaPixelId() {
  return DEFAULT_META_PIXEL_ID;
}

/**
 * Ensure Meta Pixel (1485640013424198) is ready with Advanced Matching customer parameters
 */
export function initMetaPixel() {
  if (typeof window === "undefined") return false;
  if (isRestrictedPixelPath(window.location.pathname)) return false;
  captureAdAttribution();

  try {
    const userData = getMetaAdvancedMatchingData();
    if (!window.fbq) {
      /* eslint-disable */
      !(function (f, b, e, v, n, t, s) {
        if (f.fbq) return;
        n = f.fbq = function () {
          n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
        };
        if (!f._fbq) f._fbq = n;
        n.push = n;
        n.loaded = !0;
        n.version = "2.0";
        n.queue = [];
        t = b.createElement(e);
        t.async = !0;
        t.src = v;
        s = b.getElementsByTagName(e)[0];
        if (s && s.parentNode) s.parentNode.insertBefore(t, s);
      })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
      /* eslint-enable */
      window.fbq("dataProcessingOptions", []);
      window.fbq("init", DEFAULT_META_PIXEL_ID, userData);
      initialized = true;
    } else if (!initialized) {
      window.fbq("dataProcessingOptions", []);
      window.fbq("init", DEFAULT_META_PIXEL_ID, userData);
      initialized = true;
    }
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * Track PageView event on SPA route changes (skips restricted paths and sensitive URL query parameters)
 */
export function trackMetaPageView() {
  if (typeof window === "undefined") return;
  if (isRestrictedPixelPath(window.location.pathname)) return;
  if (hasSensitiveQueryParams(window.location.search)) return;
  try {
    captureAdAttribution();
    if (initMetaPixel() && typeof window.fbq === "function") {
      const currentPath = window.location.pathname;
      if (lastTrackedPageViewPath !== currentPath) {
        const eventId = makeEventId("PV");
        window.fbq("track", "PageView", {}, { eventID: eventId });
        sendDirectPixelBeaconIfSwActive("PageView");
        relayServerCapiEvent("PageView", eventId);
        lastTrackedPageViewPath = currentPath;
      }
    }
  } catch (_) {}
}

/**
 * Track ViewContent event on Product Detail Page
 */
export function trackMetaViewContent(product) {
  if (typeof window === "undefined" || !product) return;
  if (isRestrictedPixelPath(window.location.pathname)) return;
  try {
    const productId = String(product.id || product.productId || product._id || product.slug || "").trim();
    if (!productId) return;
    const viewKey = `${window.location.pathname}::${productId}`;
    if (lastViewContentKey === viewKey) return;

    if (initMetaPixel() && typeof window.fbq === "function") {
      lastViewContentKey = viewKey;
      const unitPrice = Number(Math.max(0, Number(product.price) || 0).toFixed(2));
      const payload = {
        content_ids: [productId],
        contents: [{ id: productId, quantity: 1, item_price: unitPrice }],
        content_name: sanitizePixelText(product.name, "Sacred Rudraksha"),
        content_type: "product",
        content_category: sanitizePixelCategory(product.category || product.mukhi || "Sacred Spiritual Beads"),
        value: unitPrice,
        currency: "INR"
      };
      const eventId = makeEventId(`VC_${productId}`);
      window.fbq("track", "ViewContent", payload, { eventID: eventId });
      relayServerCapiEvent("ViewContent", eventId, payload);
    }
  } catch (_) {}
}

/**
 * Track AddToCart event (deduplicated within 800ms window to prevent double-firing)
 */
export function trackMetaAddToCart(product, qty = 1) {
  if (typeof window === "undefined" || !product) return;
  if (isRestrictedPixelPath(window.location.pathname)) return;
  try {
    const productId = String(product.id || product.productId || product._id || product.slug || "").trim();
    const cleanQty = Math.max(1, Number(qty || product.qty || product.quantity) || 1);
    const unitPrice = Number(Math.max(0, Number(product.price ?? product.unitPrice) || 0).toFixed(2));
    if (!productId) return;

    const now = Date.now();
    const baseDedupId = productId.replace(/-indo$|_indo$/i, "");
    const dedupKey = `${baseDedupId}:${cleanQty}`;
    if (lastAddToCartKey === dedupKey && now - lastAddToCartTime < 800) {
      return;
    }

    if (initMetaPixel() && typeof window.fbq === "function") {
      lastAddToCartKey = dedupKey;
      lastAddToCartTime = now;
      const totalVal = Number((unitPrice * cleanQty).toFixed(2));
      const payload = {
        content_ids: [productId],
        contents: [{ id: productId, quantity: cleanQty, item_price: unitPrice }],
        content_name: sanitizePixelText(product.name, "Sacred Rudraksha"),
        content_type: "product",
        value: totalVal,
        currency: "INR",
        num_items: cleanQty
      };
      const eventId = makeEventId(`ATC_${productId}`);
      window.fbq("track", "AddToCart", payload, { eventID: eventId });
      relayServerCapiEvent("AddToCart", eventId, payload);
    }
  } catch (_) {}
}

/**
 * Track InitiateCheckout event
 */
export function trackMetaInitiateCheckout({ lines = [], finalTotal, total, value, customer } = {}) {
  if (typeof window === "undefined") return;
  if (isRestrictedPixelPath(window.location.pathname)) return;
  try {
    if (!Array.isArray(lines) || lines.length === 0) return;
    if (customer && typeof customer === "object") {
      syncMetaUserMatching(customer);
    }
    const resolvedValue = Number(Math.max(0, Number(finalTotal ?? total ?? value) || 0).toFixed(2));
    if (initMetaPixel() && typeof window.fbq === "function") {
      const contentIds = lines.map(l => String(l.id || l.productId || "")).filter(Boolean);
      const contents = lines
        .map(l => {
          const itemId = String(l.id || l.productId || "").trim();
          if (!itemId) return null;
          return {
            id: itemId,
            quantity: Math.max(1, Number(l.qty || l.quantity) || 1),
            item_price: Number(Math.max(0, Number(l.price ?? l.unitPrice) || 0).toFixed(2))
          };
        })
        .filter(Boolean);
      const numItems = lines.reduce((sum, l) => sum + (Number(l.qty || l.quantity) || 1), 0);
      const payload = {
        content_ids: contentIds,
        contents,
        content_type: "product",
        value: resolvedValue,
        currency: "INR",
        num_items: numItems || 1
      };
      const eventId = makeEventId("IC");
      window.fbq("track", "InitiateCheckout", payload, { eventID: eventId });
      relayServerCapiEvent("InitiateCheckout", eventId, payload, customer || {});
    }
  } catch (_) {}
}

/**
 * Track Purchase event (strictly verified orders only, deduplicated by orderId)
 */
export function trackMetaPurchase(order) {
  if (typeof window === "undefined" || !order) return;
  if (isRestrictedPixelPath(window.location.pathname)) return;
  try {
    const orderId = String(order.orderNumber || order.id || order.orderId || order._id || "").trim();
    if (!orderId) return;

    // Never fire Purchase on cancelled or failed orders
    const statusLower = String(order.status || "").toLowerCase();
    const paymentStatusLower = String(order.paymentStatus || "").toLowerCase();
    if (
      statusLower === "cancelled" ||
      statusLower === "failed" ||
      paymentStatusLower === "failed" ||
      paymentStatusLower === "cancelled"
    ) {
      return;
    }

    const value = Number(
      Math.max(0, Number(order.finalAmount ?? order.totalAmount ?? order.total ?? order.amount ?? 0)).toFixed(2)
    );
    if (value <= 0) return;

    if (firedPurchaseOrderIds.has(orderId)) return;
    const storageKey = `aura_meta_purchase_tracked_${orderId}`;
    try {
      if (sessionStorage.getItem(storageKey) || localStorage.getItem(storageKey)) {
        firedPurchaseOrderIds.add(orderId);
        return;
      }
      firedPurchaseOrderIds.add(orderId);
      sessionStorage.setItem(storageKey, "1");
      localStorage.setItem(storageKey, "1");
    } catch (_) {
      firedPurchaseOrderIds.add(orderId);
    }

    // Sync customer matching parameters from confirmed order before firing Purchase for high Event Match Quality
    const cust = order.customer || {};
    const ship = order.shippingAddress || order.addressDetails || {};
    const customerInfo = {
      firstName: order.firstName || cust.firstName || ship.firstName,
      lastName: order.lastName || cust.lastName || ship.lastName,
      name: order.customerName || order.name || cust.name,
      email: order.customerEmail || order.email || cust.email || ship.email,
      phone: order.customerPhone || order.phone || cust.phone || ship.phone,
      city: order.city || cust.city || ship.city,
      state: order.state || cust.state || ship.state,
      pincode: order.pincode || cust.pincode || ship.pincode,
      userId: order.authUserId || order.userId || order.customerId || cust.userId
    };
    syncMetaUserMatching(customerInfo);

    if (initMetaPixel() && typeof window.fbq === "function") {
      const items = order.snapshotItems || order.items || order.lines || [];
      const contentIds = items
        .map(it => (typeof it === "string" ? it : String(it?.id || it?.productId || it?._id || "")).trim())
        .filter(Boolean);
      const contents = items
        .map(it => {
          if (typeof it === "string") {
            return { id: it.trim(), quantity: 1, item_price: value };
          }
          if (!it || typeof it !== "object") return null;
          const itemId = String(it.id || it.productId || it._id || "").trim();
          if (!itemId) return null;
          return {
            id: itemId,
            quantity: Math.max(1, Number(it.qty || it.quantity) || 1),
            item_price: Number(Math.max(0, Number(it.price ?? it.unitPrice) || 0).toFixed(2))
          };
        })
        .filter(Boolean);
      const numItems = items.reduce(
        (sum, it) => sum + (typeof it === "object" ? (Number(it?.qty || it?.quantity) || 1) : 1),
        0
      );

      const payload = {
        content_ids: contentIds,
        contents,
        content_type: "product",
        value,
        currency: "INR",
        num_items: numItems || 1
      };
      const eventId = `PURCHASE_${orderId}`;
      window.fbq("track", "Purchase", payload, { eventID: eventId });
      relayServerCapiEvent("Purchase", eventId, payload, customerInfo);
    }
  } catch (_) {}
}
