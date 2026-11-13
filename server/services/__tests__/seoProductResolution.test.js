import { describe, it, expect } from "vitest";
import {
  stripSeoSlugMarketingModifiers,
  matchProductFromCatalog,
  hasRealProductMedia
} from "../seoService.js";

describe("Direct Product Link SEO & Image Resolution", () => {
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
});
