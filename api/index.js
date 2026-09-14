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

  // Keep product return markup aligned with the published return policy.
  // Google recommends that return markup accurately describe the real policy.
  const originalSend = res.send.bind(res);
  res.send = (body) => {
    if (typeof body === "string" && body.includes("<html")) {
      body = body.replace(
        /,\n\s*\"hasMerchantReturnPolicy\":\s*\{[\s\S]*?\n\s*\},\n\s*\"shippingDetails\"/,
        ',\n    "shippingDetails"'
      );
      body = body.replace(
        /<strong>7-Day Sacred Return Policy:<\/strong>\s*100% money-back guarantee if unsatisfied with the sanctified bead\./g,
        "<strong>7-Day Return Policy:</strong> applies to eligible damaged or mismatched orders according to our published return policy."
      );
    }
    return originalSend(body);
  };

  // DB connection is handled by the application/API middleware and SEO service.
  // Avoid an extra connection wait on every serverless invocation.
  return app(req, res);
}
