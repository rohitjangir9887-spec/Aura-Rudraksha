import { Cashfree, CFEnvironment } from "cashfree-pg";
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

/**
 * Validates and initializes the Cashfree Node SDK instance.
 * Strictly adheres to server-side only secrets and production separation.
 */
export function getCashfreeClient() {
  const clientId = (process.env.CASHFREE_CLIENT_ID || "").trim();
  const clientSecret = (process.env.CASHFREE_CLIENT_SECRET || "").trim();
  const envSetting = (process.env.CASHFREE_ENVIRONMENT || "PRODUCTION").trim().toUpperCase();
  const apiVersion = (process.env.CASHFREE_API_VERSION || "2023-08-01").trim();

  if (!clientId || !clientSecret) {
    throw new Error(
      "Cashfree server configuration error: CASHFREE_CLIENT_ID and CASHFREE_CLIENT_SECRET environment variables must be provided on the backend server."
    );
  }

  // Strict environment separation: Only allow SANDBOX if explicitly set
  const environment = envSetting === "SANDBOX" ? CFEnvironment.SANDBOX : CFEnvironment.PRODUCTION;

  const cashfree = new Cashfree(environment, clientId, clientSecret);
  if (apiVersion) {
    cashfree.XApiVersion = apiVersion;
  }

  return {
    cashfree,
    environment: envSetting === "SANDBOX" ? "sandbox" : "production",
    clientId,
    clientSecret,
    apiVersion
  };
}

/**
 * Creates a Cashfree order and returns the payment_session_id.
 */
export async function createCashfreeOrder({
  orderId,
  orderAmount,
  customerId,
  customerPhone,
  customerEmail,
  customerName,
  returnUrl,
  notifyUrl
}) {
  const { cashfree, environment } = getCashfreeClient();

  // Cashfree requires amount formatted as number or 2 decimal places
  const amount = Number(Number(orderAmount).toFixed(2));
  if (isNaN(amount) || amount <= 0) {
    throw new Error("Invalid order amount for payment creation.");
  }

  // Format customer phone (Cashfree requires 10-digit number)
  let cleanPhone = String(customerPhone || "").replace(/\D/g, "");
  if (cleanPhone.length > 10 && cleanPhone.startsWith("91")) {
    cleanPhone = cleanPhone.slice(2);
  }
  if (cleanPhone.length < 10) {
    cleanPhone = "9999999999"; // fallback valid 10-digit phone format if missing
  }

  // Format customer ID (alphanumeric and safe characters)
  const cleanCustomerId = String(customerId || "CUST_" + Date.now()).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 50);

  // Cashfree Order Request payload
  const createOrderRequest = {
    order_id: String(orderId),
    order_amount: amount,
    order_currency: "INR",
    customer_details: {
      customer_id: cleanCustomerId,
      customer_name: String(customerName || "Aura Customer").slice(0, 100),
      customer_email: String(customerEmail || "customer@aurarudraksha.com").trim().toLowerCase(),
      customer_phone: cleanPhone.slice(-10)
    },
    order_meta: {
      return_url: returnUrl || undefined,
      notify_url: notifyUrl || undefined,
      payment_methods: "cc,dc,upi,nb,wallet"
    },
    order_note: `Aura Rudraksha Sacred Order #${orderId}`
  };

  const response = await cashfree.PGCreateOrder(createOrderRequest);
  const data = response?.data || response;

  if (!data || !data.payment_session_id) {
    throw new Error("Failed to obtain payment_session_id from Cashfree.");
  }

  return {
    cashfreeOrderId: data.order_id || orderId,
    cfOrderId: data.cf_order_id,
    paymentSessionId: data.payment_session_id,
    orderStatus: data.order_status,
    environment,
    orderAmount: data.order_amount || amount,
    orderCurrency: data.order_currency || "INR"
  };
}

/**
 * Fetches order details directly from Cashfree API.
 */
export async function fetchCashfreeOrder(orderId) {
  const { cashfree } = getCashfreeClient();
  const response = await cashfree.PGFetchOrder(String(orderId));
  return response?.data || response;
}

/**
 * Fetches all payment attempts and their statuses for an order from Cashfree API.
 */
export async function fetchCashfreePayments(orderId) {
  const { cashfree } = getCashfreeClient();
  const response = await cashfree.PGOrderFetchPayments(String(orderId));
  return response?.data || response || [];
}

/**
 * Verifies the Cashfree webhook signature using raw body and secret.
 */
export function verifyCashfreeWebhookSignature({ signature, rawBody, timestamp }) {
  if (!signature || !rawBody || !timestamp) {
    return false;
  }

  const webhookSecret = (process.env.CASHFREE_WEBHOOK_SECRET || process.env.CASHFREE_CLIENT_SECRET || "").trim();
  if (!webhookSecret) {
    console.error("Cashfree Webhook Verification Error: CASHFREE_WEBHOOK_SECRET or CASHFREE_CLIENT_SECRET is missing.");
    return false;
  }

  try {
    const payload = `${timestamp}${rawBody}`;
    const generatedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(payload)
      .digest("base64");

    // Constant-time string comparison to prevent timing attacks
    const sigBuffer = Buffer.from(signature);
    const genBuffer = Buffer.from(generatedSignature);

    if (sigBuffer.length !== genBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(sigBuffer, genBuffer);
  } catch (err) {
    console.error("Error verifying Cashfree webhook signature:", err);
    return false;
  }
}
