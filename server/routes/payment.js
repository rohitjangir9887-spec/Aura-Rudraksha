import express from "express";
import {
  initiatePayuPayment,
  handlePayuCallback,
  handlePayuWebhook,
  verifyPaymentStatus,
  retryPayuPayment,
  processPayuRefund
} from "../controllers/paymentController.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = express.Router();

// Initiate PayU Hosted Checkout Payment
router.post("/initiate", requireAuth, initiatePayuPayment);

// PayU Browser Redirect Callback (surl/furl - standard PayU Hosted Checkout POST)
router.post("/payu-callback", handlePayuCallback);

// PayU Background Server Webhook
router.post("/payu-webhook", handlePayuWebhook);

// Check / Verify Payment status for an order
router.get("/verify/:orderId", requireAuth, verifyPaymentStatus);

// Retry Payment on an existing pending/failed order
router.post("/retry/:orderId", requireAuth, retryPayuPayment);

// Admin Process PayU Live Refund
router.post("/refund/:orderId", requireAdmin, processPayuRefund);

export default router;
