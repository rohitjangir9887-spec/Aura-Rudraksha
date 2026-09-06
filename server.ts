import path from "path";
import express from "express";
import { createServer as createViteServer } from "vite";
import { createApp } from "./server/app.js";
import { connectDB } from "./server/config/db.js";
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
      maxAge: '1h', // Cache static assets for 1 hour
      setHeaders: (res, path) => {
        if (path.endsWith('.html')) {
          // Do not cache HTML files to ensure always fresh
          res.setHeader('Cache-Control', 'no-cache');
        } else if (/\.(jpg|jpeg|png|gif|svg|webp|ico|css|js|woff2?)$/i.test(path)) {
          // Cache images and other static assets
          res.setHeader('Cache-Control', 'public, max-age=3600');
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
  connectDB().catch((err) => {
    console.warn("MongoDB initial connection attempt completed with notice:", err?.message || err);
  });
}

startServer();
