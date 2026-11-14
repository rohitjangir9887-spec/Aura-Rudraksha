import { describe, test, expect, beforeEach, afterEach, beforeAll, afterAll } from "vitest";
import http from "node:http";
import express from "express";
import auraAiRouter from "../../routes/auraAi.js";
import { inMemoryStore } from "../../data/inMemoryStore.js";
import {
  queryStoreData,
  executeAdminAgentAction,
  undoAdminAgentAction,
  runWebsiteBugDiagnostic,
  runStoreGrowthAndHealthAudit
} from "../adminAiAgentService.js";
import { handleAdminAgentChat } from "../../controllers/adminAiAgentController.js";

function makeFakeJwt(payload) {
  const h = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64");
  const b = Buffer.from(JSON.stringify(payload)).toString("base64");
  return `${h}.${b}.sig`;
}

const TEST_CATALOG = [
  {
    id: "prod_1",
    slug: "5-mukhi-nepali",
    name: "5 Mukhi Authentic Nepali Rudraksha",
    category: "Rudraksha Beads",
    price: 1000,
    comparePrice: 1500,
    indonesiaPrice: 500,
    stock: 20,
    description: "Authentic 5 Mukhi Nepali Rudraksha lab certified for meditation and peace.",
    images: ["/images/5mukhi.jpg"],
    status: "Published"
  },
  {
    id: "prod_2",
    slug: "7-mukhi-mahalakshmi",
    name: "7 Mukhi Mahalakshmi Rudraksha",
    category: "Rudraksha Beads",
    price: 2000,
    comparePrice: 2800,
    stock: 3, // Critical low stock for bug diagnostic test
    description: "Thin desc", // Thin SEO description (< 40 chars) for bug diagnostic test
    images: [], // Missing image for bug diagnostic test
    status: "Published"
  }
];

describe("Admin AI Agent: RBAC Security & Lazy Endpoints", () => {
  const app = express();
  app.use(express.json());
  app.use("/api/aura-ai", auraAiRouter);

  let server;
  let baseUrl = "";

  beforeAll(async () => {
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const addr = server.address();
    baseUrl = `http://127.0.0.1:${addr.port}`;
  });

  afterAll(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
  });

  test("rejects unauthenticated requests to all admin-agent & analytics routes with 401", async () => {
    const protectedGetRoutes = [
      "/api/aura-ai/admin-agent/session",
      "/api/aura-ai/admin-agent/actions",
      "/api/aura-ai/admin-agent/tasks",
      "/api/aura-ai/admin-agent/diagnostics",
      "/api/aura-ai/admin-agent/growth-audit",
      "/api/aura-ai/analytics",
      "/api/aura-ai/admin/db-health"
    ];

    for (const route of protectedGetRoutes) {
      const res = await fetch(`${baseUrl}${route}`);
      expect(res.status).toBe(401);
    }

    const chatRes = await fetch(`${baseUrl}/api/aura-ai/admin-chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "Sabhi products par 10% discount lagao" })
    });
    expect(chatRes.status).toBe(401);

    const settingsRes = await fetch(`${baseUrl}/api/aura-ai/settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: false })
    });
    expect(settingsRes.status).toBe(401);
  });

  test("rejects non-admin authenticated user token with 403", async () => {
    const nonAdminJwt = makeFakeJwt({
      user_id: "cust_regular_99",
      email: "customer@example.com",
      phone_number: "+919999999999"
    });

    const res = await fetch(`${baseUrl}/api/aura-ai/admin-agent/session`, {
      headers: { Authorization: `Bearer ${nonAdminJwt}` }
    });
    expect(res.status).toBe(403);
  });

  test("allows authorized admin token to access session, diagnostics, and growth audit", async () => {
    const prevProds = inMemoryStore.products;
    const prevSynced = inMemoryStore.isProductsSyncedFromDb;
    inMemoryStore.products = TEST_CATALOG.map(p => ({ ...p }));
    inMemoryStore.isProductsSyncedFromDb = true;

    try {
      const sessionRes = await fetch(`${baseUrl}/api/aura-ai/admin-agent/session`, {
        headers: { Authorization: "Bearer admin_test_session" }
      });
      const sessionBody = await sessionRes.json();
      expect(sessionRes.status).toBe(200);
      expect(sessionBody.success).toBe(true);
      expect(Array.isArray(sessionBody.pagesDirectory)).toBe(true);

      const diagRes = await fetch(`${baseUrl}/api/aura-ai/admin-agent/diagnostics`, {
        headers: { Authorization: "Bearer admin_test_session" }
      });
      const diagBody = await diagRes.json();
      expect(diagRes.status).toBe(200);
      expect(diagBody.success).toBe(true);
      expect(diagBody.report.bugsCount).toBeGreaterThan(0);

      const auditRes = await fetch(`${baseUrl}/api/aura-ai/admin-agent/growth-audit`, {
        headers: { Authorization: "Bearer admin_test_session" }
      });
      const auditBody = await auditRes.json();
      expect(auditRes.status).toBe(200);
      expect(auditBody.success).toBe(true);
      expect(auditBody.audit.metrics.totalProducts).toBe(2);
    } finally {
      inMemoryStore.products = prevProds;
      inMemoryStore.isProductsSyncedFromDb = prevSynced;
    }
  });
});

describe("Autonomous Admin Agent Tools, Bulk Operations & 1-Click Undo", () => {
  let prevProducts;
  let prevSynced;

  beforeEach(() => {
    prevProducts = inMemoryStore.products;
    prevSynced = inMemoryStore.isProductsSyncedFromDb;
    inMemoryStore.products = TEST_CATALOG.map(p => ({ ...p }));
    inMemoryStore.isProductsSyncedFromDb = true;
  });

  afterEach(() => {
    inMemoryStore.products = prevProducts;
    inMemoryStore.isProductsSyncedFromDb = prevSynced;
  });

  test("queryStoreData filters products accurately (search and low_stock)", async () => {
    const allRes = await queryStoreData({ entity: "products" });
    expect(allRes.totalMatched).toBe(2);

    const lowRes = await queryStoreData({ entity: "products", filter: "low_stock" });
    expect(lowRes.totalMatched).toBe(1);
    expect(lowRes.items[0].id).toBe("prod_2");
  });

  test("CREATE_PRODUCT creates a new item and undoAdminAgentAction removes it cleanly", async () => {
    const created = await executeAdminAgentAction({
      type: "CREATE_PRODUCT",
      data: {
        name: "11 Mukhi Nepali Rudraksha",
        mukhi: "11",
        price: 4999,
        comparePrice: 6999,
        indonesiaPrice: 2499,
        stock: 15
      }
    }, { sessionId: "test_sess", source: "vitest" });

    expect(created.actionId).toBeTruthy();
    expect(created.previewRoute).toMatch(/^\/product\//);
    expect(inMemoryStore.products.some(p => p.name.includes("11 Mukhi Nepali Rudraksha"))).toBe(true);

    const reverted = await undoAdminAgentAction(created.actionId);
    expect(reverted.success).toBe(true);
    expect(inMemoryStore.products.some(p => p.name.includes("11 Mukhi Nepali Rudraksha"))).toBe(false);
  });

  test("BULK_UPDATE_PRODUCTS applies discount across Nepali + Indonesian prices and Undo restores exact originals", async () => {
    const bulkRes = await executeAdminAgentAction({
      type: "BULK_UPDATE_PRODUCTS",
      data: { discountPercent: 10 }
    }, { sessionId: "test_sess", source: "vitest" });

    expect(bulkRes.actionId).toBeTruthy();
    expect(bulkRes.modifiedCount).toBe(2);

    const p1 = inMemoryStore.products.find(p => p.id === "prod_1");
    const p2 = inMemoryStore.products.find(p => p.id === "prod_2");
    expect(p1.price).toBe(900);
    expect(p1.indonesiaPrice).toBe(450);
    expect(p2.price).toBe(1800);

    // 1-Click Undo restores exact pre-discount prices
    const undoRes = await undoAdminAgentAction(bulkRes.actionId);
    expect(undoRes.success).toBe(true);

    const p1Restored = inMemoryStore.products.find(p => p.id === "prod_1");
    const p2Restored = inMemoryStore.products.find(p => p.id === "prod_2");
    expect(p1Restored.price).toBe(1000);
    expect(p1Restored.indonesiaPrice).toBe(500);
    expect(p2Restored.price).toBe(2000);
  });

  test("runWebsiteBugDiagnostic identifies low stock, thin SEO, and missing image; Growth Audit surfaces opportunities", async () => {
    const diag = await runWebsiteBugDiagnostic();
    const fixTypes = diag.bugs.map(b => b.fixType);
    expect(fixTypes).toContain("RESTOCK_PRODUCT");
    expect(fixTypes).toContain("ENRICH_PRODUCT_SEO");
    expect(fixTypes).toContain("FIX_PRODUCT_IMAGE");

    const audit = await runStoreGrowthAndHealthAudit("all");
    expect(audit.metrics.lowStockCount).toBe(1);
    expect(audit.metrics.missingSeoCount).toBe(1);
    expect(audit.opportunities.length).toBeGreaterThan(0);
  });

  test("handleAdminAgentChat executes natural Hindi/Hinglish bulk discount command end-to-end", async () => {
    let bodyOut = null;
    let statusOut = 200;
    const req = {
      body: {
        prompt: "Sabhi products par 20% discount lagao",
        sessionId: "test_e2e_session",
        pageContext: "/admin/products"
      }
    };
    const res = {
      status(code) { statusOut = code; return this; },
      json(payload) { bodyOut = payload; return this; }
    };

    await handleAdminAgentChat(req, res);

    expect(statusOut).toBe(200);
    expect(bodyOut.success).toBe(true);
    expect(bodyOut.actionsExecuted.length).toBeGreaterThanOrEqual(1);
    expect(bodyOut.actionsExecuted[0].actionType).toBe("BULK_UPDATE_PRODUCTS");
    expect(inMemoryStore.products.find(p => p.id === "prod_1").price).toBe(800);

    // Undo via actionId returned directly in the chat receipt
    await undoAdminAgentAction(bodyOut.actionsExecuted[0].actionId);
    expect(inMemoryStore.products.find(p => p.id === "prod_1").price).toBe(1000);
  });
});
