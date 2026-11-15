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
  runStoreGrowthAndHealthAudit,
  searchGitHubPublicTools,
  normalizeAdminPrompt
} from "../adminAiAgentService.js";
import { handleAdminAgentChat } from "../../controllers/adminAiAgentController.js";
import {
  resolveActiveWebsiteAiModel,
  isGeminiModelName,
  WEBSITE_AI_MODELS,
  PRIMARY_NIM_MODEL
} from "../../controllers/auraAiController.js";

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

  test("handleAdminAgentChat returns distinct, accurate live answers across diverse consecutive queries on the same sessionId", async () => {
    const prompts = [
      "7 Mukhi ka price aur stock kitna hai?",
      "COD aur Online PayU settings kya hain dikhao",
      "Pending orders dikhao",
      "Coupons list batao",
      "Store ke liye aaj ka best plan kya hai?"
    ];
    const replies = [];

    for (const prompt of prompts) {
      let bodyOut = null;
      let statusOut = 200;
      const req = {
        body: {
          prompt,
          sessionId: "test_diverse_queries_session",
          pageContext: "/admin/ai"
        }
      };
      const res = {
        status(code) { statusOut = code; return this; },
        json(payload) { bodyOut = payload; return this; }
      };

      await handleAdminAgentChat(req, res);
      expect(statusOut).toBe(200);
      expect(bodyOut.success).toBe(true);
      expect(typeof bodyOut.text).toBe("string");
      replies.push(bodyOut.text);
    }

    // Ensure every prompt produced a distinct response (never the same canned fallback)
    expect(new Set(replies).size).toBe(prompts.length);

    expect(replies[0]).toContain("7 Mukhi");
    expect(replies[0]).toContain("2,000");
    expect(replies[1]).toMatch(/Cash on Delivery/i);
    expect(replies[1]).toMatch(/PayU/i);
    expect(replies[2]).toMatch(/Live Orders Report/i);
    expect(replies[3]).toMatch(/Store Discount Coupons/i);
    expect(replies[4]).toContain("Store ke liye aaj ka best plan kya hai?");
  });

  test("RETRAIN_AI_KNOWLEDGE builds live public trends index without customer PII", async () => {
    const res = await executeAdminAgentAction({
      type: "RETRAIN_AI_KNOWLEDGE",
      data: { forceRefresh: true }
    }, { sessionId: "test_train_sess", source: "vitest" });

    expect(res.actionType).toBe("RETRAIN_AI_KNOWLEDGE");
    expect(res.trends).toBeTruthy();
    expect(res.trends.indexedDocumentsCount).toBeGreaterThan(5);
    expect(res.trends.totals.publishedProducts).toBe(2);

    const serialized = JSON.stringify(res.trends);
    expect(serialized).not.toMatch(/vipBuyers|customerEmail|customerPhone|shippingAddress/i);
  });

  test("inMemoryStore ships with empty offers and reviews (zero demo clutter)", () => {
    expect(Array.isArray(inMemoryStore.offers)).toBe(true);
    expect(inMemoryStore.offers.length).toBe(0);
    expect(Array.isArray(inMemoryStore.reviews)).toBe(true);
    expect(inMemoryStore.reviews.length).toBe(0);
  });
});

describe("Public Store Trends Endpoint (/api/aura-ai/public-trends)", () => {
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

  test("returns live public trends and rules without requiring auth and leaks zero PII", async () => {
    const prevProds = inMemoryStore.products;
    const prevSynced = inMemoryStore.isProductsSyncedFromDb;
    inMemoryStore.products = TEST_CATALOG.map(p => ({ ...p }));
    inMemoryStore.isProductsSyncedFromDb = true;

    try {
      const res = await fetch(`${baseUrl}/api/aura-ai/public-trends?refresh=true`);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.totals.publishedProducts).toBe(2);
      expect(json.data.shippingAndPayments).toBeTruthy();
      expect(Array.isArray(json.data.categories)).toBe(true);
      expect(JSON.stringify(json.data)).not.toMatch(/vipBuyers|@|customerPhone/i);
    } finally {
      inMemoryStore.products = prevProds;
      inMemoryStore.isProductsSyncedFromDb = prevSynced;
    }
  });
});

describe("Admin AI Auto-Fix, Background Tasks CRUD & Customer Bot (/api/aura-ai/chat)", () => {
  const app = express();
  app.use(express.json());
  app.use("/api/aura-ai", auraAiRouter);

  let server;
  let baseUrl = "";
  const adminToken = "admin_test_session";

  beforeAll(async () => {
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const addr = server.address();
    baseUrl = `http://127.0.0.1:${addr.port}`;
  });

  afterAll(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
  });

  test("AUTO_FIX_BUGS repairs in-memory product issues and logs action when DB is in fallback mode", async () => {
    const prevProds = inMemoryStore.products;
    const prevSynced = inMemoryStore.isProductsSyncedFromDb;
    inMemoryStore.products = TEST_CATALOG.map(p => ({ ...p, images: [...(p.images || [])] }));
    inMemoryStore.isProductsSyncedFromDb = true;

    try {
      const res = await executeAdminAgentAction({
        type: "AUTO_FIX_BUGS",
        data: {}
      }, { sessionId: "test_autofix_sess", source: "vitest" });

      expect(res.actionType).toBe("AUTO_FIX_BUGS");
      expect(Array.isArray(res.fixedList)).toBe(true);
      expect(res.fixedList.length).toBeGreaterThanOrEqual(2);

      const repairedProd2 = inMemoryStore.products.find(p => p.id === "prod_2");
      expect(repairedProd2.stock).toBeGreaterThanOrEqual(20);
      expect(repairedProd2.description.length).toBeGreaterThanOrEqual(40);
    } finally {
      inMemoryStore.products = prevProds;
      inMemoryStore.isProductsSyncedFromDb = prevSynced;
    }
  });

  test("Admin background tasks CRUD works cleanly with pause and delete", async () => {
    const createRes = await fetch(`${baseUrl}/api/aura-ai/admin-agent/tasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        title: "Vitest Growth Audit Task",
        prompt: "Check inventory and revenue status",
        taskType: "growth_audit",
        durationMinutes: 30,
        intervalMinutes: 10
      })
    });
    expect(createRes.status).toBe(200);
    const createdJson = await createRes.json();
    expect(createdJson.success).toBe(true);
    expect(createdJson.task?.taskId).toBeTruthy();

    const taskId = createdJson.task.taskId;

    const listRes = await fetch(`${baseUrl}/api/aura-ai/admin-agent/tasks`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    expect(listRes.status).toBe(200);
    const listJson = await listRes.json();
    expect(listJson.tasks.some(t => t.taskId === taskId)).toBe(true);

    const pauseRes = await fetch(`${baseUrl}/api/aura-ai/admin-agent/tasks/${taskId}/control`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ command: "pause" })
    });
    expect(pauseRes.status).toBe(200);
    const pauseJson = await pauseRes.json();
    expect(pauseJson.task?.status).toBe("paused");

    const delRes = await fetch(`${baseUrl}/api/aura-ai/admin-agent/tasks/${taskId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    expect(delRes.status).toBe(200);
    const delJson = await delRes.json();
    expect(delJson.success).toBe(true);
  });

  test("Customer Aura AI bot (/api/aura-ai/chat) responds reliably in JSON and SSE streaming modes", async () => {
    const prevProds = inMemoryStore.products;
    const prevSynced = inMemoryStore.isProductsSyncedFromDb;
    inMemoryStore.products = TEST_CATALOG.map(p => ({ ...p }));
    inMemoryStore.isProductsSyncedFromDb = true;

    try {
      const jsonRes = await fetch(`${baseUrl}/api/aura-ai/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Guest-Session-ID": "vitest_guest_1"
        },
        body: JSON.stringify({
          message: "5 mukhi rudraksha price aur delivery batao",
          mode: "standard"
        })
      });
      expect(jsonRes.status).toBe(200);
      const payload = await jsonRes.json();
      expect(payload.success).toBe(true);
      expect(typeof (payload.data?.text || payload.text)).toBe("string");
      expect((payload.data?.text || payload.text).length).toBeGreaterThan(15);

      const sseRes = await fetch(`${baseUrl}/api/aura-ai/chat?stream=true`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
          "X-Guest-Session-ID": "vitest_guest_2"
        },
        body: JSON.stringify({
          message: "7 mukhi rudraksha ke fayde batao",
          mode: "standard",
          stream: true
        })
      });
      expect(sseRes.status).toBe(200);
      expect(sseRes.headers.get("content-type")).toContain("text/event-stream");
      const sseBody = await sseRes.text();
      expect(sseBody).toContain("data: ");
      expect(sseBody).toContain("[DONE]");
    } finally {
      inMemoryStore.products = prevProds;
      inMemoryStore.isProductsSyncedFromDb = prevSynced;
    }
  });
});

describe("Admin AI Agent: Hinglish/Typo Product CRUD, Auto SEO & Public Google/GitHub Tools", () => {
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

  test("normalizeAdminPrompt converts common Hinglish & spelling typos cleanly", () => {
    expect(normalizeAdminPrompt("7 mukhi produced htana h")).toMatch(/7 mukhi product delete h/i);
    expect(normalizeAdminPrompt("Naya produced ad karo")).toMatch(/Naya product add karo/i);
  });

  test("handleAdminAgentChat creates custom product from Hinglish/typo prompt and reflects in catalog immediately", async () => {
    let bodyOut = null;
    let statusOut = 200;
    const req = {
      body: {
        prompt: "Naya produced 8 Mukhi Indonesian Rudraksha price 1899 stock 12 ad karo",
        sessionId: "test_hinglish_create_sess",
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
    expect(bodyOut.actionsExecuted.some(a => a.actionType === "CREATE_PRODUCT")).toBe(true);

    const createdAct = bodyOut.actionsExecuted.find(a => a.actionType === "CREATE_PRODUCT");
    expect(createdAct.product).toBeTruthy();
    expect(createdAct.product.name).toMatch(/8 Mukhi/i);
    expect(createdAct.product.price).toBe(1899);
    expect(createdAct.product.stock).toBe(12);
    expect(createdAct.product.origin).toMatch(/Indonesia/i);
    expect(inMemoryStore.products.some(p => p.id === createdAct.product.id)).toBe(true);

    const qRes = await queryStoreData({ entity: "products", search: "8 Mukhi" });
    expect(qRes.totalMatched).toBe(1);
    expect(qRes.items[0].price).toBe(1899);

    await undoAdminAgentAction(createdAct.actionId);
    expect(inMemoryStore.products.some(p => p.id === createdAct.product.id)).toBe(false);
  });

  test("handleAdminAgentChat deletes product from Hinglish/typo prompt ('produced htana') and restores via Undo", async () => {
    let bodyOut = null;
    let statusOut = 200;
    const req = {
      body: {
        prompt: "7 Mukhi produced htana h",
        sessionId: "test_hinglish_delete_sess",
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
    const delAct = bodyOut.actionsExecuted.find(a => a.actionType === "DELETE_PRODUCT");
    expect(delAct).toBeTruthy();
    expect(delAct.deletedProductId).toBe("prod_2");
    expect(inMemoryStore.products.some(p => p.id === "prod_2")).toBe(false);

    // Undo restores prod_2 cleanly
    const undoRes = await undoAdminAgentAction(delAct.actionId);
    expect(undoRes.success).toBe(true);
    expect(inMemoryStore.products.some(p => p.id === "prod_2")).toBe(true);
  });

  test("GENERATE_PRODUCT_SEO enriches English+Hindi keywords & descriptions with 1-click Undo", async () => {
    const res = await executeAdminAgentAction({
      type: "GENERATE_PRODUCT_SEO",
      data: { idOrName: "prod_2" }
    }, { sessionId: "test_seo_sess", source: "vitest" });

    expect(res.actionType).toBe("GENERATE_PRODUCT_SEO");
    expect(res.updatedCount).toBe(1);

    const p2 = inMemoryStore.products.find(p => p.id === "prod_2");
    expect(Array.isArray(p2.keywords)).toBe(true);
    expect(p2.keywords.length).toBeGreaterThanOrEqual(6);
    expect(p2.description.length).toBeGreaterThan(50);

    const undoRes = await undoAdminAgentAction(res.actionId);
    expect(undoRes.success).toBe(true);
    const p2Restored = inMemoryStore.products.find(p => p.id === "prod_2");
    expect(p2Restored.description).toBe("Thin desc");
  });

  test("searchGitHubPublicTools fetches and formats public GitHub repositories cleanly", async () => {
    const origFetch = globalThis.fetch;
    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({
        total_count: 1,
        items: [
          {
            name: "schema-dts",
            full_name: "google/schema-dts",
            description: "TypeScript definitions for Schema.org vocabulary JSON-LD",
            stargazers_count: 1850,
            language: "TypeScript",
            topics: ["seo", "json-ld", "schema"],
            html_url: "https://github.com/google/schema-dts",
            homepage: "https://schema.org",
            license: { spdx_id: "Apache-2.0" }
          }
        ]
      })
    });

    try {
      const res = await searchGitHubPublicTools({ query: "ecommerce schema json-ld", limit: 3 });
      expect(res.success).toBe(true);
      expect(res.items.length).toBe(1);
      expect(res.items[0].fullName).toBe("google/schema-dts");
      expect(res.items[0].stars).toBe(1850);
    } finally {
      globalThis.fetch = origFetch;
    }
  });
});

describe("Website-Wide AI Models Selector & nvidia/nemotron-3-ultra-550b-a55b Persistence", () => {
  const app = express();
  app.use(express.json());
  app.use("/api/aura-ai", auraAiRouter);

  let server;
  let baseUrl = "";
  let prevAiSettings;

  beforeAll(async () => {
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const addr = server.address();
    baseUrl = `http://127.0.0.1:${addr.port}`;
  });

  afterAll(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
  });

  beforeEach(() => {
    prevAiSettings = { ...(inMemoryStore.aiSettings || {}) };
  });

  afterEach(() => {
    inMemoryStore.aiSettings = prevAiSettings;
  });

  test("GET /api/aura-ai/settings exposes all website models including nvidia/nemotron-3-ultra-550b-a55b and Gemini models", async () => {
    expect(WEBSITE_AI_MODELS.some(m => m.id === "nvidia/nemotron-3-ultra-550b-a55b")).toBe(true);

    const res = await fetch(`${baseUrl}/api/aura-ai/settings`);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data.availableModels)).toBe(true);
    expect(json.data.availableModels.some(m => m.id === "nvidia/nemotron-3-ultra-550b-a55b")).toBe(true);
    expect(json.data.availableModels.some(m => m.id === "gemini-4-hydrogen")).toBe(true);
  });

  test("PUT /api/aura-ai/settings saves selected NIM or Gemini model and enforces it website-wide", async () => {
    // 1. Save new NVIDIA Nemotron-3 Ultra 550B model
    const putUltra = await fetch(`${baseUrl}/api/aura-ai/settings`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer admin_test_session"
      },
      body: JSON.stringify({ activeAiModel: "nvidia/nemotron-3-ultra-550b-a55b" })
    });
    expect(putUltra.status).toBe(200);
    const ultraJson = await putUltra.json();
    expect(ultraJson.success).toBe(true);
    expect(ultraJson.data.activeAiModel).toBe("nvidia/nemotron-3-ultra-550b-a55b");
    expect(ultraJson.data.selectedNimModel).toBe("nvidia/nemotron-3-ultra-550b-a55b");
    expect(ultraJson.data.nemotronModel).toBe("nvidia/nemotron-3-ultra-550b-a55b");

    expect(await resolveActiveWebsiteAiModel()).toBe("nvidia/nemotron-3-ultra-550b-a55b");
    expect(isGeminiModelName(await resolveActiveWebsiteAiModel())).toBe(false);

    // 2. Switch to Google Gemini 4 Hydrogen and verify GET + resolver reflect it immediately
    const putGemini = await fetch(`${baseUrl}/api/aura-ai/settings`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer admin_test_session"
      },
      body: JSON.stringify({
        activeAiModel: "gemini-4-hydrogen",
        selectedNimModel: "gemini-4-hydrogen",
        nemotronModel: "gemini-4-hydrogen"
      })
    });
    expect(putGemini.status).toBe(200);

    const getRes = await fetch(`${baseUrl}/api/aura-ai/settings`);
    const getJson = await getRes.json();
    expect(getJson.data.activeAiModel).toBe("gemini-4-hydrogen");
    expect(await resolveActiveWebsiteAiModel()).toBe("gemini-4-hydrogen");
    expect(isGeminiModelName(await resolveActiveWebsiteAiModel())).toBe(true);

    // Restore primary default
    inMemoryStore.aiSettings.activeAiModel = PRIMARY_NIM_MODEL;
  });
});



