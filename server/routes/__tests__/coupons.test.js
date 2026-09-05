import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import request from "supertest";
import express from "express";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { Coupon } from "../../models/Coupon.js";
import couponsRouter from "../coupons.js";

// Helper for formatting date logic identical to what controller uses
function formatDate(dateStr) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return String(dateStr);
  }
}

describe("Coupons Route - Validation Errors", async () => {
  let mongoServer;
  let app;
  const dbName = "aura_coupons_test";

  before(async () => {
    // 1. Setup MongoDB in-memory
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri(dbName);
    await mongoose.connect(uri);

    // 2. Setup Express App
    app = express();
    app.use(express.json());
    app.use("/api/coupons", couponsRouter);

    // 3. Seed Database with different coupon states
    await Coupon.create([
      {
        id: "COUP-ACTIVE",
        code: "TEST100",
        discount: 100,
        type: "fixed",
        status: "Active",
        limit: 100,
        usage: 0,
        minAmount: 0
      },
      {
        id: "COUP-INACTIVE",
        code: "INACTIVE10",
        discount: 10,
        type: "percentage",
        status: "Inactive"
      },
      {
        id: "COUP-EXPIRED",
        code: "EXPIRED50",
        discount: 50,
        type: "fixed",
        status: "Active", // Even if active, expiry date passed
        expiry: new Date(Date.now() - 100000).toISOString()
      },
      {
        id: "COUP-LIMIT",
        code: "LIMIT1",
        discount: 200,
        type: "fixed",
        status: "Active",
        limit: 1,
        usage: 1
      },
      {
        id: "COUP-MIN",
        code: "MIN500",
        discount: 100,
        type: "fixed",
        status: "Active",
        minAmount: 500
      }
    ]);
  });

  after(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  describe("POST /api/coupons/validate", () => {
    it("should return 400 if coupon code is missing", async () => {
      const res = await request(app)
        .post("/api/coupons/validate")
        .send({ subtotal: 1000 });

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.error, "Coupon code required");
    });

    it("should return 400 if coupon code does not exist", async () => {
      const res = await request(app)
        .post("/api/coupons/validate")
        .send({ code: "NONEXISTENT", subtotal: 1000 });

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.status, "INVALID");
      assert.ok(res.body.message.includes("is invalid or does not exist"));
    });

    it("should return 400 if coupon is inactive", async () => {
      const res = await request(app)
        .post("/api/coupons/validate")
        .send({ code: "INACTIVE10", subtotal: 1000 });

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.status, "INVALID");
      assert.ok(res.body.message.includes("is currently inactive"));
    });

    it("should return 400 if coupon is expired", async () => {
      const res = await request(app)
        .post("/api/coupons/validate")
        .send({ code: "EXPIRED50", subtotal: 1000 });

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.status, "EXPIRED");
      assert.ok(res.body.message.includes("has expired"));
    });

    it("should return 400 if coupon usage limit is reached", async () => {
      const res = await request(app)
        .post("/api/coupons/validate")
        .send({ code: "LIMIT1", subtotal: 1000 });

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.status, "INVALID");
      assert.ok(res.body.message.includes("usage limit has been reached"));
    });

    it("should return 400 if subtotal is below minimum order requirement", async () => {
      const res = await request(app)
        .post("/api/coupons/validate")
        .send({ code: "MIN500", subtotal: 200 });

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.status, "NOT_ELIGIBLE");
      assert.ok(res.body.message.includes("Add ₹300 more to use coupon")); // 500 - 200 = 300
    });

    it("should successfully apply a valid coupon", async () => {
      const res = await request(app)
        .post("/api/coupons/validate")
        .send({ code: "TEST100", subtotal: 1000 });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.status, "APPLIED");
      assert.strictEqual(res.body.data.discountAmount, 100);
    });
  });
});
