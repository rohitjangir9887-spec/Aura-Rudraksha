import crypto from "crypto";
import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { Coupon } from "../models/Coupon.js";
import { isDbConnected } from "../config/db.js";
import { recordCustomerOrder } from "./customerController.js";
import { calculateOrderTotals } from "../services/pricingService.js";
import {
  createCashfreeOrder,
  fetchCashfreeOrder,
  fetchCashfreePayments,
  verifyCashfreeWebhookSignature,
  getCashfreeClient
} from "../services/cashfreeService.js";

/**
 * Returns public configuration for Cashfree JS SDK (mode / environment).
 * Absolute rule: NEVER exposes client secret or webhook secret.
 */
export async function getCashfreeConfig(req, res) {
  try {
    const envSetting = (process.env.CASHFREE_ENVIRONMENT || "PRODUCTION").trim().toUpperCase();
    return res.json({
      success: true,
      environment: envSetting === "SANDBOX" ? "sandbox" : "production"
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * Creates a server-verified Order in MongoDB and requests a Cashfree payment_session_id.
 * POST /api/payments/cashfree/create-order
 */
export async function createCashfreeCheckoutSession(req, res, next) {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        message: "Database is unavailable. Please try again in a few moments."
      });
    }

    const authUserId = req.user?.authUserId;
    if (!authUserId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required to initiate checkout."
      });
    }

    const {
      lines = [],
      shippingAddress = {},
      couponCode = "",
      notes = "",
      source = "website"
    } = req.body || {};

    if (!Array.isArray(lines) || lines.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Your cart is empty. Please add items before checking out."
      });
    }

    const {
      firstName = "",
      lastName = "",
      name = "",
      phone = "",
      email = "",
      address = "",
      city = "",
      state = "",
      pincode = ""
    } = shippingAddress;

    const customerName = (name || `${firstName} ${lastName}`).trim() || "Aura Customer";
    const customerEmail = (email || req.user?.email || "").trim().toLowerCase();
    const customerPhone = (phone || req.user?.phone || "").trim();

    if (!customerPhone) {
      return res.status(400).json({
        success: false,
        message: "Mobile phone number is required for shipping and Cashfree payment processing."
      });
    }

    if (!address || !city || !state || !pincode) {
      return res.status(400).json({
        success: false,
        message: "Complete delivery address (street, city, state, and pincode) is required."
      });
    }

    // 1. Authoritative price calculation
    const rawLines = lines.map((l) => ({
      id: l.id || l.productId,
      quantity: Number(l.quantity || l.qty || 1)
    }));

    const cleanCoupon = (couponCode || "").trim().toUpperCase();
    const totals = await calculateOrderTotals({
      lines: rawLines,
      couponCode: cleanCoupon || null,
      authUserId
    });

    if (!totals.items || totals.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: totals.unavailableItems?.[0]?.reason || "Selected products are unavailable."
      });
    }

    // 2. Strict stock check
    for (const item of totals.items) {
      const product = await Product.findOne({ id: item.id });
      if (!product || product.status !== "Active") {
        return res.status(400).json({
          success: false,
          message: `Product '${item.name}' is currently unavailable.`
        });
      }
      if (product.stock !== undefined && product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Product '${product.name}' is out of stock (Available: ${product.stock}, Requested: ${item.quantity}).`
        });
      }
    }

    // 3. Coupon validation check
    let validCouponDoc = null;
    if (cleanCoupon) {
      if (totals.couponStatus !== "APPLIED" || !totals.couponValid) {
        return res.status(400).json({
          success: false,
          status: totals.couponStatus,
          message: totals.couponReason || "The applied coupon is invalid or expired."
        });
      }
      validCouponDoc = await Coupon.findOne({ code: cleanCoupon });
    }

    // 4. Generate unique internal Order ID and Cashfree Order ID
    const internalOrderId =
      "ORD-" +
      Date.now().toString(36).toUpperCase() +
      "-" +
      crypto.randomBytes(3).toString("hex").toUpperCase();
    const cashfreeOrderId = internalOrderId; // Cashfree accepts alphanumeric + dash/underscore

    const formattedAddress = `${address}, ${city}, ${state} - ${pincode}`;
    const now = new Date().toISOString();

    // 5. Pre-create internal Order in MongoDB with 'Pending' payment status
    const orderPayload = {
      id: internalOrderId,
      orderId: internalOrderId,
      authUserId,
      customerId: authUserId,
      customerName,
      customerEmail,
      customerPhone,
      phone: customerPhone,
      firstName,
      lastName,
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
      paymentProvider: "cashfree",
      cashfreeOrderId,
      paymentMethod: "Cashfree Payment Gateway (UPI, Cards, Netbanking)",
      paymentStatus: "Pending",
      orderStatus: "Created",
      status: "Pending",
      address: formattedAddress,
      shippingAddress: {
        address,
        city,
        state,
        pincode,
        phone: customerPhone,
        firstName,
        lastName,
        name: customerName,
        email: customerEmail
      },
      city,
      state,
      pincode,
      notes: notes || "",
      orderSource: source,
      source
    };

    const savedOrder = await Order.create(orderPayload);

    // 6. Build Return URL for Cashfree
    const appBaseUrl =
      process.env.APP_BASE_URL ||
      (req.headers.origin ? req.headers.origin : `https://${req.headers.host || "rudraksha.vercel.app"}`);
    const returnUrl = `${appBaseUrl.replace(/\/$/, "")}/order-confirmation?orderId=${encodeURIComponent(
      internalOrderId
    )}&cf_order_id={order_id}`;

    // 7. Request Cashfree PG to create order and return payment_session_id
    const cashfreeRes = await createCashfreeOrder({
      orderId: cashfreeOrderId,
      orderAmount: totals.finalTotal,
      customerId: authUserId,
      customerPhone,
      customerEmail,
      customerName,
      returnUrl
    });

    // 8. Update Order with session details
    savedOrder.cashfreePaymentSessionId = cashfreeRes.paymentSessionId;
    savedOrder.cashfreeOrderId = cashfreeRes.cashfreeOrderId;
    await savedOrder.save();

    return res.status(201).json({
      success: true,
      orderId: internalOrderId,
      cashfreeOrderId: cashfreeRes.cashfreeOrderId,
      paymentSessionId: cashfreeRes.paymentSessionId,
      environment: cashfreeRes.environment,
      amount: totals.finalTotal,
      currency: "INR"
    });
  } catch (err) {
    console.error("Cashfree createOrder Error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to initiate Cashfree payment session. Please check server configuration."
    });
  }
}

/**
 * Server-side payment verification for an order.
 * Queries Cashfree API directly to verify the real payment state.
 * Never trusts client assertions.
 * GET /api/payments/cashfree/status/:orderId
 * POST /api/payments/cashfree/verify
 */
export async function verifyAndSyncPaymentStatus(req, res, next) {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({ success: false, message: "Database unavailable." });
    }

    const orderIdParam = req.params.orderId || req.body?.orderId || req.query?.orderId;
    if (!orderIdParam) {
      return res.status(400).json({ success: false, message: "orderId is required." });
    }

    // Find the order in MongoDB
    const order = await Order.findOne({
      $or: [{ id: orderIdParam }, { orderId: orderIdParam }, { cashfreeOrderId: orderIdParam }]
    });

    if (!order) {
      return res.status(404).json({ success: false, message: `Order '${orderIdParam}' not found.` });
    }

    // If order is already Paid, return success immediately
    if (order.paymentStatus === "Paid") {
      return res.json({
        success: true,
        isPaid: true,
        paymentStatus: "Paid",
        orderStatus: order.orderStatus,
        data: order
      });
    }

    // Query Cashfree for actual payment attempts
    const cfTargetOrderId = order.cashfreeOrderId || order.id;
    let paymentAttempts = [];
    let cfOrderData = null;

    try {
      paymentAttempts = await fetchCashfreePayments(cfTargetOrderId);
    } catch (cfErr) {
      console.warn(`Could not fetch payments for CF order ${cfTargetOrderId}:`, cfErr.message);
    }

    try {
      cfOrderData = await fetchCashfreeOrder(cfTargetOrderId);
    } catch (cfOrderErr) {
      console.warn(`Could not fetch CF order ${cfTargetOrderId}:`, cfOrderErr.message);
    }

    // Check if any payment attempt was SUCCESS
    const successfulPayment = Array.isArray(paymentAttempts)
      ? paymentAttempts.find(
          (p) =>
            p.payment_status === "SUCCESS" ||
            p.payment_status === "PAID" ||
            p.is_captured === true
        )
      : null;

    const isCfOrderPaid =
      successfulPayment ||
      cfOrderData?.order_status === "PAID" ||
      cfOrderData?.order_status === "SUCCESS";

    if (isCfOrderPaid) {
      const paymentInfo = successfulPayment || paymentAttempts?.[0] || cfOrderData || {};

      // Mark order as PAID
      order.paymentStatus = "Paid";
      order.orderStatus = "Confirmed";
      order.status = "Confirmed";
      order.paidAt = new Date().toISOString();
      order.cashfreePaymentStatus = "SUCCESS";
      order.cashfreeTransactionId =
        paymentInfo.cf_payment_id ||
        paymentInfo.payment_id ||
        String(paymentInfo.bank_reference || paymentInfo.reference_id || "");
      order.cashfreePaymentDetails = paymentInfo;

      await order.save();

      // Decrement product stock safely (only once)
      if (Array.isArray(order.items)) {
        for (const item of order.items) {
          if (item.id) {
            await Product.findOneAndUpdate({ id: item.id }, { $inc: { stock: -Number(item.quantity || 1) } });
          }
        }
      }

      // Update coupon usage
      if (order.couponCode) {
        await Coupon.findOneAndUpdate(
          { code: String(order.couponCode).toUpperCase() },
          { $inc: { usage: 1 } }
        );
      }

      // Record / update customer profile
      try {
        await recordCustomerOrder({
          authUserId: order.authUserId,
          email: order.customerEmail,
          phone: order.customerPhone || order.phone,
          name: order.customerName,
          address: order.address,
          amount: order.finalAmount || order.amount
        });
      } catch (cErr) {
        console.warn("Could not sync customer on payment verification:", cErr.message);
      }

      return res.json({
        success: true,
        isPaid: true,
        paymentStatus: "Paid",
        orderStatus: "Confirmed",
        transactionId: order.cashfreeTransactionId,
        data: order
      });
    }

    // If payment failed or dropped
    const latestPayment = Array.isArray(paymentAttempts) && paymentAttempts.length > 0 ? paymentAttempts[0] : null;
    if (latestPayment && (latestPayment.payment_status === "FAILED" || latestPayment.payment_status === "USER_DROPPED")) {
      order.cashfreePaymentStatus = latestPayment.payment_status;
      order.cashfreePaymentDetails = latestPayment;
      await order.save();

      return res.json({
        success: true,
        isPaid: false,
        paymentStatus: "Failed",
        orderStatus: order.orderStatus,
        reason: latestPayment.payment_message || "Payment attempt failed or was cancelled by user.",
        data: order
      });
    }

    return res.json({
      success: true,
      isPaid: false,
      paymentStatus: order.paymentStatus || "Pending",
      orderStatus: order.orderStatus,
      message: "Payment is pending completion with Cashfree.",
      data: order
    });
  } catch (err) {
    console.error("verifyAndSyncPaymentStatus Error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to verify Cashfree payment status."
    });
  }
}

/**
 * Cashfree Webhook Handler.
 * Receives asynchronous notifications from Cashfree servers.
 * POST /api/webhooks/cashfree
 */
export async function handleCashfreeWebhook(req, res) {
  try {
    const signature = req.headers["x-webhook-signature"] || req.headers["x-signature"];
    const timestamp = req.headers["x-webhook-timestamp"] || req.headers["x-timestamp"];
    const rawBody = req.rawBody || (typeof req.body === "string" ? req.body : JSON.stringify(req.body));

    // Verify signature
    const isValid = verifyCashfreeWebhookSignature({ signature, rawBody, timestamp });
    if (!isValid) {
      console.warn("Unauthorized Cashfree webhook: Invalid HMAC signature.");
      return res.status(401).json({ status: "error", message: "Invalid signature" });
    }

    const payload = typeof req.body === "object" ? req.body : JSON.parse(rawBody || "{}");
    const eventType = payload.type || payload.event;
    const data = payload.data || payload;

    const cfOrderId = data.order?.order_id || data.order_id;
    if (!cfOrderId) {
      return res.status(200).json({ status: "ignored", message: "No order_id in webhook payload" });
    }

    if (!isDbConnected()) {
      console.warn("Database disconnected during Cashfree webhook processing.");
      return res.status(503).json({ status: "error", message: "Database unavailable" });
    }

    const order = await Order.findOne({
      $or: [{ cashfreeOrderId: cfOrderId }, { id: cfOrderId }, { orderId: cfOrderId }]
    });

    if (!order) {
      console.warn(`Webhook received for unknown order: ${cfOrderId}`);
      return res.status(200).json({ status: "order_not_found" });
    }

    // Handle Payment Success
    if (
      eventType === "PAYMENT_SUCCESS_WEBHOOK" ||
      eventType === "ORDER_PAID" ||
      data.payment?.payment_status === "SUCCESS"
    ) {
      if (order.paymentStatus !== "Paid") {
        const payment = data.payment || {};
        order.paymentStatus = "Paid";
        order.orderStatus = "Confirmed";
        order.status = "Confirmed";
        order.paidAt = new Date().toISOString();
        order.cashfreePaymentStatus = "SUCCESS";
        order.cashfreeTransactionId =
          payment.cf_payment_id || payment.payment_id || String(payment.bank_reference || "");
        order.cashfreePaymentDetails = payment;

        await order.save();

        // Decrement stock
        if (Array.isArray(order.items)) {
          for (const item of order.items) {
            if (item.id) {
              await Product.findOneAndUpdate({ id: item.id }, { $inc: { stock: -Number(item.quantity || 1) } });
            }
          }
        }

        // Increment coupon
        if (order.couponCode) {
          await Coupon.findOneAndUpdate(
            { code: String(order.couponCode).toUpperCase() },
            { $inc: { usage: 1 } }
          );
        }

        // Sync customer
        try {
          await recordCustomerOrder({
            authUserId: order.authUserId,
            email: order.customerEmail,
            phone: order.customerPhone || order.phone,
            name: order.customerName,
            address: order.address,
            amount: order.finalAmount || order.amount
          });
        } catch (_) {}
      }
    } else if (
      eventType === "PAYMENT_FAILED_WEBHOOK" ||
      eventType === "PAYMENT_USER_DROPPED_WEBHOOK"
    ) {
      if (order.paymentStatus !== "Paid") {
        order.cashfreePaymentStatus = data.payment?.payment_status || "FAILED";
        order.cashfreePaymentDetails = data.payment || {};
        await order.save();
      }
    }

    return res.status(200).json({ status: "ok" });
  } catch (err) {
    console.error("Cashfree Webhook Handler Error:", err);
    return res.status(500).json({ status: "error", message: err.message });
  }
}
