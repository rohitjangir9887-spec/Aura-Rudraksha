import express from "express";
import {
  initiatePayuPayment,
  handlePayuCallback,
  handlePayuWebhook,
  verifyPaymentStatus,
  retryPayuPayment,
  processPayuRefund,
  cancelUnpaidOrder
} from "../controllers/paymentController.js";
import { requireAuth, optionalAuth, requireAdmin } from "../middleware/auth.js";
import { rateLimit } from "../middleware/rateLimit.js";

const router = express.Router();

// Strict anti-caching for all payment endpoints
router.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");
  next();
});

// Dedicated rate limiters for payment actions
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

// 1. Initiate PayU Hosted Checkout Payment (Customer authenticated)
router.all("/initiate", requireAuth, paymentInitiateLimit, initiatePayuPayment);

// 2. PayU Browser Redirect Callback (surl/furl - standard PayU Hosted Checkout POST / GET fallback)
// DO NOT rate-limit PayU customer redirect callback
router.all("/payu-callback", handlePayuCallback);

// 3. PayU Background Server Webhook
// DO NOT rate-limit PayU server webhook
router.all("/payu-webhook", handlePayuWebhook);

// 4. Check / Verify Payment status for an order
router.all("/verify/:orderId", optionalAuth, paymentVerifyLimit, verifyPaymentStatus);

// 5. Retry Payment on an existing pending/failed order
router.all("/retry/:orderId", optionalAuth, paymentInitiateLimit, retryPayuPayment);

// 6. Admin Process PayU Live Refund
router.all("/refund/:orderId", requireAdmin, paymentRefundLimit, processPayuRefund);

// 7. Customer Cancel Unpaid Order
router.all("/cancel/:orderId", requireAuth, paymentInitiateLimit, cancelUnpaidOrder);

export default router;
