import crypto from "crypto";
import { Setting } from "../models/Setting.js";
import { isDbConnected } from "../config/db.js";

export const META_PIXEL_ID = "1485640013424198";
const CANONICAL_ORIGIN = "https://aurarudraksha.bond";

const RESTRICTED_PATH_PREFIXES = [
  "/admin",
  "/login",
  "/register",
  "/reset-password",
  "/verify-email",
  "/account",
  "/verify-certificate"
];

const RESTRICTED_HEALTH_TERMS_REGEX = /\b(blood\s*pressure|hypertension|bp|diabetes|diabetic|sugar|cancer|tumor|tumour|depression|anxiety|insomnia|migraine|arthritis|asthma|heart\s*disease|kidney|liver|disease|disorder|illness|sickness|cure|remedy|medicine|medical|clinical|therapy|therapeutic|treatment|symptom|diagnosis|doctor|patient|ailment|wellness|health)\b/gi;

export function isRestrictedMetaPath(pathname = "") {
  const clean = String(pathname || "/").toLowerCase().trim() || "/";
  return RESTRICTED_PATH_PREFIXES.some(
    (prefix) => clean === prefix || clean.startsWith(`${prefix}/`)
  );
}

export function scrubMetaEventSourceUrl(rawUrl = "", fallbackOrigin = CANONICAL_ORIGIN) {
  try {
    const base = fallbackOrigin && String(fallbackOrigin).startsWith("http")
      ? fallbackOrigin
      : CANONICAL_ORIGIN;
    const parsed = new URL(rawUrl || "/", base);
    return `${parsed.origin}${parsed.pathname || "/"}`;
  } catch (_) {
    return `${CANONICAL_ORIGIN}/`;
  }
}

export function sanitizeMetaText(raw = "", fallback = "Sacred Rudraksha") {
  const str = String(raw || "").trim();
  if (!str) return fallback;
  const cleaned = str
    .replace(RESTRICTED_HEALTH_TERMS_REGEX, "spiritual")
    .replace(/\s{2,}/g, " ")
    .trim();
  return cleaned || fallback;
}

export function sanitizeMetaCategory(raw = "") {
  const str = String(raw || "").trim();
  if (!str || RESTRICTED_HEALTH_TERMS_REGEX.test(str)) {
    return "Sacred Spiritual Beads";
  }
  return str;
}

export function sanitizeMetaCustomData(customData = {}) {
  if (!customData || typeof customData !== "object") return {};
  const clean = {};

  if (Array.isArray(customData.content_ids)) {
    clean.content_ids = customData.content_ids
      .map((id) => String(id || "").trim())
      .filter(Boolean)
      .slice(0, 50);
  }

  if (Array.isArray(customData.contents)) {
    clean.contents = customData.contents
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const id = String(item.id || "").trim();
        if (!id) return null;
        return {
          id,
          quantity: Math.max(1, Number(item.quantity) || 1),
          item_price: Number(Math.max(0, Number(item.item_price) || 0).toFixed(2))
        };
      })
      .filter(Boolean)
      .slice(0, 50);
  }

  if (customData.content_name) {
    clean.content_name = sanitizeMetaText(customData.content_name, "Sacred Rudraksha");
  }
  if (customData.content_type) {
    clean.content_type = String(customData.content_type).trim() || "product";
  }
  if (customData.content_category) {
    clean.content_category = sanitizeMetaCategory(customData.content_category);
  }
  if (customData.value !== undefined && customData.value !== null && !isNaN(Number(customData.value))) {
    clean.value = Number(Math.max(0, Number(customData.value)).toFixed(2));
  }
  if (customData.currency) {
    clean.currency = String(customData.currency).toUpperCase().trim() || "INR";
  }
  if (customData.num_items !== undefined && !isNaN(Number(customData.num_items))) {
    clean.num_items = Math.max(1, Number(customData.num_items) || 1);
  }

  return clean;
}

function sha256(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function parseCookieValue(cookieHeader = "", cookieName = "") {
  if (!cookieHeader || !cookieName) return "";
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${cookieName}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : "";
}

export function buildCapiUserData(raw = {}, req = null) {
  const userData = {
    country: [sha256("in")]
  };

  try {
    const email = String(raw.em || raw.email || raw.customerEmail || "").trim().toLowerCase();
    if (email && email.includes("@")) {
      userData.em = [sha256(email)];
    }

    const rawDigits = String(raw.ph || raw.phone || raw.customerPhone || "").replace(/\D/g, "");
    if (rawDigits.length >= 10) {
      const normalizedPhone = rawDigits.length === 10 ? `91${rawDigits}` : rawDigits;
      userData.ph = [sha256(normalizedPhone)];
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
    firstName = firstName.replace(/[^a-z\u0900-\u097f]/g, "");
    lastName = lastName.replace(/[^a-z\u0900-\u097f]/g, "");
    if (firstName) userData.fn = [sha256(firstName)];
    if (lastName) userData.ln = [sha256(lastName)];

    const city = String(raw.ct || raw.city || "").trim().toLowerCase().replace(/[^a-z]/g, "");
    if (city) userData.ct = [sha256(city)];

    const state = String(raw.st || raw.state || "").trim().toLowerCase().replace(/[^a-z]/g, "");
    if (state) userData.st = [sha256(state)];

    const zip = String(raw.zp || raw.pincode || raw.zip || "").replace(/\D/g, "");
    if (zip.length >= 5) userData.zp = [sha256(zip)];

    const extId = String(raw.external_id || raw.userId || raw.authUserId || raw.customerId || "").trim();
    if (extId) userData.external_id = [sha256(extId)];

    if (req) {
      const fwd = String(req.headers?.["x-forwarded-for"] || req.ip || "").split(",")[0].trim();
      if (fwd) userData.client_ip_address = fwd;

      const ua = String(req.headers?.["user-agent"] || "").trim();
      if (ua) userData.client_user_agent = ua;

      const cookieStr = String(req.headers?.cookie || "");
      const fbp = String(raw.fbp || parseCookieValue(cookieStr, "_fbp") || "").trim();
      const fbc = String(raw.fbc || parseCookieValue(cookieStr, "_fbc") || "").trim();
      if (fbp) userData.fbp = fbp;
      if (fbc) userData.fbc = fbc;
    } else {
      if (raw.fbp) userData.fbp = String(raw.fbp).trim();
      if (raw.fbc) userData.fbc = String(raw.fbc).trim();
    }
  } catch (_) {}

  return userData;
}

export async function getMetaCapiToken() {
  const envToken = String(process.env.META_CAPI_ACCESS_TOKEN || "").trim();
  if (envToken) return envToken;
  try {
    if (isDbConnected()) {
      const settings = await Setting.findOne({ id: "STORE_SETTINGS" }).select("metaCapiAccessToken").lean();
      if (settings?.metaCapiAccessToken) {
        return String(settings.metaCapiAccessToken).trim();
      }
    }
  } catch (_) {}
  return "";
}

export async function sendMetaCapiEvent({
  eventName,
  eventId,
  sourceUrl = CANONICAL_ORIGIN,
  userData = {},
  customData = {},
  req = null
} = {}) {
  try {
    if (!eventName) return { skipped: true, reason: "missing_event_name" };

    const cleanUrl = scrubMetaEventSourceUrl(sourceUrl, CANONICAL_ORIGIN);
    try {
      const parsed = new URL(cleanUrl);
      if (isRestrictedMetaPath(parsed.pathname)) {
        return { skipped: true, reason: "restricted_path" };
      }
    } catch (_) {}

    const accessToken = await getMetaCapiToken();
    if (!accessToken) {
      return { skipped: true, reason: "not_configured" };
    }

    const eventPayload = {
      event_name: String(eventName).trim(),
      event_time: Math.floor(Date.now() / 1000),
      event_source_url: cleanUrl,
      action_source: "website",
      user_data: buildCapiUserData(userData, req),
      custom_data: sanitizeMetaCustomData(customData)
    };
    if (eventId) {
      eventPayload.event_id = String(eventId).trim();
    }

    const body = { data: [eventPayload] };
    const testCode = String(process.env.META_TEST_EVENT_CODE || "").trim();
    if (testCode) {
      body.test_event_code = testCode;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);
    try {
      const resp = await fetch(
        `https://graph.facebook.com/v21.0/${META_PIXEL_ID}/events?access_token=${encodeURIComponent(accessToken)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: controller.signal
        }
      );
      const data = await resp.json().catch(() => ({}));
      return { success: resp.ok, status: resp.status, data };
    } finally {
      clearTimeout(timeout);
    }
  } catch (err) {
    return { success: false, error: err?.message || "capi_error" };
  }
}

export async function sendMetaCapiPurchase(order, req = null) {
  try {
    if (!order || typeof order !== "object") return { skipped: true };
    const orderId = String(order.orderNumber || order.id || order.orderId || order._id || "").trim();
    if (!orderId) return { skipped: true };

    const statusLower = String(order.status || "").toLowerCase();
    const paymentStatusLower = String(order.paymentStatus || "").toLowerCase();
    if (statusLower === "cancelled" || statusLower === "failed" || paymentStatusLower === "failed" || paymentStatusLower === "cancelled") {
      return { skipped: true, reason: "order_not_confirmed" };
    }

    const value = Number(Math.max(0, Number(order.finalAmount ?? order.totalAmount ?? order.total ?? order.amount ?? 0)).toFixed(2));
    if (value <= 0) return { skipped: true, reason: "zero_value" };

    const items = order.snapshotItems || order.items || order.lines || [];
    const contentIds = items
      .map((it) => (typeof it === "string" ? it : String(it?.id || it?.productId || it?._id || "")).trim())
      .filter(Boolean);
    const contents = items
      .map((it) => {
        if (typeof it === "string") {
          return { id: it.trim(), quantity: 1, item_price: value };
        }
        if (!it || typeof it !== "object") return null;
        const id = String(it.id || it.productId || it._id || "").trim();
        if (!id) return null;
        return {
          id,
          quantity: Math.max(1, Number(it.qty || it.quantity) || 1),
          item_price: Number(Math.max(0, Number(it.price ?? it.unitPrice) || 0).toFixed(2))
        };
      })
      .filter(Boolean);
    const numItems = items.reduce((sum, it) => sum + (typeof it === "object" ? (Number(it?.qty || it?.quantity) || 1) : 1), 0);

    const ship = order.shippingAddress || order.addressDetails || {};
    const cust = order.customer || {};

    return await sendMetaCapiEvent({
      eventName: "Purchase",
      eventId: `PURCHASE_${orderId}`,
      sourceUrl: `${CANONICAL_ORIGIN}/payment-result`,
      req,
      userData: {
        email: order.customerEmail || order.email || cust.email || ship.email,
        phone: order.customerPhone || order.phone || cust.phone || ship.phone,
        firstName: order.firstName || cust.firstName || ship.firstName,
        lastName: order.lastName || cust.lastName || ship.lastName,
        name: order.customerName || order.name || cust.name,
        city: order.city || cust.city || ship.city,
        state: order.state || cust.state || ship.state,
        pincode: order.pincode || cust.pincode || ship.pincode,
        userId: order.authUserId || order.customerId || order.userId || cust.userId,
        fbp: order.adAttribution?.fbp,
        fbc: order.adAttribution?.fbc || (order.adAttribution?.fbclid ? `fb.1.${Date.now()}.${order.adAttribution.fbclid}` : "")
      },
      customData: {
        content_ids: contentIds,
        contents,
        content_type: "product",
        value,
        currency: "INR",
        num_items: numItems || 1
      }
    });
  } catch (err) {
    return { success: false, error: err?.message || "capi_purchase_error" };
  }
}
