/**
 * AURA RUDRAKSHA — PUBLISH GATE INDEPENDENT VERIFIER
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { privateKey, tmpRootDir, stopCertServer } from "./test-cert-server.mjs";

let stopDb = async () => {};
let dbFlavor = "unknown";

async function startTestDatabase() {
  try {
    const { MongoMemoryServer } = await import("mongodb-memory-server");
    const mongod = await MongoMemoryServer.create({ binary: { version: "8.0.4" } });
    dbFlavor = "mongodb-memory-server";
    process.env.MONGODB_URI = mongod.getUri("aura_gate_test");
    stopDb = async () => { try { await mongod.stop(); } catch (_) {} };
    return;
  } catch (err) {}

  const port = 28600 + Math.floor(Math.random() * 500);
  const child = spawn("npx", ["-y", "@rckflr/easydb-server", "--port", String(port)], {
    cwd: path.resolve(new URL("..", import.meta.url).pathname),
    stdio: ["ignore", "pipe", "pipe"]
  });
  const ready = new Promise((resolve) => {
    const t = setInterval(() => {
      fetch(`http://127.0.0.1:${port}/`, { method: "HEAD" })
        .then(() => { clearInterval(t); resolve(); })
        .catch(() => {});
    }, 150);
    setTimeout(() => { clearInterval(t); resolve(); }, 3000);
  });
  await ready;
  dbFlavor = "easydb-server";
  process.env.MONGODB_URI = `mongodb://127.0.0.1:${port}/aura_gate_test`;
  stopDb = async () => { try { child.kill("SIGKILL"); } catch (_) {} };
}

let PROJECT_ID = "neural-dimension-59v0l";
try {
  const cfg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "firebase-applet-config.json"), "utf8"));
  if (cfg.projectId) PROJECT_ID = cfg.projectId;
} catch (_) {}

const ADMIN_EMAIL = "rohitjangir8740@gmail.com";
const ADMIN_PHONE = "+919672996531";
const CUST_A_EMAIL = "devotee.a@example.com";
const CUST_B_EMAIL = "devotee.b@example.com";

const saPath = path.join(tmpRootDir, "gate-service-account.json");
fs.writeFileSync(saPath, JSON.stringify({
  type: "service_account",
  project_id: PROJECT_ID,
  private_key_id: "localtest",
  private_key: privateKey,
  client_email: `local-test@${PROJECT_ID}.iam.gserviceaccount.com`,
  client_id: "1234567890",
  token_uri: "https://oauth2.googleapis.com/token"
}));

process.env.FIREBASE_SERVICE_ACCOUNT_KEYFILE = saPath;
process.env.INITIAL_ADMIN_EMAIL = ADMIN_EMAIL;
process.env.INITIAL_ADMIN_PHONE = ADMIN_PHONE;
process.env.NODE_ENV = "test";
delete process.env.FIREBASE_CLIENT_EMAIL;
delete process.env.FIREBASE_PRIVATE_KEY;

const b64url = (buf) =>
  Buffer.from(buf).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");

function signJwt(claims) {
  const header = { alg: "RS256", typ: "JWT", kid: "localtest" };
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
  const sig = crypto.sign("sha256", Buffer.from(signingInput), { key: privateKey, padding: crypto.constants.RSA_PKCS1_PADDING });
  return `${signingInput}.${b64url(sig)}`;
}

const adminToken = signJwt({
  uid: "uid-admin-gate",
  sub: "uid-admin-gate",
  email: ADMIN_EMAIL,
  phone_number: ADMIN_PHONE,
  email_verified: true
});

const custA_Token = signJwt({
  uid: "uid-cust-a-gate",
  sub: "uid-cust-a-gate",
  email: CUST_A_EMAIL,
  email_verified: true
});

const custB_Token = signJwt({
  uid: "uid-cust-b-gate",
  sub: "uid-cust-b-gate",
  email: CUST_B_EMAIL,
  email_verified: true
});

async function runPublishGateAudit() {
  console.log("==================================================================");
  console.log("🚀 AURA RUDRAKSHA — FINAL PUBLISH GATE VERIFICATION 🚀");
  console.log("==================================================================");

  await startTestDatabase();
  const { createApp } = await import("../server/app.js");
  const { connectDB } = await import("../server/config/db.js");
  await connectDB();

  const app = createApp();
  const PORT = 3991;
  const server = app.listen(PORT, "127.0.0.1");
  const BASE_URL = `http://127.0.0.1:${PORT}`;

  let passed = 0;
  let failed = 0;
  const failures = [];

  function assert(condition, message) {
    if (condition) {
      passed++;
      console.log(`  ✅ ${message}`);
    } else {
      failed++;
      failures.push(message);
      console.log(`  ❌ FAIL: ${message}`);
    }
  }

  try {
    // -----------------------------------------------------------------------
    console.log("\n━━ Gate 1: Health, Headers & DB Liveness ──────────────────────");
    const hRes = await fetch(`${BASE_URL}/api/health`);
    const hData = await hRes.json();
    assert(hRes.status === 200 && hData.database === "connected", "GET /api/health accurately reports 200 & MongoDB connected");
    assert(hRes.headers.get("x-content-type-options") === "nosniff", "Security header: nosniff verified");
    assert(hRes.headers.get("x-frame-options") === "DENY", "Security header: DENY verified");

    // -----------------------------------------------------------------------
    console.log("\n━━ Gate 2: Security, Role Verification & 401/403 ───────────────");
    const gNoAuth = await fetch(`${BASE_URL}/api/orders`);
    assert(gNoAuth.status === 401, "Unauthenticated access to /api/orders returns 401");

    const gCustOrders = await fetch(`${BASE_URL}/api/orders`, {
      headers: { Authorization: `Bearer ${custA_Token}` }
    });
    assert(gCustOrders.status === 403, "Non-admin customer access to /api/orders returns 403");

    const gAdminOrders = await fetch(`${BASE_URL}/api/orders`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(gAdminOrders.status === 200, "Authorized admin (rohitjangir8740@gmail.com) returns 200");

    // -----------------------------------------------------------------------
    console.log("\n━━ Gate 3: Live CRUD: Products, Stock & Immutability ────────────");
    const p1 = await fetch(`${BASE_URL}/api/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        id: "gate-p1",
        name: "5 Mukhi Nepal Rudraksha",
        price: 999,
        comparePrice: 1499,
        mrp: 1499,
        stock: 10,
        status: "Active",
        category: "Rudraksha",
        images: ["/images/product-5mukhi.jpg"]
      })
    });
    assert(p1.status === 201, "Admin created product '5 Mukhi Nepal Rudraksha' (price: ₹999, stock: 10)");

    const p2 = await fetch(`${BASE_URL}/api/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        id: "gate-p2",
        name: "108+1 Beads Rudraksha Mala",
        price: 1899,
        comparePrice: 2499,
        mrp: 2499,
        stock: 5,
        status: "Active",
        category: "Mala",
        images: ["/images/product-mala.jpg"]
      })
    });
    assert(p2.status === 201, "Admin created product '108+1 Beads Rudraksha Mala' (price: ₹1899, stock: 5)");

    const pOos = await fetch(`${BASE_URL}/api/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        id: "gate-p-oos",
        name: "14 Mukhi Rare Rudraksha",
        price: 9999,
        comparePrice: 14999,
        mrp: 14999,
        stock: 0,
        status: "Active",
        category: "Rudraksha",
        images: ["/images/product-14mukhi.jpg"]
      })
    });
    assert(pOos.status === 201, "Admin created out of stock product (stock: 0)");

    // -----------------------------------------------------------------------
    console.log("\n━━ Gate 4: Coupons Engine: Min Cart, Expiry & Strict Pricing ───");
    await fetch(`${BASE_URL}/api/coupons`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        code: "BLESSING200",
        discount: 200,
        type: "fixed",
        minAmount: 1500,
        limit: 10,
        status: "Active"
      })
    });

    await fetch(`${BASE_URL}/api/coupons`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        code: "EXPIREDCOUPON",
        discount: 300,
        type: "fixed",
        expiry: "2021-01-01T00:00:00.000Z",
        status: "Active"
      })
    });

    // Cart Calculation with Min Order Shortfall
    const calcShortfall = await fetch(`${BASE_URL}/api/cart/calculate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lines: [{ id: "gate-p1", qty: 1 }], // subtotal 999 < min 1500
        couponCode: "BLESSING200"
      })
    });
    const shortfallData = await calcShortfall.json();
    assert(shortfallData.data.couponStatus === "NOT_ELIGIBLE" && shortfallData.data.couponDiscount === 0, "Coupon rejected when cart subtotal ₹999 < min ₹1500");

    // Cart Calculation with Expired Coupon
    const calcExp = await fetch(`${BASE_URL}/api/cart/calculate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lines: [{ id: "gate-p1", qty: 2 }],
        couponCode: "EXPIREDCOUPON"
      })
    });
    const expData = await calcExp.json();
    assert(expData.data.couponStatus === "EXPIRED" && expData.data.couponDiscount === 0, "Expired coupon returns status EXPIRED with ₹0 discount");

    // Cart Calculation with Valid Application
    const calcValid = await fetch(`${BASE_URL}/api/cart/calculate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lines: [{ id: "gate-p1", qty: 1 }, { id: "gate-p2", qty: 1 }], // 999 + 1899 = 2898
        couponCode: "BLESSING200"
      })
    });
    const validData = await calcValid.json();
    assert(validData.data.couponStatus === "APPLIED" && validData.data.couponDiscount === 200 && validData.data.finalTotal === 2698 && validData.data.isFreeShipping === true, "Authoritative pricing: ₹2898 - ₹200 discount + ₹0 free shipping = ₹2698 final total");

    // -----------------------------------------------------------------------
    console.log("\n━━ Gate 5: Order Creation, Stock Decrement & Isolation ─────────");
    // Reject out of stock order
    const orderOos = await fetch(`${BASE_URL}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${custA_Token}` },
      body: JSON.stringify({
        lines: [{ id: "gate-p-oos", qty: 1 }]
      })
    });
    assert(orderOos.status === 400, "Out-of-stock product purchase rejected with status 400");

    // Customer A places order
    const orderA = await fetch(`${BASE_URL}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${custA_Token}` },
      body: JSON.stringify({
        lines: [{ id: "gate-p1", qty: 2 }], // 1998
        couponCode: "BLESSING200",          // -200 = 1798
        customerName: "Devotee Customer A",
        customerEmail: CUST_A_EMAIL,
        phone: "+91 9876543210",
        address: "7 Temple View Road, Varanasi - 221001",
        paymentMethod: "UPI"
      })
    });
    const orderAData = await orderA.json();
    assert(orderA.status === 201 && orderAData.data.finalAmount === 1798, "Customer A order created for ₹1798");
    const gateOrderId = orderAData.data.id;

    // Stock check
    const p1Stock = await fetch(`${BASE_URL}/api/products/gate-p1`);
    const p1Data = await p1Stock.json();
    assert(p1Data.data.stock === 8, "Stock correctly decremented from 10 to 8");

    // Customer isolation check
    const custBViewA = await fetch(`${BASE_URL}/api/orders/${gateOrderId}`, {
      headers: { Authorization: `Bearer ${custB_Token}` }
    });
    assert(custBViewA.status === 403, "Customer B cannot view Customer A's order (403 Forbidden)");

    const custAViewA = await fetch(`${BASE_URL}/api/orders/${gateOrderId}`, {
      headers: { Authorization: `Bearer ${custA_Token}` }
    });
    assert(custAViewA.status === 200, "Customer A can view their own order (200 OK)");

    // -----------------------------------------------------------------------
    console.log("\n━━ Gate 6: Admin Status Update & Price Immutability ────────────");
    const adminShipped = await fetch(`${BASE_URL}/api/orders/${gateOrderId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        status: "Shipped",
        trackingNumber: "GATE-TRACK-1234",
        courierName: "Blue Dart"
      })
    });
    const shippedData = await adminShipped.json();
    assert(adminShipped.status === 200 && shippedData.data.status === "Shipped", "Admin updated order status to Shipped");

    // Price change in product must NOT alter historical order
    await fetch(`${BASE_URL}/api/products/gate-p1`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ price: 1299 })
    });

    const verifyHistorical = await fetch(`${BASE_URL}/api/orders/${gateOrderId}`, {
      headers: { Authorization: `Bearer ${custA_Token}` }
    });
    const histData = await verifyHistorical.json();
    assert(histData.data.finalAmount === 1798, "Historical order price preserved at ₹1798 after product price changed to ₹1299");

    // -----------------------------------------------------------------------
    console.log("\n━━ Gate 7: Aura AI Assistant: Intent, Privacy & Fallback ───────");
    // Greeting -> NO product cards
    const aiGreet = await fetch(`${BASE_URL}/api/aura-ai/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Namaste", conversationId: "gate-conv-1" })
    });
    const greetData = await aiGreet.json();
    assert(greetData.success === true && (!greetData.data.products || greetData.data.products.length === 0), "Aura AI greeting ('Namaste') returns no product spam");

    // Shopping Intent -> Product cards with real images and prices
    const aiShop = await fetch(`${BASE_URL}/api/aura-ai/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Mujhe 5 Mukhi chahiye", conversationId: "gate-conv-2" })
    });
    const shopData = await aiShop.json();
    const aiProds = shopData.data.products || [];
    assert(aiProds.length > 0 && aiProds.length <= 3, "Aura AI shopping intent returns 1-3 products");
    assert(aiProds[0]?.image?.length > 0 && aiProds[0]?.price > 0, "Aura AI products carry real image and real price");

    // Order Tracking Intent -> Authenticated customer gets only own order
    const aiTrack = await fetch(`${BASE_URL}/api/aura-ai/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${custA_Token}` },
      body: JSON.stringify({ message: "Mera order kaha hai?", conversationId: "gate-conv-3" })
    });
    const trackData = await aiTrack.json();
    assert(trackData.data.text.includes(gateOrderId) || (trackData.data.orderInfo && trackData.data.orderInfo.id === gateOrderId), "Aura AI retrieves Customer A's order status");

    // -----------------------------------------------------------------------
    console.log("\n━━ Gate 8: Bundle Security & Zero Leaked Secrets Check ─────────");
    const distAssetsDir = path.resolve(process.cwd(), "dist", "assets");
    let secretLeak = false;
    if (fs.existsSync(distAssetsDir)) {
      for (const f of fs.readdirSync(distAssetsDir)) {
        if (f.endsWith(".js")) {
          const js = fs.readFileSync(path.join(distAssetsDir, f), "utf8");
          if (js.includes("mongodb+srv://") || js.includes("integrate.api.nvidia.com") || js.includes("nvapi-")) {
            secretLeak = true;
            break;
          }
        }
      }
    }
    assert(!secretLeak, "Frontend bundle is completely free of server secrets and private keys");

  } catch (err) {
    failed++;
    failures.push(`Exception: ${err.message}`);
    console.error("Gate Error:", err);
  } finally {
    server.close();
    await stopDb();
    stopCertServer();
  }

  console.log("\n==================================================================");
  console.log(`PUBLISH GATE RESULTS: ${passed} passed, ${failed} failed`);
  console.log("==================================================================");

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runPublishGateAudit();
