/**
 * Order and Payment State Machine Service
 * Enforces authoritative lifecycle transitions and rejects invalid state hops.
 */

// Normalized Payment States
export const PAYMENT_STATES = {
  PENDING: "Pending",
  PAID: "Paid",
  FAILED: "Failed",
  REVIEW: "Review",
  REFUND_PENDING: "Refund Pending",
  PARTIALLY_REFUNDED: "Partially Refunded",
  REFUNDED: "Refunded"
};

// Allowed Payment Transitions Map
const ALLOWED_PAYMENT_TRANSITIONS = {
  [PAYMENT_STATES.PENDING]: [PAYMENT_STATES.PAID, PAYMENT_STATES.FAILED, PAYMENT_STATES.REVIEW],
  [PAYMENT_STATES.FAILED]: [PAYMENT_STATES.PENDING, PAYMENT_STATES.PAID], // Retry flow
  [PAYMENT_STATES.REVIEW]: [PAYMENT_STATES.PAID, PAYMENT_STATES.FAILED], // Must resolve to Paid or Failed before any refund action
  [PAYMENT_STATES.PAID]: [PAYMENT_STATES.REFUND_PENDING, PAYMENT_STATES.PARTIALLY_REFUNDED, PAYMENT_STATES.REFUNDED],
  [PAYMENT_STATES.REFUND_PENDING]: [PAYMENT_STATES.PARTIALLY_REFUNDED, PAYMENT_STATES.REFUNDED], // Cannot return to Paid
  [PAYMENT_STATES.PARTIALLY_REFUNDED]: [PAYMENT_STATES.REFUNDED, PAYMENT_STATES.PARTIALLY_REFUNDED],
  [PAYMENT_STATES.REFUNDED]: [] // Terminal
};

// Normalized Order States
export const ORDER_STATES = {
  PAYMENT_PENDING: "Payment Pending",
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  PROCESSING: "Processing",
  SHIPPED: "Shipped",
  OUT_FOR_DELIVERY: "Out for Delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled"
};

// Allowed Order Transitions Map
const ALLOWED_ORDER_TRANSITIONS = {
  [ORDER_STATES.PAYMENT_PENDING]: [ORDER_STATES.CONFIRMED, ORDER_STATES.PROCESSING, ORDER_STATES.SHIPPED, ORDER_STATES.CANCELLED],
  [ORDER_STATES.PENDING]: [ORDER_STATES.CONFIRMED, ORDER_STATES.PROCESSING, ORDER_STATES.SHIPPED, ORDER_STATES.CANCELLED],
  [ORDER_STATES.CONFIRMED]: [ORDER_STATES.PROCESSING, ORDER_STATES.SHIPPED, ORDER_STATES.CANCELLED],
  [ORDER_STATES.PROCESSING]: [ORDER_STATES.SHIPPED, ORDER_STATES.CANCELLED],
  [ORDER_STATES.SHIPPED]: [ORDER_STATES.OUT_FOR_DELIVERY, ORDER_STATES.DELIVERED, ORDER_STATES.CANCELLED],
  [ORDER_STATES.OUT_FOR_DELIVERY]: [ORDER_STATES.DELIVERED, ORDER_STATES.CANCELLED],
  [ORDER_STATES.DELIVERED]: [], // Terminal: Cannot go back to Pending/Cancelled
  [ORDER_STATES.CANCELLED]: []  // Terminal: Cannot go back to Paid/Processing
};

/**
 * Validates whether a payment status transition is valid
 */
export function isValidPaymentTransition(currentStatus, targetStatus) {
  if (!currentStatus) return true;
  if (currentStatus === targetStatus) return true;

  const normalizedCurrent = Object.values(PAYMENT_STATES).find(
    s => s.toLowerCase() === String(currentStatus).toLowerCase()
  ) || currentStatus;

  const normalizedTarget = Object.values(PAYMENT_STATES).find(
    s => s.toLowerCase() === String(targetStatus).toLowerCase()
  ) || targetStatus;

  const allowed = ALLOWED_PAYMENT_TRANSITIONS[normalizedCurrent];
  if (!allowed) return false;

  return allowed.includes(normalizedTarget);
}

/**
 * Validates whether an order status transition is valid
 */
export function isValidOrderTransition(currentStatus, targetStatus) {
  if (!currentStatus) return true;
  if (currentStatus === targetStatus) return true;

  const normalizedCurrent = Object.values(ORDER_STATES).find(
    s => s.toLowerCase() === String(currentStatus).toLowerCase()
  ) || currentStatus;

  const normalizedTarget = Object.values(ORDER_STATES).find(
    s => s.toLowerCase() === String(targetStatus).toLowerCase()
  ) || targetStatus;

  const allowed = ALLOWED_ORDER_TRANSITIONS[normalizedCurrent];
  if (!allowed) return false;

  return allowed.includes(normalizedTarget);
}

/**
 * Builds a state transition audit history entry
 */
export function createStateHistoryEntry({ fromStatus, toStatus, actor = "system", actorRole = "system", reason = "", source = "api", reference = "" }) {
  return {
    fromStatus,
    toStatus,
    actor,
    actorRole,
    reason,
    source,
    reference,
    timestamp: new Date().toISOString()
  };
}
