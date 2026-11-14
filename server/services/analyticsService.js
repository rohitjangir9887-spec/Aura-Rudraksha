import crypto from "crypto";
import { Analytics, AnalyticsDaily } from "../models/Setting.js";
import { isDbConnected } from "../config/db.js";

const VISITOR_HASH_SALT = process.env.VISITOR_HASH_SALT || process.env.IP_HASH_SALT || "aura_visitor_salt_2026";

// In-memory store fallback when MongoDB is temporarily disconnected (also used by unit tests)
const inMemoryGlobalAnalytics = {
  id: "GLOBAL_ANALYTICS",
  visits: 0,
  productViews: 0,
  lastUpdated: new Date().toISOString()
};
const inMemoryDailyMap = new Map();

export function resetInMemoryAnalyticsForTest() {
  inMemoryGlobalAnalytics.visits = 0;
  inMemoryGlobalAnalytics.productViews = 0;
  inMemoryGlobalAnalytics.lastUpdated = new Date().toISOString();
  inMemoryDailyMap.clear();
}

export function extractRawClientIp(req) {
  try {
    const forwarded = req?.headers?.["x-forwarded-for"];
    const firstForwarded = typeof forwarded === "string" ? forwarded.split(",")[0].trim() : "";
    const raw = String(
      req?.headers?.["cf-connecting-ip"] ||
      req?.headers?.["x-real-ip"] ||
      firstForwarded ||
      req?.socket?.remoteAddress ||
      req?.ip ||
      "127.0.0.1"
    )
      .replace(/^::ffff:/, "")
      .trim();
    return raw || "127.0.0.1";
  } catch (_) {
    return "127.0.0.1";
  }
}

export function maskIpAddress(ipRaw = "") {
  const ip = String(ipRaw || "").replace(/^::ffff:/, "").trim();
  if (!ip) return "unknown";
  if (ip === "::1" || ip === "127.0.0.1") return "127.0.0.***";
  if (ip.includes(".")) {
    const parts = ip.split(".");
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.***`;
    }
  }
  if (ip.includes(":")) {
    const parts = ip.split(":").filter(Boolean);
    return parts.slice(0, 3).join(":") + ":****";
  }
  return ip.slice(0, 6) + "***";
}

export function detectDeviceType(ua = "") {
  const lower = String(ua || "").toLowerCase();
  if (!lower) return "Unknown Device";
  if (lower.includes("bot") || lower.includes("crawler") || lower.includes("spider")) return "Crawler / Preview";
  if (lower.includes("fbav") || lower.includes("fban") || lower.includes("instagram")) {
    return lower.includes("iphone") || lower.includes("ipad") ? "Meta App (iOS)" : "Meta App (Android)";
  }
  if (lower.includes("android")) return "Android Mobile";
  if (lower.includes("iphone")) return "iPhone (iOS)";
  if (lower.includes("ipad")) return "iPad Tablet";
  if (lower.includes("macintosh") || lower.includes("mac os")) return "Mac Desktop";
  if (lower.includes("windows")) return "Windows Desktop";
  if (lower.includes("linux")) return "Linux Desktop";
  return "Web Browser";
}

export function hashIdentifier(input = "") {
  return crypto
    .createHmac("sha256", VISITOR_HASH_SALT)
    .update(String(input || ""))
    .digest("hex")
    .slice(0, 24);
}

export function buildVisitorIdentity({ ipRaw = "127.0.0.1", userAgent = "", deviceId = "" }) {
  const cleanIp = String(ipRaw || "127.0.0.1").replace(/^::ffff:/, "").trim() || "127.0.0.1";
  const cleanDevice = String(deviceId || "").trim().slice(0, 128);
  const cleanUa = String(userAgent || "").trim().slice(0, 200);

  const ipKey = hashIdentifier(`ip:${cleanIp}`);
  const visitorKey = cleanDevice.length >= 4
    ? hashIdentifier(`dev:${cleanIp}|${cleanDevice}`)
    : hashIdentifier(`ua:${cleanIp}|${cleanUa}`);

  return {
    visitorKey,
    ipKey,
    ipMasked: maskIpAddress(cleanIp),
    deviceType: detectDeviceType(cleanUa)
  };
}

export function formatHourRangeLabel(hour) {
  const h = ((Number(hour) % 24) + 24) % 24;
  const fmt = (hr) => {
    const period = hr >= 12 ? "PM" : "AM";
    const h12 = hr % 12 === 0 ? 12 : hr % 12;
    return `${String(h12).padStart(2, "0")}:00 ${period}`;
  };
  const nextH = (h + 1) % 24;
  return `${fmt(h)} - ${fmt(nextH)}`;
}

export function formatShortHourLabel(hour) {
  const h = ((Number(hour) % 24) + 24) % 24;
  if (h === 0) return "12a";
  if (h < 12) return `${h}a`;
  if (h === 12) return "12p";
  return `${h - 12}p`;
}

export function getIstTimeMeta(dateInput = new Date()) {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  const safeDate = isNaN(d.getTime()) ? new Date() : d;

  const dateKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(safeDate);

  const hourStr = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    hour12: false
  }).format(safeDate);
  let hour = parseInt(hourStr, 10);
  if (isNaN(hour) || hour >= 24) hour = 0;

  const istTimeLabel = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  }).format(safeDate);

  const dateLabel = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short"
  }).format(safeDate);

  return {
    dateKey,
    hour,
    istTimeLabel,
    hourLabel: formatHourRangeLabel(hour),
    shortHourLabel: formatShortHourLabel(hour),
    dateLabel,
    iso: safeDate.toISOString()
  };
}

function shiftIstDateKey(baseDateKey, offsetDays = 0) {
  const [y, m, d] = String(baseDateKey).split("-").map(Number);
  const utc = new Date(Date.UTC(y, (m || 1) - 1, (d || 1) + offsetDays, 6, 0, 0));
  return getIstTimeMeta(utc).dateKey;
}

function getDateKeysWindow(todayKey, countDays) {
  const keys = [];
  for (let i = countDays - 1; i >= 0; i--) {
    keys.push(shiftIstDateKey(todayKey, -i));
  }
  return keys;
}

function formatDateKeyShort(dateKey) {
  try {
    const [y, m, d] = String(dateKey).split("-").map(Number);
    const dt = new Date(Date.UTC(y, (m || 1) - 1, d || 1, 6, 0, 0));
    return new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short"
    }).format(dt);
  } catch (_) {
    return dateKey;
  }
}

function updateInMemoryDailyVisit({ dateKey, hour, visitorKey, ipKey, logEntry, isProductView = false }) {
  if (!inMemoryDailyMap.has(dateKey)) {
    inMemoryDailyMap.set(dateKey, {
      dateKey,
      pageViews: 0,
      productViews: 0,
      visitorKeys: [],
      ipKeys: [],
      hourlyBuckets: {},
      recentVisits: [],
      lastUpdated: new Date().toISOString()
    });
  }
  const doc = inMemoryDailyMap.get(dateKey);
  const hourStr = String(hour);
  if (!doc.hourlyBuckets[hourStr]) {
    doc.hourlyBuckets[hourStr] = { pageViews: 0, productViews: 0, visitorKeys: [], ipKeys: [] };
  }
  const hBucket = doc.hourlyBuckets[hourStr];

  let isUniqueToday = false;
  if (isProductView) {
    doc.productViews += 1;
    hBucket.productViews += 1;
  } else {
    doc.pageViews += 1;
    hBucket.pageViews += 1;
    if (visitorKey && !doc.visitorKeys.includes(visitorKey)) {
      doc.visitorKeys.push(visitorKey);
      isUniqueToday = true;
    }
    if (ipKey && !doc.ipKeys.includes(ipKey)) {
      doc.ipKeys.push(ipKey);
    }
    if (visitorKey && !hBucket.visitorKeys.includes(visitorKey)) {
      hBucket.visitorKeys.push(visitorKey);
    }
    if (ipKey && !hBucket.ipKeys.includes(ipKey)) {
      hBucket.ipKeys.push(ipKey);
    }
  }

  if (logEntry) {
    doc.recentVisits.push({ ...logEntry, isUniqueToday });
    if (doc.recentVisits.length > 60) {
      doc.recentVisits = doc.recentVisits.slice(-60);
    }
  }
  doc.lastUpdated = new Date().toISOString();
  return {
    todayPageViews: doc.pageViews,
    todayProductViews: doc.productViews,
    todayUniqueVisitors: doc.visitorKeys.length,
    todayUniqueIps: doc.ipKeys.length,
    isUniqueToday
  };
}

export async function recordVisitEvent({ req, deviceId = "", path = "/", title = "", now = new Date(), useDb = isDbConnected() } = {}) {
  const timeMeta = getIstTimeMeta(now);
  const ipRaw = extractRawClientIp(req);
  const userAgent = String(req?.headers?.["user-agent"] || "");
  const identity = buildVisitorIdentity({ ipRaw, userAgent, deviceId });
  const hourStr = String(timeMeta.hour);

  const logEntryBase = {
    timestamp: timeMeta.iso,
    istDate: timeMeta.dateKey,
    istTimeLabel: timeMeta.istTimeLabel,
    hour: timeMeta.hour,
    hourLabel: timeMeta.hourLabel,
    type: "visit",
    path: String(path || "/").slice(0, 160),
    title: String(title || "").slice(0, 120),
    ipMasked: identity.ipMasked,
    deviceType: identity.deviceType
  };

  if (useDb) {
    const existingBefore = await AnalyticsDaily.findOne(
      { dateKey: timeMeta.dateKey },
      { visitorKeys: 1 }
    ).lean();
    const alreadySeenToday = Boolean(
      existingBefore && Array.isArray(existingBefore.visitorKeys) && existingBefore.visitorKeys.includes(identity.visitorKey)
    );
    const isUniqueToday = !alreadySeenToday;

    const [globalDoc, dailyDoc] = await Promise.all([
      Analytics.findOneAndUpdate(
        { id: "GLOBAL_ANALYTICS" },
        { $inc: { visits: 1 }, $set: { lastUpdated: timeMeta.iso } },
        { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
      ).lean(),
      AnalyticsDaily.findOneAndUpdate(
        { dateKey: timeMeta.dateKey },
        {
          $setOnInsert: { dateKey: timeMeta.dateKey },
          $inc: {
            pageViews: 1,
            [`hourlyBuckets.${hourStr}.pageViews`]: 1
          },
          $addToSet: {
            visitorKeys: identity.visitorKey,
            ipKeys: identity.ipKey,
            [`hourlyBuckets.${hourStr}.visitorKeys`]: identity.visitorKey,
            [`hourlyBuckets.${hourStr}.ipKeys`]: identity.ipKey
          },
          $push: {
            recentVisits: {
              $each: [{ ...logEntryBase, isUniqueToday }],
              $slice: -60
            }
          },
          $set: { lastUpdated: timeMeta.iso }
        },
        { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
      ).lean()
    ]);

    return {
      id: "GLOBAL_ANALYTICS",
      visits: Number(globalDoc?.visits || 1),
      productViews: Number(globalDoc?.productViews || 0),
      todayPageViews: Number(dailyDoc?.pageViews || 1),
      todayUniqueVisitors: Array.isArray(dailyDoc?.visitorKeys) ? dailyDoc.visitorKeys.length : 1,
      todayUniqueIps: Array.isArray(dailyDoc?.ipKeys) ? dailyDoc.ipKeys.length : 1,
      isUniqueToday,
      lastUpdated: timeMeta.iso
    };
  }

  inMemoryGlobalAnalytics.visits += 1;
  inMemoryGlobalAnalytics.lastUpdated = timeMeta.iso;
  const memDaily = updateInMemoryDailyVisit({
    dateKey: timeMeta.dateKey,
    hour: timeMeta.hour,
    visitorKey: identity.visitorKey,
    ipKey: identity.ipKey,
    logEntry: logEntryBase,
    isProductView: false
  });
  return {
    id: "GLOBAL_ANALYTICS",
    visits: inMemoryGlobalAnalytics.visits,
    productViews: inMemoryGlobalAnalytics.productViews,
    ...memDaily,
    lastUpdated: timeMeta.iso
  };
}

export async function recordProductViewEvent({ req, deviceId = "", path = "", productId = "", productName = "", now = new Date(), useDb = isDbConnected() } = {}) {
  const timeMeta = getIstTimeMeta(now);
  const ipRaw = extractRawClientIp(req);
  const userAgent = String(req?.headers?.["user-agent"] || "");
  const identity = buildVisitorIdentity({ ipRaw, userAgent, deviceId });
  const hourStr = String(timeMeta.hour);

  const logEntryBase = {
    timestamp: timeMeta.iso,
    istDate: timeMeta.dateKey,
    istTimeLabel: timeMeta.istTimeLabel,
    hour: timeMeta.hour,
    hourLabel: timeMeta.hourLabel,
    type: "product_view",
    path: String(path || (productId ? `/product/${productId}` : "/product")).slice(0, 160),
    productId: String(productId || "").slice(0, 80),
    productName: String(productName || "").slice(0, 120),
    ipMasked: identity.ipMasked,
    deviceType: identity.deviceType
  };

  if (useDb) {
    const [globalDoc, dailyDoc] = await Promise.all([
      Analytics.findOneAndUpdate(
        { id: "GLOBAL_ANALYTICS" },
        { $inc: { productViews: 1 }, $set: { lastUpdated: timeMeta.iso } },
        { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
      ).lean(),
      AnalyticsDaily.findOneAndUpdate(
        { dateKey: timeMeta.dateKey },
        {
          $setOnInsert: { dateKey: timeMeta.dateKey },
          $inc: {
            productViews: 1,
            [`hourlyBuckets.${hourStr}.productViews`]: 1
          },
          $push: {
            recentVisits: {
              $each: [logEntryBase],
              $slice: -60
            }
          },
          $set: { lastUpdated: timeMeta.iso }
        },
        { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
      ).lean()
    ]);

    return {
      id: "GLOBAL_ANALYTICS",
      visits: Number(globalDoc?.visits || 0),
      productViews: Number(globalDoc?.productViews || 1),
      todayProductViews: Number(dailyDoc?.productViews || 1),
      lastUpdated: timeMeta.iso
    };
  }

  inMemoryGlobalAnalytics.productViews += 1;
  inMemoryGlobalAnalytics.lastUpdated = timeMeta.iso;
  const memDaily = updateInMemoryDailyVisit({
    dateKey: timeMeta.dateKey,
    hour: timeMeta.hour,
    visitorKey: identity.visitorKey,
    ipKey: identity.ipKey,
    logEntry: logEntryBase,
    isProductView: true
  });
  return {
    id: "GLOBAL_ANALYTICS",
    visits: inMemoryGlobalAnalytics.visits,
    productViews: inMemoryGlobalAnalytics.productViews,
    ...memDaily,
    lastUpdated: timeMeta.iso
  };
}

function aggregateDailyDocs(docs = [], orders = [], allowedDateKeysSet = null, globalDoc = null) {
  const visitorSet = new Set();
  const ipSet = new Set();
  let pageViews = 0;
  let productViews = 0;

  const hourly = Array.from({ length: 24 }, (_, hr) => ({
    hour: hr,
    label: formatHourRangeLabel(hr),
    shortLabel: formatShortHourLabel(hr),
    pageViews: 0,
    productViews: 0,
    visitorSet: new Set(),
    ipSet: new Set()
  }));

  const filteredDocs = allowedDateKeysSet
    ? docs.filter(d => d && allowedDateKeysSet.has(d.dateKey))
    : docs;

  for (const doc of filteredDocs) {
    if (!doc) continue;
    pageViews += Number(doc.pageViews || 0);
    productViews += Number(doc.productViews || 0);
    if (Array.isArray(doc.visitorKeys)) {
      for (const vk of doc.visitorKeys) visitorSet.add(vk);
    }
    if (Array.isArray(doc.ipKeys)) {
      for (const ik of doc.ipKeys) ipSet.add(ik);
    }
    const buckets = doc.hourlyBuckets || {};
    for (let h = 0; h < 24; h++) {
      const b = buckets[String(h)];
      if (!b) continue;
      hourly[h].pageViews += Number(b.pageViews || 0);
      hourly[h].productViews += Number(b.productViews || 0);
      if (Array.isArray(b.visitorKeys)) {
        for (const vk of b.visitorKeys) hourly[h].visitorSet.add(vk);
      }
      if (Array.isArray(b.ipKeys)) {
        for (const ik of b.ipKeys) hourly[h].ipSet.add(ik);
      }
    }
  }

  // If summing all time and lifetime global counters are higher than historical daily tracking (e.g. legacy visits before daily tracking existed)
  if (!allowedDateKeysSet && globalDoc) {
    pageViews = Math.max(pageViews, Number(globalDoc.visits || 0));
    productViews = Math.max(productViews, Number(globalDoc.productViews || 0));
  }

  const filteredOrders = (orders || []).filter(o => {
    if (!o) return false;
    if (!allowedDateKeysSet) return true;
    const rawDate = o.date || o.createdAt;
    if (!rawDate) return false;
    const oDateKey = getIstTimeMeta(new Date(rawDate)).dateKey;
    return allowedDateKeysSet.has(oDateKey);
  });

  const validOrders = filteredOrders.filter(o => o.status !== "Cancelled");
  const revenue = validOrders.reduce((sum, o) => sum + (Number(o.finalAmount) || Number(o.amount) || Number(o.total) || 0), 0);
  const auraAiOrders = validOrders.filter(o => o.orderSource === "aura_ai" || o.source === "aura_ai");
  const webOrders = validOrders.filter(o => !(o.orderSource === "aura_ai" || o.source === "aura_ai"));
  const auraAiRevenue = auraAiOrders.reduce((sum, o) => sum + (Number(o.finalAmount) || Number(o.amount) || Number(o.total) || 0), 0);
  const webRevenue = webOrders.reduce((sum, o) => sum + (Number(o.finalAmount) || Number(o.amount) || Number(o.total) || 0), 0);

  const uniqueVisitors = visitorSet.size;
  const uniqueIps = ipSet.size;
  const ordersCount = filteredOrders.length;
  const conversionBase = uniqueVisitors > 0 ? uniqueVisitors : pageViews;
  const conversionRate = conversionBase > 0 ? ((ordersCount / conversionBase) * 100).toFixed(1) : "0.0";

  const hourlyTimeline = hourly.map(h => ({
    hour: h.hour,
    label: h.label,
    shortLabel: h.shortLabel,
    pageViews: h.pageViews,
    uniqueVisitors: h.visitorSet.size,
    uniqueIps: h.ipSet.size,
    productViews: h.productViews
  }));

  let peakHour = { hour: 0, label: formatHourRangeLabel(0), pageViews: 0, uniqueVisitors: 0 };
  for (const h of hourlyTimeline) {
    if (h.pageViews > peakHour.pageViews || (h.pageViews === peakHour.pageViews && h.uniqueVisitors > peakHour.uniqueVisitors)) {
      peakHour = { hour: h.hour, label: h.label, pageViews: h.pageViews, uniqueVisitors: h.uniqueVisitors };
    }
  }

  return {
    pageViews,
    uniqueVisitors,
    uniqueIps,
    productViews,
    ordersCount,
    revenue,
    conversionRate,
    webOrdersCount: webOrders.length,
    webRevenue,
    auraAiOrdersCount: auraAiOrders.length,
    auraAiRevenue,
    auraSharePercent: validOrders.length > 0 ? ((auraAiOrders.length / validOrders.length) * 100).toFixed(1) : "0.0",
    hourlyTimeline,
    peakHour
  };
}

export async function getDetailedAnalyticsPayload({
  range = "today",
  orders = [],
  now = new Date(),
  useDb = isDbConnected()
} = {}) {
  const normalizedRange = ["today", "yesterday", "7d", "30d", "all"].includes(String(range).toLowerCase())
    ? String(range).toLowerCase()
    : "today";

  const todayMeta = getIstTimeMeta(now);
  const todayKey = todayMeta.dateKey;
  const yesterdayKey = shiftIstDateKey(todayKey, -1);
  const keys7d = getDateKeysWindow(todayKey, 7);
  const keys30d = getDateKeysWindow(todayKey, 30);

  let globalDoc = { id: "GLOBAL_ANALYTICS", visits: 0, productViews: 0, lastUpdated: todayMeta.iso };
  let dailyDocs = [];

  if (useDb) {
    const [gDoc, dDocs] = await Promise.all([
      Analytics.findOne({ id: "GLOBAL_ANALYTICS" }).lean(),
      AnalyticsDaily.find({}).sort({ dateKey: -1 }).limit(90).lean()
    ]);
    if (gDoc) globalDoc = gDoc;
    if (Array.isArray(dDocs)) dailyDocs = dDocs;
  } else {
    globalDoc = { ...inMemoryGlobalAnalytics };
    dailyDocs = Array.from(inMemoryDailyMap.values()).sort((a, b) => (a.dateKey < b.dateKey ? 1 : -1));
  }

  const periodToday = aggregateDailyDocs(dailyDocs, orders, new Set([todayKey]), null);
  const periodYesterday = aggregateDailyDocs(dailyDocs, orders, new Set([yesterdayKey]), null);
  const period7d = aggregateDailyDocs(dailyDocs, orders, new Set(keys7d), null);
  const period30d = aggregateDailyDocs(dailyDocs, orders, new Set(keys30d), null);
  const periodAll = aggregateDailyDocs(dailyDocs, orders, null, globalDoc);

  const periodLookup = {
    today: periodToday,
    yesterday: periodYesterday,
    "7d": period7d,
    "30d": period30d,
    all: periodAll
  };
  const selected = periodLookup[normalizedRange] || periodToday;

  // Build daily trend graph (7 days or 30 days depending on range)
  const trendKeys = (normalizedRange === "30d" || normalizedRange === "all") ? keys30d : keys7d;
  const docByDate = new Map(dailyDocs.map(d => [d.dateKey, d]));
  const dailyTrend = trendKeys.map(dk => {
    const d = docByDate.get(dk);
    const dayOrders = (orders || []).filter(o => {
      const rawDate = o?.date || o?.createdAt;
      return rawDate && getIstTimeMeta(new Date(rawDate)).dateKey === dk;
    });
    const validDayOrders = dayOrders.filter(o => o.status !== "Cancelled");
    const dayRev = validDayOrders.reduce((s, o) => s + (Number(o.finalAmount) || Number(o.amount) || Number(o.total) || 0), 0);
    return {
      dateKey: dk,
      label: dk === todayKey ? "Today" : dk === yesterdayKey ? "Yesterday" : formatDateKeyShort(dk),
      shortDate: formatDateKeyShort(dk),
      pageViews: Number(d?.pageViews || 0),
      uniqueVisitors: Array.isArray(d?.visitorKeys) ? d.visitorKeys.length : 0,
      uniqueIps: Array.isArray(d?.ipKeys) ? d.ipKeys.length : 0,
      productViews: Number(d?.productViews || 0),
      ordersCount: dayOrders.length,
      revenue: dayRev
    };
  });

  // Collect recent visits matching selected range (sorted newest first)
  let recentSourceDocs = dailyDocs;
  if (normalizedRange === "today") {
    recentSourceDocs = dailyDocs.filter(d => d.dateKey === todayKey);
  } else if (normalizedRange === "yesterday") {
    recentSourceDocs = dailyDocs.filter(d => d.dateKey === yesterdayKey);
  } else if (normalizedRange === "7d") {
    const s = new Set(keys7d);
    recentSourceDocs = dailyDocs.filter(d => s.has(d.dateKey));
  } else if (normalizedRange === "30d") {
    const s = new Set(keys30d);
    recentSourceDocs = dailyDocs.filter(d => s.has(d.dateKey));
  }

  const recentVisits = recentSourceDocs
    .flatMap(d => (Array.isArray(d?.recentVisits) ? d.recentVisits : []))
    .sort((a, b) => new Date(b?.timestamp || 0) - new Date(a?.timestamp || 0))
    .slice(0, 45);

  const lifetimeVisits = Math.max(Number(globalDoc.visits || 0), periodAll.pageViews);
  const lifetimeProductViews = Math.max(Number(globalDoc.productViews || 0), periodAll.productViews);

  return {
    id: "GLOBAL_ANALYTICS",
    activeRange: normalizedRange,
    todayDateKey: todayKey,
    dbConnected: Boolean(useDb),
    // Backward-compatible top-level lifetime counters
    visits: lifetimeVisits,
    productViews: lifetimeProductViews,
    // Today headline shortcuts for Admin Dashboard
    todayVisits: periodToday.pageViews,
    todayUniqueVisitors: periodToday.uniqueVisitors,
    todayUniqueIps: periodToday.uniqueIps,
    todayProductViews: periodToday.productViews,
    todayOrdersCount: periodToday.ordersCount,
    todayRevenue: periodToday.revenue,
    // Active selected range summary + timelines
    summary: {
      pageViews: selected.pageViews,
      uniqueVisitors: selected.uniqueVisitors,
      uniqueIps: selected.uniqueIps,
      productViews: selected.productViews,
      ordersCount: selected.ordersCount,
      revenue: selected.revenue,
      conversionRate: selected.conversionRate,
      webOrdersCount: selected.webOrdersCount,
      webRevenue: selected.webRevenue,
      auraAiOrdersCount: selected.auraAiOrdersCount,
      auraAiRevenue: selected.auraAiRevenue,
      auraSharePercent: selected.auraSharePercent
    },
    periods: {
      today: { label: "Today", dateKey: todayKey, pageViews: periodToday.pageViews, uniqueVisitors: periodToday.uniqueVisitors, uniqueIps: periodToday.uniqueIps, productViews: periodToday.productViews, ordersCount: periodToday.ordersCount, revenue: periodToday.revenue },
      yesterday: { label: "Yesterday", dateKey: yesterdayKey, pageViews: periodYesterday.pageViews, uniqueVisitors: periodYesterday.uniqueVisitors, uniqueIps: periodYesterday.uniqueIps, productViews: periodYesterday.productViews, ordersCount: periodYesterday.ordersCount, revenue: periodYesterday.revenue },
      "7d": { label: "Last 7 Days", pageViews: period7d.pageViews, uniqueVisitors: period7d.uniqueVisitors, uniqueIps: period7d.uniqueIps, productViews: period7d.productViews, ordersCount: period7d.ordersCount, revenue: period7d.revenue },
      "30d": { label: "Last 30 Days", pageViews: period30d.pageViews, uniqueVisitors: period30d.uniqueVisitors, uniqueIps: period30d.uniqueIps, productViews: period30d.productViews, ordersCount: period30d.ordersCount, revenue: period30d.revenue },
      all: { label: "All Time", pageViews: lifetimeVisits, uniqueVisitors: periodAll.uniqueVisitors, uniqueIps: periodAll.uniqueIps, productViews: lifetimeProductViews, ordersCount: periodAll.ordersCount, revenue: periodAll.revenue }
    },
    hourlyTimeline: selected.hourlyTimeline,
    peakHour: selected.peakHour,
    dailyTrend,
    recentVisits,
    hasData: lifetimeVisits > 0 || lifetimeProductViews > 0 || (orders && orders.length > 0),
    lastUpdated: globalDoc.lastUpdated || todayMeta.iso
  };
}
