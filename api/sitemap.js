import { connectDB, getMongoUri } from "../server/config/db.js";
import { generateSitemapXml } from "../server/services/seoService.js";

export default async function handler(req, res) {
  try {
    if (req.method && req.method !== "GET") {
      res.setHeader("Allow", "GET");
      return res.status(405).send("Method Not Allowed");
    }

    if (getMongoUri()) {
      try {
        await connectDB();
      } catch (err) {
        console.warn("⚠️ [Sitemap Function] MongoDB connection notice:", err?.message || err);
      }
    }

    const xml = await generateSitemapXml(req);
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
    return res.status(200).send(xml);
  } catch (err) {
    console.error("[Sitemap Function] Error generating sitemap.xml:", err);
    return res.status(500).send("Failed to generate sitemap");
  }
}
