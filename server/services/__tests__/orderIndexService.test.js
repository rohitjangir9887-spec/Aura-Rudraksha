import { test, describe, beforeAll, afterAll, expect } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import {
  verifyOrderIndexes,
  applyOrderIndexes,
  REQUIRED_FIELDS,
  TARGET_ORDER_INDEX_SPECS
} from "../orderIndexService.js";
import { connectDB } from "../../config/db.js";

describe("MongoDB Orders Index Service", () => {
  let mongod = null;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create({ binary: { version: "8.0.4" } });
    process.env.MONGODB_URI = mongod.getUri("orders_index_test_suite");
    await connectDB();
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    if (mongod) {
      await mongod.stop();
    }
  });

  test("defines all 5 required optimization fields", () => {
    expect(REQUIRED_FIELDS).toContain("authUserId");
    expect(REQUIRED_FIELDS).toContain("email");
    expect(REQUIRED_FIELDS).toContain("phone");
    expect(REQUIRED_FIELDS).toContain("createdAt");
    expect(REQUIRED_FIELDS).toContain("orderId");
  });

  test("target index specifications include all required index keys", () => {
    const keys = TARGET_ORDER_INDEX_SPECS.map(s => Object.keys(s.key)[0]);
    expect(keys).toContain("authUserId");
    expect(keys).toContain("email");
    expect(keys).toContain("phone");
    expect(keys).toContain("createdAt");
    expect(keys).toContain("orderId");
  });

  test("applyOrderIndexes successfully creates all indexes and passes verification", async () => {
    const result = await applyOrderIndexes();
    expect(result.success).toBe(true);
    expect(result.verification.allRequiredCovered).toBe(true);

    const { fieldStatus } = result.verification;
    expect(fieldStatus.authUserId.covered).toBe(true);
    expect(fieldStatus.email.covered).toBe(true);
    expect(fieldStatus.phone.covered).toBe(true);
    expect(fieldStatus.createdAt.covered).toBe(true);
    expect(fieldStatus.orderId.covered).toBe(true);
  });

  test("verifyOrderIndexes confirms indexes on subsequent check", async () => {
    const verification = await verifyOrderIndexes();
    expect(verification.success).toBe(true);
    expect(verification.allRequiredCovered).toBe(true);
    expect(verification.totalExistingIndexes).toBeGreaterThanOrEqual(10);
  });
});
