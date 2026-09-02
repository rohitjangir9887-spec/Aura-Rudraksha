import crypto from "crypto";

/**
 * PayU India Hosted Checkout & Server API Service
 * 
 * Production PayU Documentation Standards:
 * - Payment Initiation Hash: sha512(key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||SALT)
 * - Response Hash: sha512(SALT|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key)
 * - With Additional Charges: sha512(additionalCharges|SALT|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key)
 * - Command API (Verify Payment / Refund): https://info.payu.in/merchant/postservice?form=2 (or test)
 */

export function getPayuConfig() {
  const key = process.env.PAYU_MERCHANT_KEY || "";
  const salt = process.env.PAYU_MERCHANT_SALT || "";
  const env = (process.env.PAYU_ENV || "prod").toLowerCase();
  const isTest = env === "test" || env === "sandbox";

  const paymentUrl = process.env.PAYU_PAYMENT_URL || (isTest 
    ? "https://test.payu.in/_payment" 
    : "https://secure.payu.in/_payment"
  );

  const commandUrl = isTest
    ? "https://test.payu.in/merchant/postservice?form=2"
    : "https://info.payu.in/merchant/postservice.php?form=2";

  return {
    key,
    salt,
    isTest,
    paymentUrl,
    commandUrl,
    isConfigured: Boolean(key && salt)
  };
}

/**
 * Generates SHA-512 Payment Request Hash for PayU Hosted Checkout
 */
export function generatePayuPaymentHash({
  key,
  txnid,
  amount,
  productinfo,
  firstname,
  email,
  udf1 = "",
  udf2 = "",
  udf3 = "",
  udf4 = "",
  udf5 = "",
  salt
}) {
  if (!key || !salt) {
    throw new Error("PayU Merchant Key and Salt are required for hash generation");
  }

  // Format amount to 2 decimal places for consistent hashing
  const formattedAmount = Number(amount).toFixed(2);
  const cleanProductInfo = String(productinfo || "Aura Rudraksha Order").trim();
  const cleanFirstName = String(firstname || "Devotee").trim();
  const cleanEmail = String(email || "").trim().toLowerCase();

  // Sequence: key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||salt
  const hashString = `${key}|${txnid}|${formattedAmount}|${cleanProductInfo}|${cleanFirstName}|${cleanEmail}|${udf1}|${udf2}|${udf3}|${udf4}|${udf5}||||||${salt}`;

  const hash = crypto.createHash("sha512").update(hashString).digest("hex").toLowerCase();
  return hash;
}

/**
 * Verifies the incoming response hash from PayU (Callback or Webhook)
 */
export function verifyPayuResponseHash(params, salt) {
  if (!salt) {
    return { valid: false, reason: "Missing merchant salt for verification" };
  }

  const {
    key,
    txnid,
    amount,
    productinfo,
    firstname,
    email,
    status,
    udf1 = "",
    udf2 = "",
    udf3 = "",
    udf4 = "",
    udf5 = "",
    additionalCharges,
    hash: receivedHash
  } = params;

  if (!receivedHash) {
    return { valid: false, reason: "No hash received in PayU response" };
  }

  const cleanProductInfo = String(productinfo || "").trim();
  const cleanFirstName = String(firstname || "").trim();
  const cleanEmail = String(email || "").trim();
  const cleanStatus = String(status || "").trim();

  // Case 1: If additionalCharges was levied
  if (additionalCharges && String(additionalCharges).trim() !== "") {
    const formattedCharges = Number(additionalCharges).toFixed(2);
    const hashStringWithCharges = `${formattedCharges}|${salt}|${cleanStatus}||||||${udf5}|${udf4}|${udf3}|${udf2}|${udf1}|${cleanEmail}|${cleanFirstName}|${cleanProductInfo}|${amount}|${txnid}|${key}`;
    const calculatedHash = crypto.createHash("sha512").update(hashStringWithCharges).digest("hex").toLowerCase();
    
    if (calculatedHash === receivedHash.toLowerCase()) {
      return { valid: true, withAdditionalCharges: true };
    }
  }

  // Case 2: Standard reverse hash
  // Sequence: salt|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key
  const standardHashString = `${salt}|${cleanStatus}||||||${udf5}|${udf4}|${udf3}|${udf2}|${udf1}|${cleanEmail}|${cleanFirstName}|${cleanProductInfo}|${amount}|${txnid}|${key}`;
  const calculatedStandardHash = crypto.createHash("sha512").update(standardHashString).digest("hex").toLowerCase();

  if (calculatedStandardHash === receivedHash.toLowerCase()) {
    return { valid: true, withAdditionalCharges: false };
  }

  return { 
    valid: false, 
    reason: "Hash mismatch: response integrity check failed",
    calculatedHash: calculatedStandardHash,
    receivedHash: receivedHash.toLowerCase()
  };
}

/**
 * PayU Server-to-Server Payment Verification API (verify_payment command)
 * Crucial for confirming authenticity before marking an order as PAID
 */
export async function verifyPayuPaymentServerSide(txnid) {
  const { key, salt, commandUrl, isConfigured } = getPayuConfig();

  if (!isConfigured) {
    console.warn("⚠️ PayU credentials not configured; server-side API call skipped");
    return { success: false, message: "PayU credentials not configured" };
  }

  try {
    // Hash sequence for verify_payment command: sha512(key|verify_payment|var1|salt)
    const command = "verify_payment";
    const var1 = String(txnid).trim();
    const hashString = `${key}|${command}|${var1}|${salt}`;
    const hash = crypto.createHash("sha512").update(hashString).digest("hex").toLowerCase();

    const postData = new URLSearchParams();
    postData.append("key", key);
    postData.append("command", command);
    postData.append("var1", var1);
    postData.append("hash", hash);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(commandUrl, {
      method: "POST",
      body: postData,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    const data = await response.json();

    if (data && data.status === 1 && data.transaction_details && data.transaction_details[txnid]) {
      const txn = data.transaction_details[txnid];
      const isPaid = txn.status === "success";
      
      return {
        success: true,
        isPaid,
        status: txn.status,
        txnDetails: txn,
        mihpayid: txn.mihpayid,
        bankRefNum: txn.bank_ref_num,
        amount: Number(txn.amt || txn.amount || 0),
        mode: txn.mode,
        rawResponse: data
      };
    }

    return {
      success: false,
      isPaid: false,
      message: data?.msg || data?.message || "Transaction not found or unverified in PayU",
      rawResponse: data
    };
  } catch (err) {
    console.error("Error executing PayU verify_payment API:", err);
    return {
      success: false,
      isPaid: false,
      message: err.message || "Failed to connect to PayU verification server"
    };
  }
}

/**
 * PayU Refund API (cancel_refund_transaction command)
 * Allows Admin to issue full or partial refunds directly via PayU API
 */
export async function refundPayuTransaction({ mihpayid, txnid, amount, token }) {
  const { key, salt, commandUrl, isConfigured } = getPayuConfig();

  if (!isConfigured) {
    throw new Error("PayU Merchant Key and Salt must be configured in environment variables to issue live refunds.");
  }

  const refundToken = token || `REF_${Date.now()}_${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
  const refundAmount = Number(amount).toFixed(2);
  const payuId = String(mihpayid || txnid).trim();

  // Command hash sequence: sha512(key|cancel_refund_transaction|var1|salt)
  const command = "cancel_refund_transaction";
  const hashString = `${key}|${command}|${payuId}|${salt}`;
  const hash = crypto.createHash("sha512").update(hashString).digest("hex").toLowerCase();

  const postData = new URLSearchParams();
  postData.append("key", key);
  postData.append("command", command);
  postData.append("var1", payuId);
  postData.append("var2", refundToken);
  postData.append("var3", refundAmount);
  postData.append("hash", hash);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  const response = await fetch(commandUrl, {
    method: "POST",
    body: postData,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    signal: controller.signal
  });
  clearTimeout(timeoutId);

  const data = await response.json();

  if (data && (data.status === 1 || data.status === "1" || data.status === "success")) {
    return {
      success: true,
      refundId: data.request_id || refundToken,
      refundToken,
      amount: Number(refundAmount),
      status: "Initiated",
      message: data.msg || "Refund initiated successfully with PayU",
      rawResponse: data
    };
  }

  throw new Error(data?.msg || data?.message || "PayU Refund API request failed");
}
