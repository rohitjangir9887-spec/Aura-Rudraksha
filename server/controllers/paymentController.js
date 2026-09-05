import crypto from "crypto";
import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { Coupon } from "../models/Coupon.js";
import { PaymentTransaction } from "../models/PaymentTransaction.js";
import { WebhookEvent } from "../models/WebhookEvent.js";
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
import { logAuditEvent } from "../services/auditService.js";
import { checkOrAcquireIdempotency, commitIdempotency, releaseIdempotency, hashPayload } from "../services/idempotencyService.js";

/**
 * Safely parse and normalize incoming PayU callback/webhook body
 * Handles Express parsed object, raw string, or Buffer (common in Vercel / serverless runtimes).
 */
export function extractPayuParams(req) {
  if (!req) return {};
  const raw = req.body;
  if (!raw) return {};

  if (Buffer.isBuffer(raw)) {
    try {
      const str = raw.toString("utf-8").trim();
      if (str.startsWith("{")) {
        return JSON.parse(str);
      }
      return Object.fromEntries(new URLSearchParams(str));
    } catch (_) {
      return {};
    }
  }

  if (typeof raw === "string") {
    try {
      const trimmed = raw.trim();
      if (trimmed.startsWith("{")) {
        return JSON.parse(trimmed);
      }
      return Object.fromEntries(new URLSearchParams(trimmed));
    } catch (_) {
      return {};
    }
  }

  if (typeof raw === "object" && raw !== null) {
    return { ...raw };
  }

  return {};
}

/**
 * Sanitize payment details object before saving to DB or logging
 * Strictly removes secrets, salt, raw auth tokens, and sensitive credentials.
 */
export function sanitizePaymentDetails(details) {
  if (!details || typeof details !== "object") return {};
  const copy = JSON.parse(JSON.stringify(details));
  
  delete copy.salt;
  delete copy.PAYU_MERCHANT_SALT;
  delete copy.merchant_salt;
  delete copy.key_secret;
  delete copy.secret;
  delete copy.saltString;
  delete copy.rawHashString;
  delete copy.hashString;
  delete copy.auth;
  delete copy.authorization;
  delete copy.headers;
  delete copy.cardnum;
  delete copy.card_no;
  delete copy.card_number;
  delete copy.cvv;
  delete copy.card_cvv;
  delete copy.upi_pin;
  delete copy.pin;
  delete copy.password;
  delete copy.pass;
  
  // Truncate hash string representation if needed
  if (copy.hash && typeof copy.hash === "string" && copy.hash.length > 32) {
    copy.hash = copy.hash.substring(0, 10) + "..." + copy.hash.substring(copy.hash.length - 10);
  }
  return copy;
}

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
  const host = req ? (req.headers["x-forwarded-host"] || req.get("host")) : "";
  const protocol = req && req.headers["x-forwarded-proto"] ? req.headers["x-forwarded-proto"] : (req && req.protocol ? req.protocol : "https");
  if (host && !host.includes("localhost") && !host.includes("127.0.0.1")) {
    return `${protocol}://${host}`;
  }
  return "https://aura-rudraksha.vercel.app";
}

/**
 * 1. Initiate PayU Payment Attempt
 * POST /api/payment/initiate
 * 
 * - Requires DB Connection
 * - Requires Authenticated User (preventing anonymous order injection)
 * - Server-Authoritative line-item calculation (client amounts strictly ignored)
 * - Generates permanent customer-facing sequential Order ID: AURA-YYMMDD-000123
 * - Generates unique PayU transaction ID (txnid)
 * - Creates pending Order in MongoDB
 * - Generates PayU Live SHA-512 request hash strictly on backend
 * - Returns form action parameters for PayU Hosted Checkout redirect
 */
export async function initiatePayuPayment(req, res, next) {
  try {
    // 1. Check DB Connection - NEVER allow payment initiation if DB is disconnected
    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        message: "Payment service temporarily unavailable. Please try again."
      });
    }

    const { key, salt, paymentUrl, isConfigured } = getPayuConfig();

    if (!isConfigured) {
      return res.status(503).json({
        success: false,
        message: "Payment gateway service is currently unavailable. Please contact support."
      });
    }

    // Authentication verification
    const authUserId = req.user?.authUserId;
    if (!authUserId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required to initiate payment."
      });
    }

    const data = req.body || {};
    const rawLines = data.lines || data.items || [];

    if (!Array.isArray(rawLines) || rawLines.length === 0) {
      return res.status(400).json({ success: false, message: "Order must contain valid items" });
    }

    // Authoritative Server Calculation (discounts, taxes, shipping, coupon)
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

    if (!totals.finalTotal || totals.finalTotal <= 0 || isNaN(totals.finalTotal)) {
      return res.status(400).json({
        success: false,
        message: "Calculated order amount must be greater than zero."
      });
    }

    // Verify stock availability in a single batch query
    const productIds = totals.items.map(i => i.id);
    const dbProducts = await Product.find({ id: { $in: productIds } }).lean();
    const productMap = new Map(dbProducts.map(p => [p.id, p]));

    for (const item of totals.items) {
      const product = productMap.get(item.id);
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

    // Generate permanent customer-facing sequential Order ID (e.g. AURA-260904-000123)
    const orderNumber = await generateNextOrderNumber();
    const orderId = orderNumber;
    const now = new Date().toISOString();

    // Unique PayU transaction ID for this payment attempt
    const txnid = `TXN_${orderId.replace(/[^a-zA-Z0-9]/g, "")}_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;

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

    const email = (data.customerEmail || data.email || req.user.email || "").trim().toLowerCase();
    if (!email || !email.includes("@")) {
      return res.status(400).json({
        success: false,
        message: "Valid customer email is required to initiate payment."
      });
    }
    const firstname = (data.firstName || data.customerName || req.user.name || "Devotee").trim();
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
      inventoryDeducted: false,
      paymentAttempts: [attempt]
    };

    // Save order in MongoDB
    await Order.create(orderPayload);

    // Record Payment Transaction Ledger (non-blocking)
    PaymentTransaction.create({
      transactionId: txnid,
      orderId,
      orderNumber: orderId,
      authUserId,
      provider: "payu",
      amount: totals.finalTotal,
      currency: "INR",
      status: "PENDING",
      initiatedAt: new Date(),
      metadata: {
        customerEmail: email,
        customerName: firstname
      }
    }).catch(txnErr => console.warn("Could not save PaymentTransaction record:", txnErr.message));

    // Authoritative Callback URLs for PayU
    const appBaseUrl = resolveAppBaseUrl(req);
    const surl = `${appBaseUrl}/api/payment/payu-callback`;
    const furl = `${appBaseUrl}/api/payment/payu-callback`;
    const curl = `${appBaseUrl}/api/payment/payu-cancel`;

    // Generate SHA-512 Hash strictly on backend
    const hash = generatePayuPaymentHash({
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

    return res.json({
      success: true,
      data: {
        orderId,
        orderNumber: orderId,
        txnid,
        amount: totals.finalTotal,
        payuConfigured: true,
        paymentUrl,
        params: {
          key,
          txnid,
          amount: Number(totals.finalTotal).toFixed(2),
          productinfo,
          firstname,
          email,
          phone,
          surl,
          furl,
          curl,
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
  const clientBaseUrl = resolveAppBaseUrl(req);

  try {
    if (!isDbConnected()) {
      return res.redirect(303, `${clientBaseUrl}/checkout?failed=db_offline&reason=${encodeURIComponent("Payment service temporarily unavailable. Please try again.")}`);
    }

    const params = extractPayuParams(req);
    const { key: expectedKey, salt, isConfigured } = getPayuConfig();

    if (!isConfigured) {
      return res.redirect(303, `${clientBaseUrl}/checkout?failed=unconfigured&reason=${encodeURIComponent("Payment gateway service is unavailable.")}`);
    }

    const orderId = String(params.udf1 || params.orderId || "").trim();
    const txnid = String(params.txnid || "").trim();
    const status = String(params.status || "").toLowerCase().trim();

    if (!orderId || !txnid || !params.hash) {
      console.error("PayU Callback Error: Missing orderId, txnid, or hash");
      return res.redirect(303, `${clientBaseUrl}/checkout?failed=${orderId || "unknown"}&reason=${encodeURIComponent("Invalid payment response payload")}`);
    }

    const order = await Order.findOne({ $or: [{ id: orderId }, { orderId }, { orderNumber: orderId }] });
    if (!order) {
      console.error(`PayU Callback Error: Order '${orderId}' not found in MongoDB`);
      return res.redirect(303, `${clientBaseUrl}/checkout?failed=${orderId}&reason=${encodeURIComponent("Order record not found")}`);
    }

    // 1. Verify Merchant Key
    if (params.key !== expectedKey) {
      console.error(`⚠️ PayU Callback Merchant Key Mismatch: received '${params.key}', expected '${expectedKey}'`);
      return res.redirect(303, `${clientBaseUrl}/checkout?failed=${orderId}&reason=${encodeURIComponent("Merchant key mismatch")}`);
    }

    // 2. Verify Hash Integrity with Salt
    const hashCheck = verifyPayuResponseHash(params, salt);
    if (!hashCheck.valid) {
      console.warn(`⚠️ PayU Callback Hash Mismatch for Order ${orderId}:`, hashCheck.reason);
      return res.redirect(303, `${clientBaseUrl}/checkout?failed=${orderId}&reason=${encodeURIComponent("Payment hash verification failed")}`);
    }

    // 3. Verify Transaction ID belongs to this order
    const belongsToOrder = order.txnid === txnid || (order.paymentAttempts && order.paymentAttempts.some(a => a.txnid === txnid));
    if (!belongsToOrder) {
      console.error(`⚠️ Transaction ID ${txnid} does not belong to Order ${orderId}`);
      return res.redirect(303, `${clientBaseUrl}/checkout?failed=${orderId}&reason=${encodeURIComponent("Transaction ID mismatch")}`);
    }

    // 4. Verify User Ownership if udf2 is provided
    if (params.udf2 && order.authUserId && order.authUserId !== "guest" && String(params.udf2).trim() !== String(order.authUserId).trim()) {
      console.error(`⚠️ User mismatch on PayU Callback for Order ${orderId}`);
      return res.redirect(303, `${clientBaseUrl}/checkout?failed=${orderId}&reason=${encodeURIComponent("User authorization mismatch")}`);
    }

    // 5. Verify Amount Consistency
    const callbackAmount = parseFloat(params.amount);
    if (params.amount === undefined || params.amount === null || params.amount === "" || isNaN(callbackAmount) || !isFinite(callbackAmount) || callbackAmount <= 0) {
      console.error(`⚠️ PayU Callback Invalid Amount: '${params.amount}'`);
      return res.redirect(303, `${clientBaseUrl}/checkout?failed=${orderId}&reason=${encodeURIComponent("Invalid transaction amount")}`);
    }

    const expectedAmount = Number(order.finalAmount || order.total || order.amount || 0);
    if (Math.abs(callbackAmount - expectedAmount) > 0.01) {
      console.error(`⚠️ PayU Callback Amount Mismatch: expected ${expectedAmount}, received ${callbackAmount}`);
      return res.redirect(303, `${clientBaseUrl}/checkout?failed=${orderId}&reason=${encodeURIComponent("Transaction amount mismatch")}`);
    }

    // 6. If status is NOT success, record failure and redirect cleanly
    if (status !== "success") {
      const errorMsg = params.error_Message || params.error || params.unmappedstatus || "Payment was not completed";
      const attempts = order.paymentAttempts || [];
      const attemptIdx = attempts.findIndex(a => a.txnid === txnid);
      if (attemptIdx >= 0) {
        attempts[attemptIdx].status = "failure";
        attempts[attemptIdx].error = errorMsg;
        attempts[attemptIdx].updatedAt = new Date().toISOString();
      }
      order.paymentStatus = "Failed";
      order.paymentAttempts = attempts;
      await order.save();

      return res.redirect(303, `${clientBaseUrl}/checkout?failed=${orderId}&txnid=${txnid}&reason=${encodeURIComponent(errorMsg)}`);
    }

    // 7. Perform Server-to-Server Verification with PayU command API
    const verifyRes = await verifyPayuPaymentServerSide(txnid);
    const { isTest } = getPayuConfig();
    const isVerified = verifyRes.isPaid || (isTest && hashCheck.valid);

    if (!isVerified || (verifyRes.amount > 0 && Math.abs(verifyRes.amount - expectedAmount) > 0.01)) {
      console.error(`⚠️ PayU Server-to-Server Verification Failed for txnid ${txnid}:`, verifyRes.message);
      return res.redirect(303, `${clientBaseUrl}/checkout?failed=${orderId}&reason=${encodeURIComponent("Server-side payment verification failed")}`);
    }

    // 8. ATOMIC STATE TRANSITION: Only transition if paymentStatus is NOT already "Paid"
    const updatedOrder = await Order.findOneAndUpdate(
      {
        _id: order._id,
        paymentStatus: { $ne: "Paid" }
      },
      {
        $set: {
          paymentStatus: "Paid",
          orderStatus: "Confirmed",
          status: "Confirmed",
          txnid: txnid,
          mihpayid: params.mihpayid || verifyRes.mihpayid || "",
          bankRefNum: params.bank_ref_num || verifyRes.bankRefNum || "",
          paymentMode: params.mode || verifyRes.mode || "",
          paymentDetails: sanitizePaymentDetails({
            ...params,
            verifiedAt: new Date().toISOString(),
            verifiedBy: "payu_callback_verified"
          })
        }
      },
      { new: true }
    );

    if (updatedOrder) {
      // First time state transition - execute side effects strictly ONCE

      // Update payment attempts array
      const attempts = order.paymentAttempts || [];
      const attemptIdx = attempts.findIndex(a => a.txnid === txnid);
      if (attemptIdx >= 0) {
        attempts[attemptIdx].status = "success";
        attempts[attemptIdx].mihpayid = params.mihpayid || verifyRes.mihpayid;
        attempts[attemptIdx].updatedAt = new Date().toISOString();
      } else {
        attempts.push({
          txnid,
          amount: callbackAmount,
          status: "success",
          mihpayid: params.mihpayid || verifyRes.mihpayid,
          createdAt: new Date().toISOString()
        });
      }
      await Order.updateOne({ _id: order._id }, { $set: { paymentAttempts: attempts } });

      // Deduct inventory stock (atomically claimed strictly once, preventing double deduction & negative stock)
      const stockClaim = await Order.findOneAndUpdate(
        { _id: order._id, inventoryDeducted: { $ne: true } },
        { $set: { inventoryDeducted: true } },
        { new: false }
      );
      if (stockClaim && !stockClaim.inventoryDeducted && order.snapshotItems && Array.isArray(order.snapshotItems)) {
        const bulkOps = [];
        for (const item of order.snapshotItems) {
          if (item.id) {
            const qty = Math.max(1, item.qty || item.quantity || 1);
            bulkOps.push({
              updateOne: {
                filter: { id: item.id, stock: { $gte: qty } },
                update: { $inc: { stock: -qty } }
              }
            });
          }
        }
        if (bulkOps.length > 0) {
          const bulkRes = await Product.bulkWrite(bulkOps);
          const matchedCount = bulkRes?.matchedCount ?? bulkRes?.nMatched ?? 0;
          if (matchedCount < bulkOps.length) {
            console.warn(`Stock conflict on order '${orderId}': matched ${matchedCount} of ${bulkOps.length} items`);
            await Order.updateOne(
              { _id: order._id },
              { $set: { notes: (order.notes ? order.notes + " | " : "") + "INVENTORY_CONFLICT: Stock was insufficient during payment completion" } }
            );
          }
        }
      }

      // Increment coupon usage (atomically claimed strictly once with concurrency limit guard)
      if (order.couponCode) {
        const couponClaim = await Order.findOneAndUpdate(
          { _id: order._id, couponUsedRecorded: { $ne: true } },
          { $set: { couponUsedRecorded: true } },
          { new: false }
        );
        if (couponClaim && !couponClaim.couponUsedRecorded) {
          await Coupon.findOneAndUpdate(
            {
              code: String(order.couponCode).trim().toUpperCase(),
              $or: [
                { limit: { $exists: false } },
                { limit: null },
                { limit: 0 },
                { $expr: { $lt: ["$usage", "$limit"] } }
              ]
            },
            { $inc: { usage: 1 } }
          );
        }
      }

      // Update PaymentTransaction Ledger
      try {
        await PaymentTransaction.findOneAndUpdate(
          { transactionId: txnid },
          {
            $set: {
              status: "SUCCESS",
              gatewayPaymentId: params.mihpayid || verifyRes?.mihpayid || "",
              bankRefNum: params.bank_ref_num || verifyRes?.bankRefNum || "",
              paymentMode: params.mode || verifyRes?.mode || "",
              verifiedAt: new Date(),
              completedAt: new Date()
            }
          }
        );
      } catch (txnErr) {
        console.warn("Could not update PaymentTransaction record on callback:", txnErr.message);
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
    }

    return res.redirect(303, `${clientBaseUrl}/checkout?success=${orderId}&txnid=${txnid}`);
  } catch (err) {
    console.error("Critical error in handlePayuCallback:", err?.message || err);
    return res.redirect(303, `${clientBaseUrl}/checkout?failed=error&reason=${encodeURIComponent("An error occurred while processing your payment.")}`);
  }
}

/**
 * 3. Server-to-Server PayU Webhook Endpoint
 * POST /api/payment/payu-webhook
 * 
 * Handles background server notifications from PayU asynchronously.
 * Fully idempotent: prevents duplicate stock deductions or duplicate transitions.
 */


/**
 * Handle PayU Cancel Callback (curl)
 * POST /api/payment/payu-cancel
 */
export async function handlePayuCancel(req, res) {
  const clientBaseUrl = resolveAppBaseUrl(req);
  try {
    const params = extractPayuParams(req);
    const orderId = String(params.udf1 || params.orderId || "").trim();
    const txnid = String(params.txnid || "").trim();

    if (orderId && isDbConnected()) {
      const { Order } = require("../models/Order.js");
      const order = await Order.findOne({ $or: [{ id: orderId }, { orderId }, { orderNumber: orderId }] });
      if (order && order.paymentStatus !== "Paid") {
        const attempts = order.paymentAttempts || [];
        const attemptIdx = attempts.findIndex(a => a.txnid === txnid);
        if (attemptIdx >= 0) {
          attempts[attemptIdx].status = "cancelled";
          attempts[attemptIdx].error = "User cancelled payment";
          attempts[attemptIdx].updatedAt = new Date().toISOString();
        }
        order.paymentStatus = "Cancelled";
        order.paymentAttempts = attempts;
        await order.save();
      }
    }

    return res.redirect(303, `${clientBaseUrl}/checkout?cancelled=${orderId}&txnid=${txnid}`);
  } catch (err) {
    console.error("Error in handlePayuCancel:", err);
    return res.redirect(303, `${clientBaseUrl}/checkout?cancelled=unknown`);
  }
}

export async function handlePayuWebhook(req, res) {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({ success: false, message: "Database unavailable" });
    }

    const params = extractPayuParams(req);
    const { key: expectedKey, salt, isConfigured } = getPayuConfig();

    if (!isConfigured) {
      return res.status(503).json({ success: false, message: "PayU configuration missing" });
    }

    const orderId = String(params.udf1 || params.orderId || "").trim();
    const txnid = String(params.txnid || "").trim();
    const status = String(params.status || "").toLowerCase().trim();

    if (!orderId || !txnid || !params.hash) {
      return res.status(400).json({ success: false, message: "Missing required webhook parameters" });
    }

    // Verify merchant key
    if (params.key !== expectedKey) {
      return res.status(400).json({ success: false, message: "Invalid merchant key" });
    }

    // Verify hash
    const hashCheck = verifyPayuResponseHash(params, salt);
    if (!hashCheck.valid) {
      console.warn("⚠️ PayU Webhook hash verification failed:", hashCheck.reason);
      return res.status(400).json({ success: false, message: "Hash mismatch" });
    }

    const order = await Order.findOne({ $or: [{ id: orderId }, { orderId }, { orderNumber: orderId }] });
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    // Verify txnid belongs to order
    const belongsToOrder = order.txnid === txnid || (order.paymentAttempts && order.paymentAttempts.some(a => a.txnid === txnid));
    if (!belongsToOrder) {
      return res.status(400).json({ success: false, message: "Transaction ID mismatch" });
    }

    // Verify user ownership if udf2 is sent
    if (params.udf2 && order.authUserId && order.authUserId !== "guest" && String(params.udf2).trim() !== String(order.authUserId).trim()) {
      return res.status(400).json({ success: false, message: "User authorization mismatch" });
    }

    // Verify amount
    const webhookAmount = parseFloat(params.amount);
    const expectedAmount = Number(order.finalAmount || order.total || order.amount || 0);
    if (isNaN(webhookAmount) || Math.abs(webhookAmount - expectedAmount) > 0.01) {
      return res.status(400).json({ success: false, message: "Amount mismatch" });
    }

    // Record Webhook Event Audit Log
    const eventId = `WH_${txnid}_${Date.now()}`;
    try {
      await WebhookEvent.create({
        eventId,
        provider: "payu",
        txnid,
        orderId: order._id ? String(order._id) : orderId,
        gatewayPaymentId: params.mihpayid || "",
        payloadHash: hashPayload(params),
        signatureValid: hashCheck.valid,
        processingStatus: status === "success" ? "PROCESSING" : "PROCESSED",
        receivedAt: new Date()
      });
    } catch (whErr) {
      console.warn("Could not save WebhookEvent:", whErr.message);
    }

    if (status !== "success") {
      try {
        await PaymentTransaction.findOneAndUpdate(
          { transactionId: txnid },
          { $set: { status: "FAILED", errorMessage: params.error_Message || params.unmappedstatus || "Gateway reported failure" } }
        );
      } catch (_) {}
      return res.status(200).json({ success: true, message: "Webhook received (payment not successful)" });
    }

    // Authoritative Server-to-Server Verification
    const verifyRes = await verifyPayuPaymentServerSide(txnid);
    if (!verifyRes.isPaid || Math.abs(verifyRes.amount - expectedAmount) > 0.01) {
      try {
        await PaymentTransaction.findOneAndUpdate(
          { transactionId: txnid },
          { $set: { status: "FAILED", errorMessage: "Server-side verification mismatch" } }
        );
      } catch (_) {}
      return res.status(400).json({ success: false, message: "Server-side payment verification failed" });
    }

    // ATOMIC STATE TRANSITION
    const updatedOrder = await Order.findOneAndUpdate(
      {
        _id: order._id,
        paymentStatus: { $ne: "Paid" }
      },
      {
        $set: {
          paymentStatus: "Paid",
          orderStatus: "Confirmed",
          status: "Confirmed",
          txnid: txnid,
          mihpayid: params.mihpayid || verifyRes.mihpayid || "",
          bankRefNum: params.bank_ref_num || verifyRes.bankRefNum || "",
          paymentMode: params.mode || verifyRes.mode || "",
          paymentDetails: sanitizePaymentDetails({
            ...params,
            verifiedAt: new Date().toISOString(),
            verifiedBy: "payu_webhook_verified"
          })
        }
      },
      { new: true }
    );

    if (updatedOrder) {
      // Execute side-effects strictly ONCE (atomically claimed)
      const stockClaim = await Order.findOneAndUpdate(
        { _id: order._id, inventoryDeducted: { $ne: true } },
        { $set: { inventoryDeducted: true } },
        { new: false }
      );
      if (stockClaim && !stockClaim.inventoryDeducted && order.snapshotItems && Array.isArray(order.snapshotItems)) {
        const bulkOps = [];
        for (const item of order.snapshotItems) {
          if (item.id) {
            const qty = Math.max(1, item.qty || item.quantity || 1);
            bulkOps.push({
              updateOne: {
                filter: { id: item.id, stock: { $gte: qty } },
                update: { $inc: { stock: -qty } }
              }
            });
          }
        }
        if (bulkOps.length > 0) {
          await Product.bulkWrite(bulkOps);
        }
      }

      if (order.couponCode) {
        const couponClaim = await Order.findOneAndUpdate(
          { _id: order._id, couponUsedRecorded: { $ne: true } },
          { $set: { couponUsedRecorded: true } },
          { new: false }
        );
        if (couponClaim && !couponClaim.couponUsedRecorded) {
          await Coupon.findOneAndUpdate(
            {
              code: String(order.couponCode).trim().toUpperCase(),
              $or: [
                { limit: { $exists: false } },
                { limit: null },
                { limit: 0 },
                { $expr: { $lt: ["$usage", "$limit"] } }
              ]
            },
            { $inc: { usage: 1 } }
          );
        }
      }

      try {
        await PaymentTransaction.findOneAndUpdate(
          { transactionId: txnid },
          {
            $set: {
              status: "SUCCESS",
              gatewayPaymentId: params.mihpayid || verifyRes?.mihpayid || "",
              bankRefNum: params.bank_ref_num || verifyRes?.bankRefNum || "",
              paymentMode: params.mode || verifyRes?.mode || "",
              verifiedAt: new Date(),
              completedAt: new Date()
            }
          }
        );
        await WebhookEvent.findOneAndUpdate({ eventId }, { $set: { processingStatus: "PROCESSED", processedAt: new Date() } });
      } catch (_) {}
    }

    return res.status(200).json({ success: true, message: "Webhook processed successfully" });
  } catch (err) {
    console.error("PayU Webhook error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}

/**
 * 4. Verify Payment Status on Demand
 * GET /api/payment/verify/:orderId
 * 
 * IDOR Secured: Allows only the order owner (authUserId) OR authorized Admin
 */
export async function verifyPaymentStatus(req, res, next) {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({ success: false, message: "Payment service temporarily unavailable. Please try again." });
    }

    const { orderId } = req.params;
    const authUserId = req.user?.authUserId;
    const reqTxnid = String(req.query.txnid || req.headers["x-payu-txnid"] || "").trim();

    const order = await Order.findOne({ $or: [{ id: orderId }, { orderId }, { orderNumber: orderId }] });
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    // Strict Ownership Check:
    // For authenticated orders, order.authUserId === verified Firebase uid or verified Admin.
    // Transaction ID alone is NOT an authorization credential.
    // For guest orders, require a secure server-issued guestToken match.
    const reqGuestToken = String(req.headers["x-guest-token"] || req.query.guestToken || "").trim();
    const { isInitialAdmin } = isAdminUser(req.user);
    const isAdmin = isInitialAdmin || (authUserId ? await hasAdminRole(authUserId) : false);
    const isOwner = authUserId && order.authUserId && String(order.authUserId) === String(authUserId);
    const isGuestOwner = (!order.authUserId || order.authUserId === "guest") && Boolean(order.guestToken) && reqGuestToken === order.guestToken;

    if (!isAdmin && !isOwner && !isGuestOwner) {
      return res.status(403).json({ success: false, message: "Access Denied" });
    }

    // If order is already confirmed as Paid, return immediately with authoritative data
    if (order.paymentStatus === "Paid") {
      return res.status(200).json({ success: true, data: order });
    }

    // If order is pending and has a transaction ID, perform live PayU server-to-server check
    if (order.paymentStatus !== "Paid" && order.txnid) {
      const { isConfigured } = getPayuConfig();
      if (isConfigured) {
        const verifyRes = await verifyPayuPaymentServerSide(order.txnid);
        const expectedAmount = Number(order.finalAmount || order.total || order.amount || 0);

        if (verifyRes.isPaid && Math.abs(verifyRes.amount - expectedAmount) < 0.01) {
          const updatedOrder = await Order.findOneAndUpdate(
            { _id: order._id, paymentStatus: { $ne: "Paid" } },
            {
              $set: {
                paymentStatus: "Paid",
                orderStatus: "Confirmed",
                status: "Confirmed",
                mihpayid: verifyRes.mihpayid || order.mihpayid,
                bankRefNum: verifyRes.bankRefNum || order.bankRefNum,
                paymentMode: verifyRes.mode || order.paymentMode,
                paymentDetails: sanitizePaymentDetails({
                  ...order.paymentDetails,
                  ...verifyRes.txnDetails,
                  verifiedAt: new Date().toISOString(),
                  verifiedBy: "on_demand_server_verify"
                })
              }
            },
            { new: true }
          );

          if (updatedOrder) {
            const stockClaim = await Order.findOneAndUpdate(
              { _id: order._id, inventoryDeducted: { $ne: true } },
              { $set: { inventoryDeducted: true } },
              { new: false }
            );
            if (stockClaim && !stockClaim.inventoryDeducted && order.snapshotItems && Array.isArray(order.snapshotItems)) {
              const bulkOps = [];
              for (const item of order.snapshotItems) {
                if (item.id) {
                  const qty = Math.max(1, item.qty || item.quantity || 1);
                  bulkOps.push({
                    updateOne: {
                      filter: { id: item.id, stock: { $gte: qty } },
                      update: { $inc: { stock: -qty } }
                    }
                  });
                }
              }
              if (bulkOps.length > 0) {
                await Product.bulkWrite(bulkOps);
              }
            }

            if (order.couponCode) {
              const couponClaim = await Order.findOneAndUpdate(
                { _id: order._id, couponUsedRecorded: { $ne: true } },
                { $set: { couponUsedRecorded: true } },
                { new: false }
              );
              if (couponClaim && !couponClaim.couponUsedRecorded) {
                await Coupon.findOneAndUpdate({ code: order.couponCode.toUpperCase() }, { $inc: { usage: 1 } });
              }
            }
          }
        }
      }
    }

    const currentOrder = await Order.findById(order._id);

    return res.json({
      success: true,
      data: {
        orderId: currentOrder.orderNumber || currentOrder.id,
        orderNumber: currentOrder.orderNumber || currentOrder.id,
        paymentStatus: currentOrder.paymentStatus,
        status: currentOrder.status,
        orderStatus: currentOrder.orderStatus,
        txnid: currentOrder.txnid,
        mihpayid: currentOrder.mihpayid,
        amount: currentOrder.finalAmount || currentOrder.total,
        amountRefunded: currentOrder.amountRefunded || 0,
        paymentMethod: currentOrder.paymentMethod,
        refundHistory: (currentOrder.refundHistory || []).map(r => ({
          refundId: r.refundId,
          amount: r.amount,
          status: r.status,
          date: r.date,
          reason: r.reason
        }))
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
    if (!isDbConnected()) {
      return res.status(503).json({ success: false, message: "Payment service temporarily unavailable. Please try again." });
    }

    const { orderId } = req.params;
    const authUserId = req.user?.authUserId;
    const reqTxnid = String(req.body?.txnid || req.query?.txnid || req.headers["x-payu-txnid"] || "").trim();

    const order = await Order.findOne({ $or: [{ id: orderId }, { orderId }, { orderNumber: orderId }] });
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    // Strict Ownership Check:
    // For authenticated orders, order.authUserId === verified Firebase uid or verified Admin.
    // Transaction ID alone is NOT an authorization credential.
    // For guest orders, require a secure server-issued guestToken match.
    const reqGuestToken = String(req.headers["x-guest-token"] || req.query.guestToken || req.body?.guestToken || "").trim();
    const { isInitialAdmin } = isAdminUser(req.user);
    const isAdmin = isInitialAdmin || (authUserId ? await hasAdminRole(authUserId) : false);
    const isOwner = authUserId && order.authUserId && String(order.authUserId) === String(authUserId);
    const isGuestOwner = (!order.authUserId || order.authUserId === "guest") && Boolean(order.guestToken) && reqGuestToken === order.guestToken;

    if (!isAdmin && !isOwner && !isGuestOwner) {
      return res.status(403).json({ success: false, message: "Access Denied" });
    }

    if (order.paymentStatus === "Paid") {
      return res.status(400).json({ success: false, message: "This order has already been paid successfully." });
    }

    if (order.status === "Cancelled" || order.paymentStatus === "Refunded") {
      return res.status(400).json({ success: false, message: "Cannot retry payment on a cancelled or refunded order." });
    }

    // Verify item stock availability before allowing retry payment
    if (order.snapshotItems && Array.isArray(order.snapshotItems)) {
      const itemIds = order.snapshotItems.map(i => i.id).filter(Boolean);
      if (itemIds.length > 0) {
        const dbProducts = await Product.find({ id: { $in: itemIds } }).lean();
        const productMap = new Map(dbProducts.map(p => [p.id, p]));
        for (const item of order.snapshotItems) {
          if (item.id) {
            const product = productMap.get(item.id);
            const qty = Math.max(1, item.qty || item.quantity || 1);
            if (product && product.stock !== undefined && product.stock < qty) {
              return res.status(400).json({
                success: false,
                message: `Product '${product.name || item.name || "Item"}' is out of stock (Available: ${product.stock}, Needed: ${qty}). Cannot retry payment.`
              });
            }
          }
        }
      }
    }

    const { key, salt, paymentUrl, isConfigured } = getPayuConfig();

    if (!isConfigured) {
      return res.status(503).json({ success: false, message: "Payment gateway configuration missing." });
    }

    // Create a NEW transaction attempt ID for this retry while keeping order.id unchanged
    const newTxnid = `TXN_${(order.orderNumber || order.id).replace(/[^a-zA-Z0-9]/g, "")}_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const amount = Number(order.finalAmount || order.total || order.amount || 0);

    const email = (order.customerEmail || req.user.email || "devotee@aurarudraksha.com").trim().toLowerCase();
    const firstname = (order.customerName || order.firstName || req.user.name || "Devotee").trim();
    const phone = (order.phone || order.customerPhone || "").trim();
    const productinfo = `Aura Rudraksha Order Retry (${order.orderNumber || order.id})`;

    const appBaseUrl = resolveAppBaseUrl(req);
    const surl = `${appBaseUrl}/api/payment/payu-callback`;
    const furl = `${appBaseUrl}/api/payment/payu-callback`;
    const curl = `${appBaseUrl}/api/payment/payu-cancel`;

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

    const hash = generatePayuPaymentHash({
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

    return res.json({
      success: true,
      data: {
        orderId: order.orderNumber || order.id,
        orderNumber: order.orderNumber || order.id,
        txnid: newTxnid,
        amount,
        payuConfigured: true,
        paymentUrl,
        params: {
          key,
          txnid: newTxnid,
          amount: amount.toFixed(2),
          productinfo,
          firstname,
          email,
          phone,
          surl,
          furl,
          curl,
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
    if (!isDbConnected()) {
      return res.status(503).json({ success: false, message: "Database unavailable" });
    }

    const { orderId } = req.params;
    const { refundAmount, reason, refundToken: clientRefundToken } = req.body || {};

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

    let payuMihpayid = order.mihpayid;
    if (!payuMihpayid && order.txnid) {
      const verifyRes = await verifyPayuPaymentServerSide(order.txnid);
      if (verifyRes.mihpayid) {
        payuMihpayid = verifyRes.mihpayid;
        order.mihpayid = verifyRes.mihpayid;
        await order.save();
      }
    }

    if (!payuMihpayid) {
      return res.status(400).json({
        success: false,
        message: "No PayU Payment ID (mihpayid) found for this order. Verification required before refund."
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

    // Server-generated unique refund token for PayU
    const refundToken = clientRefundToken || `REF_${(order.orderNumber || order.id).replace(/[^a-zA-Z0-9]/g, "")}_${Date.now()}_${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

    // Prevent duplicate refund requests (Idempotency)
    const existingRefund = (order.refundHistory || []).find(r => r.refundToken === refundToken);
    if (existingRefund) {
      return res.json({
        success: true,
        message: "Refund already processed with this token",
        refund: existingRefund
      });
    }

    // Atomic race-condition lock check
    const lockedOrder = await Order.findOneAndUpdate(
      {
        _id: order._id,
        amountRefunded: alreadyRefunded,
        paymentStatus: { $in: ["Paid", "Partially Refunded"] }
      },
      {
        $set: { isRefunding: true }
      },
      { new: true }
    );

    if (!lockedOrder) {
      return res.status(409).json({
        success: false,
        message: "A concurrent refund or state change is already processing for this order."
      });
    }

    let refundResult;
    try {
      // Call PayU Live Refund API using official mihpayid
      refundResult = await refundPayuTransaction({
        mihpayid: payuMihpayid,
        txnid: order.txnid,
        amount: currentRefundAmount,
        token: refundToken
      });
    } catch (apiErr) {
      await Order.updateOne({ _id: order._id }, { $unset: { isRefunding: 1 } });
      throw apiErr;
    }

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
      refundToken: refundResult.refundToken || refundToken,
      amount: currentRefundAmount,
      status: "Success",
      reason: reason || "Admin Processed Refund via PayU",
      date: new Date().toISOString(),
      initiatedBy: req.user?.email || "Admin"
    };

    const history = order.refundHistory || [];
    history.push(refundEntry);
    order.refundHistory = history;
    order.refundDetails = refundEntry;
    delete order.isRefunding;

    // Restock inventory only on full refund
    if (isFullRefund && order.inventoryDeducted && order.snapshotItems && Array.isArray(order.snapshotItems)) {
      const bulkOps = [];
      for (const item of order.snapshotItems) {
        if (item.id) {
          const qty = Math.max(1, item.qty || item.quantity || 1);
          bulkOps.push({
            updateOne: {
              filter: { id: item.id },
              update: { $inc: { stock: qty } }
            }
          });
        }
      }
      if (bulkOps.length > 0) {
        await Product.bulkWrite(bulkOps);
      }
      order.inventoryDeducted = false;
    }

    await order.save();
    await Order.updateOne({ _id: order._id }, { $unset: { isRefunding: 1 } });

    // Update Payment Transaction record
    try {
      await PaymentTransaction.findOneAndUpdate(
        { orderId: order.id },
        {
          $set: {
            status: isFullRefund ? "REFUNDED" : "PARTIAL_REFUND"
          },
          $push: {
            refunds: refundEntry
          }
        }
      );
    } catch (_) {}

    // Audit log refund event
    await logAuditEvent({
      actor: req.user?.email || "admin",
      actorRole: "admin",
      action: isFullRefund ? "PAYMENT_REFUNDED_FULL" : "PAYMENT_REFUNDED_PARTIAL",
      entityType: "Order",
      entityId: order.orderNumber || order.id,
      oldState: { paymentStatus: isFullRefund ? "Paid" : "Partially Refunded", amountRefunded: alreadyRefunded },
      newState: { paymentStatus: order.paymentStatus, amountRefunded: newAmountRefunded, refund: refundEntry },
      reason: reason || "Admin PayU Live Refund",
      req
    });

    return res.json({
      success: true,
      message: `Successfully processed PayU refund of ₹${currentRefundAmount.toLocaleString('en-IN')}`,
      data: {
        orderId: order.orderNumber || order.id,
        amountRefunded: order.amountRefunded,
        paymentStatus: order.paymentStatus
      },
      refund: refundEntry
    });
  } catch (err) {
    console.error("PayU Refund Error:", err?.message || err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to process PayU refund"
    });
  }
}

/**
 * 7. Customer-Authorized Cancellation for Unpaid / Pending / Abandoned Orders
 * POST /api/payment/cancel/:orderId
 */
export async function cancelUnpaidOrder(req, res, next) {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({ success: false, message: "Database unavailable" });
    }

    const { orderId } = req.params;
    const authUserId = req.user?.authUserId;

    if (!authUserId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const order = await Order.findOne({ $or: [{ id: orderId }, { orderId }, { orderNumber: orderId }] });
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    // IDOR Check: Customer can only cancel their own order (or admin)
    const { isInitialAdmin } = isAdminUser(req.user);
    const isAdmin = isInitialAdmin || (await hasAdminRole(authUserId));

    if (!isAdmin && order.authUserId !== authUserId) {
      return res.status(403).json({ success: false, message: "Access Denied" });
    }

    // Paid or Refunded orders CANNOT be cancelled through this unpaid cancellation endpoint
    if (order.paymentStatus === "Paid" || order.paymentStatus === "Refunded") {
      return res.status(400).json({
        success: false,
        message: "Paid orders cannot be cancelled via this endpoint. Please contact customer support for refund/cancellation."
      });
    }

    if (order.status === "Cancelled") {
      return res.json({
        success: true,
        message: "Order is already cancelled.",
        data: { orderId: order.orderNumber || order.id, status: "Cancelled" }
      });
    }

    const now = new Date().toISOString();
    order.status = "Cancelled";
    order.orderStatus = "Cancelled";
    order.paymentStatus = "Cancelled";
    order.cancelledAt = now;
    order.cancelledBy = isAdmin ? "Admin" : "Customer";
    order.cancelReason = req.body?.reason || "Customer cancelled unpaid order";

    // If stock was somehow deducted earlier, restore it
    if (order.inventoryDeducted && order.snapshotItems && Array.isArray(order.snapshotItems)) {
      const bulkOps = [];
      for (const item of order.snapshotItems) {
        if (item.id) {
          const qty = Math.max(1, item.qty || item.quantity || 1);
          bulkOps.push({
            updateOne: {
              filter: { id: item.id },
              update: { $inc: { stock: qty } }
            }
          });
        }
      }
      if (bulkOps.length > 0) {
        await Product.bulkWrite(bulkOps);
      }
      order.inventoryDeducted = false;
    }

    await order.save();

    return res.json({
      success: true,
      message: "Order cancelled successfully.",
      data: {
        orderId: order.orderNumber || order.id,
        status: "Cancelled",
        paymentStatus: "Cancelled"
      }
    });
  } catch (err) {
    next(err);
  }
}

