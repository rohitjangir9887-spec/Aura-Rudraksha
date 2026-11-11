/**
 * Meta Ads (Facebook / Instagram Pixel) & Conversion Attribution Utility
 * Supports dynamic Pixel ID configuration from Admin Settings or VITE_META_PIXEL_ID.
 * Tracks standard e-commerce events: PageView, ViewContent, AddToCart, InitiateCheckout, Purchase.
 */

let initializedPixelId = null;
const firedPurchaseOrderIds = new Set();

/**
 * Capture UTM parameters & fbclid from Meta Ads clicks for order attribution
 */
export function captureAdAttribution() {
  if (typeof window === "undefined") return;
  try {
    const params = new URLSearchParams(window.location.search);
    const fbclid = params.get("fbclid") || "";
    const utmSource = params.get("utm_source") || "";
    const utmMedium = params.get("utm_medium") || "";
    const utmCampaign = params.get("utm_campaign") || "";
    const utmContent = params.get("utm_content") || "";

    if (fbclid || utmSource || utmCampaign) {
      const attribution = {
        fbclid,
        utmSource: utmSource || (fbclid ? "meta_ads" : ""),
        utmMedium: utmMedium || (fbclid ? "paid_social" : ""),
        utmCampaign,
        utmContent,
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
 * Resolve active Meta Pixel ID from settings or environment
 */
export function getActiveMetaPixelId(settings = null) {
  if (typeof window === "undefined") return "";
  try {
    if (settings && settings.metaPixelEnabled === false) return "";
    if (settings && settings.metaPixelId && String(settings.metaPixelId).trim()) {
      return String(settings.metaPixelId).trim();
    }
    const cachedSettingsRaw = localStorage.getItem("aura_settings_cache");
    if (cachedSettingsRaw) {
      const parsed = JSON.parse(cachedSettingsRaw);
      if (parsed && parsed.metaPixelEnabled === false) return "";
      if (parsed && parsed.metaPixelId && String(parsed.metaPixelId).trim()) {
        return String(parsed.metaPixelId).trim();
      }
    }
    const envPixel = (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_META_PIXEL_ID)
      ? String(import.meta.env.VITE_META_PIXEL_ID).trim()
      : "";
    return envPixel;
  } catch (_) {
    return "";
  }
}

/**
 * Initialize Meta Pixel base script if a valid Pixel ID is configured
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
        s = b.getElementsByTagName(e)[0];
        if (s && s.parentNode) s.parentNode.insertBefore(t, s);
      })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
      /* eslint-enable */
    }

    if (initializedPixelId !== pixelId) {
      window.fbq("init", pixelId);
      initializedPixelId = pixelId;
    }
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * Track PageView event
 */
export function trackMetaPageView() {
  if (typeof window === "undefined") return;
  try {
    captureAdAttribution();
    if (initMetaPixel() && typeof window.fbq === "function") {
      window.fbq("track", "PageView");
    }
  } catch (_) {}
}

/**
 * Track ViewContent event on Product Detail Page
 */
export function trackMetaViewContent(product) {
  if (typeof window === "undefined" || !product) return;
  try {
    if (initMetaPixel() && typeof window.fbq === "function") {
      window.fbq("track", "ViewContent", {
        content_ids: [String(product.id || product._id || product.slug || "")],
        content_name: String(product.name || "Sacred Rudraksha"),
        content_type: "product",
        content_category: String(product.category || product.mukhi || "Rudraksha"),
        value: Number(product.price) || 0,
        currency: "INR"
      });
    }
  } catch (_) {}
}

/**
 * Track AddToCart event
 */
export function trackMetaAddToCart(product, qty = 1) {
  if (typeof window === "undefined" || !product) return;
  try {
    if (initMetaPixel() && typeof window.fbq === "function") {
      const unitPrice = Number(product.price) || 0;
      window.fbq("track", "AddToCart", {
        content_ids: [String(product.id || product._id || product.slug || "")],
        content_name: String(product.name || "Sacred Rudraksha"),
        content_type: "product",
        value: unitPrice * (Number(qty) || 1),
        currency: "INR",
        num_items: Number(qty) || 1
      });
    }
  } catch (_) {}
}

/**
 * Track InitiateCheckout event
 */
export function trackMetaInitiateCheckout({ lines = [], finalTotal = 0 } = {}) {
  if (typeof window === "undefined") return;
  try {
    if (initMetaPixel() && typeof window.fbq === "function") {
      const contentIds = (lines || []).map(l => String(l.id || l.productId || "")).filter(Boolean);
      const numItems = (lines || []).reduce((sum, l) => sum + (Number(l.qty || l.quantity) || 1), 0);
      window.fbq("track", "InitiateCheckout", {
        content_ids: contentIds,
        content_type: "product",
        value: Number(finalTotal) || 0,
        currency: "INR",
        num_items: numItems || 1
      });
    }
  } catch (_) {}
}

/**
 * Track Purchase event (deduplicated by orderId)
 */
export function trackMetaPurchase(order) {
  if (typeof window === "undefined" || !order) return;
  try {
    const orderId = String(order.orderNumber || order.id || order.orderId || "").trim();
    if (orderId) {
      if (firedPurchaseOrderIds.has(orderId)) return;
      const storageKey = `aura_meta_purchase_tracked_${orderId}`;
      if (sessionStorage.getItem(storageKey) || localStorage.getItem(storageKey)) {
        firedPurchaseOrderIds.add(orderId);
        return;
      }
      firedPurchaseOrderIds.add(orderId);
      try {
        sessionStorage.setItem(storageKey, "1");
        localStorage.setItem(storageKey, "1");
      } catch (_) {}
    }

    if (initMetaPixel() && typeof window.fbq === "function") {
      const items = order.snapshotItems || order.items || [];
      const contentIds = items.map(it => String(it.id || it.productId || "")).filter(Boolean);
      const numItems = items.reduce((sum, it) => sum + (Number(it.qty || it.quantity) || 1), 0);
      const value = Number(order.finalAmount || order.total || order.amount || 0);

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
        orderId ? { eventID: `PURCHASE_${orderId}` } : undefined
      );
    }
  } catch (_) {}
}
