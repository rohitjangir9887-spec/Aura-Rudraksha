import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { Coupon } from "../models/Coupon.js";
import { isDbConnected } from "../config/db.js";
import { recordCustomerOrder } from "./customerController.js";
import Customer from "../models/Customer.js";
import { calculateOrderTotals } from "../services/pricingService.js";
import { generateNextOrderNumber } from "../services/orderSequenceService.js";
import { isAdminUser, hasAdminRole } from "../middleware/auth.js";
import crypto from "crypto";

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
        message: "Database is unavailable. Cannot retrieve orders."
      });
    }
    const orders = await Order.find().sort({ createdAt: -1 }).lean();
    return res.json({ success: true, data: orders || [], count: (orders || []).length });
  } catch (err) {
    next(err);
  }
}

export async function getMyOrders(req, res, next) {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({ success: false, message: "Database unavailable." });
    }
    const authUserId = req.user.authUserId;
    const orders = await Order.find({ authUserId }).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, data: orders, count: orders.length });
  } catch (err) {
    next(err);
  }
}

export async function getOrderById(req, res, next) {
  try {
    const { id } = req.params;
    if (isDbConnected()) {
      let order = await Order.findOne({ $or: [{ id: String(id) }, { orderId: String(id) }] }).lean();
      if (!order && id.match(/^[0-9a-fA-F]{24}$/)) {
        order = await Order.findById(id).lean();
      }
      if (!order) {
        return res.status(404).json({ success: false, message: "Order not found" });
      }

      // Authorization check (verified Firebase identity -> server-side admin role)
      const authUserId = req.user.authUserId;
      const { isInitialAdmin } = isAdminUser(req.user);
      const isAdmin = isInitialAdmin || (await hasAdminRole(authUserId));
      
      if (!isAdmin && order.authUserId !== authUserId) {
        return res.status(403).json({ success: false, message: "Access Denied: You can only view your own orders." });
      }

      return res.json({ success: true, data: order });
    }
    return res.status(503).json({
      success: false,
      message: "Database is unavailable."
    });
  } catch (err) {
    next(err);
  }
}

export async function createOrder(req, res, next) {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        message: "Database unavailable. Orders cannot be accepted or processed without a connected MongoDB database."
      });
    }

    const data = req.body;
    const authUserId = req.user.authUserId;

    if (!data.items && !data.lines) {
      return res.status(400).json({ success: false, message: "Order must contain items" });
    }

    const rawLines = data.lines || data.items || [];
    if (!Array.isArray(rawLines) || rawLines.length === 0) {
      return res.status(400).json({ success: false, message: "Order must contain valid items" });
    }

    // 0. Double-submission / in-flight protection
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

    // 1. Authoritative Server Calculation (never trust client prices, discounts, or shipping)
    const couponCodeToValidate = data.couponCode || data.coupon || null;
    const totals = await calculateOrderTotals({
      lines: rawLines,
      couponCode: couponCodeToValidate,
      authUserId
    });

    if (!totals.items || totals.items.length === 0) {
      recentOrderSubmissions.delete(submissionKey);
      return res.status(400).json({ 
        success: false, 
        message: totals.unavailableItems?.[0]?.reason || "Selected products are unavailable or discontinued." 
      });
    }

    // Check stock for all items
    for (const item of totals.items) {
      const product = await Product.findOne({ id: item.id });
      if (!product || product.status !== "Active") {
        recentOrderSubmissions.delete(submissionKey);
        return res.status(400).json({ 
          success: false, 
          message: `Product '${item.name}' is no longer available.` 
        });
      }
      if (product.stock !== undefined && product.stock < item.quantity) {
        recentOrderSubmissions.delete(submissionKey);
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
        return res.status(400).json({
          success: false,
          status: totals.couponStatus,
          message: totals.couponReason || "The applied coupon is invalid or expired. Please review your order."
        });
      }
      validCouponDoc = await Coupon.findOne({ code: String(couponCodeToValidate).trim().toUpperCase() });
    }

    // Server always generates the permanent sequential order ID (AURA-YYMMDD-000123)
    const id = await generateNextOrderNumber();
    const now = new Date().toISOString();
    
    // Create copy of shipping address inside snapshot
    const shippingAddress = data.shippingAddress || {
       address: data.address,
       city: data.city,
       state: data.state,
       pincode: data.pincode,
       phone: data.phone,
       firstName: data.firstName,
       lastName: data.lastName
    };

    // Immutable price & order snapshot. Strip any client-supplied Mongo
    // internal identifiers before spreading, so a crafted _id can't be used
    // to target/collide with another document.
    const { _id, __v, ...clientData } = data;
    const orderPayload = {
      ...clientData,
      authUserId,
      id,
      orderId: id,
      orderNumber: id,
      date: data.date || now,
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
      status: "Confirmed",
      orderStatus: "Confirmed",
      orderSource: data.orderSource || data.source || "website",
      source: data.orderSource || data.source || "website",
      paymentStatus: data.paymentStatus || "Pending",
      paymentMethod: data.paymentMethod || "PayU Hosted Checkout (UPI / Cards / NetBanking)",
      shippingAddress
    };

    const email = (orderPayload.customerEmail || data.email || "").trim().toLowerCase();
    const phone = (orderPayload.phone || orderPayload.customerPhone || "").trim();
    const name = orderPayload.customerName || (orderPayload.firstName ? `${orderPayload.firstName} ${orderPayload.lastName || ''}`.trim() : "Customer");
    
    const created = await Order.findOneAndUpdate(
      { id: orderPayload.id },
      orderPayload,
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );

    // Save in deduplication cache
    recentOrderSubmissions.set(submissionKey, { time: Date.now(), order: created });

    // Update Coupon Usage
    if (validCouponDoc) {
      await Coupon.findByIdAndUpdate(validCouponDoc._id, { $inc: { usage: 1 } });
    }

    // Update Product Stock
    for (const item of totals.items) {
      await Product.findOneAndUpdate({ id: item.id }, { $inc: { stock: -item.quantity } });
    }

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
    
    return res.status(201).json({ success: true, data: created });
  } catch (err) {
    next(err);
  }
}

export async function updateOrder(req, res, next) {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        message: "Database unavailable. Cannot update order without a connected MongoDB database."
      });
    }
    const { id } = req.params;
    const data = req.body;
    const authUserId = req.user.authUserId;

    let existing = await Order.findOne({ $or: [{ id: String(id) }, { orderId: String(id) }] });
    if (!existing && id.match(/^[0-9a-fA-F]{24}$/)) {
      existing = await Order.findById(id);
    }
    if (!existing) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    // Check if user is admin (verified Firebase identity -> server-side admin role)
    const { isInitialAdmin } = isAdminUser(req.user);
    const isAdmin = isInitialAdmin || (await hasAdminRole(authUserId));

    // Authorization & field security
    let updateFields = {};
    if (isAdmin) {
      // Admin has full permissions
      updateFields = { ...data };
    } else if (existing.authUserId === authUserId) {
      // Customer can only cancel or update shipping address on pending/processing orders
      const cancellableStatuses = ["Pending", "Confirmed", "Processing"];
      if (data.status === "Cancelled" && cancellableStatuses.includes(existing.status)) {
        updateFields.status = "Cancelled";
        updateFields.orderStatus = "Cancelled";
        updateFields.cancelledAt = new Date().toISOString();
        updateFields.cancelReason = data.cancelReason || "Cancelled by customer";
        updateFields.cancelledBy = "Customer";
      }
      if (data.address && cancellableStatuses.includes(existing.status)) {
        updateFields.address = data.address;
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
