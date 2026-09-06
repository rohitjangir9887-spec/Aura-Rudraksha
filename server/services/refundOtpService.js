import crypto from "crypto";

// In-memory store for refund OTPs with automatic cleanup
// Key: `${orderId}_${adminEmail}`
const otpStore = new Map();

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes validity
const MAX_FAILED_ATTEMPTS = 3;

function hashOtp(otp) {
  return crypto.createHash("sha256").update(String(otp).trim()).digest("hex");
}

/**
 * Generate a cryptographically secure 6-digit numeric OTP and store it
 */
export function generateRefundOtp({ orderId, adminEmail, amount, reason }) {
  const cleanOrderId = String(orderId).trim();
  const cleanEmail = String(adminEmail).trim().toLowerCase();
  
  // Cryptographically secure 6-digit number between 100000 and 999999
  const otpNumber = crypto.randomInt(100000, 1000000).toString();
  const otpHash = hashOtp(otpNumber);
  const now = Date.now();
  const expiresAt = now + OTP_TTL_MS;

  const key = `${cleanOrderId}_${cleanEmail}`;
  otpStore.set(key, {
    orderId: cleanOrderId,
    adminEmail: cleanEmail,
    otpHash,
    amount: Number(amount),
    reason: reason || "",
    attempts: 0,
    expiresAt,
    createdAt: now
  });

  return {
    otp: otpNumber,
    expiresAt,
    expiresInSeconds: Math.floor(OTP_TTL_MS / 1000)
  };
}

/**
 * Verifies a submitted OTP for a given order and admin email
 */
export function verifyRefundOtp({ orderId, adminEmail, otp, amount }) {
  const cleanOrderId = String(orderId).trim();
  const cleanEmail = String(adminEmail).trim().toLowerCase();
  const key = `${cleanOrderId}_${cleanEmail}`;

  const record = otpStore.get(key);
  if (!record) {
    return {
      valid: false,
      message: "No active verification code found for this refund. Please request a new OTP to your Gmail."
    };
  }

  const now = Date.now();
  if (now > record.expiresAt) {
    otpStore.delete(key);
    return {
      valid: false,
      message: "The OTP has expired (5 minutes limit). Please request a fresh OTP on your Gmail."
    };
  }

  if (record.attempts >= MAX_FAILED_ATTEMPTS) {
    otpStore.delete(key);
    return {
      valid: false,
      message: "Maximum OTP attempts exceeded. For security, please request a new verification code."
    };
  }

  const submittedHash = hashOtp(otp);
  if (submittedHash !== record.otpHash) {
    record.attempts += 1;
    const remaining = MAX_FAILED_ATTEMPTS - record.attempts;
    return {
      valid: false,
      message: remaining > 0 
        ? `Incorrect OTP entered. ${remaining} attempt(s) remaining.` 
        : "Incorrect OTP. Maximum attempts exceeded. Please request a new OTP."
    };
  }

  // OTP is verified and correct -> consume it immediately (single-use)
  otpStore.delete(key);

  return {
    valid: true,
    message: "OTP successfully verified."
  };
}

/**
 * Periodically purge expired OTP entries from memory
 */
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of otpStore.entries()) {
    if (now > v.expiresAt) {
      otpStore.delete(k);
    }
  }
}, 60 * 1000);
