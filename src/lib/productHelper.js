/**
 * Product Classification, Ordering & Presentation Helpers
 */

/**
 * Check if a product is a Rudraksha bead/combination
 */
export function isRudrakshaProduct(product) {
  if (!product) return false;

  const cat = (product.category || "").toLowerCase().trim();
  const subCat = (product.subCategory || "").toLowerCase().trim();
  const name = (product.name || "").toLowerCase().trim();
  const type = (product.productType || "").toLowerCase().trim();

  // 1. Explicit flag on product object
  if (product.isRudraksha === false) {
    return false;
  }

  // 2. Clear non-rudraksha category keywords (unless name explicitly includes "rudraksha" or "mukhi")
  const isExplicitNonRudraksha = 
    cat.includes("idol") || cat.includes("god") || cat.includes("statue") || cat.includes("murti") ||
    cat.includes("puja") || cat.includes("samagri") || cat.includes("hawan") || cat.includes("agarbatti") ||
    cat.includes("dhoop") || cat.includes("camphor") || cat.includes("kapoor") || cat.includes("diya") ||
    cat.includes("chandan") || cat.includes("essential") || cat.includes("book") || cat.includes("brass") ||
    cat.includes("yantra") || cat.includes("copper") || cat.includes("crystal") || cat.includes("gemstone") ||
    cat.includes("sphatik") || cat.includes("spatik") || cat.includes("karungali") ||
    name.includes("sphatik") || name.includes("spatika") || name.includes("crystal mala") ||
    name.includes("karungali") || name.includes("parad") || name.includes("kamakhya sindoor") ||
    name.includes("ganga jal") || name.includes("idol") || name.includes("statue") || name.includes("murti") ||
    name.includes("camphor") || name.includes("kapoor") || name.includes("dhoop") || name.includes("agarbatti") ||
    name.includes("incense") || name.includes("hawan") || name.includes("yantra") || name.includes("puja thali") ||
    name.includes("cow ghee") || name.includes("chandan") || name.includes("brass") ||
    ["puja_samagri", "general", "idol", "god_idol", "yantra", "gemstone", "crystal"].includes(type);

  if (isExplicitNonRudraksha && !name.includes("rudraksha") && !name.includes("mukhi")) {
    return false;
  }

  // If category is "Mala" or "Malas" or "Bracelets", check if it's explicitly a Rudraksha mala
  const isGeneralMala = cat.includes("mala") || subCat.includes("mala") || cat.includes("bracelet");
  if (isGeneralMala) {
    const hasRudrakshaSignal = name.includes("rudraksha") || name.includes("mukhi") || name.includes("gauri shankar");
    if (!hasRudrakshaSignal) {
      return false;
    }
  }

  // 3. Positive Rudraksha markers
  if (
    name.includes("rudraksha") ||
    name.includes("mukhi") ||
    name.includes("gauri shankar") ||
    name.includes("ganesh rudraksha") ||
    name.includes("garbh gauri") ||
    cat.includes("rudraksha") ||
    cat.includes("mukhi")
  ) {
    return true;
  }

  if (product.isRudraksha === true && !isExplicitNonRudraksha && !isGeneralMala) {
    return true;
  }

  // Default to false for non-rudraksha items
  return false;
}

/**
 * Get explicit positive order number configured by Admin (1, 2, 3...)
 * Returns 0 if no explicit order is set.
 */
export function getExplicitProductOrder(p, layoutIndexMap = null) {
  if (!p) return 0;
  const hOrder = Number(p.homeOrder);
  if (!isNaN(hOrder) && hOrder > 0) return hOrder;
  const sOrder = Number(p.sortOrder);
  if (!isNaN(sOrder) && sOrder > 0) return sOrder;
  const dOrder = Number(p.displayOrder);
  if (!isNaN(dOrder) && dOrder > 0) return dOrder;
  if (layoutIndexMap) {
    const pid = String(p.id ?? p._id ?? "");
    if (pid && layoutIndexMap.has(pid)) {
      return layoutIndexMap.get(pid) + 1;
    }
  }
  return 0;
}

/**
 * Interleave products so customers see a varied catalog while strictly preserving
 * any explicit Admin sequence (#1, #2, #3...) at the front.
 */
export function interleaveCatalogProducts(products = [], layoutIds = []) {
  if (!Array.isArray(products) || products.length <= 1) return products;

  const layoutIndexMap = Array.isArray(layoutIds) && layoutIds.length > 0
    ? new Map(layoutIds.map((id, idx) => [String(id), idx]))
    : null;

  const pinnedAdminOrdered = [];
  const remaining = [];

  for (const p of products) {
    if (getExplicitProductOrder(p, layoutIndexMap) > 0) {
      pinnedAdminOrdered.push(p);
    } else {
      remaining.push(p);
    }
  }

  pinnedAdminOrdered.sort((a, b) => {
    const ordA = getExplicitProductOrder(a, layoutIndexMap);
    const ordB = getExplicitProductOrder(b, layoutIndexMap);
    if (ordA !== ordB) return ordA - ordB;
    if (layoutIndexMap) {
      const idxA = layoutIndexMap.has(String(a?.id ?? a?._id ?? "")) ? layoutIndexMap.get(String(a?.id ?? a?._id ?? "")) : 999999;
      const idxB = layoutIndexMap.has(String(b?.id ?? b?._id ?? "")) ? layoutIndexMap.get(String(b?.id ?? b?._id ?? "")) : 999999;
      if (idxA !== idxB) return idxA - idxB;
    }
    return 0;
  });

  if (remaining.length <= 1) {
    return [...pinnedAdminOrdered, ...remaining];
  }

  const rudrakshas = [];
  const others = [];

  for (const p of remaining) {
    if (isRudrakshaProduct(p)) {
      rudrakshas.push(p);
    } else {
      others.push(p);
    }
  }

  if (rudrakshas.length === 0) return [...pinnedAdminOrdered, ...others];
  if (others.length === 0) return [...pinnedAdminOrdered, ...rudrakshas];

  const interleaved = [];
  let rIdx = 0;
  let oIdx = 0;

  while (rIdx < rudrakshas.length || oIdx < others.length) {
    if (rIdx < rudrakshas.length) {
      interleaved.push(rudrakshas[rIdx++]);
    }
    if (oIdx < others.length) {
      interleaved.push(others[oIdx++]);
    }
  }

  return [...pinnedAdminOrdered, ...interleaved];
}

/**
 * Parse mukhi number for natural sorting (1 Mukhi, 2 Mukhi ... 14 Mukhi, Gauri Shankar)
 */
export function getProductMukhiNumber(product) {
  if (!product) return 999;
  if (product.mukhi) {
    const m = String(product.mukhi).match(/\d+/);
    if (m) return parseInt(m[0], 10);
  }
  const name = product.name || "";
  const match = name.match(/(\d+)\s*mukhi/i);
  if (match) return parseInt(match[1], 10);
  if (name.toLowerCase().includes("gauri shankar")) return 100;
  if (name.toLowerCase().includes("ganesh")) return 101;
  if (name.toLowerCase().includes("garbh gauri")) return 102;
  return 999;
}

/**
 * Detect whether a product is a newly created custom product (via Admin Dashboard or AI Agent)
 * rather than one of the static seed IDs (1..30)
 */
export function isNewlyCreatedProduct(p) {
  if (!p) return false;
  const pid = String(p.id || p._id || "");
  if (pid.startsWith("prod_")) return true;
  if (/^\d{10,}$/.test(pid)) return true;
  if (p.createdAt) {
    const ts = new Date(p.createdAt).getTime();
    if (!isNaN(ts) && ts > 1700000000000 && !/^(?:[1-9]|[12]\d|30)$/.test(pid)) {
      return true;
    }
  }
  return false;
}

export function getProductCreatedTimestamp(p) {
  if (!p) return 0;
  if (p.createdAt) {
    const t = new Date(p.createdAt).getTime();
    if (!isNaN(t)) return t;
  }
  const pid = String(p.id || "");
  const m = pid.match(/(\d{13})/);
  if (m) return parseInt(m[1], 10);
  return 0;
}

/**
 * Sort products for All Products / Shop / Admin Catalog view based on:
 * 1. Explicit admin sequence (`homeOrder`, `sortOrder`, `displayOrder` > 0, or `layoutIds` position) FIRST (#1, #2, #3...)
 * 2. Newly created products (if no explicit sequence is set)
 * 3. Natural category & Mukhi sequence (1 Mukhi -> 14 Mukhi -> Special Beads -> Malas -> Puja Samagri -> Others)
 * 4. Rating & Creation time
 */
export function sortProductsByCatalogOrder(products = [], layoutIds = []) {
  if (!Array.isArray(products)) return [];

  const layoutIndexMap = Array.isArray(layoutIds) && layoutIds.length > 0
    ? new Map(layoutIds.map((id, idx) => [String(id), idx]))
    : null;

  return [...products].sort((a, b) => {
    // 1. Explicit admin order ALWAYS wins first (#1, #2, #3...)
    const orderA = getExplicitProductOrder(a, layoutIndexMap);
    const orderB = getExplicitProductOrder(b, layoutIndexMap);

    if (orderA > 0 && orderB > 0 && orderA !== orderB) {
      return orderA - orderB;
    }
    if (orderA > 0 && orderB === 0) return -1;
    if (orderA === 0 && orderB > 0) return 1;

    if (layoutIndexMap) {
      const idxA = layoutIndexMap.has(String(a?.id ?? a?._id ?? "")) ? layoutIndexMap.get(String(a?.id ?? a?._id ?? "")) : -1;
      const idxB = layoutIndexMap.has(String(b?.id ?? b?._id ?? "")) ? layoutIndexMap.get(String(b?.id ?? b?._id ?? "")) : -1;
      if (idxA >= 0 && idxB >= 0 && idxA !== idxB) return idxA - idxB;
      if (idxA >= 0 && idxB < 0) return -1;
      if (idxA < 0 && idxB >= 0) return 1;
    }

    // 2. For products without explicit order, prioritize newly created products
    const isNewA = isNewlyCreatedProduct(a);
    const isNewB = isNewlyCreatedProduct(b);
    if (isNewA && isNewB) {
      const diff = getProductCreatedTimestamp(b) - getProductCreatedTimestamp(a);
      if (diff !== 0) return diff;
    }
    if (isNewA && !isNewB) return -1;
    if (!isNewA && isNewB) return 1;

    // 3. Rudraksha beads sorted by Mukhi
    const isRudrakshaA = isRudrakshaProduct(a);
    const isRudrakshaB = isRudrakshaProduct(b);

    if (isRudrakshaA && isRudrakshaB) {
      const mukhiA = getProductMukhiNumber(a);
      const mukhiB = getProductMukhiNumber(b);
      if (mukhiA !== mukhiB) return mukhiA - mukhiB;
    }

    // 4. Keep rudrakshas before general puja samagri if no explicit order
    if (isRudrakshaA && !isRudrakshaB) return -1;
    if (!isRudrakshaA && isRudrakshaB) return 1;

    // 5. Rating or ID
    return (Number(b?.rating) || 0) - (Number(a?.rating) || 0);
  });
}

/**
 * Sort products for Home Showcase based on:
 * 1. Explicit Admin `homeOrder` / `sortOrder` / `displayOrder` (> 0) or `layoutIds` position FIRST (#1, #2, #3...)
 * 2. Newly created products (if no explicit order is set)
 * 3. Popularity / Featured
 * 4. Shop Catalog order
 */
export function sortProductsByHomeOrder(products = [], layoutIds = []) {
  if (!Array.isArray(products)) return [];

  const layoutIndexMap = Array.isArray(layoutIds) && layoutIds.length > 0
    ? new Map(layoutIds.map((id, idx) => [String(id), idx]))
    : null;

  return [...products].sort((a, b) => {
    const orderA = getExplicitProductOrder(a, layoutIndexMap);
    const orderB = getExplicitProductOrder(b, layoutIndexMap);

    if (orderA > 0 && orderB > 0 && orderA !== orderB) {
      return orderA - orderB;
    }
    if (orderA > 0 && orderB === 0) return -1;
    if (orderA === 0 && orderB > 0) return 1;

    if (layoutIndexMap) {
      const idxA = layoutIndexMap.has(String(a?.id ?? a?._id ?? "")) ? layoutIndexMap.get(String(a?.id ?? a?._id ?? "")) : -1;
      const idxB = layoutIndexMap.has(String(b?.id ?? b?._id ?? "")) ? layoutIndexMap.get(String(b?.id ?? b?._id ?? "")) : -1;
      if (idxA >= 0 && idxB >= 0 && idxA !== idxB) return idxA - idxB;
      if (idxA >= 0 && idxB < 0) return -1;
      if (idxA < 0 && idxB >= 0) return 1;
    }

    const isNewA = isNewlyCreatedProduct(a);
    const isNewB = isNewlyCreatedProduct(b);
    if (isNewA && isNewB) {
      const diff = getProductCreatedTimestamp(b) - getProductCreatedTimestamp(a);
      if (diff !== 0) return diff;
    }
    if (isNewA && !isNewB) return -1;
    if (!isNewA && isNewB) return 1;

    if (a?.isPopular && !b?.isPopular) return -1;
    if (!a?.isPopular && b?.isPopular) return 1;

    return sortProductsByCatalogOrder([a, b], layoutIds)[0] === a ? -1 : 1;
  });
}

/**
 * Cleanly format Mukhi labels without duplicate "Mukhi Mukhi"
 * e.g. "5" -> "5 Mukhi", "5 Mukhi" -> "5 Mukhi", "Gauri Shankar" -> "Gauri Shankar"
 */
export function formatMukhiLabel(val) {
  if (!val) return "Natural Grooves";
  const str = String(val).trim();
  if (!str) return "Natural Grooves";
  if (/mukhi|मुखी/i.test(str)) return str;
  return `${str} Mukhi`;
}

/**
 * Safely parse numerical prices from numbers or currency-formatted strings ("₹ 1,499" -> 1499)
 */
export function safePrice(val, defaultVal = 0) {
  if (typeof val === "number" && !isNaN(val)) return val;
  if (!val) return defaultVal;
  const cleaned = String(val).replace(/[^0-9.]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? defaultVal : num;
}

