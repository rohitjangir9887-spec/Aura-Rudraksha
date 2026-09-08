import { Order } from "../models/Order.js";
import { isDbConnected } from "../config/db.js";
import { ORDER_STATES, PAYMENT_STATES, REFUND_STATES } from "./stateMachineService.js";

/**
 * Normalizes an order object to strictly satisfy business rules
 */
export function normalizeOrderState(rawOrder) {
  if (!rawOrder) return rawOrder;
  const o = { ...rawOrder };

  // 1. Ensure IDs
  o.id = o.id || o.orderId || o.orderNumber;
  o.orderId = o.orderId || o.id;
  o.orderNumber = o.orderNumber || o.id;

  // 2. Synchronize Order Status
  const isCancelled = o.status === ORDER_STATES.CANCELLED || o.orderStatus === ORDER_STATES.CANCELLED || Boolean(o.cancelledAt);
  if (isCancelled) {
    o.status = ORDER_STATES.CANCELLED;
    o.orderStatus = ORDER_STATES.CANCELLED;
    o.cancelledBy = o.cancelledBy || "Seller";
    o.cancelReason = o.cancelReason || "Order cancelled";
  } else {
    o.status = o.status || o.orderStatus || ORDER_STATES.CONFIRMED;
    o.orderStatus = o.status;
  }

  // 3. Synchronize Payment and Refund Status
  const amountRefunded = Number(o.amountRefunded || 0);
  const totalAmount = Number(o.finalAmount || o.total || o.amount || 0);

  if (amountRefunded > 0 && amountRefunded >= (totalAmount - 0.01)) {
    o.refundStatus = REFUND_STATES.REFUNDED;
    // Keep paymentStatus as Paid or Refunded
    o.paymentStatus = o.paymentStatus === PAYMENT_STATES.PAID ? PAYMENT_STATES.PAID : PAYMENT_STATES.REFUNDED;
  } else if (amountRefunded > 0) {
    o.refundStatus = REFUND_STATES.PARTIALLY_REFUNDED;
    o.paymentStatus = PAYMENT_STATES.PARTIALLY_REFUNDED;
  } else if (o.paymentStatus === PAYMENT_STATES.REFUND_PENDING) {
    o.refundStatus = REFUND_STATES.REFUND_PENDING;
  } else if (isCancelled && (!o.paymentStatus || [PAYMENT_STATES.PENDING, PAYMENT_STATES.FAILED, PAYMENT_STATES.NOT_RECEIVED, "Unpaid"].includes(o.paymentStatus))) {
    o.paymentStatus = PAYMENT_STATES.NOT_RECEIVED;
    o.refundStatus = REFUND_STATES.NONE;
  } else {
    o.refundStatus = o.refundStatus || REFUND_STATES.NONE;
  }

  return o;
}

/**
 * Reconciles orders in Mongo on server startup / requests
 */
export async function reconcileAllOrders() {
  try {
    if (!isDbConnected()) return;

    // Reconcile any inconsistent cancelled orders in MongoDB
    const inconsistentCancelled = await Order.find({
      $or: [
        { status: "Cancelled", orderStatus: { $ne: "Cancelled" } },
        { orderStatus: "Cancelled", status: { $ne: "Cancelled" } },
        { cancelledAt: { $exists: true, $ne: "" }, status: { $ne: "Cancelled" } }
      ]
    });

    for (const ord of inconsistentCancelled) {
      const normalized = normalizeOrderState(ord.toObject());
      await Order.updateOne({ _id: ord._id }, { $set: normalized });
    }
  } catch (err) {
    console.warn("Order reconciliation notice:", err?.message || err);
  }
}
