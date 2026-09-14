import express from "express";
import {
  generateSitemapXml,
  generateMerchantFeedXml,
  generateRobotsTxt
} from "../services/seoService.js";
import { getIndexNowKey } from "../services/indexNowService.js";
import { connectDB, isDbConnected } from "../config/db.js";
import { Product } from "../models/Product.js";

const router = express.Router();

const PUBLIC_PRODUCT_FILTER = {
  $and: [
    {
      $or: [
        { status: { $in: ["Published", "published", "Active", "active"] } },
        { status: { $exists: false } },
        { status: null },
        { status: "" }
      ]
    },
    { status: { $nin: ["Draft", "draft", "Inactive", "inactive", "Archived", "archived"] } }
  ]
};

async function ensureSeoDatabase() {
  if (isDbConnected()) return true;
  try {
    await connectDB();
  } catch (err) {
    console.warn("[SEO] Database connection unavailable:", err?.message || err);
  }
  return isDbConnected();
}

async function getPublishedProductSlugs() {
  if (!(await ensureSeoDatabase())) return null;
  const products = await Product.find(PUBLIC_PRODUCT_FILTER).select({ _id: 0, id: 1, slug: 1 }).lean();
  return new Set(products.map((p) => String(p.slug || p.id || "").trim().toLowerCase()).filter(Boolean));
}

function filterSitemapToLiveProducts(xml, publishedSlugs) {
  if (!publishedSlugs) return xml;
  return xml.replace(/\s*<url>[\s\S]*?<\/url>/g, (block) => {
    const match = block.match(/<loc>https:\/\/aurarudraksha\.bond\/product\/([^<]+)<\/loc>/i);
    if (!match) return block;
    return publishedSlugs.has(decodeURIComponent(match[1]).toLowerCase()) ? block : "";
  });
}

function stripUnsupportedMerchantAttributes(xml) {
  // Google Merchant Center data-source validation has flagged the old custom
  // country_of_origin field. The site still keeps origin in product content;
  // the feed should only emit attributes supported by its selected schema.
  return xml.replace(/\s*<g:country_of_origin>[\s\S]*?<\/g:country_of_origin>/gi, "");
}

/**
 * Dynamic XML Sitemap
 * Route: GET /sitemap.xml
 */
router.get(["/sitemap.xml", "/api/sitemap.xml"], async (req, res, next) => {
  try {
    const publishedSlugs = await getPublishedProductSlugs();
    if (!publishedSlugs) {
      return res.status(503).type("text/plain").send("Sitemap temporarily unavailable while the product database is unavailable.");
    }
    const xml = filterSitemapToLiveProducts(await generateSitemapXml(req), publishedSlugs);
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
router.get(["/google-merchant-feed.xml", "/merchant-feed.xml", "/api/google-merchant-feed.xml", "/api/merchant-feed.xml"], async (req, res, next) => {
  try {
    const publishedSlugs = await getPublishedProductSlugs();
    if (!publishedSlugs) {
      return res.status(503).type("text/plain").send("Merchant feed temporarily unavailable while the product database is unavailable.");
    }
    const xml = stripUnsupportedMerchantAttributes(await generateMerchantFeedXml(req));
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
    return next();
  }

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=86400");
  return res.send(currentKey);
});

export default router;
