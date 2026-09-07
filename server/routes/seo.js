import express from "express";
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
router.get("/sitemap.xml", async (req, res, next) => {
  try {
    const xml = await generateSitemapXml(req);
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
    return res.send(xml);
  } catch (err) {
    console.error("[SEO] Error generating sitemap.xml:", err);
    next(err);
  }
});

/**
 * Dynamic Google Merchant Center RSS/XML Feed
 * Routes: GET /google-merchant-feed.xml, GET /merchant-feed.xml
 */
router.get(["/google-merchant-feed.xml", "/merchant-feed.xml"], async (req, res, next) => {
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
router.get("/robots.txt", (req, res) => {
  const txt = generateRobotsTxt(req);
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=86400");
  return res.send(txt);
});

/**
 * IndexNow Verification Key Route
 * Route: GET /indexnow-key.txt or /:key.txt
 */
router.get(["/indexnow-key.txt", "/:key.txt"], (req, res, next) => {
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

export default router;
