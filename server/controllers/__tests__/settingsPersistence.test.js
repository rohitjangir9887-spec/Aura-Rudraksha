import { afterEach, describe, expect, it, vi } from "vitest";
import { getAdminSettings, getSettings, savePolicies, saveSettings, clearSettingsCache } from "../settingController.js";
import { Setting } from "../../models/Setting.js";
import { defaultSettings } from "../../data/defaultData.js";
import { logAuditEvent } from "../../services/auditService.js";

const isDbConnected = vi.hoisted(() => vi.fn());
vi.mock("../../config/db.js", async importOriginal => ({ ...await importOriginal(), isDbConnected }));
vi.mock("../../services/auditService.js", () => ({ logAuditEvent: vi.fn() }));

const stored = { id: "STORE_SETTINGS", storeName: "Current store", shippingPolicy: "Shipping terms", metaCapiAccessToken: "test-secret-value" };
function response() {
  const res = { setHeader: vi.fn(), status: vi.fn(), json: vi.fn() };
  res.status.mockReturnValue(res);
  return res;
}

afterEach(() => {
  clearSettingsCache();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("Store settings persistence", () => {
  it("returns an unavailable status for either write endpoint during a database outage", async () => {
    isDbConnected.mockReturnValue(false);
    const expectedName = defaultSettings.storeName;
    const update = vi.spyOn(Setting, "findOneAndUpdate");
    for (const save of [saveSettings, savePolicies]) {
      const res = response();
      const next = vi.fn();
      await save({ body: { storeName: "Unsaved store", shippingPolicy: "Unsaved policy" } }, res, next);
      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
      expect(next).not.toHaveBeenCalled();
    }
    expect(defaultSettings.storeName).toBe(expectedName);
    expect(update).not.toHaveBeenCalled();
  });

  it("returns the committed settings while keeping the raw token off both responses", async () => {
    isDbConnected.mockReturnValue(true);
    vi.spyOn(Setting, "findOne").mockReturnValue({ lean: async () => stored });
    const update = vi.spyOn(Setting, "findOneAndUpdate").mockResolvedValue({
      ...stored, storeName: "Saved store", shippingPolicy: "Updated shipping"
    });
    const res = response();
    const next = vi.fn();
    await saveSettings({ body: { storeName: "Saved store", shippingPolicy: "Updated shipping" } }, res, next);
    expect(update).toHaveBeenCalledWith(
      { id: "STORE_SETTINGS" },
      { $set: { storeName: "Saved store", shippingPolicy: "Updated shipping" } },
      expect.objectContaining({ runValidators: true })
    );
    expect(res.json.mock.calls[0][0].data).toMatchObject({ storeName: "Saved store", shippingPolicy: "Updated shipping", hasMetaCapiToken: true });
    expect(res.json.mock.calls[0][0].data).not.toHaveProperty("metaCapiAccessToken");
    expect(logAuditEvent).toHaveBeenCalledOnce();

    const publicRes = response();
    await getSettings({}, publicRes, next);
    expect(publicRes.json.mock.calls[0][0].data).not.toHaveProperty("metaCapiAccessToken");
    expect(publicRes.json.mock.calls[0][0].data).not.toHaveProperty("hasMetaCapiToken");

    const adminRes = response();
    await getAdminSettings({}, adminRes, next);
    expect(adminRes.json.mock.calls[0][0].data).toHaveProperty("hasMetaCapiToken", true);
    expect(adminRes.json.mock.calls[0][0].data).not.toHaveProperty("metaCapiAccessToken");
    expect(next).not.toHaveBeenCalled();
  });

  it("returns only policy fields from a policy-specific update", async () => {
    isDbConnected.mockReturnValue(true);
    vi.spyOn(Setting, "findOneAndUpdate").mockResolvedValue({ toObject: () => stored });
    const res = response();
    await savePolicies({ body: { shippingPolicy: "Shipping terms" } }, res, vi.fn());
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { shippingPolicy: "Shipping terms" } });
  });
});
