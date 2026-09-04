import express from "express";
import dotenv from "dotenv";
import { connectDB, isDbConnected, getLastDbSync, getMongoUri } from "./config/db.js";
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
import paymentRoute from "./routes/payment.js";
import uploadRoute from "./routes/upload.js";

import { errorHandler } from "./middleware/errorHandler.js";

dotenv.config();

// Rate limiters for production workloads
const publicLimit = rateLimit({ windowMs: 60_000, max: 180, message: "Too many requests from your network. Please try again shortly.", prefix: "pub" });
const strictLimit = rateLimit({ windowMs: 60_000, max: 30, message: "Too many attempts. Please wait a minute and try again.", prefix: "strict" });
const loginLimit = rateLimit({ windowMs: 60_000, max: 10, message: "Too many login attempts. Please try again later.", prefix: "login" });
const adminLoginLimit = rateLimit({ windowMs: 60_000, max: 5, message: "Too many admin login attempts. Access temporarily restricted.", prefix: "admin_login" });
const auraAiLimit = rateLimit({ windowMs: 60_000, max: 100, message: "Aura AI rate limit reached. Please wait a moment before sending another prompt.", prefix: "aura_ai" });
const searchLimit = rateLimit({ windowMs: 60_000, max: 60, message: "Too many search queries. Please slow down.", prefix: "search" });
const couponLimit = rateLimit({ windowMs: 60_000, max: 15, message: "Too many coupon validation requests. Please wait.", prefix: "coupon" });
const orderLimit = rateLimit({ windowMs: 60_000, max: 10, message: "Too many order creation attempts. Please verify your details.", prefix: "order" });
const paymentLimit = rateLimit({ windowMs: 60_000, max: 15, message: "Too many payment requests.", prefix: "payment" });
const reviewsLimit = rateLimit({ windowMs: 60_000, max: 10, message: "Review submission limit reached.", prefix: "reviews" });
const ticketsLimit = rateLimit({ windowMs: 60_000, max: 10, message: "Support ticket submission limit reached.", prefix: "tickets" });
const adminApiLimit = rateLimit({ windowMs: 60_000, max: 60, message: "Admin API rate limit reached.", prefix: "admin_api" });
const uploadLimit = rateLimit({ windowMs: 60_000, max: 60, message: "Media upload registration rate limit reached. Please wait a moment before uploading more images.", prefix: "upload_reg" });

// Allowed cross-origin frontends, per CORS_ORIGINS (comma-separated) in .env.
// Empty = same-origin only, which matches the default single-server deploy
// (Node serves dist/). Set CORS_ORIGINS for a split Pages+API deployment.
export function resolveAllowedOrigins() {
  const fromEnv = (process.env.CORS_ORIGINS || "")
    .split(",")
    .map(o => o.trim())
    .filter(Boolean);
  const isDev = process.env.NODE_ENV !== "production";
  const devOrigins = isDev ? ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173", "http://127.0.0.1:3000"] : [];
  return [...new Set([...fromEnv, ...devOrigins])];
}

export function createApp() {
  const app = express();

  // Bounded trust proxy for containerized environments (Cloud Run / reverse proxy)
  const proxyHops = parseInt(process.env.TRUST_PROXY_HOPS || "1", 10);
  app.set("trust proxy", isNaN(proxyHops) ? 1 : proxyHops);

  // CORS Middleware - strictly enforce allowed origins allowlist & handle preflights
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    const allowedOrigins = resolveAllowedOrigins();

    // Check same-origin via host header for same-domain API requests
    const reqHost = req.headers["x-forwarded-host"] || req.headers.host;
    const isSameOrigin = Boolean(
      origin && reqHost && (
        origin === `https://${reqHost}` ||
        origin === `http://${reqHost}`
      )
    );

    const isAllowed = Boolean(origin && (allowedOrigins.includes(origin) || isSameOrigin));

    if (origin && isAllowed) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization,X-Requested-With,Accept,X-Idempotency-Key,Idempotency-Key");
      res.setHeader("Access-Control-Max-Age", "86400");
    }

    if (req.method === "OPTIONS") {
      if (origin && !isAllowed) {
        return res.status(403).json({ success: false, message: "CORS origin not allowed" });
      }
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
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    // For API endpoints, enforce X-Frame-Options: DENY against framing attacks
    if (req.path && req.path.startsWith("/api")) {
      res.setHeader("X-Frame-Options", "DENY");
    } else {
      res.removeHeader("X-Frame-Options");
    }
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
    // Exclude /upload routes from publicLimit so general /api browsing/polling does not throttle media registration
    app.use("/api", (req, res, next) => {
      if (req.path && req.path.startsWith("/upload")) {
        return next();
      }
      return publicLimit(req, res, next);
    });
    app.use("/api/auth/login", loginLimit);
    app.use("/api/auth/admin-login", adminLoginLimit);
    app.use("/api/aura-ai", auraAiLimit);
    app.use("/api/products/search", searchLimit);
    app.use("/api/coupons/validate", couponLimit);
    app.use("/api/orders", (req, res, next) => (req.method === "POST" ? orderLimit(req, res, next) : next()));
    app.use("/api/orders/payment", paymentLimit);
    app.use("/api/reviews", reviewsLimit);
    app.use("/api/tickets", ticketsLimit);
    app.use("/api/addresses", strictLimit);
    app.use("/api/wishlist", strictLimit);
    app.use("/api/customers/me", strictLimit);
    app.use("/api/auth", strictLimit);
    app.use("/api/upload/register", uploadLimit);
    app.use("/api/upload/register-batch", uploadLimit);
    app.use("/api/analytics", adminApiLimit);
    app.use("/api/settings", adminApiLimit);
  }

  // Database Connection Middleware for Serverless & Long-running instances
  app.use("/api", async (req, res, next) => {
    if (getMongoUri()) {
      try {
        await connectDB();
      } catch (err) {
        console.warn("⚠️ [MongoDB] Request-time connection notice:", err?.message || err);
      }
    }
    next();
  });

  // Health check endpoint (accurate - never fakes "connected")
  app.get("/api/health", (req, res) => {
    const dbConnected = isDbConnected();
    const lastSync = getLastDbSync();
    if (dbConnected) {
      return res.json({
        status: "ok",
        database: "connected",
        store: "Aura Rudraksha API",
        lastSync: lastSync || new Date().toISOString(),
        timestamp: new Date().toISOString()
      });
    }
    return res.status(503).json({
      status: "degraded",
      database: "disconnected",
      message: "Database is unavailable. MongoDB connection required for persistent operations.",
      store: "Aura Rudraksha API",
      lastSync: lastSync,
      timestamp: new Date().toISOString()
    });
  });

  // Middleware ensuring DB connection attempt before database-dependent queries
  const requireDb = async (req, res, next) => {
    if (!isDbConnected()) {
      if (getMongoUri()) {
        try {
          await connectDB();
        } catch (err) {
          console.warn("⚠️ [DB Middleware] Pre-route connection attempt notice:", err?.message || err);
        }
      }
    }
    next();
  };

  // Strict no-cache headers for sensitive payment and order transactions
  const noCacheMiddleware = (req, res, next) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Surrogate-Control", "no-store");
    next();
  };

  // API Routes Mount
  app.use("/api/upload", requireDb, uploadRoute);
  app.use("/api/admin/storage", requireDb, uploadRoute);
  app.use("/api/cart", requireDb, cartRoute);
  app.use("/api/products", requireDb, productsRoute);
  app.use("/api/orders", requireDb, noCacheMiddleware, ordersRoute);
  app.use("/api/customers", requireDb, customersRoute);
  app.use("/api/coupons", requireDb, couponsRoute);
  app.use("/api/promotions", requireDb, promotionsRoute);
  app.use("/api/offers", requireDb, offersRoute);
  app.use("/api/active-offer", requireDb, activeOfferRoute);
  app.use("/api/banners", requireDb, bannersRoute);
  app.use("/api/reviews", requireDb, reviewsRoute);
  app.use("/api/settings", requireDb, settingsRoute);
  app.use("/api/tickets", requireDb, ticketsRoute);
  app.use("/api/analytics", requireDb, analyticsRoute);
  app.use("/api/seed", requireDb, seedRoute);
  app.use("/api/addresses", requireDb, addressesRoute);
  app.use("/api/wishlist", requireDb, wishlistRoute);
  app.use("/api/auth", requireDb, authRoute);
  app.use("/api/aura-ai", auraAiRoute);
  app.use("/api/payment", requireDb, noCacheMiddleware, paymentRoute);

  // Fallback for unhandled API routes: return JSON 404 (prevents returning SPA HTML for failed API calls)
  app.use("/api", (req, res) => {
    res.status(404).json({ success: false, error: "Not Found", message: "API endpoint not found" });
  });

  // Mongoose / Database error handler
  app.use((err, req, res, next) => {
    const isDbErr =
      err.name === 'MongooseError' ||
      err.name === 'MongoNetworkError' ||
      err.name === 'MongoServerSelectionError' ||
      err.name === 'MongoTopologyClosedError' ||
      err.name === 'MongoTimeoutError' ||
      (err.message && (
        err.message.includes('buffering timed out') ||
        err.message.includes('timed out') ||
        err.message.includes('ReplicaSetNoPrimary') ||
        err.message.includes('PoolClearedOnNetworkError') ||
        err.message.includes('Topology is closed') ||
        err.message.includes('Client must be connected')
      ));

    if (isDbErr) {
      console.warn('[AI Studio] Database offline/unavailable:', err.message);
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      if (req.method === 'GET') {
        const path = req.path || "";
        const isPlural = path.endsWith('s') || path.endsWith('s/');
        return res.json({
          success: true,
          data: isPlural ? [] : null,
          message: 'Database offline — returning graceful fallback'
        });
      }
      return res.status(503).json({
        success: false,
        error: 'Database unavailable',
        message: 'Database is temporarily unavailable. Please try again shortly.'
      });
    }
    next(err);
  });

  // Global Error Handler (friendly client messages, detailed server logs)
  app.use(errorHandler);

  return app;
}
