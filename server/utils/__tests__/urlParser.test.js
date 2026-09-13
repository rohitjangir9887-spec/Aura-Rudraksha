import { describe, it, expect, beforeEach } from "vitest";
import url from "url";
import { whatwgParseUrl, installUrlParsePatch } from "../urlParser.js";

describe("WHATWG URL Parser & Deprecation Patch", () => {
  beforeEach(() => {
    installUrlParsePatch();
  });

  it("parses relative API paths correctly", () => {
    const parsed = whatwgParseUrl("/api/products?search=rudraksha&page=2#top", true);
    expect(parsed.pathname).toBe("/api/products");
    expect(parsed.search).toBe("?search=rudraksha&page=2");
    expect(parsed.hash).toBe("#top");
    expect(parsed.query).toEqual({ search: "rudraksha", page: "2" });
    expect(parsed.path).toBe("/api/products?search=rudraksha&page=2");
  });

  it("parses absolute HTTP/HTTPS URLs with auth and port", () => {
    const parsed = whatwgParseUrl("https://admin:secret@aurarudraksha.bond:8080/checkout?step=payment#confirm", true);
    expect(parsed.protocol).toBe("https:");
    expect(parsed.hostname).toBe("aurarudraksha.bond");
    expect(parsed.port).toBe("8080");
    expect(parsed.host).toBe("aurarudraksha.bond:8080");
    expect(parsed.auth).toBe("admin:secret");
    expect(parsed.pathname).toBe("/checkout");
    expect(parsed.query).toEqual({ step: "payment" });
    expect(parsed.hash).toBe("#confirm");
  });

  it("handles null, undefined, and objects gracefully", () => {
    expect(whatwgParseUrl(null)).toBeNull();
    expect(whatwgParseUrl(undefined)).toBeUndefined();
    const obj = { href: "https://example.com", pathname: "/" };
    expect(whatwgParseUrl(obj)).toBe(obj);
  });

  it("overrides url.parse globally without throwing deprecation warnings", () => {
    let warningTriggered = false;
    const warningHandler = (w) => {
      if (w.name === "DeprecationWarning" && w.message.includes("url.parse")) {
        warningTriggered = true;
      }
    };
    process.on("warning", warningHandler);

    const res = url.parse("/api/orders?status=SUCCESS");
    expect(res.pathname).toBe("/api/orders");
    expect(warningTriggered).toBe(false);

    process.removeListener("warning", warningHandler);
  });
});
