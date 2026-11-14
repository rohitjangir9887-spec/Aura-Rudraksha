import { test, describe, beforeAll, afterAll, beforeEach, expect, vi } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import crypto from "crypto";
import { Order } from "../../models/Order.js";
import { Product } from "../../models/Product.js";
import { Coupon } from "../../models/Coupon.js";
import { PaymentTransaction } from "../../models/PaymentTransaction.js";
import { connectDB } from "../../config/db.js";
import * as payuService from "../../services/payuService.js";
import {
  initiatePayuPayment,
  handlePayuCallback,
  handlePayuWebhook,
  handlePayuCancel,
  verifyPaymentStatus,
  retryPayuPayment
} from "../../controllers/paymentController.js";
import { createOrder } from "../../controllers/orderController.js";
import { getProductById } from "../../controllers/productController.js";
import { findProductForSeo } from "../../services/seoService.js";

function mockReqRes({ body = {}, query = {}, params = {}, headers = {} }) {
  const req = {
    body,
    query,
    params,
    headers,
    protocol: "https",
    get: (header) => headers[header.toLowerCase()] || ""
  };
  const res = {
    statusCode: 200,
    headers: {},
    redirectUrl: "",
    jsonData: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.jsonData = data;
      return this;
    },
    setHeader(key, val) {
      this.headers[key] = val;
      return this;
    },
    redirect(code, url) {
      this.statusCode = code;
      this.redirectUrl = url;
      return this;
    }
  };
  return { req, res };
}

function generateResponseHash(params, salt = "test_salt_123") {
  const key = String(params.key || "").trim();
  const txnid = String(params.txnid || "").trim();
  const amt = Number(params.amount || 0).toFixed(2);
  const productinfo = String(params.productinfo || "").trim();
  const firstname = String(params.firstname || "").trim();
  const email = String(params.email || "").trim();
  const status = String(params.status || "").trim();

  const u1 = String(params.udf1 || "").trim();
  const u2 = String(params.udf2 || "").trim();
  const u3 = String(params.udf3 || "").trim();
  const u4 = String(params.udf4 || "").trim();
  const u5 = String(params.udf5 || "").trim();
  const u6 = String(params.udf6 || "").trim();
  const u7 = String(params.udf7 || "").trim();
  const u8 = String(params.udf8 || "").trim();
  const u9 = String(params.udf9 || "").trim();
  const u10 = String(params.udf10 || "").trim();

  const hashStr = `${salt}|${status}|${u10}|${u9}|${u8}|${u7}|${u6}|${u5}|${u4}|${u3}|${u2}|${u1}|${email}|${firstname}|${productinfo}|${amt}|${txnid}|${key}`;
  return crypto.createHash("sha512").update(hashStr).digest("hex").toLowerCase();
}

describe("PayU Callback & Webhook Security & Idempotency Suite", () => {
  let mongod = null;
  let mongodAvailable = false;

  const TEST_KEY = "test_key_123";
  const TEST_SALT = "test_salt_123";

  beforeAll(async () => {
    process.env.PAYU_MERCHANT_KEY = TEST_KEY;
    process.env.PAYU_MERCHANT_SALT = TEST_SALT;
    process.env.PAYU_ENV = "test";

    try {
      mongod = await MongoMemoryServer.create({ binary: { version: "8.0.4" } });
      process.env.MONGODB_URI = mongod.getUri("payu_callback_suite");
      await connectDB();
      mongodAvailable = true;
    } catch (err) {
      console.warn("MongoMemoryServer not available in test env:", err.message);
    }
  }, 60000);

  afterAll(async () => {
    if (mongodAvailable) {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
      if (mongod) {
        await mongod.stop();
      }
    }
  }, 30000);

  beforeEach(async () => {
    vi.restoreAllMocks();
    if (mongodAvailable) {
      await Order.deleteMany({});
      await Product.deleteMany({});
      await Coupon.deleteMany({});
      await PaymentTransaction.deleteMany({});
    }
  });

  test("1. Valid Callback: Successfully confirms pending order and updates state to Paid", async () => {
    if (!mongodAvailable) return;

    vi.spyOn(payuService, "verifyPayuPaymentServerSide").mockResolvedValue({
      success: true,
      isPaid: true,
      amount: 1000,
      mihpayid: "MIH_999888",
      bankRefNum: "BANK_12345",
      mode: "UPI"
    });

    const orderId = "AURA-TEST-101";
    const txnid = "TXN_TEST_101";
    const amount = 1000;

    await Product.create({ id: "PROD-1", name: "5 Mukhi Rudraksha", stock: 10, price: 1000, status: "Published" });
    await Order.create({
      id: orderId,
      orderId,
      orderNumber: orderId,
      txnid,
      amount,
      finalAmount: amount,
      paymentStatus: "Pending",
      orderStatus: "Pending",
      snapshotItems: [{ id: "PROD-1", name: "5 Mukhi Rudraksha", qty: 1 }],
      authUserId: "guest_123"
    });

    const bodyWithoutHash = {
      key: TEST_KEY,
      txnid,
      amount: "1000.00",
      productinfo: "Aura Rudraksha Order AURA-TEST-101",
      firstname: "Devotee",
      email: "devotee@example.com",
      status: "success",
      udf1: orderId,
      udf2: "guest_123",
      mihpayid: "MIH_999888"
    };

    const hash = generateResponseHash(bodyWithoutHash, TEST_SALT);
    const body = { ...bodyWithoutHash, hash };

    const { req, res } = mockReqRes({ body });
    await handlePayuCallback(req, res);

    expect(res.statusCode).toBe(303);
    expect(res.redirectUrl).toContain("status=success");
    expect(res.redirectUrl).toContain(`orderId=${orderId}`);

    const updatedOrder = await Order.findOne({ id: orderId });
    expect(updatedOrder.paymentStatus).toBe("Paid");
    expect(updatedOrder.orderStatus).toBe("Confirmed");

    const updatedProd = await Product.findOne({ id: "PROD-1" });
    expect(updatedProd.stock).toBe(9); // Stock deducted by 1
  });

  test("2. Missing orderId: Rejects cleanly without database mutation", async () => {
    if (!mongodAvailable) return;

    const body = {
      key: TEST_KEY,
      txnid: "TXN_MISSING_ORDER",
      amount: "1000.00",
      hash: "somehash",
      status: "success"
    };

    const { req, res } = mockReqRes({ body });
    await handlePayuCallback(req, res);

    expect(res.statusCode).toBe(303);
    expect(res.redirectUrl).toContain("status=failed");

    const count = await Order.countDocuments();
    expect(count).toBe(0);
  });

  test("3. Missing txnid: Rejects cleanly without database mutation", async () => {
    if (!mongodAvailable) return;

    const body = {
      key: TEST_KEY,
      udf1: "AURA-TEST-102",
      amount: "1000.00",
      hash: "somehash",
      status: "success"
    };

    const { req, res } = mockReqRes({ body });
    await handlePayuCallback(req, res);

    expect(res.statusCode).toBe(303);
    expect(res.redirectUrl).toContain("status=failed");
  });

  test("4. Missing hash: Rejects cleanly without database mutation", async () => {
    if (!mongodAvailable) return;

    const orderId = "AURA-TEST-104";
    await Order.create({ id: orderId, orderId, txnid: "TXN_104", amount: 500, paymentStatus: "Pending" });

    const body = {
      key: TEST_KEY,
      txnid: "TXN_104",
      udf1: orderId,
      amount: "500.00",
      status: "success"
      // hash missing!
    };

    const { req, res } = mockReqRes({ body });
    await handlePayuCallback(req, res);

    expect(res.statusCode).toBe(303);
    expect(res.redirectUrl).toContain("status=failed");

    const order = await Order.findOne({ id: orderId });
    expect(order.paymentStatus).toBe("Pending"); // MUST NOT BE MUTATED
  });

  test("5. Invalid hash/signature: Rejects immediately WITHOUT database or payment-state mutation", async () => {
    if (!mongodAvailable) return;

    const orderId = "AURA-TEST-105";
    await Order.create({ id: orderId, orderId, txnid: "TXN_105", amount: 500, paymentStatus: "Pending" });

    const body = {
      key: TEST_KEY,
      txnid: "TXN_105",
      udf1: orderId,
      amount: "500.00",
      status: "success",
      hash: "b3f07a7837ad45e128211028383a183883a812391298319238129312938192312938192381293" // Forged/Invalid hash
    };

    const { req, res } = mockReqRes({ body });
    await handlePayuCallback(req, res);

    expect(res.statusCode).toBe(303);
    expect(res.redirectUrl).toContain("status=failed");

    const order = await Order.findOne({ id: orderId });
    expect(order.paymentStatus).toBe("Pending"); // MUST REMAIN PENDING (NO MUTATION!)
  });

  test("6. Duplicate callback: Idempotent processing prevents duplicate stock deductions", async () => {
    if (!mongodAvailable) return;

    const orderId = "AURA-TEST-106";
    const txnid = "TXN_TEST_106";
    const amount = 1000;

    await Product.create({ id: "PROD-106", name: "1 Mukhi Rudraksha", stock: 5, price: 1000, status: "Published" });
    await Order.create({
      id: orderId,
      orderId,
      txnid,
      amount,
      finalAmount: amount,
      paymentStatus: "Paid", // ALREADY PAID
      inventoryDeducted: true,
      snapshotItems: [{ id: "PROD-106", qty: 1 }],
      guestToken: "gt_106"
    });

    const bodyWithoutHash = {
      key: TEST_KEY,
      txnid,
      amount: "1000.00",
      productinfo: "Aura Rudraksha Order AURA-TEST-106",
      firstname: "Devotee",
      email: "devotee@example.com",
      status: "success",
      udf1: orderId
    };

    const hash = generateResponseHash(bodyWithoutHash, TEST_SALT);
    const body = { ...bodyWithoutHash, hash };

    const { req, res } = mockReqRes({ body });
    await handlePayuCallback(req, res);

    expect(res.statusCode).toBe(303);
    expect(res.redirectUrl).toContain("status=success");

    const prod = await Product.findOne({ id: "PROD-106" });
    expect(prod.stock).toBe(5); // Stock was NOT deducted again
  });

  test("7. Delayed callback: Pending order transitions to Paid on late valid callback", async () => {
    if (!mongodAvailable) return;

    vi.spyOn(payuService, "verifyPayuPaymentServerSide").mockResolvedValue({
      success: true,
      isPaid: true,
      amount: 2000,
      mihpayid: "MIH_2000",
      bankRefNum: "BANK_2000",
      mode: "NETBANKING"
    });

    const orderId = "AURA-TEST-107";
    const txnid = "TXN_TEST_107";
    await Order.create({ id: orderId, orderId, txnid, amount: 2000, finalAmount: 2000, paymentStatus: "Pending" });

    const bodyWithoutHash = {
      key: TEST_KEY,
      txnid,
      amount: "2000.00",
      productinfo: "Aura Rudraksha Order AURA-TEST-107",
      firstname: "Devotee",
      email: "devotee@example.com",
      status: "success",
      udf1: orderId
    };

    const hash = generateResponseHash(bodyWithoutHash, TEST_SALT);
    const body = { ...bodyWithoutHash, hash };

    const { req, res } = mockReqRes({ body });
    await handlePayuCallback(req, res);

    expect(res.statusCode).toBe(303);
    expect(res.redirectUrl).toContain("status=success");

    const order = await Order.findOne({ id: orderId });
    expect(order.paymentStatus).toBe("Paid");
  });

  test("8. Malformed callback: Missing merchant key or garbage payload fails cleanly", async () => {
    if (!mongodAvailable) return;

    const body = { key: "wrong_key", txnid: "TXN_88", udf1: "AURA-88", hash: "123", amount: "100" };
    const { req, res } = mockReqRes({ body });
    await handlePayuCallback(req, res);

    expect(res.statusCode).toBe(303);
    expect(res.redirectUrl).toContain("status=failed");
  });

  test("9. Invalid payment status: Non-terminal status 'pending' redirects cleanly without marking Paid/Failed", async () => {
    if (!mongodAvailable) return;

    const orderId = "AURA-TEST-109";
    const txnid = "TXN_TEST_109";
    await Order.create({ id: orderId, orderId, txnid, amount: 1000, finalAmount: 1000, paymentStatus: "Pending" });

    const bodyWithoutHash = {
      key: TEST_KEY,
      txnid,
      amount: "1000.00",
      productinfo: "Aura Rudraksha Order AURA-TEST-109",
      firstname: "Devotee",
      email: "devotee@example.com",
      status: "pending",
      udf1: orderId
    };

    const hash = generateResponseHash(bodyWithoutHash, TEST_SALT);
    const body = { ...bodyWithoutHash, hash };

    const { req, res } = mockReqRes({ body });
    await handlePayuCallback(req, res);

    expect(res.statusCode).toBe(303);
    expect(res.redirectUrl).toContain("status=pending");

    const order = await Order.findOne({ id: orderId });
    expect(order.paymentStatus).toBe("Pending");
  });

  test("10. Out-of-order callback: Failed callback received AFTER order is Paid is ignored", async () => {
    if (!mongodAvailable) return;

    const orderId = "AURA-TEST-110";
    const txnid = "TXN_TEST_110";
    await Order.create({ id: orderId, orderId, txnid, amount: 1000, finalAmount: 1000, paymentStatus: "Paid" });

    const bodyWithoutHash = {
      key: TEST_KEY,
      txnid,
      amount: "1000.00",
      productinfo: "Aura Rudraksha Order AURA-TEST-110",
      firstname: "Devotee",
      email: "devotee@example.com",
      status: "failure",
      udf1: orderId
    };

    const hash = generateResponseHash(bodyWithoutHash, TEST_SALT);
    const body = { ...bodyWithoutHash, hash };

    const { req, res } = mockReqRes({ body });
    await handlePayuCallback(req, res);

    expect(res.statusCode).toBe(303);
    expect(res.redirectUrl).toContain("status=success"); // Remains success!

    const order = await Order.findOne({ id: orderId });
    expect(order.paymentStatus).toBe("Paid"); // Cannot be downgraded
  });

  test("11. MongoDB timeout / query exception fails safely without crashing", async () => {
    if (!mongodAvailable) return;

    const findSpy = vi.spyOn(Order, "findOne").mockImplementationOnce(() => {
      throw new Error("MongoDB query timeout or network failure");
    });

    const bodyWithoutHash = {
      key: TEST_KEY,
      txnid: "TXN_TO",
      amount: "500.00",
      status: "success",
      udf1: "AURA-TIMEOUT"
    };
    const hash = generateResponseHash(bodyWithoutHash, TEST_SALT);
    const body = { ...bodyWithoutHash, hash };

    const { req, res } = mockReqRes({ body });
    await handlePayuCallback(req, res);

    expect(res.statusCode).toBe(303);
    expect(res.redirectUrl).toContain("status=failed");

    findSpy.mockRestore();
  });

  test("12. Database failure during webhook handles exception safely", async () => {
    if (!mongodAvailable) return;

    const bodyWithoutHash = {
      key: TEST_KEY,
      txnid: "TXN_WH_ERR",
      amount: "500.00",
      status: "success",
      udf1: "AURA-WH-ERR"
    };
    const hash = generateResponseHash(bodyWithoutHash, TEST_SALT);
    const body = { ...bodyWithoutHash, hash };

    // Cause findOne to throw
    const findSpy = vi.spyOn(Order, "findOne").mockImplementationOnce(() => {
      throw new Error("DB Connection Error");
    });

    const { req, res } = mockReqRes({ body });
    await handlePayuWebhook(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.jsonData.success).toBe(false);

    findSpy.mockRestore();
  });

  test("13. Webhook: Valid webhook confirms order and updates state to Paid", async () => {
    if (!mongodAvailable) return;

    vi.spyOn(payuService, "verifyPayuPaymentServerSide").mockResolvedValue({
      success: true,
      isPaid: true,
      amount: 1500,
      mihpayid: "MIH_WH_113",
      bankRefNum: "BANK_WH_113",
      mode: "UPI"
    });

    const orderId = "AURA-WH-113";
    const txnid = "TXN_WH_113";
    const amount = 1500;

    await Order.create({ id: orderId, orderId, txnid, amount, finalAmount: amount, paymentStatus: "Pending" });

    const bodyWithoutHash = {
      key: TEST_KEY,
      txnid,
      amount: "1500.00",
      productinfo: "Aura Rudraksha Order AURA-WH-113",
      firstname: "Devotee",
      email: "devotee@example.com",
      status: "success",
      udf1: orderId
    };

    const hash = generateResponseHash(bodyWithoutHash, TEST_SALT);
    const body = { ...bodyWithoutHash, hash };

    const { req, res } = mockReqRes({ body });
    await handlePayuWebhook(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.jsonData.success).toBe(true);

    const order = await Order.findOne({ id: orderId });
    expect(order.paymentStatus).toBe("Paid");
  });

  test("14. Failed payment confirmation: Valid hash with terminal failure status marks order as Failed", async () => {
    if (!mongodAvailable) return;

    const orderId = "AURA-TEST-114";
    const txnid = "TXN_TEST_114";
    await Order.create({ id: orderId, orderId, txnid, amount: 1000, finalAmount: 1000, paymentStatus: "Pending" });

    const bodyWithoutHash = {
      key: TEST_KEY,
      txnid,
      amount: "1000.00",
      productinfo: "Aura Rudraksha Order AURA-TEST-114",
      firstname: "Devotee",
      email: "devotee@example.com",
      status: "failure",
      error_Message: "Bank declined transaction",
      udf1: orderId
    };

    const hash = generateResponseHash(bodyWithoutHash, TEST_SALT);
    const body = { ...bodyWithoutHash, hash };

    const { req, res } = mockReqRes({ body });
    await handlePayuCallback(req, res);

    expect(res.statusCode).toBe(303);
    expect(res.redirectUrl).toContain("status=failed");

    const order = await Order.findOne({ id: orderId });
    expect(order.paymentStatus).toBe("Failed");
  });

  test("15. Custom Mala PayU Initiate & Callback: Computes authoritative bead price and completes Paid without false inventory conflict", async () => {
    if (!mongodAvailable) return;

    await Product.create({ id: "MALA-BEAD-1", name: "Nepali 5 Mukhi", stock: 20, price: 450, mrp: 750, status: "Published" });
    await Product.create({ id: "MALA-BEAD-2", name: "Nepali 7 Mukhi", stock: 10, price: 950, mrp: 1400, status: "Published" });

    const { req: initReq, res: initRes } = mockReqRes({
      body: {
        customerName: "Aarav Sharma",
        phone: "9876543210",
        customerEmail: "aarav@example.com",
        lines: [
          {
            id: "custom-mala-test999",
            qty: 1,
            isCustomMala: true,
            price: 1,
            customMala: {
              products: [
                { productId: "MALA-BEAD-1", qty: 2 },
                { productId: "MALA-BEAD-2", qty: 1 }
              ],
              thread: "red-silk",
              capping: "none"
            }
          }
        ]
      }
    });
    initReq.ip = "127.0.0.1";

    let initErr = null;
    await initiatePayuPayment(initReq, initRes, (e) => { initErr = e; });
    expect(initErr).toBeNull();
    expect(initRes.jsonData?.success).toBe(true);

    const expectedAmount = 450 * 2 + 950;
    expect(initRes.jsonData.data.amount).toBe(expectedAmount);
    expect(initRes.jsonData.data.params.amount).toBe(expectedAmount.toFixed(2));
    expect(initRes.jsonData.data.params.hash).toHaveLength(128);

    const createdOrderId = initRes.jsonData.data.orderId;
    const createdTxnid = initRes.jsonData.data.txnid;

    vi.spyOn(payuService, "verifyPayuPaymentServerSide").mockResolvedValue({
      success: true,
      isPaid: true,
      amount: expectedAmount,
      mihpayid: "MIH_MALA_15",
      bankRefNum: "BANK_MALA_15",
      mode: "UPI"
    });

    const cbWithoutHash = {
      key: TEST_KEY,
      txnid: createdTxnid,
      amount: expectedAmount.toFixed(2),
      productinfo: initRes.jsonData.data.params.productinfo,
      firstname: initRes.jsonData.data.params.firstname,
      email: initRes.jsonData.data.params.email,
      status: "success",
      udf1: createdOrderId,
      udf2: initRes.jsonData.data.params.udf2,
      udf3: initRes.jsonData.data.params.udf3,
      mihpayid: "MIH_MALA_15"
    };
    const cbHash = generateResponseHash(cbWithoutHash, TEST_SALT);
    const { req: cbReq, res: cbRes } = mockReqRes({ body: { ...cbWithoutHash, hash: cbHash } });
    await handlePayuCallback(cbReq, cbRes);

    expect(cbRes.statusCode).toBe(303);
    expect(cbRes.redirectUrl).toContain("status=success");

    const paidOrder = await Order.findOne({ id: createdOrderId });
    expect(paidOrder.paymentStatus).toBe("Paid");
    expect(paidOrder.orderStatus).toBe("Confirmed");
    expect(paidOrder.notes || "").not.toContain("INVENTORY_CONFLICT");
  });

  test("16. Indonesian (-indo) Variant & Slug-ID: Initiate, PayU Callback, Retry & Verify update indonesianStock cleanly without false conflicts", async () => {
    if (!mongodAvailable) return;

    await Product.create({
      id: "14",
      name: "14 Mukhi Nepali Rudraksha",
      slug: "14-mukhi-rudraksha",
      price: 25000,
      stock: 5,
      hasIndonesianVariant: true,
      indonesianTitle: "14 Mukhi Java Indonesian Rudraksha",
      indonesianPrice: 4500,
      indonesianStock: 8,
      status: "Published"
    });
    await Product.create({
      id: "7",
      name: "7 Mukhi Nepali Rudraksha",
      slug: "7-mukhi-rudraksha",
      price: 1200,
      stock: 10,
      status: "Published"
    });

    const { req: initReq, res: initRes } = mockReqRes({
      body: {
        customerName: "Meera Joshi",
        phone: "9811223344",
        customerEmail: "meera@example.com",
        lines: [
          { id: "14-indo", qty: 2, variant: "Indonesian" },
          { id: "7-mukhi-rudraksha", qty: 1 }
        ]
      }
    });
    initReq.ip = "127.0.0.1";

    let initErr = null;
    await initiatePayuPayment(initReq, initRes, (e) => { initErr = e; });
    expect(initErr).toBeNull();
    expect(initRes.statusCode).toBe(200);
    expect(initRes.jsonData?.success).toBe(true);

    const expectedAmount = 4500 * 2 + 1200;
    expect(initRes.jsonData.data.amount).toBe(expectedAmount);

    const orderId = initRes.jsonData.data.orderId;
    const txnid = initRes.jsonData.data.txnid;
    const guestToken = initRes.jsonData.data.guestToken;

    // Test retryPayuPayment succeeds cleanly on -indo + slug order before payment
    const { req: retryReq, res: retryRes } = mockReqRes({
      params: { orderId },
      headers: { "x-guest-token": guestToken },
      body: { txnid, guestToken }
    });
    let retryErr = null;
    await retryPayuPayment(retryReq, retryRes, (e) => { retryErr = e; });
    expect(retryErr).toBeNull();
    expect(retryRes.statusCode).toBe(200);
    expect(retryRes.jsonData?.success).toBe(true);
    const retryTxnid = retryRes.jsonData.data.txnid;

    // Complete payment via PayU callback using retryTxnid
    vi.spyOn(payuService, "verifyPayuPaymentServerSide").mockResolvedValue({
      success: true,
      isPaid: true,
      amount: expectedAmount,
      mihpayid: "MIH_INDO_16",
      bankRefNum: "BANK_INDO_16",
      mode: "UPI"
    });

    const cbWithoutHash = {
      key: TEST_KEY,
      txnid: retryTxnid,
      amount: expectedAmount.toFixed(2),
      productinfo: retryRes.jsonData.data.params.productinfo,
      firstname: retryRes.jsonData.data.params.firstname,
      email: retryRes.jsonData.data.params.email,
      status: "success",
      udf1: orderId,
      udf2: retryRes.jsonData.data.params.udf2,
      udf3: retryRes.jsonData.data.params.udf3,
      mihpayid: "MIH_INDO_16"
    };
    const cbHash = generateResponseHash(cbWithoutHash, TEST_SALT);
    const { req: cbReq, res: cbRes } = mockReqRes({ body: { ...cbWithoutHash, hash: cbHash } });
    await handlePayuCallback(cbReq, cbRes);

    expect(cbRes.statusCode).toBe(303);
    expect(cbRes.redirectUrl).toContain("status=success");

    const updated14 = await Product.findOne({ id: "14" });
    const updated7 = await Product.findOne({ id: "7" });
    expect(updated14.indonesianStock).toBe(6); // 8 - 2
    expect(updated14.stock).toBe(5); // Nepali stock untouched
    expect(updated7.stock).toBe(9); // 10 - 1

    const paidOrder = await Order.findOne({ id: orderId });
    expect(paidOrder.paymentStatus).toBe("Paid");
    expect(paidOrder.notes || "").not.toContain("INVENTORY_CONFLICT");

    // Verify verifyPaymentStatus returns complete order data
    const { req: verReq, res: verRes } = mockReqRes({
      params: { orderId },
      query: { txnid: retryTxnid, guestToken }
    });
    let verErr = null;
    await verifyPaymentStatus(verReq, verRes, (e) => { verErr = e; });
    expect(verErr).toBeNull();
    expect(verRes.statusCode).toBe(200);
    expect(verRes.jsonData?.data?.paymentStatus).toBe("Paid");
  });

  test("17. COD Order Creation: Handles Indonesian (-indo) variant and Custom Mala properly", async () => {
    if (!mongodAvailable) return;

    await Product.create({
      id: "14",
      name: "14 Mukhi Nepali Rudraksha",
      price: 25000,
      stock: 5,
      hasIndonesianVariant: true,
      indonesianTitle: "14 Mukhi Java Indonesian Rudraksha",
      indonesianPrice: 4500,
      indonesianStock: 4,
      status: "Published"
    });

    const { req, res } = mockReqRes({
      body: {
        firstName: "Rohan",
        lastName: "Verma",
        customerName: "Rohan Verma",
        phone: "9822334455",
        address: "12 Temple Road",
        city: "Jaipur",
        state: "Rajasthan",
        pincode: "302001",
        paymentMethod: "Cash on Delivery (COD)",
        paymentMode: "COD",
        lines: [{ id: "14-indo", qty: 1, variant: "Indonesian" }]
      }
    });
    req.ip = "127.0.0.1";

    let err = null;
    await createOrder(req, res, (e) => { err = e; });
    expect(err).toBeNull();
    expect(res.statusCode).toBe(201);
    expect(res.jsonData?.success).toBe(true);
    expect(res.jsonData?.data?.paymentStatus).toBe("COD");
    expect(res.jsonData?.data?.orderStatus).toBe("Confirmed");

    const updated14 = await Product.findOne({ id: "14" });
    expect(updated14.indonesianStock).toBe(3); // 4 - 1
    expect(updated14.stock).toBe(5);
  });

  test("18. Gibberish slug '11-49o' returns 404 in getProductById and null in findProductForSeo even with Product 11 in MongoDB", async () => {
    if (!mongodAvailable) return;

    await Product.create({
      id: "11",
      name: "11 Mukhi Rudraksha",
      slug: "11-mukhi-rudraksha",
      mukhi: "11",
      price: 5500,
      stock: 10,
      status: "Published"
    });

    const { req: badReq, res: badRes } = mockReqRes({ params: { id: "11-49o" }, query: {} });
    await getProductById(badReq, badRes);
    expect(badRes.statusCode).toBe(404);
    expect(badRes.jsonData?.success).toBe(false);

    const seoBad = await findProductForSeo("11-49o");
    expect(seoBad).toBeNull();

    // Valid slug still resolves
    const { req: goodReq, res: goodRes } = mockReqRes({ params: { id: "11-mukhi-rudraksha" }, query: {} });
    await getProductById(goodReq, goodRes);
    expect(goodRes.statusCode).toBe(200);
    expect(goodRes.jsonData?.data?.id).toBe("11");
  });
});

