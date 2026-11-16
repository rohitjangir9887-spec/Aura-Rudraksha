import { describe, it, expect, beforeEach } from "vitest";
import {
  stripSeoSlugMarketingModifiers,
  matchProductFromCatalog,
  hasRealProductMedia,
  pickBestProductCandidate,
  findProductForSeo,
  isProductSlugHealthy,
  buildHealthyProductSlug,
  areProductAndTargetCompatible
} from "../seoService.js";
import { getProductRouteId } from "../../../src/lib/routes.js";
import { inMemoryStore } from "../../data/inMemoryStore.js";
import { calculateOrderTotals } from "../pricingService.js";

describe("Direct Product Link SEO & Image Resolution", () => {
  beforeEach(() => {
    inMemoryStore.isProductsSyncedFromDb = false;
    inMemoryStore.products = [];
  });

  it("strips chained marketing prefixes and suffixes from product SEO URLs", () => {
    expect(
      stripSeoSlugMarketingModifiers("buy-original-7-mukhi-rudraksha-nepali-online-lab-certified")
    ).toBe("7-mukhi-rudraksha");

    expect(
      stripSeoSlugMarketingModifiers("premium-authentic-14-mukhi-rudraksha-authentic-lab-certified-aura-rudraksha")
    ).toBe("14-mukhi-rudraksha");
  });

  it("matches exact 7 Mukhi product from catalog instead of 17 Mukhi", () => {
    const catalog = [
      { id: "17", name: "17 Mukhi Rudraksha", slug: "17-mukhi-rudraksha", status: "Published", img: "https://example.com/17.webp" },
      { id: "7", name: "7 Mukhi Rudraksha", slug: "7-mukhi-rudraksha", status: "Published", img: "https://example.com/7.webp" }
    ];

    const matched = matchProductFromCatalog(
      catalog,
      "buy-original-7-mukhi-rudraksha-nepali-online-lab-certified"
    );

    expect(matched?.id).toBe("7");
    expect(matched?.img).toBe("https://example.com/7.webp");
  });

  it("prefers Admin product with real uploaded photos over placeholder duplicate in catalog", () => {
    const catalog = [
      { id: "7-legacy", name: "7 Mukhi Rudraksha", slug: "7-mukhi-rudraksha", status: "Published", img: "/images/placeholder.svg", images: ["/images/placeholder.svg"] },
      { id: "PROD-7", name: "7 Mukhi Nepali Rudraksha", slug: "7-mukhi-rudraksha", status: "Published", img: "https://i.ibb.co/real-7m.png", images: ["https://i.ibb.co/real-7m.png"] }
    ];

    const matched = matchProductFromCatalog(
      catalog,
      "buy-original-7-mukhi-rudraksha-nepali-online-lab-certified"
    );

    expect(matched?.id).toBe("PROD-7");
    expect(matched?.img).toBe("https://i.ibb.co/real-7m.png");
    expect(pickBestProductCandidate(catalog)?.id).toBe("PROD-7");
  });

  it("skips Draft products during public slug resolution", () => {
    const catalog = [
      { id: "7-draft", name: "7 Mukhi Rudraksha Draft", slug: "7-mukhi-rudraksha", status: "Draft", img: "/images/placeholder.svg" },
      { id: "7", name: "7 Mukhi Rudraksha", slug: "7-mukhi-rudraksha", status: "Published", img: "https://example.com/7-live.webp" }
    ];

    const matched = matchProductFromCatalog(
      catalog,
      "buy-original-7-mukhi-rudraksha-nepali-online-lab-certified"
    );

    expect(matched?.id).toBe("7");
  });

  it("detects placeholder vs real uploaded product media", () => {
    expect(hasRealProductMedia({ img: "/images/placeholder.svg", images: ["/images/placeholder.svg"] })).toBe(false);
    expect(hasRealProductMedia({ img: "/images/product-7mukhi.jpg" })).toBe(false);
    expect(hasRealProductMedia({ img: "https://i.ibb.co/abc/7mukhi.png" })).toBe(true);
    expect(hasRealProductMedia({ images: ["/images/placeholder.svg", "https://ik.imagekit.io/aura/7m.webp"] })).toBe(true);
  });

  it("never falls back to demo defaultProducts in findProductForSeo when store is empty/unsynced", async () => {
    const res = await findProductForSeo("non-existent-demo-product-slug-xyz");
    expect(res).toBeNull();
  });

  it("never resolves gibberish slug '11-49o' to 11 Mukhi Rudraksha", async () => {
    const prod11 = {
      id: "11",
      name: "11 Mukhi Rudraksha",
      slug: "11-mukhi-rudraksha",
      mukhi: "11",
      status: "Published",
      img: "https://example.com/11.webp"
    };

    expect(matchProductFromCatalog([prod11], "11-49o")).toBeNull();
    expect(matchProductFromCatalog([prod11], "11-mukhi-rudraksha")?.id).toBe("11");

    inMemoryStore.isProductsSyncedFromDb = true;
    inMemoryStore.products = [prod11];
    expect(await findProductForSeo("11-49o")).toBeNull();
    expect((await findProductForSeo("11-mukhi-rudraksha"))?.id).toBe("11");
  });

  it("never leaks hardcoded demo defaultProducts in pricingService when store is empty", async () => {
    inMemoryStore.isProductsSyncedFromDb = false;
    inMemoryStore.products = [];
    const totals = await calculateOrderTotals({ lines: [{ id: "11", qty: 1 }] });
    expect(totals.items).toHaveLength(0);
    expect(totals.unavailableItems).toHaveLength(1);
    expect(totals.finalTotal).toBe(0);
  });

  it("never cross-matches 5 Mukhi Bead, 5 Mukhi Mala, and 5 Mukhi Bracelet", () => {
    const mixedCatalog = [
      {
        id: "5",
        name: "Original 5 Mukhi Rudraksha (Nepali)",
        slug: "5-mukhi-rudraksha",
        category: "Rudraksha",
        mukhi: "5 Mukhi",
        status: "Published",
        img: "https://example.com/5-bead.webp"
      },
      {
        id: "mala",
        name: "Sacred 108+1 Rudraksha Japa Mala",
        slug: "rudraksha-mala-108-beads",
        category: "Mala",
        mukhi: "5 Mukhi Mala",
        status: "Published",
        img: "https://example.com/japa-mala.webp"
      },
      {
        id: "5-mukhi-mala",
        name: "5 Mukhi Rudraksha Japa Mala (108+1 Beads)",
        slug: "5-mukhi-rudraksha-mala",
        category: "Mala",
        mukhi: "5 Mukhi",
        status: "Published",
        img: "https://example.com/5m-mala.webp"
      },
      {
        id: "5-bracelet",
        name: "Consecrated 5 Mukhi Rudraksha Bracelet",
        slug: "5-mukhi-rudraksha-bracelet",
        category: "Bracelets",
        mukhi: "5 Mukhi",
        status: "Published",
        img: "https://example.com/5m-bracelet.webp"
      }
    ];

    expect(matchProductFromCatalog(mixedCatalog, "5-mukhi-rudraksha")?.id).toBe("5");
    expect(matchProductFromCatalog(mixedCatalog, "5-mukhi-rudraksha-mala")?.id).toBe("5-mukhi-mala");
    expect(matchProductFromCatalog(mixedCatalog, "rudraksha-mala-108-beads")?.id).toBe("mala");
    expect(matchProductFromCatalog(mixedCatalog, "5-mukhi-rudraksha-bracelet")?.id).toBe("5-bracelet");
  });

  it("resolves distinct Mala varieties (Karungali, Tulsi, Sphatik, Siddha, Rudraksha) without cross-matching", () => {
    const malaCatalog = [
      {
        id: "mala-1",
        name: "Sacred 108+1 Rudraksha Japa Mala",
        slug: "rudraksha-mala-108-beads",
        category: "Mala",
        status: "Published",
        img: "https://example.com/rudraksha-mala.webp"
      },
      {
        id: "mala-karungali",
        name: "Original Karungali Mala (108+1 Beads) — Sacred Black Ebony Wood Rosary",
        slug: "karungali-mala-108-beads",
        category: "Mala",
        status: "Published",
        img: "https://example.com/karungali-mala.webp"
      },
      {
        id: "mala-tulsi",
        name: "Sacred Vrindavan Tulsi Kanthi Mala (108+1 Beads)",
        slug: "tulsi-kanthi-mala-108-beads",
        category: "Mala",
        status: "Published",
        img: "https://example.com/tulsi-mala.webp"
      },
      {
        id: "mala-sphatik",
        name: "Natural Sphatik Crystal Mala (108+1 Beads)",
        slug: "sphatik-crystal-mala-108-beads",
        category: "Mala",
        status: "Published",
        img: "https://example.com/sphatik-mala.webp"
      },
      {
        id: "mala-siddha",
        name: "1 to 14 Mukhi Siddha Rudraksha Mala",
        slug: "1-to-14-mukhi-siddha-mala",
        category: "Mala",
        mukhi: "1 to 14 Mukhi",
        status: "Published",
        img: "https://example.com/siddha-mala.webp"
      },
      {
        id: "14",
        name: "14 Mukhi Rudraksha (Nepali)",
        slug: "14-mukhi-rudraksha",
        category: "Rudraksha",
        mukhi: "14 Mukhi",
        status: "Published",
        img: "https://example.com/14-bead.webp"
      }
    ];

    expect(matchProductFromCatalog(malaCatalog, "karungali-mala-108-beads")?.id).toBe("mala-karungali");
    expect(matchProductFromCatalog(malaCatalog, "karungali-mala")?.id).toBe("mala-karungali");
    expect(matchProductFromCatalog(malaCatalog, "tulsi-kanthi-mala-108-beads")?.id).toBe("mala-tulsi");
    expect(matchProductFromCatalog(malaCatalog, "tulsi-mala")?.id).toBe("mala-tulsi");
    expect(matchProductFromCatalog(malaCatalog, "sphatik-crystal-mala-108-beads")?.id).toBe("mala-sphatik");
    expect(matchProductFromCatalog(malaCatalog, "sphatik-mala")?.id).toBe("mala-sphatik");
    expect(matchProductFromCatalog(malaCatalog, "1-to-14-mukhi-siddha-mala")?.id).toBe("mala-siddha");
    expect(matchProductFromCatalog(malaCatalog, "siddha-mala")?.id).toBe("mala-siddha");
    expect(matchProductFromCatalog(malaCatalog, "rudraksha-mala-108-beads")?.id).toBe("mala-1");
    // Unlisted variety (e.g. "vaijayanti-mala") must NOT open Karungali or Tulsi Mala
    expect(matchProductFromCatalog(malaCatalog, "vaijayanti-mala")).toBeNull();
  });

  it("detects and heals stale or colliding product slugs from Admin edits", () => {
    const renamedProductWithStaleSlug = {
      id: "PROD-99",
      name: "Karungali Mala 108 Beads",
      slug: "5-mukhi-rudraksha", // stale slug from before rename
      category: "Mala"
    };

    expect(isProductSlugHealthy(renamedProductWithStaleSlug)).toBe(false);
    expect(getProductRouteId(renamedProductWithStaleSlug)).toBe("PROD-99");
    expect(areProductAndTargetCompatible(renamedProductWithStaleSlug, "5-mukhi-rudraksha")).toBe(false);

    const used = new Set(["karungali-mala-108-beads"]);
    const healedSlug = buildHealthyProductSlug(renamedProductWithStaleSlug, used);
    expect(healedSlug).toBe("karungali-mala-108-beads-prod-99");
  });
});
