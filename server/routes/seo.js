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

async function getPublishedCatalogKeys() {
  if (!(await ensureSeoDatabase())) return null;
  const products = await Product.find(PUBLIC_PRODUCT_FILTER)
    .select({ _id: 0, id: 1, slug: 1, mukhi: 1, name: 1 })
    .lean();

  const slugs = new Set();
  const mukhiNumbers = new Set();
  for (const product of products) {
    const key = String(product.slug || product.id || "").trim().toLowerCase();
    if (key) slugs.add(key);

    const mukhiText = `${product.mukhi || ""} ${product.name || ""}`;
    const match = mukhiText.match(/\b([1-9]|1[0-9]|20|21)\s*-?\s*mukhi\b/i);
    if (match) mukhiNumbers.add(Number(match[1]));
  }
  return { slugs, mukhiNumbers };
}

function filterSitemapToLiveProducts(xml, catalog) {
  if (!catalog) return xml;
  return xml.replace(/\s*<url>[\s\S]*?<\/url>/g, (block) => {
    const productMatch = block.match(/<loc>https:\/\/aurarudraksha\.bond\/product\/([^<]+)<\/loc>/i);
    if (productMatch) {
      return catalog.slugs.has(decodeURIComponent(productMatch[1]).toLowerCase()) ? block : "";
    }

    const mukhiMatch = block.match(/<loc>https:\/\/aurarudraksha\.bond\/rudraksha\/((?:[1-9]|1[0-9]|20|21))-mukhi<\/loc>/i);
    if (mukhiMatch) {
      return catalog.mukhiNumbers.has(Number(mukhiMatch[1])) ? block : "";
    }

    return block;
  });
}

function stripUnsupportedMerchantAttributes(xml) {
  // Google Merchant Center has flagged the previous custom country_of_origin
  // feed field. Origin remains available in product content, while the feed
  // emits only the attributes supported by its selected source format.
  return xml.replace(/\s*<g:country_of_origin>[\s\S]*?<\/g:country_of_origin>/gi, "");
}

router.get(["/sitemap.xml", "/api/sitemap.xml"], async (req, res, next) => {
  try {
    const catalog = await getPublishedCatalogKeys();
    if (!catalog) {
      return res.status(503).type("text/plain").send("Sitemap temporarily unavailable while the product database is unavailable.");
    }
    const xml = filterSitemapToLiveProducts(await generateSitemapXml(req), catalog);
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
    return res.send(xml);
  } catch (err) {
    console.error("[SEO] Error generating sitemap.xml:", err);
    next(err);
  }
});

router.get(["/google-merchant-feed.xml", "/merchant-feed.xml", "/api/google-merchant-feed.xml", "/api/merchant-feed.xml"], async (req, res, next) => {
  try {
    const catalog = await getPublishedCatalogKeys();
    if (!catalog) {
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

router.get(["/robots.txt", "/api/robots.txt"], (req, res) => {
  const txt = generateRobotsTxt(req);
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=86400");
  return res.send(txt);
});

router.get(["/indexnow-key.txt", "/api/indexnow-key.txt", "/:key.txt", "/api/:key.txt"], (req, res, next) => {
  const currentKey = getIndexNowKey();
  const reqKey = req.params.key;
  if (reqKey && reqKey !== currentKey && reqKey !== "indexnow-key") {
    return next();
  }
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=86400");
  return res.send(currentKey);
});

export default router;
