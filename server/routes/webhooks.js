import express from "express";
import { WebhookEvent } from "../models/WebhookEvent.js";

const router = express.Router();

router.post("/brevo", async (req, res) => {
  try {
    const payload = req.body;
    
    // Save the webhook event in the db
    await WebhookEvent.create({
      provider: "brevo",
      event: payload.event,
      payload: payload,
      orderId: null, // Depending on if we passed custom tags, we can extract it
      createdAt: new Date()
    });

    console.log(`[Brevo Webhook] Received event: ${payload.event} for ${payload.email || payload.number}`);
    
    res.status(200).send("OK");
  } catch (error) {
    console.error("[Brevo Webhook Error]", error.message);
    res.status(500).send("Error");
  }
});

export default router;
