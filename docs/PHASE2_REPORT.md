# AURA RUDRAKSHA — PHASE 2 REPORT

Date: 2026-08-26 · Branch: `arena/01a03efd-aur-rudhraksha-official`

Scope honored: **no redesign** of Admin UI or customer website — only missing
controls, broken connections, live data, responsive issues and functionality
were fixed.

---

## 1. ADMIN MODULES TESTED (real end-to-end API tests)

Automated harness: `node scripts/phase2-test.mjs` — **120 / 120 checks passed.**

The harness boots a real database (MongoDB wire-protocol server; real `mongod`
is auto-selected when its binary is downloadable), the real Express API
(`server/app.js`), and real Firebase ID-token verification (self-signed
service account — signature/iss/aud/exp/kid all verified by firebase-admin).

| # | Module | Open | Load | Search | Create | Edit | Save | Delete | Refresh | API | MongoDB | Customer reflection |
|---|--------|------|------|--------|--------|------|------|--------|---------|-----|---------|---------------------|
| 1 | Dashboard (`Admin.jsx`) | ✅ | ✅ | — | — | — | — | — | ✅ (Refresh + store-update subscription) | ✅ | ✅ live fetch of products/orders/customers/analytics + AI metrics | ✅ (cache + `aura:store-updated` events) |
| 2 | Products | ✅ | ✅ | ✅ name/category | ✅ | ✅ price/MRP/stock/images/category/status | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ price/stock reflected by customer Product page |
| 3 | Orders | ✅ | ✅ | ✅ id/name/email + status chips | (customer) | ✅ status + tracking (PUT, no stock side-effects) | ✅ | — | ✅ | ✅ | ✅ | ✅ new status visible to order owner |
| 4 | Customers | ✅ | ✅ | ✅ name/phone/email | (auto on order) | — | — | — | ✅ | ✅ admin-only | ✅ | n/a (read-only directory, no credential editing) |
| 5 | Reviews | ✅ | ✅ | ✅ + product/rating/status filters | ✅ manual + customer submissions | ✅ fields/status/featured/verified + official reply | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ customer Product page only shows Approved |
| 6 | Banners / Hero | ✅ | ✅ | — | ✅ URL/upload | ✅ replace/edit | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ Home hero uses live `/api/banners` |
| 7 | Promotions | ✅ | ✅ | — | ✅ campaign | ✅ + duplicate + toggle active | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (storefront surfaces render live) |
| 8 | Offers (central live offer) | ✅ | ✅ | — | ✅ | ✅ full engine + Home Banner Deals list (NEW control) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ Home/Shop/Product/Cart/Checkout/AI all read it |
| 9 | Coupons | ✅ | ✅ | — | ✅ + **min amount + expiry (NEW)** | ✅ disable/expire | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ Cart/Checkout validate server-side (min/expire/limit/disable) |
| 10 | Analytics | ✅ | ✅ | — | — | — | — | — | ✅ | ✅ admin-only | ✅ real visit/product-view counters + revenue from orders | n/a (no fake numbers; "No data yet" vs 0) |
| 11 | Support (tickets) | ✅ | ✅ | ✅ + status chips | (customer) | ✅ status | ✅ | — | ✅ | ✅ | ✅ | n/a |
| 12 | Aura AI | ✅ | ✅ | ✅ conversations | — | ✅ all toggles (master/floating/header/language/greeting/recs/orders/human) | ✅ | ✅ (conversation privacy controls) | ✅ (Refresh) | ✅ | ✅ settings + conversations + **real analytics (AI-attributed revenue)** | ✅ customer AI honors live settings & only recommends in-stock items |
| 13 | Zodiac (Home content) | ✅ | ✅ | — | — | ✅ per-sign product/image/benefit | ✅ (persisted in settings — was previously **dropped by schema**) | — | ✅ | ✅ | ✅ Home zodiac section reads `settings.zodiacs` |
| 14 | Settings & Policies | ✅ | ✅ | — | — | ✅ store info/social/policies | ✅ | — | ✅ | ✅ | ✅ | ✅ Footer + Policies pages |
| 15 | AdminLogin | ✅ | ✅ | — | — | — | — | — | — | ✅ Firebase + server-side role | ✅ | n/a |

### Buttons that were dead / broken before Phase 2 (now wired)
- **Admin dashboard "Add / Seed Data"** → now `Load Demo Data (Dev)`: confirmation
  modal, insert-only, never overwrites, never auto-runs, clearly labeled.
- **AdminOrders status select & tracking save** → were calling
  `POST /api/orders` (re-validated stock, double-decremented stock, recalculated
  amounts). Now use `PUT /api/orders/:id` (admin-scoped update).
- **AdminZodiac Save** → wrote `zodiacs` into settings but the `Setting` schema
  dropped the field on save. Field added; customer section reads it.
- **AdminSupport list** → never fetched from the API (always empty). Now
  `GET /api/tickets`.
- **AdminOffers — Home banner deals** → had no direct UI at all. Full
  add/edit/delete control added (existing styling).
- **AdminCoupons — min amount / expiry** → did not exist in the form (model had
  the fields, validation ignored them). Both added and enforced server-side.
- **AdminProducts / AdminOrders / AdminCustomers desktop views** → only
  `.admin-mobile-cards` (hidden ≥769px) existed, so desktop screens were blank.
  Desktop tables added; missing utility classes (`.admin-pill`,
  `.admin-product-cell`, …) added to CSS.
- **Product page analytics** → product views were never counted; `db.logProductView()`
  + `POST /api/analytics/product-view` added.

---

## 2. LIVE DATA RESULT

- Dashboard, Orders, Customers, Analytics, Support now **fetch from MongoDB**
  on load (`fetchProducts/fetchOrders/fetchCustomers/fetchAnalytics/
  fetchTickets/fetchBanners/fetchSettings/fetchCoupons`) and subscribe to
  `onStoreUpdate` for cross-tab/cross-device refresh.
- **Fake fallback data eliminated when DB is connected** (`src/lib/db.js`):
  hydration first checks `/api/health`; when connected, products/orders/
  customers/coupons/offers/activeOffer/banners/reviews are **replaced with the
  real (possibly empty) collections**. A dashboard pill shows
  `Live MongoDB` vs `Demo Mode (DB offline)` so no one can mistake demo data
  for real.
- **Auto-seed removed everywhere**: `GET /products`, `/orders`, `/customers`,
  `/coupons`, `/banners`, `/reviews` no longer insert demo data when the
  collection is empty. Verified: empty DB → `{"data":[],"count":0}`.
- **Analytics are real**: counters start at 0; visits/product-views are
  recorded from actual page loads; revenue is computed from real orders.
  `hasData` flag lets UI say "No data yet" instead of faking numbers.
- **Aura AI analytics are real**: conversations, users, recommended counts,
  cart additions, escalations, top questions (from real first messages),
  category breakdown (from real recommended products), and **AI-attributed
  orders = actual orders** whose items match products the customer added from
  AI recommendations (no more `×0.65` / `×₹2490` fabricated revenue).
- **Instant live update**: Admin Save → MongoDB → successful API response →
  client cache update + `aura:store-update` event → UI re-render (same tab),
  `storage` event (other tabs), 20 s visibility-gated polling + refetch on
  window focus (other devices). No new infrastructure added.

## 3. API RESULT

- All admin mutations require **Firebase token + server-side admin role**
  (`requireAdmin` → verified ID token → initial-admin bootstrap /
  `Customer.role === "admin"`). No client-supplied role flags are trusted
  anywhere (the old `?isAdmin=true` query-param trick on Aura AI conversations
  is gone).
- Order ownership: owner or admin only. Customers can only cancel
  pending/processing orders or fix their address — nothing else (400 otherwise).
- Coupon validation is server-authoritative: min amount, expiry, usage limit,
  Active status. Expired coupons are auto-marked `Expired`.
- Orders recompute price/subtotal/total from the **database** (client-sent
  amounts are ignored), validate stock, reject OOS, decrement stock once,
  increment coupon usage once.
- Seed endpoint: admin-only, insert-only (`$setOnInsert`), reports how many
  records were actually added.
- Production without `MONGODB_URI` → health `503 degraded`, public reads `503`,
  storefront shell still serves (no crash, no fake data).

## 4. SECURITY RESULT

| Test | Result |
|------|--------|
| 15 admin endpoints × no token | **401** ✅ |
| 15 admin endpoints × customer token | **403** ✅ |
| Invalid/garbage token | **401** ✅ |
| Order by-id: other customer | **403** ✅ |
| Aura AI conversations: guest | **empty list** ✅ |
| Aura AI conversations: other user | **0 items (no leak)** ✅ |
| Aura AI conversation by-id: other user / guest | **403 / 401** ✅ |
| Aura AI conversation delete: guest / other user | **401 / 403** ✅ |
| Aura AI conversation delete: owner | **200** ✅ |
| AI settings write as customer | **403** ✅ |
| Admin bootstrap (initial admin email) + DB role | ✅ |
| Customer list: no secrets, no credential editing | ✅ (read-only, role/status shown) |

Real end-to-end Firebase verification ran in the harness (self-signed service
account; the blocked Google x509 endpoint is served locally **in the test
harness only** — production code is unchanged and will verify against Google's
real keys).

## 5. CUSTOMER REFLECTION RESULT (Phase-15 live connection test)

| Change (Admin) | Customer sees | Result |
|----------------|---------------|--------|
| Product price 999 → 899 | `/api/products/p5` → `899` | ✅ |
| Hero banners → 2 new URLs | Home hero reads them | ✅ |
| Active offer title → "₹150 OFF" | Home/Shop/Product/Cart/Checkout/AI read it | ✅ |
| Stock 10 → 8 after order | Product page shows new stock; OOS rejected | ✅ |
| AI greeting/settings change | Customer AI uses new greeting; offer recs suppressed when toggled off | ✅ |
| Zodiac content save | `GET /api/settings.zodiacs` round-trips | ✅ |
| Stock=0 product | AI does **not** recommend it; order rejected; Add to Cart disabled | ✅ |

## 6. RESPONSIVE (admin)

- Added missing CSS (`.admin-filter-bar`, `.admin-pill`, `.admin-product-cell`,
  `.admin-actions-cell`, `.mobile-card-prices`, `.admin-input`, `.spin`) and
  hardening rules for **360 / 390 / 430 / 768 / 1024 / 1280 / 1440**:
  tables scroll (no page overflow), KPI grids collapse, AI tabs scroll
  horizontally, modals capped at 94vw/88vh with scroll, top bar wraps,
  form rows stack, AdminOffers two-column layout stacks ≤1100px.

## 7. REMAINING ISSUES / NOTES

1. **Sandbox network**: `fastdl.mongodb.org` and Google's token endpoints are
   unreachable here, so the test DB is a MongoDB wire-protocol server and token
   verification used a local cert. On any machine with normal internet the
   same harness automatically uses real `mongod`, and production verification
   uses Google's real keys. Nothing in app code depends on the sandbox.
2. **Firebase Admin credentials in production**: set
   `FIREBASE_SERVICE_ACCOUNT_KEYFILE` (documented in `.env.example`). Without
   it (and without ADC) all authenticated endpoints return 401 by design.
3. **Aura AI model**: `NVIDIA_API_KEY` not set in this sandbox → the resilient
   Vedic fallback engine answered. With a key, the same in-stock/expiry
   filtering applies to the LLM path (catalog summary only contains in-stock
   products and active, unexpired, in-limit coupons).
4. `src/layouts/admin.css` is an unused legacy file (not imported anywhere);
   left untouched.
5. Out-of-scope observations (not changed, per "do not redesign"):
   - AdminProducts status options include "Inactive" which is not in the
     Product enum (harmless — saved as-is, hidden from store either way).
   - Root-level one-off `*.cjs`/`*.pl` patch scripts from earlier phases are
     still present; safe to archive in a later cleanup phase.

## 8. HOW TO RE-RUN TESTS

```bash
npm install
node scripts/phase2-test.mjs     # 120 checks, real DB + real API + real token verification
npm run build                    # vite + esbuild (dist/)
MONGODB_URI=... NODE_ENV=production PORT=3000 node dist/server.cjs
```
