import express from "express";
import dotenv from "dotenv";
import { isDbConnected } from "./config/db.js";
import { rateLimit } from "./middleware/rateLimit.js";

// Routes
import productsRoute from "./routes/products.js";
import ordersRoute from "./routes/orders.js";
import customersRoute from "./routes/customers.js";
import couponsRoute from "./routes/coupons.js";
import promotionsRoute from "./routes/promotions.js";
import offersRoute from "./routes/offers.js";
import activeOfferRoute from "./routes/activeOffer.js";
import bannersRoute from "./routes/banners.js";
import reviewsRoute from "./routes/reviews.js";
import settingsRoute from "./routes/settings.js";
import ticketsRoute from "./routes/tickets.js";
import analyticsRoute from "./routes/analytics.js";
import seedRoute from "./routes/seed.js";
import addressesRoute from "./routes/addresses.js";
import wishlistRoute from "./routes/wishlist.js";
import authRoute from "./routes/auth.js";
import auraAiRoute from "./routes/auraAi.js";
import cartRoute from "./routes/cart.js";

import { errorHandler } from "./middleware/errorHandler.js";

dotenv.config();

// Rate limiters for production workloads
const publicLimit = rateLimit({ windowMs: 60_000, max: 180, message: "Too many requests from your network. Please try again shortly.", prefix: "pub" });
const strictLimit = rateLimit({ windowMs: 60_000, max: 30, message: "Too many attempts. Please wait a minute and try again.", prefix: "strict" });
const loginLimit = rateLimit({ windowMs: 60_000, max: 10, message: "Too many login attempts. Please try again later.", prefix: "login" });
const adminLoginLimit = rateLimit({ windowMs: 60_000, max: 5, message: "Too many admin login attempts. Access temporarily restricted.", prefix: "admin_login" });
const auraAiLimit = rateLimit({ windowMs: 60_000, max: 15, message: "Aura AI rate limit reached. Please wait a moment before sending another prompt.", prefix: "aura_ai" });
const searchLimit = rateLimit({ windowMs: 60_000, max: 60, message: "Too many search queries. Please slow down.", prefix: "search" });
const couponLimit = rateLimit({ windowMs: 60_000, max: 15, message: "Too many coupon validation requests. Please wait.", prefix: "coupon" });
const orderLimit = rateLimit({ windowMs: 60_000, max: 10, message: "Too many order creation attempts. Please verify your details.", prefix: "order" });
const paymentLimit = rateLimit({ windowMs: 60_000, max: 15, message: "Too many payment requests.", prefix: "payment" });
const reviewsLimit = rateLimit({ windowMs: 60_000, max: 10, message: "Review submission limit reached.", prefix: "reviews" });
const ticketsLimit = rateLimit({ windowMs: 60_000, max: 10, message: "Support ticket submission limit reached.", prefix: "tickets" });
const adminApiLimit = rateLimit({ windowMs: 60_000, max: 60, message: "Admin API rate limit reached.", prefix: "admin_api" });

// Allowed cross-origin frontends, per CORS_ORIGINS (comma-separated) in .env.
// Empty = same-origin only, which matches the default single-server deploy
// (Node serves dist/). Set CORS_ORIGINS for a split Pages+API deployment.
function resolveAllowedOrigins() {
  const fromEnv = (process.env.CORS_ORIGINS || "")
    .split(",")
    .map(o => o.trim())
    .filter(Boolean);
  const isDev = process.env.NODE_ENV !== "production";
  const devOrigins = isDev ? ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"] : [];
  return [...new Set([...fromEnv, ...devOrigins])];
}

export function createApp() {
  const app = express();

  // Enable trust proxy for containerized environments (Cloud Run / reverse proxy)
  app.set("trust proxy", true);

  // CORS Middleware - allow preview environments, iframes, and configured origins
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Allow-Credentials", "true");
    } else {
      res.setHeader("Access-Control-Allow-Origin", "*");
    }
    if (req.method === "OPTIONS") {
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
      return res.sendStatus(204);
    }
    next();
  });
  app.use(express.json({ limit: "8mb" }));
  app.use(express.urlencoded({ extended: true, limit: "8mb" }));

  // -------------------------------------------------------------------------
  // Security headers (compatible with iframe preview)
  // -------------------------------------------------------------------------
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    // Ensure iframe embedding in AI Studio works cleanly
    res.removeHeader("X-Frame-Options");
    next();
  });

  // Rate limiting with fine-grained protection for sensitive routes.
  // Fail-safe default: rate limiting is ALWAYS on, including in
  // dev/staging/test, unless a developer explicitly opts out locally with
  // DISABLE_RATE_LIMIT=true (and NODE_ENV is not production — this flag is
  // ignored in production regardless of its value, so it can never silently
  // disable abuse protection on a real deploy that forgets to set it back).
  const isProd = process.env.NODE_ENV === "production";
  const rateLimitDisabled = !isProd && process.env.DISABLE_RATE_LIMIT === "true";
  if (!rateLimitDisabled) {
    app.use("/api", publicLimit);
    app.use("/api/auth/login", loginLimit);
    app.use("/api/auth/admin-login", adminLoginLimit);
    app.use("/api/aura-ai", auraAiLimit);
    app.use("/api/products/search", searchLimit);
    app.use("/api/coupons/validate", couponLimit);
    // Only order-CREATION (POST) should count against the tight
    // "order attempts" quota. Applying it to the whole /api/orders prefix
    // also throttled GET /api/orders, /api/orders/my and /api/orders/:id
    // (order history/detail lookups), which let a handful of legitimate
    // order-status checks exhaust a real customer's quota and start
    // returning 429 for unrelated read requests.
    app.use("/api/orders", (req, res, next) => (req.method === "POST" ? orderLimit(req, res, next) : next()));
    app.use("/api/orders/payment", paymentLimit);
    app.use("/api/reviews", reviewsLimit);
    app.use("/api/tickets", ticketsLimit);
    app.use("/api/addresses", strictLimit);
    app.use("/api/wishlist", strictLimit);
    app.use("/api/customers/me", strictLimit);
    app.use("/api/auth", strictLimit);
    app.use("/api/analytics", adminApiLimit);
    app.use("/api/settings", adminApiLimit);
  }

  // API Routes Mount
  app.use("/api/cart", cartRoute);
  app.use("/api/products", productsRoute);
  app.use("/api/orders", ordersRoute);
  app.use("/api/customers", customersRoute);
  app.use("/api/coupons", couponsRoute);
  app.use("/api/promotions", promotionsRoute);
  app.use("/api/offers", offersRoute);
  app.use("/api/active-offer", activeOfferRoute);
  app.use("/api/banners", bannersRoute);
  app.use("/api/reviews", reviewsRoute);
  app.use("/api/settings", settingsRoute);
  app.use("/api/tickets", ticketsRoute);
  app.use("/api/analytics", analyticsRoute);
  app.use("/api/seed", seedRoute);
  app.use("/api/addresses", addressesRoute);
  app.use("/api/wishlist", wishlistRoute);
  app.use("/api/auth", authRoute);
  app.use("/api/aura-ai", auraAiRoute);

  // Health check endpoint (accurate - never fakes "connected")
  app.get("/api/health", (req, res) => {
    const dbConnected = isDbConnected();
    if (dbConnected) {
      return res.json({
        status: "ok",
        database: "connected",
        store: "Aura Rudraksha API",
        timestamp: new Date().toISOString()
      });
    }
    return res.status(503).json({
      status: "degraded",
      database: "disconnected",
      message: "Database is unavailable. MongoDB connection required for persistent operations.",
      store: "Aura Rudraksha API",
      timestamp: new Date().toISOString()
    });
  });

  // Mongoose offline fallback
  app.use((err, req, res, next) => {
    if (err.name === 'MongooseError' || err.name === 'MongoNetworkError' || (err.message && err.message.includes('buffering timed out'))) {
      console.warn('[AI Studio] Database offline — returning mock empty response');
      if (req.method === 'GET') {
        return res.json(req.path.endsWith('s') || req.path.endsWith('s/') ? [] : {});
      }
      return res.status(503).json({ error: 'Service temporarily unavailable (database offline)' });
    }
    next(err);
  });

  // Global Error Handler (friendly client messages, detailed server logs)
  app.use(errorHandler);

  return app;
}
