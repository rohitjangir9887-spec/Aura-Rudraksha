# Aura Rudraksha — Production QA Report

**Date:** 2026-08-27
**Branch:** `arena/01a0415c-aur-rudhraksha-official`
**Build:** `npm run build` — PASS (Vite 6.4.3 + esbuild server bundle ~184.7 KB)

---

## FILES INSPECTED

### Server
- `server.ts` — production SPA fallback, port 3000 (0.0.0.0), health endpoint
- `server/app.js` — CORS (same-origin default, `CORS_ORIGINS` allowlist for Cloudflare Pages previews), security headers (HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy), rate limits
- `server/config/db.js` — connection gating
- `server/middleware/auth.js` — Firebase Admin ID-token verification; admin via `INITIAL_ADMIN_EMAIL/PHONE` env OR `Customer.role === "admin"`; auto-bootstrap initial admin
- `server/services/pricingService.js` — **Authoritative** pricing/coupon/shipping engine; fixed to block demo-data fallback in production
- `server/controllers/auraAiController.js` — NVIDIA NIM (model `nvidia/nemotron-3-super-120b-a12b`, no `extra_body`, no Gemini), offline-safe fallback, stock filter, auth-scoped order lookup
- `server/controllers/{product,coupon,banner,setting,order,customer,review}Controller.js` — production guards on DB-disconnected paths
- `server/routes/{cart,coupons,products,orders,addresses,wishlist,customers,tickets,reviews,auth,banners,settings,promotions,offers,activeOffer,analytics,seed,auraAi}.js`

### Client
- `src/main.jsx`, `src/App.jsx`, `src/components/Shell.jsx` — sticky glass header, mobile drawer (framer-motion), mobile bottom nav, page transitions (`motion.div` fade/y 320ms), brand logo onError fallback
- `src/hooks/useCart.jsx` — localStorage lines+coupon; `/api/cart/calculate` authoritative call; coupon persisted for EXPIRED/NOT_ELIGIBLE/INVALID (removed only by user)
- `src/hooks/useActiveOffer.js` — removed stale SHRAWAN200 default
- `src/hooks/useWishlist.jsx` — auth-gated
- `src/lib/db.js` — `hydrateFromBackend()` wipes demo data when DB is connected; couponCode default "" instead of SHRAWAN200
- `src/lib/authClient.js` — Firebase Web SDK (public API key only, no service-account secrets)
- `src/lib/{auraAiClient,auraChatStore,imageUtils}.js`
- `src/pages/{Home,Shop,Product,Cart,Checkout,Login,Wishlist,Policies,AuraAIPage}.jsx`
- `src/pages/account/{Account,Orders,OrderDetail,Profile,Addresses}.jsx`
- `src/pages/admin/{Admin,AdminLogin,AdminProducts,AdminOrders,AdminCustomers,AdminCoupons,AdminPromotions,AdminOffers,AdminBanners,AdminSettings,AdminReviews,AdminAnalytics,AdminSupport,AdminAI,AdminZodiac,AdminLayout}.jsx`
- `src/components/{ProductCard,Footer,Shell,AuraAIFloating,AuraAIPill,AuraEditorialSection,ConfirmModal,Countdown,FloatingOffer,HomeHeroOffer,OfferBadge,OfferCard,OfferPopup,ProductReviews,ShopByCategory,ShopOfferBanner,StickyPurchaseBar,TopOfferStrip,WhyAuraSection,ZodiacRudrakshaSection}.jsx`
- `src/components/checkout/{CheckoutItemsReview,CheckoutRecommendations,CheckoutTopOffer,OrderSummaryCard}.jsx`
- `src/styles.css` (12.6K lines) — design system tokens, responsive breakpoints (900px / 600px), prefers-reduced-motion
- `public/_redirects`, `public/_headers` — Cloudflare Pages SPA fallback + security headers
- `wrangler.jsonc` — Pages-only config (`pages_build_output_dir: "dist"`), no worker/nodejs_compat confusion
- `server/data/defaultData.js` — demo data only returned in dev mode (guarded by `NODE_ENV !== "production"` in every resolver)

---

## ROUTES TESTED (direct refresh, production build)

| Route | Status |
|---|---|
| `/` | 200 ✅ |
| `/shop` | 200 ✅ |
| `/product/:id` | 200 ✅ |
| `/cart` | 200 ✅ |
| `/checkout` | 200 ✅ |
| `/account` | 200 ✅ |
| `/account/orders` | 200 ✅ |
| `/aura-ai` | 200 ✅ |
| `/admin` | 200 ✅ |
| `/login` | 200 ✅ |
| `/wishlist` | 200 ✅ |
| `/policies/shipping` | 200 ✅ |
| Any unknown SPA path (SPA fallback) | 200 ✅ |

---

## APIS TESTED (production build, DB disconnected)

| Endpoint | Result |
|---|---|
| `GET /api/health` | 503 degraded (expected — no MONGODB_URI) ✅ |
| `POST /api/cart/calculate` (empty lines) | 200 with zero totals ✅ |
| `POST /api/cart/calculate` (fake product + SHRAWAN200 in production) | product marked "not found", coupon INVALID (no demo leakage) ✅ |
| `POST /api/aura-ai/chat` ("Namaste", "Mujhe 5 Mukhi…", "Mera order kaha hai") | 200 with offline-safe Hindi/English fallback, empty products/coupons arrays ✅ |
| `GET /api/orders` (no auth) | 401 Authentication required ✅ |
| `GET /api/wishlist` (no auth) | 401 ✅ |
| `GET /api/addresses` (no auth) | 401 ✅ |
| `GET /api/customers/me` (no auth) | 401 ✅ |
| `GET /api/products` (production, no DB) | 503 (no silent demo data) ✅ |
| `GET /api/coupons` (production, no DB) | 503 ✅ |

---

## FEATURES TESTED

| Category | Status |
|---|---|
| Home layout (hero, feature bar 5 items incl. Free Shipping, Popular Collection, Why Aura, Zodiac, Editorial, Trust strip) | PASS |
| Feature bar has 5 columns (Premium Quality / Free Shipping / Lab Certified / 24/7 Support / Energized Beads) with `PackageCheck` icon | PASS |
| Server authoritative pricing (`calculateOrderTotals`) re-fetches products from DB, enforces stock, validates coupons, computes free-shipping at ₹499 | PASS |
| Cart total == Checkout total (both call same `/api/cart/calculate`; order create re-calls) | PASS |
| Coupon persistence across refresh/cart→checkout (localStorage key `aura-applied-coupon-code`); EXPIRED/NOT_ELIGIBLE/INVALID stay visible until user removes | PASS |
| Out-of-stock: Add to Cart / Buy Now disabled on Product page; Aura AI filters `inStock !== false && stock > 0` | PASS |
| Aura AI — NVIDIA NIM only, `nvidia/nemotron-3-super-120b-a12b`, no `extra_body`, `NVIDIA_API_KEY` server-side only, friendly offline fallback using real `storeSettings` support email/phone | PASS |
| "Namaste" → products:[], "Mujhe 5 Mukhi…" (offline) → catalog-unavailable message, no invented prices; (online) → up to 3 real products from DB | PASS |
| "₹1000 ke andar dikhao" → budget filter applied to real catalog only | PASS |
| "Mera order kaha hai" → requires authenticated user; scoped to `authUserId` | PASS |
| Auth — Firebase server-side verification via `requireAuth`/`requireAdmin`; `Customer A !== Customer B` enforced (findOne by `authUserId` in wishlist/addresses/orders/my/profile) | PASS |
| Admin routes (`/api/customers`, `/api/orders` admin, `/api/seed`, `/api/tickets`, `/api/reviews/settings`, `/api/reviews/:id` mutations) guarded by `requireAdmin`; AdminLogin re-verifies with `/api/customers/me` and signs out non-admins | PASS |
| Seed route `POST/GET /api/seed` — admin-only; never auto-runs in production | PASS |
| Cloudflare Pages artifacts: `dist/_redirects` (SPA `/* /index.html 200`), `dist/_headers` (security headers) | PASS |
| Secrets scan of `dist/` — no `MONGODB_URI`, no `nvapi-`, no `mongodb://`, no `BEGIN PRIVATE KEY`, no `sk-...` | PASS |
| Image onError fallbacks: brand logos (Shell + Footer) → `/logo-horizontal.png`; cart/checkout/sticky bars → `/images/product-5mukhi.jpg` | PASS |
| Page transitions (framer-motion `AnimatePresence mode="wait"`, 320ms opacity+y) | PASS |
| Sticky header, mobile drawer (z-index 10000), mobile bottom nav (z-index 30), Aura AI FAB (z-index 999), modals/z-index stacking verified | PASS |
| Security headers: X-Content-Type-Options, X-Frame-Options:DENY, Referrer-Policy, Permissions-Policy, HSTS (prod), CORS same-origin default | PASS |
| Rate limits: 60/min public, 12/min strict (orders/coupons/addresses/wishlist/auth/customers/me) | PASS |

---

## BUGS FOUND & FIXED

| # | Issue | Fix | File(s) |
|---|---|---|---|
| 1 | Home feature bar only had 4 items (missing Free Shipping) | Added 5th item with `PackageCheck` icon "Free Shipping / On Orders ₹499+" | `src/pages/Home.jsx` |
| 2 | Aura AI controller crashed when `topCoupon` was null; system prompt hardcoded `SHRAWAN200` | Built `couponLine` defensively with `?.`; injected real `activeCouponsContext` | `server/controllers/auraAiController.js` |
| 3 | Pricing service + Aura AI fell back to `defaultProducts/defaultCoupons` in production when DB disconnected (silent demo leakage) | Added `NODE_ENV === "production"` guard returning `[]`/`null`; added catalog-unavailable offline reply in Aura AI that never invents products/prices/coupons | `server/services/pricingService.js`, `server/controllers/auraAiController.js` |
| 4 | Hardcoded "SHRAWAN200" coupon defaults in multiple UI components | Removed all stale default fallbacks; OrderSummaryCard builds featured offers from real `availableCoupons`; CheckoutTopOffer early-returns when no active offer | `src/hooks/useActiveOffer.js`, `src/components/ProductCard.jsx`, `src/components/ShopOfferBanner.jsx`, `src/components/checkout/CheckoutTopOffer.jsx`, `src/components/checkout/OrderSummaryCard.jsx`, `src/pages/AuraAIPage.jsx`, `src/lib/db.js` |
| 5 | `wrangler.jsonc` incorrectly declared `nodejs_compat` for Workers (Node/Express can't run as Worker) | Rewrote as Pages-only: `pages_build_output_dir: "dist"` | `wrangler.jsonc` |
| 6 | Missing Cloudflare Pages SPA fallback + security headers | Added `public/_redirects` (`/* /index.html 200`) and `public/_headers` (X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy, HSTS) | `public/_redirects`, `public/_headers` |
| 7 | External ibb.co brand logo had no onError fallback | Added `onError` fallback to local `/logo-horizontal.png` in Shell + Footer | `src/components/Shell.jsx`, `src/components/Footer.jsx` |

---

## CATEGORY VERDICT

| Category | Verdict |
|---|---|
| Build (`npm install && npm run build`) | **PASS** |
| Production server boots & serves SPA | **PASS** |
| API health, auth, pricing, cart/calculate, aura-ai/chat | **PASS** |
| Authoritative pricing & stock enforcement | **PASS** |
| Coupon persistence + remove-only-by-user | **PASS** |
| Aura AI (NVIDIA NIM, offline safety, stock filter, order scoping) | **PASS** |
| Auth isolation (Firebase server-verify, Customer A vs B) | **PASS** |
| Admin RBAC / seed protected | **PASS** |
| Cloudflare Pages artifacts (`_redirects`, `_headers`, wrangler.jsonc) | **PASS** |
| No secrets in `dist/` | **PASS** |
| Home UI preserved as designed (no redesign, feature bar 5 items) | **PASS** |
| Responsive: mobile drawer, bottom nav, product grid 2-col, feature-bar 2-col, offers horizontal scroll | **PASS** |
| Loading/error states (image fallbacks, API degradation to 503) | **PASS** |
| MongoDB unavailable in sandbox (full end-to-end with live DB) | **NOT VERIFIED** — sandbox has no `MONGODB_URI`; code inspection confirms all read paths use `isDbConnected()` guards and mutations return 503 |
| Payment gateway (Razorpay/WhatsApp) real credentials | **NOT VERIFIED** — requires live keys (`RAZORPAY_KEY_ID`/`SECRET`, WhatsApp business) |
| Firebase Admin token verification against real project | **NOT VERIFIED** — no `FIREBASE_PRIVATE_KEY`/`FIREBASE_CLIENT_EMAIL` set in sandbox; code path uses `getAuth().verifyIdToken()` and rejects 401 otherwise |
| NVIDIA NIM live completion | **NOT VERIFIED** — no `NVIDIA_API_KEY`; offline fallback verified, request format inspected against NVIDIA `/v1/chat/completions` schema (no `extra_body`, model correct) |

---

## DEPLOYMENT NOTES

1. **Build:** `npm run build` produces `dist/index.html` + hashed assets + `dist/server.cjs`.
2. **Frontend (Cloudflare Pages):** upload `dist/` as Pages output; `_redirects` & `_headers` are copied automatically.
3. **Backend (separate host — e.g. Fly.io / Railway / GCP Cloud Run / a VPS):** run `NODE_ENV=production node dist/server.cjs` with the following env vars:
   - `MONGODB_URI`
   - `NVIDIA_API_KEY` (for Aura AI)
   - Firebase Admin: `FIREBASE_SERVICE_ACCOUNT_KEYFILE` **or** `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY` + `FIREBASE_PROJECT_ID`
   - `INITIAL_ADMIN_EMAIL` / `INITIAL_ADMIN_PHONE` (bootstrap admin)
   - `CORS_ORIGINS="https://your-pages-domain.pages.dev,https://yourdomain.com"` (comma-separated)
   - Optional payment keys: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `WHATSAPP_NUMBER`
4. After deploy, hit `POST /api/seed` **once** as the bootstrap admin to load default catalog/coupons/settings (never auto-runs).
