import fs from "fs";
import path from "path";
import { connectDB, getMongoUri } from "../server/config/db.js";
import { generateSitemapXml } from "../server/services/seoService.js";

export default async function handler(req, res) {
  // Disallow non-GET/HEAD methods
  if (req.method && req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return res.status(405).send("Method Not Allowed");
  }

  // Attempt database connection with strict 2-second timeout to avoid serverless function stalling
  if (getMongoUri()) {
    try {
      await Promise.race([
        connectDB(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("DB timeout")), 2000))
      ]);
    } catch (err) {
      console.warn("⚠️ [Sitemap Function] Non-blocking DB connection notice:", err?.message || err);
    }
  }

  try {
    const xml = await generateSitemapXml(req);
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("X-Robots-Tag", "all");
    res.setHeader("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
    return res.status(200).send(xml);
  } catch (err) {
    console.error("⚠️ [Sitemap Function] Dynamic generation fallback triggered:", err);

    // Fallback 1: Read pre-generated static file
    const possiblePaths = [
      path.join(process.cwd(), "public", "sitemap.xml"),
      path.join(process.cwd(), "dist", "sitemap.xml"),
      path.join(process.cwd(), "sitemap.xml")
    ];

    for (const filePath of possiblePaths) {
      try {
        if (fs.existsSync(filePath)) {
          const fallbackXml = fs.readFileSync(filePath, "utf8");
          res.setHeader("Content-Type", "application/xml; charset=utf-8");
          res.setHeader("X-Robots-Tag", "all");
          res.setHeader("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
          return res.status(200).send(fallbackXml);
        }
      } catch (_) {}
    }

    // Fallback 2: Guaranteed valid baseline sitemap XML so search engines never encounter HTTP 500
    const now = new Date().toISOString();
    const fallbackBaseXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://aura-rudraksha.vercel.app/</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://aura-rudraksha.vercel.app/shop</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://aura-rudraksha.vercel.app/rudraksha-calculator</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://aura-rudraksha.vercel.app/rudraksha-guide</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.85</priority>
  </url>
  <url>
    <loc>https://aura-rudraksha.vercel.app/rudraksha/1-mukhi</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.85</priority>
  </url>
  <url>
    <loc>https://aura-rudraksha.vercel.app/rudraksha/5-mukhi</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.85</priority>
  </url>
</urlset>`;

    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("X-Robots-Tag", "all");
    res.setHeader("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
    return res.status(200).send(fallbackBaseXml);
  }
}
