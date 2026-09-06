import assert from "node:assert";
import crypto from "node:crypto";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { Order } from "../server/models/Order.js";
import { PaymentTransaction } from "../server/models/PaymentTransaction.js";
import { normalizeIndianPhone, formatOrderSuccessSmsMessage, sendPaymentSuccessSms } from "../server/services/smsService.js";
import { verifyPayuResponseHash } from "../server/services/payuService.js";
import { sanitizePaymentDetails } from "../server/controllers/paymentController.js";

let mongod;

async function setupDb() {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);
}

async function teardownDb() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongod) {
    await mongod.stop();
  }
}

async function runSmsPayuTests() {
  console.log("=========================================");
  console.log("🧪 STARTING PAYU SMS 14-SCENARIO SUITE");
  console.log("=========================================\n");

  await setupDb();

  // Test 1: Phone Normalization Utility
  console.log("▶ Test 1: Indian Phone Number Normalization");
  assert.strictEqual(normalizeIndianPhone("+919876543210"), "9876543210");
  assert.strictEqual(normalizeIndianPhone("09876543210"), "9876543210");
  assert.strictEqual(normalizeIndianPhone("919876543210"), "9876543210");
  assert.strictEqual(normalizeIndianPhone("9876543210"), "9876543210");
  assert.strictEqual(normalizeIndianPhone("+91 98765 43210"), "9876543210");
  assert.strictEqual(normalizeIndianPhone("12345"), null);
  assert.strictEqual(normalizeIndianPhone("abcdefghij"), null);
  assert.strictEqual(normalizeIndianPhone(""), null);
  console.log("  ✔ Indian mobile numbers correctly normalized and validated");

  // Test 2: Message Formatting
  console.log("\n▶ Test 2: Order Confirmation SMS Message Formatting");
  const sampleOrder = { orderNumber: "AURA-260904-001", finalAmount: 1250 };
  const formattedMsg = formatOrderSuccessSmsMessage(sampleOrder);
  assert.ok(formattedMsg.includes("Aura Rudraksha:"));
  assert.ok(formattedMsg.includes("#AURA-260904-001"));
  assert.ok(formattedMsg.includes("Rs 1250"));
  console.log("  ✔ SMS message formatted cleanly with order ID and amount");

  // Test 3: Verified PayU Payment -> Customer SMS Triggered
  console.log("\n▶ Test 3: Verified PayU Payment -> SMS Triggered");
  const paidOrder = await Order.create({
    id: "AURA-TEST-001",
    orderId: "AURA-TEST-001",
    orderNumber: "AURA-TEST-001",
    authUserId: "user_test_1",
    customerPhone: "9876543210",
    phone: "9876543210",
    finalAmount: 2100,
    paymentStatus: "Paid",
    orderStatus: "Confirmed",
    status: "Confirmed",
    txnid: "TXN_AURA_TEST_001"
  });

  const smsRes1 = await sendPaymentSuccessSms({ orderId: "AURA-TEST-001" });
  assert.ok(smsRes1.status === "SENT" || smsRes1.status === "SKIPPED");

  const updatedOrder1 = await Order.findById(paidOrder._id);
  assert.ok(["SENT", "SKIPPED"].includes(updatedOrder1.paymentSuccessSmsStatus));
  console.log("  ✔ Verified Paid order triggers SMS attempt cleanly");

  // Test 4: Pending Payment -> No Success SMS
  console.log("\n▶ Test 4: Pending Payment -> No Success SMS");
  const pendingOrder = await Order.create({
    id: "AURA-PENDING-001",
    orderId: "AURA-PENDING-001",
    orderNumber: "AURA-PENDING-001",
    authUserId: "user_test_2",
    customerPhone: "9876543210",
    finalAmount: 1500,
    paymentStatus: "Pending",
    orderStatus: "Pending",
    txnid: "TXN_AURA_PENDING_001"
  });

  const smsResPending = await sendPaymentSuccessSms({ orderId: "AURA-PENDING-001" });
  assert.strictEqual(smsResPending.status, "SKIPPED");
  assert.strictEqual(smsResPending.reason, "Order payment status is Pending");
  console.log("  ✔ Pending payment order safely skips success SMS");

  // Test 5: Failed Payment -> No Success SMS
  console.log("\n▶ Test 5: Failed Payment -> No Success SMS");
  const failedOrder = await Order.create({
    id: "AURA-FAILED-001",
    orderId: "AURA-FAILED-001",
    orderNumber: "AURA-FAILED-001",
    authUserId: "user_test_3",
    customerPhone: "9876543210",
    finalAmount: 1500,
    paymentStatus: "Failed",
    orderStatus: "Pending",
    txnid: "TXN_AURA_FAILED_001"
  });

  const smsResFailed = await sendPaymentSuccessSms({ orderId: "AURA-FAILED-001" });
  assert.strictEqual(smsResFailed.status, "SKIPPED");
  assert.strictEqual(smsResFailed.reason, "Order payment status is Failed");
  console.log("  ✔ Failed payment order safely skips success SMS");

  // Test 6: Cancelled Payment -> No Success SMS
  console.log("\n▶ Test 6: Cancelled Payment -> No Success SMS");
  const cancelledOrder = await Order.create({
    id: "AURA-CANCEL-001",
    orderId: "AURA-CANCEL-001",
    orderNumber: "AURA-CANCEL-001",
    authUserId: "user_test_4",
    customerPhone: "9876543210",
    finalAmount: 1500,
    paymentStatus: "Cancelled",
    orderStatus: "Cancelled",
    txnid: "TXN_AURA_CANCEL_001"
  });

  const smsResCancel = await sendPaymentSuccessSms({ orderId: "AURA-CANCEL-001" });
  assert.strictEqual(smsResCancel.status, "SKIPPED");
  assert.strictEqual(smsResCancel.reason, "Order payment status is Cancelled");
  console.log("  ✔ Cancelled payment order safely skips success SMS");

  // Test 7: Unknown Status -> No Success SMS
  console.log("\n▶ Test 7: Unknown Status -> No Success SMS");
  const unknownOrder = await Order.create({
    id: "AURA-UNKNOWN-001",
    orderId: "AURA-UNKNOWN-001",
    orderNumber: "AURA-UNKNOWN-001",
    authUserId: "user_test_5",
    customerPhone: "9876543210",
    finalAmount: 1500,
    paymentStatus: "NEEDS_REVIEW",
    orderStatus: "Pending"
  });

  const smsResUnknown = await sendPaymentSuccessSms({ orderId: "AURA-UNKNOWN-001" });
  assert.strictEqual(smsResUnknown.status, "SKIPPED");
  console.log("  ✔ Unknown / Needs Review payment status safely skips SMS");

  // Test 8: Duplicate PayU Webhook / Callback -> Only ONE SMS (Idempotency)
  console.log("\n▶ Test 8: Duplicate Callback/Webhook Idempotency Protection");
  const dupOrder = await Order.create({
    id: "AURA-DUP-001",
    orderId: "AURA-DUP-001",
    orderNumber: "AURA-DUP-001",
    authUserId: "user_test_6",
    customerPhone: "9876543210",
    finalAmount: 3200,
    paymentStatus: "Paid",
    orderStatus: "Confirmed"
  });

  // First call processes SMS
  await sendPaymentSuccessSms({ orderId: "AURA-DUP-001" });

  // Second call must return ALREADY_PROCESSED
  const smsResDup = await sendPaymentSuccessSms({ orderId: "AURA-DUP-001" });
  assert.strictEqual(smsResDup.status, "ALREADY_PROCESSED");
  console.log("  ✔ Duplicate callback/webhook call returns ALREADY_PROCESSED and sends no duplicate SMS");

  // Test 9: Missing Customer Phone -> Payment Remains Successful, SMS Skipped
  console.log("\n▶ Test 9: Missing Customer Phone -> Payment Remains Successful, SMS Skipped");
  const noPhoneOrder = await Order.create({
    id: "AURA-NOPHONE-001",
    orderId: "AURA-NOPHONE-001",
    orderNumber: "AURA-NOPHONE-001",
    authUserId: "user_test_7",
    customerPhone: "",
    phone: "",
    finalAmount: 1200,
    paymentStatus: "Paid",
    orderStatus: "Confirmed"
  });

  const smsResNoPhone = await sendPaymentSuccessSms({ orderId: "AURA-NOPHONE-001" });
  assert.strictEqual(smsResNoPhone.status, "SKIPPED");
  assert.strictEqual(smsResNoPhone.reason, "Invalid or missing customer mobile number");

  const checkNoPhone = await Order.findById(noPhoneOrder._id);
  assert.strictEqual(checkNoPhone.paymentStatus, "Paid"); // Payment remains Paid!
  assert.strictEqual(checkNoPhone.paymentSuccessSmsStatus, "SKIPPED");
  console.log("  ✔ Missing phone skips SMS safely while keeping payment status Paid");

  // Test 10: Invalid PayU Response Hash Detection
  console.log("\n▶ Test 10: Tampered/Invalid PayU Hash Detection");
  const tamperedParams = {
    key: "key123",
    txnid: "TXN_AURA_1001",
    amount: "1500.00",
    productinfo: "Aura Rudraksha",
    firstname: "Rahul",
    email: "rahul@example.com",
    status: "success",
    hash: "invalid_tampered_hash_12345"
  };
  const hashVal = verifyPayuResponseHash(tamperedParams, "salt456");
  assert.strictEqual(hashVal.valid, false);
  console.log("  ✔ Invalid PayU response hash rejected cleanly");

  // Test 11: Sanitize Payment Details (No Secrets Leaked to Client)
  console.log("\n▶ Test 11: Sanitize Payment Details (Secrets Prevention)");
  const dirtyDetails = {
    key: "key123",
    salt: "SUPER_SECRET_SALT",
    PAYU_MERCHANT_SALT: "SECRET",
    cardnum: "4111111111111111",
    cvv: "123",
    password: "my_pass",
    txnid: "TXN_123",
    amount: "1000.00"
  };
  const cleanDetails = sanitizePaymentDetails(dirtyDetails);
  assert.strictEqual(cleanDetails.salt, undefined);
  assert.strictEqual(cleanDetails.PAYU_MERCHANT_SALT, undefined);
  assert.strictEqual(cleanDetails.cardnum, undefined);
  assert.strictEqual(cleanDetails.cvv, undefined);
  assert.strictEqual(cleanDetails.password, undefined);
  assert.strictEqual(cleanDetails.txnid, "TXN_123");
  console.log("  ✔ Payment details sanitization strips all sensitive salt, card, and credential fields");

  // Test 12: Order Confirmation First Guarantee
  console.log("\n▶ Test 12: Order Confirmation First Guarantee");
  const confirmFirstOrder = await Order.create({
    id: "AURA-FIRST-001",
    orderId: "AURA-FIRST-001",
    orderNumber: "AURA-FIRST-001",
    authUserId: "user_test_8",
    customerPhone: "9876543210",
    finalAmount: 1800,
    paymentStatus: "Paid",
    orderStatus: "Confirmed"
  });

  // Verify that even if SMS fails or is unconfigured, order paymentStatus stays Paid
  const smsFailTest = await sendPaymentSuccessSms({ orderId: "AURA-FIRST-001" });
  const checkConfirmFirst = await Order.findById(confirmFirstOrder._id);
  assert.strictEqual(checkConfirmFirst.paymentStatus, "Paid");
  assert.strictEqual(checkConfirmFirst.orderStatus, "Confirmed");
  console.log("  ✔ Payment success and order confirmation remain untouched by SMS status");

  // Test 13: Retry / Repeated Callback Idempotency
  console.log("\n▶ Test 13: Retry / Repeated Callback Idempotency");
  const retryOrder = await Order.create({
    id: "AURA-RETRY-001",
    orderId: "AURA-RETRY-001",
    orderNumber: "AURA-RETRY-001",
    authUserId: "user_test_9",
    customerPhone: "9876543210",
    finalAmount: 2500,
    paymentStatus: "Paid",
    orderStatus: "Confirmed"
  });

  const resRetry1 = await sendPaymentSuccessSms({ orderId: "AURA-RETRY-001" });
  const resRetry2 = await sendPaymentSuccessSms({ orderId: "AURA-RETRY-001" });
  assert.strictEqual(resRetry2.status, "ALREADY_PROCESSED");
  console.log("  ✔ Repeated payment verification calls prevent duplicate SMS triggers");

  // Test 14: Non-blocking Execution Safety
  console.log("\n▶ Test 14: Non-blocking Execution Safety");
  let errorCaught = false;
  try {
    // Calling with non-existent orderId
    const nullRes = await sendPaymentSuccessSms({ orderId: "NON_EXISTENT_ORDER_999" });
    assert.strictEqual(nullRes.status, "SKIPPED");
  } catch (err) {
    errorCaught = true;
  }
  assert.strictEqual(errorCaught, false);
  console.log("  ✔ Non-existent orders or errors are caught safely without raising unhandled exceptions");

  await teardownDb();

  console.log("\n=========================================");
  console.log("✅ ALL 14 PAYU SMS SCENARIO TESTS PASSED!");
  console.log("=========================================\n");
}

runSmsPayuTests().catch(async (err) => {
  console.error("❌ Test suite failed:", err);
  await teardownDb();
  process.exit(1);
});
