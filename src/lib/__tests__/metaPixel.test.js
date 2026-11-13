import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  DEFAULT_META_PIXEL_ID,
  isRestrictedPixelPath,
  hasSensitiveQueryParams,
  sanitizePixelText,
  sanitizePixelCategory,
  getCleanPixelSourceUrl,
  trackMetaPageView,
  trackMetaViewContent,
  trackMetaAddToCart,
  trackMetaInitiateCheckout,
  trackMetaPurchase
} from "../metaPixel.js";
import {
  isRestrictedMetaPath,
  scrubMetaEventSourceUrl,
  sanitizeMetaCustomData,
  buildCapiUserData
} from "../../../server/services/metaCapiService.js";

describe("Meta Pixel & Business Tools Terms Compliance", () => {
  let fbqMock;
  let storageMap;

  beforeEach(() => {
    fbqMock = vi.fn();
    storageMap = new Map();
    const storageApi = {
      getItem: (k) => (storageMap.has(k) ? storageMap.get(k) : null),
      setItem: (k, v) => storageMap.set(k, String(v)),
      removeItem: (k) => storageMap.delete(k)
    };

    globalThis.localStorage = storageApi;
    globalThis.sessionStorage = storageApi;
    globalThis.document = {
      cookie: "",
      referrer: "https://aurarudraksha.bond/shop?search=secret",
      getElementsByTagName: () => [null],
      createElement: () => ({})
    };
    globalThis.window = {
      fbq: fbqMock,
      localStorage: storageApi,
      sessionStorage: storageApi,
      screen: { width: 1280, height: 800 },
      location: {
        origin: "https://aurarudraksha.bond",
        pathname: "/product/5-mukhi-rudraksha",
        search: "?fbclid=IwAR123456"
      }
    };
  });

  afterEach(() => {
    delete globalThis.window;
    delete globalThis.document;
    delete globalThis.localStorage;
    delete globalThis.sessionStorage;
    vi.restoreAllMocks();
  });

  it("identifies restricted private/auth/admin paths accurately", () => {
    expect(isRestrictedPixelPath("/admin")).toBe(true);
    expect(isRestrictedPixelPath("/admin/orders")).toBe(true);
    expect(isRestrictedPixelPath("/login")).toBe(true);
    expect(isRestrictedPixelPath("/register")).toBe(true);
    expect(isRestrictedPixelPath("/account")).toBe(true);
    expect(isRestrictedPixelPath("/account/orders/AURA-123")).toBe(true);
    expect(isRestrictedPixelPath("/verify-certificate")).toBe(true);

    expect(isRestrictedPixelPath("/")).toBe(false);
    expect(isRestrictedPixelPath("/shop")).toBe(false);
    expect(isRestrictedPixelPath("/product/5-mukhi-rudraksha")).toBe(false);
    expect(isRestrictedPixelPath("/checkout")).toBe(false);
    expect(isRestrictedPixelPath("/payment-result")).toBe(false);
  });

  it("detects sensitive query parameters while allowing ad attribution parameters", () => {
    expect(hasSensitiveQueryParams("?guestToken=tok_123")).toBe(true);
    expect(hasSensitiveQueryParams("?status=success&orderId=AURA-1&txnid=TXN_1")).toBe(true);
    expect(hasSensitiveQueryParams("?search=blood+pressure")).toBe(true);
    expect(hasSensitiveQueryParams("?q=anxiety")).toBe(true);
    expect(hasSensitiveQueryParams("?email=user@example.com")).toBe(true);
    expect(hasSensitiveQueryParams("?oobCode=firebase123")).toBe(true);

    expect(hasSensitiveQueryParams("?fbclid=IwAR_test&utm_source=meta")).toBe(false);
    expect(hasSensitiveQueryParams("?category=Rudraksha")).toBe(false);
    expect(hasSensitiveQueryParams("?status=success&mode=cod&orderId=AURA-1")).toBe(false);
  });

  it("sanitizes restricted health/medical words in Pixel metadata", () => {
    expect(sanitizePixelText("5 Mukhi Rudraksha for Blood Pressure & Anxiety Relief")).not.toMatch(/blood\s*pressure|anxiety/i);
    expect(sanitizePixelText("14 Mukhi Nepali Rudraksha")).toBe("14 Mukhi Nepali Rudraksha");
    expect(sanitizePixelCategory("Health & Wellness")).toBe("Sacred Spiritual Beads");
    expect(sanitizePixelCategory("Rudraksha")).toBe("Rudraksha");
  });

  it("blocks Pixel events on restricted paths and sensitive query URLs", () => {
    globalThis.window.location.pathname = "/account/orders/AURA-1";
    globalThis.window.location.search = "?guestToken=secret_tok";

    trackMetaPageView();
    trackMetaViewContent({ id: "5", name: "5 Mukhi", price: 999 });
    trackMetaAddToCart({ id: "5", name: "5 Mukhi", price: 999 }, 1);
    trackMetaInitiateCheckout({ lines: [{ id: "5", price: 999, qty: 1 }], total: 999 });
    trackMetaPurchase({ id: "AURA-1", status: "Confirmed", finalAmount: 999, items: ["5"] });

    expect(fbqMock).not.toHaveBeenCalled();

    globalThis.window.location.pathname = "/shop";
    globalThis.window.location.search = "?search=blood+pressure";
    trackMetaPageView();
    expect(fbqMock).not.toHaveBeenCalled();
  });

  it("fires compliant ViewContent, AddToCart, InitiateCheckout, and Purchase on allowed routes", () => {
    globalThis.window.location.pathname = "/payment-result";
    globalThis.window.location.search = "?status=success&orderId=AURA-9001";

    expect(getCleanPixelSourceUrl()).toBe("https://aurarudraksha.bond/payment-result");

    trackMetaPurchase({
      orderNumber: "AURA-9001",
      status: "Confirmed",
      paymentStatus: "Paid",
      finalAmount: 2499,
      customerEmail: "Devotee@Example.com",
      customerPhone: "+91 9876543210",
      customerName: "Rohan Sharma",
      items: ["14"]
    });

    const initCalls = fbqMock.mock.calls.filter((c) => c[0] === "init");
    expect(initCalls.length).toBeGreaterThan(0);
    expect(initCalls[0][1]).toBe(DEFAULT_META_PIXEL_ID);

    const purchaseCall = fbqMock.mock.calls.find((c) => c[0] === "track" && c[1] === "Purchase");
    expect(purchaseCall).toBeTruthy();
    expect(purchaseCall[2]).toEqual({
      content_ids: ["14"],
      contents: [{ id: "14", quantity: 1, item_price: 2499 }],
      content_type: "product",
      value: 2499,
      currency: "INR",
      num_items: 1
    });
    expect(purchaseCall[3]).toEqual({ eventID: "PURCHASE_AURA-9001" });
  });
});

describe("Server-side Meta CAPI Compliance Helpers", () => {
  it("blocks restricted server paths and strips URL query parameters", () => {
    expect(isRestrictedMetaPath("/admin/dashboard")).toBe(true);
    expect(isRestrictedMetaPath("/payment-result")).toBe(false);
    expect(
      scrubMetaEventSourceUrl("https://aurarudraksha.bond/payment-result?guestToken=abc&txnid=123")
    ).toBe("https://aurarudraksha.bond/payment-result");
  });

  it("sanitizes custom data and SHA-256 hashes normalized user matching parameters", () => {
    const cleanData = sanitizeMetaCustomData({
      content_ids: ["5"],
      content_name: "5 Mukhi Blood Pressure Remedy",
      content_category: "Wellness & Medical",
      value: 1299,
      currency: "inr",
      guestToken: "should_not_pass",
      email: "leak@example.com"
    });
    expect(cleanData.guestToken).toBeUndefined();
    expect(cleanData.email).toBeUndefined();
    expect(cleanData.content_category).toBe("Sacred Spiritual Beads");
    expect(cleanData.currency).toBe("INR");
    expect(cleanData.content_name).not.toMatch(/blood\s*pressure|remedy/i);

    const hashed = buildCapiUserData({
      email: " TestUser@Example.COM ",
      phone: "+91 98765-43210",
      firstName: "Aarav",
      lastName: "Verma",
      pincode: "332001"
    });
    expect(hashed.em[0]).toMatch(/^[a-f0-9]{64}$/);
    expect(hashed.ph[0]).toMatch(/^[a-f0-9]{64}$/);
    expect(hashed.fn[0]).toMatch(/^[a-f0-9]{64}$/);
    expect(hashed.ln[0]).toMatch(/^[a-f0-9]{64}$/);
    expect(hashed.zp[0]).toMatch(/^[a-f0-9]{64}$/);
    expect(hashed.country[0]).toMatch(/^[a-f0-9]{64}$/);
  });
});
