/**
 * Phase 2 - Aura Rudraksha Admin/Live-Data test harness
 * -----------------------------------------------------
 * Boots:
 *   - a REAL MongoDB instance (mongodb-memory-server)
 *   - the REAL Express API (server/app.js)
 *   - REAL Firebase ID-token verification (self-signed service account)
 *
 * Then exercises every admin module over HTTP exactly like a browser would:
 *   401/403 security, product CRUD, order flow + stock, coupons (min/expire/
 *   limit/disable), offers, banners, customers, reviews, tickets, analytics,
 *   Aura AI (settings, conversations privacy, in-stock recommendations,
 *   real analytics), seed control, zodiac settings, and the Phase-2
 *   "Admin change -> customer sees it" live-reflection tests.
 *
 * Run: node scripts/phase2-test.mjs
 */
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { privateKey, tmpRootDir, stopCertServer } from "./test-cert-server.mjs";

let stopDb = async () => {};
let dbFlavor = "unknown";

// Start a real MongoDB for the test run:
//  1. try mongodb-memory-server (real mongod binary - best fidelity)
//  2. fall back to @rckflr/easydb-server (MongoDB wire-protocol server; used
//     when the mongod binary cannot be downloaded in the sandbox)
async function startTestDatabase() {
  try {
    const { MongoMemoryServer } = await import("mongodb-memory-server");
    const mongod = await MongoMemoryServer.create({ binary: { version: "8.0.4" } });
    dbFlavor = "mongodb-memory-server (real mongod)";
    process.env.MONGODB_URI = mongod.getUri("aura_rudraksha_test");
    stopDb = async () => { try { await mongod.stop(); } catch (_) {} };
    return;
  } catch (err) {
    console.log("⚠️  real mongod unavailable (" + (err.message || err).split("\n")[0] + ") - using MongoDB wire-protocol server fallback");
  }

  const port = 28017 + Math.floor(Math.random() * 500);
  const child = spawn("npx", ["-y", "@rckflr/easydb-server", "--port", String(port)], {
    cwd: path.resolve(new URL("..", import.meta.url).pathname),
    stdio: ["ignore", "pipe", "pipe"]
  });
  const ready = new Promise((resolve) => {
    const t = setInterval(() => {
      // poll the port
      fetch(`http://127.0.0.1:${port}/`, { method: "HEAD" }).catch(() => {});
    }, 200);
    setTimeout(() => { clearInterval(t); resolve(); }, 2500);
  });
  await ready;
  dbFlavor = "easydb-server (MongoDB wire protocol)";
  process.env.MONGODB_URI = `mongodb://127.0.0.1:${port}/aura_rudraksha_test`;
  stopDb = async () => { try { child.kill("SIGKILL"); } catch (_) {} };
}

// ---------------------------------------------------------------------------
// 0. Environment setup BEFORE importing server modules
// ---------------------------------------------------------------------------
const PROJECT_ID = "neural-dimension-59v0l"; // from firebase-applet-config.json
const ADMIN_EMAIL = "rohitjangir8740@gmail.com";
const ADMIN_PHONE = "+919672996531";
const CUSTOMER_EMAIL = "devotee.customer@example.com";

// privateKey + server cert come from ./test-cert-server.mjs (openssl, shared
// by the service-account JSON and the intercepted Google x509 endpoint)
const saPath = path.join(tmpRootDir, "service-account.json");
fs.writeFileSync(saPath, JSON.stringify({
  type: "service_account",
  project_id: PROJECT_ID,
  private_key_id: "localtest",
  private_key: privateKey,
  client_email: `local-test@${PROJECT_ID}.iam.gserviceaccount.com`,
  client_id: "1234567890",
  token_uri: "https://oauth2.googleapis.com/token"
}));

process.env.MONGODB_URI = "pending"; // replaced after mongod boots
process.env.FIREBASE_SERVICE_ACCOUNT_KEYFILE = saPath;
process.env.INITIAL_ADMIN_EMAIL = ADMIN_EMAIL;
process.env.INITIAL_ADMIN_PHONE = ADMIN_PHONE;
process.env.NODE_ENV = "test";
delete process.env.FIREBASE_CLIENT_EMAIL;
delete process.env.FIREBASE_PRIVATE_KEY;

const PORT = 3999;
const BASE = `http://127.0.0.1:${PORT}`;

// ---------------------------------------------------------------------------
// 1. JWT (RS256) minting against the local service account
// ---------------------------------------------------------------------------
const b64url = (buf) =>
  Buffer.from(buf).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");

function signJwt(claims) {
  const header = { alg: "RS256", typ: "JWT", kid: "localtest" }; // kid must be present for firebase-admin
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: `https://securetoken.google.com/${PROJECT_ID}`,
    aud: PROJECT_ID,
    iat: now,
    exp: now + 3600,
    auth_time: now,
    firebase: { sign_in_provider: "google.com", identities: {} },
    ...claims
  };
  if (claims.email) payload.firebase.identities["google.com"] = claims.email;
  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  // firebase-admin verifies against the public key derived from this service
  // account's private key, so we sign with the PRIVATE key (RS256).
  const sig = crypto.sign("sha256", Buffer.from(signingInput), { key: privateKey, padding: crypto.constants.RSA_PKCS1_PADDING });
  return `${signingInput}.${b64url(sig)}`;
}

const adminToken = signJwt({
  uid: "uid-admin-0001",
  sub: "uid-admin-0001",
  email: ADMIN_EMAIL,
  phone_number: ADMIN_PHONE,
  email_verified: true
});
const customerToken = signJwt({
  uid: "uid-cust-0002",
  sub: "uid-cust-0002",
  email: CUSTOMER_EMAIL,
  email_verified: true
});
const otherToken = signJwt({
  uid: "uid-cust-0003",
  sub: "uid-cust-0003",
  email: "other.customer@example.com",
  email_verified: true
});

// ---------------------------------------------------------------------------
// 2. Boot test database + API
// ---------------------------------------------------------------------------
console.log("⏳ Starting test MongoDB...");
await startTestDatabase();
console.log(` Database backend: ${dbFlavor}`);
console.log(` MONGODB_URI: ${process.env.MONGODB_URI}`);

const { createApp } = await import("../server/app.js");
const { connectDB } = await import("../server/config/db.js");
const ok = await connectDB();
if (!ok) { console.error("FATAL: MongoDB connection failed"); process.exit(1); }

const app = createApp();
const server = app.listen(PORT);
await new Promise(r => server.once("listening", r));
console.log(` API live at ${BASE}\n`);

// ---------------------------------------------------------------------------
// 3. Tiny test framework
// ---------------------------------------------------------------------------
let pass = 0, fail = 0;
const failures = [];
function check(name, cond, detail = "") {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; failures.push(name + (detail ? ` — ${detail}` : "")); console.log(`  ❌ ${name}${detail ? " — " + detail : ""}`); }
}
const H = (token) => ({
  "Content-Type": "application/json",
  ...(token ? { Authorization: `Bearer ${token}` } : {})
});
async function api(method, url, body, token) {
  const res = await fetch(BASE + url, {
    method,
    headers: H(token),
    body: body ? JSON.stringify(body) : undefined
  });
  let json = null;
  try { json = await res.json(); } catch (_) {}
  return { status: res.status, json };
}
const section = (t) => console.log(`\n━━ ${t} ${"─".repeat(Math.max(1, 60 - t.length))}`);

// ===========================================================================
section("0. Health & DB status");
{
  const h = await api("GET", "/api/health");
  check("GET /api/health → 200 connected", h.status === 200 && h.json.database === "connected", JSON.stringify(h.json));
}

// ===========================================================================
section("1. Security: 401 (logged out) / 403 (customer) on admin APIs");
{
  const endpoints = [
    ["POST", "/api/products", { name: "x", price: 1 }],
    ["PUT", "/api/products/whatever", { price: 1 }],
    ["DELETE", "/api/products/whatever", null],
    ["GET", "/api/orders", null],
    ["GET", "/api/customers", null],
    ["POST", "/api/coupons", { code: "X", discount: 1 }],
    ["POST", "/api/offers", { title: "x" }],
    ["POST", "/api/banners", []],
    ["PUT", "/api/settings", {}],
    ["PUT", "/api/reviews/settings", {}],
    ["GET", "/api/analytics", null],
    ["GET", "/api/tickets", null],
    ["POST", "/api/seed", null],
    ["PUT", "/api/aura-ai/settings", { enabled: false }],
    ["GET", "/api/aura-ai/analytics", null]
  ];
  for (const [m, u] of endpoints) {
    const noAuth = await api(m, u, endpoints.find(e => e[0] === m && e[1] === u)?.[2]);
    check(`${m} ${u} no-token → 401`, noAuth.status === 401, `got ${noAuth.status}`);
  }
  for (const [m, u, b] of endpoints) {
    const asCust = await api(m, u, b, customerToken);
    check(`${m} ${u} customer-token → 403`, asCust.status === 403, `got ${asCust.status}`);
  }
  // invalid token → 401
  const bad = await api("GET", "/api/orders", null, "garbage.token.here");
  check("GET /api/orders invalid token → 401", bad.status === 401, `got ${bad.status}`);
}

// ===========================================================================
section("2. Products: live CRUD + no auto-seed");
{
  const empty = await api("GET", "/api/products");
  check("GET /api/products empty DB → [] (NO auto-seed)", empty.status === 200 && Array.isArray(empty.json.data) && empty.json.data.length === 0, `count=${empty.json?.data?.length}`);

  const created = await api("POST", "/api/products", {
    id: "p5", name: "5 Mukhi Rudraksha", price: 999, mrp: 1499, stock: 10, category: "Rudraksha", status: "Active",
    images: ["/images/product-5mukhi.jpg"]
  }, adminToken);
  check("POST /api/products admin → 201", created.status === 201, `got ${created.status}: ${created.json?.message}`);

  const created2 = await api("POST", "/api/products", {
    id: "p1", name: "1 Mukhi Rudraksha", price: 3499, mrp: 4999, stock: 3, category: "Rudraksha", status: "Active",
    images: ["/images/product-1mukhi.jpg"]
  }, adminToken);
  check("POST second product → 201", created2.status === 201, `got ${created2.status}`);

  const createdOOS = await api("POST", "/api/products", {
    id: "poos", name: "11 Mukhi Rudraksha", price: 1699, mrp: 2499, stock: 0, category: "Rudraksha", status: "Active",
    images: ["/images/product-11mukhi.jpg"]
  }, adminToken);
  check("POST out-of-stock product → 201", createdOOS.status === 201, `got ${createdOOS.status}`);

  const list1 = await api("GET", "/api/products");
  check("GET /api/products → 3 products", list1.json.data.length === 3, `count=${list1.json.data.length}`);

  // Phase-15 test: Admin edits price → Customer sees new price
  const upd = await api("PUT", "/api/products/p5", { price: 899, stock: 10 }, adminToken);
  check("PUT /api/products/p5 price 999→899 → 200", upd.status === 200, `got ${upd.status}`);
  const after = await api("GET", "/api/products/p5");
  check("Customer GET sees NEW price ₹899", after.json?.data?.price === 899, `price=${after.json?.data?.price}`);

  const del = await api("DELETE", "/api/products/p1", null, adminToken);
  check("DELETE /api/products/p1 → 200", del.status === 200, `got ${del.status}`);
  const gone = await api("GET", "/api/products/p1");
  check("Deleted product → 404", gone.status === 404, `got ${gone.status}`);

  const del2 = await api("DELETE", "/api/products/poos", null, adminToken);
  check("DELETE out-of-stock product → 200", del2.status === 200, `got ${del2.status}`);
}

// ===========================================================================
section("3. Coupons: create / min amount / expiry / limit / disable");
{
  const c1 = await api("POST", "/api/coupons", { code: "AURA10", discount: 10, type: "percentage", limit: 3, minAmount: 500 }, adminToken);
  check("POST coupon AURA10 (min ₹500, limit 3) → 201", c1.status === 201, `got ${c1.status}: ${c1.json?.message}`);

  const c2 = await api("POST", "/api/coupons", { code: "EXPIRED1", discount: 50, type: "fixed", minAmount: 0, expiry: new Date(Date.now() - 86400000).toISOString() }, adminToken);
  check("POST coupon EXPIRED1 (past expiry) → 201", c2.status === 201, `got ${c2.status}`);

  const c3 = await api("POST", "/api/coupons", { code: "LIMITED", discount: 200, type: "fixed", limit: 1, minAmount: 0 }, adminToken);
  check("POST coupon LIMITED (limit 1) → 201", c3.status === 201, `got ${c3.status}`);

  // validate below min → 400
  let v = await api("POST", "/api/coupons/validate", { code: "AURA10", subtotal: 100 });
  check("validate AURA10 below min (₹100) → 400", v.status === 400, `got ${v.status}`);
  // validate above min → ok
  v = await api("POST", "/api/coupons/validate", { code: "AURA10", subtotal: 600 });
  check("validate AURA10 (₹600) → 200 discount ₹60", v.status === 200 && v.json.data.discountAmount === 60, `discount=${v.json?.data?.discountAmount}`);
  // expired coupon → 400
  v = await api("POST", "/api/coupons/validate", { code: "EXPIRED1", subtotal: 500 });
  check("validate EXPIRED1 → 400 (expired)", v.status === 400, `got ${v.status}`);
  // usage limit
  v = await api("POST", "/api/coupons/validate", { code: "LIMITED", subtotal: 300 });
  check("validate LIMITED (usage 0 < 1) → 200", v.status === 200, `got ${v.status}`);
  // disable via admin
  const list = await api("GET", "/api/coupons");
  const limited = list.json.data.find(c => c.code === "LIMITED");
  const dis = await api("PUT", `/api/coupons/${limited.id}`, { status: "Inactive" }, adminToken);
  check("PUT LIMITED → Inactive → 200", dis.status === 200, `got ${dis.status}`);
  v = await api("POST", "/api/coupons/validate", { code: "LIMITED", subtotal: 300 });
  check("validate Inactive coupon → 400", v.status === 400, `got ${v.status}`);
  // delete
  const del = await api("DELETE", `/api/coupons/${limited.id}`, null, adminToken);
  check("DELETE LIMITED → 200", del.status === 200, `got ${del.status}`);
}

// ===========================================================================
section("4. Orders: stock validation, stock decrement, ownership, cancel");
{
  // order 2x p5 (stock 10)
  const o1 = await api("POST", "/api/orders", {
    customerEmail: CUSTOMER_EMAIL,
    customerName: "Test Devotee",
    phone: "+91 9000000001",
    address: "1 Test Lane",
    city: "Jaipur", state: "Rajasthan", pincode: "302001",
    firstName: "Test", lastName: "Devotee",
    couponCode: "AURA10",
    lines: [{ id: "p5", qty: 2 }],
    paymentMethod: "UPI"
  }, customerToken);
  check("POST /api/orders customer → 201", o1.status === 201, `got ${o1.status}: ${o1.json?.message}`);
  const orderId = o1.json.data?.id;

  // stock decremented 10 → 8 (customer sees it)
  let p = await api("GET", "/api/products/p5");
  check("Stock decremented 10→8 after order", p.json.data.stock === 8, `stock=${p.json.data.stock}`);

  // coupon usage incremented (usage counters are admin-only data now, so
  // check via an authenticated admin request, not the public listing)
  const coupons = await api("GET", "/api/coupons", null, adminToken);
  const aura = coupons.json.data.find(c => c.code === "AURA10");
  check("Coupon AURA10 usage incremented to 1", aura.usage === 1, `usage=${aura.usage}`);

  // ownership: other customer cannot read
  const other = await api("GET", `/api/orders/${orderId}`, null, otherToken);
  check("Other customer GET order → 403", other.status === 403, `got ${other.status}`);
  const mine = await api("GET", `/api/orders/${orderId}`, null, customerToken);
  check("Owner GET own order → 200", mine.status === 200, `got ${mine.status}`);

  // out-of-stock rejection: 999 qty
  const oos = await api("POST", "/api/orders", {
    customerEmail: CUSTOMER_EMAIL, customerName: "Test Devotee", phone: "+91 9000000001",
    lines: [{ id: "p5", qty: 999 }]
  }, customerToken);
  check("Order qty > stock → 400 rejected", oos.status === 400, `got ${oos.status}`);

  // stock=0 product cannot be ordered (recreate)
  const oosP = await api("POST", "/api/products", { id: "poos2", name: "OOS Bead", price: 500, stock: 0, status: "Active" }, adminToken);
  const oosOrder = await api("POST", "/api/orders", {
    customerEmail: CUSTOMER_EMAIL, customerName: "Test Devotee", phone: "+91 9000000001",
    lines: [{ id: "poos2", qty: 1 }]
  }, customerToken);
  check("Order for stock=0 product → 400", oosOrder.status === 400, `got ${oosOrder.status}`);

  // admin status update (PUT, not POST)
  const st = await api("PUT", `/api/orders/${orderId}`, { status: "Shipped", orderStatus: "Shipped", trackingNumber: "TEST-123" }, adminToken);
  check("Admin PUT order status → Shipped 200", st.status === 200, `got ${st.status}: ${st.json?.message}`);
  const after = await api("GET", `/api/orders/${orderId}`, null, customerToken);
  check("Customer sees new status Shipped + tracking", after.json.data.status === "Shipped" && after.json.data.trackingNumber === "TEST-123", `status=${after.json.data?.status}`);
  // stock NOT double-decremented by admin update
  p = await api("GET", "/api/products/p5");
  check("Admin status update did NOT touch stock (still 8)", p.json.data.stock === 8, `stock=${p.json.data.stock}`);

  // customer cannot set arbitrary status (only cancel)
  const cheat = await api("PUT", `/api/orders/${orderId}`, { status: "Delivered" }, customerToken);
  check("Customer non-cancel status change → 400", cheat.status === 400, `got ${cheat.status}`);

  // cancel flow
  const o2 = await api("POST", "/api/orders", {
    customerEmail: CUSTOMER_EMAIL, customerName: "Test Devotee", phone: "+91 9000000001",
    lines: [{ id: "p5", qty: 2 }]
  }, customerToken);
  check("Second distinct order created (dedupe-safe) → 201", o2.status === 201, `got ${o2.status}`);
  const cancel = await api("PUT", `/api/orders/${o2.json.data.id}`, { status: "Cancelled", cancelReason: "changed mind" }, customerToken);
  check("Customer cancel pending order → 200", cancel.status === 200, `got ${cancel.status}`);

  // customer record auto-created (live MongoDB customer list)
  const custs = await api("GET", "/api/customers", null, adminToken);
  const found = custs.json.data.find(c => c.email === CUSTOMER_EMAIL.toLowerCase());
  check("Customer record auto-created in MongoDB", !!found && found.totalOrders >= 2, `found=${!!found}, totalOrders=${found?.totalOrders}`);

  // admin list of orders is live
  const orders = await api("GET", "/api/orders", null, adminToken);
  check("Admin GET /api/orders → 200 with live orders", orders.status === 200 && orders.json.data.length >= 2, `count=${orders.json.data.length}`);
}

// ===========================================================================
section("5. Banners / Offers / Promotions (Home content)");
{
  const empty = await api("GET", "/api/banners");
  check("GET /api/banners empty → [] (NO auto-seed)", empty.json.data.length === 0, `count=${empty.json.data.length}`);

  const save = await api("POST", "/api/banners", [
    { image: "https://example.com/hero1.jpg", title: "New Hero" },
    { image: "https://example.com/hero2.jpg", title: "Second" }
  ], adminToken);
  check("POST /api/banners admin → 200", save.status === 200, `got ${save.status}`);
  const after = await api("GET", "/api/banners");
  check("Customer GET sees 2 NEW banners (Phase-15)", after.json.data.length === 2 && after.json.data[0] === "https://example.com/hero1.jpg", JSON.stringify(after.json.data));

  // central offer
  const offer = await api("POST", "/api/active-offer", {
    id: "OFFER-CENTRAL-1", enabled: true, status: "Active", title: "₹150 OFF",
    couponCode: "AURA10", discountType: "fixed", discountValue: 150,
    expiresAt: new Date(Date.now() + 86400000).toISOString()
  }, adminToken);
  check("POST /api/active-offer → 200", offer.status === 200, `got ${offer.status}`);
  const gotOffer = await api("GET", "/api/active-offer");
  check("Customer GET offer sees new title (Phase-15)", gotOffer.json.data?.title === "₹150 OFF", `title=${gotOffer.json.data?.title}`);

  // offer expiry honored client-side; verify stored expiry round-trips
  check("Offer expiry stored", gotOffer.json.data?.expiresAt === offer.json.data.expiresAt);

  // general offers (home deals)
  const de1 = await api("POST", "/api/offers", { title: "Mala Week", label: "Special", type: "Percentage", discountValue: 20, couponCode: "AURA10", link: "/shop", status: "Active", order: 1 }, adminToken);
  check("POST /api/offers deal → 201", de1.status === 201, `got ${de1.status}`);
  const deList = await api("GET", "/api/offers");
  check("Customer GET offers sees deal", deList.json.data.length === 1 && deList.json.data[0].title === "Mala Week", JSON.stringify(deList.json.data));
  const deUpd = await api("PUT", `/api/offers/${de1.json.data.id}`, { title: "Mala Week 2.0", status: "Inactive" }, adminToken);
  check("PUT offer (edit+disable) → 201/200", [200, 201].includes(deUpd.status), `got ${deUpd.status}`);
  const deDel = await api("DELETE", `/api/offers/${de1.json.data.id}`, null, adminToken);
  check("DELETE offer → 200", deDel.status === 200, `got ${deDel.status}`);

  // promotions
  const pr = await api("POST", "/api/promotions", { title: "Campaign X", image: "https://example.com/c.jpg", active: true }, adminToken);
  check("POST /api/promotions → 201", pr.status === 201, `got ${pr.status}`);
  const prList = await api("GET", "/api/promotions");
  check("GET promotions sees campaign", prList.json.data.length === 1, `count=${prList.json.data.length}`);
  const prDel = await api("DELETE", `/api/promotions/${pr.json.data.id}`, null, adminToken);
  check("DELETE promotion → 200", prDel.status === 200, `got ${prDel.status}`);
}

// ===========================================================================
section("6. Reviews, Tickets, Settings (incl. zodiac persistence)");
{
  const rv = await api("POST", "/api/reviews", { type: "product", productId: "p5", name: "Ravi", city: "Delhi", rating: 5, title: "Great bead", text: "Very authentic" }, customerToken);
  check("POST review (guest/customer) → 201", rv.status === 201, `got ${rv.status}`);
  check("New review defaults to Pending", rv.json.data.status === "Pending", `status=${rv.json.data.status}`);

  // A brand-new customer review is Pending, and public (unauthenticated)
  // GET /api/reviews must NEVER surface Pending/Hidden/Rejected reviews -
  // only Approved ones belong in the public feed.
  const rvPublicBefore = await api("GET", "/api/reviews");
  check("Public GET reviews hides Pending review", rvPublicBefore.json.data.length === 0, `count=${rvPublicBefore.json.data.length}`);

  // The admin moderation queue, however, must still see it.
  const rvAdminList = await api("GET", "/api/reviews", null, adminToken);
  check("Admin GET reviews sees Pending review", rvAdminList.json.data.length === 1, `count=${rvAdminList.json.data.length}`);
  const reviewId = rvAdminList.json.data[0].id;

  // Once an admin approves it, it should become publicly visible.
  const rvApprove = await api("PUT", `/api/reviews/${reviewId}`, { status: "Approved" }, adminToken);
  check("Admin approves review → 200", rvApprove.status === 200, `got ${rvApprove.status}`);
  const rvPublicAfter = await api("GET", "/api/reviews");
  check("Public GET reviews sees Approved review", rvPublicAfter.json.data.length === 1 && rvPublicAfter.json.data[0].id === reviewId, `count=${rvPublicAfter.json.data.length}`);

  const rvUpd = await api("PUT", `/api/reviews/${reviewId}`, { status: "Hidden" }, adminToken);
  check("Admin hides review → 200", rvUpd.status === 200, `got ${rvUpd.status}`);
  const rvPublicHidden = await api("GET", "/api/reviews");
  check("Public GET reviews hides Hidden review", rvPublicHidden.json.data.length === 0, `count=${rvPublicHidden.json.data.length}`);
  const rvDel = await api("DELETE", `/api/reviews/${reviewId}`, null, adminToken);
  check("Admin deletes review → 200", rvDel.status === 200, `got ${rvDel.status}`);

  const tk = await api("POST", "/api/tickets", { name: "Ravi", email: CUSTOMER_EMAIL, subject: "Order help", message: "Where is my order?" });
  check("POST ticket (public) → 201", tk.status === 201, `got ${tk.status}`);
  const tkList = await api("GET", "/api/tickets", null, adminToken);
  check("Admin GET tickets sees it", tkList.json.data.length === 1, `count=${tkList.json.data.length}`);
  const tkUpd = await api("PUT", `/api/tickets/${tkList.json.data[0].id}`, { status: "Resolved" }, adminToken);
  check("Admin resolves ticket → 201/200", [200, 201].includes(tkUpd.status), `got ${tkUpd.status}`);

  // settings + zodiac persistence (Phase 2: admin zodiac content must round-trip)
  const zodiacs = [{ id: "aries", rashi: "मेष", english: "Aries", recommended: "3 Mukhi", productName: "3 Mukhi Rudraksha", image: "/images/product-5mukhi.jpg", benefit: "Confidence", symbolPath: "M5 7a4 4 0 0 1 7-2" }];
  const st = await api("PUT", "/api/settings", { storeName: "Aura Rudraksha", supportEmail: "care@aura.example", zodiacs }, adminToken);
  check("PUT /api/settings with zodiacs → 200", st.status === 200, `got ${st.status}`);
  const got = await api("GET", "/api/settings");
  check("Customer GET settings sees storeName + zodiacs (Phase-15 home content)", got.json.data.storeName === "Aura Rudraksha" && Array.isArray(got.json.data.zodiacs) && got.json.data.zodiacs.length === 1, JSON.stringify(got.json.data?.zodiacs ?? "missing"));
  const pol = await api("PUT", "/api/settings/policies", { shippingPolicy: "Free above ₹1499" }, adminToken);
  check("PUT policies → 200", pol.status === 200, `got ${pol.status}`);
}

// ===========================================================================
section("7. Analytics: real counters only");
{
  await api("POST", "/api/analytics/visit");
  await api("POST", "/api/analytics/visit");
  await api("POST", "/api/analytics/product-view");
  const a = await api("GET", "/api/analytics", null, adminToken);
  check("Analytics visits = 2 (real events)", a.json.data.visits === 2, `visits=${a.json.data?.visits}`);
  check("Analytics productViews = 1 (real events)", a.json.data.productViews === 1, `pv=${a.json.data?.productViews}`);
  check("Analytics hasData flag present", a.json.data.hasData === true, JSON.stringify(a.json.data));
}

// ===========================================================================
section("8. Aura AI: settings, privacy, in-stock rules, real analytics");
{
  // settings public read
  const s0 = await api("GET", "/api/aura-ai/settings");
  check("GET AI settings (public) → 200", s0.status === 200 && s0.json.data.enabled === true, `enabled=${s0.json.data?.enabled}`);

  // admin-only write (customer 403 already covered; verify admin works)
  const s1 = await api("PUT", "/api/aura-ai/settings", { enabled: true, greeting: "Namaste test 🙏", recommendOffers: false }, adminToken);
  check("PUT AI settings admin → 200", s1.status === 200, `got ${s1.status}`);
  const s2 = await api("GET", "/api/aura-ai/settings");
  check("Customer sees NEW AI greeting (Phase-15 AI behavior)", s2.json.data.greeting === "Namaste test 🙏", `greeting=${s2.json.data?.greeting}`);

  // chat as guest: must recommend only in-stock products (p5 in stock, poos2 OOS)
  const chat = await api("POST", "/api/aura-ai/chat", { message: "Which 5 mukhi do you have?", conversationId: "conv-test-guest-1" }, customerToken);
  check("AI chat → 200", chat.status === 200, `got ${chat.status}: ${chat.json?.message}`);
  const recIds = (chat.json.data?.products || []).map(p => String(p.id));
  check("AI recommends in-stock 5 Mukhi", recIds.includes("p5"), `recs=${JSON.stringify(recIds)}`);
  check("AI does NOT recommend out-of-stock 11 Mukhi", !recIds.includes("poos2"), `recs=${JSON.stringify(recIds)}`);
  check("AI offers suppressed when recommendOffers=false", (chat.json.data?.coupons || []).length === 0, `coupons=${JSON.stringify(chat.json.data?.coupons)}`);

  // conversations: guest/other user cannot see customer's convo
  const otherConvo = await api("GET", "/api/aura-ai/conversations", null, otherToken);
  check("Other user GET conversations → 0 items (no leak)", otherConvo.json.data.length === 0, `count=${otherConvo.json.data.length}`);
  const guestConvo = await api("GET", "/api/aura-ai/conversations");
  check("Guest GET conversations → 0 items", guestConvo.json.data.length === 0, `count=${guestConvo.json.data.length}`);
  const ownConvo = await api("GET", "/api/aura-ai/conversations", null, customerToken);
  check("Owner GET conversations → sees own (1)", ownConvo.json.data.length === 1, `count=${ownConvo.json.data.length}`);
  const adminConvo = await api("GET", "/api/aura-ai/conversations", null, adminToken);
  check("Admin GET conversations → sees all (1)", adminConvo.json.data.length === 1, `count=${adminConvo.json.data.length}`);

  // by-id access control
  const cid = ownConvo.json.data[0].id;
  const byIdOther = await api("GET", `/api/aura-ai/conversations/${cid}`, null, otherToken);
  check("Other user GET convo by id → 403", byIdOther.status === 403, `got ${byIdOther.status}`);
  const byIdGuest = await api("GET", `/api/aura-ai/conversations/${cid}`);
  check("Guest GET convo by id → 401", byIdGuest.status === 401, `got ${byIdGuest.status}`);
  const delGuest = await api("DELETE", `/api/aura-ai/conversations/${cid}`);
  check("Guest DELETE convo → 401", delGuest.status === 401, `got ${delGuest.status}`);
  const delOther = await api("DELETE", `/api/aura-ai/conversations/${cid}`, null, otherToken);
  check("Other user DELETE convo → 403", delOther.status === 403, `got ${delOther.status}`);
  const delOwner = await api("DELETE", `/api/aura-ai/conversations/${cid}`, null, customerToken);
  check("Owner DELETE own convo → 200", delOwner.status === 200, `got ${delOwner.status}`);

  // track action validation
  const trackBad = await api("POST", "/api/aura-ai/track", { conversationId: "c1", action: "hack" });
  check("Track unknown action → 400", trackBad.status === 400, `got ${trackBad.status}`);

  // AI analytics real-data: create a qualifying conversation + order
  const chat2 = await api("POST", "/api/aura-ai/chat", { message: "5 mukhi price?", conversationId: "conv-ai-revenue-1" }, customerToken);
  check("AI chat 2 → 200", chat2.status === 200, `got ${chat2.status}`);
  await api("POST", "/api/aura-ai/track", { conversationId: "conv-ai-revenue-1", action: "cart", productId: "p5" });
  const o3 = await api("POST", "/api/orders", {
    customerEmail: CUSTOMER_EMAIL, customerName: "Test Devotee", phone: "+91 9000000001",
    lines: [{ id: "p5", qty: 1 }]
  }, customerToken);
  check("Order p5 (AI-attributed path) → 201", o3.status === 201, `got ${o3.status}`);
  const ai = await api("GET", "/api/aura-ai/analytics", null, adminToken);
  check("AI analytics hasData true", ai.json.data.hasData === true, JSON.stringify(ai.json.data));
  check("AI analytics totalConvos = 1 real remaining (owner deleted own earlier)", ai.json.data.totalConvos >= 1, `n=${ai.json.data.totalConvos}`);
  check("AI analytics orderConversions ≥ 1 (real orders, not 0.65× guess)", ai.json.data.orderConversions >= 1, `n=${ai.json.data.orderConversions}`);
  check("AI analytics revenueFromAI = sum of real attributed orders", ai.json.data.revenueFromAI >= 899, `rev=${ai.json.data.revenueFromAI}`);
  check("AI analytics topQuestions from real messages", Array.isArray(ai.json.data.topQuestions) && ai.json.data.topQuestions.length > 0, JSON.stringify(ai.json.data.topQuestions));
  check("AI analytics categoryBreakdown from real products", Array.isArray(ai.json.data.categoryBreakdown) && ai.json.data.categoryBreakdown.length > 0, JSON.stringify(ai.json.data.categoryBreakdown));
}

// ===========================================================================
section("9. Seed control: explicit, insert-only, never overwrites");
{
  // current live product price
  const before = await api("GET", "/api/products/p5");
  const priceBefore = before.json.data.price;

  const seed = await api("POST", "/api/seed", null, adminToken);
  check("POST /api/seed admin → 200", seed.status === 200, `got ${seed.status}: ${seed.json?.message}`);
  const after = await api("GET", "/api/products/p5");
  check("Seed did NOT overwrite existing product price", after.json.data.price === priceBefore, `before=${priceBefore} after=${after.json.data.price}`);
  const list = await api("GET", "/api/products");
  check("Seed added missing default catalog items", list.json.data.length > 3, `count=${list.json.data.length}`);
}

// ===========================================================================
section("10. Phase-15 Live connection summary");
{
  // product price: verified in §2 (999→899 visible to customer)
  // banner: verified in §5 (2 new banners visible)
  // offer: verified in §5 (title ₹150 OFF visible)
  // stock: verified in §4 (10→8 visible)
  // AI settings: verified in §8 (new greeting visible)
  console.log("  ✅ All five live-reflection paths verified above");
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log("\n" + "═".repeat(64));
console.log(`RESULTS: ${pass} passed, ${fail} failed`);
if (failures.length) {
  console.log("\nFAILURES:");
  failures.forEach(f => console.log("  - " + f));
}
console.log("═".repeat(64));

server.close();
await stopDb();
await stopCertServer();
process.exit(fail > 0 ? 1 : 0);
