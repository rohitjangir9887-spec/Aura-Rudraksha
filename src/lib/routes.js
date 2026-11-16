/**
 * Centralized Route Constants & Helper Utilities for Aura Rudraksha
 */

export const ADMIN_BASE_PATH = "/admin";
export const ADMIN_LOGIN_PATH = "/admin/login";

export const getSafeReturnPath = (fromPath, defaultFallback = "/account") => {
  if (!fromPath || typeof fromPath !== "string") {
    return defaultFallback;
  }

  const trimmedPath = fromPath.trim();

  // Must start with '/' and NOT with '//' or '/\'
  if (!trimmedPath.startsWith("/") || trimmedPath.startsWith("//") || trimmedPath.startsWith("/\\")) {
    return defaultFallback;
  }

  // Reject malicious schemes (javascript:, data:, vbscript:)
  if (/^(javascript|data|vbscript):/i.test(trimmedPath)) {
    return defaultFallback;
  }

  // Prevent returning to login / admin login pages in a loop
  const cleanPath = trimmedPath.toLowerCase();
  if (
    cleanPath.startsWith("/login") ||
    cleanPath.startsWith("/admin/login") ||
    cleanPath.startsWith(ADMIN_LOGIN_PATH.toLowerCase())
  ) {
    return defaultFallback;
  }

  return trimmedPath;
};

export const routes = {
  home: () => "/",
  shop: (query) => (query ? `/shop?q=${encodeURIComponent(query)}` : "/shop"),
  product: (id) => `/product/${id}`,
  categories: () => "/categories",
  cart: () => "/cart",
  checkout: () => "/checkout",
  login: (from) => (from ? `/login` : "/login"),
  account: () => "/account",
  profile: () => "/account/profile",
  orders: () => "/account/orders",
  order: (id) => `/account/orders/${id}`,
  trackOrder: (id) => (id ? `/track-order?id=${encodeURIComponent(id)}` : "/track-order"),
  wishlist: () => "/wishlist",
  auraAi: () => "/aura-ai",
  about: () => "/about",
  contact: () => "/contact",
  wholesale: () => "/wholesale",

  // Policies
  shippingPolicy: () => "/shipping-policy",
  returnPolicy: () => "/return-policy",
  privacyPolicy: () => "/privacy-policy",
  terms: () => "/terms",
  cancellation: () => "/cancellation",
  securePayment: () => "/secure-payment",

  // Admin Routes (New Secure URL)
  admin: () => ADMIN_BASE_PATH,
  adminLogin: () => ADMIN_LOGIN_PATH,
  adminAi: () => `${ADMIN_BASE_PATH}/ai`,
  adminProducts: () => `${ADMIN_BASE_PATH}/products`,
  adminOrders: () => `${ADMIN_BASE_PATH}/orders`,
  adminOffers: () => `${ADMIN_BASE_PATH}/offers`,
  adminCustomers: () => `${ADMIN_BASE_PATH}/customers`,
  adminReviews: () => `${ADMIN_BASE_PATH}/reviews`,
  adminBanners: () => `${ADMIN_BASE_PATH}/banners`,
  adminHomeProducts: () => `${ADMIN_BASE_PATH}/banners/home-products`,
  adminHero: () => `${ADMIN_BASE_PATH}/banners/hero`,
  adminPromotions: () => `${ADMIN_BASE_PATH}/banners/promotions`,
  adminCategories: () => `${ADMIN_BASE_PATH}/categories`,
  adminCoupons: () => `${ADMIN_BASE_PATH}/coupons`,
  adminAnalytics: () => `${ADMIN_BASE_PATH}/analytics`,
  adminSupport: () => `${ADMIN_BASE_PATH}/support`,
  adminSettings: () => `${ADMIN_BASE_PATH}/settings`,
  adminZodiac: () => `${ADMIN_BASE_PATH}/zodiac`
};

export function slugifyProductName(str) {
  return String(str || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function stripMarketingModifiers(slugStr) {
  let current = String(slugStr || "")
    .toLowerCase()
    .trim()
    .replace(/^\/+|\/+$/g, "")
    .split("?")[0]
    .replace(/^(product-card-|product-)/, "");

  let prev = "";
  while (current !== prev) {
    prev = current;
    current = current
      .replace(/^(?:premium-|original-|buy-|authentic-|pure-|real-|nepali-)+/i, "")
      .replace(/(?:-authentic-lab-certified-aura-rudraksha|-lab-certified-aura-rudraksha|-aura-rudraksha|-nepali-online-lab-certified|-online-lab-certified|-lab-certified|-authentic|-supreme-bead|-deva-mani|-online)+$/gi, "");
  }
  return current.replace(/^-+|-+$/g, "");
}

export function extractMukhiNumbers(textOrProd) {
  const extractFromText = (rawText) => {
    const str = String(rawText || "").toLowerCase();
    if (!str) return [];
    const rangeMatch = str.match(/(?:^|[^0-9])([1-9]|1[0-9]|20|21)(?:[\s-]+to[\s-]+|\s*-\s*)([1-9]|1[0-9]|20|21)\s*-?\s*mukhi\b/i);
    if (rangeMatch && rangeMatch[1] && rangeMatch[2]) {
      return [parseInt(rangeMatch[1], 10), parseInt(rangeMatch[2], 10)];
    }
    const nums = [];
    const regex = /(?:^|[^0-9])([1-9]|1[0-9]|20|21)\s*-?\s*mukhi\b/gi;
    let m;
    while ((m = regex.exec(str)) !== null) {
      const n = parseInt(m[1], 10);
      if (!isNaN(n) && !nums.includes(n)) nums.push(n);
    }
    return nums;
  };

  if (typeof textOrProd === "string" || typeof textOrProd === "number") {
    const s = String(textOrProd).trim().toLowerCase();
    const fromText = extractFromText(s);
    if (fromText.length > 0) return fromText;
    const pureNum = s.match(/^p?([1-9]|1[0-9]|20|21)$/i);
    if (pureNum && pureNum[1]) return [parseInt(pureNum[1], 10)];
    return [];
  }

  if (textOrProd && typeof textOrProd === "object") {
    const fromName = extractFromText(textOrProd.name);
    if (fromName.length > 0) return fromName;
    const fromMukhiField = extractFromText(textOrProd.mukhi);
    if (fromMukhiField.length > 0) return fromMukhiField;
    const rawMukhiExact = String(textOrProd.mukhi || "").trim().match(/^([1-9]|1[0-9]|20|21)$/);
    if (rawMukhiExact && rawMukhiExact[1]) return [parseInt(rawMukhiExact[1], 10)];
    const fromSlug = extractFromText(textOrProd.slug);
    if (fromSlug.length > 0) return fromSlug;
    const idExact = String(textOrProd.id || "").trim().match(/^p?([1-9]|1[0-9]|20|21)$/i);
    if (idExact && idExact[1]) return [parseInt(idExact[1], 10)];
  }
  return [];
}

export function detectProductKind(textOrProd) {
  let combined = "";
  if (typeof textOrProd === "string" || typeof textOrProd === "number") {
    combined = String(textOrProd).toLowerCase().replace(/[-_]+/g, " ");
  } else if (textOrProd && typeof textOrProd === "object") {
    const primaryParts = [
      textOrProd.name,
      textOrProd.category,
      textOrProd.subCategory,
      textOrProd.productType
    ].filter(Boolean);
    combined = (primaryParts.length > 0 ? primaryParts.join(" ") : String(textOrProd.slug || textOrProd.id || ""))
      .toLowerCase()
      .replace(/[-_]+/g, " ");
  }

  if (!combined.trim()) return "general";
  if (/\b(mala|malas|kantha|rosary|japa|jaap)\b/i.test(combined) || /\b108\b/.test(combined)) return "mala";
  if (/\b(bracelet|bracelets|wristlet|wrist|kada|bangle)\b/i.test(combined)) return "bracelet";
  if (/\b(pendant|pendants|kavach|locket|amulet)\b/i.test(combined)) return "pendant";
  if (/\b(yantra|yantram|shri\s*yantra)\b/i.test(combined)) return "yantra";
  if (/\b(idol|idols|murti|statue|shivling|lingam|shaligram)\b/i.test(combined)) return "idol";
  if (/\b(camphor|kapoor|dhoop|agarbatti|incense|bhasma|vibhuti|attar|diya|ghee|samagri|gangajal|hawan)\b/i.test(combined)) return "puja";
  if (/\b(gauri\s*shankar|garbh\s*gauri|trijuti)\b/i.test(combined)) return "gauri_shankar";

  const mukhiNums = extractMukhiNumbers(textOrProd);
  if (mukhiNums.length > 1 || /\b(combo|combination|pack\s*of|pair\s*of)\b/i.test(combined)) return "combo";
  if (mukhiNums.length === 1) return "single_bead";
  if (/\b(ganesh|ganesha)\b/i.test(combined)) return "ganesh";
  return "general";
}

const CLIENT_VARIETY_TOKENS = [
  "karungali", "ebony", "tulsi", "sphatik", "quartz", "crystal", "vaijayanti",
  "chandan", "raktachandan", "sandalwood", "haldi", "turmeric", "kamalgatta",
  "hakik", "agate", "pyrite", "amethyst", "citrine", "lapis", "tiger", "parad",
  "siddha", "indra", "navratna", "chakra", "gauri", "trijuti", "garbh", "savar",
  "bhadraksha", "kapoor", "camphor", "dhoop", "agarbatti", "bhasma", "vibhuti",
  "attar", "shivling", "shaligram", "mahakal", "trishul", "damru", "kalash", "shankh"
];

export function extractDistinctiveTokens(textOrProd) {
  let text = "";
  const kind = detectProductKind(textOrProd);
  if (typeof textOrProd === "string" || typeof textOrProd === "number") {
    text = String(textOrProd).toLowerCase().replace(/[-_]+/g, " ");
  } else if (textOrProd && typeof textOrProd === "object") {
    text = [textOrProd.name, textOrProd.category, textOrProd.subCategory]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .replace(/[-_]+/g, " ");
    if (!text) {
      text = String(textOrProd.slug || "").toLowerCase().replace(/[-_]+/g, " ");
    }
  }

  const found = [];
  for (const tok of CLIENT_VARIETY_TOKENS) {
    if (tok === "crystal") continue;
    if (new RegExp(`\\b${tok}\\b`, "i").test(text)) {
      const canonical =
        tok === "ebony" ? "karungali" :
        tok === "quartz" ? "sphatik" :
        tok === "turmeric" ? "haldi" :
        tok === "agate" ? "hakik" :
        tok === "camphor" ? "kapoor" :
        tok === "sandalwood" ? "chandan" :
        tok;
      if (!found.includes(canonical)) found.push(canonical);
    }
  }

  if (/\bcrystal\b/i.test(text)) {
    const hasSpecificStone = found.some((t) =>
      ["sphatik", "hakik", "pyrite", "amethyst", "citrine", "lapis", "tiger", "navratna"].includes(t)
    );
    if (!hasSpecificStone && !found.includes("crystal")) {
      found.push("crystal");
    }
  }

  if (kind !== "single_bead") {
    if (/\b(ganesh|ganesha)\b/i.test(text) && !found.includes("ganesh")) found.push("ganesh");
    if (/\b(hanuman|bajrang)\b/i.test(text) && !found.includes("hanuman")) found.push("hanuman");
  }

  return found;
}

export function isProductSlugHealthy(product) {
  if (!product || typeof product !== "object") return false;
  const rawSlug = String(product.slug || "").trim().toLowerCase();
  if (!rawSlug) return false;
  const rawName = String(product.name || "").trim();
  if (!rawName) return true;

  const nameKind = detectProductKind({ name: rawName, category: product.category, subCategory: product.subCategory });
  const slugKind = detectProductKind(rawSlug);
  if (nameKind !== "general" && slugKind !== "general" && nameKind !== slugKind) {
    return false;
  }

  const nameMukhis = extractMukhiNumbers({ name: rawName, mukhi: product.mukhi });
  const slugMukhis = extractMukhiNumbers(rawSlug);
  if (nameMukhis.length > 0 && slugMukhis.length > 0 && nameMukhis.join(",") !== slugMukhis.join(",")) {
    return false;
  }
  if (nameKind === "single_bead" && nameMukhis.length === 1 && slugMukhis.length === 0) {
    return false;
  }

  const nameVarieties = extractDistinctiveTokens({ name: rawName, category: product.category, subCategory: product.subCategory });
  const slugVarieties = extractDistinctiveTokens(rawSlug);
  for (const v of nameVarieties) {
    if (!slugVarieties.includes(v)) return false;
  }
  for (const sv of slugVarieties) {
    if (!nameVarieties.includes(sv)) return false;
  }

  return true;
}

export function areProductAndTargetCompatible(product, targetRaw = "", strippedRaw = "") {
  if (!product) return false;
  const t = String(targetRaw || "").toLowerCase().trim();
  const s = String(strippedRaw || stripMarketingModifiers(t)).toLowerCase().trim();
  if (!t && !s) return true;

  const pId = String(product.id || "").toLowerCase().trim();
  const pMongoId = String(product._id || "").toLowerCase().trim();
  const cleanId = t.replace(/^(product-card-|product-)/, "");

  if (
    (pId && (pId === t || pId === cleanId || (s && pId === s && /^[0-9a-f]{24}$|^prod-|^mala$|^ganesh$|^gauri-shankar$/i.test(pId)))) ||
    (pMongoId && (pMongoId === t || pMongoId === cleanId || pMongoId === s))
  ) {
    return true;
  }

  const targetKind = detectProductKind(t || s);
  const prodKind = detectProductKind(product);
  if (pId && (pId === s || `p${pId}` === s) && targetKind === prodKind) {
    return true;
  }

  if (targetKind !== "general" && prodKind !== "general" && targetKind !== prodKind) return false;
  if (targetKind === "mala" && prodKind !== "mala") return false;
  if (prodKind === "mala" && targetKind !== "mala") return false;
  if (targetKind === "bracelet" && prodKind !== "bracelet") return false;
  if (prodKind === "bracelet" && targetKind !== "bracelet") return false;

  const targetVarieties = extractDistinctiveTokens(t || s);
  const prodVarieties = extractDistinctiveTokens(product);
  if (targetVarieties.length > 0) {
    for (const tv of targetVarieties) {
      if (!prodVarieties.includes(tv)) return false;
    }
  }
  if (prodVarieties.length > 0) {
    for (const pv of prodVarieties) {
      if (!targetVarieties.includes(pv)) return false;
    }
  }

  const targetMukhis = extractMukhiNumbers(t || s);
  const prodMukhis = extractMukhiNumbers(product);
  if (targetMukhis.length > 0) {
    if (prodMukhis.length === 0) return false;
    if (targetMukhis.join(",") !== prodMukhis.join(",")) return false;
  } else if (prodMukhis.length > 0) {
    if (prodKind === "single_bead") return false;
    if (prodKind === "combo" && targetVarieties.length === 0) return false;
    if (targetVarieties.length === 0 && (prodMukhis.length !== 1 || prodMukhis[0] !== 5)) {
      return false;
    }
  }

  return true;
}

/**
 * Standardize product ID extraction for routing.
 * Checks slug (if healthy and consistent with product name), id, _id, productId to find the appropriate route identifier.
 */
export const getProductRouteId = (product) => {
  if (!product) return "";
  if (product.slug && isProductSlugHealthy(product)) {
    return product.slug;
  }
  return product.id || product._id || product.productId || slugifyProductName(product.name) || product.slug || "";
};

/**
 * Standardize product route URL generation.
 */
export const getProductRoute = (product) => {
  const id = getProductRouteId(product);
  return id ? `/product/${id}` : "/shop";
};
