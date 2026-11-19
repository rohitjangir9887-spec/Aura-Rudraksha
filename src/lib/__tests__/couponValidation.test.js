import { afterEach, describe, expect, it, vi } from "vitest";
import { db } from "../db.js";

afterEach(() => vi.unstubAllGlobals());

describe.each([
  ["cart", code => db.validateCartCoupon(code, [])],
  ["quick checkout", code => db.validateCoupon(code, 500)]
])("%s coupon validation", (_name, validate) => {
  it.each([400, 503])("never approves a cached coupon when the server returns %i", async status => {
    const coupons = db.getCoupons();
    const cached = { code: "CACHED-TEST", status: "Active", discount: 10 };
    coupons.push(cached);
    try {
      vi.stubGlobal("fetch", vi.fn(async () => Response.json({
        success: false, valid: false, message: "Coupon could not be applied"
      }, { status })));
      const result = await validate(cached.code);
      expect(result.valid).toBe(false);
      expect(result.message).toBe("Coupon could not be applied");
    } finally {
      coupons.splice(coupons.indexOf(cached), 1);
    }
  });

  it("preserves the server's coupon and quoted totals", async () => {
    const quote = { success: true, valid: true, status: "APPLIED", totals: { subtotal: 500, couponDiscount: 50 } };
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(quote)));
    expect(await validate("CACHED-TEST")).toEqual(quote);
  });
});
