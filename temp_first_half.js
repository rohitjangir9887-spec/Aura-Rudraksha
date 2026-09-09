import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { Coupon } from "../models/Coupon.js";
import { isDbConnected } from "../config/db.js";
import { recordCustomerOrder } from "./customerController.js";
import Customer from "../models/Customer.js";
import { calculateOrderTotals } from "../services/pricingService.js";
import { generateNextOrderNumber } from "../services/orderSequenceService.js";
import { isAdminUser, hasAdminRole } from "../middleware/auth.js";
import { pickFields } from "../utils/sanitize.js";
import { checkOrAcquireIdempotency, commitIdempotency, releaseIdempotency } from "../services/idempotencyService.js";
import { isValidOrderTransition, isValidPaymentTransition, createStateHistoryEntry, ORDER_STATES, PAYMENT_STATES, REFUND_STATES } from "../services/stateMachineService.js";
import { normalizeOrderState } from "../services/orderReconciliationService.js";
import { logAuditEvent } from "../services/auditService.js";
import { buildPhoneQueryVariants, normalizePhoneNumber } from "../utils/phoneUtils.js";
import crypto from "crypto";

// Allowed customer input fields during order creation
const CUSTOMER_ORDER_FIELDS = {
  items: "array",
  lines: "array",
  firstName: "string",
  lastName: "string",
  customerName: "string",
  customerEmail: "string",
  customerPhone: "string",
  phone: "string",
  address: "string",
  city: "string",
  state: "string",
  pincode: "string",
  shippingAddress: "object",
  notes: "string",
  couponCode: "string",
  coupon: "string",
  orderSource: "string",
  source: "string",
  idempotencyKey: "string"
};

// In-flight / recent order cache to prevent rapid double-clicks
const recentOrderSubmissions = new Map();

function cleanRecentSubmissions() {
  const now = Date.now();
  for (const [k, v] of recentOrderSubmissions.entries()) {
    if (now - v.time > 10000) {
      recentOrderSubmissions.delete(k);
    }
  }
}

export async function getOrders(req, res, next) {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        error: "Database unavailable",
        message: "Database is temporarily unavailable. Please try again shortly.",
        databaseUnavailable: true
      });
    }
    const rawOrders = await Order.find().sort({ createdAt: -1 }).lean();
    const orders = (rawOrders || []).map(o => normalizeOrderState(o));
    return res.json({ success: true, data: orders, count: orders.length });
  } catch (err) {
    next(err);
  }
}

export async function getMyOrders(req, res, next) {
  try {
    const authUserId = req.user.authUserId;
    const userEmail = (req.user.email || "").trim().toLowerCase();
    const userPhone = (req.user.phone || "").trim();

    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        error: "Database unavailable",
        message: "Database is temporarily unavailable. Please try again shortly.",
        databaseUnavailable: true
      });
    }

    const queryFilters = [{ authUserId }];
    if (userEmail) {
      queryFilters.push({ customerEmail: userEmail });
      queryFilters.push({ email: userEmail });
      queryFilters.push({ "shippingAddress.email": userEmail });
    }
    if (userPhone) {
      const phoneFilters = buildPhoneQueryVariants(userPhone, ["customerPhone", "phone", "shippingAddress.phone"]);
      queryFilters.push(...phoneFilters);
    }

    const rawOrders = await Order.find({ $or: queryFilters }).sort({ createdAt: -1 }).lean();
    const orders = (rawOrders || []).map(o => normalizeOrderState(o));
    return res.json({ success: true, data: orders, count: orders.length });
  } catch (err) {
    next(err);
  }
}

export async function getOrderById(req, res, next) {
  try {
    const { id } = req.params;
    const authUserId = req.user?.authUserId;
    const userEmail = (req.user?.email || "").trim().toLowerCase();
    const userPhone = (req.user?.phone || "").trim();
    const reqGuestToken = String(req.headers["x-guest-token"] || req.query.guestToken || "").trim();
    const reqTxnid = String(req.headers["x-payu-txnid"] || req.query.txnid || "").trim();

    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        error: "Database unavailable",
        message: "Database is temporarily unavailable. Please try again shortly.",
        databaseUnavailable: true
      });
    }

    let order = await Order.findOne({ $or: [{ id: String(id) }, { orderId: String(id) }, { orderNumber: String(id) }] }).lean();
    if (!order && id.match(/^[0-9a-fA-F]{24}$/)) {
      order = await Order.findById(id).lean();
    }
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }
    order = normalizeOrderState(order);

    // Authorization check
    const { isInitialAdmin } = isAdminUser(req.user);
    const isAdmin = isInitialAdmin || (authUserId ? await hasAdminRole(authUserId) : false);
    
    const oEmail = (order.customerEmail || order.email || order.shippingAddress?.email || "").toLowerCase();
    const oPhone = order.customerPhone || order.phone || order.shippingAddress?.phone || "";
    const isOwner = authUserId && (
      order.authUserId === authUserId ||
      (userEmail && oEmail === userEmail) ||
      (userPhone && oPhone === userPhone)
    );

    const isGuestOrder = !order.authUserId || order.authUserId === "guest" || String(order.authUserId).startsWith("guest_");
    const isGuestOwner = isGuestOrder && (
      (Boolean(order.guestToken) && reqGuestToken === order.guestToken) ||
      (Boolean(reqTxnid) && (order.txnid === reqTxnid || (order.paymentAttempts && order.paymentAttempts.some(a => a.txnid === reqTxnid)))) ||
      Boolean(req.user)
    );

    if (!isAdmin && !isOwner && !isGuestOwner) {
      return res.status(403).json({ success: false, message: "Access Denied" });
