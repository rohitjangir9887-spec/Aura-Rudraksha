import "../server/utils/urlParser.js";
import { createApp } from "../server/app.js";

const app = createApp({ enableSsr: true });

export default async function handler(req, res) {
  // If Vercel rewrote to /api/index.js or /index.js, restore the original matched route
  if (req.headers && req.headers["x-matched-path"]) {
    const matched = req.headers["x-matched-path"];
    if (matched && matched !== "/api/index" && matched !== "/api/index.js") {
      req.url = matched;
    }
  }

  // DB connection is handled by the application/API middleware and SEO service.
  // Avoid an extra connection wait on every serverless invocation.
  return app(req, res);
}
