import { afterEach, describe, expect, it, vi } from "vitest";
import { Product } from "../../models/Product.js";
import { Setting } from "../../models/Setting.js";
import { inMemoryStore } from "../../data/inMemoryStore.js";
import { connectDB, isDbConnected } from "../../config/db.js";
import { getPublicCatalog, getProducts, invalidateProductCache } from "../productController.js";

vi.mock("../../config/db.js", async importOriginal => ({
  ...await importOriginal(),
  connectDB: vi.fn(),
  isDbConnected: vi.fn()
}));

function response() {
  const res = { setHeader: vi.fn(), status: vi.fn(), json: vi.fn() };
  res.status.mockReturnValue(res);
  return res;
}

afterEach(() => {
  vi.restoreAllMocks();
  invalidateProductCache();
  inMemoryStore.products = [];
  inMemoryStore.isProductsSyncedFromDb = false;
});

describe("Public catalog CDN caching", () => {
  it("caches the public list and reuses the result on a warm server", async () => {
    isDbConnected.mockReturnValue(true);
    const product = { id: "1", slug: "5-mukhi-rudraksha", name: "5 Mukhi Rudraksha", status: "Published" };
    vi.spyOn(Setting, "findOne").mockReturnValue({ select: () => ({ lean: async () => null }) });
    const lookup = vi.spyOn(Product, "find").mockReturnValue({ lean: async () => [product] });

    const request = { query: {}, headers: {}, user: { authUserId: "ignored" } };
    for (let i = 0; i < 2; i++) {
      const res = response();
      await getPublicCatalog(request, res, vi.fn());
      expect(res.setHeader).toHaveBeenCalledWith("CDN-Cache-Control", "public, s-maxage=15, stale-while-revalidate=15");
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ count: 1 }));
    }
    expect(lookup).toHaveBeenCalledOnce();
    expect(lookup.mock.calls[0][0].$and).toBeDefined();
  });

  it("keeps forced refresh and the original product endpoint off the CDN cache", async () => {
    isDbConnected.mockReturnValue(true);
    vi.spyOn(Product, "find").mockReturnValue({ lean: async () => [] });
    vi.spyOn(Setting, "findOne").mockReturnValue({ select: () => ({ lean: async () => null }) });

    for (const [handler, query] of [[getPublicCatalog, { _t: "123" }], [getProducts, {}]]) {
      const res = response();
      await handler({ query, headers: {} }, res, vi.fn());
      expect(res.setHeader.mock.calls.map(([name]) => name)).not.toContain("CDN-Cache-Control");
    }
  });

  it("keeps the outage response off the CDN cache", async () => {
    isDbConnected.mockReturnValue(false);
    connectDB.mockResolvedValue(false);
    const res = response();
    await getPublicCatalog({ query: {}, headers: {} }, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.setHeader).toHaveBeenCalledWith("Cache-Control", expect.stringContaining("no-store"));
    expect(res.setHeader.mock.calls.map(([name]) => name)).not.toContain("CDN-Cache-Control");
  });
});
