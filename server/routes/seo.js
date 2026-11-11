import express from "express";
import {
  generateSitemapXml,
  generateMerchantFeedXml,
  generateRobotsTxt,
  getPublicProductsForSeo
} from "../services/seoService.js";
import { getIndexNowKey, submitToIndexNow } from "../services/indexNowService.js";
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
  const products = await getPublicProductsForSeo();
  const slugs = new Set();
  const mukhiNumbers = new Set();

  if (Array.isArray(products)) {
    for (const product of products) {
      if (!product) continue;
      const slugKey = String(product.slug || "").trim().toLowerCase();
      const idKey = String(product.id || "").trim().toLowerCase();
      if (slugKey) slugs.add(slugKey);
      if (idKey) slugs.add(idKey);

      const mukhiText = `${product.mukhi || ""} ${product.name || ""}`;
      const match = mukhiText.match(/\b([1-9]|1[0-9]|20|21)\s*-?\s*mukhi\b/i);
      if (match) mukhiNumbers.add(Number(match[1]));
    }
  }

  // Always allow Mukhi 1 to 21 landing routes in sitemap
  for (let i = 1; i <= 21; i++) {
    mukhiNumbers.add(i);
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
  // Google Merchant Center & Meta Commerce Manager feed compatibility
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

router.get([
  "/google-merchant-feed.xml",
  "/merchant-feed.xml",
  "/facebook-catalog-feed.xml",
  "/meta-catalog-feed.xml",
  "/api/google-merchant-feed.xml",
  "/api/merchant-feed.xml",
  "/api/facebook-catalog-feed.xml",
  "/api/meta-catalog-feed.xml"
], async (req, res, next) => {
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

router.get("/api/seo/status", async (req, res) => {
  try {
    const products = await getPublicProductsForSeo();
    return res.json({
      success: true,
      indexedProducts: Array.isArray(products) ? products.length : 0,
      sitemapUrl: "https://aurarudraksha.bond/sitemap.xml",
      robotsUrl: "https://aurarudraksha.bond/robots.txt",
      googleMerchantFeedUrl: "https://aurarudraksha.bond/google-merchant-feed.xml",
      metaCatalogFeedUrl: "https://aurarudraksha.bond/facebook-catalog-feed.xml",
      indexNowKey: getIndexNowKey(),
      searchEnginesReady: ["Google", "Brave Search", "Bing", "DuckDuckGo", "Yahoo", "Yandex"],
      adsPlatformsReady: ["Instagram Ads", "Facebook Ads", "Meta Advantage+ Catalog", "Google Shopping"]
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message || "SEO status check failed" });
  }
});

router.post("/api/seo/ping", async (req, res) => {
  try {
    const products = await getPublicProductsForSeo();
    const baseUrl = "https://aurarudraksha.bond";
    const urls = [
      `${baseUrl}/`,
      `${baseUrl}/shop`,
      `${baseUrl}/rudraksha`,
      `${baseUrl}/categories`,
      `${baseUrl}/verify-certificate`,
      `${baseUrl}/rudraksha-recommendation`,
      `${baseUrl}/about`,
      `${baseUrl}/contact`
    ];
    for (let m = 1; m <= 21; m++) {
      urls.push(`${baseUrl}/rudraksha/${m}-mukhi`);
    }
    if (Array.isArray(products)) {
      for (const p of products) {
        const slugOrId = p?.slug || p?.id || p?._id;
        if (slugOrId) urls.push(`${baseUrl}/product/${slugOrId}`);
      }
    }
    submitToIndexNow(urls, req).catch(() => {});
    return res.json({
      success: true,
      urlCount: urls.length,
      message: "Submitted live URLs to IndexNow (Bing, Yandex, Brave/Seznam ecosystem) and refreshed sitemap."
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message || "SEO ping failed" });
  }
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
