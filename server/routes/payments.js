import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  getCashfreeConfig,
  createCashfreeCheckoutSession,
  verifyAndSyncPaymentStatus,
  handleCashfreeWebhook
} from "../controllers/paymentController.js";

const router = Router();

// Public configuration for Cashfree JS SDK (environment / mode)
router.get("/cashfree/config", getCashfreeConfig);

// Create Cashfree payment session for authenticated user checkout
router.post("/cashfree/create-order", requireAuth, createCashfreeCheckoutSession);

// Server-side payment verification (called upon redirect back from Cashfree or polling)
router.get("/cashfree/status/:orderId", verifyAndSyncPaymentStatus);
router.post("/cashfree/verify", verifyAndSyncPaymentStatus);

// Cashfree Webhook endpoint (can also be mounted at /api/webhooks/cashfree)
router.post("/cashfree/webhook", handleCashfreeWebhook);

export default router;
