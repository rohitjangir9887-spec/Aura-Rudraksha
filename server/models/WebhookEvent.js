import mongoose from "mongoose";

const webhookEventSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true, unique: true, index: true },
    provider: { type: String, default: "payu", index: true },
    txnid: { type: String, required: true, index: true },
    orderId: { type: String, default: "", index: true },
    gatewayPaymentId: { type: String, default: "" }, // mihpayid
    payloadHash: { type: String, required: true },
    signatureValid: { type: Boolean, required: true },
    processingStatus: {
      type: String,
      enum: ["RECEIVED", "PROCESSING", "PROCESSED", "IGNORED_DUPLICATE", "FAILED"],
      default: "RECEIVED",
      index: true
    },
    error: { type: String, default: "" },
    receivedAt: { type: Date, default: Date.now },
    processedAt: { type: Date }
  },
  { timestamps: true }
);

export const WebhookEvent =
  mongoose.models.WebhookEvent || mongoose.model("WebhookEvent", webhookEventSchema);
