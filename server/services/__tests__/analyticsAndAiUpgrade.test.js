import { describe, test, expect, beforeEach } from "vitest";
import {
  resetInMemoryAnalyticsForTest,
  recordVisitEvent,
  recordProductViewEvent,
  getDetailedAnalyticsPayload,
  maskIpAddress,
  detectDeviceType
} from "../analyticsService.js";
import {
  extractMukhiRange,
  extractMukhiNumber,
  searchRelevantCatalogProducts
} from "../vedicKnowledgeService.js";
import {
  safeEvaluateArithmeticExpression,
  evaluateGeneralOrStoreCalculation,
  generate1To14MukhiGuideResponse,
  generateSmartCustomerFallbackResponse,
  chatAuraAI
} from "../../controllers/auraAiController.js";
import { inMemoryStore } from "../../data/inMemoryStore.js";

const SAMPLE_CATALOG = [
  { id: "1", slug: "1-mukhi-rudraksha", name: "Original 1 Mukhi Rudraksha (Kaju)", price: 4500, comparePrice: 6000, stock: 5, inStock: true, rating: 4.9, images: ["/images/1mukhi.jpg"] },
  { id: "5", slug: "5-mukhi-rudraksha", name: "Nepali 5 Mukhi Rudraksha", price: 550, comparePrice: 999, stock: 25, inStock: true, rating: 4.8, images: ["/images/5mukhi.jpg"] },
  { id: "7", slug: "buy-original-7-mukhi-rudraksha-nepali-online-lab-certified", name: "Original 7 Mukhi Rudraksha Nepali Lab Certified", price: 2499, comparePrice: 3999, stock: 12, inStock: true, rating: 4.9, images: ["/images/7mukhi.jpg"] },
  { id: "11", slug: "11-mukhi-rudraksha", name: "Nepali 11 Mukhi Rudraksha", price: 3200, comparePrice: 4500, stock: 8, inStock: true, rating: 4.8, images: ["/images/11mukhi.jpg"] },
  { id: "14", slug: "14-mukhi-rudraksha", name: "Rare 14 Mukhi Rudraksha (Deva Mani)", price: 18500, comparePrice: 24000, stock: 2, inStock: true, rating: 5.0, images: ["/images/14mukhi.jpg"] }
];

const SAMPLE_COUPONS = [
  { code: "SHIVA10", type: "percentage", discount: 10, minAmount: 500, active: true }
];

describe("Analytics Daily Deduplication (IP + Device) & IST Hourly Timing", () => {
  beforeEach(() => {
    resetInMemoryAnalyticsForTest();
  });

  test("counts 10 visits from same IP and deviceId in 1 day as 1 unique visitor and 10 page views", async () => {
    const fixedIstTime = new Date("2026-11-10T09:15:00.000Z"); // 14:45 IST
    const mockReq = {
      headers: {
        "x-forwarded-for": "103.21.55.10",
        "user-agent": "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36"
      },
      socket: { remoteAddress: "103.21.55.10" }
    };

    let lastResult = null;
    for (let i = 0; i < 10; i++) {
      lastResult = await recordVisitEvent({
        req: mockReq,
        deviceId: "dev_abc123456",
        path: i === 0 ? "/" : "/shop",
        title: "Aura Rudraksha",
        now: fixedIstTime,
        useDb: false
      });
    }

    expect(lastResult.todayPageViews).toBe(10);
    expect(lastResult.todayUniqueVisitors).toBe(1);
    expect(lastResult.todayUniqueIps).toBe(1);
    expect(lastResult.isUniqueToday).toBe(false);

    // Second device behind same IP increments uniqueVisitors to 2 while uniqueIps stays 1
    const secondDeviceRes = await recordVisitEvent({
      req: mockReq,
      deviceId: "dev_second999",
      path: "/product/7-mukhi",
      now: fixedIstTime,
      useDb: false
    });
    expect(secondDeviceRes.todayPageViews).toBe(11);
    expect(secondDeviceRes.todayUniqueVisitors).toBe(2);
    expect(secondDeviceRes.todayUniqueIps).toBe(1);
    expect(secondDeviceRes.isUniqueToday).toBe(true);
  });

  test("records IST hourly timeline, peakHour, product views, and period ranges cleanly", async () => {
    const yesterdayUtc = new Date("2026-11-09T04:00:00.000Z"); // 09:30 IST
    const todayMorningUtc = new Date("2026-11-10T04:00:00.000Z"); // 09:30 IST (hour 9)
    const todayEveningUtc = new Date("2026-11-10T14:10:00.000Z"); // 19:40 IST (hour 19)

    const req1 = { headers: { "x-real-ip": "49.36.12.88", "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)" } };
    const req2 = { headers: { "x-real-ip": "152.58.11.42", "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" } };

    await recordVisitEvent({ req: req1, deviceId: "iphone-1", path: "/", now: yesterdayUtc, useDb: false });
    await recordVisitEvent({ req: req1, deviceId: "iphone-1", path: "/", now: todayMorningUtc, useDb: false });
    await recordVisitEvent({ req: req2, deviceId: "win-1", path: "/shop", now: todayEveningUtc, useDb: false });
    await recordVisitEvent({ req: req2, deviceId: "win-1", path: "/product/7-mukhi", now: todayEveningUtc, useDb: false });
    await recordProductViewEvent({
      req: req2,
      deviceId: "win-1",
      path: "/product/7-mukhi",
      productId: "7",
      productName: "7 Mukhi Rudraksha",
      now: todayEveningUtc,
      useDb: false
    });

    const todayPayload = await getDetailedAnalyticsPayload({
      range: "today",
      orders: [],
      now: todayEveningUtc,
      useDb: false
    });
    expect(todayPayload.periods.today.pageViews).toBe(3);
    expect(todayPayload.periods.today.uniqueVisitors).toBe(2);
    expect(todayPayload.periods.today.productViews).toBe(1);
    expect(todayPayload.periods.yesterday.pageViews).toBe(1);
    expect(todayPayload.periods["7d"].pageViews).toBe(4);
    expect(todayPayload.periods.all.pageViews).toBe(4);

    // Peak hour today should be hour 19 (2 pageViews at 19:40 IST vs 1 at 09:30 IST)
    expect(todayPayload.peakHour.hour).toBe(19);
    expect(todayPayload.peakHour.pageViews).toBe(2);
    expect(todayPayload.hourlyTimeline[9].pageViews).toBe(1);
    expect(todayPayload.hourlyTimeline[19].productViews).toBe(1);

    // Recent visits carry masked IP, device type & IST timing
    expect(todayPayload.recentVisits.length).toBeGreaterThan(0);
    expect(todayPayload.recentVisits[0].ipMasked).toMatch(/\*\*\*$/);
    expect(maskIpAddress("49.36.12.88")).toBe("49.36.12.***");
    expect(detectDeviceType("Mozilla/5.0 (Linux; Android 14)")).toBe("Android Mobile");
  });
});

describe("Floating AI: 1-14 Mukhi Guide, Safe Calculator & Live Catalog Prices", () => {
  test("detects Mukhi ranges accurately without collapsing to single Mukhi", () => {
    expect(extractMukhiRange("1-14 mukhi")).toMatchObject({ isRange: true, start: 1, end: 14 });
    expect(extractMukhiRange("1 se 14 mukhi rudraksha batao")).toMatchObject({ isRange: true, start: 1, end: 14 });
    expect(extractMukhiRange("1 to 14 mukhi price")).toMatchObject({ isRange: true, start: 1, end: 14 });
    expect(extractMukhiNumber("1-14 mukhi")).toBeNull();
    expect(extractMukhiNumber("7 mukhi rudraksha ki price batao")).toBe("7");
  });

  test("evaluates arithmetic, percentages, discounts, and store quantity totals safely", () => {
    expect(safeEvaluateArithmeticExpression("1500 + 250 * 2")).toBe(2000);
    expect(safeEvaluateArithmeticExpression("(5000 - 500) / 3")).toBe(1500);
    expect(safeEvaluateArithmeticExpression("100 / 0")).toBeNull();
    expect(safeEvaluateArithmeticExpression("process.exit(1)")).toBeNull();

    const pctCalc = evaluateGeneralOrStoreCalculation("2000 par 10% discount kitna hoga", SAMPLE_CATALOG, SAMPLE_COUPONS);
    expect(pctCalc?.handled).toBe(true);
    expect(pctCalc?.numericResult).toBe(1800);

    const storeQtyCalc = evaluateGeneralOrStoreCalculation("2 piece 5 mukhi ka total calculate karo", SAMPLE_CATALOG, SAMPLE_COUPONS);
    expect(storeQtyCalc?.handled).toBe(true);
    expect(storeQtyCalc?.numericResult).toBe(1100);
    expect(storeQtyCalc?.matchedProducts.length).toBe(1);
    expect(storeQtyCalc?.matchedProducts[0].id).toBe("5");
  });

  test("returns real catalog products and prices for 1-14 mukhi and price queries", () => {
    const rangeProducts = searchRelevantCatalogProducts("1-14 mukhi", SAMPLE_CATALOG);
    expect(rangeProducts.length).toBeGreaterThanOrEqual(4);

    const priceProducts = searchRelevantCatalogProducts("rudraksha ki price batao", SAMPLE_CATALOG);
    expect(priceProducts.length).toBeGreaterThanOrEqual(3);

    const guideText = generate1To14MukhiGuideResponse(SAMPLE_CATALOG, SAMPLE_COUPONS, { start: 1, end: 14 });
    expect(guideText).toContain("1 मुखी");
    expect(guideText).toContain("7 मुखी");
    expect(guideText).toContain("14 मुखी");
    expect(guideText).toContain("₹2,499");

    const fallbackPriceReply = generateSmartCustomerFallbackResponse(
      "7 mukhi rudraksha ki price batao",
      [SAMPLE_CATALOG[2]],
      SAMPLE_COUPONS,
      "standard",
      null,
      SAMPLE_CATALOG
    );
    expect(fallbackPriceReply).toContain("₹2,499");
  });

  test("chatAuraAI handler resolves 1-14 mukhi, arithmetic, and price queries with 200 status and zero uncaught errors", async () => {
    const prevProds = inMemoryStore.products;
    inMemoryStore.products = SAMPLE_CATALOG;

    const invokeChat = async (message) => {
      let jsonBody = null;
      let statusCode = 200;
      let nextErr = null;
      const req = {
        body: { message, guestSessionId: "test_chat_guest", stream: false },
        query: {},
        headers: {},
        ip: "127.0.0.1"
      };
      const res = {
        headersSent: false,
        status(code) { statusCode = code; return this; },
        json(payload) { jsonBody = payload; return this; },
        setHeader() {},
        flushHeaders() {},
        write() {},
        end() {}
      };
      await chatAuraAI(req, res, (err) => { nextErr = err; });
      return { statusCode, jsonBody, nextErr };
    };

    try {
      const rangeRes = await invokeChat("1-14 mukhi");
      expect(rangeRes.nextErr).toBeNull();
      expect(rangeRes.statusCode).toBe(200);
      expect(rangeRes.jsonBody?.success).toBe(true);
      expect(rangeRes.jsonBody?.data?.text).toContain("14 मुखी");
      expect(rangeRes.jsonBody?.data?.products?.length).toBeGreaterThanOrEqual(4);

      const mathRes = await invokeChat("1500 + 250 * 2");
      expect(mathRes.nextErr).toBeNull();
      expect(mathRes.statusCode).toBe(200);
      expect(mathRes.jsonBody?.data?.text).toContain("2,000");

      const priceRes = await invokeChat("7 mukhi rudraksha ki price batao");
      expect(priceRes.nextErr).toBeNull();
      expect(priceRes.statusCode).toBe(200);
      expect(priceRes.jsonBody?.data?.products?.some(p => p.id === "7")).toBe(true);
    } finally {
      inMemoryStore.products = prevProds;
    }
  });
});
