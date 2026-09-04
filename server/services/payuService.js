import crypto from "crypto";

/**
 * PayU India Hosted Checkout & Server API Service
 * 
 * Official PayU Documentation Standards:
 * - Payment Request Hash: sha512(key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5|udf6|udf7|udf8|udf9|udf10|SALT)
 * - Response Hash: sha512(SALT|status|udf10|udf9|udf8|udf7|udf6|udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key)
 * - With Additional Charges: sha512(additionalCharges|SALT|status|udf10|udf9|udf8|udf7|udf6|udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key)
 * - Verify Payment Command API: https://info.payu.in/merchant/postservice.php?form=2 (or test.payu.in)
 * - Refund Command API: https://info.payu.in/merchant/postservice.php?form=2 (or test.payu.in)
 */

export function getPayuConfig() {
  const key = (process.env.PAYU_MERCHANT_KEY || "").trim();
  const salt = (process.env.PAYU_MERCHANT_SALT || "").trim();
  const env = (process.env.PAYU_ENV || "prod").toLowerCase().trim();
  const isTest = env === "test" || env === "sandbox";

  // Strict separation of Test vs Production endpoints:
  // Production can NEVER connect to test.payu.in.
  // Test can NEVER connect to secure.payu.in.
  const prodPaymentUrl = "https://secure.payu.in/_payment";
  const testPaymentUrl = "https://test.payu.in/_payment";

  let paymentUrl = isTest ? testPaymentUrl : prodPaymentUrl;

  if (process.env.PAYU_PAYMENT_URL) {
    const customUrl = process.env.PAYU_PAYMENT_URL.trim();
    if (!isTest && customUrl === prodPaymentUrl) {
      paymentUrl = prodPaymentUrl;
    } else if (isTest && customUrl === testPaymentUrl) {
      paymentUrl = testPaymentUrl;
    }
  }

  const commandUrl = isTest
    ? "https://test.payu.in/merchant/postservice.php?form=2"
    : "https://info.payu.in/merchant/postservice.php?form=2";

  return {
    key,
    salt,
    isTest,
    env: isTest ? "test" : "prod",
    paymentUrl,
    commandUrl,
    isConfigured: Boolean(key && salt)
  };
}

/**
 * Sanitize strings for PayU hash generation to prevent pipe character injection
 */
function sanitizeHashParam(val) {
  if (val === undefined || val === null) return "";
  return String(val).replace(/\|/g, " ").replace(/[\r\n]+/g, " ").trim();
}

/**
 * Generates SHA-512 Payment Request Hash for PayU Hosted Checkout
 * Sequence: key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5|udf6|udf7|udf8|udf9|udf10|SALT
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
  udf6 = "",
  udf7 = "",
  udf8 = "",
  udf9 = "",
  udf10 = "",
  salt
}) {
  if (!key || !salt) {
    throw new Error("PayU Merchant Key and Salt are required for hash generation");
  }

  // Format amount strictly to 2 decimal places as required by PayU
  const formattedAmount = Number(amount).toFixed(2);
  const cleanTxnid = sanitizeHashParam(txnid);
  const cleanProductInfo = sanitizeHashParam(productinfo || "Aura Rudraksha Order");
  const cleanFirstName = sanitizeHashParam(firstname || "Devotee");
  const cleanEmail = sanitizeHashParam(email).toLowerCase();

  const u1 = sanitizeHashParam(udf1);
  const u2 = sanitizeHashParam(udf2);
  const u3 = sanitizeHashParam(udf3);
  const u4 = sanitizeHashParam(udf4);
  const u5 = sanitizeHashParam(udf5);
  const u6 = sanitizeHashParam(udf6);
  const u7 = sanitizeHashParam(udf7);
  const u8 = sanitizeHashParam(udf8);
  const u9 = sanitizeHashParam(udf9);
  const u10 = sanitizeHashParam(udf10);

  // 17 elements separated by 16 pipe delimiters
  const hashString = `${key}|${cleanTxnid}|${formattedAmount}|${cleanProductInfo}|${cleanFirstName}|${cleanEmail}|${u1}|${u2}|${u3}|${u4}|${u5}|${u6}|${u7}|${u8}|${u9}|${u10}|${salt}`;

  const hash = crypto.createHash("sha512").update(hashString).digest("hex").toLowerCase();
  return hash;
}

/**
 * Verifies the incoming response hash from PayU (Callback or Webhook)
 * Uses constant-time buffer comparison to prevent timing attacks.
 */
export function verifyPayuResponseHash(params, salt) {
  if (!salt) {
    return { valid: false, reason: "Missing merchant salt for verification" };
  }

  if (!params || typeof params !== "object") {
    return { valid: false, reason: "Invalid parameters received" };
  }

  const receivedHash = String(params.hash || "").trim().toLowerCase();
  if (!receivedHash || receivedHash.length !== 128) {
    return { valid: false, reason: "Invalid or missing SHA-512 hash in response" };
  }

  const key = sanitizeHashParam(params.key);
  const txnid = sanitizeHashParam(params.txnid);
  const rawAmount = sanitizeHashParam(params.amount);
  const cleanProductInfo = sanitizeHashParam(params.productinfo);
  const cleanFirstName = sanitizeHashParam(params.firstname);
  const cleanEmail = sanitizeHashParam(params.email);
  const cleanStatus = sanitizeHashParam(params.status);

  const u1 = sanitizeHashParam(params.udf1);
  const u2 = sanitizeHashParam(params.udf2);
  const u3 = sanitizeHashParam(params.udf3);
  const u4 = sanitizeHashParam(params.udf4);
  const u5 = sanitizeHashParam(params.udf5);
  const u6 = sanitizeHashParam(params.udf6);
  const u7 = sanitizeHashParam(params.udf7);
  const u8 = sanitizeHashParam(params.udf8);
  const u9 = sanitizeHashParam(params.udf9);
  const u10 = sanitizeHashParam(params.udf10);

  const formattedAmount = Number(params.amount || 0).toFixed(2);
  const amountCandidates = Array.from(new Set([rawAmount, formattedAmount])).filter(Boolean);

  const receivedBuf = Buffer.from(receivedHash, "hex");

  // Case 1: If additionalCharges was levied
  if (params.additionalCharges && String(params.additionalCharges).trim() !== "") {
    const rawCharges = sanitizeHashParam(params.additionalCharges);
    const formattedCharges = Number(params.additionalCharges).toFixed(2);
    const chargesCandidates = Array.from(new Set([rawCharges, formattedCharges])).filter(Boolean);

    for (const charges of chargesCandidates) {
      for (const amt of amountCandidates) {
        // Format: additionalCharges|SALT|status|udf10|udf9|udf8|udf7|udf6|udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key
        const hashStr = `${charges}|${salt}|${cleanStatus}|${u10}|${u9}|${u8}|${u7}|${u6}|${u5}|${u4}|${u3}|${u2}|${u1}|${cleanEmail}|${cleanFirstName}|${cleanProductInfo}|${amt}|${txnid}|${key}`;
        const calcHash = crypto.createHash("sha512").update(hashStr).digest("hex").toLowerCase();
        const calcBuf = Buffer.from(calcHash, "hex");

        if (calcBuf.length === receivedBuf.length && crypto.timingSafeEqual(calcBuf, receivedBuf)) {
          return { valid: true, withAdditionalCharges: true };
        }
      }
    }
  }

  // Case 2: Standard reverse hash
  // Format: SALT|status|udf10|udf9|udf8|udf7|udf6|udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key
  for (const amt of amountCandidates) {
    const standardHashStr = `${salt}|${cleanStatus}|${u10}|${u9}|${u8}|${u7}|${u6}|${u5}|${u4}|${u3}|${u2}|${u1}|${cleanEmail}|${cleanFirstName}|${cleanProductInfo}|${amt}|${txnid}|${key}`;
    const calculatedStandardHash = crypto.createHash("sha512").update(standardHashStr).digest("hex").toLowerCase();
    const standardBuf = Buffer.from(calculatedStandardHash, "hex");

    if (standardBuf.length === receivedBuf.length && crypto.timingSafeEqual(standardBuf, receivedBuf)) {
      return { valid: true, withAdditionalCharges: false };
    }
  }

  return { 
    valid: false, 
    reason: "Hash mismatch: response integrity check failed"
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
    return { success: false, isPaid: false, message: "PayU credentials not configured" };
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
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(commandUrl, {
      method: "POST",
      body: postData,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    const rawText = await response.text();
    let data;
    try {
      data = JSON.parse(rawText);
    } catch (_) {
      return {
        success: false,
        isPaid: false,
        message: "Invalid non-JSON response from PayU verification server"
      };
    }

    if (data && (data.status === 1 || data.status === "1" || data.status === "success") && data.transaction_details && data.transaction_details[txnid]) {
      const txn = data.transaction_details[txnid];
      const txnStatus = (txn.status || txn.transaction_status || "").toLowerCase();
      const unmappedStatus = (txn.unmappedstatus || "").toLowerCase();
      const isPaid = txnStatus === "success" || unmappedStatus === "captured";
      
      return {
        success: true,
        isPaid,
        status: txnStatus,
        unmappedStatus,
        txnDetails: txn,
        mihpayid: txn.mihpayid,
        bankRefNum: txn.bank_ref_num,
        amount: Number(txn.amt || txn.amount || txn.transaction_amount || 0),
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
    console.error("Error executing PayU verify_payment API:", err?.message || err);
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
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  const response = await fetch(commandUrl, {
    method: "POST",
    body: postData,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    signal: controller.signal
  });
  clearTimeout(timeoutId);

  const rawText = await response.text();
  let data;
  try {
    data = JSON.parse(rawText);
  } catch (_) {
    throw new Error("Invalid response received from PayU refund server");
  }

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
