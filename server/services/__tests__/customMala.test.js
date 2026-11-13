import { describe, it, expect } from "vitest";
import {
  calculateCustomMalaPricing,
  buildCustomMalaItemPayload,
  sanitizeCustomMalaConfig,
  buildCustomMalaDisplay,
  isCustomMalaLine,
  MALA_BEAD_SIZES
} from "../../../shared/customMalaCatalog.js";
import { normalizeLines, calculateOrderTotals } from "../pricingService.js";

describe("Custom Rudraksha Mala Catalog & Authoritative Pricing", () => {
  it("supports arbitrary quantities, large collector sizes, thread, and capping pricing", () => {
    const standardCalc = calculateCustomMalaPricing({
      beads: { "5-mukhi-spacer": 27, "7-mukhi": 2, ganesh: 1 },
      size: "standard",
      thread: "red-silk",
      capping: "none"
    });

    const jumboCalc = calculateCustomMalaPricing({
      beads: { "5-mukhi-spacer": 27, "7-mukhi": 2, ganesh: 1 },
      size: "jumbo",
      thread: "silver-wire",
      capping: "silver-cap",
      wearerNote: "Shiva Sankalp"
    });

    expect(MALA_BEAD_SIZES.some((s) => s.id === "jumbo" && s.label.includes("17–21"))).toBe(true);
    expect(standardCalc.totalBeads).toBe(30);
    expect(jumboCalc.totalBeads).toBe(30);
    expect(jumboCalc.unitPrice).toBeGreaterThan(standardCalc.unitPrice);
    expect(jumboCalc.customDescription).toContain("Shiva Sankalp");
    expect(jumboCalc.customDescription).toContain("925 Silver");
  });

  it("produces deterministic IDs for identical configs and distinct IDs for different configs", () => {
    const malaA = buildCustomMalaItemPayload({
      beads: { "5-mukhi-spacer": 54, "1-mukhi": 1 },
      size: "large",
      thread: "copper-wire",
      capping: "gold-plated-cap"
    });
    const malaB = buildCustomMalaItemPayload({
      beads: { "1-mukhi": 1, "5-mukhi-spacer": 54 },
      size: "large",
      thread: "copper-wire",
      capping: "gold-plated-cap"
    });
    const malaC = buildCustomMalaItemPayload({
      beads: { "5-mukhi-spacer": 108, "1-mukhi": 1 },
      size: "jumbo",
      thread: "copper-wire",
      capping: "gold-plated-cap"
    });

    expect(malaA.id).toBe(malaB.id);
    expect(malaA.id).not.toBe(malaC.id);
    expect(isCustomMalaLine(malaA)).toBe(true);

    const display = buildCustomMalaDisplay(malaA);
    expect(display.totalBeads).toBe(55);
    expect(display.beadsList.length).toBe(2);
  });

  it("sanitizes malicious or out-of-range inputs safely", () => {
    const clean = sanitizeCustomMalaConfig({
      beads: { "5-mukhi-spacer": 99999, "unknown-bead": 10, "7-mukhi": -5 },
      size: "invalid-size",
      thread: "invalid-thread",
      capping: "invalid-cap",
      wearerNote: "<script>alert(1)</script>Amit"
    });

    expect(clean.beads["5-mukhi-spacer"]).toBe(1080);
    expect(clean.beads["unknown-bead"]).toBeUndefined();
    expect(clean.beads["7-mukhi"]).toBeUndefined();
    expect(clean.size).toBe("large");
    expect(clean.thread).toBe("red-silk");
    expect(clean.capping).toBe("panchdhatu-cap");
    expect(clean.wearerNote).not.toContain("<");
  });

  it("server pricingService ignores spoofed client price and recomputes authoritative custom mala total", async () => {
    const payload = buildCustomMalaItemPayload({
      beads: { "5-mukhi-spacer": 27, "7-mukhi": 2, ganesh: 1 },
      size: "large",
      thread: "copper-wire",
      capping: "panchdhatu-cap"
    });

    const expected = calculateCustomMalaPricing(payload.customMala);

    // Client attempts to spoof price to Rs 1
    const spoofedLines = normalizeLines([
      {
        ...payload,
        price: 1,
        unitPrice: 1,
        qty: 2
      }
    ]);

    const totals = await calculateOrderTotals({ lines: spoofedLines });
    expect(totals.items.length).toBe(1);
    expect(totals.items[0].isCustomMala).toBe(true);
    expect(totals.items[0].unitPrice).toBe(expected.unitPrice);
    expect(totals.subtotal).toBe(expected.unitPrice * 2);
  });

  it("supports real store products via customMala.products with server authoritative pricing", async () => {
    const storePool = [
      { id: "1", name: "Nepali 1 Mukhi Real", price: 2499, mrp: 3500, img: "https://ik.imagekit.io/demo/1.jpg", status: "Active" },
      { id: "5", name: "Nepali 5 Mukhi Real", price: 599, mrp: 999, img: "https://ik.imagekit.io/demo/5.jpg", status: "Active" }
    ];

    const payload = buildCustomMalaItemPayload(
      {
        products: [
          { productId: "1", qty: 1 },
          { productId: "5", qty: 3 }
        ],
        thread: "red-silk",
        capping: "none"
      },
      null,
      storePool
    );

    expect(payload.name).toContain("Custom 4-Bead");
    expect(payload.customDescription).toContain("Nepali 1 Mukhi Real");
    expect(payload.customDescription).toContain("Nepali 5 Mukhi Real");
    expect(payload.price).toBe(2499 + 599 * 3);

    // Server pricing recalculates from DB/defaultProducts, ignoring tampered client price
    const totals = await calculateOrderTotals({
      lines: [
        {
          id: payload.id,
          isCustomMala: true,
          customMala: {
            products: [{ productId: "5", qty: 2 }],
            thread: "red-silk",
            capping: "none"
          },
          price: 1,
          qty: 1
        }
      ]
    });

    expect(totals.items.length).toBe(1);
    expect(totals.items[0].isCustomMala).toBe(true);
    expect(totals.items[0].unitPrice).toBeGreaterThan(100);
    expect(totals.subtotal).toBe(totals.items[0].unitPrice);
  });
});
