import { beforeEach, describe, expect, it, vi } from "vitest";
import { saveSettings, savePolicies } from "../settingController.js";
import { connectDB, isDbConnected } from "../../config/db.js";
import { Setting } from "../../models/Setting.js";
import { defaultSettings } from "../../data/defaultData.js";

vi.mock("../../config/db.js", async importOriginal => ({
  ...(await importOriginal()),
  connectDB: vi.fn(),
  isDbConnected: vi.fn()
}));

describe("store settings persistence", () => {
  let res;
  beforeEach(() => {
    vi.restoreAllMocks();
    res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
  });

  it.each([saveSettings, savePolicies])("rejects an offline write and preserves the public fallback", async save => {
    isDbConnected.mockReturnValue(false);
    connectDB.mockResolvedValue(false);
    const original = defaultSettings.shippingPolicy;
    const next = vi.fn();
    await save({ body: { shippingPolicy: "unpublished" } }, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(503);
    expect(defaultSettings.shippingPolicy).toBe(original);
  });

  it("returns only policy fields after a successful policy write", async () => {
    isDbConnected.mockReturnValue(true);
    vi.spyOn(Setting, "findOneAndUpdate").mockResolvedValue({
      toObject: () => ({ shippingPolicy: "published", imagekitPrivateKey: "fixture" })
    });
    await savePolicies({ body: { shippingPolicy: "published" } }, res, vi.fn());
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { shippingPolicy: "published" } });
  });
});
