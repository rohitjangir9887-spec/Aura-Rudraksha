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
      return res.status(403).json({ success: false, message: "Access Denied: You can only view your own orders." });
    }

    return res.json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
}

export async function createOrder(req, res, next) {
  if (!isDbConnected()) {
    return res.status(503).json({
      success: false,
      error: "Database unavailable",
      message: "Order service is temporarily unavailable. Please try again shortly.",
      databaseUnavailable: true
    });
  }

  const data = pickFields(req.body, CUSTOMER_ORDER_FIELDS);
  const authUserId = req.user.authUserId;

  const rawLines = data.lines || data.items || [];
  if (!Array.isArray(rawLines) || rawLines.length === 0) {
    return res.status(400).json({ success: false, message: "Order must contain valid items" });
  }

  // Persistent & in-memory Idempotency Guard
  const idempotencyKey = req.headers["x-idempotency-key"] || data.idempotencyKey || null;
  if (idempotencyKey) {
    const idempResult = await checkOrAcquireIdempotency({
      key: idempotencyKey,
      userId: authUserId,
      action: "create_order",
      payload: { rawLines, couponCode: data.couponCode || data.coupon || "" }
    });

    if (idempResult.status === "COMPLETED") {
      return res.status(idempResult.responseStatus || 200).json(idempResult.responseBody);
    }
    if (idempResult.status === "IN_PROGRESS") {
      return res.status(409).json({ success: false, message: idempResult.error || "Order creation already in progress" });
    }
    if (idempResult.status === "PAYLOAD_MISMATCH") {
      return res.status(422).json({ success: false, message: idempResult.error });
    }
  }

  // In-flight debounce protection
  cleanRecentSubmissions();
  const submissionKey = `${authUserId}:${JSON.stringify(rawLines)}:${data.couponCode || data.coupon || ""}`;
  const existingSubmission = recentOrderSubmissions.get(submissionKey);
  if (existingSubmission && (Date.now() - existingSubmission.time < 5000)) {
    if (existingSubmission.order) {
      return res.status(200).json({ success: true, data: existingSubmission.order, duplicatePrevented: true });
    }
    return res.status(429).json({ success: false, message: "Order is already being processed. Please wait..." });
  }

  recentOrderSubmissions.set(submissionKey, { time: Date.now(), order: null });

  try {
    // 1. Authoritative Server Calculation (never trust client prices, discounts, or shipping)
    const couponCodeToValidate = data.couponCode || data.coupon || null;
    const totals = await calculateOrderTotals({
      lines: rawLines,
      couponCode: couponCodeToValidate,
      authUserId
    });

    if (!totals.items || totals.items.length === 0) {
      recentOrderSubmissions.delete(submissionKey);
      if (idempotencyKey) await releaseIdempotency({ key: idempotencyKey, action: "create_order" });
      return res.status(400).json({ 
        success: false, 
        message: totals.unavailableItems?.[0]?.reason || "Selected products are unavailable or discontinued." 
      });
    }

    // Check stock for all items
    const itemIds = totals.items.map(item => item.id);
    const dbProducts = await Product.find({ id: { $in: itemIds } });
    const productMap = new Map(dbProducts.map(p => [String(p.id), p]));

    for (const item of totals.items) {
      const product = productMap.get(String(item.id));
      const pStatus = (product?.status || "Published").toLowerCase();
      if (!product || pStatus === "draft" || pStatus === "inactive" || pStatus === "archived") {
        recentOrderSubmissions.delete(submissionKey);
        if (idempotencyKey) await releaseIdempotency({ key: idempotencyKey, action: "create_order" });
        return res.status(400).json({ 
          success: false, 
          message: `Product '${item.name}' is no longer available.` 
        });
      }
      if (product.stock !== undefined && product.stock < item.quantity) {
        recentOrderSubmissions.delete(submissionKey);
        if (idempotencyKey) await releaseIdempotency({ key: idempotencyKey, action: "create_order" });
        return res.status(400).json({ 
          success: false, 
          message: `Product '${product.name}' is out of stock (Available: ${product.stock}, Requested: ${item.quantity}).` 
        });
      }
    }

    // If coupon code was provided, verify it is APPLIED
    let validCouponDoc = null;
    if (couponCodeToValidate) {
      if (totals.couponStatus !== "APPLIED" || !totals.couponValid) {
        recentOrderSubmissions.delete(submissionKey);
        if (idempotencyKey) await releaseIdempotency({ key: idempotencyKey, action: "create_order" });
        return res.status(400).json({
          success: false,
          status: totals.couponStatus,
          message: totals.couponReason || "The applied coupon is invalid or expired. Please review your order."
        });
      }
      validCouponDoc = await Coupon.findOne({ code: String(couponCodeToValidate).trim().toUpperCase() });
    }

    // Server always generates the permanent sequential order ID from MongoDB atomic counter
    let id;
    try {
      id = await generateNextOrderNumber();
    } catch (seqErr) {
      recentOrderSubmissions.delete(submissionKey);
      if (idempotencyKey) await releaseIdempotency({ key: idempotencyKey, action: "create_order" });
      console.error("Order ID generation error:", seqErr.message);
      return res.status(503).json({
        success: false,
        error: "Database sequence error",
        message: "Could not generate order ID due to database issue. Please try again.",
        databaseUnavailable: true
      });
    }
    const now = new Date().toISOString();

    // Create copy of shipping address inside snapshot
    const shippingAddress = data.shippingAddress || {
       address: data.address || "",
       city: data.city || "",
       state: data.state || "",
       pincode: data.pincode || "",
       phone: data.phone || data.customerPhone || "",
       firstName: data.firstName || "",
       lastName: data.lastName || ""
    };

    const email = (data.customerEmail || req.user.email || "").trim().toLowerCase();
    const phone = (data.customerPhone || data.phone || req.user.phoneNumber || "").trim();
    const name = data.customerName || (data.firstName ? `${data.firstName} ${data.lastName || ''}`.trim() : (req.user.name || "Customer"));

    // Server-authoritative Order Payload (P0: NEVER allow client-controlled payment/order state)
    const orderPayload = {
      id,
      orderId: id,
      orderNumber: id,
      authUserId,
      customerId: authUserId,
      customerName: name,
      customerEmail: email,
      customerPhone: phone,
      phone,
      firstName: data.firstName || "",
      lastName: data.lastName || "",
      address: data.address || "",
      city: data.city || "",
      state: data.state || "",
      pincode: data.pincode || "",
      shippingAddress,
      notes: data.notes || "",
      date: now,
      items: totals.items,
      snapshotItems: totals.items,
      subtotal: totals.subtotal,
      totalMrp: totals.totalMrp,
      productDiscount: totals.productSavings,
      discount: totals.couponDiscount,
      couponDiscount: totals.couponDiscount,
      couponCode: totals.appliedCoupon?.code || "",
      appliedCoupon: totals.appliedCoupon,
      shipping: totals.shipping,
      shippingFee: totals.shipping,
      shippingDiscount: totals.shippingDiscount,
      tax: 0,
      amount: totals.finalTotal,
      total: totals.finalTotal,
      finalAmount: totals.finalTotal,
      savings: totals.totalSavings,
      totalSavings: totals.totalSavings,
      status: ORDER_STATES.PENDING,
      orderStatus: ORDER_STATES.PENDING,
      orderSource: data.orderSource || data.source || "website",
      source: data.orderSource || data.source || "website",
      paymentStatus: PAYMENT_STATES.PENDING, // Strictly PENDING on creation!
      paymentMethod: data.paymentMethod || "PayU Hosted Checkout (UPI / Cards / NetBanking)",
      inventoryDeducted: true, // Atomically deducted on order placement
      history: [
        createStateHistoryEntry({
          fromStatus: "NONE",
          toStatus: ORDER_STATES.PENDING,
          actor: authUserId,
          actorRole: "customer",
          reason: "Order created",
          source: "checkout"
        })
      ]
    };
    
    // Atomically decrement stock
    const bulkOps = [];
    for (const item of totals.items) {
      bulkOps.push({
        updateOne: {
          filter: { id: item.id, stock: { $gte: item.quantity } },
          update: { $inc: { stock: -item.quantity } }
        }
      });
    }
    if (bulkOps.length > 0) {
      await Product.bulkWrite(bulkOps);
    }
    if (totals.appliedCoupon && totals.appliedCoupon.code) {
      await Coupon.updateOne(
        { code: String(totals.appliedCoupon.code).trim().toUpperCase() },
        { $inc: { usage: 1 } }
      );
    }

    const created = await Order.findOneAndUpdate(
      { id: orderPayload.id },
      orderPayload,
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );

    // Save in deduplication cache
    recentOrderSubmissions.set(submissionKey, { time: Date.now(), order: created });

    // Auto update/create customer record in MongoDB
    try {
      await recordCustomerOrder({
        authUserId,
        email,
        phone,
        name,
        address: orderPayload.address,
        amount: orderPayload.finalAmount
      });
    } catch (custErr) {
      console.warn("Could not sync customer on order:", custErr.message);
    }

    const responsePayload = { success: true, data: created };

    if (idempotencyKey) {
      await commitIdempotency({
        key: idempotencyKey,
        action: "create_order",
        responseStatus: 201,
        responseBody: responsePayload,
        resourceId: created.id
      });
    }
    
    return res.status(201).json(responsePayload);
  } catch (err) {
    if (idempotencyKey) await releaseIdempotency({ key: idempotencyKey, action: "create_order" });
    next(err);
  }
}

export async function updateOrder(req, res, next) {
  try {
    const { id } = req.params;
    const data = req.body;
    const authUserId = req.user.authUserId;

    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        error: "Database unavailable",
        message: "Database is unavailable. Cannot update order without MongoDB connection.",
        databaseUnavailable: true
      });
    }

    const { isInitialAdmin } = isAdminUser(req.user);
    const isAdmin = isInitialAdmin || (await hasAdminRole(authUserId));

    let existing = await Order.findOne({ $or: [{ id: String(id) }, { orderId: String(id) }, { orderNumber: String(id) }] });
    if (!existing && id.match(/^[0-9a-fA-F]{24}$/)) {
      existing = await Order.findById(id);
    }
    if (!existing) return res.status(404).json({ success: false, message: "Order not found" });

    let updateFields = {};

    if (isAdmin) {
      // Handle seller/admin cancellation rules
      if (data.status === "Cancelled" || data.orderStatus === "Cancelled") {
        updateFields.status = ORDER_STATES.CANCELLED;
        updateFields.orderStatus = ORDER_STATES.CANCELLED;
        updateFields.cancelledBy = data.cancelledBy || "Seller";
        updateFields.cancelReason = data.cancelReason || "Order cancelled by seller";
        updateFields.cancelledAt = new Date().toISOString();

        if (existing.paymentStatus === PAYMENT_STATES.PAID || existing.paymentStatus === "Refunded") {
          updateFields.paymentStatus = PAYMENT_STATES.PAID;
          const amtRef = Number(existing.amountRefunded || 0);
          const totalAmt = Number(existing.finalAmount || existing.total || existing.amount || 0);
          if (amtRef >= (totalAmt - 0.01) && amtRef > 0) {
            updateFields.refundStatus = REFUND_STATES.REFUNDED;
          } else {
            updateFields.refundStatus = REFUND_STATES.REFUND_PENDING;
          }
        } else {
          updateFields.paymentStatus = PAYMENT_STATES.NOT_RECEIVED;
          updateFields.refundStatus = REFUND_STATES.NONE;
        }
      } else {
        // Admin state transitions with validation
        if (data.orderStatus && data.orderStatus !== existing.orderStatus) {
          if (!isValidOrderTransition(existing.orderStatus, data.orderStatus)) {
            return res.status(400).json({
              success: false,
              message: `Invalid order status transition from '${existing.orderStatus}' to '${data.orderStatus}'`
            });
          }
          updateFields.orderStatus = data.orderStatus;
          updateFields.status = data.orderStatus;
        }
        if (data.status && data.status !== existing.status && !updateFields.status) {
          if (!isValidOrderTransition(existing.status, data.status)) {
            return res.status(400).json({
              success: false,
              message: `Invalid order status transition from '${existing.status}' to '${data.status}'`
            });
          }
          updateFields.status = data.status;
          updateFields.orderStatus = data.status;
        }
        if (data.paymentStatus && data.paymentStatus !== existing.paymentStatus) {
          if (!isValidPaymentTransition(existing.paymentStatus, data.paymentStatus)) {
            return res.status(400).json({
              success: false,
              message: `Invalid payment status transition from '${existing.paymentStatus}' to '${data.paymentStatus}'`
            });
          }
          updateFields.paymentStatus = data.paymentStatus;
        }
      }

      // Tracking & shipping updates
      if (data.trackingNumber !== undefined) updateFields.trackingNumber = String(data.trackingNumber).trim();
      if (data.trackingId !== undefined) updateFields.trackingId = String(data.trackingId).trim();
      if (data.courierName !== undefined) updateFields.courierName = String(data.courierName).trim();
      if (data.carrier !== undefined) updateFields.carrier = String(data.carrier).trim();
      if (data.trackingUrl !== undefined) updateFields.trackingUrl = String(data.trackingUrl).trim();
      if (data.shippingLink !== undefined) updateFields.shippingLink = String(data.shippingLink).trim();
      if (data.estimatedDeliveryDate !== undefined) updateFields.estimatedDeliveryDate = String(data.estimatedDeliveryDate).trim();
      if (data.notes !== undefined) updateFields.notes = String(data.notes).trim();
      if (data.refundNotes !== undefined) updateFields.refundNotes = String(data.refundNotes).trim();
      if (data.refundNote !== undefined) updateFields.refundNote = String(data.refundNote).trim();
      if (data.refundStatus !== undefined) updateFields.refundStatus = String(data.refundStatus).trim();
      if (data.amountRefunded !== undefined && !isNaN(Number(data.amountRefunded))) updateFields.amountRefunded = Number(data.amountRefunded);
      if (data.address !== undefined) updateFields.address = String(data.address).trim();
      if (data.shippingAddress) updateFields.shippingAddress = data.shippingAddress;

      // Log audit trail
      await logAuditEvent({
        actor: req.user.email || authUserId,
        actorRole: "admin",
        action: "ORDER_UPDATED_BY_ADMIN",
        entityType: "Order",
        entityId: existing.id || String(existing._id),
        oldState: { orderStatus: existing.orderStatus, paymentStatus: existing.paymentStatus },
        newState: updateFields,
        reason: data.reason || "Admin order update",
        req
      });
    } else if (existing.authUserId === authUserId) {
      // Customer permissions: Only cancel or update address on pending/cancellable orders
      const cancellableStatuses = [ORDER_STATES.PENDING, ORDER_STATES.PAYMENT_PENDING, ORDER_STATES.CONFIRMED, ORDER_STATES.PROCESSING];
      
      if (data.status === "Cancelled" || data.orderStatus === "Cancelled") {
        if (existing.paymentStatus === PAYMENT_STATES.PAID || existing.paymentStatus === "Refunded") {
          return res.status(400).json({
            success: false,
            message: "Paid orders cannot be cancelled via this endpoint. Please contact customer support for refund/cancellation."
          });
        }
        if (!cancellableStatuses.includes(existing.orderStatus || existing.status)) {
          return res.status(400).json({
            success: false,
            message: `Order cannot be cancelled in '${existing.orderStatus || existing.status}' state.`
          });
        }
        updateFields.status = ORDER_STATES.CANCELLED;
        updateFields.orderStatus = ORDER_STATES.CANCELLED;
        updateFields.cancelledAt = new Date().toISOString();
        updateFields.cancelReason = String(data.cancelReason || "Cancelled by customer").trim();
        updateFields.cancelledBy = "Customer";
        updateFields.paymentStatus = "Cancelled";
      }

      if (data.address && cancellableStatuses.includes(existing.orderStatus || existing.status)) {
        updateFields.address = String(data.address).trim();
        if (data.shippingAddress) updateFields.shippingAddress = data.shippingAddress;
      }

      if (Object.keys(updateFields).length === 0) {
        return res.status(400).json({ success: false, message: "Cannot modify this order in its current state" });
      }
    } else {
      return res.status(403).json({ success: false, message: "Access Denied: You do not own this order" });
    }

    const updated = await Order.findByIdAndUpdate(existing._id, { $set: updateFields }, { returnDocument: "after" });
    return res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

/**
 * Public, privacy-safe Order Tracking endpoint (No Auth Required)
 * Allows customers to track their orders using Order ID / Phone / Tracking Number
 * Masks sensitive PII while providing accurate live dispatch and fulfillment status.
 */
export async function trackOrderPublic(req, res, next) {
  try {
    const rawQuery = String(req.query.query || req.query.orderId || req.body?.orderId || "").trim();
    const rawPhone = String(req.query.phone || req.body?.phone || "").replace(/\D/g, "");

    if (!rawQuery && !rawPhone) {
      return res.status(400).json({ 
        success: false, 
        message: "Order ID (e.g. AUR-1001) or Registered Phone number is required for tracking." 
      });
    }

    let order = null;
    const cleanTerm = rawQuery.toUpperCase();

    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        error: "Database unavailable",
        message: "Order tracking is temporarily unavailable. Please try again in a few moments.",
        databaseUnavailable: true
      });
    }

    const queryConditions = [];
    if (rawQuery) {
      queryConditions.push({ id: cleanTerm });
      queryConditions.push({ orderId: cleanTerm });
      queryConditions.push({ orderNumber: cleanTerm });
      queryConditions.push({ trackingNumber: cleanTerm });
      queryConditions.push({ trackingId: cleanTerm });
      if (cleanTerm.match(/^[0-9A-F]{24}$/i)) {
        queryConditions.push({ _id: cleanTerm });
      }
    }
    if (rawPhone && rawPhone.length >= 7) {
      const phoneFilters = buildPhoneQueryVariants(rawPhone, ["customerPhone", "phone", "shippingAddress.phone"]);
      queryConditions.push(...phoneFilters);
    }

    order = await Order.findOne({ $or: queryConditions }).sort({ createdAt: -1 }).lean();

    if (!order) {
      return res.status(404).json({ 
        success: false, 
        message: "No matching order found. Please check your Order ID or phone number." 
      });
    }

    // Mask sensitive PII for public tracking
    const custPhone = String(order.customerPhone || order.phone || order.shippingAddress?.phone || "");
    const maskedPhone = custPhone.length >= 10 
      ? custPhone.slice(0, 3) + "••••" + custPhone.slice(-3)
      : "••••••••";

    const custName = String(order.customerName || order.firstName || order.shippingAddress?.name || order.shippingAddress?.fullName || "Aura Devotee");
    const nameParts = custName.trim().split(" ");
    const maskedName = nameParts.length > 1
      ? `${nameParts[0]} ${nameParts[1][0]}***`
      : `${nameParts[0]}`;

    const safePublicOrder = {
      id: order.id || order.orderId,
      orderId: order.orderId || order.id,
      orderNumber: order.orderNumber || order.id,
      status: order.status || order.orderStatus || "Confirmed",
      orderStatus: order.orderStatus || order.status || "Confirmed",
      paymentStatus: order.paymentStatus || "Pending",
      refundStatus: order.refundStatus || "None",
      amountRefunded: Number(order.amountRefunded || 0),
      finalAmount: Number(order.finalAmount || order.total || order.amount || 0),
      cancelledBy: order.cancelledBy || "",
      cancelReason: order.cancelReason || "",
      paymentMethod: order.paymentMethod || "PayU Hosted (UPI / Cards / NetBanking)",
      trackingNumber: (order.trackingNumber || order.trackingId || "").trim(),
      courierPartner: (order.courierPartner || order.courierName || order.carrier || "").trim(),
      trackingUrl: (order.trackingUrl || order.shippingLink || "").trim(),
      createdAt: order.createdAt || order.date,
      expectedDelivery: order.expectedDelivery || order.estimatedDeliveryDate || null,
      destinationCity: order.shippingAddress?.city || order.city || "India",
      destinationPincode: order.shippingAddress?.pincode ? String(order.shippingAddress.pincode).slice(0, 3) + "***" : "",
      maskedCustomer: maskedName,
      maskedPhone: maskedPhone,
      items: (order.items || order.lines || []).map(item => ({
        id: item.id || item._id,
        name: item.name || item.title || "Sacred Rudraksha",
        qty: item.quantity || item.qty || 1,
        img: item.img || item.image || item.images?.[0] || "/images/product-5mukhi.jpg"
      })),
      timeline: order.timeline && order.timeline.length > 0 ? order.timeline : [
        { title: "Order Confirmed & Placed", date: new Date(order.createdAt || order.date || Date.now()).toLocaleDateString("en-IN"), done: true },
        { title: "Temple Prana Pratishtha Consecration", date: "Consecrated with Vedic Mantras", done: order.status !== "Cancelled" },
        { title: "Lab X-Ray Verification & Certification", date: "Certified Authentic Himalayan Bead", done: ["Processing", "Shipped", "Out for Delivery", "Delivered"].includes(order.status || order.orderStatus) },
        { title: "Dispatched via Express Air", date: order.trackingNumber ? `AWB: ${order.trackingNumber}` : "In Transit", done: ["Shipped", "Out for Delivery", "Delivered"].includes(order.status || order.orderStatus), current: (order.status || order.orderStatus) === "Shipped" },
        { title: "Delivered & Blessed", date: (order.status || order.orderStatus) === "Delivered" ? "Delivered" : "Expected in 2-4 days", done: (order.status || order.orderStatus) === "Delivered", current: (order.status || order.orderStatus) === "Delivered" }
      ]
    };

    return res.json({ success: true, data: safePublicOrder });
  } catch (err) {
    next(err);
  }
}

import { verifyPayuPaymentServerSide } from "../services/payuService.js";

export async function getPaymentFailureAlert(req, res, next) {
  try {
    const authUserId = req.user?.authUserId;
    const userEmail = req.user?.email;

    if (!authUserId && !userEmail) {
      return res.json({ success: true, hasNotification: false });
    }

    if (!isDbConnected()) {
      return res.json({ success: true, hasNotification: false });
    }

    // Find latest order for authenticated customer
    const query = {
      $or: [
        ...(authUserId ? [{ authUserId }] : []),
        ...(userEmail ? [{ customerEmail: userEmail.trim().toLowerCase() }] : [])
      ]
    };

    let latestOrder = await Order.findOne(query).sort({ createdAt: -1 }).lean();
    if (!latestOrder) {
      return res.json({ success: true, hasNotification: false });
    }

    // On-demand reconciliation for pending orders with a transaction ID
    if (latestOrder.txnid && (latestOrder.paymentStatus === "Pending" || latestOrder.paymentStatus === "Initiated")) {
      try {
        const verifyRes = await verifyPayuPaymentServerSide(latestOrder.txnid);
        if (verifyRes.success && verifyRes.isPaid) {
          await Order.updateOne(
            { _id: latestOrder._id },
            {
              $set: {
                paymentStatus: "Paid",
                status: "Confirmed",
                orderStatus: "Confirmed",
                payuStatus: "Success",
                unmappedstatus: verifyRes.unmappedStatus || "captured",
                mihpayid: verifyRes.mihpayid || latestOrder.mihpayid,
                bankRefNum: verifyRes.bankRefNum || latestOrder.bankRefNum,
                paymentMode: verifyRes.mode || latestOrder.paymentMode
              }
            }
          );
          latestOrder.paymentStatus = "Paid";
          latestOrder.status = "Confirmed";
          latestOrder.mihpayid = verifyRes.mihpayid || latestOrder.mihpayid;
          latestOrder.payuStatus = "Success";
        } else if (verifyRes.success) {
          const rawStatus = (verifyRes.status || "").toLowerCase();
          const unmapped = (verifyRes.unmappedStatus || "").toLowerCase();
          let newPayuStatus = verifyRes.status || verifyRes.unmappedStatus || "Failed";
          if (rawStatus === "bounced" || unmapped === "bounced") newPayuStatus = "Bounced";
          else if (rawStatus === "usercancelled" || unmapped === "usercancelled") newPayuStatus = "userCancelled";
          else if (rawStatus === "dropped" || unmapped === "dropped") newPayuStatus = "Dropped";

          let newPaymentStatus = "Failed";
          if (rawStatus === "usercancelled" || unmapped === "usercancelled") {
            newPaymentStatus = "Cancelled";
          } else if (rawStatus === "pending" || rawStatus === "initiated") {
            newPaymentStatus = "Pending";
          }

          if (newPaymentStatus !== latestOrder.paymentStatus || newPayuStatus !== latestOrder.payuStatus) {
            await Order.updateOne(
              { _id: latestOrder._id },
              {
                $set: {
                  paymentStatus: newPaymentStatus,
                  payuStatus: newPayuStatus,
                  unmappedstatus: verifyRes.unmappedStatus || "",
                  mihpayid: verifyRes.mihpayid || latestOrder.mihpayid || "",
                  bankRefNum: verifyRes.bankRefNum || latestOrder.bankRefNum || "",
                  paymentMode: verifyRes.mode || latestOrder.paymentMode || ""
                }
              }
            );
            latestOrder.paymentStatus = newPaymentStatus;
            latestOrder.payuStatus = newPayuStatus;
            latestOrder.mihpayid = verifyRes.mihpayid || latestOrder.mihpayid || "";
          }
        }
      } catch (e) {
        // Continue with current DB state if external API call fails
      }
    }

    // If order is Paid or Refunded or Confirmed, do NOT show payment alert
    if (latestOrder.paymentStatus === "Paid" || latestOrder.paymentStatus === "Refunded" || latestOrder.status === "Confirmed") {
      return res.json({ success: true, hasNotification: false });
    }

    // Determine notification type
    const pStatus = latestOrder.paymentStatus || "Pending";
    const oStatus = latestOrder.status || latestOrder.orderStatus;
    const payuSt = (latestOrder.payuStatus || "").toLowerCase();

    let notificationType = "Failed";
    if (pStatus === "Cancelled" || oStatus === "Cancelled" || payuSt === "usercancelled") {
      notificationType = "Cancelled";
    } else if (pStatus === "Pending" || pStatus === "Initiated" || payuSt === "initiated" || payuSt === "pending") {
      notificationType = "Pending";
    } else if (pStatus === "Failed" || payuSt === "bounced" || payuSt === "failed" || payuSt === "dropped") {
      notificationType = "Failed";
    }

    // Check 2-hour expiration relative to latest attempt timestamp or order update time
    let failedAtStr = latestOrder.updatedAt || latestOrder.createdAt || latestOrder.date || new Date().toISOString();
    if (Array.isArray(latestOrder.paymentAttempts) && latestOrder.paymentAttempts.length > 0) {
      const latestAttempt = latestOrder.paymentAttempts[latestOrder.paymentAttempts.length - 1];
      if (latestAttempt && (latestAttempt.updatedAt || latestAttempt.createdAt)) {
        failedAtStr = latestAttempt.updatedAt || latestAttempt.createdAt;
      }
    }

    const failedAt = new Date(failedAtStr);
    const expiresAt = new Date(failedAt.getTime() + 2 * 60 * 60 * 1000); // 2 hours

    if (new Date() > expiresAt) {
      return res.json({ success: true, hasNotification: false });
    }

    const items = latestOrder.items || latestOrder.snapshotItems || [];
    const firstItem = items[0] || {};
    const productImage = firstItem.image || firstItem.imageUrl || firstItem.primaryImage || "";

    return res.json({
      success: true,
      hasNotification: true,
      data: {
        orderId: latestOrder._id,
        orderNumber: latestOrder.orderNumber || latestOrder.id,
        amount: Number(latestOrder.finalAmount || latestOrder.total || latestOrder.amount || 0),
        productName: firstItem.name || "Aura Sacred Product",
        productImage,
        itemsCount: items.length || 1,
        transactionId: latestOrder.txnid || "",
        payuPaymentId: latestOrder.mihpayid || "",
        payuStatus: latestOrder.payuStatus || latestOrder.unmappedstatus || notificationType,
        paymentStatus: notificationType, // "Failed", "Cancelled", "Pending"
        failedAt: failedAt.toISOString(),
        expiresAt: expiresAt.toISOString()
      }
    });

  } catch (err) {
    next(err);
  }
}

export async function addOrderMessage(req, res, next) {
  try {
    const { id } = req.params;
    const { message } = req.body;
    const authUserId = req.user?.authUserId;

    if (!isDbConnected()) {
      return res.status(503).json({ success: false, message: "Database unavailable" });
    }
    if (!message || String(message).trim() === "") {
      return res.status(400).json({ success: false, message: "Message cannot be empty" });
    }

    let order = await Order.findOne({ $or: [{ id: String(id) }, { orderId: String(id) }, { orderNumber: String(id) }] });
    if (!order && id.match(/^[0-9a-fA-F]{24}$/)) {
      order = await Order.findById(id);
    }
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    const { isInitialAdmin } = isAdminUser(req.user);
    const isAdmin = isInitialAdmin || (authUserId ? await hasAdminRole(authUserId) : false);

    const userEmail = (req.user?.email || "").trim().toLowerCase();
    const userPhone = (req.user?.phone || "").trim();
    const oEmail = (order.customerEmail || order.email || order.shippingAddress?.email || "").toLowerCase();
    const oPhone = order.customerPhone || order.phone || order.shippingAddress?.phone || "";

    const isOwner = authUserId && (
      order.authUserId === authUserId ||
      (userEmail && oEmail === userEmail) ||
      (userPhone && oPhone === userPhone)
    );

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ success: false, message: "Access Denied" });
    }

    const newMessage = {
      sender: isAdmin ? 'admin' : 'customer',
      senderName: isAdmin ? 'Admin' : (req.user?.name || order.customerName || 'Customer'),
      message: String(message).trim(),
      createdAt: new Date().toISOString()
    };

    const messages = order.messages || [];
    messages.push(newMessage);
    order.messages = messages;

    await order.save();

    return res.json({ success: true, message: "Message added", data: newMessage });
  } catch (err) {
    next(err);
  }
}
