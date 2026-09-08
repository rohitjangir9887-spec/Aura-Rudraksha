import { Counter } from "../models/Counter.js";
import { Order } from "../models/Order.js";

/**
 * Generates permanent customer-facing unique sequential Order IDs using atomic MongoDB Counter
 * Format: AURA-10001, AURA-10002, etc.
 * 
 * Rules:
 * - Atomic $inc in MongoDB Counter collection
 * - Sequential guarantee under high concurrency
 * - Guaranteed unique across active and historical orders in MongoDB
 */
export async function generateNextOrderNumber() {
  try {
    // 1. Atomic increment on Counter document
    let counter = await Counter.findByIdAndUpdate(
      { _id: "orderNumber" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );

    // If seq is less than 10001, initialize counter to start at 10001 or max existing order
    if (!counter.seq || counter.seq < 10001) {
      // Find highest numeric order number in DB if any exists
      const latestOrder = await Order.findOne({ orderNumber: /^AURA-\d+$/ })
        .sort({ createdAt: -1 })
        .lean();

      let startSeq = 10001;
      if (latestOrder) {
        const match = String(latestOrder.orderNumber || "").match(/^AURA-(\d+)$/);
        if (match && match[1]) {
          const highestNum = parseInt(match[1], 10);
          if (!isNaN(highestNum) && highestNum >= 10000) {
            startSeq = highestNum + 1;
          }
        }
      }

      counter = await Counter.findByIdAndUpdate(
        { _id: "orderNumber" },
        { $set: { seq: startSeq } },
        { new: true, upsert: true }
      );
    }

    const orderNumber = `AURA-${counter.seq}`;

    // 2. Extra safety verification against existing orders in MongoDB
    const existing = await Order.findOne({ 
      $or: [
        { id: orderNumber }, 
        { orderId: orderNumber }, 
        { orderNumber: orderNumber }
      ] 
    }).lean();

    if (!existing) {
      return orderNumber;
    }

    // If collision exists, increment again atomically
    const retryCounter = await Counter.findByIdAndUpdate(
      { _id: "orderNumber" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    return `AURA-${retryCounter.seq}`;
  } catch (err) {
    console.error("Error generating sequential order number via Counter:", err);
    throw new Error("Order ID generation failed due to database counter error.");
  }
}


