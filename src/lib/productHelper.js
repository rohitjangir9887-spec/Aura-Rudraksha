/**
 * Product Classification, Ordering & Presentation Helpers
 */

/**
 * Check if a product is a Rudraksha bead/combination
 */
export function isRudrakshaProduct(product) {
  if (!product) return false;
  if (product.isRudraksha === false || product.productType === "puja_samagri" || product.productType === "general") {
    return false;
  }
  if (product.isRudraksha === true || product.productType === "rudraksha") {
    return true;
  }

  const cat = (product.category || "").toLowerCase();
  const name = (product.name || "").toLowerCase();

  // If explicit non-rudraksha categories
  if (
    cat.includes("puja") ||
    cat.includes("samagri") ||
    cat.includes("hawan") ||
    cat.includes("agarbatti") ||
    cat.includes("dhoop") ||
    cat.includes("camphor") ||
    cat.includes("kapoor") ||
    cat.includes("diya") ||
    cat.includes("chandan") ||
    cat.includes("essential") ||
    cat.includes("idol") ||
    cat.includes("murti") ||
    cat.includes("book") ||
    cat.includes("brass")
  ) {
    // If name doesn't contain mukhi/rudraksha, it's not a rudraksha
    if (!name.includes("rudraksha") && !name.includes("mukhi")) {
      return false;
    }
  }

  // If title indicates Puja Samagri or general accessories
  if (
    name.includes("bhimseni camphor") ||
    name.includes("camphor") ||
    name.includes("kapoor") ||
    name.includes("dhoop") ||
    name.includes("agarbatti") ||
    name.includes("incense") ||
    name.includes("hawan samagri") ||
    name.includes("ganga jal") ||
    name.includes("puja thali") ||
    name.includes("cow ghee") ||
    name.includes("chandan tika") ||
    name.includes("kesar chandan")
  ) {
    return false;
  }

  // Default to Rudraksha if name has mukhi or category is Rudraksha/Mala/Bracelet
  return true;
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
 * Sort products for Shop / Catalog view based on:
 * 1. Explicit admin `sortOrder` / `displayOrder` (> 0)
 * 2. Natural category & Mukhi sequence (1 Mukhi -> 14 Mukhi -> Special Beads -> Malas -> Puja Samagri -> Others)
 * 3. Rating & Creation time
 */
export function sortProductsByCatalogOrder(products = []) {
  if (!Array.isArray(products)) return [];

  return [...products].sort((a, b) => {
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
 * 1. Explicit `homeOrder` (> 0)
 * 2. Popularity / Featured
 * 3. Shop Catalog order
 */
export function sortProductsByHomeOrder(products = []) {
  if (!Array.isArray(products)) return [];

  return [...products].sort((a, b) => {
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
