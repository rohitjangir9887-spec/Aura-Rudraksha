/**
 * AURA RUDRAKSHA — FINAL MASTER RECHECK TEST SUITE
 * Comprehensive end-to-end verification of Phase 1, Phase 2, and Phase 3.
 */

import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
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
    process.env.MONGODB_URI = mongod.getUri("aura_master_test");
    stopDb = async () => { try { await mongod.stop(); } catch (_) {} };
    return;
  } catch (err) {}

  const port = 28500 + Math.floor(Math.random() * 500);
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
  process.env.MONGODB_URI = `mongodb://127.0.0.1:${port}/aura_master_test`;
  stopDb = async () => { try { child.kill("SIGKILL"); } catch (_) {} };
}

// Read PROJECT_ID from firebase-applet-config.json
let PROJECT_ID = "neural-dimension-59v0l";
try {
  const cfg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "firebase-applet-config.json"), "utf8"));
  if (cfg.projectId) PROJECT_ID = cfg.projectId;
} catch (_) {}

const ADMIN_EMAIL = "rohitjangir8740@gmail.com";
const ADMIN_PHONE = "+919672996531";
const CUST_A_EMAIL = "devotee.a@example.com";
const CUST_B_EMAIL = "devotee.b@example.com";

const saPath = path.join(tmpRootDir, "master-service-account.json");
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
  uid: "uid-admin-master",
  sub: "uid-admin-master",
  email: ADMIN_EMAIL,
  phone_number: ADMIN_PHONE,
  email_verified: true
});

const custA_Token = signJwt({
  uid: "uid-cust-a",
  sub: "uid-cust-a",
  email: CUST_A_EMAIL,
  email_verified: true
});

const custB_Token = signJwt({
  uid: "uid-cust-b",
  sub: "uid-cust-b",
  email: CUST_B_EMAIL,
  email_verified: true
});

async function runMasterAudit() {
  console.log("==================================================================");
  console.log("✨ AURA RUDRAKSHA — FINAL MASTER RECHECK TEST HARNESS ✨");
  console.log("==================================================================");
  console.log("⏳ Starting isolated database & server...");
  
  await startTestDatabase();
  console.log(`✅ Database ready (${dbFlavor})`);

  const { createApp } = await import("../server/app.js");
  const { connectDB } = await import("../server/config/db.js");
  await connectDB();

  const app = createApp();
  const PORT = 3988;
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
    console.log("\n━━ 1. Health, Security Headers & Database Liveness ──────────────");
    const healthRes = await fetch(`${BASE_URL}/api/health`);
    const healthData = await healthRes.json();
    assert(healthRes.status === 200 && healthData.database === "connected", "Health reports 200 & MongoDB connected");
    assert(healthRes.headers.get("x-content-type-options") === "nosniff", "X-Content-Type-Options: nosniff header present");
    assert(healthRes.headers.get("x-frame-options") === "DENY", "X-Frame-Options: DENY header present");
    assert(healthRes.headers.get("referrer-policy")?.includes("origin"), "Referrer-Policy header present");
    assert(healthRes.headers.get("permissions-policy")?.includes("geolocation"), "Permissions-Policy header present");

    // -----------------------------------------------------------------------
    console.log("\n━━ 2. Admin Authentication & Role Authorization ────────────────");
    // Unauthenticated access
    const noTokenRes = await fetch(`${BASE_URL}/api/orders`);
    assert(noTokenRes.status === 401, "Unauthenticated access to /api/orders returns 401");

    // Customer access to admin route
    const custOrdersRes = await fetch(`${BASE_URL}/api/orders`, {
      headers: { Authorization: `Bearer ${custA_Token}` }
    });
    assert(custOrdersRes.status === 403, "Customer access to /api/orders returns 403");

    // Admin access
    const adminOrdersRes = await fetch(`${BASE_URL}/api/orders`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(adminOrdersRes.status === 200, "Authorized admin (rohitjangir8740@gmail.com) access returns 200");

    // -----------------------------------------------------------------------
    console.log("\n━━ 3. Product Catalog CRUD & Price Immutability ─────────────────");
    // Seed catalog items
    const prod1Res = await fetch(`${BASE_URL}/api/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        id: "prod-5mukhi",
        name: "5 Mukhi Nepal Rudraksha",
        price: 999,
        comparePrice: 1499,
        mrp: 1499,
        stock: 20,
        status: "Active",
        category: "Rudraksha",
        images: ["/images/product-5mukhi.jpg"]
      })
    });
    assert(prod1Res.status === 201, "Admin created 5 Mukhi Rudraksha (price ₹999, stock 20)");

    const prod2Res = await fetch(`${BASE_URL}/api/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        id: "prod-mala",
        name: "108+1 Beads Rudraksha Jaap Mala",
        price: 1899,
        comparePrice: 2499,
        mrp: 2499,
        stock: 15,
        status: "Active",
        category: "Mala",
        images: ["/images/product-mala.jpg"]
      })
    });
    assert(prod2Res.status === 201, "Admin created 108 Bead Mala (price ₹1899, stock 15)");

    const prod3Res = await fetch(`${BASE_URL}/api/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        id: "prod-rare",
        name: "14 Mukhi Divine Rudraksha",
        price: 8999,
        comparePrice: 12999,
        mrp: 12999,
        stock: 0,
        status: "Active",
        category: "Rudraksha",
        images: ["/images/product-14mukhi.jpg"]
      })
    });
    assert(prod3Res.status === 201, "Admin created Out of Stock item (stock 0)");

    // -----------------------------------------------------------------------
    console.log("\n━━ 4. Coupons System: Min Amount, Expiry & Rules ────────────────");
    // Active coupon with min order
    const c1 = await fetch(`${BASE_URL}/api/coupons`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        code: "FESTIVAL200",
        discount: 200,
        type: "fixed",
        minAmount: 1500,
        limit: 5,
        status: "Active"
      })
    });
    assert(c1.status === 201, "Admin created coupon FESTIVAL200 (Min order ₹1500, Flat ₹200)");

    // Expired coupon
    const c2 = await fetch(`${BASE_URL}/api/coupons`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        code: "PASTOFFER",
        discount: 500,
        type: "fixed",
        expiry: "2020-01-01T00:00:00.000Z",
        status: "Active"
      })
    });
    assert(c2.status === 201, "Admin created expired coupon PASTOFFER");

    // -----------------------------------------------------------------------
    console.log("\n━━ 5. Cart Authoritative Pricing & Shipping Sync ────────────────");
    // Cart calculation below threshold
    const calcLow = await fetch(`${BASE_URL}/api/cart/calculate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lines: [{ id: "prod-5mukhi", qty: 1 }] // Subtotal 999 >= 499 free shipping threshold
      })
    });
    const lowData = await calcLow.json();
    assert(lowData.data.subtotal === 999 && lowData.data.isFreeShipping === true && lowData.data.shipping === 0, "Subtotal ₹999 unlocks free shipping");

    // Coupon min amount check via cart
    const calcCouponBelowMin = await fetch(`${BASE_URL}/api/cart/calculate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lines: [{ id: "prod-5mukhi", qty: 1 }],
        couponCode: "FESTIVAL200"
      })
    });
    const couponMinData = await calcCouponBelowMin.json();
    assert(couponMinData.data.couponStatus === "NOT_ELIGIBLE" && couponMinData.data.couponDiscount === 0, "Coupon rejected when cart ₹999 < min ₹1500 (gives ₹0 discount)");

    // Coupon applied when min amount met
    const calcCouponOk = await fetch(`${BASE_URL}/api/cart/calculate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lines: [
          { id: "prod-5mukhi", qty: 1 }, // 999
          { id: "prod-mala", qty: 1 }    // 1899 -> Subtotal 2898
        ],
        couponCode: "FESTIVAL200"
      })
    });
    const okData = await calcCouponOk.json();
    assert(okData.data.couponStatus === "APPLIED" && okData.data.couponDiscount === 200 && okData.data.finalTotal === 2698, "Coupon FESTIVAL200 applied: ₹2898 - ₹200 = ₹2698");

    // Expired coupon test: status EXPIRED, gives ₹0 discount, not silently removed
    const calcExpired = await fetch(`${BASE_URL}/api/cart/calculate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lines: [{ id: "prod-5mukhi", qty: 2 }],
        couponCode: "PASTOFFER"
      })
    });
    const expData = await calcExpired.json();
    assert(expData.data.couponStatus === "EXPIRED" && expData.data.couponDiscount === 0, "Expired coupon gives ₹0 discount with status EXPIRED");

    // -----------------------------------------------------------------------
    console.log("\n━━ 6. Order Creation, Stock Decrement & Concurrency ────────────");
    // Attempt buying out of stock item
    const oosOrder = await fetch(`${BASE_URL}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${custA_Token}` },
      body: JSON.stringify({
        lines: [{ id: "prod-rare", qty: 1 }]
      })
    });
    assert(oosOrder.status === 400, "Out-of-stock product purchase securely rejected (400)");

    // Customer A creates valid order with coupon
    const custA_Order = await fetch(`${BASE_URL}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${custA_Token}` },
      body: JSON.stringify({
        lines: [{ id: "prod-5mukhi", qty: 2 }], // Subtotal 1998
        couponCode: "FESTIVAL200",              // -200 = 1798
        customerName: "Devotee Customer A",
        customerEmail: CUST_A_EMAIL,
        phone: "+91 9876543210",
        address: "Flat 1, Sacred Lane",
        city: "Varanasi",
        state: "UP",
        pincode: "221001",
        paymentMethod: "UPI"
      })
    });
    const orderA_Data = await custA_Order.json();
    assert(custA_Order.status === 201 && orderA_Data.data.finalAmount === 1798, "Customer A order created for ₹1798 (server-computed)");
    const orderId = orderA_Data.data.id;

    // Check stock was decremented from 20 to 18
    const checkProd = await fetch(`${BASE_URL}/api/products/prod-5mukhi`);
    const prodData = await checkProd.json();
    assert(prodData.data.stock === 18, "Stock correctly decremented from 20 to 18");

    // -----------------------------------------------------------------------
    console.log("\n━━ 7. Customer Data Isolation & Ownership Security ─────────────");
    // Customer B attempts to access Customer A's order
    const custB_Access = await fetch(`${BASE_URL}/api/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${custB_Token}` }
    });
    assert(custB_Access.status === 403, "Customer B is 403 Forbidden from accessing Customer A's order");

    // Customer A accesses their own order
    const custA_Access = await fetch(`${BASE_URL}/api/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${custA_Token}` }
    });
    assert(custA_Access.status === 200, "Customer A can view their own order (200)");

    // Admin accesses the order
    const adminAccess = await fetch(`${BASE_URL}/api/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(adminAccess.status === 200, "Admin can view any customer order (200)");

    // -----------------------------------------------------------------------
    console.log("\n━━ 8. Admin Status Updates & Order Immutability ─────────────────");
    const updateStatus = await fetch(`${BASE_URL}/api/orders/${orderId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        status: "Shipped",
        trackingNumber: "DTDC-998877",
        courierName: "DTDC Express"
      })
    });
    const updatedOrder = await updateStatus.json();
    assert(updateStatus.status === 200 && updatedOrder.data.status === "Shipped" && updatedOrder.data.trackingNumber === "DTDC-998877", "Admin updated order status to Shipped with tracking number");

    // Check stock was NOT decremented again on status update
    const checkProdAfterStatus = await fetch(`${BASE_URL}/api/products/prod-5mukhi`);
    const prodDataAfterStatus = await checkProdAfterStatus.json();
    assert(prodDataAfterStatus.data.stock === 18, "Order status update did not affect product stock (remains 18)");

    // -----------------------------------------------------------------------
    console.log("\n━━ 9. Admin Banners, Hero, Offers & Settings CRUD ──────────────");
    // Banners
    const bannerRes = await fetch(`${BASE_URL}/api/banners`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify([{
        id: "banner-1",
        image: "https://i.ibb.co/banner1.jpg",
        title: "Grand Shrawan Mahotsav",
        position: "hero",
        isActive: true
      }])
    });
    assert(bannerRes.status === 200, "Admin saved hero banners in MongoDB");

    // Active Offer
    const offerRes = await fetch(`${BASE_URL}/api/active-offer`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        title: "Special Shrawan Blessing",
        subtitle: "Flat ₹200 OFF on All Rudraksha",
        couponCode: "FESTIVAL200",
        enabled: true,
        status: "Active"
      })
    });
    assert(offerRes.status === 200, "Admin saved Active Offer in MongoDB");

    // Store Settings
    const settingRes = await fetch(`${BASE_URL}/api/settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        storeName: "Aura Rudraksha Official",
        supportPhone: "+91 9672996531",
        supportEmail: "support@aurarudraksha.com"
      })
    });
    assert(settingRes.status === 200, "Admin updated Store Settings in MongoDB");

    // -----------------------------------------------------------------------
    console.log("\n━━ 10. Aura AI: Intent Rules, Stock Awareness & Isolation ───────");
    // Aura AI Greeting intent -> NO products
    const aiGreeting = await fetch(`${BASE_URL}/api/aura-ai/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Namaste",
        conversationId: "conv-test-1"
      })
    });
    const greetingData = await aiGreeting.json();
    assert(greetingData.success === true && (!greetingData.data.products || greetingData.data.products.length === 0), "Aura AI greeting ('Namaste') does NOT recommend products");

    // Aura AI Shopping intent -> Recommends in-stock product with real image
    const aiShopping = await fetch(`${BASE_URL}/api/aura-ai/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Mujhe 5 Mukhi Rudraksha chahiye",
        conversationId: "conv-test-2"
      })
    });
    const shoppingData = await aiShopping.json();
    const recs = shoppingData.data.products || [];
    assert(recs.length > 0 && recs.length <= 3, "Aura AI shopping intent recommends 1-3 products");
    assert(recs[0]?.image?.includes("5mukhi") || recs[0]?.img?.includes("5mukhi"), "Aura AI product recommendation carries REAL catalog image");
    assert(recs.every(p => p.stock > 0), "Aura AI recommendations are in-stock only");

    // Aura AI Order Tracking intent for unauthenticated user -> Requires login
    const aiOrderGuest = await fetch(`${BASE_URL}/api/aura-ai/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Mera order kaha hai?",
        conversationId: "conv-test-3"
      })
    });
    const orderGuestData = await aiOrderGuest.json();
    assert(orderGuestData.data.text.toLowerCase().includes("login") || orderGuestData.data.text.toLowerCase().includes("log in"), "Aura AI prompts guest to log in for order tracking");

    // Aura AI Order Tracking intent for Customer A -> Finds Customer A's order
    const aiOrderCustA = await fetch(`${BASE_URL}/api/aura-ai/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${custA_Token}` },
      body: JSON.stringify({
        message: "Track my recent order",
        conversationId: "conv-test-4"
      })
    });
    const orderCustAData = await aiOrderCustA.json();
    assert(orderCustAData.data.text.includes(orderId) || (orderCustAData.data.orderInfo && orderCustAData.data.orderInfo.id === orderId), "Aura AI securely retrieves Customer A's specific order");

    // Aura AI Conversation Isolation
    const custA_Convos = await fetch(`${BASE_URL}/api/aura-ai/conversations`, {
      headers: { Authorization: `Bearer ${custA_Token}` }
    });
    const custA_ConvosData = await custA_Convos.json();
    assert(custA_ConvosData.count >= 1, "Customer A can view their own AI conversation history");

    const custB_Convos = await fetch(`${BASE_URL}/api/aura-ai/conversations`, {
      headers: { Authorization: `Bearer ${custB_Token}` }
    });
    const custB_ConvosData = await custB_Convos.json();
    assert(custB_ConvosData.count === 0, "Customer B cannot see Customer A's AI conversations (isolated)");

    // -----------------------------------------------------------------------
    console.log("\n━━ 11. Secrets Bundling Check in dist/ ──────────────────────────");
    let secretLeakFound = false;
    const distAssetsDir = path.resolve(process.cwd(), "dist", "assets");
    if (fs.existsSync(distAssetsDir)) {
      const files = fs.readdirSync(distAssetsDir);
      for (const file of files) {
        if (file.endsWith(".js")) {
          const content = fs.readFileSync(path.join(distAssetsDir, file), "utf8");
          if (content.includes("mongodb+srv://") || content.includes("integrate.api.nvidia.com") || content.includes("nvapi-")) {
            secretLeakFound = true;
            break;
          }
        }
      }
    }
    assert(!secretLeakFound, "No backend secrets or NVIDIA private keys in frontend bundles");

  } catch (err) {
    failed++;
    failures.push(`Unexpected exception: ${err.message}`);
    console.error("Test Error:", err);
  } finally {
    server.close();
    await stopDb();
    stopCertServer();
  }

  console.log("\n==================================================================");
  console.log(`FINAL MASTER RECHECK SUMMARY: ${passed} passed, ${failed} failed`);
  console.log("==================================================================");

  if (failed > 0) {
    console.error("FAILURES:\n" + failures.map(f => `  - ${f}`).join("\n"));
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runMasterAudit();
