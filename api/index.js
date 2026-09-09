import { createApp } from "../server/app.js";
import { connectDB, getMongoUri } from "../server/config/db.js";

const app = createApp({ enableSsr: true });

export default async function handler(req, res) {
  // If Vercel rewrote to /api/index.js or /index.js, restore the original matched route
  if (req.headers && req.headers["x-matched-path"]) {
    const matched = req.headers["x-matched-path"];
    if (matched && matched !== "/api/index" && matched !== "/api/index.js") {
      req.url = matched;
    }
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

