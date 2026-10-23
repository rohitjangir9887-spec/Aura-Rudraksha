/**
 * Product Classification, Ordering & Presentation Helpers
 */

/**
 * Check if a product is a Rudraksha bead/combination
 */
export function isRudrakshaProduct(product) {
  if (!product) return false;

  const cat = (product.category || "").toLowerCase().trim();
  const name = (product.name || "").toLowerCase().trim();
  const type = (product.productType || "").toLowerCase().trim();

  // 1. Explicit non-rudraksha indicators in Category, Name, or ProductType
  const isNonRudrakshaCategoryOrName = 
    cat.includes("idol") || cat.includes("god") || cat.includes("statue") || cat.includes("murti") ||
    cat.includes("puja") || cat.includes("samagri") || cat.includes("hawan") || cat.includes("agarbatti") ||
    cat.includes("dhoop") || cat.includes("camphor") || cat.includes("kapoor") || cat.includes("diya") ||
    cat.includes("chandan") || cat.includes("essential") || cat.includes("book") || cat.includes("brass") ||
    cat.includes("yantra") || cat.includes("copper") ||
    name.includes("idol") || name.includes("statue") || name.includes("murti") || name.includes("camphor") ||
    name.includes("kapoor") || name.includes("dhoop") || name.includes("agarbatti") || name.includes("incense") ||
    name.includes("hawan") || name.includes("ganga jal") || name.includes("yantra") || name.includes("puja thali") ||
    name.includes("cow ghee") || name.includes("chandan") || name.includes("brass") ||
    ["puja_samagri", "general", "idol", "god_idol", "yantra"].includes(type);

  // If title or category indicates a non-rudraksha item and does NOT contain "rudraksha" or "mukhi", return FALSE immediately
  if (isNonRudrakshaCategoryOrName && !name.includes("rudraksha") && !name.includes("mukhi")) {
    return false;
  }

  // 2. Explicit flag on product object
  if (product.isRudraksha === false) {
    return false;
  }

  // 3. Positive Rudraksha markers
  if (
    name.includes("rudraksha") ||
    name.includes("mukhi") ||
    name.includes("gauri shankar") ||
    name.includes("ganesh rudraksha") ||
    cat.includes("rudraksha") ||
    cat.includes("mukhi") ||
    type === "rudraksha" ||
    product.isRudraksha === true
  ) {
    return true;
  }

  // Default to false for non-rudraksha items
  return false;
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
 * Sort products for Shop / Catalog view based on:
 * 1. Newly created products (Admin / AI Agent uploads) first by newest timestamp
 * 2. Explicit admin `sortOrder` / `displayOrder` (> 0)
 * 3. Natural category & Mukhi sequence (1 Mukhi -> 14 Mukhi -> Special Beads -> Malas -> Puja Samagri -> Others)
 * 4. Rating & Creation time
 */
export function sortProductsByCatalogOrder(products = []) {
  if (!Array.isArray(products)) return [];

  return [...products].sort((a, b) => {
    const isNewA = isNewlyCreatedProduct(a);
    const isNewB = isNewlyCreatedProduct(b);
    if (isNewA && isNewB) {
      return getProductCreatedTimestamp(b) - getProductCreatedTimestamp(a);
    }
    if (isNewA && !isNewB) return -1;
    if (!isNewA && isNewB) return 1;

    // 1. Explicit sort order
    const orderA = Number(a.sortOrder || a.displayOrder || 0);
    const orderB = Number(b.sortOrder || b.displayOrder || 0);

    if (orderA > 0 && orderB > 0) return orderA - orderB;
    if (orderA > 0) return -1;
    if (orderB > 0) return 1;

    // 2. Rudraksha beads sorted by Mukhi
    const isRudrakshaA = isRudrakshaProduct(a);
    const isRudrakshaB = isRudrakshaProduct(b);

    if (isRudrakshaA && isRudrakshaB) {
      const mukhiA = getProductMukhiNumber(a);
      const mukhiB = getProductMukhiNumber(b);
      if (mukhiA !== mukhiB) return mukhiA - mukhiB;
    }

    // 3. Keep rudrakshas before general puja samagri if no explicit order
    if (isRudrakshaA && !isRudrakshaB) return -1;
    if (!isRudrakshaA && isRudrakshaB) return 1;

    // 4. Alphabetical or rating
    return (b.rating || 0) - (a.rating || 0);
  });
}

/**
 * Sort products for Home Showcase based on:
 * 1. Newly created products (Admin / AI Agent uploads) first
 * 2. Explicit `homeOrder` (> 0)
 * 3. Popularity / Featured
 * 4. Shop Catalog order
 */
export function sortProductsByHomeOrder(products = []) {
  if (!Array.isArray(products)) return [];

  return [...products].sort((a, b) => {
    const isNewA = isNewlyCreatedProduct(a);
    const isNewB = isNewlyCreatedProduct(b);
    if (isNewA && isNewB) {
      return getProductCreatedTimestamp(b) - getProductCreatedTimestamp(a);
    }
    if (isNewA && !isNewB) return -1;
    if (!isNewA && isNewB) return 1;

    const homeOrderA = Number(a.homeOrder || 0);
    const homeOrderB = Number(b.homeOrder || 0);

    if (homeOrderA > 0 && homeOrderB > 0) return homeOrderA - homeOrderB;
    if (homeOrderA > 0) return -1;
    if (homeOrderB > 0) return 1;

    if (a.isPopular && !b.isPopular) return -1;
    if (!a.isPopular && b.isPopular) return 1;

    return sortProductsByCatalogOrder([a, b])[0] === a ? -1 : 1;
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

