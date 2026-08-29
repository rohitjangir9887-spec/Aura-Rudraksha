# Aura Rudraksha — Security & Production Readiness Audit

Date: 2026-08-28
Scope: full repo (server/, src/, routes, controllers, middleware, models, build/deploy config).
Home page UI, visual design, branding, and layout were **not** touched — all changes below are
server-side logic, authorization, and a small number of targeted client-side auth/XSS fixes.

Severity legend: **CRITICAL / HIGH / MEDIUM / LOW / INFO**. Status: **FIXED / WARNING / PASS**.

---

## 2026-08-29 follow-up pass

- **`scripts/phase2-test.mjs` had a stale assertion.** After the item-3 fix below (public
  `GET /api/reviews` restricted to `status: "Approved"`), the Reviews section of the harness still
  asserted that an unauthenticated `GET /api/reviews` immediately shows a review the test had just
  posted as a customer — which is Pending by default, so that assertion contradicted the security
  fix it should have been verifying. **Fixed**: the test now (a) posts the review, (b) asserts the
  public feed does **not** show it while Pending, (c) asserts the admin moderation queue does show
  it, (d) has the admin approve it and asserts it now appears publicly, (e) hides it and asserts it
  disappears from the public feed again, then proceeds with the existing delete step. Pending
  reviews are still never publicly visible — confirmed by the corrected test, not weakened.
- Re-audited every route file (`server/routes/*.js`) and the controllers behind them for IDOR/BOLA:
  order/customer/address/wishlist/aura-ai-conversation ownership checks all key off the
  server-verified `authUserId` from the Firebase ID token, never a client-supplied id — **PASS**.
- Re-checked upload validation: review images go through `validateReviewImages()`
  (MIME allowlist, 4MB/image, 5-image cap) — **PASS**. Product/banner `img`/`images` fields
  (admin-only, `pickFields` `"url"` type) accept `data:image/*;base64,...` without the same
  MIME/size allowlist, including `image/svg+xml`, which can carry embedded script — low risk since
  only an authenticated admin can set these fields, but flagged for defense-in-depth. **LOW / WARNING**
  (not fixed here — same admin-only surface as item 12, no client-facing exploit path found).
- Re-checked API error responses, `.env`/`.gitignore`/`.env.example`, and Mongo query construction
  in every controller for injectable `req.query`/`req.body` passthrough — no new issues found,
  matches **PASS** items already listed below.
- AI abuse/cost limits re-verified: `/api/aura-ai/chat` has per-user/IP rate limiting
  (`checkRateLimit`, 60s window) plus a 2000-character prompt cap; `generateReviewDrafts` /
  `generateProductDescription` (the two other LLM-calling endpoints) are both `requireAdmin`-gated
  and `generateReviewDrafts` caps `count` to 1–50 server-side regardless of client input. **PASS**
- `node --check` re-run against all 47 files under `server/` plus `scripts/phase2-test.mjs` —
  zero syntax errors.
- **Not runnable in this sandbox** (no outbound network access, no `node_modules` — same
  limitation the 2026-08-28 pass hit): `npm install`, `npm run build`, `npm audit`,
  and the live HTTP test suites (`phase2-test.mjs`, `phase3-test.mjs`,
  `publish-gate-verify.mjs`, `final-master-recheck.mjs`) all require installed dependencies
  and/or a downloaded `mongod`/npm-registry access to execute. All fixes were verified by static
  code review and `node --check` only. **You must run these yourself** (see Production Readiness
  checklist below) before publishing.

---

## CRITICAL

### 1. Auth fail-open in production if `NODE_ENV` misconfigured
- **File:** `server/middleware/auth.js`
- **Problem:** `requireAuth`/`checkAdmin` authenticated any request as a fake admin
  (`admin-dev-user`, email `rohitjangir8740@gmail.com`) whenever `NODE_ENV !== "production"`.
  Any deploy that forgets/loses that env var silently becomes fully open to admin access.
- **Risk:** Full admin takeover (products, orders, coupons, settings) with zero credentials.
- **Fix applied:** Fallback now requires **both** `NODE_ENV !== "production"` **and** an explicit
  `ALLOW_DEV_AUTH_FALLBACK=true` env var. Documented in `.env.example`. All three fallback sites
  in `auth.js` updated. Missing/invalid Firebase token now always → `401` in production.
- **Verification:** `node --check` passes; logic reviewed line-by-line. **FIXED**

### 2. Client-side "demo login" could impersonate the real admin identity
- **File:** `src/lib/authClient.js`
- **Problem:** `signInWithGoogle`, `signInAnonymously`, `signInWithEmail`, `signUpWithEmail`,
  `signInWithPhone` all silently fell back to a fake local session on **any** Firebase error
  (popup blocked, network blip, wrong password, unauthorized domain — all common on mobile).
  The fallback's admin variant hard-codes the real admin's email, so a failed login could present
  the entire admin UI shell to any visitor whose OAuth popup got blocked.
- **Risk:** Confusing/spoofed "logged in as admin" client state; information disclosure of admin
  UI structure. (Actual API writes were already blocked server-side once fix #1 landed, but this
  is defense-in-depth and matches the "remove demo auth from production" requirement.)
- **Fix applied:** All demo fallbacks now gated behind `import.meta.env.DEV` (Vite statically
  compiles this to `false` in every production build — it cannot be toggled by a runtime env
  var). In production, a failed sign-in now throws a real error, which existing UI already
  surfaces via `formatAuthError`. **FIXED**

### 3. Review submission — mass assignment + ID-based overwrite (IDOR)
- **File:** `server/controllers/reviewController.js`, `server/routes/reviews.js`
- **Problem:** Public `POST /api/reviews` spread the entire `req.body` into the DB write and
  used `findOneAndUpdate(..., { upsert: true })` keyed on a **client-supplied** `id`. Any visitor
  could set `status: "Approved"`, `verified: true`, `isAiGenerated`, `featured`, or supply the
  `id` of an existing review to overwrite it outright.
- **Risk:** Fake verified reviews, review tampering/defacement, review farming.
- **Fix applied:** Strict field allowlist (`CUSTOMER_REVIEW_FIELDS`); server always generates the
  ID (`crypto.randomBytes`); `status`/`verified`/`isAiGenerated`/`featured` are hard-coded to safe
  defaults (`Pending`/`false`/`false`/`false`); switched from upsert to a plain `Review.create`
  insert so an existing document can never be targeted. Admin update path (`PUT /:id`, already
  `requireAdmin`-gated) now also goes through an allowlist for defense-in-depth against operator
  injection. **FIXED**

---

## HIGH

### 4. Permissive CORS (`cors()`)
- **File:** `server/app.js`
- **Problem:** `app.use(cors())` reflected/allowed any origin.
- **Fix applied:** Replaced with same-origin + explicit `CORS_ORIGINS` allowlist (matches the
  design already documented in `.env.example`: "empty = same-origin only"). Dev-only localhost
  origins are added automatically outside production. **FIXED**

### 5. Rate limiter trusted raw `X-Forwarded-For`
- **File:** `server/middleware/rateLimit.js`, `server/app.js`
- **Problem:** IP key for rate limiting read `req.headers["x-forwarded-for"]` directly — trivially
  spoofable by any client, making every rate limit (login, OTP, AI, orders, coupons...)
  bypassable by just sending a random header value each request.
- **Fix applied:** `app.set('trust proxy', 1)` (configurable via `TRUST_PROXY_HOPS`) so Express
  resolves `req.ip` correctly from exactly one trusted proxy hop; rate limiter now uses `req.ip`
  instead of the raw header. **FIXED**

### 6. Public ticket submission could set admin-only fields
- **File:** `server/controllers/settingController.js`, `server/routes/tickets.js`
- **Problem:** `TICKET_FIELDS` allowlist (used for both public create and admin update) included
  `status`, `priority`, `adminResponse` — any anonymous visitor could submit a ticket already
  marked `Resolved` with a fake `adminResponse`.
- **Fix applied:** Split into `createTicket` (public, customer-safe fields only, server-controlled
  `status: "Open"`, server-generated ID) and `updateTicket` (admin-only route, separate allowlist
  including status/priority/adminResponse). **FIXED**

### 7. Order ID was client-influenceable, enabling upsert-based overwrite
- **File:** `server/controllers/orderController.js`
- **Problem:** `const id = data.id || data.orderId || (...)` combined with `upsert:true` meant a
  crafted `id` could, in principle, target an existing order document.
- **Fix applied:** ID is now always server-generated (`crypto.randomBytes`), unpredictable, and
  never taken from the client. `_id`/`__v` are stripped from client input before use. Ownership
  checks (`getOrderById`, `updateOrder`) were already correct and unchanged. **FIXED**

### 8. Coupon list leaked internal data to every visitor
- **File:** `server/controllers/couponController.js`, `server/routes/coupons.js`
- **Problem:** `GET /api/coupons` was fully public and returned raw documents (usage counts,
  limits, internal ids) to anyone. The storefront (Cart/Checkout/Product pages) legitimately
  needs *some* of this to show "available coupons," so simply admin-gating it would have broken
  that UI/UX.
- **Fix applied:** Endpoint stays public but now returns a reduced, customer-safe field set
  (code, discount, type, minAmount, expiry, status, description) for anonymous/customer
  requests, and the full document set only for verified admins (`optionalAuth` + server-side
  admin check, never a client-asserted role). **FIXED**

### 9. Review-photo "validation" was frontend-only and would have silently broken uploads
- **File:** `server/controllers/reviewController.js`
- **Problem:** No server-side MIME/size/count validation existed for review images (base64 data
  URLs stored directly in Mongo). My first-pass allowlist fix would have capped each image string
  at 500 characters (far too small for a real photo), silently corrupting the upload feature.
- **Fix applied:** `validateReviewImages()` — allows `https://` URLs or `data:image/...;base64,`
  with a real MIME allowlist (jpeg/png/webp/gif), a 4MB decoded-size ceiling per image, and a
  5-image cap; used by both create and admin update paths. **FIXED**

### 10. XSS via unsanitized product description ("legacy" text-formatting path)
- **File:** `src/pages/Product.jsx`
- **Problem:** The Tiptap-HTML branch of `renderDescription()` was already sanitized with
  DOMPurify, but the plain-text fallback branch built raw HTML strings from the description text
  (`t.replace(...)`) and injected them via `dangerouslySetInnerHTML` **without escaping**.
  Product descriptions are admin-authored today, but any future admin-panel compromise or rich
  text bug would have been directly exploitable.
- **Fix applied:** All text is HTML-escaped before insertion; the `**bold**` shorthand is applied
  only after escaping. Visual output for existing product descriptions is unchanged. **FIXED**

---

## MEDIUM

### 11. CSP allowed `unsafe-eval` unconditionally
- **File:** `server/app.js`
- **Fix applied:** `unsafe-eval` dropped in production CSP (Vite's production build output does
  not need it); kept only in development for HMR/tooling. Added `object-src 'none'`,
  `base-uri 'self'`, `frame-ancestors 'self'`. `unsafe-inline` for scripts/styles was left as-is
  — removing it would require a nonce/hash pipeline across the whole app and risked breaking the
  existing UI, which is outside this pass's minimal-change mandate. **FIXED (partial) / WARNING (remaining unsafe-inline)**

### 12. Admin review-update endpoint accepted raw `req.body` into `$set`
- **File:** `server/controllers/reviewController.js`
- Already `requireAdmin`-gated, so not exploitable by non-admins, but added an explicit
  `ADMIN_REVIEW_FIELDS` allowlist for defense-in-depth against operator-injection payloads
  (`$ne`, prototype-pollution-shaped keys, etc.) even from a trusted session. **FIXED**

---

## LOW / INFO

- **Firebase client API keys committed in `firebase-applet-config.json`, `src/lib/authClient.js`,
  and the unused `patch_authClient.cjs`** — these are Firebase **client** keys, which are not
  secret by design (Google's own guidance); real protection comes from Firebase Security Rules
  and this app's server-side ID-token verification (already enforced). No rotation required, but
  recommend confirming Firebase **Authorized Domains** are locked to the real production
  hostname(s). **INFO**
- **No server secrets found hardcoded anywhere** (`NVIDIA_API_KEY`, `RAZORPAY_KEY_SECRET`,
  `MONGODB_URI`, Firebase service-account private key) — all correctly sourced from
  `process.env` per `.env.example`. **PASS**
- **`.gitignore` was missing `.env`, `*.pem`, `*.key`, service-account JSON patterns** — added.
  **FIXED**
- **~50 one-off `patch_*.cjs` / `fix_*.cjs` / `replace*.pl` / `test_*.cjs` scripts in the repo
  root** are leftover migration/dev scripts, not part of the runtime build. Left untouched per
  your "don't delete files" instruction, but they should not ship as part of a production
  artifact — recommend excluding them via the deploy pipeline (they are not imported by
  `server.ts`/`vite.config.js`). **LOW (hygiene, not a live vulnerability)**
- **Error handling** (`server/middleware/errorHandler.js`) already logs full detail server-side
  only and returns generic messages to clients — no stack traces, no Mongo error text. **PASS**
- **Order/pricing logic** (`orderController.js`, `pricingService.js`) already recalculates
  totals, stock, and coupon eligibility server-side and never trusts client-submitted prices —
  this was solid going in. **PASS**
- **Admin authorization model** (`isAdminUser` / `hasAdminRole` in `auth.js`) is based on a
  verified Firebase-decoded email/phone or a DB-stored role, never a client-asserted flag —
  solid going in, and demoting rogue "admin" DB records on every failed check is a nice touch
  already present. **PASS**

---

## NOT COMPLETED IN THIS PASS (manual checks required)

- **`npm install` / build / lint / `npm audit`** could not be run — this sandbox has **no
  outbound network access** (`registry.npmjs.org` returned 403/blocked). All modified files were
  syntax-checked with `node --check` (server/*.js — all pass) and manually reviewed line-by-line
  (Product.jsx, authClient.js, which contain JSX/ESM the sandbox can't execute standalone).
  **You must run `npm install && npm run build` (or your CI) before deploying** to catch any
  integration issue this review missed, and run `npm audit` for dependency CVEs.
- **Image dimension checking / re-encoding** for review photos was not added (only MIME + size +
  count are enforced server-side) — for stronger protection, consider moving to a real object
  storage upload endpoint (S3/R2/Cloudinary) rather than storing base64 in MongoDB, exactly as
  section 8 of the original brief suggested. This is a larger architectural change I did not make
  unilaterally.
- **`bulkSaveReviews`** (admin AI-review-studio bulk save) still trusts `req.body` images/fields
  more loosely than the customer path, since it's already `requireAdmin`-gated. Consider running
  the same `validateReviewImages()` there for consistency.
- **Full manual pen-test checklist** (User A → User B data, Customer → Admin API,
  Unauthenticated → Protected API) was verified **by code review**, not by running live requests
  against a running instance (no DB/Firebase credentials available in this sandbox). Recommend a
  quick manual pass with real tokens before go-live.
- **N+1 queries / indexing** were not deeply profiled (no live DB connection available). Order
  and Review models already index `id`; consider confirming `Order.authUserId` and
  `Review.productId` have indexes if collections grow large (not verified in this pass).
- **Accessibility/mobile bug audit** (section 24 of the brief) was not performed in this pass —
  focus was security-critical items given the scope of everything else found. Happy to do a
  follow-up pass focused purely on that if you'd like.

---

## Security Score: Improved, not "100% secure"

Multiple CRITICAL/HIGH-severity authorization and mass-assignment bugs were found and fixed. The
codebase's core money-path logic (pricing, stock, coupons) was already well-built. No system is
ever fully secure — treat this as a substantially hardened baseline, not a guarantee. Please run
`npm audit`, a real build, and a manual live-request pass (per "NOT COMPLETED" above) before
publishing.

## Production Readiness: Conditional — safe to deploy once you:
1. Run `npm install && npm run build` successfully in an environment with registry access.
2. Set `NODE_ENV=production` and leave `ALLOW_DEV_AUTH_FALLBACK` unset in production.
3. Set `CORS_ORIGINS` if you're doing a split frontend/API deploy; leave empty for same-origin.
4. Confirm Firebase Authorized Domains match your real production hostname(s).
5. Do the manual live-request checklist above.

## Remaining Risks
- `unsafe-inline` remains in CSP for scripts and styles (see item 11).
- Base64 images stored directly in MongoDB (architectural, not fixed here).
- Leftover one-off scripts in repo root (hygiene only).
- No dependency-vulnerability scan was possible in this offline sandbox.

---

## 2026-08-29 final verification pass

### Item fixed this pass: admin-only SVG image upload (LOW, previously WARNING)
- **Files:** `server/utils/imageValidation.js` (new), `server/utils/sanitize.js`,
  `server/controllers/productController.js`, `server/controllers/bannerController.js`.
- **Problem:** the review-photo path already enforced a raster-image MIME allowlist
  (jpeg/png/webp/gif) on `data:` URLs, but the product `img`/`images` fields (pickFields `"url"`/
  `"string[]"` types) and the banner `image` field (no allowlist at all — raw `req.body` spread)
  accepted any `data:image/*` MIME, including `image/svg+xml`, which can carry an embedded
  `<script>`/event-handler payload. Admin-only surface (`requireAdmin` on every write path), so
  not directly exploitable by a customer, but worth closing for defense-in-depth.
- **Fix applied:** extracted the same allowlist logic already used for review photos into a
  shared `isSafeImageValue()` helper (`server/utils/imageValidation.js`): http(s) URLs,
  same-origin relative paths (`/images/...`), or `data:image/{jpeg,png,webp,gif}` base64 under
  4MB decoded — `image/svg+xml` and every other MIME type is now rejected everywhere images are
  accepted.
  - `pickFields`'s `"url"` type (used by `Product.img`, `Promotion`/`Offer` `image`/`mobileImage`,
    and social-link fields in settings) now calls this helper instead of the old loose regex.
    Plain http(s) links (e.g. Instagram/Facebook/YouTube URLs) are unaffected.
  - Added a new `"url[]"` pickFields type (each entry validated + a 20-image cap) and switched
    `Product.images` from `"string[]"` (no URL/MIME validation at all) to `"url[]"`.
  - `bannerController.js` never used `pickFields`; added an explicit `isSafeImageValue()` check —
    `saveBanners` now filters out any banner with an unsafe image, `createBanner` now returns
    `400` for one. No change to `getBanners`/`deleteBanner` or the response shape.
  - Existing seeded data (`/images/product-*.jpg`-style relative paths) all pass the new check
    unchanged — verified by reading `server/data/defaultData.js`; no legitimate image data is
    dropped by this change. **FIXED**

### Test / build / audit execution — genuinely not possible in this sandbox
Per the task instructions, an install + full run of `npm audit`, the production build, and every
E2E/security suite (`phase2-test.mjs`, `phase3-test.mjs`, `publish-gate-verify.mjs`,
`final-master-recheck.mjs`) was attempted:

```
$ npm install --no-audit --no-fund
npm error code E403
npm error 403 403 Forbidden - GET https://registry.npmjs.org/yauzl
```
```
$ curl -s -o /dev/null -w "%{http_code}" https://registry.npmjs.org/
403
```

This sandbox has **no outbound network access at all** (confirmed via direct `curl` to the npm
registry, not just `npm install`) — the same limitation the 2026-08-28 and prior 2026-08-29 passes
already hit. `node_modules` cannot be populated, so none of the following can be executed here,
by a limitation of this environment rather than any code defect:
- `npm audit` — **NOT RUN** (no registry access to fetch the advisory database or resolve the tree)
- Production build (`npm run build` = `vite build && esbuild ...`) — **NOT RUN** (`vite`/`esbuild`
  not installed)
- `phase2-test.mjs` / `phase3-test.mjs` / `publish-gate-verify.mjs` / `final-master-recheck.mjs` —
  **NOT RUN** (each requires `mongodb-memory-server` or its `@rckflr/easydb-server` fallback,
  `firebase-admin`, and the rest of `node_modules`, none of which are installed)

What **was** verified in place of live execution:
- `node --check` against all 53 `.js`/`.mjs`/`.cjs` files under `server/` and `scripts/`
  (including every file touched this pass) — **0 syntax errors**.
- Every changed file re-read end-to-end for logic correctness (import paths resolve, no
  unreferenced identifiers, `isSafeImageValue` usages match its actual signature).
- The full seeded product/banner dataset (`server/data/defaultData.js`) checked by hand against
  the new `isSafeImageValue()` rules to confirm no legitimate existing image reference is dropped.
- No test file was edited to make a real problem disappear — `phase2-test.mjs`'s only change
  (this and the prior pass) corrects a stale assertion to match a security fix that was already
  in place; the review-visibility behavior itself was not touched.

**This is a hard environment limitation, not a "skipped" step.** You must run these yourself in a
network-connected environment before publishing:
```
npm install
npm audit
npm run build
node scripts/phase2-test.mjs
node scripts/phase3-test.mjs
node scripts/publish-gate-verify.mjs
node scripts/final-master-recheck.mjs
```

### Final verified status (this pass)

- **CRITICAL:** 0
- **HIGH:** 0
- **MEDIUM:** 0
- **LOW:** 0 (the one open LOW item — admin-only SVG upload — is now FIXED, see above)
- **FIXED (this pass):** admin-only SVG/non-raster image upload on product `img`/`images` and
  banner `image` fields (product/banner image allowlist); `phase2-test.mjs` reviews-visibility
  assertion (fixed in the prior pass, re-verified unchanged and correct this pass)
- **WARNING:** `npm audit`, production build, and all four E2E/security suites could not be
  executed in this offline sandbox — genuinely unrun, not passing or failing; `unsafe-inline`
  remains in CSP for scripts/styles (documented, unchanged architectural tradeoff, item 11)
- **TESTS:** 0/0 executed (blocked by no network access — could not install dependencies to run
  `phase2-test.mjs`, `phase3-test.mjs`, `publish-gate-verify.mjs`, or `final-master-recheck.mjs`;
  all four were reviewed statically and contain no known-stale assertions as of this pass)
- **BUILD:** NOT RUN (blocked by no network access — `vite`/`esbuild` not installed)
- **NPM AUDIT:** NOT RUN (blocked by no network access to the advisory database)
- **PRODUCTION READY: NO** — not because a defect was found, but because the build, dependency
  audit, and E2E suites have not actually been executed against this exact codebase in this pass
  or the prior one. Every check that *can* run offline (static code review, `node --check`,
  manual data-compatibility verification) passed cleanly. Run the command block above in a
  network-connected environment; if all four suites pass, the build succeeds, and `npm audit`
  reports no unaddressed high/critical advisories, this codebase is ready to publish as-is.

---

## 2026-08-29 FINAL pass

### Fixed this pass
- **`bulkSaveReviews` image validation gap (LOW, closed).** Flagged as an open item since the
  2026-08-28 pass ("still trusts req.body images/fields more loosely than the customer path").
  `server/controllers/reviewController.js`: `bulkSaveReviews` now runs every AI-draft image
  through the same `validateReviewImages()` MIME/size/count allowlist as `createReview` and
  `updateReview`, instead of accepting `r.images`/`r.img` unchecked. Admin-only route
  (`requireAdmin`), so not customer-exploitable, but closes the last inconsistency in image
  handling across the review subsystem. **FIXED**

### Full checklist re-verified by code review this pass (items 1–21)
1. **Auth** — `requireAuth`/`optionalAuth` verify real Firebase ID tokens only; dev fallback
   requires both non-production `NODE_ENV` *and* explicit `ALLOW_DEV_AUTH_FALLBACK=true`. **PASS**
2. **IDOR/BOLA** — orders, addresses, wishlist, `customers/me`, and AI conversations all scope
   by the token-verified `authUserId`; `getOrderById`/`updateOrder` explicitly 403 non-owners.
   **PASS**
3. **Admin access** — `checkAdmin` requires a verified email/phone match against
   `INITIAL_ADMIN_EMAIL`/`INITIAL_ADMIN_PHONE` or a DB `role: "admin"`; rogue "admin" DB records
   are auto-demoted on every failed check. **PASS**
4. **Reviews + moderation** — `getReviews` forces `status: "Approved"` for every non-admin caller
   (verified again this pass, see `phase2-test.mjs`); AI drafts are hard-coded
   `isAiGenerated: true`, `verified: false`, name `"AI DRAFT"`/`sampleLabel` after the object
   spread so a crafted draft payload can't override them; real customer photos/identity only ever
   come from `createReview`'s allowlisted, non-overridable fields. **PASS**
5. **Orders + pricing + stock** — totals always server-recalculated (`calculateOrderTotals`),
   stock checked and decremented server-side, order IDs always server-generated
   (`crypto.randomBytes`), never upserted against a client id. **PASS**
6. **Coupons** — admin writes allowlisted (`COUPON_FIELDS`); public `GET` returns a reduced
   customer-safe view; usage counter only ever incremented from `orderController`, never from the
   admin form; expired coupons auto-flip to `Expired` and stay that way. **PASS**
7. **Tickets** — public `createTicket` uses a customer-safe allowlist (`status` always starts
   `"Open"`, no client-supplied `adminResponse`); admin `updateTicket` is a separate
   `requireAdmin` route/allowlist. **PASS**
8. **AI endpoints** — `/api/aura-ai/chat` rate-limited per user/IP (60s window) plus a
   2000-char prompt cap; `generate-drafts`/`generate-description` are `requireAdmin`-gated;
   `generateReviewDrafts` caps `count` to 1–50 server-side regardless of client input; global
   `auraAiLimit` (15/min) also applies at the route level in `app.js`. **PASS**
9. **Image/file uploads** — review images, and now (this pass + prior pass) product `img`/
   `images`, banner `image`, and promotion `image`/`mobileImage` all go through the same
   MIME-allowlisted (jpeg/png/webp/gif), 4MB-capped `isSafeImageValue`/`validateReviewImages`
   checks; `image/svg+xml` and any non-raster/non-http(s) value is rejected everywhere. **PASS**
10. **XSS** — `errorHandler` never echoes raw error text; product-description rendering already
    escapes text before `dangerouslySetInnerHTML` (fixed 2026-08-28, re-checked unchanged);
    review/product/banner image fields can no longer carry `data:image/svg+xml` (this pass).
    **PASS**
11. **NoSQL injection** — no controller passes raw `req.query`/`req.body` into a Mongo query;
    `pickFields`/allowlists strip `$`-operator-shaped keys from every write path; `getReviews`'s
    `status`/`type`/`productId` filters are explicitly type-checked as plain strings before use.
    **PASS**
12. **Mass assignment** — every admin/customer write path (products, coupons, tickets,
    customers, orders, reviews, promotions, offers) uses an explicit field allowlist; the one
    remaining raw-spread path (`bannerController.createBanner`/`saveBanners`) is admin-only and
    now has its image field explicitly validated (this pass) — the rest of the banner shape
    (title/subtitle/link/position) was already admin-only with no security-relevant fields.
    **PASS** (banner allowlist beyond `image` remains an architecture note, not a live
    vulnerability — see Remaining Risks)
13. **CORS** — same-origin + explicit `CORS_ORIGINS` allowlist; never reflects an arbitrary
    `Origin` header; dev localhost origins only added outside production. **PASS**
14. **CSP/security headers** — `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`,
    `Permissions-Policy`, CSP (`object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'`),
    and `Strict-Transport-Security` (production only) all set on every response. `unsafe-inline`
    remains for scripts/styles (documented tradeoff, item 11 above) — **WARNING (unchanged)**,
    everything else **PASS**.
15. **Secrets/.env** — no secrets hardcoded anywhere in the repo; `.env`/`.env.*`/`*.pem`/`*.key`/
    service-account JSON all in `.gitignore`; `.env.example` contains placeholders only. **PASS**
16. **DB indexes/constraints** — every model's `id` field is `unique + index`;
    `Order.authUserId`, `Review.productId`, `Customer.authUserId`/`email`/`phone`,
    `Coupon.code` all indexed; `Wishlist` has a compound unique index on
    `(customerId, productId)`. **PASS**
17. **Error leakage** — `errorHandler` logs full detail server-side only, returns generic
    messages client-side; Mongo `CastError`/`ValidationError`/duplicate-key errors are mapped to
    a generic 400, never surfaced raw. **PASS**
18. **Request/body limits** — `express.json`/`urlencoded` capped at 8MB; review images
    individually capped at 4MB decoded with a 5-image count cap; AI chat prompt capped at 2000
    chars. **PASS**
19. **Production configuration** — `NODE_ENV=production` disables the dev auth fallback,
    disables `DISABLE_RATE_LIMIT` regardless of its value, drops `unsafe-eval` from CSP, and
    enables HSTS; `connectDB()` fails closed (rejects mutations) rather than silently running
    without a database. **PASS**
20. **Mobile/accessibility functional bugs** — not exercised live (no build artifact could be
    produced in this sandbox to test against); no UI files were touched this pass or the prior
    one, per the task's explicit "do not touch UI" constraint, so no new mobile/accessibility
    regression was introduced. **NOT VERIFIED LIVE** (pre-existing scope, unchanged)
21. **Performance** — `Review.find()`/`Order.find()` etc. all hit indexed fields; no unbounded
    `$or` fan-outs found; `getAuraAIConversations` caps at `limit(50)`. No live query-plan
    profiling was possible without a running database. **PASS (by code review only)**

### Verification actually executed this pass
```
$ npm install --no-audit --no-fund
npm error code E403
npm error 403 403 Forbidden - GET https://registry.npmjs.org/yauzl

$ curl -s -o /dev/null -w "%{http_code}" https://registry.npmjs.org/
403

$ npm run build
sh: 1: vite: not found

$ npm audit
npm warn audit 403 Forbidden - POST https://registry.npmjs.org/-/npm/v1/security/audits/quick
Host not in allowlist: registry.npmjs.org.
npm error audit endpoint returned an error
```
`npm audit --offline` was also tried and returned `"0 vulnerabilities"` — **this result is
disregarded as meaningless**: with no cached advisory database and no network access, offline
mode cannot actually check anything against real CVE data; it silently reports zero findings
rather than erroring, which is not the same as a clean audit. This is called out explicitly so a
misleading "0 vulnerabilities" string is never mistaken for a real pass.

`phase2-test.mjs`, `phase3-test.mjs`, `publish-gate-verify.mjs`, and `final-master-recheck.mjs`
all require `mongodb-memory-server` (or its offline fallback) and `firebase-admin` from
`node_modules`, which could not be installed — **none of the four executed**.

What *was* run and passed: `node --check` against all 53 `.js`/`.mjs`/`.cjs` files under
`server/` and `scripts/` (including every file touched across both passes) — **0 syntax errors**.

### VERIFICATION BLOCKED — NOT A CODE FAILURE
`npm install`, `npm audit`, `npm run build`, and all four test suites are blocked by this
sandbox's outbound network restriction (registry.npmjs.org returns 403 / "Host not in
allowlist"), not by any defect in the code. Run the block above in an environment with registry
access to get real PASS/FAIL results before publishing.

### FINAL REPORT

```
CRITICAL: 0
HIGH: 0
MEDIUM: 0
LOW: 0

SECURITY: PASS (by full static/code-level review across all 21 checklist items above;
                no live penetration test was performed)
BUILD: NOT RUN — VERIFICATION BLOCKED, NOT A CODE FAILURE (vite/esbuild not installed,
                 no network access to install them)
NPM AUDIT: NOT RUN — VERIFICATION BLOCKED, NOT A CODE FAILURE (registry access denied;
                     the offline "0 vulnerabilities" result is not a real check, see above)
E2E TESTS: 0/0 — VERIFICATION BLOCKED, NOT A CODE FAILURE (mongodb-memory-server /
                 firebase-admin / full node_modules unavailable)
PUBLISH GATE: NOT RUN — VERIFICATION BLOCKED, NOT A CODE FAILURE (same dependency
              requirement as above)

UI CHANGED: NO
FILES DELETED: NO
FILES RENAMED/MOVED: NO

REMAINING WARNINGS:
- unsafe-inline remains in CSP for scripts/styles (documented architectural tradeoff, item 14)
- Review/product/promo images are stored as base64 in MongoDB rather than object storage
  (architectural, not a live vulnerability)
- Banner create/save still spreads req.body beyond the (now-validated) image field; low risk
  since the route is admin-only and no other field on that model is security-relevant
- ~50 leftover one-off patch_*/fix_*/test_*.cjs scripts in repo root (hygiene only, not
  imported by the runtime build)
- Mobile/accessibility functional behavior not verified live (no build artifact available in
  this sandbox); no UI files were modified in this or the prior pass

FINAL VERDICT:
PRODUCTION READY: NO — VERIFICATION BLOCKED, NOT A CODE FAILURE.
Every check executable without network access (full static/manual code review across all 21
checklist areas, node --check on all 53 server/script files) found zero CRITICAL/HIGH/MEDIUM/LOW
issues remaining open. But "production ready" requires an actual successful npm install, build,
npm audit, and E2E/publish-gate run, none of which could be executed in this offline sandbox.
Run the command block above in a network-connected environment; if all four suites pass, the
build succeeds, and npm audit shows no unaddressed high/critical advisories, this codebase is
ready to publish as-is.
```
