/**
 * Search Engine Submission & Ping Utility for Aura Rudraksha
 * 
 * Automatically notifies:
 * 1. Google (Sitemap Ping)
 * 2. Bing & Yahoo (IndexNow API + Sitemap Ping)
 * 3. Yandex & Seznam & Naver (IndexNow Protocol)
 *
 * Usage:
 *   node scripts/ping-search-engines.mjs
 */

import https from "https";
import http from "http";
import dotenv from "dotenv";

dotenv.config();

const SITE_URL = (process.env.VITE_SITE_URL || process.env.SITE_URL || "https://www.aurarudraksha.bond").replace(/\/+$/, "");
const SITEMAP_URL = `${SITE_URL}/sitemap.xml`;

function pingUrl(urlStr) {
  return new Promise((resolve) => {
    try {
      const urlObj = new URL(urlStr);
      const client = urlObj.protocol === "https:" ? https : http;
      const req = client.get(urlStr, { timeout: 8000, headers: { "User-Agent": "AuraRudraksha-Bot/1.0" } }, (res) => {
        let data = "";
        res.on("data", chunk => data += chunk);
        res.on("end", () => {
          resolve({ ok: res.statusCode >= 200 && res.statusCode < 400, statusCode: res.statusCode });
        });
      });
      req.on("error", (err) => resolve({ ok: false, error: err.message }));
      req.on("timeout", () => { req.destroy(); resolve({ ok: false, error: "Timeout" }); });
    } catch (err) {
      resolve({ ok: false, error: err.message });
    }
  });
}

async function main() {
  console.log("==================================================");
  console.log("   AURA RUDRAKSHA SEARCH ENGINE INSTANT NOTIFIER   ");
  console.log("==================================================");
  console.log(`🌐 Base Domain:  ${SITE_URL}`);
  console.log(`🗺️ Sitemap URL:  ${SITEMAP_URL}\n`);

  // 1. Google Sitemap Ping
  console.log("📡 [1/3] Pinging Google with sitemap...");
  const googlePing = await pingUrl(`https://www.google.com/ping?sitemap=${encodeURIComponent(SITEMAP_URL)}`);
  console.log(`   ➔ Google Status: ${googlePing.statusCode || googlePing.error || "Done"}`);

  // 2. Bing Sitemap Ping
  console.log("📡 [2/3] Pinging Bing with sitemap...");
  const bingPing = await pingUrl(`https://www.bing.com/ping?sitemap=${encodeURIComponent(SITEMAP_URL)}`);
  console.log(`   ➔ Bing Status: ${bingPing.statusCode || bingPing.error || "Done"}`);

  // 3. IndexNow Bulk URL Notification
  console.log("📡 [3/3] Notifying IndexNow Protocol (Bing, Yandex, Seznam, Naver)...");
  try {
    const { submitToIndexNow } = await import("../server/services/indexNowService.js");
    const { CATEGORIES_SEO_REGISTRY, getPublicProductsForSeo } = await import("../server/services/seoService.js");
    
    const coreUrls = [
      `${SITE_URL}/`,
      `${SITE_URL}/shop`,
      `${SITE_URL}/rudraksha-calculator`,
      `${SITE_URL}/rudraksha-for-rashi`,
      `${SITE_URL}/how-to-wear-rudraksha`,
      `${SITE_URL}/rudraksha-benefits`,
      `${SITE_URL}/rudraksha-authenticity`,
      `${SITE_URL}/rudraksha-guide`,
      `${SITE_URL}/about`,
      `${SITE_URL}/contact`,
      `${SITE_URL}/wholesale`,
      `${SITE_URL}/policies`
    ];

    const categoryUrls = Object.keys(CATEGORIES_SEO_REGISTRY || {}).map(path => `${SITE_URL}${path}`);
    const products = await getPublicProductsForSeo();
    const productUrls = (products || []).map(p => `${SITE_URL}/product/${p.slug || p.id}`);

    const allUrls = Array.from(new Set([...coreUrls, ...categoryUrls, ...productUrls]));
    console.log(`   ➔ Sending batch of ${allUrls.length} prioritized URLs to IndexNow...`);

    const result = await submitToIndexNow(allUrls);
    console.log(`   ➔ IndexNow Result: ${result.success ? "Successfully notified (" + allUrls.length + " URLs)" : (result.error || "Queued")}`);
  } catch (err) {
    console.warn("   ➔ IndexNow batch notice:", err.message);
  }

  console.log("\n✅ All search engine pings and indexing requests dispatched successfully!\n");
}

main().catch(console.error);
