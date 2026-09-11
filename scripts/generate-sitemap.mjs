/**
 * Sitemap Generator Script for Aura Rudraksha
 * 
 * Generates an optimized, Google-compliant XML Sitemap (`public/sitemap.xml` and `dist/sitemap.xml`)
 * with image metadata, priorities, and change frequencies for optimal search engine crawling and indexing.
 *
 * Usage:
 *   node scripts/generate-sitemap.mjs
 *   node scripts/generate-sitemap.mjs --base-url https://aura-rudraksha.vercel.app
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

// Parse CLI arguments
const args = process.argv.slice(2);
let customBaseUrl = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--base-url" && args[i + 1]) {
    customBaseUrl = args[i + 1];
  }
}

// 1. Determine base URL
const baseUrl = (
  customBaseUrl ||
  process.env.VITE_SITE_URL ||
  process.env.SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
  "https://aura-rudraksha.vercel.app"
).replace(/\/+$/, "");

console.log(`[Sitemap Generator] Base URL: ${baseUrl}`);

// XML Special Character Escaping
function escapeXml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

async function run() {
  const now = new Date().toISOString();
  
  // Load SEO Service
  const { generateSitemapXml, getPublicProductsForSeo, CATEGORIES_SEO_REGISTRY } = await import("../server/services/seoService.js");

  // Mock request object to pass baseUrl
  const mockReq = {
    headers: {
      host: baseUrl.replace(/^https?:\/\//, ""),
      "x-forwarded-proto": baseUrl.startsWith("https") ? "https" : "http"
    }
  };

  console.log("[Sitemap Generator] Fetching catalog and route data...");
  const sitemapContent = await generateSitemapXml(mockReq);
  const products = await getPublicProductsForSeo();

  // Targets
  const publicDir = path.join(rootDir, "public");
  const distDir = path.join(rootDir, "dist");
  const publicSitemapPath = path.join(publicDir, "sitemap.xml");

  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  // Write to public/sitemap.xml
  fs.writeFileSync(publicSitemapPath, sitemapContent, "utf8");
  console.log(`[Sitemap Generator] Saved to: ${publicSitemapPath} (${Buffer.byteLength(sitemapContent)} bytes)`);

  // If dist exists, also copy to dist/sitemap.xml
  if (fs.existsSync(distDir)) {
    const distSitemapPath = path.join(distDir, "sitemap.xml");
    fs.writeFileSync(distSitemapPath, sitemapContent, "utf8");
    console.log(`[Sitemap Generator] Synced to: ${distSitemapPath}`);
  }

  // Stats
  const categoryCount = Object.keys(CATEGORIES_SEO_REGISTRY || {}).length;
  const productCount = Array.isArray(products) ? products.length : 0;
  const totalUrls = 1 + categoryCount + productCount; // 1 for homepage

  console.log("\n==========================================");
  console.log("   AURA RUDRAKSHA SITEMAP GENERATED       ");
  console.log("==========================================");
  console.log(`- Homepage: 1 URL (Priority: 1.0)`);
  console.log(`- Core & Category Pages: ${categoryCount} URLs (Priority: 0.8 - 0.9)`);
  console.log(`- Product Pages with Images: ${productCount} URLs (Priority: 0.9)`);
  console.log(`- Total URLs Indexed: ${totalUrls}`);
  console.log(`- File Path: public/sitemap.xml`);
  console.log("==========================================\n");
}

run().catch((err) => {
  console.error("[Sitemap Generator Error]:", err);
  process.exit(1);
});
