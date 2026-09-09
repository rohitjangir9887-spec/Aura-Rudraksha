import express from "express";
import { NotificationEvent } from "../models/NotificationEvent.js";

const router = express.Router();

// Secured Brevo Webhook endpoint
// Brevo can be configured to pass a Bearer token or a custom header
router.post("/brevo", async (req, res) => {
  try {
    const secret = process.env.BREVO_WEBHOOK_SECRET;
    
    // Only validate if a secret is configured in the environment
    if (secret) {
      const authHeader = req.headers.authorization;
      const customHeader = req.headers["x-brevo-token"];
      const queryToken = req.query.token;
      
      let providedToken = customHeader || queryToken;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        providedToken = authHeader.substring(7);
      }
      
      if (providedToken !== secret) {
        console.warn("[Brevo Webhook] Unauthorized access attempt.");
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }
    }

    const payload = req.body;
    
    // Determine channel and message ID
    // Email payload has 'message-id' or 'id', 'email'
    // SMS payload has 'reference' or 'messageId', 'number'
    
    const isSms = !!payload.number;
    const channel = isSms ? "sms" : "email";
    
    const messageId = payload['message-id'] || payload.messageId || payload.reference || payload.id || "unknown";
    const recipient = payload.email || payload.number || "unknown";
    const event = payload.event || "unknown";
    
    // Save the webhook event in the db
    await NotificationEvent.create({
      messageId: String(messageId),
      provider: "brevo",
      channel,
      event,
      recipient,
      payload: payload,
      receivedAt: new Date()
    });

    console.log(`[Brevo Webhook] Logged ${channel} event: ${event} for ${recipient}`);
    
    res.status(200).send("OK");
  } catch (error) {
    console.error("[Brevo Webhook Error]", error.message);
    res.status(500).send("Error");
  }
});

export default router;
