import fs from "fs/promises";
import path from "path";
import { connectDB, getMongoUri } from "../server/config/db.js";
import { injectSeoIntoHtml } from "../server/services/seoService.js";
import { Product } from "../server/models/Product.js";
import { inMemoryStore } from "../server/data/inMemoryStore.js";

let cachedTemplate = null;

async function loadTemplate() {
  if (cachedTemplate) return cachedTemplate;
  const templatePath = path.join(process.cwd(), "dist", "index.html");
  cachedTemplate = await fs.readFile(templatePath, "utf8");
  return cachedTemplate;
}

function isKnownRoute(pathname) {
  const exact = new Set([
    "/", "/shop", "/wishlist", "/cart", "/checkout", "/payment/result", "/payment-result",
    "/payment_result", "/payment-status", "/payment/status", "/payment-success", "/payment/success",
    "/payment-failed", "/payment/failed", "/payment-failure", "/payment/failure", "/order-success",
    "/order-confirmation", "/checkout/success", "/checkout/result", "/checkout/status", "/login",
    "/account", "/account/profile", "/account/orders", "/shipping-policy", "/return-policy",
    "/privacy-policy", "/terms", "/cancellation", "/secure-payment", "/about", "/track-order",
    "/categories", "/wholesale", "/contact", "/aura-ai", "/mobile-design", "/rudraksha",
    "/rudraksha-calculator", "/rudraksha-for-rashi", "/how-to-wear-rudraksha", "/rudraksha-benefits",
    "/rudraksha-authenticity", "/rudraksha-care"
  ]);
  if (exact.has(pathname)) return true;
  return pathname.startsWith("/product/") || pathname.startsWith("/rudraksha/") || pathname.startsWith("/account/orders/") || pathname.startsWith("/orders/") || pathname.startsWith("/order/") || pathname.startsWith("/admin");
}

function getOriginalPath(req) {
  const matched = req?.headers?.["x-matched-path"] || req?.headers?.["x-vercel-sc-url"];
  if (matched && matched.startsWith("/")) return matched.split("?")[0] || "/";
  const raw = req?.url || "/";
  try {
    return new URL(raw, "https://aura-rudraksha.vercel.app").pathname || "/";
  } catch (_) {
    return raw.split("?")[0] || "/";
  }
}

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return res.status(405).send("Method Not Allowed");
  }

  try {
    if (getMongoUri()) {
      await connectDB();
    }

    const pathname = getOriginalPath(req);
    const normalized = pathname.replace(/\/+$/, "") || "/";
    const isPrivate = normalized.startsWith("/admin") || normalized.startsWith("/account") || normalized === "/wishlist" || normalized.startsWith("/cart") || normalized.startsWith("/checkout") || normalized.startsWith("/payment") || normalized.startsWith("/login") || normalized === "/my-orders" || normalized.startsWith("/orders/") || normalized.startsWith("/order/") || normalized.startsWith("/aura-control-8740");
    const knownRoute = isKnownRoute(normalized);

    // Never SSR or index draft/inactive/archived products. Public product pages
    // must correspond to an actual currently published catalog record.
    let productUnavailable = false;
    if (normalized.startsWith("/product/") && !isPrivate) {
      const slugOrId = normalized.slice("/product/".length).split("/")[0];
      let product = null;
      if (getMongoUri()) {
        try {
          const isMongoId = /^[0-9a-fA-F]{24}$/.test(slugOrId);
          product = await Product.findOne({
            $and: [
              { $or: [{ id: slugOrId }, { slug: slugOrId }, ...(isMongoId ? [{ _id: slugOrId }] : [])] },
              { status: { $nin: ["Draft", "draft", "Inactive", "inactive", "Archived", "archived"] } }
            ]
          }).lean();
        } catch (_) {}
      } else {
        product = (inMemoryStore.products || []).find((p) => {
          const status = String(p.status || "Published").toLowerCase();
          return !["draft", "inactive", "archived"].includes(status) && (String(p.id) === slugOrId || String(p.slug) === slugOrId);
        });
      }
      productUnavailable = !product;
    }

    const template = await loadTemplate();
    const html = await injectSeoIntoHtml(template, productUnavailable ? "/account" : pathname, req);

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
    res.setHeader("X-Robots-Tag", isPrivate || productUnavailable || !knownRoute ? "noindex, nofollow" : "index, follow");
    return res.status(knownRoute && !productUnavailable ? 200 : 404).send(html);
  } catch (err) {
    console.error("[SEO HTML] Render failed:", err?.message || err);
    return res.status(503).send("Service temporarily unavailable");
  }
}
