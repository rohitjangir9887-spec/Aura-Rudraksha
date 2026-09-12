import express from "express";
import fs from "fs";
import path from "path";
import { 
  generateSitemapXml, 
  generateMerchantFeedXml, 
  generateRobotsTxt 
} from "../services/seoService.js";
import { getIndexNowKey } from "../services/indexNowService.js";

const router = express.Router();

/**
 * Dynamic XML Sitemap
 * Route: GET /sitemap.xml
 */
router.get(["/sitemap.xml", "/api/sitemap.xml"], async (req, res) => {
  try {
    const xml = await generateSitemapXml(req);
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("X-Robots-Tag", "all");
    res.setHeader("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
    return res.status(200).send(xml);
  } catch (err) {
    console.error("[SEO] Error generating sitemap.xml:", err);
    
    // Fallback: Read static file
    const staticPaths = [
      path.join(process.cwd(), "public", "sitemap.xml"),
      path.join(process.cwd(), "dist", "sitemap.xml")
    ];
    for (const p of staticPaths) {
      if (fs.existsSync(p)) {
        try {
          const content = fs.readFileSync(p, "utf8");
          res.setHeader("Content-Type", "application/xml; charset=utf-8");
          res.setHeader("X-Robots-Tag", "all");
          res.setHeader("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
          return res.status(200).send(content);
        } catch (_) {}
      }
    }
    
    // Minimal valid XML fallback
    const now = new Date().toISOString();
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://www.aurarudraksha.bond/</loc><lastmod>${now}</lastmod><changefreq>daily</changefreq><priority>1.0</priority></url>
</urlset>`);
  }
});

/**
 * Dynamic Google Merchant Center RSS/XML Feed
 * Routes: GET /google-merchant-feed.xml, GET /merchant-feed.xml
 */
router.get(["/google-merchant-feed.xml", "/merchant-feed.xml", "/api/google-merchant-feed.xml", "/api/merchant-feed.xml"], async (req, res, next) => {
  try {
    const xml = await generateMerchantFeedXml(req);
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
    return res.send(xml);
  } catch (err) {
    console.error("[SEO] Error generating merchant feed:", err);
    next(err);
  }
});

/**
 * Dynamic Robots.txt
 * Route: GET /robots.txt
 */
router.get(["/robots.txt", "/api/robots.txt"], (req, res) => {
  const txt = generateRobotsTxt(req);
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=86400");
  return res.send(txt);
});

/**
 * IndexNow Verification Key Route
 * Route: GET /indexnow-key.txt or /:key.txt
 */
router.get(["/indexnow-key.txt", "/api/indexnow-key.txt", "/:key.txt", "/api/:key.txt"], (req, res, next) => {
  const currentKey = getIndexNowKey();
  const reqKey = req.params.key;

  // If a specific key was requested, verify match before returning
  if (reqKey && reqKey !== currentKey && reqKey !== "indexnow-key") {
    return next(); // Pass to next handler if not the IndexNow key
  }

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=86400");
  return res.send(currentKey);
});

/**
 * Trigger Instant Search Engine Ping & IndexNow Notification
 * Route: POST /api/seo/ping
 */
router.post(["/ping", "/api/seo/ping"], async (req, res) => {
  try {
    const { submitToIndexNow } = await import("../services/indexNowService.js");
    const { CATEGORIES_SEO_REGISTRY, getPublicProductsForSeo, getSiteBaseUrl } = await import("../services/seoService.js");
    
    const baseUrl = getSiteBaseUrl(req);
    const coreUrls = [
      `${baseUrl}/`,
      `${baseUrl}/shop`,
      `${baseUrl}/rudraksha-calculator`,
      `${baseUrl}/rudraksha-for-rashi`,
      `${baseUrl}/how-to-wear-rudraksha`,
      `${baseUrl}/rudraksha-benefits`,
      `${baseUrl}/rudraksha-authenticity`,
      `${baseUrl}/rudraksha-guide`,
      `${baseUrl}/about`,
      `${baseUrl}/contact`,
      `${baseUrl}/wholesale`,
      `${baseUrl}/policies`
    ];
    const catUrls = Object.keys(CATEGORIES_SEO_REGISTRY || {}).map(p => `${baseUrl}${p}`);
    const products = await getPublicProductsForSeo();
    const prodUrls = (products || []).map(p => `${baseUrl}/product/${p.slug || p.id}`);
    
    const allUrls = Array.from(new Set([...coreUrls, ...catUrls, ...prodUrls]));
    const result = await submitToIndexNow(allUrls, req);
    
    return res.json({
      success: true,
      message: "Dispatched search engine indexing notifications",
      urlCount: allUrls.length,
      indexNowResult: result
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;

