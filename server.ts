import "./server/utils/urlParser.js";
import path from "path";
import fs from "fs";
import express from "express";
import { createServer as createViteServer } from "vite";
import { createApp } from "./server/app.js";
import { connectDB } from "./server/config/db.js";
import { reconcileAllOrders } from "./server/services/orderReconciliationService.js";
import { injectSeoIntoHtml } from "./server/services/seoService.js";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = createApp();
  const PORT = 3000;

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });

    // Intercept HTML navigation requests and crawlers (WhatsApp, Facebook, Googlebot)
    // so dynamic SEO, Schema.org JSON-LD, and OpenGraph preview tags are fully rendered
    app.use(async (req, res, next) => {
      if (req.method !== "GET" && req.method !== "HEAD") return next();
      if (
        req.path.startsWith("/api") ||
        req.path.startsWith("/@") ||
        req.path.startsWith("/src/") ||
        req.path.startsWith("/node_modules/")
      ) {
        return next();
      }
      if (/\.(js|jsx|ts|tsx|mjs|cjs|css|png|jpg|jpeg|gif|svg|webp|ico|woff2?|json|txt|xml|map)$/i.test(req.path)) {
        return next();
      }

      const acceptsHtml = req.headers.accept && req.headers.accept.includes("text/html");
      const userAgent = (req.headers["user-agent"] || "").toLowerCase();
      const isBot = /bot|crawl|spider|facebookexternalhit|whatsapp|telegram|twitter|slack|linkedin|bing|google/i.test(userAgent);

      if (acceptsHtml || isBot) {
        try {
          const rawTemplate = await fs.promises.readFile(path.join(process.cwd(), "index.html"), "utf-8");
          const transformedHtml = await vite.transformIndexHtml(req.originalUrl || req.url, rawTemplate);
          const finalHtml = await injectSeoIntoHtml(transformedHtml, req.path, req);
          res.setHeader("Content-Type", "text/html; charset=utf-8");
          res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
          return res.status(200).send(finalHtml);
        } catch (err) {
          console.warn("[Dev SEO Injection Notice]:", err?.message || err);
          return next();
        }
      }
      next();
    });

    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath, {
      maxAge: '7d', // Cache static assets for 7 days
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
          // Do not cache HTML files to ensure always fresh SPA entry
          res.setHeader('Cache-Control', 'no-cache');
        } else if (/\.(jpg|jpeg|png|gif|svg|webp|ico|avif)$/i.test(filePath)) {
          // High-performance image caching with stale-while-revalidate
          res.setHeader('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400');
        } else if (/\.(css|js|woff2?)$/i.test(filePath)) {
          // Bundled hashed assets can be cached aggressively
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      }
    }));
    // Unknown API routes return 404 JSON instead of SPA HTML
    app.use("/api", (req, res) => {
      res.status(404).json({ success: false, error: "Not Found", message: "API endpoint not found" });
    });
    // SPA fallback with server-side SEO & Schema injection for all public routes
    let cachedDistHtml = "";
    app.use(async (req, res, next) => {
      if (req.path.startsWith("/api")) {
        return res.status(404).json({ success: false, error: "Not Found", message: "API endpoint not found" });
      }
      try {
        if (!cachedDistHtml) {
          cachedDistHtml = await fs.promises.readFile(path.join(distPath, "index.html"), "utf-8");
        }
        const finalHtml = await injectSeoIntoHtml(cachedDistHtml, req.path, req);
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        return res.status(200).send(finalHtml);
      } catch (err) {
        console.warn("[Prod SEO HTML Fallback Notice]:", err);
        res.sendFile(path.join(distPath, "index.html"));
      }
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`✨ Aura Rudraksha Server running on http://localhost:${PORT}`);
  });

  // Attempt database connection in background
  connectDB()
    .then(() => reconcileAllOrders())
    .catch((err) => {
      console.warn("MongoDB initial connection attempt completed with notice:", err?.message || err);
      reconcileAllOrders();
    });
}

startServer();
