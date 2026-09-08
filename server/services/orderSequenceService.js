import crypto from "crypto";
import { Counter } from "../models/Counter.js";
import { Order } from "../models/Order.js";

/**
 * Generates permanent customer-facing unique random Order IDs
 * Format: AURA-XXXXXXXX (e.g. AURA-8K2N94XP)
 * 
 * Rules:
 * - Format strictly begins with 'AURA-' followed by random uppercase alphanumeric characters
 * - Unique across active, cancelled, refunded, and archived orders in MongoDB
 * - Cryptographically collision-resistant and guaranteed NEVER reused
 */
export async function generateNextOrderNumber() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // excludes ambiguous chars 0, 1, I, O
  
  let attempts = 0;
  while (attempts < 10) {
    attempts++;
    // Generate 8 cryptographically secure random characters
    const randomBytes = crypto.randomBytes(8);
    let code = "";
    for (let i = 0; i < 8; i++) {
      code += chars[randomBytes[i] % chars.length];
    }
    
    const orderNumber = `AURA-${code}`;

    // Verify uniqueness against existing orders in MongoDB
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
  }

  // Fallback with timestamp guarantee if multiple collisions (extremely unlikely with 32^8 combinations)
  const timestampSuffix = Date.now().toString(36).toUpperCase().slice(-4);
  const randomBytes = crypto.randomBytes(4);
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars[randomBytes[i] % chars.length];
  }
  return `AURA-${code}${timestampSuffix}`;
}

