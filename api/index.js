import mongoose from "mongoose";
import "../server/utils/urlParser.js";
import { createApp } from "../server/app.js";
import { isDbConnected } from "../server/config/db.js";
import { Product } from "../server/models/Product.js";

// Vercel requests must fail fast when Atlas is temporarily unavailable instead of
// waiting on Mongoose's command buffer and consuming the whole function timeout.
// The normal application DB middleware still owns connection establishment.
mongoose.set("bufferCommands", false);

const app = createApp({ enableSsr: true });

function getOriginalPath(req) {
  const matched = req.headers?.["x-matched-path"];
  const raw = matched && matched !== "/api/index" && matched !== "/api/index.js"
    ? matched
    : (req.url || "/");
  return String(raw).split("?")[0].split("#")[0];
}

async function hasPublishedMukhiProduct(mukhiNumber) {
  if (!isDbConnected()) return null;
  const n = String(mukhiNumber);
  const product = await Product.findOne({
    status: { $nin: ["Draft", "draft", "Inactive", "inactive", "Archived", "archived"] },
    $or: [
      { mukhi: `${n} Mukhi` },
      { name: { $regex: new RegExp(`\\b${n}\\s*-?\\s*mukhi\\b`, "i") } }
    ]
  }).select({ _id: 1 }).lean();
  return Boolean(product);
}

function sendUnavailableMukhi(res, mukhiNumber, path) {
  const canonical = `https://aurarudraksha.bond${path}`;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  return res.status(404).send(`<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="robots" content="noindex, nofollow"><link rel="canonical" href="${canonical}"><title>${mukhiNumber} Mukhi Rudraksha | Aura Rudraksha</title><meta name="description" content="This Mukhi product is not currently available in the live catalog."></head><body><main><h1>${mukhiNumber} Mukhi Rudraksha</h1><p>This product is not currently available in the live catalog.</p></main></body></html>`);
}

function sanitizeServerRenderedHtml(body) {
  if (typeof body !== "string") return body;

  // Product descriptions are stored as rich-text HTML. The crawlable SSR
  // fallback must expose readable text, not escaped markup such as
  // "&lt;h2&gt;About the Product&lt;/h2&gt;". Remove escaped HTML tags while
  // preserving normal HTML entities (for example &amp; and currency text).
  body = body.replace(/&lt;\/?[a-z][^&]*?&gt;/gi, "");

  if (!body.includes("application/ld+json")) return body;

  return body.replace(
    /(<script[^>]*type=["']application\/ld\+json["'][^>]*>)([\s\S]*?)(<\/script>)/gi,
    (full, open, json, close) => {
      try {
        const schema = JSON.parse(json);
        if (schema?.["@type"] === "Product" && schema.offers && typeof schema.offers === "object") {
          // The published return policy is limited to eligible damaged/mismatched
          // orders, so do not advertise a broader free-return policy in Product schema.
          delete schema.offers.hasMerchantReturnPolicy;
          return `${open}\n${JSON.stringify(schema, null, 2)}\n${close}`;
        }
      } catch (_) {
        // Preserve any non-JSON script verbatim rather than risking a page failure.
      }
      return full;
    }
  );
}

export default async function handler(req, res) {
  const originalPath = getOriginalPath(req);
  if (req.headers && req.headers["x-matched-path"]) {
    const matched = req.headers["x-matched-path"];
    if (matched && matched !== "/api/index" && matched !== "/api/index.js") {
      req.url = matched;
    }
  }

  // Do not eagerly connect here. createApp's API middleware and the SSR SEO
  // resolver establish the shared cached connection only when required.
  const originalSend = res.send.bind(res);
  res.send = (body) => originalSend(sanitizeServerRenderedHtml(body));

  const mukhiMatch = originalPath.match(/^\\/rudraksha\\/(1[0-9]|20|21|[1-9])-mukhi$/i);
  if (mukhiMatch && isDbConnected()) {
    try {
      const available = await hasPublishedMukhiProduct(mukhiMatch[1]);
      if (!available) return sendUnavailableMukhi(res, mukhiMatch[1], originalPath);
    } catch (err) {
      console.warn("⚠️ [SEO] Mukhi availability check skipped:", err?.message || err);
    }
  }

  return app(req, res);
}
