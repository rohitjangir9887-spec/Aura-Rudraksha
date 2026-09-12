#!/usr/bin/env node
/**
 * AURA RUDRAKSHA — MONGODB ORDERS COLLECTION INDEX MANAGER
 * Script to verify and apply optimal performance indexes on 'authUserId', 'email', 'phone', 'createdAt', and 'orderId'.
 *
 * Usage:
 *   node scripts/ensure-order-indexes.mjs
 *   node scripts/ensure-order-indexes.mjs --verify-only
 *   node scripts/ensure-order-indexes.mjs --in-memory (for isolated testing)
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import { connectDB, getMongoUri } from "../server/config/db.js";
import { verifyOrderIndexes, applyOrderIndexes, REQUIRED_FIELDS } from "../server/services/orderIndexService.js";

dotenv.config();

const args = process.argv.slice(2);
const isVerifyOnly = args.includes("--verify-only");
const useInMemory = args.includes("--in-memory") || args.includes("--test");

async function main() {
  console.log("===============================================================");
  console.log("🕉️  AURA RUDRAKSHA — ORDERS COLLECTION INDEX OPTIMIZATION");
  console.log("===============================================================\n");

  let mongod = null;
  if (useInMemory || (!getMongoUri() && !process.env.MONGODB_URI)) {
    console.log("ℹ️  No external MONGODB_URI configured. Starting in-memory MongoDB instance for index verification...");
    try {
      const { MongoMemoryServer } = await import("mongodb-memory-server");
      mongod = await MongoMemoryServer.create({ binary: { version: "8.0.4" } });
      process.env.MONGODB_URI = mongod.getUri("aura_orders_index_test");
      console.log(`✅ In-memory database initialized: ${process.env.MONGODB_URI}`);
    } catch (err) {
      console.error("❌ Failed to start in-memory Mongo server:", err.message);
      process.exit(1);
    }
  }

  console.log("📡 Connecting to MongoDB...");
  const connected = await connectDB();
  if (!connected || mongoose.connection.readyState !== 1) {
    console.error("❌ Database connection failed. Please ensure MONGODB_URI is configured.");
    process.exit(1);
  }

  console.log(`✅ Connected to DB: [${mongoose.connection.name}] at [${mongoose.connection.host}]\n`);

  if (isVerifyOnly) {
    console.log("🔍 Verifying current indexes on 'orders' collection...");
    const result = await verifyOrderIndexes();
    printVerificationReport(result);
  } else {
    console.log("⚡ Verifying & applying required indexes on 'orders' collection...");
    const result = await applyOrderIndexes();
    printApplicationReport(result);
  }

  if (mongod) {
    await mongod.stop();
  }

  await mongoose.disconnect();
  console.log("\n✨ Done!");
  process.exit(0);
}

function printVerificationReport(res) {
  console.log(`📊 Collection: ${res.collectionName || "orders"} | Total Indexes: ${res.totalExistingIndexes}`);
  console.log(`⏱️ Duration: ${res.durationMs}ms\n`);

  console.log("🎯 Required Optimization Fields Status:");
  for (const field of REQUIRED_FIELDS) {
    const status = res.fieldStatus[field];
    const icon = status?.covered ? "✅ [INDEXED]" : "❌ [MISSING]";
    const matching = status?.matchingIndexes?.map(m => `${m.name} (${JSON.stringify(m.key)})`).join(", ") || "None";
    console.log(`  - ${field.padEnd(15)} : ${icon} -> ${matching}`);
  }

  console.log("\n📋 All Existing Indexes:");
  (res.existingIndexes || []).forEach((idx, i) => {
    console.log(`  ${i + 1}. ${idx.name.padEnd(35)} : ${JSON.stringify(idx.key)}`);
  });

  if (res.allRequiredCovered) {
    console.log("\n🎉 ALL REQUIRED FIELDS ARE FULLY INDEXED AND OPTIMIZED!");
  } else {
    console.log("\n⚠️ Some required fields are missing indexes. Run without --verify-only to apply them.");
  }
}

function printApplicationReport(res) {
  console.log(`📋 Result: ${res.message}`);
  console.log(`⏱️ Execution Time: ${res.durationMs}ms\n`);

  if (res.appliedSpecs && res.appliedSpecs.length > 0) {
    console.log("🛠️ Applied / Ensured Index Specifications:");
    res.appliedSpecs.forEach((spec, i) => {
      console.log(`  ${i + 1}. Key: ${JSON.stringify(spec.key).padEnd(45)} Status: ${spec.status} (Name: ${spec.name || "N/A"})`);
    });
    console.log("");
  }

  if (res.verification) {
    printVerificationReport(res.verification);
  }
}

main().catch((err) => {
  console.error("❌ Fatal execution error:", err);
  process.exit(1);
});
