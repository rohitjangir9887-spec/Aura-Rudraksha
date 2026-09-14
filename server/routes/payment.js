import express from "express";
import {
  initiatePayuPayment,
  handlePayuCallback,
  handlePayuCancel,
  handlePayuWebhook,
  verifyPaymentStatus,
  retryPayuPayment,
  requestRefundOtp,
  processPayuRefund,
  cancelUnpaidOrder,
  syncPayuOrder
} from "../controllers/paymentController.js";
import { requireAuth, optionalAuth, requireAdmin } from "../middleware/auth.js";
import { rateLimit } from "../middleware/rateLimit.js";

const router = express.Router();

router.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");
  next();
});

const paymentInitiateLimit = rateLimit({
  windowMs: 60_000,
  max: 20,
  message: "Too many payment initiation attempts. Please wait a moment.",
  prefix: "pay_init"
});

const paymentVerifyLimit = rateLimit({
  windowMs: 60_000,
  max: 60,
  message: "Too many payment verification checks. Please wait a moment.",
  prefix: "pay_ver"
});

const paymentRefundLimit = rateLimit({
  windowMs: 60_000,
  max: 20,
  message: "Too many refund requests. Please wait a moment.",
  prefix: "pay_ref"
});

// Hosted checkout initiation must be POST-only.
router.post("/initiate", optionalAuth, paymentInitiateLimit, initiatePayuPayment);

// PayU may use GET/POST for browser callbacks and server webhooks depending on configuration.
router.all("/payu-callback", handlePayuCallback);
router.all("/payu-cancel", handlePayuCancel);
router.all("/payu-webhook", handlePayuWebhook);

// Customer status checks/retries are state-changing or sensitive; keep them POST-only.
router.post("/verify/:orderId", optionalAuth, paymentVerifyLimit, verifyPaymentStatus);
router.post("/retry/:orderId", optionalAuth, paymentInitiateLimit, retryPayuPayment);

// Admin refund operations and customer cancellation are POST-only.
router.post("/refund/request-otp/:orderId", requireAdmin, paymentRefundLimit, requestRefundOtp);
router.post("/refund/:orderId", requireAdmin, paymentRefundLimit, processPayuRefund);
router.post("/sync-payu/:orderId", requireAdmin, syncPayuOrder);
router.post("/cancel/:orderId", requireAuth, paymentInitiateLimit, cancelUnpaidOrder);

export default router;
