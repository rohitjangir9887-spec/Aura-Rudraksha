import { load } from "@cashfreepayments/cashfree-js";
import { authClient } from "./authClient";

let cashfreeInstance = null;
let currentMode = null;

/**
 * Loads and initializes the Cashfree JS SDK for the browser.
 * Uses Cashfree's official @cashfreepayments/cashfree-js package.
 * Supported modes: "production" (default) or "sandbox".
 */
export async function getCashfreeInstance(mode = "production") {
  const targetMode = String(mode).toLowerCase() === "sandbox" ? "sandbox" : "production";

  if (cashfreeInstance && currentMode === targetMode) {
    return cashfreeInstance;
  }

  try {
    cashfreeInstance = await load({
      mode: targetMode
    });
    currentMode = targetMode;
    return cashfreeInstance;
  } catch (err) {
    console.error("Failed to load Cashfree JS SDK:", err);
    throw new Error("Could not initialize Cashfree secure payment interface. Please check your internet connection.");
  }
}

/**
 * Initiates the Cashfree Payment checkout flow in the browser.
 * Opens Cashfree Payment Gateway interface (Cards, UPI, Netbanking, Wallets).
 */
export async function openCashfreeCheckout({ paymentSessionId, mode = "production", redirectTarget = "_self" }) {
  if (!paymentSessionId) {
    throw new Error("Missing payment_session_id required to launch Cashfree checkout.");
  }

  const cashfree = await getCashfreeInstance(mode);

  const checkoutOptions = {
    paymentSessionId,
    redirectTarget // "_self" or "_modal" or "_blank"
  };

  return cashfree.checkout(checkoutOptions);
}

/**
 * Calls backend API to create a server-verified Cashfree payment session.
 * Does NOT generate tokens or secrets on the client.
 */
export async function createCashfreeCheckoutSession({ lines, shippingAddress, couponCode, notes, source = "website" }) {
  const authHeader = authClient.getAuthHeader();
  if (!authHeader) {
    throw new Error("Please log in to proceed with secure checkout.");
  }

  const response = await fetch("/api/payments/cashfree/create-order", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader
    },
    body: JSON.stringify({
      lines,
      shippingAddress,
      couponCode: couponCode || "",
      notes: notes || "",
      source
    })
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to create payment session with Cashfree.");
  }

  return data;
}

/**
 * Verifies payment status on the server.
 * The server queries Cashfree directly.
 */
export async function verifyCashfreePaymentStatus(orderId) {
  if (!orderId) {
    throw new Error("orderId is required to verify payment status.");
  }

  const authHeader = authClient.getAuthHeader();
  const headers = {
    "Content-Type": "application/json"
  };
  if (authHeader) {
    headers.Authorization = authHeader;
  }

  const response = await fetch(`/api/payments/cashfree/status/${encodeURIComponent(orderId)}`, {
    method: "GET",
    headers
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Could not verify payment status with server.");
  }

  return data;
}
