import { connectDB, getMongoUri, isDbConnected } from "../server/config/db.js";
import { Product } from "../server/models/Product.js";
import { generateSitemapXml } from "../server/services/seoService.js";

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

async function getPublishedCatalog() {
  if (!isDbConnected() && getMongoUri()) {
    try { await connectDB(); } catch (err) {
      console.warn("⚠️ [Sitemap Function] MongoDB connection notice:", err?.message || err);
    }
  }
  if (!isDbConnected()) return null;

  const products = await Product.find(PUBLIC_PRODUCT_FILTER)
    .select({ _id: 0, id: 1, slug: 1, mukhi: 1, name: 1 })
    .lean();

  const slugs = new Set();
  const mukhiNumbers = new Set();
  for (const product of products) {
    const slug = String(product.slug || product.id || "").trim().toLowerCase();
    if (slug) slugs.add(slug);
    const text = `${product.mukhi || ""} ${product.name || ""}`;
    const match = text.match(/\b([1-9]|1[0-9]|20|21)\s*-?\s*mukhi\b/i);
    if (match) mukhiNumbers.add(Number(match[1]));
  }
  return { slugs, mukhiNumbers };
}

function filterSitemap(xml, catalog) {
  return xml.replace(/\s*<url>[\s\S]*?<\/url>/g, (block) => {
    const productMatch = block.match(/<loc>https:\/\/aurarudraksha\.bond\/product\/([^<]+)<\/loc>/i);
    if (productMatch) {
      const slug = decodeURIComponent(productMatch[1]).toLowerCase();
      return catalog.slugs.has(slug) ? block : "";
    }
    const mukhiMatch = block.match(/<loc>https:\/\/aurarudraksha\.bond\/rudraksha\/((?:[1-9]|1[0-9]|20|21))-mukhi<\/loc>/i);
    if (mukhiMatch) {
      return catalog.mukhiNumbers.has(Number(mukhiMatch[1])) ? block : "";
    }
    return block;
  });
}

export default async function handler(req, res) {
  try {
    if (req.method && req.method !== "GET" && req.method !== "HEAD") {
      res.setHeader("Allow", "GET, HEAD");
      return res.status(405).send("Method Not Allowed");
    }

    const catalog = await getPublishedCatalog();
    const baseXml = await generateSitemapXml(req);
    const xml = catalog ? filterSitemap(baseXml, catalog) : baseXml;

    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
    if (req.method === "HEAD") return res.status(200).end();
    return res.status(200).send(xml);
  } catch (err) {
    console.error("[Sitemap Function] Error generating sitemap.xml:", err);
    return res.status(500).send("Failed to generate sitemap");
  }
}
