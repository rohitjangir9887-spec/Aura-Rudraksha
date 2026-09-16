import "../server/utils/urlParser.js";
import { createApp } from "../server/app.js";
import { Review } from "../server/models/Review.js";
import { isAdminUser, hasAdminRole } from "../server/middleware/auth.js";

const app = createApp({ enableSsr: true });

const legacyProductRedirects = {
  "/product/1-mukhi-rudraksha": "/product/premium-1-mukhi-rudraksha-authentic-lab-certified-aura-rudraksha",
  "/product/2-mukhi-rudraksha": "/product/2-mukhi-rudraksha-authentic-lab-certified-bead-aura-rudraksha",
  "/product/3-mukhi-rudraksha": "/product/3-mukhi-rudraksha-nepali-original-3-mukhi-rudraksha",
  "/product/4-mukhi-rudraksha": "/product/4-mukhi-rudraksha-nepali-authentic-lab-certified-aura-rudraksha",
  "/product/5-mukhi-rudraksha": "/product/5-mukhi-rudraksha-nepali-original-lab-certified-buy-online",
  "/product/6-mukhi-rudraksha": "/product/buy-original-6-mukhi-rudraksha-nepali-online-lab-certified",
  "/product/7-mukhi-rudraksha": "/product/buy-original-7-mukhi-rudraksha-nepali-online-lab-certified",
  "/product/8-mukhi-rudraksha": "/product/buy-original-8-mukhi-rudraksha-nepali-online-lab-certified",
  "/product/9-mukhi-rudraksha": "/product/buy-original-9-mukhi-rudraksha-nepali-online-lab-certified",
  "/product/10-mukhi-rudraksha": "/product/buy-original-10-mukhi-rudraksha-nepali-online-lab-certified",
  "/product/11-mukhi-rudraksha": "/product/buy-original-11-mukhi-rudraksha-nepali-online-lab-certified",
  "/product/12-mukhi-rudraksha": "/product/buy-original-12-mukhi-rudraksha-nepali-online-lab-certified",
  "/product/13-mukhi-rudraksha": "/product/buy-original-13-mukhi-rudraksha-nepali-online-lab-certified",
  "/product/14-mukhi-rudraksha": "/product/buy-original-14-mukhi-rudraksha-nepali-online-lab-certified",
  "/product/buy-original-5-mukhi-rudraksha-nepali-online-lab-certified": "/product/5-mukhi-rudraksha-nepali-original-lab-certified-buy-online"
};

export default async function handler(req, res) {
  if (req.headers && req.headers["x-matched-path"]) {
    const matched = req.headers["x-matched-path"];
    if (matched && matched !== "/api/index" && matched !== "/api/index.js") {
      req.url = matched;
    }
  }

  const requestPath = String(req.url || "").split("?", 1)[0];
  const legacyTarget = legacyProductRedirects[requestPath];
  if (legacyTarget) {
    res.statusCode = 301;
    res.setHeader("Location", legacyTarget);
    return res.end();
  }

  const originalSend = res.send.bind(res);
  res.send = (body) => {
    const isReviewCreate = (requestPath === "/reviews" || requestPath === "/api/reviews") && String(req.method || "").toUpperCase() === "POST";

    if (isReviewCreate && typeof body === "string") {
      let parsed = null;
      try { parsed = JSON.parse(body); } catch (_) {}

      if (parsed?.success && parsed?.data?.id && parsed?.data?.status === "Pending" && req.user) {
        const publishAdminReview = async () => {
          try {
            const { isInitialAdmin } = isAdminUser(req.user);
            const isAdmin = isInitialAdmin || (await hasAdminRole(req.user.authUserId));
            if (!isAdmin) return;

            const updated = await Review.findOneAndUpdate(
              { id: String(parsed.data.id) },
              {
                $set: {
                  status: "Approved",
                  publishedAt: new Date(),
                  verified: req.body?.verified === true
                }
              },
              { returnDocument: "after" }
            ).lean();

            if (updated) {
              parsed.data = updated;
              parsed.message = "Admin review published successfully";
              body = JSON.stringify(parsed);
            }
          } catch (err) {
            console.warn("[Admin Review Publish] Failed to publish created review:", err?.message || err);
          }
        };

        return publishAdminReview().then(() => originalSend(body));
      }
    }

    if (typeof body === "string") {
      body = body.replace(/&lt;\/?[a-z][^&]*?&gt;/gi, "");
    }
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

  return app(req, res);
}
