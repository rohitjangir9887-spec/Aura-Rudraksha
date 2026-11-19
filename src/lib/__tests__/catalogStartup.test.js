// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

it("keeps a current catalog cache when the application starts", async () => {
  vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
  const { loadCacheFromLocalStorage } = await import("../db");
  loadCacheFromLocalStorage();
  const version = localStorage.getItem("aura_catalog_cache_version");
  expect(version).toBeTruthy();

  localStorage.setItem("aura_products_cache", "[]");
  await import("../../main.jsx");

  expect(localStorage.getItem("aura_catalog_cache_version")).toBe(version);
  expect(localStorage.getItem("aura_products_cache")).toBe("[]");
});
