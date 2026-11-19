import { afterEach, describe, expect, it, vi } from "vitest";
import { Order } from "../../models/Order.js";
import { isDbConnected } from "../../config/db.js";
import { trackOrderPublic } from "../orderController.js";

vi.mock("../../config/db.js", async importOriginal => ({
  ...await importOriginal(),
  isDbConnected: vi.fn()
}));

function response() {
  const res = { status: vi.fn(), json: vi.fn() };
  res.status.mockReturnValue(res);
  return res;
}

afterEach(() => vi.restoreAllMocks());

describe("Public order tracking", () => {
  it("looks up a formatted phone entered in the single tracking field", async () => {
    isDbConnected.mockReturnValue(true);
    const lookup = vi.spyOn(Order, "findOne").mockReturnValue({
      sort: () => ({ lean: async () => null })
    });
    const res = response();
    const next = vi.fn();

    await trackOrderPublic({ query: {}, body: { orderId: "+91 98765 43210" } }, res, next);

    expect(lookup).toHaveBeenCalledWith({
      $or: expect.arrayContaining([{ customerPhone: "9876543210" }, { "shippingAddress.phone": "+919876543210" }])
    });
    expect(res.status).toHaveBeenCalledWith(404);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 503 when the database is down", async () => {
    isDbConnected.mockReturnValue(false);
    const lookup = vi.spyOn(Order, "findOne");
    const res = response();
    const next = vi.fn();

    await trackOrderPublic({ query: { query: "AUR-1001" } }, res, next);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ databaseUnavailable: true }));
    expect(lookup).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it("does not query the database for an incomplete phone-only request", async () => {
    isDbConnected.mockReturnValue(true);
    const lookup = vi.spyOn(Order, "findOne");
    const res = response();

    await trackOrderPublic({ query: { phone: "1234567" } }, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(lookup).not.toHaveBeenCalled();
  });
});
