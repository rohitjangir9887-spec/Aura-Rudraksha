import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { Coupon } from "../models/Coupon.js";
import { isDbConnected } from "../config/db.js";
import { recordCustomerOrder } from "./customerController.js";
import Customer from "../models/Customer.js";
import { calculateOrderTotals } from "../services/pricingService.js";
import { generateNextOrderNumber } from "../services/orderSequenceService.js";
import { isAdminUser, hasAdminRole } from "../middleware/auth.js";
import { inMemoryStore } from "../data/inMemoryStore.js";
import { pickFields } from "../utils/sanitize.js";
import { checkOrAcquireIdempotency, commitIdempotency, releaseIdempotency } from "../services/idempotencyService.js";
import { isValidOrderTransition, isValidPaymentTransition, createStateHistoryEntry, ORDER_STATES, PAYMENT_STATES } from "../services/stateMachineService.js";
import { logAuditEvent } from "../services/auditService.js";
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
      const orders = inMemoryStore.orders || [];
      return res.json({ success: true, data: orders, count: orders.length });
    }
    const orders = await Order.find().sort({ createdAt: -1 }).lean();
    return res.json({ success: true, data: orders || [], count: (orders || []).length });
  } catch (err) {
    next(err);
  }
}

export async function getMyOrders(req, res, next) {
  try {
    const authUserId = req.user.authUserId;
    if (!isDbConnected()) {
      const myOrders = (inMemoryStore.orders || []).filter(o => o.authUserId === authUserId);
      return res.json({ success: true, data: myOrders, count: myOrders.length });
    }
    const orders = await Order.find({ authUserId }).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, data: orders, count: orders.length });
  } catch (err) {
    next(err);
  }
}

export async function getOrderById(req, res, next) {
  try {
    const { id } = req.params;
    const authUserId = req.user.authUserId;

    if (!isDbConnected()) {
      const order = (inMemoryStore.orders || []).find(o => String(o.id) === String(id) || String(o.orderId) === String(id));
      if (!order) {
        return res.status(404).json({ success: false, message: "Order not found" });
      }
      const { isInitialAdmin } = isAdminUser(req.user);
      const isAdmin = isInitialAdmin || (await hasAdminRole(authUserId));
      if (!isAdmin && order.authUserId !== authUserId) {
        return res.status(403).json({ success: false, message: "Access Denied: You can only view your own orders." });
      }
      return res.json({ success: true, data: order });
    }

    let order = await Order.findOne({ $or: [{ id: String(id) }, { orderId: String(id) }] }).lean();
    if (!order && id.match(/^[0-9a-fA-F]{24}$/)) {
      order = await Order.findById(id).lean();
    }
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    // Authorization check (verified Firebase identity -> server-side admin role)
    const { isInitialAdmin } = isAdminUser(req.user);
    const isAdmin = isInitialAdmin || (await hasAdminRole(authUserId));
    
    if (!isAdmin && order.authUserId !== authUserId) {
      return res.status(403).json({ success: false, message: "Access Denied: You can only view your own orders." });
    }

    return res.json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
}

export async function createOrder(req, res, next) {
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
    if (isDbConnected()) {
      for (const item of totals.items) {
        const product = await Product.findOne({ id: item.id });
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
    } else {
      for (const item of totals.items) {
        const product = inMemoryStore.products.find(p => String(p.id) === String(item.id));
        const pStatus = (product?.status || "Published").toLowerCase();
        if (!product || pStatus === "draft" || pStatus === "inactive" || pStatus === "archived") {
          recentOrderSubmissions.delete(submissionKey);
          if (idempotencyKey) await releaseIdempotency({ key: idempotencyKey, action: "create_order" });
          return res.status(400).json({ 
            success: false, 
            message: `Product '${item.name}' is no longer available.` 
          });
        }
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
      if (isDbConnected()) {
        validCouponDoc = await Coupon.findOne({ code: String(couponCodeToValidate).trim().toUpperCase() });
      } else {
        validCouponDoc = inMemoryStore.coupons.find(c => c.code === String(couponCodeToValidate).trim().toUpperCase());
      }
    }

    // Server always generates the permanent sequential order ID (AURA-YYMMDD-000123)
    const id = isDbConnected() ? await generateNextOrderNumber() : `AURA-${Date.now().toString().slice(-6)}`;
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
    if (isDbConnected()) {
      for (const item of totals.items) {
        await Product.updateOne(
          { id: item.id, stock: { $gte: item.quantity } },
          { $inc: { stock: -item.quantity } }
        );
      }
      if (totals.appliedCoupon && totals.appliedCoupon.code) {
        await Coupon.updateOne(
          { code: String(totals.appliedCoupon.code).trim().toUpperCase() },
          { $inc: { usage: 1 } }
        );
      }
    } else {
      for (const item of totals.items) {
        const p = inMemoryStore.products.find(prod => String(prod.id) === String(item.id));
        if (p && p.stock !== undefined) {
          p.stock = Math.max(0, p.stock - item.quantity);
        }
      }
      if (totals.appliedCoupon && totals.appliedCoupon.code) {
        const c = inMemoryStore.coupons.find(coup => coup.code.toUpperCase() === String(totals.appliedCoupon.code).trim().toUpperCase());
        if (c) c.usage = (c.usage || 0) + 1;
      }
    }

    let created;
    if (isDbConnected()) {
      created = await Order.findOneAndUpdate(
        { id: orderPayload.id },
        orderPayload,
        { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
      );
    } else {
      created = orderPayload;
      inMemoryStore.orders.unshift(created);
    }

    // Save in deduplication cache
    recentOrderSubmissions.set(submissionKey, { time: Date.now(), order: created });

    // Auto update/create customer record in MongoDB or inMemoryStore
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

    const { isInitialAdmin } = isAdminUser(req.user);
    const isAdmin = isInitialAdmin || (await hasAdminRole(authUserId));

    let existing;
    if (!isDbConnected()) {
      const idx = inMemoryStore.orders.findIndex(o => String(o.id) === String(id) || String(o.orderId) === String(id));
      if (idx < 0) return res.status(404).json({ success: false, message: "Order not found" });
      existing = inMemoryStore.orders[idx];
    } else {
      existing = await Order.findOne({ $or: [{ id: String(id) }, { orderId: String(id) }, { orderNumber: String(id) }] });
      if (!existing && id.match(/^[0-9a-fA-F]{24}$/)) {
        existing = await Order.findById(id);
      }
      if (!existing) return res.status(404).json({ success: false, message: "Order not found" });
    }

    let updateFields = {};

    if (isAdmin) {
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

      // Tracking & shipping updates
      if (data.trackingNumber !== undefined) updateFields.trackingNumber = String(data.trackingNumber).trim();
      if (data.trackingId !== undefined) updateFields.trackingId = String(data.trackingId).trim();
      if (data.courierName !== undefined) updateFields.courierName = String(data.courierName).trim();
      if (data.carrier !== undefined) updateFields.carrier = String(data.carrier).trim();
      if (data.trackingUrl !== undefined) updateFields.trackingUrl = String(data.trackingUrl).trim();
      if (data.shippingLink !== undefined) updateFields.shippingLink = String(data.shippingLink).trim();
      if (data.estimatedDeliveryDate !== undefined) updateFields.estimatedDeliveryDate = String(data.estimatedDeliveryDate).trim();
      if (data.notes !== undefined) updateFields.notes = String(data.notes).trim();
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

        // If customer cancels an already-paid order, flag for refund review
        if (existing.paymentStatus === PAYMENT_STATES.PAID) {
          updateFields.paymentStatus = PAYMENT_STATES.REFUND_PENDING;
          updateFields.refundDetails = {
            requestedAt: new Date().toISOString(),
            reason: updateFields.cancelReason,
            status: "Refund Pending Review"
          };
        }
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

    if (!isDbConnected()) {
      const idx = inMemoryStore.orders.findIndex(o => String(o.id) === String(id) || String(o.orderId) === String(id));
      inMemoryStore.orders[idx] = { ...existing, ...updateFields };
      return res.json({ success: true, data: inMemoryStore.orders[idx] });
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

    if (isDbConnected()) {
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
        const phoneSuffix = rawPhone.slice(-10);
        queryConditions.push({ customerPhone: { $regex: phoneSuffix + "$" } });
        queryConditions.push({ phone: { $regex: phoneSuffix + "$" } });
        queryConditions.push({ "shippingAddress.phone": { $regex: phoneSuffix + "$" } });
      }

      order = await Order.findOne({ $or: queryConditions }).sort({ createdAt: -1 }).lean();
    } else {
      const allOrders = inMemoryStore.orders || [];
      order = allOrders.find(o => {
        const idMatch = rawQuery && (
          String(o.id || "").toUpperCase() === cleanTerm ||
          String(o.orderId || "").toUpperCase() === cleanTerm ||
          String(o.orderNumber || "").toUpperCase() === cleanTerm ||
          String(o.trackingNumber || "").toUpperCase() === cleanTerm
        );
        const oPhone = String(o.customerPhone || o.phone || o.shippingAddress?.phone || "").replace(/\D/g, "");
        const phoneMatch = rawPhone && rawPhone.length >= 7 && oPhone.endsWith(rawPhone.slice(-10));
        return idMatch || phoneMatch;
      });
    }

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
