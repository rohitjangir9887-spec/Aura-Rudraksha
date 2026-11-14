import { describe, it, expect, beforeEach } from "vitest";
import {
  stripSeoSlugMarketingModifiers,
  matchProductFromCatalog,
  hasRealProductMedia,
  pickBestProductCandidate,
  findProductForSeo
} from "../seoService.js";
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
});
