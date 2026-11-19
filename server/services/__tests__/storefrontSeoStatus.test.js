import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { generateRobotsTxt, renderSsrHtml } from "../seoService.js";

const template = '<html><head><title>Store</title></head><body><div id="root"></div></body></html>';
const request = { headers: {}, protocol: "https", get: () => "aurarudraksha.bond" };

describe("Storefront server response", () => {
  it.each(["/nonexistent-store-page", "/product/known-shape/other-segment"])("returns HTTP 404 and noindex for %s", async pathname => {
    const { status, html } = await renderSsrHtml(pathname, request, template);
    expect(status).toBe(404);
    expect(html).toContain('content="noindex, nofollow"');
  });

  it.each(["/shop", "/contact-us", "/about", "/rudraksha/7-mukhi"])("keeps %s available", async pathname => {
    const { status } = await renderSsrHtml(pathname, request, template);
    expect(status).toBe(200);
  });

  it("retains private order routes without making them indexable", async () => {
    const { status, html } = await renderSsrHtml("/my-orders", request, template);
    expect(status).toBe(200);
    expect(html).toContain('content="noindex, nofollow"');
  });

  it("serves the same crawl restrictions from the static and dynamic robots files", () => {
    const robots = generateRobotsTxt(request);
    const file = readFileSync(new URL("../../../public/robots.txt", import.meta.url), "utf8");
    const [directives] = robots.trim().split(/\n\n/);
    expect(robots).toBe(file);
    expect(directives).toContain("User-agent: *\nUser-agent: AdsBot-Google\nUser-agent: AdsBot-Google-Mobile");
    for (const prefix of ["/account", "/checkout", "/admin", "/api/"]) {
      expect(directives.split("\n")).toContain(`Disallow: ${prefix}`);
    }
  });
});
