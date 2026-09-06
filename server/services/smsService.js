import { Order } from "../models/Order.js";
import { isDbConnected } from "../config/db.js";

/**
 * Cleanly extracts and normalizes Indian 10-digit mobile number
 * Handles formats: +919876543210, 09876543210, 919876543210, 9876543210, "+91 98765 43210"
 * Returns clean 10-digit string starting with 6-9, or null if invalid.
 */
export function normalizeIndianPhone(phoneInput) {
  if (!phoneInput) return null;
  const digits = String(phoneInput).replace(/\D/g, "");

  if (digits.length === 10 && /^[6-9]\d{9}$/.test(digits)) {
    return digits;
  }
  if (digits.length === 12 && digits.startsWith("91") && /^[6-9]\d{9}$/.test(digits.slice(2))) {
    return digits.slice(2);
  }
  if (digits.length === 11 && digits.startsWith("0") && /^[6-9]\d{9}$/.test(digits.slice(1))) {
    return digits.slice(1);
  }
  return null;
}

/**
 * Format order confirmation transactional SMS content
 */
export function formatOrderSuccessSmsMessage(order) {
  const orderId = order.orderNumber || order.id || order.orderId || "AURA-ORDER";
  const rawAmt = Number(order.finalAmount || order.total || order.amount || 0);
  const formattedAmt = isNaN(rawAmt) ? "0" : rawAmt.toFixed(0);

  return `Aura Rudraksha: Your order #${orderId} is confirmed. Payment of Rs ${formattedAmt} was received successfully. Thank you for shopping with Aura Rudraksha.`;
}

/**
 * Get SMS Provider configuration from environment variables
 */
export function getSmsConfig() {
  const provider = (process.env.SMS_PROVIDER || "unconfigured").toLowerCase().trim();
  const apiKey = (process.env.SMS_API_KEY || process.env.FAST2SMS_API_KEY || process.env.MSG91_AUTH_KEY || "").trim();
  const senderId = (process.env.SMS_SENDER_ID || "AURARD").trim();
  const dltTemplateId = (process.env.SMS_DLT_TEMPLATE_ID || "").trim();
  const isPayuSmsEnabled = (process.env.PAYU_SMS_ENABLED || "false").toLowerCase().trim() === "true";

  const isConfigured = Boolean((provider !== "unconfigured" && apiKey) || isPayuSmsEnabled);

  return {
    provider,
    apiKey,
    senderId,
    dltTemplateId,
    isPayuSmsEnabled,
    isConfigured
  };
}

/**
 * Execute S2S API call to external SMS Gateway or PayU SMS API
 */
async function dispatchSmsViaGateway({ phone, message, config }) {
  const { provider, apiKey, senderId, dltTemplateId } = config;

  // Custom / Fast2SMS Provider Integration
  if (provider === "fast2sms") {
    const response = await fetch("https://www.fast2sms.com/dev/bulkV2", {
      method: "POST",
      headers: {
        "authorization": apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        route: "dlt",
        sender_id: senderId,
        message: message,
        variables_values: "",
        numbers: phone,
        template_id: dltTemplateId || undefined
      })
    });

    const data = await response.json();
    if (data && data.return === true) {
      return { success: true, messageId: data.request_id || `F2SMS_${Date.now()}` };
    }
    throw new Error(data?.message?.[0] || data?.message || "Fast2SMS gateway returned error");
  }

  // MSG91 Provider Integration
  if (provider === "msg91") {
    const response = await fetch("https://control.msg91.com/api/v5/flow/", {
      method: "POST",
      headers: {
        "authkey": apiKey,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        template_id: dltTemplateId,
        sender: senderId,
        recipients: [{ mobiles: `91${phone}`, message }]
      })
    });

    const data = await response.json();
    if (data && (data.type === "success" || data.status === "success")) {
      return { success: true, messageId: data.request_id || `MSG91_${Date.now()}` };
    }
    throw new Error(data?.message || "MSG91 gateway returned error");
  }

  // Generic REST Webhook/Gateway
  if (provider === "custom" || provider === "generic") {
    const customEndpoint = process.env.SMS_CUSTOM_ENDPOINT;
    if (!customEndpoint) {
      throw new Error("SMS_CUSTOM_ENDPOINT is not configured for generic provider");
    }

    const response = await fetch(customEndpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ phone, message, senderId, dltTemplateId })
    });

    const data = await response.json();
    if (response.ok && data?.success !== false) {
      return { success: true, messageId: data?.messageId || data?.id || `CUSTOM_${Date.now()}` };
    }
    throw new Error(data?.message || `Custom SMS provider error (${response.status})`);
  }

  throw new Error(`Unsupported SMS provider '${provider}' or missing credentials.`);
}

/**
 * Send Automatic Customer Payment Confirmation SMS
 *
 * Strict Guarantees:
 * - Triggered ONLY after authoritative server-side payment verification (Order.paymentStatus === 'Paid')
 * - Idempotent: Uses atomic MongoDB check-and-set to prevent duplicate SMS delivery
 * - Asynchronous & Non-blocking: SMS provider latency/errors never roll back or fail payment
 */
export async function sendPaymentSuccessSms({ orderId, forceRetry = false }) {
  try {
    if (!isDbConnected()) {
      console.warn("⚠️ Database disconnected; SMS dispatch deferred for Order:", orderId);
      return { success: false, status: "DEFERRED", reason: "Database unavailable" };
    }

    if (!orderId) {
      return { success: false, status: "SKIPPED", reason: "Missing order ID" };
    }

    // Retrieve order record
    const order = await Order.findOne({
      $or: [{ id: orderId }, { orderId }, { orderNumber: orderId }]
    });

    if (!order) {
      console.warn(`⚠️ Order '${orderId}' not found for payment SMS dispatch.`);
      return { success: false, status: "SKIPPED", reason: "Order not found" };
    }

    // Strict Payment Status Check
    if (order.paymentStatus !== "Paid") {
      console.warn(`⚠️ Cannot send payment SMS for Order '${orderId}': payment status is '${order.paymentStatus}' (expected 'Paid').`);
      return { success: false, status: "SKIPPED", reason: `Order payment status is ${order.paymentStatus}` };
    }

    // Atomic Idempotency Check & Lock
    // Check if SMS was already sent, skipped, or is currently processing
    if (!forceRetry && (order.paymentSuccessSmsStatus === "SENT" || order.paymentSuccessSmsStatus === "PROCESSING" || order.paymentSuccessSmsStatus === "SKIPPED")) {
      return {
        success: true,
        status: "ALREADY_PROCESSED",
        message: `Payment SMS already ${order.paymentSuccessSmsStatus.toLowerCase()} for Order '${orderId}'`
      };
    }

    // Acquire atomic dispatch lock on Order
    const lockedOrder = await Order.findOneAndUpdate(
      {
        _id: order._id,
        paymentStatus: "Paid",
        ...(forceRetry ? {} : { paymentSuccessSmsStatus: { $nin: ["SENT", "PROCESSING", "SKIPPED"] } })
      },
      {
        $set: {
          paymentSuccessSmsStatus: "PROCESSING",
          paymentSuccessSmsAttemptedAt: new Date()
        }
      },
      { returnDocument: "after" }
    );

    if (!lockedOrder && !forceRetry) {
      return {
        success: true,
        status: "ALREADY_PROCESSED",
        message: `Concurrent SMS dispatch lock active for Order '${orderId}'`
      };
    }

    // Extract & normalize customer phone number
    const rawPhone = order.phone || order.customerPhone || order.shippingAddress?.phone || "";
    const cleanPhone = normalizeIndianPhone(rawPhone);

    if (!cleanPhone) {
      console.warn(`⚠️ Invalid or missing phone number ('${rawPhone}') for Order '${orderId}'. Skipping SMS.`);
      await Order.updateOne(
        { _id: order._id },
        {
          $set: {
            paymentSuccessSmsStatus: "SKIPPED",
            paymentSuccessSmsError: "Invalid or missing customer mobile number",
            paymentSuccessSmsSentAt: null
          }
        }
      );
      return { success: false, status: "SKIPPED", reason: "Invalid or missing customer mobile number" };
    }

    const message = formatOrderSuccessSmsMessage(order);
    const smsConfig = getSmsConfig();

    if (!smsConfig.isConfigured) {
      console.warn(`ℹ️ SMS Gateway is unconfigured. SMS recorded as SKIPPED for Order '${orderId}'. To enable real SMS delivery, configure SMS_PROVIDER & SMS_API_KEY.`);
      await Order.updateOne(
        { _id: order._id },
        {
          $set: {
            paymentSuccessSmsStatus: "SKIPPED",
            paymentSuccessSmsError: "SMS Gateway unconfigured (Missing SMS_PROVIDER / SMS_API_KEY in environment)",
            paymentSuccessSmsMessage: message,
            paymentSuccessSmsNormalizedPhone: cleanPhone
          }
        }
      );
      return {
        success: false,
        status: "SKIPPED",
        message: "SMS Gateway unconfigured",
        smsPayload: { phone: cleanPhone, message }
      };
    }

    // Dispatch SMS via configured provider
    try {
      const dispatchResult = await dispatchSmsViaGateway({
        phone: cleanPhone,
        message,
        config: smsConfig
      });

      const messageId = dispatchResult.messageId || `SMS_${Date.now()}`;
      await Order.updateOne(
        { _id: order._id },
        {
          $set: {
            paymentSuccessSmsStatus: "SENT",
            paymentSuccessSmsSentAt: new Date(),
            paymentSuccessSmsMessageId: messageId,
            paymentSuccessSmsError: "",
            paymentSuccessSmsMessage: message,
            paymentSuccessSmsNormalizedPhone: cleanPhone
          }
        }
      );

      return {
        success: true,
        status: "SENT",
        messageId,
        phone: cleanPhone,
        message
      };
    } catch (gatewayErr) {
      const errorMsg = gatewayErr.message || "SMS Gateway delivery failure";
      console.error(`❌ Payment SMS dispatch failed for Order '${orderId}':`, errorMsg);

      await Order.updateOne(
        { _id: order._id },
        {
          $set: {
            paymentSuccessSmsStatus: "FAILED",
            paymentSuccessSmsError: errorMsg,
            paymentSuccessSmsMessage: message,
            paymentSuccessSmsNormalizedPhone: cleanPhone
          }
        }
      );

      // Return failure status WITHOUT raising an exception
      return {
        success: false,
        status: "FAILED",
        error: errorMsg,
        phone: cleanPhone
      };
    }
  } catch (err) {
    console.error("Critical error in sendPaymentSuccessSms:", err?.message || err);
    return {
      success: false,
      status: "ERROR",
      error: err.message || "Internal SMS service error"
    };
  }
}
