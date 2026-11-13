/**
 * Meta Ads (Facebook / Instagram Pixel) & Conversion Attribution Utility
 * Official Aura Rudraksha Meta Pixel ID: 1030324403433300
 * Tracks standard e-commerce events: PageView, ViewContent, AddToCart, InitiateCheckout, Purchase.
 */

export const DEFAULT_META_PIXEL_ID = "1030324403433300";

// If index.html already initialized window.fbq('init', '1030324403433300') and fired initial 'PageView',
// record that state immediately so React mount does not re-init or fire a duplicate initial PageView.
let initializedPixelId =
  typeof window !== "undefined" && typeof window.fbq === "function"
    ? DEFAULT_META_PIXEL_ID
    : null;

let lastTrackedPageViewPath =
  typeof window !== "undefined" && typeof window.fbq === "function"
    ? `${window.location.pathname}${window.location.search}`
    : "";

let lastViewContentKey = "";
let lastAddToCartKey = "";
let lastAddToCartTime = 0;
const firedPurchaseOrderIds = new Set();

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
 * Resolve active Meta Pixel ID from settings, environment, or official default (1030324403433300)
 */
export function getActiveMetaPixelId(settings = null) {
  if (typeof window === "undefined") return DEFAULT_META_PIXEL_ID;
  try {
    if (settings && settings.metaPixelId && /^\d{6,25}$/.test(String(settings.metaPixelId).trim())) {
      return String(settings.metaPixelId).trim();
    }
    const cachedSettingsRaw = localStorage.getItem("aura_settings_cache");
    if (cachedSettingsRaw) {
      const parsed = JSON.parse(cachedSettingsRaw);
      if (parsed && parsed.metaPixelId && /^\d{6,25}$/.test(String(parsed.metaPixelId).trim())) {
        return String(parsed.metaPixelId).trim();
      }
    }
    const envPixel = (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_META_PIXEL_ID)
      ? String(import.meta.env.VITE_META_PIXEL_ID).trim()
      : "";
    if (envPixel && /^\d{6,25}$/.test(envPixel)) {
      return envPixel;
    }
    return DEFAULT_META_PIXEL_ID;
  } catch (_) {
    return DEFAULT_META_PIXEL_ID;
  }
}

/**
 * Initialize Meta Pixel base script if not already initialized in index.html
 */
export function initMetaPixel(customPixelId = null, settings = null) {
  if (typeof window === "undefined") return false;
  captureAdAttribution();

  const pixelId = (customPixelId && String(customPixelId).trim()) || getActiveMetaPixelId(settings);
  if (!pixelId || !/^\d{6,25}$/.test(pixelId)) return false;

  try {
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
        t.onerror = function () {};
        s = b.getElementsByTagName(e)[0];
        if (s && s.parentNode) s.parentNode.insertBefore(t, s);
      })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
      /* eslint-enable */
    }

    if (initializedPixelId !== pixelId) {
      window.fbq("init", pixelId);
      initializedPixelId = pixelId;
      const currentPath = `${window.location.pathname}${window.location.search}`;
      if (lastTrackedPageViewPath !== currentPath) {
        window.fbq("track", "PageView");
        lastTrackedPageViewPath = currentPath;
      }
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
        window.fbq("track", "PageView");
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
      window.fbq("track", "ViewContent", {
        content_ids: [productId],
        content_name: String(product.name || "Sacred Rudraksha"),
        content_type: "product",
        content_category: String(product.category || product.mukhi || "Rudraksha"),
        value: Math.max(0, Number(product.price) || 0),
        currency: "INR"
      });
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
    const unitPrice = Math.max(0, Number(product.price ?? product.unitPrice) || 0);
    if (!productId) return;

    const now = Date.now();
    const dedupKey = `${productId}:${cleanQty}`;
    if (lastAddToCartKey === dedupKey && now - lastAddToCartTime < 500) {
      return;
    }

    if (initMetaPixel() && typeof window.fbq === "function") {
      lastAddToCartKey = dedupKey;
      lastAddToCartTime = now;
      window.fbq("track", "AddToCart", {
        content_ids: [productId],
        content_name: String(product.name || "Sacred Rudraksha"),
        content_type: "product",
        value: unitPrice * cleanQty,
        currency: "INR",
        num_items: cleanQty
      });
    }
  } catch (_) {}
}

/**
 * Track InitiateCheckout event
 */
export function trackMetaInitiateCheckout({ lines = [], finalTotal, total, value } = {}) {
  if (typeof window === "undefined") return;
  try {
    if (!Array.isArray(lines) || lines.length === 0) return;
    const resolvedValue = Math.max(0, Number(finalTotal ?? total ?? value) || 0);
    if (initMetaPixel() && typeof window.fbq === "function") {
      const contentIds = lines.map(l => String(l.id || l.productId || "")).filter(Boolean);
      const numItems = lines.reduce((sum, l) => sum + (Number(l.qty || l.quantity) || 1), 0);
      window.fbq("track", "InitiateCheckout", {
        content_ids: contentIds,
        content_type: "product",
        value: resolvedValue,
        currency: "INR",
        num_items: numItems || 1
      });
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

    // Never fire Purchase on cancelled or failed orders
    const statusLower = String(order.status || "").toLowerCase();
    const paymentStatusLower = String(order.paymentStatus || "").toLowerCase();
    if (statusLower === "cancelled" || statusLower === "failed" || paymentStatusLower === "failed") {
      return;
    }

    const value = Math.max(0, Number(order.finalAmount ?? order.total ?? order.amount ?? 0));
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

    if (initMetaPixel() && typeof window.fbq === "function") {
      const items = order.snapshotItems || order.items || order.lines || [];
      const contentIds = items.map(it => String(it.id || it.productId || "")).filter(Boolean);
      const numItems = items.reduce((sum, it) => sum + (Number(it.qty || it.quantity) || 1), 0);

      window.fbq(
        "track",
        "Purchase",
        {
          content_ids: contentIds,
          content_type: "product",
          value,
          currency: "INR",
          num_items: numItems || 1,
          order_id: orderId
        },
        { eventID: `PURCHASE_${orderId}` }
      );
    }
  } catch (_) {}
}

