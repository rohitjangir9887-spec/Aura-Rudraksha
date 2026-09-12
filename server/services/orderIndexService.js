import mongoose from "mongoose";
import { Order } from "../models/Order.js";
import { connectDB, isDbConnected } from "../config/db.js";

/**
 * Core query fields required by the optimization specification
 */
export const REQUIRED_FIELDS = ["authUserId", "email", "phone", "createdAt", "orderId"];

/**
 * Target index specifications for optimal query performance on the orders collection
 */
export const TARGET_ORDER_INDEX_SPECS = [
  { key: { id: 1 }, options: { unique: true, background: true } },
  { key: { orderId: 1 }, options: { background: true } },
  { key: { orderNumber: 1 }, options: { background: true } },
  { key: { authUserId: 1 }, options: { background: true } },
  { key: { email: 1 }, options: { background: true } },
  { key: { customerEmail: 1 }, options: { background: true } },
  { key: { phone: 1 }, options: { background: true } },
  { key: { customerPhone: 1 }, options: { background: true } },
  { key: { "shippingAddress.email": 1 }, options: { background: true } },
  { key: { "shippingAddress.phone": 1 }, options: { background: true } },
  { key: { createdAt: -1 }, options: { background: true } },
  { key: { guestToken: 1 }, options: { background: true } },
  { key: { customerId: 1 }, options: { background: true } },
  { key: { txnid: 1 }, options: { background: true } },
  { key: { mihpayid: 1 }, options: { background: true } },
  { key: { paymentStatus: 1 }, options: { background: true } },
  { key: { orderStatus: 1 }, options: { background: true } },
  { key: { refundStatus: 1 }, options: { background: true } },
  { key: { orderSource: 1 }, options: { background: true } },
  { key: { "paymentAttempts.txnid": 1 }, options: { background: true } }
];

/**
 * Check if two index key definitions match
 */
function areKeysEqual(key1, key2) {
  if (!key1 || !key2) return false;
  const k1 = Object.keys(key1);
  const k2 = Object.keys(key2);
  if (k1.length !== k2.length) return false;
  return k1.every(k => key2[k] !== undefined && Number(key1[k]) === Number(key2[k]));
}

/**
 * Helper to match if an existing index covers a field
 */
function isFieldCovered(indexKey, targetField) {
  if (!indexKey || typeof indexKey !== "object") return false;
  const keys = Object.keys(indexKey);
  if (keys.includes(targetField)) return true;

  // Aliases / related fields
  if (targetField === "email" && (keys.includes("customerEmail") || keys.includes("shippingAddress.email"))) return true;
  if (targetField === "phone" && (keys.includes("customerPhone") || keys.includes("shippingAddress.phone"))) return true;
  if (targetField === "orderId" && (keys.includes("orderNumber") || keys.includes("id"))) return true;

  return false;
}

/**
 * Verify current MongoDB indexes on the orders collection.
 * Checks for presence of indexes on authUserId, email, phone, createdAt, orderId.
 */
export async function verifyOrderIndexes() {
  const start = Date.now();
  if (!isDbConnected()) {
    await connectDB();
  }

  if (!mongoose.connection || mongoose.connection.readyState !== 1) {
    return {
      success: false,
      isConnected: false,
      message: "Database is not connected. Cannot inspect orders collection indexes.",
      durationMs: Date.now() - start
    };
  }

  const collection = Order.collection || mongoose.connection.db.collection("orders");
  let existingIndexes = [];
  try {
    existingIndexes = await collection.listIndexes().toArray();
  } catch (err) {
    if (err.codeName === "NamespaceNotFound" || err.message?.includes("ns does not exist")) {
      existingIndexes = [];
    } else {
      throw err;
    }
  }

  const fieldStatus = {};
  for (const field of REQUIRED_FIELDS) {
    const matching = existingIndexes.filter(idx => isFieldCovered(idx.key, field));
    fieldStatus[field] = {
      covered: matching.length > 0,
      matchingIndexes: matching.map(idx => ({
        name: idx.name,
        key: idx.key,
        unique: Boolean(idx.unique)
      }))
    };
  }

  const allRequiredCovered = REQUIRED_FIELDS.every(field => fieldStatus[field].covered);
  const durationMs = Date.now() - start;

  return {
    success: true,
    isConnected: true,
    collectionName: collection.collectionName,
    databaseName: mongoose.connection.name,
    allRequiredCovered,
    requiredFields: REQUIRED_FIELDS,
    fieldStatus,
    totalExistingIndexes: existingIndexes.length,
    existingIndexes: existingIndexes.map(idx => ({
      name: idx.name,
      key: idx.key,
      unique: Boolean(idx.unique),
      background: Boolean(idx.background)
    })),
    durationMs,
    timestamp: new Date().toISOString()
  };
}

/**
 * Apply and build required MongoDB indexes on the orders collection.
 * Uses Mongoose schema indexing and direct MongoDB collection index builders.
 */
export async function applyOrderIndexes() {
  const start = Date.now();
  if (!isDbConnected()) {
    await connectDB();
  }

  if (!mongoose.connection || mongoose.connection.readyState !== 1) {
    return {
      success: false,
      isConnected: false,
      message: "Database is not connected. Cannot apply indexes on orders collection.",
      durationMs: Date.now() - start
    };
  }

  const collection = Order.collection || mongoose.connection.db.collection("orders");

  // Step 1: Query existing indexes
  let existing = [];
  try {
    existing = await collection.listIndexes().toArray();
  } catch (_) {
    existing = [];
  }

  // Step 2: Ensure schema indexes via Mongoose
  let syncResult = null;
  try {
    syncResult = await Order.syncIndexes();
  } catch (syncErr) {
    console.warn("⚠️ [Mongoose syncIndexes notice]:", syncErr.message);
  }

  // Step 3: Ensure each target specification directly on MongoDB collection
  const createdResults = [];
  for (const spec of TARGET_ORDER_INDEX_SPECS) {
    const alreadyExists = existing.some(idx => areKeysEqual(idx.key, spec.key));
    if (alreadyExists) {
      createdResults.push({
        key: spec.key,
        status: "already_present"
      });
      continue;
    }

    try {
      const idxName = await collection.createIndex(spec.key, spec.options || {});
      createdResults.push({
        key: spec.key,
        name: idxName,
        status: "created"
      });
    } catch (createErr) {
      createdResults.push({
        key: spec.key,
        error: createErr.message,
        status: "error"
      });
    }
  }

  // Step 4: Run comprehensive verification post-application
  const verification = await verifyOrderIndexes();
  const durationMs = Date.now() - start;

  return {
    success: verification.allRequiredCovered,
    message: verification.allRequiredCovered
      ? "All required indexes (authUserId, email, phone, createdAt, orderId) verified and active on orders collection."
      : "Some index applications failed or fields remain uncovered.",
    syncResult,
    appliedSpecs: createdResults,
    verification,
    durationMs,
    timestamp: new Date().toISOString()
  };
}
