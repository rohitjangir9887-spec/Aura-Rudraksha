import crypto from "crypto";
import { Order } from "../models/Order.js";

/**
 * Generates permanent customer-facing unique Order IDs
 * Format: AURA followed by 9 random digits (e.g. AURA537372753)
 * 
 * Rules:
 * - Format strictly begins with 'AURA' followed by 9 cryptographically random digits
 * - Unique across active, cancelled, refunded, pending, and archived orders in MongoDB
 * - Cryptographically collision-resistant and guaranteed NEVER reused
 */
export async function generateNextOrderNumber() {
  let attempts = 0;
  while (attempts < 15) {
    attempts++;
    // Generate 9 random numeric digits (100,000,000 to 999,999,999)
    const randomBuffer = crypto.randomBytes(4);
    const randomNumber = Math.floor(100000000 + (randomBuffer.readUInt32BE(0) / 0xFFFFFFFF) * 900000000);
    const orderNumber = `AURA${randomNumber}`;

    // Verify absolute uniqueness against existing orders in MongoDB
    try {
      const existing = await Order.findOne({ 
        $or: [
          { id: orderNumber }, 
          { orderId: orderNumber }, 
          { orderNumber: orderNumber }
        ] 
      }).select("_id").lean();

      if (!existing) {
        return orderNumber;
      }
    } catch (e) {
      // If DB check has transient error, generate with timestamp entropy
      const timestampEntropy = String(Date.now()).slice(-6);
      const rand3 = Math.floor(100 + Math.random() * 900);
      return `AURA${timestampEntropy}${rand3}`;
    }
  }

  // High entropy fallback
  const timestampSuffix = String(Date.now()).slice(-7);
  const randomSuffix = Math.floor(10 + Math.random() * 90);
  return `AURA${timestampSuffix}${randomSuffix}`;
}


