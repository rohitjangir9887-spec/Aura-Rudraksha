import express from "express";
import { sendMetaCapiEvent } from "../services/metaCapiService.js";

const router = express.Router();

const ALLOWED_EVENTS = new Set([
  "PageView",
  "ViewContent",
  "AddToCart",
  "InitiateCheckout",
  "Purchase"
]);

router.post("/capi", async (req, res) => {
  try {
    const body = req.body || {};
    const eventName = String(body.eventName || "").trim();
    if (!ALLOWED_EVENTS.has(eventName)) {
      return res.status(400).json({ success: false, message: "Invalid event name" });
    }

    const result = await sendMetaCapiEvent({
      eventName,
      eventId: body.eventId || "",
      sourceUrl: body.sourceUrl || "https://aurarudraksha.bond/",
      userData: body.userData || {},
      customData: body.customData || {},
      req
    });

    return res.json({ success: true, ...result });
  } catch (_) {
    return res.json({ success: true, skipped: true });
  }
});

export default router;
