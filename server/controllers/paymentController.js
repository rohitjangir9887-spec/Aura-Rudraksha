import crypto from "crypto";
import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { Coupon } from "../models/Coupon.js";
import { isDbConnected } from "../config/db.js";
import { recordCustomerOrder } from "./customerController.js";
import { calculateOrderTotals } from "../services/pricingService.js";
import {
  getPayuConfig,
  generatePayuPaymentHash,
  verifyPayuResponseHash,
  verifyPayuPaymentServerSide,
  refundPayuTransaction
} from "../services/payuService.js";
import { isAdminUser, hasAdminRole } from "../middleware/auth.js";

/**
 * 1. Initiate PayU Payment Attempt
 * POST /api/payment/initiate
 * 
 * - Calculates authoritative totals from line items & coupon
 * - Creates/Updates pending Order in MongoDB
 * - Generates PayU Live SHA-512 request hash
 * - Returns form action parameters for PayU Hosted Checkout redirect
 */
export async function initiatePayuPayment(req, res, next) {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        message: "Database unavailable. Cannot initiate PayU payment without connected MongoDB."
      });
    }

    const { key, salt, paymentUrl, isConfigured } = getPayuConfig();
    const data = req.body;
    const authUserId = req.user.authUserId;
    const rawLines = data.lines || data.items || [];

    if (!Array.isArray(rawLines) || rawLines.length === 0) {
      return res.status(400).json({ success: false, message: "Order must contain valid items" });
    }

    // Authoritative Server Calculation
    const couponCodeToValidate = data.couponCode || data.coupon || null;
    const totals = await calculateOrderTotals({
      lines: rawLines,
      couponCode: couponCodeToValidate,
      authUserId
    });

    if (!totals.items || totals.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: totals.unavailableItems?.[0]?.reason || "Selected products are unavailable or discontinued."
      });
    }

    // Verify stock availability
    for (const item of totals.items) {
      const product = await Product.findOne({ id: item.id });
      if (!product || product.status !== "Active") {
        return res.status(400).json({
          success: false,
          message: `Product '${item.name}' is no longer available.`
        });
      }
      if (product.stock !== undefined && product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Product '${product.name}' is out of stock (Available: ${product.stock}, Requested: ${item.quantity}).`
        });
      }
    }

    // Determine or generate unique Order ID
    const orderId = data.orderId || data.id || ("ORD-" + Date.now().toString(36).toUpperCase() + "-" + crypto.randomBytes(4).toString("hex").toUpperCase());
    const now = new Date().toISOString();

    // Unique PayU transaction ID for this specific payment attempt
    const txnid = `TXN_${orderId.replace(/[^a-zA-Z0-9]/g, "")}_${Date.now().toString(36).toUpperCase()}`;

    // Shipping address snapshot
    const shippingAddress = data.shippingAddress || {
      address: data.address || "",
      city: data.city || "",
      state: data.state || "",
      pincode: data.pincode || "",
      phone: data.phone || "",
      firstName: data.firstName || "",
      lastName: data.lastName || ""
    };

    const email = (data.customerEmail || data.email || req.user.email || "devotee@aurarudraksha.com").trim().toLowerCase();
    const firstname = (data.firstName || data.customerName || req.user.displayName || "Devotee").trim();
    const phone = (data.phone || data.customerPhone || "").trim();
    const productinfo = `Aura Rudraksha - ${totals.items.map(i => i.name).slice(0, 2).join(", ")} (${orderId})`;

    // New payment attempt object
    const attempt = {
      txnid,
      amount: totals.finalTotal,
      status: "initiated",
      createdAt: new Date().toISOString()
    };

    const orderPayload = {
      id: orderId,
      orderId: orderId,
      authUserId,
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
      status: "Pending",
      orderStatus: "Pending",
      paymentStatus: "Pending",
      paymentMethod: "PayU Hosted Checkout (UPI / Cards / NetBanking)",
      txnid,
      shippingAddress,
      address: data.address || "",
      city: data.city || "",
      state: data.state || "",
      pincode: data.pincode || "",
      phone,
      customerEmail: email,
      customerName: firstname,
      notes: data.notes || ""
    };

    // Save or update order in MongoDB with pending attempt
    const existingOrder = await Order.findOne({ id: orderId });
    if (existingOrder) {
      const attempts = existingOrder.paymentAttempts || [];
      attempts.push(attempt);
      await Order.findOneAndUpdate(
        { id: orderId },
        { ...orderPayload, paymentAttempts: attempts },
        { returnDocument: "after" }
      );
    } else {
      orderPayload.paymentAttempts = [attempt];
      await Order.create(orderPayload);
    }

    // Determine Callback URL
    const appUrl = process.env.APP_URL || `${req.protocol}://${req.get("host")}`;
    const surl = `${appUrl}/api/payment/payu-callback`;
    const furl = `${appUrl}/api/payment/payu-callback`;

    // Generate SHA-512 Hash
    let hash = "";
    if (isConfigured) {
      hash = generatePayuPaymentHash({
        key,
        txnid,
        amount: totals.finalTotal,
        productinfo,
        firstname,
        email,
        udf1: orderId,
        udf2: authUserId,
        udf3: "AURA_RUDRAKSHA",
        udf4: "",
        udf5: "",
        salt
      });
    }

    return res.json({
      success: true,
      data: {
        orderId,
        txnid,
        amount: totals.finalTotal,
        payuConfigured: isConfigured,
        paymentUrl,
        params: {
          key: key || "PAYU_KEY_REQUIRED",
          txnid,
          amount: Number(totals.finalTotal).toFixed(2),
          productinfo,
          firstname,
          email,
          phone,
          surl,
          furl,
          hash,
          udf1: orderId,
          udf2: authUserId,
          udf3: "AURA_RUDRAKSHA",
          udf4: "",
          udf5: "",
          service_provider: "payu_paisa"
        }
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * 2. Handle PayU Browser POST Callback (surl / furl)
 * POST /api/payment/payu-callback
 * 
 * PayU redirects customer back via POST with transaction parameters and SHA-512 response hash.
 * This endpoint verifies the hash with salt, confirms via verify_payment API,
 * updates MongoDB order, and redirects user to frontend success or failure page.
 */
export async function handlePayuCallback(req, res) {
  try {
    const params = req.body || {};
    const { salt, isConfigured } = getPayuConfig();
    const orderId = params.udf1 || params.orderId || "";
    const txnid = params.txnid || "";
    const status = (params.status || "").toLowerCase();

    const host = req.get("host");
    const protocol = req.protocol;
    const clientBaseUrl = process.env.APP_URL || `${protocol}://${host}`;

    if (!orderId) {
      console.error("PayU Callback Error: Missing orderId (udf1)");
      return res.redirect(`${clientBaseUrl}/checkout?failed=unknown&reason=missing_order_id`);
    }

    let order = await Order.findOne({ $or: [{ id: orderId }, { orderId }] });
    if (!order) {
      console.error(`PayU Callback Error: Order '${orderId}' not found in MongoDB`);
      return res.redirect(`${clientBaseUrl}/checkout?failed=${orderId}&reason=order_not_found`);
    }

    // 1. Verify Hash Integrity
    let hashValid = false;
    if (isConfigured) {
      const hashCheck = verifyPayuResponseHash(params, salt);
      hashValid = hashCheck.valid;
      if (!hashValid) {
        console.warn(`⚠️ PayU Callback Hash Mismatch for Order ${orderId}:`, hashCheck);
      }
    } else {
      // In dev without salt set yet, flag for attention
      hashValid = true;
    }

    // 2. Perform Server-to-Server Verification with PayU API
    let isServerVerified = false;
    if (isConfigured && txnid) {
      const verifyRes = await verifyPayuPaymentServerSide(txnid);
      isServerVerified = verifyRes.isPaid;
    } else {
      isServerVerified = status === "success";
    }

    const isSuccess = status === "success" && hashValid && isServerVerified;

    if (isSuccess) {
      // Idempotent Order Update: Only process once
      if (order.paymentStatus !== "Paid") {
        order.paymentStatus = "Paid";
        order.orderStatus = "Confirmed";
        order.status = "Confirmed";
        order.txnid = txnid;
        order.mihpayid = params.mihpayid || "";
        order.bankRefNum = params.bank_ref_num || "";
        order.paymentMode = params.mode || "";
        order.paymentDetails = {
          ...params,
          verifiedAt: new Date().toISOString(),
          verifiedBy: "payu_callback_verified"
        };

        // Update payment attempts history
        const attempts = order.paymentAttempts || [];
        const attemptIdx = attempts.findIndex(a => a.txnid === txnid);
        if (attemptIdx >= 0) {
          attempts[attemptIdx].status = "success";
          attempts[attemptIdx].mihpayid = params.mihpayid;
          attempts[attemptIdx].updatedAt = new Date().toISOString();
        } else {
          attempts.push({
            txnid,
            amount: Number(params.amount || order.finalAmount),
            status: "success",
            mihpayid: params.mihpayid,
            createdAt: new Date().toISOString()
          });
        }
        order.paymentAttempts = attempts;

        // Deduct inventory stock
        if (order.snapshotItems && Array.isArray(order.snapshotItems)) {
          for (const item of order.snapshotItems) {
            if (item.id) {
              await Product.findOneAndUpdate({ id: item.id }, { $inc: { stock: -Math.max(1, item.qty || 1) } });
            }
          }
        }

        // Increment coupon usage
        if (order.couponCode) {
          await Coupon.findOneAndUpdate({ code: order.couponCode.toUpperCase() }, { $inc: { usage: 1 } });
        }

        // Record customer profile
        try {
          await recordCustomerOrder({
            authUserId: order.authUserId,
            email: order.customerEmail,
            phone: order.phone,
            name: order.customerName,
            address: order.address,
            amount: order.finalAmount
          });
        } catch (custErr) {
          console.warn("Could not sync customer on PayU callback:", custErr.message);
        }

        await order.save();
      }

      return res.redirect(`${clientBaseUrl}/checkout?success=${orderId}&txnid=${txnid}`);
    } else {
      // Payment Failed or Cancelled: Keep order in DB for retry, do NOT delete it
      order.paymentStatus = "Failed";
      const errorMsg = params.error_Message || params.error || params.unmappedstatus || "Payment could not be completed";
      
      const attempts = order.paymentAttempts || [];
      const attemptIdx = attempts.findIndex(a => a.txnid === txnid);
      if (attemptIdx >= 0) {
        attempts[attemptIdx].status = "failure";
        attempts[attemptIdx].error = errorMsg;
        attempts[attemptIdx].updatedAt = new Date().toISOString();
      }
      order.paymentAttempts = attempts;
      await order.save();

      const encodedReason = encodeURIComponent(errorMsg);
      return res.redirect(`${clientBaseUrl}/checkout?failed=${orderId}&txnid=${txnid}&reason=${encodedReason}`);
    }
  } catch (err) {
    console.error("Critical error in handlePayuCallback:", err);
    const clientBaseUrl = process.env.APP_URL || `${req.protocol}://${req.get("host")}`;
    return res.redirect(`${clientBaseUrl}/checkout?failed=error&reason=${encodeURIComponent(err.message)}`);
  }
}

/**
 * 3. Server-to-Server PayU Webhook Endpoint
 * POST /api/payment/payu-webhook
 * 
 * Handles background server notifications from PayU asynchronously.
 */
export async function handlePayuWebhook(req, res) {
  try {
    const params = req.body || {};
    const { salt, isConfigured } = getPayuConfig();
    const orderId = params.udf1 || params.orderId;
    const txnid = params.txnid;
    const status = (params.status || "").toLowerCase();

    if (!orderId || !txnid) {
      return res.status(400).json({ success: false, message: "Missing orderId or txnid" });
    }

    if (isConfigured) {
      const hashCheck = verifyPayuResponseHash(params, salt);
      if (!hashCheck.valid) {
        console.warn("⚠️ PayU Webhook hash verification failed:", hashCheck);
        return res.status(400).json({ success: false, message: "Hash mismatch" });
      }
    }

    const order = await Order.findOne({ $or: [{ id: orderId }, { orderId }] });
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    // Authoritative Server-to-Server Check
    let isServerVerified = false;
    if (isConfigured) {
      const verifyRes = await verifyPayuPaymentServerSide(txnid);
      isServerVerified = verifyRes.isPaid;
    } else {
      isServerVerified = status === "success";
    }

    if (isServerVerified && order.paymentStatus !== "Paid") {
      order.paymentStatus = "Paid";
      order.orderStatus = "Confirmed";
      order.status = "Confirmed";
      order.txnid = txnid;
      order.mihpayid = params.mihpayid || "";
      order.bankRefNum = params.bank_ref_num || "";
      order.paymentMode = params.mode || "";
      order.paymentDetails = {
        ...params,
        verifiedAt: new Date().toISOString(),
        verifiedBy: "payu_webhook_verified"
      };

      // Deduct product stock
      if (order.snapshotItems && Array.isArray(order.snapshotItems)) {
        for (const item of order.snapshotItems) {
          if (item.id) {
            await Product.findOneAndUpdate({ id: item.id }, { $inc: { stock: -Math.max(1, item.qty || 1) } });
          }
        }
      }

      await order.save();
    }

    return res.status(200).json({ success: true, message: "Webhook processed successfully" });
  } catch (err) {
    console.error("PayU Webhook error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * 4. Verify Payment Status on Demand
 * GET /api/payment/verify/:orderId
 */
export async function verifyPaymentStatus(req, res, next) {
  try {
    const { orderId } = req.params;
    const order = await Order.findOne({ $or: [{ id: orderId }, { orderId }] });
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    // If order is pending and has a transaction ID, perform live PayU server-to-server check
    if (order.paymentStatus !== "Paid" && order.txnid) {
      const { isConfigured } = getPayuConfig();
      if (isConfigured) {
        const verifyRes = await verifyPayuPaymentServerSide(order.txnid);
        if (verifyRes.isPaid) {
          order.paymentStatus = "Paid";
          order.orderStatus = "Confirmed";
          order.status = "Confirmed";
          order.mihpayid = verifyRes.mihpayid || order.mihpayid;
          order.bankRefNum = verifyRes.bankRefNum || order.bankRefNum;
          order.paymentMode = verifyRes.mode || order.paymentMode;
          order.paymentDetails = {
            ...order.paymentDetails,
            ...verifyRes.txnDetails,
            verifiedAt: new Date().toISOString(),
            verifiedBy: "on_demand_server_verify"
          };
          await order.save();
        }
      }
    }

    return res.json({
      success: true,
      data: {
        orderId: order.id,
        paymentStatus: order.paymentStatus,
        status: order.status,
        txnid: order.txnid,
        mihpayid: order.mihpayid,
        amount: order.finalAmount,
        paymentMethod: order.paymentMethod
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * 5. Retry Payment for an Existing Pending/Failed Order
 * POST /api/payment/retry/:orderId
 * 
 * Generates a NEW PayU txnid and fresh hash so customer can safely retry payment.
 */
export async function retryPayuPayment(req, res, next) {
  try {
    const { orderId } = req.params;
    const authUserId = req.user.authUserId;

    const order = await Order.findOne({ $or: [{ id: orderId }, { orderId }] });
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    // Check ownership
    const { isInitialAdmin } = isAdminUser(req.user);
    const isAdmin = isInitialAdmin || (await hasAdminRole(authUserId));
    if (!isAdmin && order.authUserId !== authUserId) {
      return res.status(403).json({ success: false, message: "Access Denied" });
    }

    if (order.paymentStatus === "Paid") {
      return res.status(400).json({ success: false, message: "This order has already been paid successfully." });
    }

    const { key, salt, paymentUrl, isConfigured } = getPayuConfig();

    // Create a NEW transaction attempt ID
    const newTxnid = `TXN_${order.id.replace(/[^a-zA-Z0-9]/g, "")}_${Date.now().toString(36).toUpperCase()}`;
    const amount = Number(order.finalAmount || order.total || order.amount || 0);

    const email = (order.customerEmail || req.user.email || "devotee@aurarudraksha.com").trim().toLowerCase();
    const firstname = (order.customerName || order.firstName || req.user.displayName || "Devotee").trim();
    const phone = (order.phone || order.customerPhone || "").trim();
    const productinfo = `Aura Rudraksha Order Retry (${order.id})`;

    const appUrl = process.env.APP_URL || `${req.protocol}://${req.get("host")}`;
    const surl = `${appUrl}/api/payment/payu-callback`;
    const furl = `${appUrl}/api/payment/payu-callback`;

    // Append to payment attempts
    const attempts = order.paymentAttempts || [];
    attempts.push({
      txnid: newTxnid,
      amount,
      status: "initiated",
      createdAt: new Date().toISOString()
    });
    order.paymentAttempts = attempts;
    order.txnid = newTxnid;
    order.paymentStatus = "Pending";
    await order.save();

    let hash = "";
    if (isConfigured) {
      hash = generatePayuPaymentHash({
        key,
        txnid: newTxnid,
        amount,
        productinfo,
        firstname,
        email,
        udf1: order.id,
        udf2: authUserId,
        udf3: "AURA_RUDRAKSHA",
        salt
      });
    }

    return res.json({
      success: true,
      data: {
        orderId: order.id,
        txnid: newTxnid,
        amount,
        payuConfigured: isConfigured,
        paymentUrl,
        params: {
          key: key || "PAYU_KEY_REQUIRED",
          txnid: newTxnid,
          amount: amount.toFixed(2),
          productinfo,
          firstname,
          email,
          phone,
          surl,
          furl,
          hash,
          udf1: order.id,
          udf2: authUserId,
          udf3: "AURA_RUDRAKSHA",
          udf4: "",
          udf5: "",
          service_provider: "payu_paisa"
        }
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * 6. Admin Process PayU Live Refund
 * POST /api/payment/refund/:orderId
 * (Admin Protected)
 */
export async function processPayuRefund(req, res, next) {
  try {
    const { orderId } = req.params;
    const { refundAmount, reason } = req.body;

    const order = await Order.findOne({ $or: [{ id: orderId }, { orderId }] });
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (order.paymentStatus !== "Paid") {
      return res.status(400).json({
        success: false,
        message: `Cannot refund order with payment status '${order.paymentStatus}'. Only 'Paid' orders can be refunded.`
      });
    }

    const payuId = order.mihpayid || order.txnid;
    if (!payuId) {
      return res.status(400).json({
        success: false,
        message: "No PayU Payment ID (mihpayid) or Transaction ID found for this order."
      });
    }

    const amountToRefund = Number(refundAmount || order.finalAmount || order.total);
    if (isNaN(amountToRefund) || amountToRefund <= 0) {
      return res.status(400).json({ success: false, message: "Invalid refund amount" });
    }

    // Call PayU Live Refund API
    const refundResult = await refundPayuTransaction({
      mihpayid: order.mihpayid,
      txnid: order.txnid,
      amount: amountToRefund
    });

    // Record Refund details in Order
    order.paymentStatus = "Refunded";
    order.status = "Cancelled";
    order.orderStatus = "Cancelled";
    order.refundDetails = {
      refundId: refundResult.refundId,
      refundToken: refundResult.refundToken,
      refundAmount: amountToRefund,
      refundStatus: "Success",
      refundDate: new Date().toISOString(),
      refundReason: reason || "Admin Processed Refund via PayU",
      rawResponse: refundResult.rawResponse,
      initiatedBy: req.user.email || "Admin"
    };

    // Restock inventory
    if (order.snapshotItems && Array.isArray(order.snapshotItems)) {
      for (const item of order.snapshotItems) {
        if (item.id) {
          await Product.findOneAndUpdate({ id: item.id }, { $inc: { stock: Math.max(1, item.qty || 1) } });
        }
      }
    }

    await order.save();

    return res.json({
      success: true,
      message: `Successfully processed PayU refund of ₹${amountToRefund.toLocaleString('en-IN')}`,
      data: order,
      refund: refundResult
    });
  } catch (err) {
    console.error("PayU Refund Error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to process PayU refund"
    });
  }
}
