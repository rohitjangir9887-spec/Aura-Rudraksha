# Cloudflare Deployment Guide

Aura Rudraksha is a **React/Vite SPA** + **Express/Node API** + **MongoDB**
application. It is **not** a Workers-only app and cannot be deployed as a
single Cloudflare Worker because it uses Node APIs (Mongoose, Firebase Admin,
server-side NVIDIA API key).

There are two supported deployment shapes.

---

## Option A — Single Node host (simplest, fully validated)

Express serves the built SPA from `dist/` AND the `/api/*` routes from the
same origin. Works on any Node 20+ host (Cloudflare Containers, Fly.io,
Railway, Render, VPS, etc.).

1. `npm ci && npm run build` → produces `dist/` (SPA + `server.cjs`).
2. `NODE_ENV=production node dist/server.cjs` (or `npm start`).
3. Set env vars listed below under "Environment variables".
4. No CORS config needed (same-origin). TLS is terminated at the edge/proxy.

This is the deployment shape the production server was QA'd against.

---

## Option B — Split: Cloudflare Pages (frontend) + external Node API

### Frontend — Cloudflare Pages

- **Build command:** `npm run build`
- **Build output directory:** `dist`
- **Build env var (required for split deploy):**
  - `VITE_API_BASE_URL=https://api.yourdomain.com/api`
    (no trailing slash — tells the browser to hit the API on a different origin)
- If `VITE_API_BASE_URL` is NOT set, the browser defaults to same-origin `/api`
  which only works in Option A.
- Pages will automatically pick up `public/_redirects` (SPA `/* → /index.html 200`)
  and `public/_headers` (security headers). No `_worker.js` is needed.

### Backend — Node/Express API

Deploy `dist/server.cjs` on any Node 20+ host:
- Cloudflare Containers (recommended if staying on Cloudflare)
- Fly.io, Railway, Render, Northflank
- Any VPS with PM2/systemd behind Nginx/Caddy

Set the environment variables listed below. In particular set:
- `CORS_ORIGINS=https://<your-pages-subdomain>.pages.dev,https://yourdomain.com`
  so the Pages frontend is allowed to call the API cross-origin.
- Ensure HTTPS terminates in front of Node (Caddy/Nginx/edge).

### MongoDB
Any reachable MongoDB 6+ instance works. MongoDB Atlas is the easiest
(network-access allowlist must include the Node host's egress).

### NVIDIA API
The NVIDIA API key is only read by the Node backend (`NVIDIA_API_KEY` env
var). The frontend never sees it.

### Firebase
- Web SDK config (public) lives in `firebase-applet-config.json` and ships to
  the browser.
- Server-side token verification requires either
  `FIREBASE_SERVICE_ACCOUNT_KEYFILE` (path to JSON) or
  `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY` + `FIREBASE_PROJECT_ID`.
  None of these are in the frontend bundle.

---

## Environment variables (backend)

| Variable | Required | Purpose |
|---|---|---|
| `NODE_ENV` | yes | Set to `production` (enables HSTS + disables demo-data fallback). |
| `PORT` | no | Default 3000. |
| `MONGODB_URI` | yes | MongoDB connection string. |
| `NVIDIA_API_KEY` | yes (for Aura AI) | NVIDIA NIM API key, server-side only. |
| `INITIAL_ADMIN_EMAIL` | yes | First admin bootstrap email. |
| `INITIAL_ADMIN_PHONE` | yes | First admin bootstrap phone. |
| `FIREBASE_SERVICE_ACCOUNT_KEYFILE` | one of | Path to Firebase service-account JSON. |
| `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` / `FIREBASE_PROJECT_ID` | one of | Alternative to keyfile. |
| `CORS_ORIGINS` | split deploy | Comma-separated frontend origins. Leave empty for same-origin. |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | payment | If/when Razorpay is enabled. |
| `WHATSAPP_NUMBER` | no | Used by the WhatsApp CTA/checkout option. |

## Environment variables (frontend build-time only)

| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` | Full origin+path of the API, e.g. `https://api.aurarudraksha.com/api`. Leave unset for single-host Option A. |

---

## What is already in place
- HTTPS/HSTS (production), `X-Content-Type-Options: nosniff`,
  `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`,
  `Permissions-Policy: geolocation=(), microphone=(), camera()` on every
  response (applied by Express AND by `public/_headers` in Pages).
- SPA fallback:
  - Option A: `server.ts` registers `app.get("*all", …) → dist/index.html`.
  - Option B: `public/_redirects` `/* /index.html 200`.
- `wrangler.jsonc` is Pages-only (`pages_build_output_dir: "dist"`) — it does
  not declare a Worker entry or `nodejs_compat`.
- Rate limiting (in-memory) on public (60/min) + sensitive routes (12/min).
- Accurate `/api/health` (`ok` when connected, `503 degraded` otherwise).
- Secrets are server-side only. The browser bundle does NOT contain
  `MONGODB_URI`, `NVIDIA_API_KEY`, Firebase private key, or payment secrets.

## Notes
- In-memory rate limiter is per-instance. For multi-instance deployments swap
  `server/middleware/rateLimit.js` to a shared store (Redis).
- No cookies: Firebase ID tokens are sent as `Authorization: Bearer …` so
  cross-origin just needs CORS (no `credentials: include`).
- After first launch, call `POST /api/seed` once as the bootstrap admin to
  load the default catalog/coupons/settings. It never auto-runs.
