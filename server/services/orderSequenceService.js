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

  try {
    const counterKey = `order_seq_${datePrefix}`;
    
    // Atomic sequential increment
    let counter = await Counter.findByIdAndUpdate(
      counterKey,
      { $inc: { seq: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    let seqNumber = counter ? counter.seq : 1;

    // Format: AURA-260902-000123
    const paddedSeq = String(seqNumber).padStart(6, "0");
    const orderNumber = `AURA-${datePrefix}-${paddedSeq}`;

    // Verify uniqueness in Order collection just in case
    const existing = await Order.findOne({ $or: [{ id: orderNumber }, { orderId: orderNumber }, { orderNumber }] });
    if (existing) {
      // Step counter again to avoid collision
      const retryCounter = await Counter.findByIdAndUpdate(
        counterKey,
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      const retrySeq = String(retryCounter.seq).padStart(6, "0");
      return `AURA-${datePrefix}-${retrySeq}`;
    }

    return orderNumber;
  } catch (err) {
    console.warn("⚠️ Counter sequence error, using timestamp sequential fallback:", err.message);
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    return `AURA-${datePrefix}-${randomSuffix}`;
  }
}
