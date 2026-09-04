import { createApp } from "../server/app.js";
import { connectDB, getMongoUri } from "../server/config/db.js";

const app = createApp();

export default async function handler(req, res) {
  // If Vercel rewrote to /api/index.js or /index.js, restore the original matched route
  if (req.headers && req.headers["x-matched-path"] && (req.url === "/api/index.js" || req.url === "/index.js" || req.url === "/" || !req.url)) {
    req.url = req.headers["x-matched-path"];
  }

  // Normalize URL if Vercel strips /api prefix during rewrites
  if (req.url && !req.url.startsWith("/api") && !req.url.startsWith("/public")) {
    req.url = `/api${req.url.startsWith("/") ? "" : "/"}${req.url}`;
  }

  // Ensure database is connected for this serverless invocation
  if (getMongoUri()) {
    try {
      await connectDB();
    } catch (err) {
      console.warn("⚠️ [Vercel Function] MongoDB connection notice:", err?.message || err);
    }
  }

  return app(req, res);
}
