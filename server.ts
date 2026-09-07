import path from "path";
import express from "express";
import { createServer as createViteServer } from "vite";
import { createApp } from "./server/app.js";
import { connectDB } from "./server/config/db.js";
import { reconcileAllOrders } from "./server/services/orderReconciliationService.js";
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
    // SPA fallback for all non-API requests (handles GET, POST, HEAD, etc.)
    app.use((req, res, next) => {
      if (req.path.startsWith("/api")) {
        return res.status(404).json({ success: false, error: "Not Found", message: "API endpoint not found" });
      }
      res.sendFile(path.join(distPath, "index.html"));
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
