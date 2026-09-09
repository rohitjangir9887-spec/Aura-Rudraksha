import mongoose from "mongoose";

const notificationEventSchema = new mongoose.Schema(
  {
    messageId: { type: String, required: true, index: true },
    provider: { type: String, default: "brevo", index: true },
    channel: { type: String, enum: ["email", "sms"], required: true, index: true },
    event: { type: String, required: true, index: true }, // e.g. delivered, hard_bounce, clicked
    recipient: { type: String, required: true },
    orderId: { type: String, default: "", index: true },
    payload: { type: mongoose.Schema.Types.Mixed },
    receivedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

export const NotificationEvent = mongoose.models.NotificationEvent || mongoose.model("NotificationEvent", notificationEventSchema);
