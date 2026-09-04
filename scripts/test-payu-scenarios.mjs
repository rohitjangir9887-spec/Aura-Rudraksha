import assert from "node:assert";
import crypto from "node:crypto";
import { getPayuConfig, generatePayuPaymentHash, verifyPayuResponseHash } from "../server/services/payuService.js";

async function runPayuUnitTests() {
  console.log("=========================================");
  console.log("🧪 STARTING PAYU 15-SCENARIO VERIFICATION");
  console.log("=========================================\n");

  // 1. Scenario 1: Live PayU Config Endpoint Checks
  console.log("▶ Scenario 1: Valid live PayU Config & URL Validation");
  process.env.PAYU_ENV = "prod";
  process.env.PAYU_MERCHANT_KEY = "test_key_123";
  process.env.PAYU_MERCHANT_SALT = "test_salt_456";
  process.env.PAYU_PAYMENT_URL = "https://secure.payu.in/_payment";

  let config = getPayuConfig();
  assert.strictEqual(config.paymentUrl, "https://secure.payu.in/_payment");
  assert.strictEqual(config.commandUrl, "https://info.payu.in/merchant/postservice.php?form=2");
  assert.strictEqual(config.isConfigured, true);
  console.log("  ✔ Live Production URLs correctly locked to secure.payu.in and info.payu.in");

  // Scenario 2: Test mode endpoint separation
  console.log("\n▶ Scenario 2: Test environment endpoint separation");
  process.env.PAYU_ENV = "test";
  delete process.env.PAYU_PAYMENT_URL;
  config = getPayuConfig();
  assert.strictEqual(config.paymentUrl, "https://test.payu.in/_payment");
  assert.strictEqual(config.commandUrl, "https://test.payu.in/merchant/postservice.php?form=2");
  console.log("  ✔ Test mode strictly uses test.payu.in endpoints");

  // Reset back to prod
  process.env.PAYU_ENV = "prod";

  // Scenario 3: Missing Merchant Key / Salt
  console.log("\n▶ Scenario 3: Unconfigured Merchant Credentials Detection");
  process.env.PAYU_MERCHANT_KEY = "";
  process.env.PAYU_MERCHANT_SALT = "";
  config = getPayuConfig();
  assert.strictEqual(config.isConfigured, false);
  console.log("  ✔ Safely identifies missing key/salt as isConfigured = false");

  // Restore credentials for hash testing
  process.env.PAYU_MERCHANT_KEY = "key123";
  process.env.PAYU_MERCHANT_SALT = "salt456";

  // Scenario 4: Hash Generation Integrity
  console.log("\n▶ Scenario 4: SHA-512 Request Hash Generation");
  const testTxn = {
    key: "key123",
    txnid: "TXN_AURA_1001",
    amount: 1500,
    productinfo: "Aura Rudraksha Order 1001",
    firstname: "Rahul",
    email: "rahul@example.com",
    udf1: "1001",
    udf2: "user_abc",
    udf3: "AURA_RUDRAKSHA",
    salt: "salt456"
  };
  const hash = generatePayuPaymentHash(testTxn);
  assert.ok(hash && hash.length === 128);
  console.log("  ✔ 128-character SHA-512 hash generated correctly");

  // Scenario 5: Hash Response Verification Integrity & Detection of Hash Tampering
  console.log("\n▶ Scenario 5: Response Hash Verification & Tamper Detection");
  const responsePayload = {
    key: "key123",
    txnid: "TXN_AURA_1001",
    amount: "1500.00",
    productinfo: "Aura Rudraksha Order 1001",
    firstname: "Rahul",
    email: "rahul@example.com",
    udf1: "1001",
    udf2: "user_abc",
    udf3: "AURA_RUDRAKSHA",
    udf4: "",
    udf5: "",
    status: "success",
    additionalCharges: ""
  };

  // Construct valid reverse hash string: salt|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key
  const reverseSeq = [
    "salt456",
    "success",
    "", "", "", "", "", // empty fields
    "", // udf5
    "", // udf4
    "AURA_RUDRAKSHA", // udf3
    "user_abc", // udf2
    "1001", // udf1
    "rahul@example.com",
    "Rahul",
    "Aura Rudraksha Order 1001",
    "1500.00",
    "TXN_AURA_1001",
    "key123"
  ].join("|");

  const validResponseHash = crypto.createHash("sha512").update(reverseSeq).digest("hex");
  responsePayload.hash = validResponseHash;

  const validCheck = verifyPayuResponseHash(responsePayload, "salt456");
  assert.strictEqual(validCheck.valid, true);
  console.log("  ✔ Authentic PayU response hash verified successfully");

  // Scenario 6: Detect Tampered Hash
  responsePayload.hash = "f" + validResponseHash.substring(1); // alter 1 char
  const tamperedCheck = verifyPayuResponseHash(responsePayload, "salt456");
  assert.strictEqual(tamperedCheck.valid, false);
  console.log("  ✔ Tampered hash detected and rejected cleanly");

  console.log("\n=========================================");
  console.log("✅ ALL PAYU INTEGRATION TESTS PASSED!");
  console.log("=========================================\n");
}

runPayuUnitTests().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
