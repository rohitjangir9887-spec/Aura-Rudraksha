import crypto from "crypto";
import { IdempotencyRecord } from "../models/IdempotencyRecord.js";
import { isDbConnected } from "../config/db.js";

// In-memory fallback map for non-DB runtime
const inMemoryIdempotency = new Map();

// Periodic cleanup of in-memory records
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of inMemoryIdempotency.entries()) {
    if (v.expiresAt && now > v.expiresAt) {
      inMemoryIdempotency.delete(k);
    }
  }
}, 5 * 60 * 1000).unref?.();

/**
 * Computes deterministic sha256 hash of payload
 */
export function hashPayload(payload) {
  const normalized = typeof payload === "string" ? payload : JSON.stringify(payload || {});
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

/**
 * Checks or acquires an idempotency lock for an action
 * Returns:
 * { status: "NEW" } -> proceed with execution
 * { status: "COMPLETED", responseStatus, responseBody } -> return cached response
 * { status: "IN_PROGRESS" } -> ongoing request, return 409/429
 * { status: "PAYLOAD_MISMATCH" } -> key reused with different request, reject 422
 */
export async function checkOrAcquireIdempotency({ key, userId = "", action, payload, ttlMs = 15 * 60 * 1000 }) {
  if (!key || typeof key !== "string") {
    return { status: "NEW" };
  }

  const cleanKey = `${action}::${key.trim()}`;
  const requestHash = hashPayload(payload);
  const now = new Date();
  const expiresAt = new Date(Date.now() + ttlMs);

  if (!isDbConnected()) {
    const existing = inMemoryIdempotency.get(cleanKey);
    if (existing) {
      if (existing.userId && userId && existing.userId !== userId) {
        return { status: "USER_MISMATCH", error: "Idempotency key ownership mismatch." };
      }
      if (existing.requestHash !== requestHash) {
        return { status: "PAYLOAD_MISMATCH", error: "Idempotency key reused with different request payload parameters." };
      }
      if (existing.status === "in_progress") {
        return { status: "IN_PROGRESS", error: "A matching operation is already in progress. Please wait." };
      }
      return {
        status: "COMPLETED",
        responseStatus: existing.responseStatus || 200,
        responseBody: existing.responseBody
      };
    }

    inMemoryIdempotency.set(cleanKey, {
      key: cleanKey,
      userId,
      action,
      requestHash,
      status: "in_progress",
      createdAt: now.getTime(),
      expiresAt: expiresAt.getTime()
    });
    return { status: "NEW" };
  }

  try {
    const existing = await IdempotencyRecord.findOne({ key: cleanKey });
    if (existing) {
      if (existing.userId && userId && existing.userId !== userId) {
        return { status: "USER_MISMATCH", error: "Idempotency key ownership mismatch." };
      }
      if (existing.requestHash !== requestHash) {
        return { status: "PAYLOAD_MISMATCH", error: "Idempotency key reused with different request payload parameters." };
      }
      if (existing.status === "in_progress") {
        return { status: "IN_PROGRESS", error: "A matching operation is already in progress. Please wait." };
      }
      return {
        status: "COMPLETED",
        responseStatus: existing.responseStatus || 200,
        responseBody: existing.responseBody
      };
    }

    // Atomically claim the key
    await IdempotencyRecord.create({
      key: cleanKey,
      userId,
      action,
      requestHash,
      status: "in_progress",
      expiresAt
    });

    return { status: "NEW" };
  } catch (err) {
    if (err.code === 11000) {
      // Race condition - duplicate key caught by unique index
      const duplicate = await IdempotencyRecord.findOne({ key: cleanKey });
      if (duplicate) {
        if (duplicate.userId && userId && duplicate.userId !== userId) {
          return { status: "USER_MISMATCH", error: "Idempotency key ownership mismatch." };
        }
        if (duplicate.requestHash === requestHash && duplicate.status === "completed") {
          return {
            status: "COMPLETED",
            responseStatus: duplicate.responseStatus || 200,
            responseBody: duplicate.responseBody
          };
        }
      }
      return { status: "IN_PROGRESS", error: "Concurrent request detected. Please wait." };
    }
    
    // Fail-closed for persistent idempotency errors on critical paths to prevent duplicate transactions
    console.error("Idempotency store error:", err.message);
    return { status: "STORE_ERROR", error: "Idempotency store failure: unable to safely verify request deduplication." };
  }
}

/**
 * Commits the completed response into the idempotency store
 */
export async function commitIdempotency({ key, action, responseStatus = 200, responseBody, resourceId = "" }) {
  if (!key) return;
  const cleanKey = `${action}::${key.trim()}`;

  if (!isDbConnected()) {
    const existing = inMemoryIdempotency.get(cleanKey);
    if (existing) {
      existing.status = "completed";
      existing.responseStatus = responseStatus;
      existing.responseBody = responseBody;
      existing.resourceId = resourceId;
    }
    return;
  }

  try {
    await IdempotencyRecord.findOneAndUpdate(
      { key: cleanKey },
      {
        $set: {
          status: "completed",
          responseStatus,
          responseBody,
          resourceId
        }
      }
    );
  } catch (err) {
    console.warn("Idempotency commit warning:", err.message);
  }
}

/**
 * Releases or clears an in-progress idempotency record on error/abort
 */
export async function releaseIdempotency({ key, action }) {
  if (!key) return;
  const cleanKey = `${action}::${key.trim()}`;

  if (!isDbConnected()) {
    inMemoryIdempotency.delete(cleanKey);
    return;
  }

  try {
    await IdempotencyRecord.deleteOne({ key: cleanKey });
  } catch (_) {}
}
