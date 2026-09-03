import crypto from "crypto";
import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { Coupon } from "../models/Coupon.js";
import { isDbConnected } from "../config/db.js";
import { recordCustomerOrder } from "./customerController.js";
import { calculateOrderTotals } from "../services/pricingService.js";
import { generateNextOrderNumber } from "../services/orderSequenceService.js";
import {
  getPayuConfig,
  generatePayuPaymentHash,
  verifyPayuResponseHash,
  verifyPayuPaymentServerSide,
  refundPayuTransaction
} from "../services/payuService.js";
import { isAdminUser, hasAdminRole } from "../middleware/auth.js";

/**
 * Helper to resolve authoritative base URL for PayU redirects & webhooks
 */
function resolveAppBaseUrl(req) {
  if (process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/+$/, "");
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  const host = req ? req.get("host") : "";
  const protocol = req && req.protocol ? req.protocol : "https";
  if (host && !host.includes("localhost") && !host.includes("127.0.0.1")) {
    return `${protocol}://${host}`;
  }
  return "https://aura-rudraksha.vercel.app";
}

/**
 * 1. Initiate PayU Payment Attempt
 * POST /api/payment/initiate
 * 
 * - Calculates authoritative totals from line items & coupon
 * - Generates permanent sequential customer-facing Order ID: AURA-YYMMDD-000123
 * - Generates unique PayU transaction ID (txnid)
 * - Creates/Updates pending Order in MongoDB
 * - Generates PayU Live SHA-512 request hash strictly on backend
 * - Returns form action parameters for PayU Hosted Checkout redirect
 */
export async function initiatePayuPayment(req, res, next) {
  try {
    const { key, salt, paymentUrl, isConfigured } = getPayuConfig();
    const data = req.body || {};
    const authUserId = req.user?.authUserId || "guest";
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

    if (!isDbConnected()) {
      const orderId = data.orderId || data.id || `AURA-${Date.now().toString().slice(-6)}`;
      const txnid = `TXN_${orderId.replace(/[^a-zA-Z0-9]/g, "")}_${Date.now()}`;
      return res.json({
        success: true,
        data: {
          orderId,
          orderNumber: orderId,
          txnid,
          amount: totals.finalTotal,
          payuConfigured: isConfigured,
          paymentUrl,
          params: {
            key: key || "PAYU_KEY_REQUIRED",
            txnid,
            amount: Number(totals.finalTotal).toFixed(2),
            productinfo: `Aura Rudraksha Order ${orderId}`,
            firstname: (data.firstName || data.customerName || "Devotee").trim(),
            email: (data.customerEmail || data.email || "devotee@aurarudraksha.com").trim().toLowerCase(),
            phone: (data.phone || data.customerPhone || "").trim(),
            surl: `${resolveAppBaseUrl(req)}/api/payment/payu-callback`,
            furl: `${resolveAppBaseUrl(req)}/api/payment/payu-callback`,
            hash: "",
            udf1: orderId,
            udf2: authUserId,
            udf3: "AURA_RUDRAKSHA",
            udf4: "",
            udf5: "",
            service_provider: "payu_paisa"
          }
        }
      });
    }

    // Verify stock availability
    for (const item of totals.items) {
      const product = await Product.findOne({ id: item.id });
      const pStatus = (product?.status || "Published").toLowerCase();
      if (!product || pStatus === "draft" || pStatus === "inactive" || pStatus === "archived") {
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

    // Generate permanent customer-facing sequential Order ID (AURA-YYMMDD-000123)
    let orderNumber = data.orderId || data.id;
    if (!orderNumber || typeof orderNumber !== "string" || !orderNumber.startsWith("AURA-")) {
      orderNumber = await generateNextOrderNumber();
    }
    const orderId = orderNumber;
    const now = new Date().toISOString();

    // Unique PayU transaction ID for this specific payment attempt
    const txnid = `TXN_${orderId.replace(/[^a-zA-Z0-9]/g, "")}_${Date.now()}`;

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
    const productinfo = `Aura Rudraksha Order ${orderId}`;

    // Payment attempt tracking object
    const attempt = {
      txnid,
      amount: totals.finalTotal,
      status: "initiated",
      createdAt: now
    };

    const orderPayload = {
      id: orderId,
      orderId: orderId,
      orderNumber: orderId,
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
      amountRefunded: 0,
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
      notes: data.notes || "",
      inventoryDeducted: false
    };

    // Save or update order in MongoDB with pending attempt
    const existingOrder = await Order.findOne({ $or: [{ id: orderId }, { orderId }, { orderNumber: orderId }] });
    if (existingOrder) {
      const attempts = existingOrder.paymentAttempts || [];
      attempts.push(attempt);
      await Order.findOneAndUpdate(
        { _id: existingOrder._id },
        { ...orderPayload, paymentAttempts: attempts },
        { returnDocument: "after" }
      );
    } else {
      orderPayload.paymentAttempts = [attempt];
      await Order.create(orderPayload);
    }

    // Determine absolute Callback URLs for PayU
    const appBaseUrl = resolveAppBaseUrl(req);
    const surl = `${appBaseUrl}/api/payment/payu-callback`;
    const furl = `${appBaseUrl}/api/payment/payu-callback`;

    // Generate SHA-512 Hash strictly on backend
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
        orderNumber: orderId,
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
 * updates MongoDB order idempotently, and redirects user to frontend success or failure page.
 */
export async function handlePayuCallback(req, res) {
  try {
    const params = req.body || {};
    const { key: expectedKey, salt, isConfigured } = getPayuConfig();
    const orderId = params.udf1 || params.orderId || "";
    const txnid = params.txnid || "";
    const status = (params.status || "").toLowerCase();

    const clientBaseUrl = resolveAppBaseUrl(req);

    if (!orderId) {
      console.error("PayU Callback Error: Missing orderId in udf1");
      return res.redirect(`${clientBaseUrl}/checkout?failed=unknown&reason=missing_order_id`);
    }

    let order = await Order.findOne({ $or: [{ id: orderId }, { orderId }, { orderNumber: orderId }] });
    if (!order) {
      console.error(`PayU Callback Error: Order '${orderId}' not found in MongoDB`);
      return res.redirect(`${clientBaseUrl}/checkout?failed=${orderId}&reason=order_not_found`);
    }

    // 1. Verify Merchant Key
    if (isConfigured && params.key && expectedKey && params.key !== expectedKey) {
      console.error(`⚠️ PayU Callback Merchant Key Mismatch: received '${params.key}', expected '${expectedKey}'`);
      return res.redirect(`${clientBaseUrl}/checkout?failed=${orderId}&reason=merchant_key_mismatch`);
    }

    // 2. Verify Hash Integrity
    let hashValid = false;
    if (isConfigured) {
      const hashCheck = verifyPayuResponseHash(params, salt);
      hashValid = hashCheck.valid;
      if (!hashValid) {
        console.warn(`⚠️ PayU Callback Hash Mismatch for Order ${orderId}:`, hashCheck);
      }
    } else {
      hashValid = true;
    }

    // 3. Verify Amount Consistency
    const callbackAmount = parseFloat(params.amount);
    const expectedAmount = parseFloat(order.finalAmount || order.total || order.amount || 0);
    const amountMatches = isNaN(callbackAmount) || Math.abs(callbackAmount - expectedAmount) < 0.01;
    if (!amountMatches) {
      console.warn(`⚠️ PayU Callback Amount Mismatch: expected ${expectedAmount}, received ${callbackAmount}`);
    }

    // 4. Perform Server-to-Server Verification with PayU API
    let isServerVerified = false;
    if (isConfigured && txnid) {
      const verifyRes = await verifyPayuPaymentServerSide(txnid);
      isServerVerified = verifyRes.isPaid;
    } else {
      isServerVerified = status === "success";
    }

    const isSuccess = status === "success" && hashValid && amountMatches && isServerVerified;

    if (isSuccess) {
      // Idempotent Order Update: Only execute state transition and stock deduction once
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

        // Deduct inventory stock (strictly once)
        if (!order.inventoryDeducted && order.snapshotItems && Array.isArray(order.snapshotItems)) {
          for (const item of order.snapshotItems) {
            if (item.id) {
              await Product.findOneAndUpdate(
                { id: item.id },
                { $inc: { stock: -Math.max(1, item.qty || item.quantity || 1) } }
              );
            }
          }
          order.inventoryDeducted = true;
        }

        // Increment coupon usage (strictly once)
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
    const clientBaseUrl = resolveAppBaseUrl(req);
    return res.redirect(`${clientBaseUrl}/checkout?failed=error&reason=${encodeURIComponent(err.message)}`);
  }
}

/**
 * 3. Server-to-Server PayU Webhook Endpoint
 * POST /api/payment/payu-webhook
 * 
 * Handles background server notifications from PayU asynchronously.
 * Fully idempotent: prevents duplicate stock deductions or duplicate transitions.
 */
export async function handlePayuWebhook(req, res) {
  try {
    const params = req.body || {};
    const { key: expectedKey, salt, isConfigured } = getPayuConfig();
    const orderId = params.udf1 || params.orderId;
    const txnid = params.txnid;
    const status = (params.status || "").toLowerCase();

    if (!orderId || !txnid) {
      return res.status(400).json({ success: false, message: "Missing orderId or txnid" });
    }

    if (isConfigured) {
      // Check merchant key
      if (params.key && expectedKey && params.key !== expectedKey) {
        return res.status(400).json({ success: false, message: "Invalid merchant key" });
      }

      // Check reverse hash
      const hashCheck = verifyPayuResponseHash(params, salt);
      if (!hashCheck.valid) {
        console.warn("⚠️ PayU Webhook hash verification failed:", hashCheck);
        return res.status(400).json({ success: false, message: "Hash mismatch" });
      }
    }

    const order = await Order.findOne({ $or: [{ id: orderId }, { orderId }, { orderNumber: orderId }] });
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

      // Deduct product stock strictly once
      if (!order.inventoryDeducted && order.snapshotItems && Array.isArray(order.snapshotItems)) {
        for (const item of order.snapshotItems) {
          if (item.id) {
            await Product.findOneAndUpdate(
              { id: item.id },
              { $inc: { stock: -Math.max(1, item.qty || item.quantity || 1) } }
            );
          }
        }
        order.inventoryDeducted = true;
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
    const order = await Order.findOne({ $or: [{ id: orderId }, { orderId }, { orderNumber: orderId }] });
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

          // Deduct stock if not already deducted
          if (!order.inventoryDeducted && order.snapshotItems && Array.isArray(order.snapshotItems)) {
            for (const item of order.snapshotItems) {
              if (item.id) {
                await Product.findOneAndUpdate(
                  { id: item.id },
                  { $inc: { stock: -Math.max(1, item.qty || item.quantity || 1) } }
                );
              }
            }
            order.inventoryDeducted = true;
          }

          await order.save();
        }
      }
    }

    return res.json({
      success: true,
      data: {
        orderId: order.orderNumber || order.id,
        orderNumber: order.orderNumber || order.id,
        paymentStatus: order.paymentStatus,
        status: order.status,
        orderStatus: order.orderStatus,
        txnid: order.txnid,
        mihpayid: order.mihpayid,
        amount: order.finalAmount || order.total,
        amountRefunded: order.amountRefunded || 0,
        paymentMethod: order.paymentMethod,
        refundHistory: order.refundHistory || []
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
 * Generates a NEW PayU txnid and fresh hash while keeping the exact same permanent orderNumber.
 */
export async function retryPayuPayment(req, res, next) {
  try {
    const { orderId } = req.params;
    const authUserId = req.user.authUserId;

    const order = await Order.findOne({ $or: [{ id: orderId }, { orderId }, { orderNumber: orderId }] });
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

    // Create a NEW transaction attempt ID for this retry while keeping order.id unchanged
    const newTxnid = `TXN_${(order.orderNumber || order.id).replace(/[^a-zA-Z0-9]/g, "")}_${Date.now()}`;
    const amount = Number(order.finalAmount || order.total || order.amount || 0);

    const email = (order.customerEmail || req.user.email || "devotee@aurarudraksha.com").trim().toLowerCase();
    const firstname = (order.customerName || order.firstName || req.user.displayName || "Devotee").trim();
    const phone = (order.phone || order.customerPhone || "").trim();
    const productinfo = `Aura Rudraksha Order Retry (${order.orderNumber || order.id})`;

    const appBaseUrl = resolveAppBaseUrl(req);
    const surl = `${appBaseUrl}/api/payment/payu-callback`;
    const furl = `${appBaseUrl}/api/payment/payu-callback`;

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
        udf1: order.orderNumber || order.id,
        udf2: authUserId,
        udf3: "AURA_RUDRAKSHA",
        salt
      });
    }

    return res.json({
      success: true,
      data: {
        orderId: order.orderNumber || order.id,
        orderNumber: order.orderNumber || order.id,
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
          udf1: order.orderNumber || order.id,
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
 * 6. Admin Process PayU Live Refund (Full or Partial)
 * POST /api/payment/refund/:orderId
 * (Admin Protected)
 */
export async function processPayuRefund(req, res, next) {
  try {
    const { orderId } = req.params;
    const { refundAmount, reason } = req.body;

    const order = await Order.findOne({ $or: [{ id: orderId }, { orderId }, { orderNumber: orderId }] });
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (order.paymentStatus !== "Paid" && order.paymentStatus !== "Partially Refunded") {
      return res.status(400).json({
        success: false,
        message: `Cannot refund order with payment status '${order.paymentStatus}'. Only 'Paid' or 'Partially Refunded' orders can be refunded.`
      });
    }

    const payuId = order.mihpayid || order.txnid;
    if (!payuId) {
      return res.status(400).json({
        success: false,
        message: "No PayU Payment ID (mihpayid) or Transaction ID found for this order."
      });
    }

    const currentRefundAmount = Number(refundAmount);
    if (isNaN(currentRefundAmount) || currentRefundAmount <= 0) {
      return res.status(400).json({ success: false, message: "Please specify a valid refund amount greater than zero." });
    }

    const orderTotal = Number(order.finalAmount || order.total || 0);
    const alreadyRefunded = Number(order.amountRefunded || 0);
    const maxRefundable = orderTotal - alreadyRefunded;

    if (currentRefundAmount > maxRefundable + 0.01) {
      return res.status(400).json({
        success: false,
        message: `Requested refund of ₹${currentRefundAmount.toLocaleString('en-IN')} exceeds remaining refundable balance of ₹${maxRefundable.toLocaleString('en-IN')}.`
      });
    }

    // Generate unique refund token for PayU
    const refundToken = `REF_${(order.orderNumber || order.id).replace(/[^a-zA-Z0-9]/g, "")}_${Date.now()}_${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

    // Call PayU Live Refund API
    const refundResult = await refundPayuTransaction({
      mihpayid: order.mihpayid,
      txnid: order.txnid,
      amount: currentRefundAmount,
      token: refundToken
    });

    const newAmountRefunded = alreadyRefunded + currentRefundAmount;
    const isFullRefund = newAmountRefunded >= (orderTotal - 0.01);

    // Record Refund details in Order
    order.amountRefunded = newAmountRefunded;
    order.paymentStatus = isFullRefund ? "Refunded" : "Partially Refunded";
    
    if (isFullRefund) {
      order.status = "Cancelled";
      order.orderStatus = "Cancelled";
    }

    const refundEntry = {
      refundId: refundResult.refundId,
      refundToken: refundResult.refundToken,
      amount: currentRefundAmount,
      status: "Success",
      reason: reason || "Admin Processed Refund via PayU",
      date: new Date().toISOString(),
      rawResponse: refundResult.rawResponse,
      initiatedBy: req.user.email || "Admin"
    };

    const history = order.refundHistory || [];
    history.push(refundEntry);
    order.refundHistory = history;
    order.refundDetails = refundEntry;

    // Restock inventory if full refund
    if (isFullRefund && order.inventoryDeducted && order.snapshotItems && Array.isArray(order.snapshotItems)) {
      for (const item of order.snapshotItems) {
        if (item.id) {
          await Product.findOneAndUpdate(
            { id: item.id },
            { $inc: { stock: Math.max(1, item.qty || item.quantity || 1) } }
          );
        }
      }
      order.inventoryDeducted = false;
    }

    await order.save();

    return res.json({
      success: true,
      message: `Successfully processed PayU refund of ₹${currentRefundAmount.toLocaleString('en-IN')}`,
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
