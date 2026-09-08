import { Counter } from "../models/Counter.js";
import { Order } from "../models/Order.js";

/**
 * Generates permanent customer-facing sequential Order IDs
 * Format: AURA-YYMMDD-000123
 * 
 * Rules:
 * - Unique MongoDB orderNumber
 * - Sequential, permanent, human-readable
 * - Never changes after creation
 */
export async function generateNextOrderNumber() {
  const now = new Date();
  
  // Format YYMMDD
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const datePrefix = `${yy}${mm}${dd}`;

  const counterKey = `order_seq_${datePrefix}`;
  
  // Atomic sequential increment in MongoDB
  const counter = await Counter.findByIdAndUpdate(
    counterKey,
    { $inc: { seq: 1 } },
    { returnDocument: "after", upsert: true, setDefaultsOnInsert: true }
  );

  if (!counter || typeof counter.seq !== "number") {
    throw new Error("Failed to atomically increment order sequence counter in MongoDB");
  }

  let seqNumber = counter.seq;

  // Format: AURA-260902-000123
  let paddedSeq = String(seqNumber).padStart(6, "0");
  let orderNumber = `AURA-${datePrefix}-${paddedSeq}`;

  // Verify uniqueness in Order collection; if collision occurs, step atomic counter again
  let existing = await Order.findOne({ $or: [{ id: orderNumber }, { orderId: orderNumber }, { orderNumber }] });
  let attempts = 0;
  while (existing && attempts < 5) {
    attempts++;
    const retryCounter = await Counter.findByIdAndUpdate(
      counterKey,
      { $inc: { seq: 1 } },
      { returnDocument: "after", upsert: true }
    );
    if (!retryCounter || typeof retryCounter.seq !== "number") {
      throw new Error("Failed to step order sequence counter in MongoDB");
    }
    const retrySeq = String(retryCounter.seq).padStart(6, "0");
    orderNumber = `AURA-${datePrefix}-${retrySeq}`;
    existing = await Order.findOne({ $or: [{ id: orderNumber }, { orderId: orderNumber }, { orderNumber }] });
  }

  if (existing) {
    throw new Error("Could not resolve unique sequential order ID in MongoDB after multiple attempts");
  }

  return orderNumber;
}
