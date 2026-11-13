/**
 * Meta Ads (Facebook / Instagram Pixel) & Conversion Attribution Utility
 * Official Aura Rudraksha Meta Pixel ID: 1485640013424198
 * Tracks standard e-commerce events: PageView, ViewContent, AddToCart, InitiateCheckout, Purchase.
 */

export const DEFAULT_META_PIXEL_ID = "1485640013424198";

// index.html initializes window.fbq('init', '1485640013424198') and fires the initial 'PageView'.
// Record the initial path immediately so React mount never fires a duplicate initial PageView.
let initialized =
  typeof window !== "undefined" && typeof window.fbq === "function";

let lastTrackedPageViewPath =
  typeof window !== "undefined" && typeof window.fbq === "function"
    ? `${window.location.pathname}${window.location.search}`
    : "";

let lastViewContentKey = "";
let lastAddToCartKey = "";
let lastAddToCartTime = 0;
const firedPurchaseOrderIds = new Set();

function makeEventId(prefix = "EV") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Normalize customer fields for Meta Advanced Matching (Event Match Quality 10/10)
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
      const rawUser = storage.getItem("aura_user") || storage.getItem("aura_customer_me_cache");
      if (rawUser) {
        const u = JSON.parse(rawUser);
        if (u && typeof u === "object") {
          stored = {
            ...u,
            ...stored,
            email: stored.em || stored.email || u.email,
            phone: stored.ph || stored.phone || u.phone || u.phoneNumber,
            name: stored.name || u.name || u.displayName,
            userId: stored.external_id || u.id || u._id
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
    if (typeof window.fbq === "function") {
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

/**
 * If an older Service Worker controller was still attached on first load,
 * send a direct keepalive fetch beacon (destination === "") which bypasses
 * legacy image-only Service Worker interception.
 */
function sendDirectPixelBeaconIfSwActive(eventName, customData = null) {
  if (typeof window === "undefined") return;
  try {
    const hasLegacySwController = Boolean(
      navigator.serviceWorker && navigator.serviceWorker.controller
    );
    if (!hasLegacySwController) return;

    const params = new URLSearchParams({
      id: DEFAULT_META_PIXEL_ID,
      ev: eventName,
      dl: `${window.location.origin}${window.location.pathname}`,
      rl: document.referrer || "",
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

// Fire immediate direct beacon on initial load if a legacy Service Worker was still controlling the tab
if (typeof window !== "undefined") {
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
      window.fbq("init", DEFAULT_META_PIXEL_ID, userData);
      initialized = true;
    } else if (!initialized) {
      window.fbq("init", DEFAULT_META_PIXEL_ID, userData);
      initialized = true;
    }
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * Track PageView event on SPA route changes (deduplicated against initial load and same-URL renders)
 */
export function trackMetaPageView() {
  if (typeof window === "undefined") return;
  try {
    captureAdAttribution();
    if (initMetaPixel() && typeof window.fbq === "function") {
      const currentPath = `${window.location.pathname}${window.location.search}`;
      if (lastTrackedPageViewPath !== currentPath) {
        window.fbq("track", "PageView", {}, { eventID: makeEventId("PV") });
        sendDirectPixelBeaconIfSwActive("PageView");
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
  try {
    const productId = String(product.id || product.productId || product._id || product.slug || "").trim();
    if (!productId) return;
    const viewKey = `${window.location.pathname}::${productId}`;
    if (lastViewContentKey === viewKey) return;

    if (initMetaPixel() && typeof window.fbq === "function") {
      lastViewContentKey = viewKey;
      const unitPrice = Number(Math.max(0, Number(product.price) || 0).toFixed(2));
      window.fbq(
        "track",
        "ViewContent",
        {
          content_ids: [productId],
          contents: [{ id: productId, quantity: 1, item_price: unitPrice }],
          content_name: String(product.name || "Sacred Rudraksha"),
          content_type: "product",
          content_category: String(product.category || product.mukhi || "Rudraksha"),
          value: unitPrice,
          currency: "INR"
        },
        { eventID: makeEventId(`VC_${productId}`) }
      );
    }
  } catch (_) {}
}

/**
 * Track AddToCart event (deduplicated within 500ms window to prevent double-firing)
 */
export function trackMetaAddToCart(product, qty = 1) {
  if (typeof window === "undefined" || !product) return;
  try {
    const productId = String(product.id || product.productId || product._id || product.slug || "").trim();
    const cleanQty = Math.max(1, Number(qty || product.qty || product.quantity) || 1);
    const unitPrice = Number(Math.max(0, Number(product.price ?? product.unitPrice) || 0).toFixed(2));
    if (!productId) return;

    const now = Date.now();
    const dedupKey = `${productId}:${cleanQty}`;
    if (lastAddToCartKey === dedupKey && now - lastAddToCartTime < 500) {
      return;
    }

    if (initMetaPixel() && typeof window.fbq === "function") {
      lastAddToCartKey = dedupKey;
      lastAddToCartTime = now;
      const totalVal = Number((unitPrice * cleanQty).toFixed(2));
      window.fbq(
        "track",
        "AddToCart",
        {
          content_ids: [productId],
          contents: [{ id: productId, quantity: cleanQty, item_price: unitPrice }],
          content_name: String(product.name || "Sacred Rudraksha"),
          content_type: "product",
          value: totalVal,
          currency: "INR",
          num_items: cleanQty
        },
        { eventID: makeEventId(`ATC_${productId}`) }
      );
    }
  } catch (_) {}
}

/**
 * Track InitiateCheckout event
 */
export function trackMetaInitiateCheckout({ lines = [], finalTotal, total, value, customer } = {}) {
  if (typeof window === "undefined") return;
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
      window.fbq(
        "track",
        "InitiateCheckout",
        {
          content_ids: contentIds,
          contents,
          content_type: "product",
          value: resolvedValue,
          currency: "INR",
          num_items: numItems || 1
        },
        { eventID: makeEventId("IC") }
      );
    }
  } catch (_) {}
}

/**
 * Track Purchase event (strictly verified orders only, deduplicated by orderId)
 */
export function trackMetaPurchase(order) {
  if (typeof window === "undefined" || !order) return;
  try {
    const orderId = String(order.orderNumber || order.id || order.orderId || order._id || "").trim();
    if (!orderId) return;

    // Only confirmed Paid or confirmed COD orders are conversion events.
    const statusLower = String(order.status || "").toLowerCase();
    const paymentStatusLower = String(order.paymentStatus || "").toLowerCase();
    const isCod = paymentStatusLower === "cod" ||
      String(order.paymentMethod || "").toLowerCase().includes("cod") ||
      String(order.paymentMode || "").toLowerCase() === "cod";
    const isPaid = paymentStatusLower === "paid";
    if (statusLower === "cancelled" || statusLower === "failed" ||
        paymentStatusLower === "failed" || (!isPaid && !isCod)) return;

    const value = Number(Math.max(0, Number(order.finalAmount ?? order.total ?? order.amount ?? 0)).toFixed(2));
    if (value <= 0 || !initMetaPixel() || typeof window.fbq !== "function") return;

    const storageKey = `aura_meta_purchase_tracked_${orderId}`;
    try {
      if (sessionStorage.getItem(storageKey) || localStorage.getItem(storageKey)) {
        firedPurchaseOrderIds.add(orderId);
        return;
      }
    } catch (_) {
      // Storage can be unavailable in privacy modes; in-memory dedupe still applies.
    }
    if (firedPurchaseOrderIds.has(orderId)) return;

    const cust = order.customer || {};
    syncMetaUserMatching({
      firstName: order.firstName || cust.firstName || order.addressDetails?.firstName,
      lastName: order.lastName || cust.lastName || order.addressDetails?.lastName,
      name: order.customerName || order.name || cust.name,
      email: order.customerEmail || order.email || cust.email || order.addressDetails?.email,
      phone: order.customerPhone || order.phone || cust.phone || order.addressDetails?.phone,
      city: order.city || cust.city || order.addressDetails?.city,
      state: order.state || cust.state || order.addressDetails?.state,
      pincode: order.pincode || cust.pincode || order.addressDetails?.pincode,
      userId: order.userId || order.customerId || cust.userId
    });

    const items = order.snapshotItems || order.items || order.lines || [];
    const contentIds = items.map(it => String(it.id || it.productId || "")).filter(Boolean);
    const contents = items.map(it => {
      const itemId = String(it.id || it.productId || "").trim();
      if (!itemId) return null;
      return {
        id: itemId,
        quantity: Math.max(1, Number(it.qty || it.quantity) || 1),
        item_price: Number(Math.max(0, Number(it.price ?? it.unitPrice) || 0).toFixed(2))
      };
    }).filter(Boolean);
    const numItems = items.reduce((sum, it) => sum + (Number(it.qty || it.quantity) || 1), 0);

    window.fbq("track", "Purchase", {
      content_ids: contentIds,
      contents,
      content_type: "product",
      value,
      currency: "INR",
      num_items: numItems || 1
    }, { eventID: `PURCHASE_${orderId}` });

    // Persist dedupe only after the Pixel event call was accepted.
    firedPurchaseOrderIds.add(orderId);
    try {
      sessionStorage.setItem(storageKey, "1");
      localStorage.setItem(storageKey, "1");
    } catch (_) {}
  } catch (_) {}
}

