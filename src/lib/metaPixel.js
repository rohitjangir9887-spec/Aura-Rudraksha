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
      dl: window.location.href,
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
 * Ensure Meta Pixel (1485640013424198) is ready (initialized in index.html)
 */
export function initMetaPixel() {
  if (typeof window === "undefined") return false;
  captureAdAttribution();

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
      window.fbq("init", DEFAULT_META_PIXEL_ID);
      initialized = true;
    } else if (!initialized) {
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
        window.fbq("track", "PageView");
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

