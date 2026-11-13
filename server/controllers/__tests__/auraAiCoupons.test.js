import { describe, it, expect } from "vitest";
import {
  generateSmartCustomerFallbackResponse,
  sanitizeFakeCouponsInResponse,
  extractMentionedCatalogProducts
} from "../auraAiController.js";

describe("Aura AI Coupon & Catalog Integrity", () => {
  const sampleCatalog = [
    {
      id: "prod-5m",
      name: "5 Mukhi Nepali Rudraksha",
      slug: "5-mukhi-nepali-rudraksha",
      price: 1199,
      comparePrice: 1799,
      mukhi: "5",
      images: ["https://ik.imagekit.io/demo/5-mukhi.jpg"],
      stock: 10
    },
    {
      id: "prod-7m",
      name: "7 Mukhi Mahalakshmi Rudraksha",
      slug: "7-mukhi-mahalakshmi-rudraksha",
      price: 2499,
      comparePrice: 3299,
      mukhi: "7",
      images: ["https://ik.imagekit.io/demo/7-mukhi.jpg"],
      stock: 5
    }
  ];

  it("never outputs hardcoded fake coupons when activeCoupons is empty", () => {
    const queries = [
      "Aaj ke coupon codes batao",
      "5 Mukhi Rudraksha ka rate aur discount batao",
      "Sphatik mala price",
      "Namaste",
      "Career aur dhan ke liye kaunsa rudraksha lu?"
    ];

    for (const q of queries) {
      const resp = generateSmartCustomerFallbackResponse(q, [sampleCatalog[0]], [], "standard", null, sampleCatalog);
      expect(resp).not.toMatch(/SHIVOHAM10/i);
      expect(resp).not.toMatch(/MAHASHIVRATRI/i);
      expect(resp).not.toMatch(/\bAURA10\b/i);
      expect(resp).not.toMatch(/\bAURA20\b/i);
      expect(resp).not.toMatch(/\bFESTIVE10\b/i);
    }

    const couponResp = generateSmartCustomerFallbackResponse("coupon code do", [], [], "standard", null, sampleCatalog);
    expect(couponResp).toContain("कोई अलग डिस्काउंट कूपन कोड सक्रिय नहीं है");
  });

  it("returns ONLY real active admin coupons configured in Admin Dashboard", () => {
    const adminCoupons = [
      {
        id: "c1",
        code: "RUDRA15",
        discount: 15,
        type: "percentage",
        minAmount: 1500,
        description: "Shravan Special Offer"
      }
    ];

    const couponResp = generateSmartCustomerFallbackResponse("discount coupon code batao", [], adminCoupons, "standard", null, sampleCatalog);
    expect(couponResp).toContain("RUDRA15");
    expect(couponResp).toContain("15%");
    expect(couponResp).not.toMatch(/SHIVOHAM10/i);
    expect(couponResp).not.toMatch(/MAHASHIVRATRI/i);
  });

  it("always formats product links with /product/ prefix for specific mukhi queries", () => {
    const resp = generateSmartCustomerFallbackResponse("5 Mukhi Rudraksha dikhao", [], [], "standard", null, sampleCatalog);
    expect(resp).toContain("(/product/5-mukhi-nepali-rudraksha)");
  });

  it("sanitizes hallucinated fake coupon codes from LLM text while keeping real admin codes", () => {
    const hallucinated = `हर हर महादेव!\n\nविशेष छूट के लिए कूपन कोड **SHIVOHAM10** का उपयोग करें!\n5 मुखी रुद्राक्ष बहुत उत्तम है।`;
    const cleanedNoCoupons = sanitizeFakeCouponsInResponse(hallucinated, []);
    expect(cleanedNoCoupons).not.toMatch(/SHIVOHAM10/i);
    expect(cleanedNoCoupons).toContain("5 मुखी रुद्राक्ष बहुत उत्तम है।");

    const keptIfAdminCreated = sanitizeFakeCouponsInResponse(hallucinated, [{ code: "SHIVOHAM10", discount: 10, type: "percentage" }]);
    expect(keptIfAdminCreated).toContain("SHIVOHAM10");
  });

  it("extracts mentioned catalog products from /product/... links in response text", () => {
    const text = "Aap [5 Mukhi](/product/5-mukhi-nepali-rudraksha) aur [7 Mukhi](/product/7-mukhi-mahalakshmi-rudraksha) dekh sakte hain.";
    const enriched = extractMentionedCatalogProducts(text, [], sampleCatalog);
    expect(enriched.length).toBe(2);
    expect(enriched[0].slug).toBe("5-mukhi-nepali-rudraksha");
    expect(enriched[1].slug).toBe("7-mukhi-mahalakshmi-rudraksha");
  });
});
